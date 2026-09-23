"""Typed small commands for nutrition, daily life, goals and capability records."""

import json
from datetime import date, datetime
from pathlib import Path
from typing import Annotated, Literal
from uuid import UUID
from zoneinfo import ZoneInfo

from pydantic import BeforeValidator, Field, model_validator
from sqlalchemy import select

from . import models as m
from .contracts import Empty, StrictModel
from .db import utcnow
from .domain.scheduling import local_instant
from .domain.workouts import decimal
from .errors import DomainError
from .programming import owned, touched
from .service import get_owned, serial

Number = Annotated[float, BeforeValidator(decimal)]
NonNegative = Annotated[Number, Field(ge=0, le=1000000)]
Positive = Annotated[Number, Field(gt=0, le=1000000)]
NUTRIENTS = ("kcal", "protein_g", "carbs_g", "fat_g", "fiber_g")
CATALOG = json.loads((Path(__file__).parent / "catalogs/capabilities.json").read_text())
DEFINITIONS = {
    row["id"]: {**row, "domain": domain, "protocol_version": "legacy-catalog-1"}
    for domain, rows in CATALOG.items()
    for row in rows
}


class DailyInput(StrictModel):
    local_date: date
    occurred_at: datetime | None = None
    time_precision: Literal["exact", "date_only"] = "date_only"

    @model_validator(mode="after")
    def instant(self):
        if self.occurred_at is not None and self.occurred_at.tzinfo is None:
            raise ValueError("Saat dilimi gerekli.")
        if self.time_precision == "exact" and self.occurred_at is None:
            raise ValueError("Gerçek saat gerekli.")
        if self.time_precision == "date_only" and self.occurred_at is not None:
            raise ValueError("Tarih-only kayıtta saat atanamaz.")
        return self


class FoodInput(StrictModel):
    name: str = Field(min_length=1, max_length=150)
    kcal: NonNegative
    protein_g: NonNegative
    carbs_g: NonNegative
    fat_g: NonNegative
    fiber_g: NonNegative | None = None
    reference: str = Field(default="Kullanıcı girişi; 100 g için", max_length=500)


class Ingredient(StrictModel):
    food_id: UUID
    grams: Positive


class RecipeInput(StrictModel):
    name: str = Field(min_length=1, max_length=150)
    total_grams: Positive
    instructions: str = Field(default="", max_length=3000)
    ingredients: list[Ingredient] = Field(min_length=1, max_length=100)


class MealInput(DailyInput):
    name: str = Field(min_length=1, max_length=150)
    meal_type: Literal["meal", "breakfast", "lunch", "dinner", "snack"] = "meal"
    grams: Positive | None = None
    food_id: UUID | None = None
    recipe_id: UUID | None = None
    kcal: NonNegative | None = None
    protein_g: NonNegative | None = None
    carbs_g: NonNegative | None = None
    fat_g: NonNegative | None = None
    fiber_g: NonNegative | None = None

    @model_validator(mode="after")
    def source(self):
        if self.food_id and self.recipe_id:
            raise ValueError("Bir besin veya tarif seç.")
        if (self.food_id or self.recipe_id) and self.grams is None:
            raise ValueError("Besin veya tarif için gramaj gerekli.")
        return self


class WaterInput(DailyInput):
    ml: Annotated[Number, Field(gt=0, le=10000)]
    note: str = Field(default="", max_length=500)


class NutritionDayInput(StrictModel):
    local_date: date
    status: Literal["complete", "partial", "not_logged"]


class CheckinInput(DailyInput):
    energy: int | None = Field(default=None, ge=0, le=10)
    fatigue: int | None = Field(default=None, ge=0, le=10)
    stress: int | None = Field(default=None, ge=0, le=10)
    sleep_quality: int | None = Field(default=None, ge=0, le=10)
    note: str = Field(default="", max_length=1000)


