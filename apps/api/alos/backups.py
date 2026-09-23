"""Bounded import staging, lossless legacy archive, and owner-scoped full backups."""

import base64
import hashlib
import json
import math
import re
from datetime import date, datetime
from uuid import UUID, uuid5
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import rfc8785
from sqlalchemy import Date, DateTime, Uuid, func, inspect, select

from .contracts import Empty
from .db import utcnow
from .errors import DomainError
from .models import Athlete, Audit, Change, ImportRun, LegacyRecord, MediaObject, Operation
from .service import MODELS, digest_of, get_owned, serial

MAX_BYTES = 64 * 1024 * 1024
MAX_NODES = 100_000
KNOWN_FIELDS = {
    "settings",
    "profile",
    "athleteProfile",
    "athleteProfileHistory",
    "personalHealthProfile",
    "personalHealthHistory",
    "characterData",
    "characterOverrides",
    "daily",
    "scheduleByDate",
    "week",
    "weekOptimizations",
    "social",
    "trainingPeriods",
    "trainingPeriodDraft",
    "trainingPeriodDrafts",
    "multisportPeriods",
    "customSports",
    "programEngine",
    "generatedWeekPlan",
    "futurePlans",
    "sessionPrescriptions",
    "planHistory",
    "sessionFeedback",
    "adherencePlans",
    "deviationReasons",
    "gapReconciliation",
    "trainingLogs",
    "activeGuidedWorkout",
    "guidedWorkoutHistory",
    "activeWorkoutRun",
    "workoutRunHistory",
    "sportSessions",
    "sportSessionHistory",
    "removedSportSessions",
    "adHocSessions",
    "runs",
    "foodLogs",
    "water",
    "waterLogs",
    "painLogs",
    "healthEpisodes",
    "healthAdjustments",
    "cycleDays",
    "healthLabRecords",
    "healthLabHistory",
    "bodyMeasurements",
    "capabilityRecords",
    "athleteGoals",
    "goalMeasurements",
    "goalHistory",
    "tissueLoad",
    "adaptiveModel",
    "modelSnapshots",
    "calibration",
    "lifecycle",
    "workspaceArchives",
    "workspaceGeneration",
    "photoProgress",
    "uiState",
    "meta",
    "_portableImport",
    "training",
    "workouts",
    "exerciseLogs",
    "sessions",
}


def bounded(value):
    stack = [(value, 0)]
    count = 0
    while stack:
        item, depth = stack.pop()
        count += 1
        if depth > 40 or count > MAX_NODES:
            raise DomainError("import_complexity", "Yedek çok derin veya çok fazla kayıt içeriyor.", 413)
        if isinstance(item, dict):
            if any(not isinstance(k, str) or len(k) > 1000 for k in item):
                raise DomainError("import_key", "Geçersiz alan adı.")
            stack.extend((v, depth + 1) for v in item.values())
        elif isinstance(item, list):
            stack.extend((v, depth + 1) for v in item)
        elif isinstance(item, float) and not math.isfinite(item):
            raise DomainError("import_number", "Sonlu bir sayı gerekli.")
        elif isinstance(item, str):
            try:
                item.encode("utf-8")
            except UnicodeError:
                raise DomainError("import_text", "Geçersiz Unicode metni.") from None
        elif not isinstance(item, (int, float, bool, type(None))):
            raise DomainError("import_type", "Desteklenmeyen yedek alanı.")
    return value


def parse_bytes(raw):
    if len(raw) > MAX_BYTES:
        raise DomainError("import_size", "Yedek 64 MB sınırını aşıyor.", 413)
    if raw.startswith((b"PK", b"\x1f\x8b")):
        raise DomainError(
            "compressed_not_supported", "Sıkıştırılmış dosya açılmaz. Uygulamanın JSON veri yedeğini seç."
        )

    def pairs(items):
        output = {}
        for key, value in items:
            if key in output:
                raise ValueError("duplicate key")
            output[key] = value
        return output

    try:
        obj = json.loads(
            raw.decode("utf-8-sig"),
            object_pairs_hook=pairs,
            parse_constant=lambda x: (_ for _ in ()).throw(ValueError("nonfinite")),
        )
        bounded(obj)
    except (ValueError, UnicodeError, RecursionError):
        raise DomainError("invalid_backup", "Dosya geçerli, sınırlı bir JSON yedeği değil.") from None
    if not isinstance(obj, dict):
        raise DomainError("invalid_backup", "Yedek kökü bir nesne olmalı.")
    return obj


