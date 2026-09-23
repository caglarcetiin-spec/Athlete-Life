from datetime import date, timedelta
from typing import Literal
from uuid import UUID, uuid4, uuid5

from pydantic import Field, model_validator
from sqlalchemy import select

from .contracts import Empty, StrictModel
from .db import utcnow
from .domain.workouts import Targets, program_analysis
from .errors import DomainError
from .models import Prescription, PrescriptionSlot, Program, ProgramDay, ProgramExercise
from .service import get_owned, serial


class TargetRange(StrictModel):
    unit: Literal["reps", "seconds", "m"]
    minimum: float = Field(gt=0, le=1000000)
    maximum: float = Field(gt=0, le=1000000)

    @model_validator(mode="after")
    def ordered(self):
        if self.maximum < self.minimum:
            raise ValueError("Hedef aralığının üst sınırı alt sınırından küçük olamaz.")
        if self.unit == "reps" and (not self.minimum.is_integer() or not self.maximum.is_integer()):
            raise ValueError("Tekrar aralığı tam sayı olmalı.")
        return self


class ExerciseInput(Targets):
    target_range: TargetRange | None = None
    sets: int = Field(ge=1, le=30)


class DayInput(StrictModel):
    first_week: int = Field(default=1, ge=1, le=52)
    last_week: int | None = Field(default=None, ge=1, le=52)
    weekday: int = Field(ge=0, le=6)
    label: str = Field(min_length=1, max_length=120)
    kind: str = Field(pattern="^(training|rest)$")
    pinned: bool = False
    exercises: list[ExerciseInput] = Field(default_factory=list, max_length=30)


class ProgramInput(StrictModel):
    name: str = Field(min_length=1, max_length=150)
    goal: str = Field(min_length=1, max_length=1000)
    start_date: date
    weeks: int = Field(ge=1, le=52)
    parent_id: UUID | None = None
    days: list[DayInput] = Field(min_length=1, max_length=364)

    @model_validator(mode="after")
    def phase_bounds(self):
        if sum(len(d.exercises) for d in self.days) > 1500:
            raise ValueError("Bir programda en fazla 1500 hareket tanımı olabilir.")
        for day in self.days:
            if day.first_week > self.weeks or (
                day.last_week is not None and not day.first_week <= day.last_week <= self.weeks
            ):
                raise ValueError("Çalışmanın hafta aralığı dönemin içinde olmalı.")
        return self


class Materialize(StrictModel):
    program_id: UUID
    day_id: UUID
    scheduled_date: date


def owned(db, model, athlete_id, entity_id):
    row = db.scalar(
        select(model).where(model.id == entity_id, model.athlete_id == athlete_id, model.deleted_at.is_(None))
    )
    if row is None:
        raise DomainError("not_found", "İlişkili kayıt bulunamadı.", 404)
    return row


def touched(row, kind):
    return {"kind": kind, "entity": serial(row)}


def apply_program(db, athlete, command):
    row = get_owned(
        db,
        Program,
        athlete.id,
        command.entity_id,
        command.expected_version,
        create=command.command_type == "program.create",
    )
    before = serial(row) if row else None
    changes = []
    if command.command_type == "program.create" and row is None:
        data = ProgramInput.model_validate(command.payload)
        parent = owned(db, Program, athlete.id, data.parent_id) if data.parent_id else None
        analysis = program_analysis([d.model_dump() for d in data.days])
        row = Program(
            id=command.entity_id,
            athlete_id=athlete.id,
            parent_id=data.parent_id,
            family_id=parent.family_id if parent else uuid4(),
            name=data.name,
            goal=data.goal,
            start_date=data.start_date,
            weeks=data.weeks,
            decisions=analysis,
        )
        db.add(row)
        db.flush()
        for day_index, day in enumerate(data.days):
            d = ProgramDay(
                id=uuid5(row.id, "day:" + str(day_index)),
                athlete_id=athlete.id,
                program_id=row.id,
                **day.model_dump(exclude={"exercises"}),
            )
            db.add(d)
            db.flush()
            changes.append(touched(d, "program_day"))
            if day.kind == "rest" and day.exercises:
                raise DomainError("rest_day", "Dinlenme gününe yapılmış set atanmaz.")
            for position, exercise in enumerate(day.exercises):
                if not exercise.target_range and not any(
                    (exercise.reps, exercise.seconds, exercise.distance_m)
                ):
                    raise DomainError("target_required", "Hareket için tekrar, süre veya mesafe hedefi gir.")
                e = ProgramExercise(
                    id=uuid5(d.id, "exercise:" + str(position)),
                    athlete_id=athlete.id,
                    day_id=d.id,
                    position=position,
                    **exercise.model_dump(),
                )
                db.add(e)
                db.flush()
                changes.append(touched(e, "program_exercise"))
    elif command.command_type == "program.activate" and row:
        Empty.model_validate(command.payload)
        if row.status != "draft":
            raise DomainError("program_state", "Yalnız yeni taslak plana alınabilir.", 409)
        days = list(
            db.scalars(
                select(ProgramDay).where(ProgramDay.program_id == row.id, ProgramDay.athlete_id == athlete.id)
            )
        )
        if not any(d.kind == "training" for d in days):
            raise DomainError("program_empty", "En az bir çalışma günü ekle.")
        for current in db.scalars(
            select(Program).where(Program.athlete_id == athlete.id, Program.status == "active")
        ):
            current.status = "archived"
            current.version += 1
            current.updated_at = utcnow()
            changes.append(touched(current, "program"))
        row.status = "active"
        row.version += 1
        row.updated_at = utcnow()
    elif command.command_type == "program.archive" and row:
        Empty.model_validate(command.payload)
        row.status = "archived"
        row.version += 1
        row.updated_at = utcnow()
    else:
        raise DomainError("program_state", "Program değişikliği için önce yeni bir sürüm oluştur.", 409)
    db.flush()
    changes.append(touched(row, "program"))
    return row, before, changes


