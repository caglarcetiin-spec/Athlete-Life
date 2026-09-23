"""All domain writes commit data, audit, cursor and durable work as one transaction."""

import hashlib
import json
from datetime import date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import inspect, select
from sqlalchemy.exc import IntegrityError

from .contracts import Command, Empty, Optimize, ShiftPatch
from .db import utcnow
from .domain.scheduling import propose_week, shift_interval
from .errors import DomainError
from .models import (
    AnalysisRun,
    Athlete,
    Audit,
    Change,
    ImportRun,
    MediaObject,
    Operation,
    Optimization,
    Outbox,
    PerformedSet,
    Prescription,
    PrescriptionSlot,
    Program,
    ProgramDay,
    ProgramExercise,
    Shift,
    WorkoutSession,
    WorkspaceArchive,
)

MODELS = {
    "shift": Shift,
    "optimization": Optimization,
    "import": ImportRun,
    "media": MediaObject,
    "program": Program,
    "program_day": ProgramDay,
    "program_exercise": ProgramExercise,
    "prescription": Prescription,
    "slot": PrescriptionSlot,
    "session": WorkoutSession,
    "set": PerformedSet,
    "analysis": AnalysisRun,
    "archive": WorkspaceArchive,
}

# Imported after base command helpers are defined below; lifecycle models remain normalized.


def serial(row):
    result = {}
    for col in inspect(type(row)).columns:
        if col.key in {"athlete_id", "raw", "content"}:
            continue
        value = getattr(row, col.key)
        result[col.key] = (
            value.isoformat()
            if isinstance(value, (date, datetime))
            else (str(value) if isinstance(value, UUID) else value)
        )
    return result


def digest_of(value):
    return hashlib.sha256(
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode()
    ).hexdigest()


def get_owned(db, model, athlete_id, entity_id, version, create=False):
    row = db.scalar(select(model).where(model.id == entity_id, model.athlete_id == athlete_id))
    if row is None:
        if not create or version != 0:
            raise DomainError("not_found", "Kayıt bulunamadı.", 404)
        # A global ID collision never discloses the other owner's record.
        if db.get(model, entity_id):
            raise DomainError("not_found", "Kayıt bulunamadı.", 404)
        return None
    if row.deleted_at or row.version != version:
        raise DomainError(
            "version_conflict",
            "Bu kayıt başka bir yerde değişti. İki sürümü karşılaştır.",
            409,
            {"current": serial(row)},
        )
    return row


def apply_shift(db, athlete, command):
    action = command.command_type.split(".")[1]
    row = get_owned(
        db, Shift, athlete.id, command.entity_id, command.expected_version, create=action == "save"
    )
    before = serial(row) if row else None
    if action == "delete":
        Empty.model_validate(command.payload)
        row.deleted_at = utcnow()
    elif action == "save":
        fields = ShiftPatch.model_validate(command.payload).model_dump(exclude_unset=True)
        if not fields:
            raise DomainError("empty_patch", "Kaydedilecek değişiklik yok.")
        if row is None:
            if "local_date" not in fields:
                raise DomainError("date_required", "Vardiya tarihi gerekli.")
            row = Shift(
                id=command.entity_id,
                athlete_id=athlete.id,
                timezone=athlete.timezone,
                status="off",
                start_fold=0,
                end_fold=0,
                social="",
                commute_min=30,
                prep_min=30,
                sleep_target_min=480,
                pinned=False,
                version=0,
            )
            db.add(row)
        for key, value in fields.items():
            setattr(row, key, value)
        try:
            ZoneInfo(row.timezone)
        except (ZoneInfoNotFoundError, ValueError):
            raise DomainError("timezone", "Geçerli bir saat dilimi seç.") from None
        if row.status == "work":
            if not row.start_local or not row.end_local:
                raise DomainError("hours_required", "Çalışma başlangıcı ve bitişi gerekli.")
            row.start_at, row.end_at = shift_interval(
                row.local_date, row.start_local, row.end_local, row.timezone, row.start_fold, row.end_fold
            )
        else:
            row.start_at = row.end_at = None
    else:
        raise DomainError("unknown_command", "Desteklenmeyen işlem.")
    row.version += 1
    row.updated_at = utcnow()
    db.flush()
    changes = [{"kind": "shift", "entity": serial(row)}]
    # Invalidate affected proposals, keeping the previous result visible with its provenance.
    dates = [row.local_date]
    if before:
        dates.append(date.fromisoformat(before["local_date"]))
    for proposal in db.scalars(
        select(Optimization).where(
            Optimization.athlete_id == athlete.id,
            Optimization.status != "stale",
            Optimization.deleted_at.is_(None),
        )
    ):
        if any(proposal.week_start <= day < proposal.week_start + timedelta(days=7) for day in dates):
            proposal.status, proposal.version, proposal.updated_at = "stale", proposal.version + 1, utcnow()
            changes.append({"kind": "optimization", "entity": serial(proposal)})
    return row, before, changes