def export_checksum(body):
    algorithm = body.get("checksum_algorithm", "ALOS-JSON-SHA256")
    if algorithm == "RFC8785-SHA256":
        try:
            return hashlib.sha256(rfc8785.dumps(body)).hexdigest()
        except (ValueError, OverflowError):
            raise DomainError("checksum_number", "Yedek standart sayısal biçimde doğrulanamadı.") from None
    if algorithm == "ALOS-JSON-SHA256":
        return digest_of(body)
    raise DomainError("checksum_algorithm", "Yedek imza yöntemi desteklenmiyor.")


def validate_export(obj):
    if obj.get("format") != "alos-v2-backup" or obj.get("backup_schema_version") != 1:
        raise DomainError("backup_schema", "Yedek sürümü desteklenmiyor.")
    body = {k: v for k, v in obj.items() if k != "checksum"}
    if export_checksum(body) != obj.get("checksum"):
        raise DomainError("checksum", "Yedek bütünlük kontrolünden geçemedi.")
    records = obj.get("records")
    if not isinstance(records, dict) or set(records) - set(export_models()):
        raise DomainError("backup_schema", "Yedekte desteklenmeyen kayıt grubu var.")
    counts = obj.get("counts", {})
    for kind, rows in records.items():
        if not isinstance(rows, list) or counts.get(kind) != len(rows):
            raise DomainError("backup_counts", "Yedek kayıt sayıları uyuşmuyor.")
        for row in rows:
            if not isinstance(row, dict) or not isinstance(row.get("id"), str):
                raise DomainError("backup_record", "Yedek kayıt biçimi geçersiz.")
            try:
                UUID(row["id"])
            except ValueError:
                raise DomainError("backup_record", "Yedek kayıt kimliği geçersiz.") from None
    return obj


def detect(obj):
    if obj.get("format") == "alos-v2-transfer-text":
        raw = obj.get("canonical_text")
        if not isinstance(raw, str):
            raise DomainError("backup_schema", "Özgün sunucu yedek metni gerekli.")
        canonical = parse_bytes(raw.encode("utf-8"))
        validate_export(canonical)
        if not isinstance(obj.get("pending_journal", []), list):
            raise DomainError("journal", "Bekleyen işlem listesi geçersiz.")
        return "v2_transfer", canonical
    if obj.get("format") == "alos-v2-transfer":
        validate_export(obj.get("canonical", {}))
        if not isinstance(obj.get("pending_journal", []), list):
            raise DomainError("journal", "Bekleyen işlem listesi geçersiz.")
        return "v2_transfer", obj["canonical"]
    if obj.get("format") == "alos-local-journal":
        return "local_journal", obj
    if obj.get("format") == "alos-v2-backup":
        validate_export(obj)
        return "v2", obj
    if obj.get("format") == "alos-portable-backup":
        if obj.get("schemaVersion") not in (1, 2):
            raise DomainError("legacy_schema", "Eski yedek şeması desteklenmiyor.")
        checksum = obj.get("integrity", {}).get("sha256")
        if checksum:
            try:
                actual = hashlib.sha256(
                    rfc8785.dumps({k: v for k, v in obj.items() if k != "integrity"})
                ).hexdigest()
            except (ValueError, OverflowError):
                raise DomainError(
                    "checksum_format", "Eski yedeğin sayı biçimi güvenle doğrulanamadı."
                ) from None
            if actual != checksum:
                raise DomainError("checksum", "Eski yedek bütünlük kontrolünden geçemedi.")
        if not isinstance(obj.get("data"), dict):
            raise DomainError("legacy_data", "Yedekte data bölümü bulunamadı.")
        return "legacy_portable", obj["data"]
    if isinstance(obj.get("data"), dict):
        return "legacy_wrapper", obj["data"]
    if isinstance(obj.get("athleteLifeOS"), str):
        data = parse_bytes(obj["athleteLifeOS"].encode())
        return "local_storage", data
    if set(obj) & KNOWN_FIELDS:
        return "legacy_raw", obj
    raise DomainError(
        "unknown_backup", "Athlete Life veri yedeği bulunamadı. Kod ZIP dosyası veri yedeği değildir."
    )


