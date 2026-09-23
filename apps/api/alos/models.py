"""Authoritative normalized records. JSONB is reserved for immutable snapshots/metadata."""

from datetime import date, datetime
from uuid import UUID, uuid4

import sqlalchemy as sa
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base, utcnow


class User(Base):
    __tablename__ = "users"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    username: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(254))
    password_hash: Mapped[str] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, default=1)
    auth_epoch: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Athlete(Base):
    __tablename__ = "athletes"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    timezone: Mapped[str] = mapped_column(String(80), default="Europe/Istanbul")
    week_start: Mapped[int] = mapped_column(Integer, default=0)
    day_boundary_hour: Mapped[int] = mapped_column(Integer, default=0)
    sequence: Mapped[int] = mapped_column(BigInteger, default=0)
    generation: Mapped[UUID] = mapped_column(PGUUID, default=uuid4)
    __table_args__ = (
        CheckConstraint("week_start BETWEEN 0 AND 6"),
        CheckConstraint("day_boundary_hour BETWEEN 0 AND 23"),
    )


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    csrf: Mapped[str] = mapped_column(String(64))
    auth_epoch: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    count: Mapped[int] = mapped_column(Integer)
    reset_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Owned:
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    athlete_id: Mapped[UUID] = mapped_column(ForeignKey("athletes.id"), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source: Mapped[str] = mapped_column(String(40), default="manual")


class Shift(Owned, Base):
    __tablename__ = "shifts"
    local_date: Mapped[date] = mapped_column(Date)
    timezone: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(12), default="off")
    start_local: Mapped[str | None] = mapped_column(String(5))
    end_local: Mapped[str | None] = mapped_column(String(5))
    start_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    start_fold: Mapped[int] = mapped_column(Integer, default=0)
    end_fold: Mapped[int] = mapped_column(Integer, default=0)
    social: Mapped[str] = mapped_column(String(500), default="")
    commute_min: Mapped[int] = mapped_column(Integer, default=30)
    prep_min: Mapped[int] = mapped_column(Integer, default=30)
    sleep_target_min: Mapped[int] = mapped_column(Integer, default=480)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        UniqueConstraint("athlete_id", "local_date"),
        CheckConstraint("status IN ('work','off','annual')"),
        CheckConstraint("commute_min >= 0 AND prep_min >= 0 AND sleep_target_min > 0"),
        CheckConstraint(
            "status != 'work' OR (start_at IS NOT NULL AND end_at IS NOT NULL AND end_at > start_at)"
        ),
    )


class Optimization(Owned, Base):
    __tablename__ = "optimization_runs"
    week_start: Mapped[date] = mapped_column(Date, index=True)
    input_sequence: Mapped[int] = mapped_column(BigInteger)
    model_version: Mapped[str] = mapped_column(String(40), default="schedule-1")
    status: Mapped[str] = mapped_column(String(16), default="proposed")
    # Derived immutable proposal, never used as raw athlete state.
    items: Mapped[list] = mapped_column(JSONB)
    input_lineage: Mapped[list] = mapped_column(JSONB)
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        CheckConstraint("status IN ('proposed','accepted','stale')"),
    )


class Operation(Base):
    __tablename__ = "idempotency_keys"
    athlete_id: Mapped[UUID] = mapped_column(ForeignKey("athletes.id"), primary_key=True)
    operation_id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True)
    digest: Mapped[str] = mapped_column(String(64))
    response: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Change(Base):
    __tablename__ = "change_log"
    athlete_id: Mapped[UUID] = mapped_column(ForeignKey("athletes.id"), primary_key=True)
    sequence: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    operation_id: Mapped[UUID] = mapped_column(PGUUID)
    changes: Mapped[list] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Audit(Base):
    __tablename__ = "audit_records"
    athlete_id: Mapped[UUID] = mapped_column(ForeignKey("athletes.id"), primary_key=True)
    operation_id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True)
    command: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[UUID] = mapped_column(PGUUID)
    before: Mapped[dict | None] = mapped_column(JSONB)
    after: Mapped[dict | None] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Outbox(Base):
    __tablename__ = "transactional_outbox"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    athlete_id: Mapped[UUID] = mapped_column(ForeignKey("athletes.id"), index=True)
    operation_id: Mapped[UUID] = mapped_column(PGUUID)
    topic: Mapped[str] = mapped_column(String(80))
    payload: Mapped[dict] = mapped_column(JSONB)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    leased_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    lease_token: Mapped[UUID | None] = mapped_column(PGUUID)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (
        UniqueConstraint("athlete_id", "operation_id", "topic"),
        Index("outbox_available", "processed_at", "available_at"),
    )


