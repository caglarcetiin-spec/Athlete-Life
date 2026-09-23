"""Pure prescription / execution rules. No DB, browser clock or random program selection."""

from typing import Literal

from pydantic import Field, field_validator, model_validator

from ..contracts import StrictModel


def decimal(value):
    if isinstance(value, str):
        stripped = value.strip()
        if "," in stripped and "." in stripped or stripped.count(",") > 1 or stripped.count(".") > 1:
            raise ValueError("Belirsiz sayı biçimi; binlik ayraç kullanma.")
        return stripped.replace(",", ".")
    return value


class Targets(StrictModel):
    movement_id: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=150)
    variant: str = Field(default="standard", max_length=150)
    modality: Literal["strength", "isometric", "cardio", "skill", "circuit"] = "strength"
    equipment: str = Field(default="", max_length=100)
    side: Literal["both", "left", "right", "unknown"] = "both"
    load_kind: Literal["external", "bodyweight", "assistance", "none"] = "external"
    reps: int | None = Field(default=None, ge=0, le=10000)
    seconds: float | None = Field(default=None, ge=0, le=86400)
    distance_m: float | None = Field(default=None, ge=0, le=1000000)
    external_kg: float | None = Field(default=None, ge=0, le=2000)
    assistance_kg: float | None = Field(default=None, ge=0, le=2000)
    bodyweight_kg: float | None = Field(default=None, gt=0, le=500)
    rir: float | None = Field(default=None, ge=0, le=10)
    rpe: float | None = Field(default=None, ge=0, le=10)
    rest_seconds: int | None = Field(default=None, ge=0, le=7200)

    @field_validator(
        "seconds", "distance_m", "external_kg", "assistance_kg", "bodyweight_kg", "rir", "rpe", mode="before"
    )
    @classmethod
    def decimal_input(cls, value):
        return decimal(value)

    @model_validator(mode="after")
    def semantic(self):
        if self.assistance_kg is not None and self.external_kg not in (0, None):
            raise ValueError("Yardım kuvveti ve ek ağırlık ayrı ölçümler; bir sette birlikte girme.")
        if self.load_kind == "assistance" and self.external_kg not in (0, None):
            raise ValueError("Destekli harekette ek ağırlık alanı kullanılamaz.")
        return self


def first_missing(slots, performed):
    occupied = {p["slot_id"] for p in performed if not p.get("deleted_at") and p.get("slot_id")}
    return next((s for s in sorted(slots, key=lambda s: s["ordinal"]) if s["id"] not in occupied), None)


def timer_remaining(deadline, paused_ms, as_of):
    if paused_ms is not None:
        return max(0, paused_ms)
    if deadline is None:
        return 0
    return max(0, int((deadline - as_of).total_seconds() * 1000))


def program_analysis(days):
    training = [d for d in days if d["kind"] == "training"]
    modalities = {e["modality"] for d in training for e in d["exercises"]}
    missing = []
    if not training:
        missing.append("Antrenman günü tanımlanmamış.")
    if len({d["weekday"] for d in training}) == 7:
        missing.append("Yedi güne çalışma yazılmış; dinlenme dağılımını gözden geçir.")
    if any(not d["exercises"] for d in training):
        missing.append("Bazı antrenman günlerinde çalışma ayrıntısı eksik.")
    if "strength" in modalities and "cardio" not in modalities:
        missing.append(
            "Dayanıklılık bu taslakta yer almıyor. Hibrit bir hedefin varsa ayrı bir gün ekleyebilirsin."
        )
    return {
        "model_version": "program-review-1",
        "status": "heuristic",
        "training_days": len(training),
        "planned_sets": sum(e["sets"] for d in training for e in d["exercises"]),
        "missing": missing,
        "limitations": [
            "Bu kontrol takvim ve kayıt kapsamını inceler; kişisel performans veya güvenlik garantisi vermez."
        ],
    }