def escape(key):
    return str(key).replace("~", "~0").replace("/", "~1")


def legacy_rows(data):
    for key, value in data.items():
        if isinstance(value, list):
            for index, row in enumerate(value):
                yield key, "/" + escape(key) + "/" + str(index), row
            if not value:
                yield key, "/" + escape(key), value
        elif isinstance(value, dict) and key not in {"settings", "profile", "meta"}:
            for sub, row in value.items():
                if isinstance(row, list) and row:
                    for index, item in enumerate(row):
                        yield key, "/" + escape(key) + "/" + escape(sub) + "/" + str(index), item
                else:
                    yield key, "/" + escape(key) + "/" + escape(sub), row
            if not value:
                yield key, "/" + escape(key), value
        else:
            yield key, "/" + escape(key), value


def preview(obj):
    format, data = detect(obj)
    if format in ("v2", "v2_transfer"):
        return format, {
            "counts": data["counts"],
            "unknown_fields": [],
            "warnings": ["Geri yükleme yalnız boş bir profile uygulanır. Mevcut kayıtlar ezilmez."],
            "pending_count": len(obj.get("pending_journal", [])),
            "canonical_restore": True,
        }
    counts = {}
    date_only = 0
    unknown = []
    candidates = []
    seen = {}
    for kind, path, row in legacy_rows(data):
        counts[kind] = counts.get(kind, 0) + 1
        if kind not in KNOWN_FIELDS:
            unknown.append(path)
        value = digest_of(row)
        if value in seen and kind in {"trainingLogs", "sportSessions", "foodLogs", "capabilityRecords"}:
            candidates.append([seen[value], path])
        seen[value] = path
        if (
            re.search(r"/\d{4}-\d{2}-\d{2}(?:/|$)", path)
            or isinstance(row, dict)
            and any(
                re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(row.get(k, ""))) for k in ["date", "day", "dateKey"]
            )
        ):
            date_only += 1
    warnings = [
        "Bütün alanlar orijinal biçimiyle korunur. Belirsiz kayıtlar otomatik olarak yapılmış antrenmana çevrilmez."
    ]
    if data.get("week"):
        warnings.append("Hafta indekslerinin kesin tarihi bilinmeyebilir; bugünkü haftaya atanmaz.")
    return format, {
        "counts": counts,
        "unknown_fields": unknown,
        "duplicate_candidates": candidates,
        "date_only_records": date_only,
        "warnings": warnings,
        "photo_count": len(obj.get("photos", [])),
        "canonical_restore": False,
    }


def stage(database, athlete_id, raw):
    obj = parse_bytes(raw)
    format, summary = preview(obj)
    digest = digest_of(obj)
    with database.sessions.begin() as db:
        db.get(Athlete, athlete_id, with_for_update=True)
        existing = db.scalar(
            select(ImportRun).where(ImportRun.athlete_id == athlete_id, ImportRun.source_digest == digest)
        )
        if existing:
            return serial(existing)
        row = ImportRun(athlete_id=athlete_id, format=format, source_digest=digest, summary=summary, raw=obj)
        db.add(row)
        db.flush()
        return serial(row)


def export_models():
    from .service import register_lifestyle

    register_lifestyle()
    return {**MODELS, "legacy": LegacyRecord}


def export_row(row):
    data = serial(row)
    # Raw provenance is deliberately in the owner's backup, never in a bootstrap summary.
    if hasattr(row, "raw"):
        data["raw"] = row.raw
    if isinstance(row, MediaObject):
        data["content"] = base64.b64encode(row.content).decode()
    return data


