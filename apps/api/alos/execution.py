from datetime import date, datetime, timedelta
from typing import Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import Field, field_validator
from sqlalchemy import select

from .contracts import Empty, StrictModel
from .db import utcnow
from .domain.scheduling import local_instant
from .domain.workouts import Targets, timer_remaining
from .errors import DomainError
from .models import PerformedSet, Prescription, PrescriptionSlot, WorkoutSession
from .programming import owned, touched
from .service import get_owned, serial


class OpenSession(StrictModel):
    prescription_id: UUID | None = None
    local_date: date
    title: str = Field(min_length=1, max_length=150)


class Begin(StrictModel):
    slot_id: UUID | None = None


class Transition(StrictModel):
    status: Literal["ready", "active", "paused", "completed", "abandoned"]


class Timer(StrictModel):
    action: Literal["start", "pause", "resume", "reset"]
    seconds: int = Field(default=90, ge=0, le=7200)


class ActualInput(Targets):
    session_id: UUID
    slot_id: UUID | None = None
    status: Literal["completed", "skipped", "extra", "substituted"] = "completed"
    occurred_at: datetime | None = None
    local_time: str | None = Field(default=None, pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    time_precision: Literal["exact", "date_only"] = "exact"
    note: str = Field(default="", max_length=1000)

    @field_validator("occurred_at")
    @classmethod
    def aware(cls, value):
        if value and value.tzinfo is None:
            raise ValueError("Saat dilimi gerekli.")
        return value


def lock_execution(db, session, athlete, occurred_at, changes):
    if session.status == "ready":
        session.status = "active"
        session.started_at = occurred_at
        session.occurred_at = occurred_at
        session.time_precision = "exact" if occurred_at else "date_only"
    if session.prescription_id:
        prescription = owned(db, Prescription, athlete.id, session.prescription_id)
        if prescription.locked_at is None:
            prescription.locked_at = utcnow()
            prescription.version += 1
            prescription.updated_at = utcnow()
            changes.append(touched(prescription, "prescription"))
    session.version += 1
    session.updated_at = utcnow()
    changes.append(touched(session, "session"))


def apply_session(db, athlete, command):
    row = get_owned(
        db,
        WorkoutSession,
        athlete.id,
        command.entity_id,
        command.expected_version,
        create=command.command_type == "session.open",
    )
    before = serial(row) if row else None
    changes = []
    if command.command_type == "session.open" and row is None:
        data = OpenSession.model_validate(command.payload)
        if data.prescription_id:
            prescription = owned(db, Prescription, athlete.id, data.prescription_id)
            if prescription.scheduled_date != data.local_date:
                raise DomainError(
                    "session_date", "Reçete ve seans tarihi farklı; geçmiş seansı bugüne taşıyamazsın."
                )
        row = WorkoutSession(
            id=command.entity_id, athlete_id=athlete.id, timezone=athlete.timezone, **data.model_dump()
        )
        db.add(row)
    elif command.command_type == "session.begin" and row:
        data = Begin.model_validate(command.payload)
        if row.local_date != utcnow().astimezone(ZoneInfo(row.timezone)).date():
            raise DomainError(
                "past_execution", "Geçmiş seansı şimdi başlatma; gerçek seti tarihiyle kaydet.", 409
            )
        if row.status not in ("ready", "active"):
            raise DomainError("session_transition", "Bu seans başlatılamaz.", 409)
        if data.slot_id:
            slot = owned(db, PrescriptionSlot, athlete.id, data.slot_id)
            if slot.prescription_id != row.prescription_id:
                raise DomainError("slot_session", "Set seans reçetesiyle eşleşmiyor.", 409)
        lock_execution(db, row, athlete, utcnow(), changes)
    elif command.command_type == "session.transition" and row:
        data = Transition.model_validate(command.payload)
        allowed = {
            "draft": {"ready", "abandoned"},
            "ready": {"abandoned"},
            "active": {"paused", "completed", "abandoned"},
            "paused": {"active", "completed", "abandoned"},
            "completed": set(),
            "abandoned": set(),
        }
        if data.status not in allowed[row.status]:
            raise DomainError("session_transition", "Bu seans geçişi geçersiz.", 409)
        if data.status == "paused":
            row.paused_at = utcnow()
            row.timer_remaining_ms = timer_remaining(row.timer_deadline, None, utcnow())
            row.timer_deadline = None
        elif data.status == "active":
            if row.timer_remaining_ms is not None:
                row.timer_deadline = utcnow() + timedelta(milliseconds=row.timer_remaining_ms)
            row.timer_remaining_ms = None
            row.paused_at = None
        else:
            row.ended_at = utcnow()
            row.timer_deadline = None
            row.timer_remaining_ms = None
        row.status = data.status
        row.version += 1
        row.updated_at = utcnow()
    elif command.command_type == "session.timer" and row:
        data = Timer.model_validate(command.payload)
        if row.status not in ("active", "paused"):
            raise DomainError("timer_state", "Sayaç gerçek seans başladıktan sonra kullanılabilir.", 409)
        if data.action == "start":
            row.timer_deadline = utcnow() + timedelta(seconds=data.seconds)
            row.timer_remaining_ms = None
        elif data.action == "pause":
            row.timer_remaining_ms = timer_remaining(row.timer_deadline, row.timer_remaining_ms, utcnow())
            row.timer_deadline = None
        elif data.action == "resume":
            row.timer_deadline = utcnow() + timedelta(milliseconds=row.timer_remaining_ms or 0)
            row.timer_remaining_ms = None
        else:
            row.timer_deadline = None
            row.timer_remaining_ms = None
        row.version += 1
        row.updated_at = utcnow()
    elif command.command_type == "session.delete" and row:
        Empty.model_validate(command.payload)
        row.deleted_at = utcnow()
        row.version += 1
        row.updated_at = utcnow()
        for actual in db.scalars(
            select(PerformedSet).where(
                PerformedSet.session_id == row.id,
                PerformedSet.athlete_id == athlete.id,
                PerformedSet.deleted_at.is_(None),
            )
        ):
            actual.deleted_at = utcnow()
            actual.version += 1
            actual.updated_at = utcnow()
            changes.append(touched(actual, "set"))
    else:
        raise DomainError("session_command", "Desteklenmeyen seans işlemi.")
    db.flush()
    changes.append(touched(row, "session"))
    return row, before, changes


def apply_set(db, athlete, command):
    row = get_owned(
        db,
        PerformedSet,
        athlete.id,
        command.entity_id,
        command.expected_version,
        create=command.command_type == "set.save",
    )
    before = serial(row) if row else None
    changes = []
    if command.command_type == "set.delete" and row:
        Empty.model_validate(command.payload)
        row.deleted_at = utcnow()
        row.version += 1
        row.updated_at = utcnow()
    elif command.command_type == "set.save":
        data = ActualInput.model_validate(command.payload)
        session = owned(db, WorkoutSession, athlete.id, data.session_id)
        if session.status == "abandoned" and row is None:
            raise DomainError("abandoned_session", "Bu seans bırakılmış. Yeni seans aç.", 409)
        if row and (row.session_id != data.session_id or row.slot_id != data.slot_id):
            raise DomainError("actual_identity", "Geçmiş setin seans/slot kimliği değiştirilemez.", 409)
        if data.slot_id:
            slot = owned(db, PrescriptionSlot, athlete.id, data.slot_id)
            if slot.prescription_id != session.prescription_id:
                raise DomainError("slot_session", "Bu set başka bir seans reçetesine ait.", 409)
            if data.status not in ("substituted", "skipped") and (
                data.movement_id != slot.movement_id or data.variant != slot.variant
            ):
                raise DomainError(
                    "substitution", "Farklı hareket/varyasyonu açıkça alternatif olarak işaretle."
                )
        elif data.status not in ("extra", "completed"):
            raise DomainError("slot_required", "Atlanan/alternatif çalışma için plan slotu gerekli.")
        if data.status != "skipped" and not any((data.reps, data.seconds, data.distance_m)):
            raise DomainError("actual_required", "Gerçekte yaptığın tekrar, süre veya mesafeyi gir.")
        if data.local_time and data.occurred_at is None:
            data.occurred_at = local_instant(session.local_date, data.local_time, session.timezone)
        if data.time_precision == "exact" and data.occurred_at is None:
            raise DomainError("actual_time", "Gerçek saat veya yalnız tarih seçeneği gerekli.")
        if data.time_precision == "date_only" and data.occurred_at is not None:
            raise DomainError("time_precision", "Yalnız tarih kaydına kesin saat atanmaz.")
        fields = data.model_dump(exclude={"local_time"})
        if row:
            # Editing performance does not silently replace the original execution time.
            fields.pop("occurred_at")
            fields.pop("time_precision")
            for key, value in fields.items():
                setattr(row, key, value)
            row.version += 1
            row.updated_at = utcnow()
        else:
            row = PerformedSet(
                id=command.entity_id,
                athlete_id=athlete.id,
                local_date=session.local_date,
                timezone=session.timezone,
                **fields,
            )
            db.add(row)
            if data.status != "skipped":
                lock_execution(db, session, athlete, data.occurred_at, changes)
    else:
        raise DomainError("set_command", "Desteklenmeyen set işlemi.")
    db.flush()
    changes.append(touched(row, "set"))
    return row, before, changes