class ImportRun(Owned, Base):
    __tablename__ = "migration_runs"
    source_digest: Mapped[str] = mapped_column(String(64))
    format: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(16), default="staged")
    summary: Mapped[dict] = mapped_column(JSONB)
    raw: Mapped[dict] = mapped_column(JSONB)
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        UniqueConstraint("athlete_id", "source_digest"),
        CheckConstraint("status IN ('staged','applied','quarantined')"),
    )


class LegacyRecord(Owned, Base):
    __tablename__ = "legacy_extensions"
    import_id: Mapped[UUID] = mapped_column(PGUUID)
    pointer: Mapped[str] = mapped_column(Text)
    domain: Mapped[str] = mapped_column(String(100))
    value: Mapped[dict | list | str | float | bool | None] = mapped_column(JSONB(none_as_null=False))
    time_precision: Mapped[str] = mapped_column(String(30), default="legacy_unknown")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        UniqueConstraint("athlete_id", "import_id", "pointer"),
        ForeignKeyConstraint(["athlete_id", "import_id"], ["migration_runs.athlete_id", "migration_runs.id"]),
    )


class MediaObject(Owned, Base):
    __tablename__ = "media_objects"
    name: Mapped[str] = mapped_column(String(150))
    mime: Mapped[str] = mapped_column(String(80))
    sha256: Mapped[str] = mapped_column(String(64))
    content: Mapped[bytes] = mapped_column(LargeBinary)
    captured_date: Mapped[date | None] = mapped_column(Date)
    details: Mapped[dict] = mapped_column(JSONB, default=dict, server_default=sa.text("'{}'::jsonb"))
    __table_args__ = (UniqueConstraint("athlete_id", "id"),)


class Program(Owned, Base):
    __tablename__ = "program_versions"
    family_id: Mapped[UUID] = mapped_column(PGUUID, default=uuid4)
    parent_id: Mapped[UUID | None] = mapped_column(PGUUID)
    name: Mapped[str] = mapped_column(String(150))
    goal: Mapped[str] = mapped_column(String(1000))
    start_date: Mapped[date] = mapped_column(Date)
    weeks: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(16), default="draft")
    model_version: Mapped[str] = mapped_column(String(50), default="manual-1")
    decisions: Mapped[dict] = mapped_column(JSONB, default=dict)
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        ForeignKeyConstraint(
            ["athlete_id", "parent_id"], ["program_versions.athlete_id", "program_versions.id"]
        ),
        CheckConstraint("weeks BETWEEN 1 AND 52"),
        CheckConstraint("status IN ('draft','active','archived','completed')"),
    )


class ProgramDay(Owned, Base):
    __tablename__ = "weekly_slots"
    program_id: Mapped[UUID] = mapped_column(PGUUID)
    weekday: Mapped[int] = mapped_column(Integer)
    first_week: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    last_week: Mapped[int | None] = mapped_column(Integer)
    label: Mapped[str] = mapped_column(String(120))
    kind: Mapped[str] = mapped_column(String(16))
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        ForeignKeyConstraint(
            ["athlete_id", "program_id"], ["program_versions.athlete_id", "program_versions.id"]
        ),
        CheckConstraint("weekday BETWEEN 0 AND 6"),
        CheckConstraint(
            "first_week BETWEEN 1 AND 52 AND (last_week IS NULL OR (last_week >= first_week AND last_week <= 52))",
            name="weekly_slots_week_bounds",
        ),
        CheckConstraint("kind IN ('training','rest')"),
    )


class ExerciseTargets:
    movement_id: Mapped[str] = mapped_column(String(100))
    name: Mapped[str] = mapped_column(String(150))
    variant: Mapped[str] = mapped_column(String(150), default="standard")
    modality: Mapped[str] = mapped_column(String(20), default="strength")
    equipment: Mapped[str] = mapped_column(String(100), default="")
    side: Mapped[str] = mapped_column(String(20), default="both")
    load_kind: Mapped[str] = mapped_column(String(20), default="external")
    reps: Mapped[int | None] = mapped_column(Integer)
    seconds: Mapped[float | None] = mapped_column(sa.Float)
    distance_m: Mapped[float | None] = mapped_column(sa.Float)
    external_kg: Mapped[float | None] = mapped_column(sa.Float)
    assistance_kg: Mapped[float | None] = mapped_column(sa.Float)
    bodyweight_kg: Mapped[float | None] = mapped_column(sa.Float)
    rir: Mapped[float | None] = mapped_column(sa.Float)
    rpe: Mapped[float | None] = mapped_column(sa.Float)
    rest_seconds: Mapped[int | None] = mapped_column(Integer)