def full_export(database, athlete_id):
    with (
        database.engine.connect().execution_options(isolation_level="REPEATABLE READ") as conn,
        database.sessions(bind=conn) as db,
        db.begin(),
    ):
        athlete = db.get(Athlete, athlete_id)
        records = {
            kind: [
                export_row(r)
                for r in db.scalars(select(model).where(model.athlete_id == athlete_id).order_by(model.id))
            ]
            for kind, model in export_models().items()
        }
        body = {
            "format": "alos-v2-backup",
            "backup_schema_version": 1,
            "api_version": 2,
            "exported_at": utcnow().isoformat(),
            "athlete_id": str(athlete_id),
            "cursor": athlete.sequence,
            "athlete_settings": {
                "timezone": athlete.timezone,
                "week_start": athlete.week_start,
                "day_boundary_hour": athlete.day_boundary_hour,
            },
            "records": records,
            "counts": {kind: len(rows) for kind, rows in records.items()},
            "pending_journal": [],
            "history": {
                kind: [serial(r) for r in db.scalars(select(model).where(model.athlete_id == athlete_id))]
                for kind, model in {"audit": Audit, "operations": Operation, "changes": Change}.items()
            },
            "retention": "Aktif hesap audit geçmişi bu yedeğe dahildir. Kişisel restore eski taşıma kuyruğunu yeniden oynatmaz; geçmiş kaynak pakette korunur.",
            "limits": [
                "Bu export sunucuya ulaşmış kayıtları içerir. Cihazdaki bekleyen işlemler ayrıca eklenir."
            ],
        }
        body["checksum_algorithm"] = "RFC8785-SHA256"
        try:
            checksum = hashlib.sha256(rfc8785.dumps(body)).hexdigest()
        except (ValueError, OverflowError):
            # Exact-text transport preserves legacy integers outside JavaScript's safe range.
            body["checksum_algorithm"] = "ALOS-JSON-SHA256"
            checksum = digest_of(body)
        return {**body, "checksum": checksum}


def _hydrate(model, fields):
    columns = {c.key: c for c in inspect(model).columns}
    if set(fields) - set(columns):
        raise DomainError("restore_schema", "Yedek kaydı bilinmeyen alan içeriyor.")
    result = {}
    for key, value in fields.items():
        typ = columns[key].type
        if value is None:
            result[key] = None
        elif isinstance(typ, DateTime):
            result[key] = datetime.fromisoformat(value)
            if result[key].tzinfo is None:
                raise DomainError("restore_time", "Yedek saat dilimi eksik.")
        elif key == "content":
            try:
                result[key] = base64.b64decode(value, validate=True)
            except (ValueError, TypeError):
                raise DomainError("media_encoding", "Medya okunamadı.") from None
        elif isinstance(typ, Date):
            result[key] = date.fromisoformat(value)
        elif isinstance(typ, Uuid):
            result[key] = UUID(value)
        else:
            result[key] = value
    return result


def hydrate(model, fields):
    try:
        return _hydrate(model, fields)
    except (ValueError, TypeError, OverflowError):
        raise DomainError("restore_value", "Yedekte geçersiz tarih, kimlik veya veri biçimi var.") from None


def dependency_order(rows, reference):
    pending = {r["id"]: r for r in rows}
    result = []
    seen = set()
    while pending:
        ready = [r for r in pending.values() if not r.get(reference) or r[reference] in seen]
        if not ready:
            raise DomainError("restore_relation", "Yedekte eksik veya döngüsel kayıt ilişkisi var.")
        for row in sorted(ready, key=lambda r: r["id"]):
            result.append(row)
            seen.add(row["id"])
            pending.pop(row["id"])
    return result