class SleepInput(StrictModel):
    start_at: datetime | None = None
    end_at: datetime | None = None
    start_date: date | None = None
    start_time: str | None = None
    end_date: date | None = None
    end_time: str | None = None
    quality: int | None = Field(default=None, ge=0, le=10)
    note: str = Field(default="", max_length=1000)


class PainInput(DailyInput):
    area: str = Field(min_length=1, max_length=100)
    side: Literal["left", "right", "both", "unknown"] = "unknown"
    intensity: int = Field(ge=0, le=10)
    note: str = Field(default="", max_length=1000)


class MeasurementInput(DailyInput):
    metric: Literal["weight", "waist", "height", "bodyfat"]
    value: Positive
    unit: Literal["kg", "cm", "percent"]
    protocol: str = Field(default="self-reported", max_length=150)

    @model_validator(mode="after")
    def unit_matches(self):
        expected = {"weight": "kg", "waist": "cm", "height": "cm", "bodyfat": "percent"}[self.metric]
        if self.unit != expected:
            raise ValueError("Ölçüm birimi metrikle eşleşmiyor.")
        if self.metric == "bodyfat" and self.value > 100:
            raise ValueError("Yüzde 100 üzerinde olamaz.")
        return self


class CapabilityInput(DailyInput):
    definition_id: str = Field(min_length=1, max_length=100)
    protocol_version: str = Field(min_length=1, max_length=60)
    variant: str = Field(min_length=1, max_length=150)
    side: Literal["left", "right", "both", "unknown"] = "unknown"
    equipment: str = Field(default="", max_length=150)
    value: NonNegative | None = None
    unit: Literal["kg", "reps", "seconds", "sec", "min", "m", "cm", "km", "deg", "percent", "%"]
    attempt: int = Field(default=1, ge=1, le=100)
    selection: Literal["single", "best", "last", "mean"] = "single"
    components: dict[str, NonNegative] = Field(default_factory=dict, max_length=20)
    note: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def definition(self):
        if self.definition_id not in DEFINITIONS and not self.definition_id.startswith("custom:"):
            raise ValueError("Test tanımı bulunamadı.")
        definition = DEFINITIONS.get(self.definition_id, {})
        expected = definition.get("unit") or {"seconds": "seconds", "reps": "reps", "load_reps": "kg"}.get(
            definition.get("metric")
        )
        dimensions = {
            "seconds": "time",
            "sec": "time",
            "min": "time",
            "m": "distance",
            "cm": "distance",
            "km": "distance",
            "%": "ratio",
            "percent": "ratio",
        }
        if expected and dimensions.get(expected, expected) != dimensions.get(self.unit, self.unit):
            raise ValueError("Birim seçilen testin ölçüm türüyle uyuşmuyor.")
        return self


class GoalInput(StrictModel):
    title: str = Field(min_length=1, max_length=150)
    metric: str = Field(min_length=1, max_length=100)
    variant: str = Field(default="", max_length=150)
    baseline: NonNegative
    target: NonNegative
    unit: str = Field(min_length=1, max_length=30)
    start_date: date
    target_date: date
    archived: bool = False

    @model_validator(mode="after")
    def interval(self):
        if self.target_date < self.start_date or self.baseline == self.target:
            raise ValueError("Hedef ve tarih aralığını kontrol et.")
        return self


class GoalMeasurementInput(DailyInput):
    goal_id: UUID
    value: NonNegative
    note: str = Field(default="", max_length=500)


class EventInput(DailyInput):
    title: str = Field(min_length=1, max_length=150)
    kind: Literal["social", "physical"]
    status: Literal["planned", "occurred", "cancelled"]
    modality: Literal["strength", "cardio", "skill", "isometric", "circuit"] | None = None
    duration_seconds: int | None = Field(default=None, gt=0, le=86400)
    rpe: Annotated[Number, Field(ge=0, le=10)] | None = None
    duplicate_of: UUID | None = None
    note: str = Field(default="", max_length=1000)