class ProgramExercise(ExerciseTargets, Owned, Base):
    target_range: Mapped[dict | None] = mapped_column(JSONB)
    __tablename__ = "program_exercises"
    day_id: Mapped[UUID] = mapped_column(PGUUID)
    position: Mapped[int] = mapped_column(Integer)
    sets: Mapped[int] = mapped_column(Integer)
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        ForeignKeyConstraint(["athlete_id", "day_id"], ["weekly_slots.athlete_id", "weekly_slots.id"]),
        CheckConstraint("sets BETWEEN 1 AND 30"),
    )


class Prescription(Owned, Base):
    __tablename__ = "session_prescriptions"
    program_id: Mapped[UUID | None] = mapped_column(PGUUID)
    day_id: Mapped[UUID | None] = mapped_column(PGUUID)
    program_version: Mapped[int | None] = mapped_column(Integer)
    scheduled_date: Mapped[date] = mapped_column(Date)
    timezone: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(150))
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    decision: Mapped[dict] = mapped_column(JSONB, default=dict)
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        ForeignKeyConstraint(
            ["athlete_id", "program_id"], ["program_versions.athlete_id", "program_versions.id"]
        ),
        ForeignKeyConstraint(["athlete_id", "day_id"], ["weekly_slots.athlete_id", "weekly_slots.id"]),
        UniqueConstraint("athlete_id", "day_id", "scheduled_date"),
    )


class PrescriptionSlot(ExerciseTargets, Owned, Base):
    target_range: Mapped[dict | None] = mapped_column(JSONB)
    __tablename__ = "prescription_set_slots"
    prescription_id: Mapped[UUID] = mapped_column(PGUUID)
    ordinal: Mapped[int] = mapped_column(Integer)
    set_index: Mapped[int] = mapped_column(Integer)
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        ForeignKeyConstraint(
            ["athlete_id", "prescription_id"],
            ["session_prescriptions.athlete_id", "session_prescriptions.id"],
        ),
        UniqueConstraint("athlete_id", "prescription_id", "ordinal"),
    )


class WorkoutSession(Owned, Base):
    __tablename__ = "workout_sessions"
    prescription_id: Mapped[UUID | None] = mapped_column(PGUUID)
    local_date: Mapped[date] = mapped_column(Date)
    timezone: Mapped[str] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(150))
    status: Mapped[str] = mapped_column(String(16), default="ready")
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    time_precision: Mapped[str] = mapped_column(String(20), default="exact")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    paused_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    timer_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    timer_remaining_ms: Mapped[int | None] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(String(2000), default="")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        ForeignKeyConstraint(
            ["athlete_id", "prescription_id"],
            ["session_prescriptions.athlete_id", "session_prescriptions.id"],
        ),
        CheckConstraint("status IN ('draft','ready','active','paused','completed','abandoned')"),
    )


class PerformedSet(ExerciseTargets, Owned, Base):
    __tablename__ = "performed_sets"
    session_id: Mapped[UUID] = mapped_column(PGUUID)
    slot_id: Mapped[UUID | None] = mapped_column(PGUUID)
    status: Mapped[str] = mapped_column(String(20), default="completed")
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    local_date: Mapped[date] = mapped_column(Date)
    timezone: Mapped[str] = mapped_column(String(80))
    time_precision: Mapped[str] = mapped_column(String(20), default="exact")
    note: Mapped[str] = mapped_column(String(1000), default="")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        ForeignKeyConstraint(
            ["athlete_id", "session_id"], ["workout_sessions.athlete_id", "workout_sessions.id"]
        ),
        ForeignKeyConstraint(
            ["athlete_id", "slot_id"], ["prescription_set_slots.athlete_id", "prescription_set_slots.id"]
        ),
        CheckConstraint("status IN ('completed','skipped','extra','substituted')"),
        CheckConstraint(
            "(reps IS NULL OR reps >= 0) AND (seconds IS NULL OR seconds >= 0) AND (distance_m IS NULL OR distance_m >= 0)"
        ),
        CheckConstraint(
            "(external_kg IS NULL OR external_kg >= 0) AND (assistance_kg IS NULL OR assistance_kg >= 0) AND (bodyweight_kg IS NULL OR bodyweight_kg > 0)"
        ),
        Index(
            "unique_session_slot_alive",
            "athlete_id",
            "session_id",
            "slot_id",
            unique=True,
            postgresql_where=sa.text("deleted_at IS NULL AND slot_id IS NOT NULL"),
        ),
    )