def restore_rows(db, athlete, package):
    validate_export(package)
    validate_restore_relations(package["records"])
    models = export_models()
    for kind, model in models.items():
        # The stage request is allowed; existing canonical or applied history is not overwritten.
        query = select(func.count()).select_from(model).where(model.athlete_id == athlete.id)
        if model is ImportRun:
            query = query.where(ImportRun.status == "applied")
        if db.scalar(query):
            raise DomainError(
                "restore_nonempty", "Geri yükleme için boş bir profil/izole veritabanı gerekli.", 409
            )
    ids = {
        row["id"]: str(uuid5(athlete.id, "restore:" + row["id"]))
        for rows in package["records"].values()
        for row in rows
    }

    def remap(value):
        if isinstance(value, str):
            return ids.get(value, value)
        if isinstance(value, list):
            return [remap(v) for v in value]
        if isinstance(value, dict):
            return {k: remap(v) for k, v in value.items()}
        return value

    changes = []
    for kind, model in models.items():
        rows = package["records"].get(kind, [])
        if kind in ("program", "event"):
            rows = dependency_order(rows, "parent_id" if kind == "program" else "duplicate_of")
        for original in rows:
            fields = remap(original)
            if model is ImportRun:
                fields["raw"] = original["raw"]
            if model is LegacyRecord:
                fields["value"] = original["value"]
            fields["athlete_id"] = str(athlete.id)
            validate_restored_record(kind, fields)
            row = model(**hydrate(model, fields))
            if model is MediaObject and hashlib.sha256(row.content).hexdigest() != row.sha256:
                raise DomainError("media_checksum", "Medya bütünlük kontrolünden geçemedi.")
            if model is MediaObject:
                from .media import validate_restored_media

                validate_restored_media(row.mime, row.content)
            db.add(row)
            db.flush()
            if kind != "legacy":
                changes.append({"kind": kind, "entity": serial(row)})
    settings = package.get("athlete_settings", {})
    try:
        ZoneInfo(settings.get("timezone", athlete.timezone))
        for key, upper in (("week_start", 6), ("day_boundary_hour", 23)):
            if key in settings and (type(settings[key]) is not int or not 0 <= settings[key] <= upper):
                raise ValueError("calendar")
    except (ValueError, TypeError, ZoneInfoNotFoundError):
        raise DomainError("restore_settings", "Yedekteki saat dilimi veya takvim ayarı geçersiz.") from None
    for key in ("timezone", "week_start", "day_boundary_hour"):
        if key in settings:
            setattr(athlete, key, settings[key])
    return changes


def validate_restore_relations(records):
    by_kind = {kind: {row["id"]: row for row in rows} for kind, rows in records.items()}

    def related(kind, identity):
        row = by_kind.get(kind, {}).get(identity)
        if row is None:
            raise DomainError("restore_relation", "Yedekte ilişkili kayıt bulunamadı.")
        return row

    for prescription in records.get("prescription", []):
        if prescription.get("day_id"):
            day = related("program_day", prescription["day_id"])
            if day.get("program_id") != prescription.get("program_id"):
                raise DomainError("restore_relation", "Reçete ve program günü uyuşmuyor.")
    for session in records.get("session", []):
        if session.get("prescription_id"):
            prescription = related("prescription", session["prescription_id"])
            if prescription.get("scheduled_date") != session.get("local_date"):
                raise DomainError("restore_relation", "Seans ve reçete tarihi uyuşmuyor.")
    for performed in records.get("set", []):
        session = related("session", performed.get("session_id"))
        if performed.get("local_date") != session.get("local_date"):
            raise DomainError("restore_relation", "Set ve seans tarihi uyuşmuyor.")
        if performed.get("slot_id"):
            slot = related("slot", performed["slot_id"])
            if slot.get("prescription_id") != session.get("prescription_id"):
                raise DomainError("restore_relation", "Set başka bir seansın reçetesine bağlı.")
            if performed.get("status") not in {"substituted", "skipped"} and any(
                performed.get(key) != slot.get(key) for key in ("movement_id", "variant")
            ):
                raise DomainError("restore_relation", "Farklı hareket alternatif olarak belirtilmeli.")


def validate_restored_record(kind, fields):
    """A checksum proves transport integrity, not valid domain values."""
    from pydantic import ValidationError

    from .contracts import ShiftPatch
    from .domain.workouts import Targets
    from .execution import ActualInput, OpenSession
    from .lifestyle import REGISTRY, Ingredient
    from .programming import ExerciseInput, TargetRange

    schema = REGISTRY.get(kind, (None, None))[1]
    schema = {
        "set": ActualInput,
        "session": OpenSession,
        "program_exercise": ExerciseInput,
        "slot": Targets,
        "shift": ShiftPatch,
    }.get(kind, schema)
    try:
        if fields.get("timezone"):
            ZoneInfo(fields["timezone"])
        if schema:
            values = {key: fields[key] for key in schema.model_fields if key in fields}
            if kind == "recipe":
                values["ingredients"] = [
                    {key: item[key] for key in Ingredient.model_fields if key in item}
                    for item in values.get("ingredients", [])
                ]
            schema.model_validate(values)
        if kind in {"program_exercise", "slot"} and fields.get("target_range"):
            TargetRange.model_validate(fields["target_range"])
        if kind == "set" and fields.get("time_precision") == "exact" and not fields.get("occurred_at"):
            raise ValueError("exact time missing")
    except (ValidationError, ValueError, TypeError, ZoneInfoNotFoundError):
        raise DomainError(
            "restore_domain", "Yedekteki " + kind + " kaydı geçerli alan kurallarına uymuyor."
        ) from None