class ProfileInput(StrictModel):
    birth_date: date | None = None
    sex: Literal["female", "male", "intersex", "unspecified"] = "unspecified"
    experience: Literal["new", "returning", "regular", "advanced"] = "new"
    cycle_tracking: bool = False
    interface_mode: Literal["simple", "professional"] = "simple"
    avatar_id: UUID | None = None
    equipment: list[str] = Field(default_factory=list, max_length=50)
    sport_ids: list[str] = Field(default_factory=list, max_length=50)
    tutorial_completed: bool = False


class EpisodeInput(StrictModel):
    kind: Literal["illness", "injury", "fatigue", "other"]
    start_date: date
    resolved_date: date | None = None
    return_until: date | None = None
    severity: Literal["mild", "moderate", "severe", "unspecified"] = "unspecified"
    note: str = Field(default="", max_length=1500)

    @model_validator(mode="after")
    def dates(self):
        if self.resolved_date and self.resolved_date < self.start_date:
            raise ValueError("İyileşme tarihi başlangıçtan önce olamaz.")
        if self.return_until and self.return_until < (self.resolved_date or self.start_date):
            raise ValueError("Dönüş aralığını kontrol et.")
        return self


class CycleInput(DailyInput):
    bleeding: Literal["none", "light", "moderate", "heavy", "unknown"]
    symptoms: int | None = Field(default=None, ge=0, le=10)
    cycle_day: int | None = Field(default=None, ge=1, le=150)
    note: str = Field(default="", max_length=1000)


class LabInput(DailyInput):
    comparator: Literal["=", "<", ">", "≤", "≥"] = "="
    analyte: str = Field(min_length=1, max_length=150)
    value: Number
    unit: str = Field(min_length=1, max_length=40)
    reference_low: Number | None = None
    reference_high: Number | None = None
    laboratory: str = Field(default="", max_length=150)
    method: str = Field(default="", max_length=150)
    fasting: bool | None = None
    note: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def reference(self):
        if (
            self.reference_low is not None
            and self.reference_high is not None
            and self.reference_low > self.reference_high
        ):
            raise ValueError("Laboratuvar alt sınırı üst sınırdan büyük olamaz.")
        return self


REGISTRY = {
    "food": (m.Food, FoodInput),
    "recipe": (m.Recipe, RecipeInput),
    "meal": (m.Meal, MealInput),
    "hydration": (m.Hydration, WaterInput),
    "nutrition_day": (m.NutritionDay, NutritionDayInput),
    "checkin": (m.Checkin, CheckinInput),
    "sleep": (m.Sleep, SleepInput),
    "pain": (m.Pain, PainInput),
    "measurement": (m.Measurement, MeasurementInput),
    "capability": (m.Capability, CapabilityInput),
    "goal": (m.Goal, GoalInput),
    "goal_measurement": (m.GoalMeasurement, GoalMeasurementInput),
    "event": (m.LifeEvent, EventInput),
    "profile": (m.AthleteProfile, ProfileInput),
    "episode": (m.HealthEpisode, EpisodeInput),
    "cycle": (m.Cycle, CycleInput),
    "lab": (m.Lab, LabInput),
}