def apply_optimization(db, athlete, command):
    action = command.command_type.split(".")[1]
    row = get_owned(
        db, Optimization, athlete.id, command.entity_id, command.expected_version, create=action == "propose"
    )
    before = serial(row) if row else None
    if action == "propose" and row is None:
        spec = Optimize.model_validate(command.payload)
        if spec.input_cursor != athlete.sequence:
            raise DomainError("stale_inputs", "Önce bekleyen kayıtları eşitle, ardından yeniden planla.", 409)
        shifts = list(
            db.scalars(
                select(Shift).where(
                    Shift.athlete_id == athlete.id,
                    Shift.deleted_at.is_(None),
                    Shift.local_date >= spec.week_start,
                    Shift.local_date < spec.week_start + timedelta(days=7),
                )
            )
        )
        rows = [serial(s) for s in shifts]
        row = Optimization(
            id=command.entity_id,
            athlete_id=athlete.id,
            week_start=spec.week_start,
            input_sequence=athlete.sequence,
            items=propose_week(spec.week_start, rows),
            input_lineage=[{"id": r["id"], "version": r["version"]} for r in rows],
        )
        db.add(row)
    elif action == "accept" and row:
        Empty.model_validate(command.payload)
        if row.status != "proposed":
            raise DomainError("stale_proposal", "Yalnız güncel bir öneriyi plana alabilirsin.", 409)
        row.status, row.version, row.updated_at = "accepted", row.version + 1, utcnow()
    else:
        raise DomainError("invalid_transition", "Bu işlem önerinin mevcut durumuna uygun değil.", 409)
    db.flush()
    return row, before, [{"kind": "optimization", "entity": serial(row)}]


def register_lifestyle():
    from .lifestyle import REGISTRY

    MODELS.update({kind: model for kind, (model, _) in REGISTRY.items()})


