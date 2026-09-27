"""User choices, not a clinical prescription engine."""

from typing import Literal

from pydantic import Field, model_validator

from .contracts import StrictModel
from .movements import BY_ID, normalize


class EquipmentProfile(StrictModel):
    id: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=100)
    revision: int = Field(ge=1)
    equipment: list[str] = Field(default_factory=list, max_length=50)
    available_kg: list[float] = Field(default_factory=list, max_length=100)
    original_text: str = Field(default="", max_length=1000)

    @model_validator(mode="after")
    def weights(self):
        if any(not 0 <= v <= 2000 for v in self.available_kg):
            raise ValueError("Ağırlık seçenekleri 0–2000 kg teknik aralığında olmalı.")
        return self


class PlanningPreferences(StrictModel):
    favorite_meal_ids: list[str] = Field(default_factory=list, max_length=100)
    goal: str = Field(default="", max_length=1000)
    weekdays: list[int] = Field(default_factory=lambda: [0, 2, 4], max_length=7)
    minutes: int | None = Field(default=None, ge=1, le=1440)
    equipment_profiles: list[EquipmentProfile] = Field(default_factory=list, max_length=20)
    active_equipment_id: str | None = None
    disliked_movements: list[str] = Field(default_factory=list, max_length=300)
    optional_modules: list[Literal["nutrition", "sleep", "hydration"]] = Field(
        default_factory=lambda: ["nutrition", "sleep", "hydration"]
    )

    @model_validator(mode="after")
    def unique(self):
        ids = [p.id for p in self.equipment_profiles]
        if (
            len(ids) != len(set(ids))
            or len(self.weekdays) != len(set(self.weekdays))
            or any(d not in range(7) for d in self.weekdays)
        ):
            raise ValueError("Günler ve ekipman profili kimlikleri tekil olmalı.")
        if self.active_equipment_id is not None and self.active_equipment_id not in ids:
            raise ValueError("Etkin ekipman profili bulunamadı.")
        return self


def profile_context(profile):
    if not profile:
        return {"profile": None, "equipment": None, "missing": ["Kayıtlı profil yok"]}
    preferences = PlanningPreferences.model_validate(profile.get("planning_preferences") or {})
    equipment = next(
        (p.model_dump() for p in preferences.equipment_profiles if p.id == preferences.active_equipment_id),
        None,
    )
    return {
        "profile": {"id": profile["id"], "version": profile["version"]},
        "experience": profile.get("experience"),
        "equipment": equipment,
        "original_equipment": profile.get("equipment", []),
        "preferences": preferences.model_dump(),
        "missing": []
        if equipment
        else ["Yapılandırılmış ekipman profili seçilmemiş; serbest metin otomatik eşlenmedi."],
    }


def equipment_matches(definition, available):
    required = {normalize(e) for e in definition.get("equipment", [])}
    # RUN catalog's Outdoor/Treadmill list denotes two locations, not a
    # requirement to own a treadmill outdoors. Other lists are conservative.
    if definition.get("type") == "RUN":
        return bool(required & available) if required else True
    return required <= available


def alternatives(movement_id, equipment, dislikes=()):
    source = BY_ID.get(movement_id)
    if not source or equipment is None:
        return []
    available = {normalize(s) for s in equipment} | {"bodyweight", "floor"}
    return [
        {
            "movement_id": d["id"],
            "name": d["name"],
            "equipment": ", ".join(d.get("equipment", [])),
            "load_kind": d["load_kind"],
            "modality": d["modality"],
            "catalog_version": d["catalog_version"],
            "reason": "Aynı katalog hareket örüntüsü ve seçili ekipman",
            "difference": "Teknik, direnç ve hareket açıklığı farklı olabilir. Önceki kg otomatik aktarılmaz.",
        }
        for d in BY_ID.values()
        if d["id"] != movement_id
        and d["id"] not in dislikes
        and d.get("pattern") == source.get("pattern")
        and equipment_matches(d, available)
    ]


def duration_preview(days, execution_seconds=None, transition_seconds=None):
    rest = sum(
        max(0, e["sets"] - 1) * (e.get("rest_seconds") or 0) for d in days for e in d.get("exercises", [])
    )
    known = sum(
        e["sets"] * e["seconds"] for d in days for e in d.get("exercises", []) if e.get("seconds") is not None
    )
    unknown = sum(e["sets"] for d in days for e in d.get("exercises", []) if e.get("seconds") is None)
    transitions = max(0, sum(len(d.get("exercises", [])) for d in days) - 1)
    complete = (
        (unknown == 0 or execution_seconds is not None)
        and (transitions == 0 or transition_seconds is not None)
        and all(
            e.get("rest_seconds") is not None for d in days for e in d.get("exercises", []) if e["sets"] > 1
        )
    )
    return {
        "known_seconds": known + rest,
        "estimated_seconds": known
        + rest
        + unknown * (execution_seconds or 0)
        + transitions * (transition_seconds or 0)
        if complete
        else None,
        "unknown_sets": unknown,
        "assumptions": {"execution_seconds": execution_seconds, "transition_seconds": transition_seconds},
        "meaning": "Kullanıcının süre varsayımlarıyla tahmin; süreye sığma veya güvenlik garantisi değildir.",
    }