class DailyRecord:
    local_date: Mapped[date] = mapped_column(Date, index=True)
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(80))
    time_precision: Mapped[str] = mapped_column(String(20), default="date_only")


class Food(Owned, Base):
    __tablename__ = "food_items"
    name: Mapped[str] = mapped_column(String(150))
    kcal: Mapped[float] = mapped_column(sa.Float)
    protein_g: Mapped[float] = mapped_column(sa.Float)
    carbs_g: Mapped[float] = mapped_column(sa.Float)
    fat_g: Mapped[float] = mapped_column(sa.Float)
    fiber_g: Mapped[float | None] = mapped_column(sa.Float)
    reference: Mapped[str] = mapped_column(String(500), default="Kullanıcı girişi; 100 g için")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        CheckConstraint("kcal >= 0 AND protein_g >= 0 AND carbs_g >= 0 AND fat_g >= 0"),
    )


class Recipe(Owned, Base):
    __tablename__ = "recipes"
    name: Mapped[str] = mapped_column(String(150))
    total_grams: Mapped[float] = mapped_column(sa.Float)
    instructions: Mapped[str] = mapped_column(String(3000), default="")
    # Immutable ingredient/nutrient snapshot for this version; previous consumption copies it.
    ingredients: Mapped[list] = mapped_column(JSONB)
    nutrient_snapshot: Mapped[dict] = mapped_column(JSONB)
    __table_args__ = (UniqueConstraint("athlete_id", "id"), CheckConstraint("total_grams > 0"))


class Meal(DailyRecord, Owned, Base):
    __tablename__ = "meal_entries"
    name: Mapped[str] = mapped_column(String(150))
    meal_type: Mapped[str] = mapped_column(String(20), default="meal")
    grams: Mapped[float | None] = mapped_column(sa.Float)
    food_id: Mapped[UUID | None] = mapped_column(PGUUID)
    recipe_id: Mapped[UUID | None] = mapped_column(PGUUID)
    source_version: Mapped[int | None] = mapped_column(Integer)
    kcal: Mapped[float | None] = mapped_column(sa.Float)
    protein_g: Mapped[float | None] = mapped_column(sa.Float)
    carbs_g: Mapped[float | None] = mapped_column(sa.Float)
    fat_g: Mapped[float | None] = mapped_column(sa.Float)
    fiber_g: Mapped[float | None] = mapped_column(sa.Float)
    nutrient_snapshot: Mapped[dict] = mapped_column(JSONB)
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        ForeignKeyConstraint(["athlete_id", "food_id"], ["food_items.athlete_id", "food_items.id"]),
        ForeignKeyConstraint(["athlete_id", "recipe_id"], ["recipes.athlete_id", "recipes.id"]),
        CheckConstraint("grams > 0 AND kcal >= 0 AND protein_g >= 0 AND carbs_g >= 0 AND fat_g >= 0"),
        CheckConstraint("food_id IS NULL OR recipe_id IS NULL"),
    )


class Hydration(DailyRecord, Owned, Base):
    __tablename__ = "hydration_entries"
    ml: Mapped[float] = mapped_column(sa.Float)
    note: Mapped[str] = mapped_column(String(500), default="")
    __table_args__ = (UniqueConstraint("athlete_id", "id"), CheckConstraint("ml > 0 AND ml <= 10000"))


class NutritionDay(Owned, Base):
    __tablename__ = "nutrition_day_status"
    local_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20))
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        UniqueConstraint("athlete_id", "local_date"),
        CheckConstraint("status IN ('complete','partial','not_logged')"),
    )


