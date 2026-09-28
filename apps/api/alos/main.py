import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from uuid import UUID

from alembic.script import ScriptDirectory
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import ValidationError
from pymongo.errors import PyMongoError
from sqlalchemy import delete
from sqlalchemy.exc import SQLAlchemyError

from . import account, auth, service
from .config import Settings
from .contracts import Command, CommandResult, Login, Signup
from .db import open_database
from .errors import DomainError
from .models import AuthSession


def create_app(settings: Settings | None = None):
    settings = settings or Settings()
    if not settings.enabled:
        raise RuntimeError("ALOS_V2_ENABLED required; legacy deployment is unchanged.")
    database = open_database(settings)
    schema_head = ScriptDirectory(str(Path(__file__).resolve().parents[1] / "migrations")).get_current_head()

    @asynccontextmanager
    async def lifespan(app):
        from .worker import run

        task = asyncio.create_task(run(database)) if settings.worker_enabled else None
        app.state.worker_task = task
        try:
            yield
        finally:
            if task:
                task.cancel()
                await asyncio.gather(task, return_exceptions=True)
            database.engine.dispose()

    app = FastAPI(
        title="Athlete Life API",
        version="2.0",
        lifespan=lifespan,
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
    )
    app.state.database, app.state.settings = database, settings

    transfer_lock = asyncio.Lock()

    @app.middleware("http")
    async def boundary(request: Request, call_next):
        large_transfer = request.url.path in {
            "/api/v2/body-model/upload",
            "/api/v2/body-model/content",
            "/api/v2/backups/export",
            "/api/v2/imports/stage",
        } or request.url.path.startswith("/api/v2/media/")
        if not large_transfer:
            return await bounded_request(request, call_next)
        if transfer_lock.locked():
            return JSONResponse(
                {
                    "error": {
                        "code": "transfer_busy",
                        "message": "Başka bir dosya aktarımı sürüyor. Kısa süre sonra yeniden dene.",
                    }
                },
                429,
                headers={"Retry-After": "5"},
            )
        await transfer_lock.acquire()
        try:
            response = await bounded_request(request, call_next)
        except BaseException:
            transfer_lock.release()
            raise
        if not hasattr(response, "body_iterator"):
            transfer_lock.release()
            return response
        iterator = response.body_iterator

        async def release_after_send():
            try:
                async for chunk in iterator:
                    yield chunk
            finally:
                transfer_lock.release()

        response.body_iterator = release_after_send()
        return response

    async def bounded_request(request: Request, call_next):
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            if request.headers.get("origin") != settings.public_origin:
                return JSONResponse(
                    {"error": {"code": "origin", "message": "İstek kaynağı doğrulanamadı."}}, 403
                )
            limit = settings.max_body_bytes
            if request.url.path == "/api/v2/imports/stage":
                from .backups import MAX_BYTES

                # Verify identity and CSRF before buffering a larger personal backup.
                try:
                    identity = auth.identity(request, database, settings, True)
                    auth.rate_limit(database, "backup-stage:" + identity["athlete_id"], 10)
                except DomainError as exc:
                    return JSONResponse(exc.body(), exc.status)
                limit = MAX_BYTES
            if request.url.path == "/api/v2/body-model/upload":
                from .body_model import MAX_MODEL_BYTES

                try:
                    auth.identity(request, database, settings, True)
                except DomainError as exc:
                    return JSONResponse(exc.body(), exc.status)
                limit = MAX_MODEL_BYTES
            length = request.headers.get("content-length", "0")
            if not length.isdigit() or int(length) > limit:
                return JSONResponse({"error": {"code": "size", "message": "Dosya/istek çok büyük."}}, 413)
            if request.url.path in {"/api/v2/body-model/upload", "/api/v2/imports/stage"}:
                request.state.body_limit = limit
            else:
                # ASGI receive is bounded too; chunked requests cannot bypass Content-Length.
                size, chunks = 0, []
                async for chunk in request.stream():
                    size += len(chunk)
                    if size > limit:
                        return JSONResponse(
                            {"error": {"code": "size", "message": "Dosya/istek çok büyük."}}, 413
                        )
                    chunks.append(chunk)
                request._body = b"".join(chunks)
                chunks.clear()
        response = await call_next(request)
        response.headers.update(
            {
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "same-origin",
                "X-Frame-Options": "DENY",
                "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
                "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
                "Cache-Control": "no-store" if request.url.path.startswith("/api/") else "no-cache",
            }
        )
        if settings.environment == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    @app.exception_handler(PyMongoError)
    async def mongo_error(request, exc):
        return JSONResponse(
            {
                "error": {
                    "code": "storage_retry",
                    "message": "Veritabanına ulaşılamadı; kayıt onaylanmadı. Yeniden dene.",
                }
            },
            503,
        )

    @app.exception_handler(DomainError)
    async def domain_error(request, exc):
        return JSONResponse(exc.body(), exc.status)

    @app.exception_handler(ValidationError)
    @app.exception_handler(RequestValidationError)
    async def validation_error(request, exc):
        # Do not echo submitted secrets, notes or health values back into diagnostic output.
        fields = [".".join(str(p) for p in e["loc"]) for e in exc.errors()]
        return JSONResponse(
            {
                "error": {
                    "code": "validation",
                    "message": "Girdi biçimini kontrol et.",
                    "details": {"fields": fields},
                }
            },
            422,
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, exc):
        return JSONResponse(
            {
                "error": {
                    "code": "database_unavailable",
                    "message": "Sunucuya kaydedilemedi. İşlem tekrar gönderilebilir.",
                }
            },
            503,
        )

    def who(request, mutation=False):
        return auth.identity(request, database, settings, mutation)

    @app.get("/health/live")
    def live():
        return {"status": "ok", "product_version": "2.0-dev"}

    @app.get("/health/ready")
    def ready():
        worker_task = getattr(app.state, "worker_task", None)
        if worker_task is not None and worker_task.done():
            return JSONResponse({"status": "worker_unavailable"}, 503)
        try:
            if not database.ready(schema_head):
                return JSONResponse({"status": "migration_required"}, 503)
            return {"status": "ready"}
        except (SQLAlchemyError, PyMongoError):
            return JSONResponse({"status": "unavailable"}, 503)

    @app.post("/api/v2/auth/login")
    def login(body: Login, request: Request):
        auth.rate_limit(database, "login:" + body.username.strip().casefold())
        auth.rate_limit(database, "ip:" + (request.client.host if request.client else "unknown"), 100)
        token = auth.login(
            database, settings, body.username, body.password, request.cookies.get(settings.cookie_name)
        )
        response = JSONResponse({"authenticated": True})
        response.set_cookie(
            settings.cookie_name,
            token,
            max_age=settings.session_hours * 3600,
            httponly=True,
            secure=settings.public_origin.startswith("https:"),
            samesite="strict",
            path="/",
        )
        return response

    @app.post("/api/v2/auth/signup", status_code=201)
    def signup(body: Signup, request: Request):
        if not settings.registration_enabled:
            raise DomainError("registration_closed", "Kayıt davetle açılır.", 403)
        auth.rate_limit(database, "signup:" + (request.client.host if request.client else "unknown"), 5)
        from sqlalchemy.exc import IntegrityError

        try:
            with database.sessions.begin() as db:
                auth.create_user(db, body.username, body.name, body.password)
        except IntegrityError:
            raise DomainError("account_unavailable", "Bu kullanıcı adı kullanılamıyor.", 409) from None
        return {"created": True}

    @app.get("/api/v2/auth/config")
    def auth_config():
        return {
            "registration_enabled": settings.registration_enabled,
            "password_min_length": 8,
            "email_delivery": "unconfigured",
        }

    @app.patch("/api/v2/auth/profile")
    def edit_account(body: account.AccountPatch, request: Request):
        return account.edit(database, who(request, True), body)

    @app.post("/api/v2/auth/password")
    def change_password(body: account.PasswordChange, request: Request):
        return account.change_password(database, who(request, True), body)

    @app.post("/api/v2/auth/recovery-codes")
    def recovery_codes(body: account.Reauthenticate, request: Request):
        return account.recovery_codes(database, who(request, True), body)

    @app.post("/api/v2/auth/recover")
    def recover(body: account.Recover, request: Request):
        auth.rate_limit(database, "recover-ip:" + (request.client.host if request.client else "unknown"), 30)
        return account.recover(database, body)

    @app.post("/api/v2/auth/delete")
    def delete_account(body: account.Reauthenticate, request: Request):
        result = account.erase(database, who(request, True), body)
        response = JSONResponse(result)
        response.delete_cookie(settings.cookie_name, path="/")
        return response

    @app.get("/api/v2/auth/me")
    def me(request: Request):
        result = who(request)
        result.pop("session_hash")
        return result

    @app.get("/api/v2/integrations")
    def integration_status(request: Request):
        from .integrations import statuses

        who(request)
        return {"integrations": [status.model_dump() for status in statuses()]}

    @app.post("/api/v2/auth/logout")
    def logout(request: Request):
        user = who(request, True)
        with database.sessions.begin() as db:
            db.execute(delete(AuthSession).where(AuthSession.token_hash == user["session_hash"]))
        response = JSONResponse({"logged_out": True})
        response.delete_cookie(settings.cookie_name, path="/")
        return response

    app.state.settings = settings

    @app.get("/api/v2/body-model")
    def body_model_info(request: Request):
        from .body_model import resolve_model, stored_model

        identity = who(request)
        stored = stored_model(database, UUID(identity["athlete_id"]), metadata_only=True)
        if stored:
            return {
                "available": True,
                "status": "uploaded",
                "id": stored["id"],
                "name": stored["name"],
                "bytes": stored["bytes"],
                "url": "/api/v2/body-model/content",
                "included_in_backup": True,
            }
        path = resolve_model(settings, UUID(identity["athlete_id"]))
        if path is None:
            return {
                "available": False,
                "status": "unconfigured",
                "message": "Bu profile ait kalıcı 3B kütüphane modeli yapılandırılmamış. İki boyutlu harita ve kayıtlar kullanılabilir.",
            }
        return {
            "available": True,
            "status": "configured",
            "bytes": path.stat().st_size,
            "url": "/api/v2/body-model/content",
            "note": "Kütüphane modeli bir ölçüm veya biyolojik iyileşme sonucu değildir.",
        }

    async def transfer_file(request):
        from tempfile import SpooledTemporaryFile

        size = 0
        temporary = SpooledTemporaryFile(max_size=1024 * 1024)  # noqa: SIM115 — caller owns and closes this stream
        try:
            async for chunk in request.stream():
                size += len(chunk)
                if size > request.state.body_limit:
                    raise DomainError("size", "Dosya/istek çok büyük.", 413)
                temporary.write(chunk)
            temporary.seek(0)
            return temporary
        except BaseException:
            temporary.close()
            raise

    async def transfer_body(request):
        temporary = await transfer_file(request)
        try:
            return temporary.read()
        finally:
            temporary.close()

    @app.post("/api/v2/body-model/upload")
    async def upload_body_model(request: Request, operation_id: UUID, entity_id: UUID, name: str):
        import hashlib

        from starlette.concurrency import run_in_threadpool

        from .body_model import validate_glb
        from .contracts import Command

        identity = who(request, True)
        content = validate_glb(await transfer_body(request))
        command = Command(
            operation_id=operation_id,
            entity_id=entity_id,
            expected_version=0,
            schema_version=1,
            command_type="media.upload",
            payload={"name": name, "sha256": hashlib.sha256(content).hexdigest()},
        )
        return await run_in_threadpool(
            service.execute, database, UUID(identity["athlete_id"]), command, content
        )

    @app.get("/api/v2/body-model/content")
    def body_model_content(request: Request):
        from fastapi.responses import Response

        from .body_model import resolve_model, stored_model

        athlete_id = UUID(who(request)["athlete_id"])
        stored = stored_model(database, athlete_id)
        if stored:
            return Response(
                stored["content"],
                media_type="model/gltf-binary",
                headers={"Content-Disposition": 'attachment; filename="Athlete-Life-body.glb"'},
            )
        path = resolve_model(settings, athlete_id)
        if path is None:
            raise DomainError("model_not_found", "3B model bu hesap için bulunamadı.", 404)
        return FileResponse(
            path,
            media_type="model/gltf-binary",
            filename="Athlete-Life-body-library.glb",
            headers={"Cache-Control": "private, no-store"},
        )

    @app.get("/api/v2/bootstrap")
    def bootstrap(request: Request):
        return service.bootstrap(database, UUID(who(request)["athlete_id"]))

    @app.get("/api/v2/changes")
    def changes(request: Request, after: int = 0):
        if after < 0:
            raise DomainError("cursor", "Geçersiz kayıt sırası.")
        return service.pull(database, UUID(who(request)["athlete_id"]), after)

    @app.post("/api/v2/commands", response_model=CommandResult)
    async def command(body: Command, request: Request):
        from starlette.concurrency import run_in_threadpool

        identity = await run_in_threadpool(who, request, True)
        athlete_id = UUID(identity["athlete_id"])
        if body.command_type != "import.apply":
            return await run_in_threadpool(service.execute, database, athlete_id, body)
        if transfer_lock.locked():
            raise DomainError(
                "transfer_busy", "Başka bir dosya aktarımı sürüyor. Kısa süre sonra yeniden dene.", 429
            )
        async with transfer_lock:
            return await run_in_threadpool(service.execute, database, athlete_id, body)

    @app.get("/api/v2/analysis")
    def analysis(
        request: Request,
        as_of: str | None = None,
        on: str | None = None,
        window_days: int = 28,
        model_version: str = "exposure-1",
        knowledge: str = "recomputed",
    ):
        from datetime import date, datetime, time
        from zoneinfo import ZoneInfo

        from .analysis import AnalysisInput, calculate
        from .db import utcnow
        from .models import Athlete

        athlete_id = UUID(who(request)["athlete_id"])
        if as_of is None:
            with database.sessions() as db:
                zone = ZoneInfo(db.get(Athlete, athlete_id).timezone)
            now = utcnow()
            try:
                as_of = (
                    now
                    if on is None or on == now.astimezone(zone).date().isoformat()
                    else datetime.combine(date.fromisoformat(on), time(23, 59, 59), zone)
                ).isoformat()
            except ValueError:
                raise DomainError("date", "Geçersiz tarih.") from None
        data = AnalysisInput.model_validate(
            {
                "as_of": as_of,
                "window_days": window_days,
                "model_version": model_version,
                "knowledge": knowledge,
            }
        )
        return calculate(database, athlete_id, data)

    @app.get("/api/v2/archives/{archive_id}")
    def archive(archive_id: UUID, request: Request):
        from .models import WorkspaceArchive
        from .programming import owned

        athlete_id = UUID(who(request)["athlete_id"])
        with database.sessions() as db:
            row = owned(db, WorkspaceArchive, athlete_id, archive_id)
            return {
                "label": row.label,
                "records": row.raw,
                "counts": row.counts,
                "created_at": row.created_at.isoformat(),
            }

    @app.get("/api/v2/archives/{archive_id}/pdf")
    def archive_pdf(archive_id: UUID, request: Request):
        from .domain.science import compute, instant
        from .reports import build_pdf

        data = archive(archive_id, request)
        result = compute(data["records"], instant(data["created_at"]), window_days=84)
        return Response(
            build_pdf(data["records"], result, data["label"]),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="Athlete-Life-arsiv.pdf"'},
        )

    def report_data(request, on, window_days, as_of, knowledge, saved_id, expected_digest):
        from .analysis import AnalysisInput, calculate
        from .models import AnalysisRun
        from .programming import owned

        account = who(request)
        if saved_id:
            with database.sessions() as db:
                saved = owned(db, AnalysisRun, UUID(account["athlete_id"]), saved_id)
                result = saved.result
                snapshot = result.get("report_records", {})
        else:
            initial = analysis(request, on=on, window_days=window_days, as_of=as_of, knowledge=knowledge)
            result, snapshot = calculate(
                database,
                UUID(account["athlete_id"]),
                AnalysisInput(as_of=initial["as_of"], window_days=window_days, knowledge=knowledge),
                with_snapshot=True,
            )
        if expected_digest and result["input_digest"] != expected_digest:
            raise DomainError(
                "report_changed", "Kayıtlar önizlemeden sonra değişti; raporu yeniden önizle.", 409
            )
        return account, result, snapshot

    @app.get("/api/v2/reports/preview")
    def report_preview(
        request: Request,
        on: str | None = None,
        window_days: int = 28,
        as_of: str | None = None,
        knowledge: str = "recomputed",
        saved_id: UUID | None = None,
        selection: str = "training,nutrition",
        expected_digest: str | None = None,
    ):
        from .reports import report_sections

        _, result, snapshot = report_data(
            request, on, window_days, as_of, knowledge, saved_id, expected_digest
        )
        return report_sections(snapshot, result, selection)

    @app.get("/api/v2/reports/pdf")
    def report_pdf(
        request: Request,
        on: str | None = None,
        window_days: int = 28,
        as_of: str | None = None,
        knowledge: str = "recomputed",
        saved_id: UUID | None = None,
        selection: str = "training,nutrition",
        expected_digest: str | None = None,
    ):
        from .reports import build_pdf

        account, result, snapshot = report_data(
            request, on, window_days, as_of, knowledge, saved_id, expected_digest
        )
        return Response(
            build_pdf(snapshot, result, account["name"], selection),
            media_type="application/pdf",
            headers={"Content-Disposition": 'attachment; filename="Athlete-Life-rapor.pdf"'},
        )

    @app.post("/api/v2/system/integrity")
    def integrity(request: Request):
        from .integrity import run

        who(request, True)
        return run()

    @app.get("/api/v2/evidence")
    def evidence(request: Request):
        from .evidence import RULES

        who(request)
        return {"rules": [r.model_dump(mode="json") for r in RULES], "expert_review": "pending"}

    @app.get("/api/v2/catalogs")
    def catalogs(request: Request):
        from .lifestyle import DEFINITIONS
        from .movements import BY_ID, VERSION

        who(request)
        from .sports import categorized_sports

        sports = {"sports": categorized_sports()}
        return {
            "capabilities": [{k: v for k, v in row.items() if k != "bands"} for row in DEFINITIONS.values()],
            "sports": sports,
            "movements": list(BY_ID.values()),
            "movement_catalog_version": VERSION,
            "notice": "Katalog sayısal kişisel yeterlik ya da otomatik ileri beceri reçetesi değildir.",
        }

    @app.get("/api/v2/nutrition-summary")
    def nutrition_summary(request: Request, on: str):
        from datetime import date

        from .lifestyle import nutrition_summary

        try:
            date.fromisoformat(on)
        except ValueError:
            raise DomainError("date", "Geçersiz tarih.") from None
        return nutrition_summary(service.bootstrap(database, UUID(who(request)["athlete_id"])), on)

    @app.get("/api/v2/capability-series")
    def capability_series(request: Request):
        from .lifestyle import capability_series

        snapshot = service.bootstrap(database, UUID(who(request)["athlete_id"]))
        return {"series": capability_series(snapshot["capabilitys"])}

    @app.post("/api/v2/program-drafts")
    async def program_draft(request: Request):
        from .db import utcnow
        from .programming import DraftRequest, draft_with_context

        identity = who(request, True)
        snapshot = service.bootstrap(database, UUID(identity["athlete_id"]))
        return draft_with_context(DraftRequest.model_validate(await request.json()), snapshot, utcnow())

    @app.get("/api/v2/guided-planning-options")
    def guided_options(request: Request):
        from .planner_catalog import VERSION, options

        who(request)
        from .sport_training import METHODS, coverage
        from .sports import categorized_sports

        return {
            "version": VERSION,
            "movements": options(),
            "sports": categorized_sports(),
            "sport_training": coverage(),
            "training_methods": METHODS,
        }

    @app.post("/api/v2/guided-program-drafts")
    async def guided_program_draft(request: Request):
        from .db import utcnow
        from .guided_planning import GuidedRequest, generate

        identity = who(request, True)
        snapshot = service.bootstrap(database, UUID(identity["athlete_id"]))
        return generate(GuidedRequest.model_validate(await request.json()), snapshot, utcnow())

    @app.get("/api/v2/ai-planning-status")
    def ai_planning_status(request: Request):
        from .ai_planning import status

        who(request)
        return status(settings)

    @app.post("/api/v2/ai-program-drafts")
    async def ai_program_draft(request: Request):
        from starlette.concurrency import run_in_threadpool

        from .ai_planning import AIRequest, call_provider, prepare, require_consent, status, validate_plan
        from .db import utcnow

        identity = who(request, True)
        try:
            data = AIRequest.model_validate(await request.json())
        except ValidationError as exc:
            labels = {
                "goal": "Somut hedefin",
                "name": "Program adı",
                "start_date": "Başlangıç tarihi",
                "weeks": "Dönem süresi",
                "experience": "Deneyim",
                "objective": "Hedef türü",
                "equipment": "Ekipman",
                "weekdays": "Antrenman günleri",
                "minutes": "Seans süresi",
                "split": "Çalışma düzeni",
                "focus": "Bölge öncelikleri",
                "methods": "Çalışma yöntemleri",
                "competencies": "Hareket kapasitesi (tekrar / saniye)",
                "conditioning_minutes": "Kondisyon süresi",
                "adult": "Yetişkin onayı",
                "symptoms": "Belirti bildirimi",
                "consent": "AI veri gönderim onayı",
            }
            fields = list(
                dict.fromkeys(
                    labels.get(str(e["loc"][0]), "Form seçimleri")
                    if e["loc"]
                    else "Antrenman günleri, çalışma düzeni ve bölge öncelikleri"
                    for e in exc.errors()
                )
            )
            raise DomainError(
                "ai_form_invalid",
                "Şu alanları kontrol et: " + ", ".join(fields) + ". Form seçimlerin korundu.",
                details={"fields": fields},
            ) from None
        require_consent(data, settings)
        if not status(settings)["available"]:
            raise DomainError("ai_not_configured", status(settings)["message"], 503)
        snapshot = service.bootstrap(database, UUID(identity["athlete_id"]))
        at = utcnow()
        try:
            baseline, context = prepare(data, snapshot, at)
        except ValidationError:
            raise DomainError(
                "ai_context_invalid",
                "Planlama bağlamı hazırlanamadı. Form seçimlerin korundu; bu bir sunucu doğrulama hatasıdır.",
                502,
            ) from None
        auth.rate_limit(database, "ai-user:" + identity["athlete_id"], settings.ai_user_limit)
        auth.rate_limit(database, "ai-global", settings.ai_global_limit)
        result = await run_in_threadpool(call_provider, settings, context)
        configuration = status(settings)
        try:
            return validate_plan(
                result, data, baseline, context, at, configuration["model"], configuration["provider"]
            )
        except ValidationError:
            raise DomainError(
                "ai_invalid_response",
                "AI yanıtı programın kayıt biçimine uymadı. Form seçimlerin korundu; yeniden taslak hazırlayabilirsin.",
                502,
            ) from None

    @app.get("/api/v2/ai-progress-status")
    def ai_progress_status(request: Request):
        from .ai_progress import configuration

        who(request)
        return configuration(settings)

    @app.post("/api/v2/ai-progress-preview")
    def ai_progress_preview(request: Request, data: dict):
        from .ai_progress import PeriodRequest, configuration, prepare
        from .db import utcnow

        identity = who(request, True)
        period = PeriodRequest.model_validate(data)
        snapshot = service.bootstrap(database, UUID(identity["athlete_id"]))
        return {**prepare(period, snapshot, utcnow()), "configuration": configuration(settings)}

    @app.post("/api/v2/ai-progress-review")
    async def ai_progress_review(request: Request):
        from starlette.concurrency import run_in_threadpool

        from .ai_progress import ReviewRequest, analyze, configuration, prepare
        from .db import utcnow

        identity = who(request, True)
        data = ReviewRequest.model_validate(await request.json())
        current = configuration(settings)
        if not current["available"]:
            raise DomainError("ai_not_configured", current["message"], 503)
        if data.consent != current["consent_version"]:
            raise DomainError(
                "progress_consent", "Sağlayıcı değişti. Gönderim özetini açıp onayını yenile.", 409
            )
        snapshot = service.bootstrap(database, UUID(identity["athlete_id"]))
        preview = prepare(data, snapshot, utcnow())
        if preview["digest"] != data.preview_digest:
            raise DomainError(
                "progress_stale", "Kayıtlar değişti. Gönderilecek özeti yeniden açıp onayla.", 409
            )
        if not preview["context"]["coverage"]["selected_signal_count"]:
            raise DomainError("progress_empty", "Seçilen dönemde analiz edilebilecek kayıt yok.")
        auth.rate_limit(database, "ai-user:" + identity["athlete_id"], settings.ai_user_limit)
        auth.rate_limit(database, "ai-global", settings.ai_global_limit)
        return await run_in_threadpool(analyze, settings, preview)

    @app.get("/api/v2/movement-alternatives")
    def movement_alternatives(request: Request, movement_id: str):
        from .planning_context import alternatives, profile_context

        snapshot = service.bootstrap(database, UUID(who(request)["athlete_id"]))
        profiles = [p for p in snapshot["profiles"] if not p.get("deleted_at")]
        context = profile_context(profiles[0] if profiles else None)
        equipment = context.get("equipment")
        return {
            "candidates": alternatives(
                movement_id,
                equipment["equipment"] if equipment else None,
                context.get("preferences", {}).get("disliked_movements", []),
            ),
            "context": context,
            "notice": "Tercih/ekipman alternatifleri; ağrı için güvenli hareket önerisi değildir. Yükü yeniden belirle.",
        }

    @app.get("/api/v2/schedule-window")
    def schedule_window(request: Request, on: str):
        from datetime import date

        from .domain.scheduling import propose_week

        try:
            chosen = date.fromisoformat(on)
        except ValueError:
            raise DomainError("date", "Geçerli bir tarih seç.") from None
        snapshot = service.bootstrap(database, UUID(who(request)["athlete_id"]))
        return propose_week(chosen, snapshot["shifts"])[0]

    @app.post("/api/v2/program-duration")
    async def program_duration(request: Request):
        from .planning_context import duration_preview
        from .programming import DurationRequest

        who(request, True)
        data = DurationRequest.model_validate(await request.json())
        return duration_preview(
            [d.model_dump() for d in data.days], data.execution_seconds, data.transition_seconds
        )

    @app.post("/api/v2/imports/stage")
    async def stage_import(request: Request):
        from starlette.concurrency import run_in_threadpool

        from .backups import parse_stream, stage_object

        identity = UUID(who(request, True)["athlete_id"])
        temporary = await transfer_file(request)
        try:
            package = await run_in_threadpool(parse_stream, temporary)
        finally:
            temporary.close()
        return await run_in_threadpool(stage_object, database, identity, package)

    @app.get("/api/v2/backups/export")
    def export_backup(request: Request):
        from fastapi.responses import StreamingResponse

        from .backups import full_export
        from .large_json import json_bytes

        package = full_export(database, UUID(who(request)["athlete_id"]), stream_media=True)
        return StreamingResponse(json_bytes(package, ensure_ascii=True), media_type="application/json")

    @app.get("/api/v2/sets/export.csv")
    def export_sets_csv(request: Request):
        from .csv_transfer import export

        snapshot = service.bootstrap(database, UUID(who(request)["athlete_id"]))
        return Response(
            export(snapshot["sets"]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": 'attachment; filename="Athlete-Life-gercek-setler.csv"'},
        )

    @app.get("/api/v2/legacy")
    def legacy_records(request: Request, domain: str | None = None, offset: int = 0):
        from sqlalchemy import select

        from .models import LegacyRecord

        if offset < 0:
            raise DomainError("offset", "Geçersiz sayfa.")
        athlete_id = UUID(who(request)["athlete_id"])
        with database.sessions() as db:
            query = select(LegacyRecord).where(LegacyRecord.athlete_id == athlete_id)
            if domain:
                query = query.where(LegacyRecord.domain == domain)
            rows = list(
                db.scalars(query.order_by(LegacyRecord.pointer, LegacyRecord.id).offset(offset).limit(101))
            )
            return {"records": [service.serial(r) for r in rows[:100]], "has_more": len(rows) > 100}

    @app.get("/api/v2/media/{entity_id}")
    def media(request: Request, entity_id: UUID):
        from fastapi.responses import Response
        from sqlalchemy import select

        from .models import MediaObject

        athlete_id = UUID(who(request)["athlete_id"])
        with database.sessions() as db:
            row = db.scalar(
                select(MediaObject).where(
                    MediaObject.id == entity_id,
                    MediaObject.athlete_id == athlete_id,
                    MediaObject.deleted_at.is_(None),
                )
            )
            if not row:
                raise DomainError("not_found", "Fotoğraf bulunamadı.", 404)
            if row.mime not in {"image/jpeg", "model/gltf-binary"}:
                raise DomainError("media_type", "Medya türü güvenle görüntülenemiyor.", 422)
            return Response(
                row.content,
                media_type=row.mime,
                headers={
                    "Content-Disposition": 'attachment; filename="body.glb"'
                    if row.mime == "model/gltf-binary"
                    else 'inline; filename="photo.jpg"'
                },
            )

    @app.get("/{path:path}")
    def frontend(path: str):
        root = settings.static_dir.resolve()
        target = (root / (path or "index.html")).resolve()
        if not target.is_relative_to(root) or not target.is_file():
            raise DomainError("not_found", "Sayfa bulunamadı.", 404)
        if target.suffix not in {
            ".html",
            ".js",
            ".css",
            ".svg",
            ".png",
            ".webmanifest",
            ".woff2",
            ".ico",
        } and path not in {"anatomy/muscles.glb", "anatomy/LICENSE.txt"}:
            raise DomainError("not_found", "Sayfa bulunamadı.", 404)
        return FileResponse(target)

    return app