def apply_prescription(db, athlete, command):
    if command.command_type != "prescription.materialize":
        raise DomainError(
            "immutable_prescription", "Reçete değişmez. Farklı plan için yeni program sürümü oluştur.", 409
        )
    data = Materialize.model_validate(command.payload)
    program = owned(db, Program, athlete.id, data.program_id)
    day = owned(db, ProgramDay, athlete.id, data.day_id)
    if day.program_id != program.id or day.kind != "training":
        raise DomainError("program_day", "Çalışma günü programla eşleşmiyor.")
    if not program.start_date <= data.scheduled_date < program.start_date + timedelta(weeks=program.weeks):
        raise DomainError("program_dates", "Seçili tarih bu dönemin dışında.")
    period_week = (data.scheduled_date - program.start_date).days // 7 + 1
    if not day.first_week <= period_week <= (day.last_week or program.weeks):
        raise DomainError("phase_dates", "Bu çalışma seçili dönem haftasında uygulanmıyor.")
    if data.scheduled_date.weekday() != day.weekday:
        raise DomainError("weekday", "Seçili gün plan günüyle eşleşmiyor.")
    expected_id = uuid5(day.id, data.scheduled_date.isoformat())
    # Every entry point gets the same existing prescription, irrespective of refresh/readiness.
    existing = db.scalar(
        select(Prescription).where(
            Prescription.athlete_id == athlete.id,
            Prescription.day_id == day.id,
            Prescription.scheduled_date == data.scheduled_date,
        )
    )
    if existing:
        return existing, serial(existing), [touched(existing, "prescription")]
    if command.expected_version != 0:
        raise DomainError("version_conflict", "Reçete sürümü uyuşmuyor.", 409)
    row = Prescription(
        id=expected_id,
        athlete_id=athlete.id,
        program_id=program.id,
        day_id=day.id,
        program_version=program.version,
        scheduled_date=data.scheduled_date,
        timezone=athlete.timezone,
        title=day.label,
        decision={
            "model_version": "prescription-copy-1",
            "rule_id": "accepted-program",
            "input_lineage": [
                {"id": str(program.id), "version": program.version},
                {"id": str(day.id), "version": day.version},
            ],
            "reason": "Kabul ettiğin programın hedefleri korundu. Gerçek yapılan değerleri antrenmanda sen girersin.",
        },
    )
    db.add(row)
    db.flush()
    changes = [touched(row, "prescription")]
    ordinal = 0
    for exercise in db.scalars(
        select(ProgramExercise)
        .where(
            ProgramExercise.day_id == day.id,
            ProgramExercise.athlete_id == athlete.id,
            ProgramExercise.deleted_at.is_(None),
        )
        .order_by(ProgramExercise.position)
    ):
        targets = {k: getattr(exercise, k) for k in Targets.model_fields}
        for set_index in range(exercise.sets):
            slot = PrescriptionSlot(
                id=uuid5(row.id, str(ordinal)),
                athlete_id=athlete.id,
                prescription_id=row.id,
                ordinal=ordinal,
                set_index=set_index,
                target_range=exercise.target_range,
                **targets,
            )
            db.add(slot)
            db.flush()
            changes.append(touched(slot, "slot"))
            ordinal += 1
    return row, None, changes


class DraftRequest(StrictModel):
    goal: str = Field(min_length=1, max_length=1000)
    objective: str = Field(pattern="^(strength|hypertrophy|endurance|skill|hybrid)$")
    experience: str = Field(pattern="^(new|returning|regular|advanced)$")
    sport: str = Field(default="strength", max_length=100)
    weeks: int = Field(ge=1, le=52)
    start_date: date
    weekdays: list[int] = Field(min_length=1, max_length=7)
    adult: bool
    symptoms: bool = False