class Checkin(DailyRecord, Owned, Base):
    __tablename__ = "daily_checkins"
    energy: Mapped[int | None] = mapped_column(Integer)
    fatigue: Mapped[int | None] = mapped_column(Integer)
    stress: Mapped[int | None] = mapped_column(Integer)
    sleep_quality: Mapped[int | None] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(String(1000), default="")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        CheckConstraint(
            "(energy IS NULL OR energy BETWEEN 0 AND 10) AND (fatigue IS NULL OR fatigue BETWEEN 0 AND 10) AND (stress IS NULL OR stress BETWEEN 0 AND 10) AND (sleep_quality IS NULL OR sleep_quality BETWEEN 0 AND 10)"
        ),
    )


class Sleep(Owned, Base):
    __tablename__ = "sleep_entries"
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    timezone: Mapped[str] = mapped_column(String(80))
    quality: Mapped[int | None] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(String(1000), default="")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        CheckConstraint("end_at > start_at"),
        CheckConstraint("quality IS NULL OR quality BETWEEN 0 AND 10"),
    )


class Pain(DailyRecord, Owned, Base):
    __tablename__ = "pain_entries"
    area: Mapped[str] = mapped_column(String(100))
    side: Mapped[str] = mapped_column(String(20), default="unknown")
    intensity: Mapped[int] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(String(1000), default="")
    __table_args__ = (UniqueConstraint("athlete_id", "id"), CheckConstraint("intensity BETWEEN 0 AND 10"))


class Measurement(DailyRecord, Owned, Base):
    __tablename__ = "body_measurements"
    metric: Mapped[str] = mapped_column(String(40))
    value: Mapped[float] = mapped_column(sa.Float)
    unit: Mapped[str] = mapped_column(String(20))
    protocol: Mapped[str] = mapped_column(String(150), default="self-reported")
    __table_args__ = (UniqueConstraint("athlete_id", "id"), CheckConstraint("value > 0"))


class Capability(DailyRecord, Owned, Base):
    __tablename__ = "capability_measurements"
    definition_id: Mapped[str] = mapped_column(String(100))
    protocol_version: Mapped[str] = mapped_column(String(60))
    variant: Mapped[str] = mapped_column(String(150))
    side: Mapped[str] = mapped_column(String(20), default="unknown")
    equipment: Mapped[str] = mapped_column(String(150), default="")
    value: Mapped[float | None] = mapped_column(sa.Float)
    unit: Mapped[str] = mapped_column(String(20))
    attempt: Mapped[int] = mapped_column(Integer, default=1)
    selection: Mapped[str] = mapped_column(String(20), default="single")
    components: Mapped[dict] = mapped_column(JSONB, default=dict)
    note: Mapped[str] = mapped_column(String(1000), default="")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        CheckConstraint("attempt > 0"),
        CheckConstraint("value IS NULL OR value >= 0"),
    )


class Goal(Owned, Base):
    __tablename__ = "goals"
    title: Mapped[str] = mapped_column(String(150))
    metric: Mapped[str] = mapped_column(String(100))
    variant: Mapped[str] = mapped_column(String(150), default="")
    baseline: Mapped[float] = mapped_column(sa.Float)
    target: Mapped[float] = mapped_column(sa.Float)
    unit: Mapped[str] = mapped_column(String(30))
    start_date: Mapped[date] = mapped_column(Date)
    target_date: Mapped[date] = mapped_column(Date)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        CheckConstraint("target_date >= start_date"),
        CheckConstraint("target != baseline"),
    )


class GoalMeasurement(DailyRecord, Owned, Base):
    __tablename__ = "goal_measurements"
    goal_id: Mapped[UUID] = mapped_column(PGUUID)
    value: Mapped[float] = mapped_column(sa.Float)
    note: Mapped[str] = mapped_column(String(500), default="")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        ForeignKeyConstraint(["athlete_id", "goal_id"], ["goals.athlete_id", "goals.id"]),
    )


class LifeEvent(DailyRecord, Owned, Base):
    __tablename__ = "life_events"
    title: Mapped[str] = mapped_column(String(150))
    kind: Mapped[str] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20))
    modality: Mapped[str | None] = mapped_column(String(30))
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    rpe: Mapped[float | None] = mapped_column(sa.Float)
    duplicate_of: Mapped[UUID | None] = mapped_column(PGUUID)
    note: Mapped[str] = mapped_column(String(1000), default="")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        ForeignKeyConstraint(["athlete_id", "duplicate_of"], ["life_events.athlete_id", "life_events.id"]),
        CheckConstraint("kind IN ('social','physical') AND status IN ('planned','occurred','cancelled')"),
    )