def apply(db, athlete, command):
    kind, action = command.command_type.split(".", 1)
    model, schema = REGISTRY[kind]
    if action not in ("save", "delete"):
        raise DomainError("command", "Desteklenmeyen kayıt işlemi.")
    row = get_owned(
        db, model, athlete.id, command.entity_id, command.expected_version, create=action == "save"
    )
    before = serial(row) if row else None
    if action == "delete":
        Empty.model_validate(command.payload)
        row.deleted_at = utcnow()
        row.version += 1
        row.updated_at = utcnow()
    else:
        if not command.payload:
            raise DomainError("empty_patch", "Kaydedilecek değişiklik yok.")
        baseline = {
            key: getattr(row, key) for key in schema.model_fields if row is not None and hasattr(row, key)
        }
        if kind == "recipe" and row:
            baseline["ingredients"] = [
                {k: v for k, v in i.items() if k in ("food_id", "grams")} for i in row.ingredients
            ]
        if kind == "sleep":
            if "start_date" in command.payload or "start_time" in command.payload:
                baseline["start_at"] = None
            if "end_date" in command.payload or "end_time" in command.payload:
                baseline["end_at"] = None
        data = schema.model_validate({**baseline, **command.payload})
        fields = data.model_dump()
        if isinstance(data, DailyInput):
            fields["timezone"] = row.timezone if row else athlete.timezone
        if kind == "recipe" and row and not ({"ingredients", "total_grams"} & command.payload.keys()):
            fields["ingredients"] = row.ingredients
            fields["nutrient_snapshot"] = row.nutrient_snapshot
        elif kind == "recipe":
            ingredients = []
            total = {k: 0.0 for k in NUTRIENTS}
            for item in data.ingredients:
                food = owned(db, m.Food, athlete.id, item.food_id)
                snapshot = {k: getattr(food, k) for k in NUTRIENTS}
                ingredients.append(
                    {
                        "food_id": str(food.id),
                        "version": food.version,
                        "name": food.name,
                        "grams": item.grams,
                        "per100": snapshot,
                    }
                )
                for key in NUTRIENTS:
                    if snapshot[key] is None:
                        total[key] = None
                    elif total[key] is not None:
                        total[key] += snapshot[key] * item.grams / 100
            fields["ingredients"] = ingredients
            fields["nutrient_snapshot"] = {
                "per100": {
                    k: (v * 100 / data.total_grams if v is not None else None) for k, v in total.items()
                },
                "source": "recipe-version",
            }
        elif kind == "meal":
            same = row is not None and data.food_id == row.food_id and data.recipe_id == row.recipe_id
            if same and (data.food_id or data.recipe_id):
                snapshot = row.nutrient_snapshot
                version = row.source_version
            elif data.food_id:
                food = owned(db, m.Food, athlete.id, data.food_id)
                snapshot = {
                    "per100": {k: getattr(food, k) for k in NUTRIENTS},
                    "name": food.name,
                    "reference": food.reference,
                }
                version = food.version
            elif data.recipe_id:
                recipe = owned(db, m.Recipe, athlete.id, data.recipe_id)
                snapshot = recipe.nutrient_snapshot
                version = recipe.version
            else:
                snapshot = {
                    "direct_portion": {k: getattr(data, k) for k in NUTRIENTS},
                    "source": "self-reported",
                }
                version = None
            if "per100" in snapshot:
                for key in NUTRIENTS:
                    fields[key] = (
                        snapshot["per100"].get(key) * data.grams / 100
                        if snapshot["per100"].get(key) is not None
                        else None
                    )
            fields["nutrient_snapshot"] = snapshot
            fields["source_version"] = version
        elif kind == "sleep":
            zone = row.timezone if row else athlete.timezone
            a = data.start_at or (
                local_instant(data.start_date, data.start_time, zone)
                if data.start_date and data.start_time
                else None
            )
            b = data.end_at or (
                local_instant(data.end_date, data.end_time, zone) if data.end_date and data.end_time else None
            )
            if (
                not a
                or not b
                or a.tzinfo is None
                or b.tzinfo is None
                or not 0 < (b - a).total_seconds() <= 172800
            ):
                raise DomainError(
                    "sleep_interval", "Uyku başlangıcı ve bitişini saat dilimiyle birlikte kontrol et."
                )
            fields = {
                "start_at": a,
                "end_at": b,
                "timezone": zone,
                "quality": data.quality,
                "note": data.note,
            }
        elif kind == "goal_measurement":
            goal = owned(db, m.Goal, athlete.id, data.goal_id)
            if data.local_date < goal.start_date:
                raise DomainError("goal_date", "Ölçüm hedefin başlangıcından önce.")
        elif kind == "event" and data.duplicate_of:
            other = owned(db, m.LifeEvent, athlete.id, data.duplicate_of)
            if other.id == command.entity_id or other.duplicate_of:
                raise DomainError("duplicate_cycle", "Kopya ilişkisi döngü oluşturamaz.")
        elif kind == "profile":
            if data.avatar_id:
                avatar = owned(db, m.MediaObject, athlete.id, data.avatar_id)
                if not avatar.mime.startswith("image/"):
                    raise DomainError("avatar", "Profil fotoğrafı için bir görsel seç.")
            if data.birth_date and data.birth_date > utcnow().astimezone(ZoneInfo(athlete.timezone)).date():
                raise DomainError("birth_date", "Doğum tarihi gelecekte olamaz.")
        elif kind == "cycle":
            profile = db.scalar(
                select(m.AthleteProfile).where(
                    m.AthleteProfile.athlete_id == athlete.id, m.AthleteProfile.deleted_at.is_(None)
                )
            )
            if not profile or not profile.cycle_tracking:
                raise DomainError("cycle_disabled", "Önce profilinden isteğe bağlı döngü takibini aç.")
        if row is None:
            row = model(id=command.entity_id, athlete_id=athlete.id, version=0)
            db.add(row)
        for key, value in fields.items():
            setattr(row, key, value)
        row.version += 1
        row.updated_at = utcnow()
    db.flush()
    return row, before, [touched(row, kind)]


