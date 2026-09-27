"""Documented generic CSV, not a vendor connector. All-or-nothing owner import."""

import csv
import hashlib
import io
import re
from datetime import date
from uuid import UUID, uuid5

from pydantic import ValidationError

from .errors import DomainError
from .execution import ActualInput
from .models import PerformedSet, WorkoutSession
from .movements import VERSION, resolve
from .programming import touched

FIELDS = (
    "date",
    "session",
    "movement_id",
    "name",
    "modality",
    "reps",
    "external_kg",
    "load_unit",
    "seconds",
    "distance_m",
    "rir",
    "rpe",
    "variant",
    "equipment",
    "side",
    "load_kind",
    "set_kind",
    "superset_group",
    "sequence",
)
LIMIT = 1000


def parse(package):
    raw = package.get("csv", "")
    mapping = package.get("columns", {})
    if (
        not isinstance(raw, str)
        or len(raw.encode("utf-8")) > 2 * 1024 * 1024
        or not isinstance(mapping, dict)
    ):
        raise DomainError("csv_size", "CSV UTF-8 olmalı ve 2 MB sınırını aşmamalı.")
    if any(k not in FIELDS or not isinstance(v, str) for k, v in mapping.items()):
        raise DomainError("csv_mapping", "Bilinmeyen sütun eşlemesi.")
    delimiter = package.get("delimiter", ",")
    if delimiter not in (",", ";", "\t"):
        raise DomainError("csv_delimiter", "Ayraç virgül, noktalı virgül veya sekme olmalı.")
    reader = csv.DictReader(io.StringIO(raw.lstrip("\ufeff")), delimiter=delimiter, strict=True)
    headers = reader.fieldnames or []
    if len(headers) != len(set(headers)) or len(headers) > 50:
        raise DomainError("csv_headers", "Sütunlar tekil olmalı; en fazla 50 sütun desteklenir.")
    if any(mapping.get(key, key) not in headers for key in ("date", "name")):
        raise DomainError("csv_headers", "Tarih ve hareket adı sütunlarını eşle.")
    rows, errors = [], []
    try:
        for index, source in enumerate(reader, 2):
            if index > LIMIT + 1:
                raise DomainError("csv_rows", "En fazla 1000 satır aktarılabilir.")
            values = {key: str(source.get(mapping.get(key, key), "") or "").strip() for key in FIELDS}
            try:
                if None in source or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", values["date"]):
                    raise ValueError("Tarih YYYY-MM-DD olmalı ve sütun sayısı tutmalı.")
                date.fromisoformat(values["date"])
                resolution = resolve(values)
                if resolution["status"] == "ambiguous":
                    raise ValueError(
                        "Hareket birden fazla adaya uyuyor; movement_id sütununa katalog kimliğini gir."
                    )
                movement = resolution["definition"]
                fields = {
                    k: values[k]
                    for k in (
                        "name",
                        "modality",
                        "variant",
                        "equipment",
                        "side",
                        "load_kind",
                        "set_kind",
                        "superset_group",
                    )
                    if values[k]
                }
                fields["movement_id"] = (
                    movement["id"]
                    if movement
                    else "custom-csv-" + hashlib.sha256(values["name"].encode()).hexdigest()[:24]
                )
                fields["catalog_version"] = VERSION if movement else None
                if movement:
                    for key in ("modality", "load_kind"):
                        fields.setdefault(key, movement[key])
                    fields.setdefault("equipment", ", ".join(movement.get("equipment", [])))
                for key in ("reps", "external_kg", "seconds", "distance_m", "rir", "rpe", "sequence"):
                    if values[key]:
                        if not re.fullmatch(r"\d+(?:[.,]\d+)?", values[key]):
                            raise ValueError("Sayı biçimi geçersiz: " + key)
                        fields[key] = float(values[key].replace(",", "."))
                if "external_kg" in fields:
                    if values["load_unit"] not in ("kg", "lb"):
                        raise ValueError("Harici yük için load_unit kg veya lb olmalı.")
                    if values["load_unit"] == "lb":
                        fields["external_kg"] *= 0.45359237
                actual = ActualInput(session_id=UUID(int=0), time_precision="date_only", **fields)
                if not any((actual.reps, actual.seconds, actual.distance_m)):
                    raise ValueError("Gerçek miktar eksik.")
                payload = actual.model_dump(
                    mode="json",
                    exclude={
                        "session_id",
                        "local_time",
                        "slot_id",
                        "status",
                        "occurred_at",
                        "time_precision",
                        "note",
                    },
                )
                rows.append(
                    {
                        "line": index,
                        "date": values["date"],
                        "session": values["session"] or "CSV seansı",
                        "fields": payload,
                        "mapping": resolution["status"],
                    }
                )
            except (ValueError, ValidationError) as exc:
                errors.append({"line": index, "code": "invalid_row", "message": str(exc).split("\n")[0]})
    except csv.Error:
        raise DomainError("csv_format", "CSV alıntı veya satır biçimi okunamadı.") from None
    return {
        "rows": rows,
        "errors": errors,
        "counts": {"set": len(rows)},
        "unknown_fields": [h for h in headers if h not in {mapping.get(k, k) for k in FIELDS}],
        "source_sha256": hashlib.sha256(raw.encode()).hexdigest(),
        "warnings": [
            "Yalnız gerçekleşmiş kayıtlar. Kimlik hesabından alınır; dosyadaki kullanıcı alanları yetki vermez. Hata varsa hiçbir satır aktarılmaz."
        ],
        "canonical_restore": False,
    }


def apply(db, athlete, run):
    report = parse(run.raw)
    if report["errors"] or not report["rows"]:
        raise DomainError("csv_invalid", "Satır hatalarını düzeltmeden aktarım yapılamaz.")
    changes, sessions = [], {}
    for record in report["rows"]:
        key = record["date"] + ":" + record["session"]
        if key not in sessions:
            session = WorkoutSession(
                id=uuid5(athlete.id, run.source_digest + ":session:" + key),
                athlete_id=athlete.id,
                local_date=date.fromisoformat(record["date"]),
                timezone=athlete.timezone,
                title=record["session"][:150],
                status="completed",
                time_precision="date_only",
                source="csv",
            )
            db.add(session)
            db.flush()
            sessions[key] = session
            changes.append(touched(session, "session"))
        row = PerformedSet(
            id=uuid5(athlete.id, run.source_digest + ":row:" + str(record["line"])),
            athlete_id=athlete.id,
            session_id=sessions[key].id,
            local_date=date.fromisoformat(record["date"]),
            timezone=athlete.timezone,
            time_precision="date_only",
            source="csv",
            **record["fields"],
        )
        db.add(row)
        db.flush()
        changes.append(touched(row, "set"))
    return changes


def export(rows):
    output = io.StringIO(newline="")
    writer = csv.DictWriter(output, fieldnames=FIELDS)
    writer.writeheader()
    for row in rows:
        if row.get("deleted_at") or row.get("status") == "skipped":
            continue
        values = {k: row.get(k) for k in FIELDS}
        values.update(date=row["local_date"], session=row.get("session_id"), load_unit="kg")
        for key, value in values.items():
            if isinstance(value, str) and value.lstrip().startswith(("=", "+", "-", "@", "\t", "\r")):
                values[key] = "'" + value
        writer.writerow(values)
    return output.getvalue()