class AthleteProfile(Owned, Base):
    __tablename__ = "athlete_profiles"
    birth_date: Mapped[date | None] = mapped_column(Date)
    sex: Mapped[str] = mapped_column(String(20), default="unspecified")
    experience: Mapped[str] = mapped_column(String(20), default="new")
    cycle_tracking: Mapped[bool] = mapped_column(Boolean, default=False)
    interface_mode: Mapped[str] = mapped_column(String(20), default="simple")
    avatar_id: Mapped[UUID | None] = mapped_column(PGUUID)
    equipment: Mapped[list] = mapped_column(JSONB, default=list)
    sport_ids: Mapped[list] = mapped_column(JSONB, default=list)
    tutorial_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        UniqueConstraint("athlete_id"),
        ForeignKeyConstraint(["athlete_id", "avatar_id"], ["media_objects.athlete_id", "media_objects.id"]),
    )


class HealthEpisode(Owned, Base):
    __tablename__ = "health_episodes"
    kind: Mapped[str] = mapped_column(String(30))
    start_date: Mapped[date] = mapped_column(Date)
    resolved_date: Mapped[date | None] = mapped_column(Date)
    return_until: Mapped[date | None] = mapped_column(Date)
    severity: Mapped[str] = mapped_column(String(20), default="unspecified")
    note: Mapped[str] = mapped_column(String(1500), default="")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        CheckConstraint("resolved_date IS NULL OR resolved_date >= start_date"),
        CheckConstraint("return_until IS NULL OR return_until >= start_date"),
    )


class Cycle(DailyRecord, Owned, Base):
    __tablename__ = "cycle_entries"
    bleeding: Mapped[str] = mapped_column(String(20))
    symptoms: Mapped[int | None] = mapped_column(Integer)
    cycle_day: Mapped[int | None] = mapped_column(Integer)
    note: Mapped[str] = mapped_column(String(1000), default="")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        CheckConstraint("symptoms IS NULL OR symptoms BETWEEN 0 AND 10"),
    )


class Lab(DailyRecord, Owned, Base):
    __tablename__ = "lab_observations"
    analyte: Mapped[str] = mapped_column(String(150))
    comparator: Mapped[str] = mapped_column(String(2), default="=", server_default="=")
    value: Mapped[float] = mapped_column(sa.Float)
    unit: Mapped[str] = mapped_column(String(40))
    reference_low: Mapped[float | None] = mapped_column(sa.Float)
    reference_high: Mapped[float | None] = mapped_column(sa.Float)
    laboratory: Mapped[str] = mapped_column(String(150), default="")
    method: Mapped[str] = mapped_column(String(150), default="")
    fasting: Mapped[bool | None] = mapped_column(Boolean)
    note: Mapped[str] = mapped_column(String(1000), default="")
    __table_args__ = (
        UniqueConstraint("athlete_id", "id"),
        CheckConstraint("reference_low IS NULL OR reference_high IS NULL OR reference_low <= reference_high"),
        CheckConstraint("comparator IN ('=', '<', '>', '≤', '≥')", name="lab_comparator"),
    )


class AnalysisRun(Owned, Base):
    __tablename__ = "analysis_runs"
    as_of: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    model_version: Mapped[str] = mapped_column(String(60))
    input_revision: Mapped[int] = mapped_column(BigInteger)
    input_digest: Mapped[str] = mapped_column(String(64))
    knowledge: Mapped[str] = mapped_column(String(30))
    result: Mapped[dict] = mapped_column(JSONB)
    __table_args__ = (UniqueConstraint("athlete_id", "id"),)


class RecoveryCode(Base):
    __tablename__ = "recovery_codes"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    code_hash: Mapped[str] = mapped_column(String(64), unique=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class SecurityAudit(Base):
    __tablename__ = "security_audit"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    event: Mapped[str] = mapped_column(String(60))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class WorkspaceArchive(Owned, Base):
    __tablename__ = "workspace_archives"
    label: Mapped[str] = mapped_column(String(150))
    input_revision: Mapped[int] = mapped_column(BigInteger)
    counts: Mapped[dict] = mapped_column(JSONB)
    raw: Mapped[dict] = mapped_column(JSONB)
    __table_args__ = (UniqueConstraint("athlete_id", "id"),)