def nutrition_summary(snapshot, on):
    meals = [r for r in snapshot.get("meals", []) if r["local_date"] == on and not r.get("deleted_at")]
    status = next(
        (
            r["status"]
            for r in snapshot.get("nutrition_days", [])
            if r["local_date"] == on and not r.get("deleted_at")
        ),
        None,
    )
    state = "complete" if status == "complete" else "partial" if meals else "not_logged"
    return {
        "status": state,
        "entries": len(meals),
        "totals": {
            k: sum(r[k] for r in meals) if meals and all(r.get(k) is not None for r in meals) else None
            for k in NUTRIENTS
        },
        "water_ml": sum(
            r["ml"]
            for r in snapshot.get("hydrations", [])
            if r["local_date"] == on and not r.get("deleted_at")
        )
        or None,
        "source_ids": [r["id"] for r in meals],
    }


def capability_series(rows):
    groups = {}
    units = {
        "sec": ("seconds", 1),
        "seconds": ("seconds", 1),
        "min": ("seconds", 60),
        "cm": ("m", 0.01),
        "m": ("m", 1),
        "km": ("m", 1000),
        "%": ("percent", 1),
    }
    for row in rows:
        if row.get("deleted_at") or row.get("value") is None:
            continue
        unit, factor = units.get(row["unit"], (row["unit"], 1))
        definition = DEFINITIONS.get(row["definition_id"], {})
        if definition.get("metric") == "load_reps" and not row.get("components", {}).get("reps"):
            continue  # Missing repetition count is not a comparable strength result.
        component_key = json.dumps(row.get("components", {}), sort_keys=True)
        key = tuple(
            row[k] for k in ("definition_id", "protocol_version", "variant", "side", "equipment", "selection")
        ) + (unit, component_key)
        groups.setdefault(key, []).append(
            {"id": row["id"], "local_date": row["local_date"], "value": row["value"] * factor, "unit": unit}
        )
    result = []
    for key, points in groups.items():
        definition = DEFINITIONS.get(key[0], {})
        higher = definition.get("higher", True if definition else None)
        best = (max if higher else min)(points, key=lambda p: p["value"]) if higher is not None else None
        result.append(
            {
                "definition_id": key[0],
                "protocol_version": key[1],
                "variant": key[2],
                "side": key[3],
                "equipment": key[4],
                "selection": key[5],
                "unit": key[6],
                "points": sorted(points, key=lambda p: p["local_date"]),
                "best": best,
                "missing": ["Taraf belirtilmemiş; simetri hesaplanmadı."] if key[3] == "unknown" else [],
            }
        )
    return result