def execute(database, athlete_id: UUID, command: Command):
    register_lifestyle()
    digest = digest_of(command.model_dump(mode="json"))
    try:
        with database.sessions.begin() as db:
            # All writers acquire this lock BEFORE allocating a sequence or changing an entity.
            athlete = db.get(Athlete, athlete_id, with_for_update=True)
            if not athlete:
                raise DomainError("not_found", "Profil bulunamadı.", 404)
            existing = db.get(Operation, (athlete_id, command.operation_id))
            if existing:
                if existing.digest != digest:
                    raise DomainError(
                        "operation_mismatch", "Aynı işlem kimliği farklı içerikle kullanılamaz.", 409
                    )
                return existing.response
            prefix = command.command_type.split(".")[0]
            from .analysis import apply as apply_analysis
            from .backups import apply_import
            from .execution import apply_session, apply_set
            from .lifecycle import apply as apply_lifecycle
            from .lifestyle import REGISTRY
            from .lifestyle import apply as apply_lifestyle
            from .media import apply_media
            from .programming import apply_prescription, apply_program

            handler = {
                "archive": apply_lifecycle,
                "record": apply_lifecycle,
                "analysis": apply_analysis,
                "shift": apply_shift,
                "optimization": apply_optimization,
                "import": apply_import,
                "media": apply_media,
                "program": apply_program,
                "prescription": apply_prescription,
                "session": apply_session,
                "set": apply_set,
            }.get(prefix)
            if not handler and prefix in REGISTRY:
                handler = apply_lifestyle
            if not handler:
                raise DomainError("unknown_command", "İşlem sürümü desteklenmiyor. Güncelleme gerekli.", 422)
            row, before, changes = handler(db, athlete, command)
            athlete.sequence += 1
            result = {
                "operation_id": str(command.operation_id),
                "cursor": athlete.sequence,
                "entity": serial(row),
                "changes": changes,
                "committed_at": utcnow().isoformat(),
            }
            db.add_all(
                [
                    Operation(
                        athlete_id=athlete_id,
                        operation_id=command.operation_id,
                        digest=digest,
                        response=result,
                    ),
                    Change(
                        athlete_id=athlete_id,
                        sequence=athlete.sequence,
                        operation_id=command.operation_id,
                        changes=changes,
                    ),
                    Audit(
                        athlete_id=athlete_id,
                        operation_id=command.operation_id,
                        command=command.command_type,
                        entity_id=command.entity_id,
                        before=before,
                        after=serial(row),
                    ),
                    Outbox(
                        athlete_id=athlete_id,
                        operation_id=command.operation_id,
                        topic="domain.changed",
                        payload={"cursor": athlete.sequence, "kind": prefix},
                    ),
                ]
            )
        # Context manager committed successfully. Never send a successful response before this point.
        return result
    except IntegrityError:
        raise DomainError(
            "constraint_conflict", "Bu tarihte kayıt var veya kayıt ilişkisi geçersiz.", 409
        ) from None


def bootstrap(database, athlete_id):
    register_lifestyle()
    with (
        database.engine.connect().execution_options(isolation_level="REPEATABLE READ") as conn,
        database.sessions(bind=conn) as db,
        db.begin(),
    ):
        athlete = db.get(Athlete, athlete_id)
        result = {
            "api_version": 2,
            "schema_version": 1,
            "athlete_id": str(athlete_id),
            "cursor": athlete.sequence,
            "generation": str(athlete.generation),
            "timezone": athlete.timezone,
            "week_start": athlete.week_start,
            "day_boundary_hour": athlete.day_boundary_hour,
            "server_time": utcnow().isoformat(),
        }
        for kind, model in MODELS.items():
            result[kind + "s"] = [
                serial(r)
                for r in db.scalars(select(model).where(model.athlete_id == athlete_id).order_by(model.id))
            ]
        return result


def pull(database, athlete_id, cursor):
    with (
        database.engine.connect().execution_options(isolation_level="REPEATABLE READ") as conn,
        database.sessions(bind=conn) as db,
        db.begin(),
    ):
        athlete = db.get(Athlete, athlete_id)
        if cursor > athlete.sequence:
            raise DomainError(
                "cursor_ahead", "Yerel kopya bu sunucudan ileride. Otomatik üstüne yazılmadı.", 409
            )
        rows = list(
            db.scalars(
                select(Change)
                .where(Change.athlete_id == athlete_id, Change.sequence > cursor)
                .order_by(Change.sequence)
                .limit(250)
            )
        )
        next_cursor = rows[-1].sequence if rows else cursor
        return {
            "cursor": next_cursor,
            "has_more": next_cursor < athlete.sequence,
            "generation": str(athlete.generation),
            "changes": [
                {"cursor": r.sequence, "operation_id": str(r.operation_id), "changes": r.changes}
                for r in rows
            ],
        }