def apply_import(db, athlete, command):
    if command.command_type != "import.apply":
        raise DomainError("unknown_command", "Desteklenmeyen aktarım işlemi.")
    Empty.model_validate(command.payload)
    row = get_owned(db, ImportRun, athlete.id, command.entity_id, command.expected_version)
    before = serial(row)
    if row.status != "staged":
        raise DomainError("import_applied", "Bu kaynak zaten aktarılmış.", 409)
    changes = []
    if row.format in ("v2", "v2_transfer"):
        _, package = detect(row.raw)
        changes = restore_rows(db, athlete, package)
        # Canonical records are now present individually. Retaining another full copy
        # here recursively doubles every later backup. Keep provenance and unknown
        # envelope fields, while explicitly mapping the original record identities.
        row.raw = {
            "format": "alos-restored-provenance",
            "source_manifest": {key: value for key, value in package.items() if key != "records"},
            "source_envelope": {
                key: value
                for key, value in row.raw.items()
                if key not in {"canonical", "canonical_text", "records"}
            }
            if row.format == "v2_transfer"
            else {},
            "record_id_map": {
                original["id"]: str(uuid5(athlete.id, "restore:" + original["id"]))
                for records in package["records"].values()
                for original in records
            },
        }
    else:
        _, data = detect(row.raw)
        for kind, path, value in legacy_rows(data):
            precision = "date_only" if re.search(r"\d{4}-\d{2}-\d{2}", path) else "legacy_unknown"
            db.add(
                LegacyRecord(
                    id=uuid5(athlete.id, row.source_digest + path),
                    athlete_id=athlete.id,
                    import_id=row.id,
                    pointer=path,
                    domain=kind,
                    value=value,
                    time_precision=precision,
                    source="legacy",
                )
            )
        from .legacy_workouts import migrate

        domain_changes, report = migrate(db, athlete, row, data)
        changes.extend(domain_changes)
        from .legacy_periods import migrate as migrate_periods

        period_changes, period_report = migrate_periods(db, athlete, row, data)
        changes.extend(period_changes)
        from .legacy_lifestyle import migrate as migrate_lifestyle

        life_changes, life_report = migrate_lifestyle(db, athlete, row, data)
        changes.extend(life_changes)
        row.summary = {
            **row.summary,
            "workout_adapter": report,
            "lifestyle_adapter": life_report,
            "period_adapter": period_report,
        }
        from .media import normalize_photo

        for index, checkin in enumerate(row.raw.get("photos", [])):
            if not isinstance(checkin, dict):
                continue
            views = checkin.get("photos", {})
            if not isinstance(views, dict):
                continue
            for side, encoded in views.items():
                if not isinstance(encoded, str):
                    continue
                try:
                    content = normalize_photo(encoded)
                except DomainError:
                    # Original bytes/metadata remain in the archive; a damaged preview cannot erase them.
                    continue
                try:
                    captured_date = date.fromisoformat(str(checkin.get("date", "")))
                except ValueError:
                    captured_date = None
                photo = MediaObject(
                    id=uuid5(athlete.id, row.source_digest + ":photo:" + str(index) + ":" + side),
                    athlete_id=athlete.id,
                    name=(str(checkin.get("date", "Tarihsiz")) + " · " + side)[:150],
                    mime="image/jpeg",
                    sha256=hashlib.sha256(content).hexdigest(),
                    content=content,
                    captured_date=captured_date,
                    details={
                        "view": side,
                        "legacy_context": {k: v for k, v in checkin.items() if k != "photos"},
                    },
                    source="legacy",
                )
                db.add(photo)
                db.flush()
                changes.append({"kind": "media", "entity": serial(photo)})
    row.status = "applied"
    row.version += 1
    row.updated_at = utcnow()
    db.flush()
    changes.append({"kind": "import", "entity": serial(row)})
    return row, before, changes