def draft_program(data: DraftRequest):
    if any(d < 0 or d > 6 for d in data.weekdays) or len(set(data.weekdays)) != len(data.weekdays):
        raise DomainError("weekdays", "Gün seçimini kontrol et.")
    notes = [
        "Başlangıç taslağıdır. Yük ve hareket uygunluğunu sen belirlersin; uygulamadan onaylamadan ana plana eklenmez."
    ]
    supported = data.sport in {"strength", "calisthenics", "running", "walking"}
    safe = data.adult and not data.symptoms and supported
    days = []
    for weekday in range(7):
        exercises = []
        training = weekday in data.weekdays
        if training and safe:
            cardio = (
                data.sport in {"running", "walking"}
                or data.objective == "endurance"
                or (data.objective == "hybrid" and data.weekdays.index(weekday) % 2 == 1)
            )
            if cardio:
                exercises = [
                    {
                        "movement_id": "easy-locomotion",
                        "name": "Rahat yürüyüş / koşu",
                        "modality": "cardio",
                        "sets": 1,
                        "seconds": 900,
                        "load_kind": "none",
                    }
                ]
            else:
                count = 2 if data.experience in ("new", "returning") else 3
                exercises = [
                    {
                        "movement_id": key,
                        "name": name,
                        "modality": "strength",
                        "variant": "comfortable-range",
                        "load_kind": "bodyweight",
                        "sets": count,
                        "reps": reps,
                        "rir": 3,
                        "rest_seconds": 90,
                    }
                    for key, name, reps in [
                        ("squat", "Vücut ağırlığıyla çömelme", 8),
                        ("incline-pushup", "Yükseltilmiş zeminde şınav", 6),
                        ("glute-bridge", "Kalça köprüsü", 8),
                    ]
                ]
        days.append(
            {
                "weekday": weekday,
                "kind": "training" if training else "rest",
                "label": "Çalışma" if training else "Dinlenme",
                "exercises": exercises,
            }
        )
    if not safe:
        notes.append(
            "Yaş, belirtiler veya branş kapsamı nedeniyle doz önerilmedi. Takvim hazır; çalışma ayrıntılarını uygun uzmanla veya kendi bilgilerinle ekle."
        )
    if safe and data.objective != "endurance":
        notes.append(
            "Çekiş hareketi için ekipman bilgisi gerekli. Uygun bar/bant/cihaz varsa hareket ekleyerek dengele."
        )
    return {
        "program": {
            "name": f"{data.weeks} haftalık yolum",
            "goal": data.goal,
            "start_date": data.start_date.isoformat(),
            "weeks": data.weeks,
            "days": days,
        },
        "notes": notes,
        "model_version": "starter-heuristic-1",
        "status": "proposed",
        "evidence_status": "heuristic",
        "source_urls": ["https://pubmed.ncbi.nlm.nih.gov/41843416/"],
        "missing": ["Ölçülmüş kişisel kapasite", "Hareket tekniği", "Ekipman uygunluğu"],
    }


def draft_with_context(data: DraftRequest, snapshot, as_of):
    """Persisted health context can constrain a request; a checkbox cannot erase it."""
    from zoneinfo import ZoneInfo

    from .domain.science import compute

    current_day = as_of.astimezone(ZoneInfo(snapshot["timezone"])).date()
    profiles = [p for p in snapshot.get("profiles", []) if not p.get("deleted_at")]
    profile = profiles[0] if profiles else None
    changes = {}
    reasons = []
    if profile:
        if profile.get("experience"):
            changes["experience"] = profile["experience"]
        if profile.get("birth_date"):
            birth = date.fromisoformat(profile["birth_date"])
            age = (
                current_day.year
                - birth.year
                - ((current_day.month, current_day.day) < (birth.month, birth.day))
            )
            changes["adult"] = data.adult and age >= 18
            if age < 18:
                reasons.append("Kayıtlı yaş profili 18 yaş altı; yetişkin başlangıç dozu önerilmedi.")
    analysis = compute(snapshot, as_of)
    if analysis["readiness"]["status"] == "caution":
        changes["symptoms"] = True
        reasons.append(
            "Güncel sağlık kayıtlarında dikkat gerektiren durum var. Bildirilen belirti/toparlanma durumu doz önerisini sınırlar; mevcut ana programın değiştirilmedi."
        )
    result = draft_program(data.model_copy(update=changes))
    result["notes"].extend(reasons)
    result["input_revision"] = snapshot["cursor"]
    result["as_of"] = as_of.isoformat()
    result["health_context"] = analysis["readiness"]
    result["profile_source"] = {"id": profile["id"], "version": profile["version"]} if profile else None
    return result
