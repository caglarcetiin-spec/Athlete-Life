"""Explicit archive/reset and version-checked undo, all in the shared transaction."""

from pydantic import Field
from sqlalchemy import select

from .contracts import StrictModel
from .db import utcnow
from .errors import DomainError
from .models import Audit, Change, PerformedSet, WorkoutSession, WorkspaceArchive
from .programming import touched
from .service import MODELS, serial


class Reset(StrictModel):
    label: str = Field(min_length=1, max_length=150)
    expected_cursor: int = Field(ge=0)
    confirmation: str


class Undo(StrictModel):
    kind: str


def apply(db, athlete, command):
    if command.command_type == "archive.reset":
        data = Reset.model_validate(command.payload)
        if data.confirmation != "YENİ BAŞLANGIÇ":
            raise DomainError("confirmation", "Arşivleyerek yeni başlangıç onayı gerekli.")
        if data.expected_cursor != athlete.sequence:
            raise DomainError("archive_stale", "Yeni kayıtlar var. Arşiv önizlemesini yenile.", 409)
        if command.expected_version != 0 or db.get(WorkspaceArchive, command.entity_id):
            raise DomainError("archive_exists", "Bu arşiv zaten var.", 409)
        raw = {"timezone": athlete.timezone, "cursor": athlete.sequence}
        changes = []
        counts = {}
        for kind, model in MODELS.items():
            if kind in ("import", "archive", "media"):
                continue
            rows = list(
                db.scalars(select(model).where(model.athlete_id == athlete.id, model.deleted_at.is_(None)))
            )
            raw[kind + "s"] = [serial(r) for r in rows]
            counts[kind] = len(rows)
            if kind == "profile":
                continue
            for row in rows:
                row.deleted_at = utcnow()
                row.updated_at = utcnow()
                row.version += 1
                changes.append(touched(row, kind))
        row = WorkspaceArchive(
            id=command.entity_id,
            athlete_id=athlete.id,
            label=data.label,
            input_revision=athlete.sequence,
            counts=counts,
            raw=raw,
        )
        db.add(row)
        db.flush()
        changes.append(touched(row, "archive"))
        return row, None, changes
    if command.command_type == "record.restore":
        data = Undo.model_validate(command.payload)
        if data.kind not in (
            "set",
            "session",
            "food",
            "recipe",
            "meal",
            "hydration",
            "checkin",
            "sleep",
            "pain",
            "measurement",
            "capability",
            "goal",
            "goal_measurement",
            "event",
            "episode",
            "cycle",
            "lab",
        ):
            raise DomainError("undo_kind", "Bu kayıt türü buradan geri alınamaz.")
        model = MODELS[data.kind]
        row = db.scalar(select(model).where(model.id == command.entity_id, model.athlete_id == athlete.id))
        if not row:
            raise DomainError("not_found", "Kayıt bulunamadı.", 404)
        if row.version != command.expected_version or row.deleted_at is None:
            raise DomainError("undo_version", "Kayıt zaten değişmiş veya silinmemiş.", 409)
        # Archive reset is an era boundary; avoid reviving an isolated old child into the new era.
        audit = db.scalar(
            select(Audit)
            .where(Audit.athlete_id == athlete.id, Audit.entity_id == row.id)
            .order_by(Audit.created_at.desc())
            .limit(1)
        )
        if not audit or not audit.command.endswith(".delete"):
            raise DomainError(
                "undo_source",
                "Yalnız doğrudan silinen kayıt geri alınabilir; arşivden eski dönemi incele.",
                409,
            )
        if data.kind == "set":
            parent = db.get(WorkoutSession, row.session_id)
            if not parent or parent.deleted_at:
                raise DomainError("undo_parent", "Önce ilgili seansı geri al.", 409)
        latest_archive = db.scalar(
            select(WorkspaceArchive)
            .where(WorkspaceArchive.athlete_id == athlete.id)
            .order_by(WorkspaceArchive.created_at.desc())
            .limit(1)
        )
        if latest_archive and latest_archive.created_at > row.deleted_at:
            raise DomainError("undo_era", "Bu kayıt önceki döneme ait; arşivden incele.", 409)
        before = serial(row)
        row.deleted_at = None
        row.version += 1
        row.updated_at = utcnow()
        changes = [touched(row, data.kind)]
        if data.kind == "session":
            deleted = db.scalar(
                select(Change).where(
                    Change.athlete_id == athlete.id, Change.operation_id == audit.operation_id
                )
            )
            for delta in deleted.changes if deleted else []:
                if delta["kind"] != "set":
                    continue
                child = db.get(PerformedSet, delta["entity"]["id"])
                if (
                    child
                    and child.athlete_id == athlete.id
                    and child.session_id == row.id
                    and child.deleted_at
                    and child.version == delta["entity"]["version"]
                ):
                    child.deleted_at = None
                    child.version += 1
                    child.updated_at = utcnow()
                    changes.append(touched(child, "set"))
        db.flush()
        return row, before, changes
    raise DomainError("lifecycle_command", "Desteklenmeyen arşiv işlemi.")
