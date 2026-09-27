"""Transparent, editable adult strength draft. Not MacroFactor's proprietary algorithm."""

from datetime import date
from typing import Literal

from pydantic import Field, model_validator

from .contracts import StrictModel
from .movements import BY_ID, normalize
from .planning_context import equipment_matches
from .programming import DraftRequest, draft_with_context

GROUPS = {
    "chest": ["chest"],
    "back": ["lats", "upperBack", "scapular"],
    "shoulders": ["frontDelts", "sideDelts", "rearDelts"],
    "arms": ["biceps", "triceps", "forearms"],
    "core": ["abs", "obliques"],
    "quads": ["quads"],
    "posterior": ["glutes", "hamstrings"],
    "calves": ["calves"],
}
# Deliberately bounded inventory: advanced skills are not inferred from experience alone.
POOL = [
    "barbell-squat",
    "bodyweight-squat",
    "glute-bridge",
    "incline-push-up",
    "push-up",
    "ring-row",
    "pull-up",
    "chin-up",
    "db-hammer-curl",
    "db-lateral-raise",
    "dumbbell-rdl",
    "dumbbell-goblet-squat",
    "dumbbell-overhead-press",
    "bodyweight-calf-raise",
]
LABELS = {
    "barbell-squat": "Bar ile çömelme",
    "bodyweight-squat": "Vücut ağırlığıyla çömelme",
    "glute-bridge": "Kalça köprüsü",
    "incline-push-up": "Yükseltilmiş destekle şınav",
    "push-up": "Şınav",
    "ring-row": "Halka ile yatay çekiş",
    "pull-up": "Barfiks",
    "chin-up": "Avuç içi yüze dönük barfiks",
    "db-hammer-curl": "Dambıl ile çekiç kol bükme",
    "db-lateral-raise": "Dambıl ile yana açış",
    "dumbbell-rdl": "Dambıl ile Romen yerden kaldırma",
    "dumbbell-goblet-squat": "Göğüste dambıl ile çömelme",
    "dumbbell-overhead-press": "Dambıl ile baş üstü itiş",
    "bodyweight-calf-raise": "Ayakta topuk yükseltme",
}
LOWER = {
    "barbell-squat",
    "bodyweight-squat",
    "glute-bridge",
    "dumbbell-rdl",
    "dumbbell-goblet-squat",
    "bodyweight-calf-raise",
}


class GuidedChoices(StrictModel):
    experience: Literal["new", "returning", "regular", "advanced"]
    objective: Literal["strength", "hypertrophy", "strength_hypertrophy"]
    equipment: list[str] = Field(max_length=50)
    weekdays: list[int] = Field(min_length=1, max_length=6)
    minutes: int = Field(ge=15, le=180)
    split: Literal["full_body", "upper_lower", "push_pull_legs"]
    focus: dict[str, int] = Field(default_factory=dict)
    goal: str = Field(min_length=1, max_length=1000)

    @model_validator(mode="after")
    def validate_choices(self):
        if len(set(self.weekdays)) != len(self.weekdays) or any(d not in range(7) for d in self.weekdays):
            raise ValueError("Günler tekil ve 0–6 aralığında olmalı.")
        if (
            any(k not in GROUPS or type(v) is not int or v < 0 or v > 5 for k, v in self.focus.items())
            or sum(self.focus.values()) > 5
        ):
            raise ValueError("En fazla beş öncelik puanı dağıtabilirsin.")
        minimum = {"full_body": 1, "upper_lower": 2, "push_pull_legs": 3}[self.split]
        if len(self.weekdays) < minimum:
            raise ValueError("Seçtiğin çalışma düzeni için yeterli gün yok.")
        return self


class GuidedRequest(GuidedChoices):
    name: str = Field(min_length=1, max_length=150)
    weeks: Literal[4, 8, 12]
    start_date: date
    adult: bool
    symptoms: bool


def generate(data, snapshot, as_of):
    # Reuse persisted health/age checks; questionnaire cannot clear a caution.
    baseline = draft_with_context(
        DraftRequest(
            goal=data.goal,
            objective="strength",
            experience=data.experience,
            sport="strength",
            weeks=data.weeks,
            start_date=data.start_date,
            weekdays=data.weekdays,
            adult=data.adult,
            symptoms=data.symptoms,
        ),
        snapshot,
        as_of,
    )
    choices = GuidedChoices.model_validate(data.model_dump(include=set(GuidedChoices.model_fields)))
    safe = any(d["exercises"] for d in baseline["program"]["days"])
    available = {normalize(e) for e in data.equipment} | {"floor", "bodyweight"}
    profiles = [p for p in snapshot.get("profiles", []) if not p.get("deleted_at")]
    dislikes = (
        (profiles[0].get("planning_preferences") or {}).get("disliked_movements", []) if profiles else []
    )
    pool = [BY_ID[k] for k in POOL if k not in dislikes and equipment_matches(BY_ID[k], available)]
    notes = [
        "Taslak seçimlerine göre hazırlanır; kilogramı ilk seansta sen belirlersin. Onaylamadan ana planın değişmez.",
        "Set, tekrar ve süreler düzenlenebilir başlangıç varsayımlarıdır; kişisel sonuç veya kas büyümesi garantisi değildir.",
    ]
    if not safe:
        notes = baseline["notes"] + ["Otomatik hareket taslağı yerine boş gün planı hazırlandı."]
    counts = {}
    day_info = []
    for day in baseline["program"]["days"]:
        day["exercises"] = []
        if day["kind"] != "training" or not safe:
            continue
        index = sorted(data.weekdays).index(day["weekday"])
        kind = (
            "full_body"
            if data.split == "full_body"
            else (
                ["upper", "lower"][index % 2]
                if data.split == "upper_lower"
                else ["push", "pull", "legs"][index % 3]
            )
        )

        def eligible(d, kind=kind):
            lower = d["id"] in LOWER
            if kind == "upper":
                return not lower
            if kind in ("lower", "legs"):
                return lower
            if kind == "push":
                return d["id"] in {
                    "incline-push-up",
                    "push-up",
                    "db-lateral-raise",
                    "dumbbell-overhead-press",
                }
            if kind == "pull":
                return d["id"] in {"ring-row", "pull-up", "chin-up", "db-hammer-curl"}
            return True

        def score(d):
            priority = sum(
                data.focus.get(g, 0) * max((d.get("muscles", {}).get(m, 0) for m in muscles), default=0)
                for g, muscles in GROUPS.items()
            )
            return (-priority, counts.get(d["id"], 0), POOL.index(d["id"]))

        candidates = sorted(filter(eligible, pool), key=score)
        # Beginner options remain regressible; never assume a first-time user can pull up.
        if data.experience in ("new", "returning"):
            candidates = [d for d in candidates if d["id"] not in {"pull-up", "chin-up", "barbell-squat"}]
        # Reserve major pattern families before accessories; focus orders within families.
        if kind == "full_body":
            families = [
                {"bodyweight-squat", "barbell-squat", "dumbbell-goblet-squat"},
                {"incline-push-up", "push-up"},
                {"ring-row", "pull-up", "chin-up"},
                {"glute-bridge", "dumbbell-rdl"},
            ]
            anchors = [next((d for d in candidates if d["id"] in family), None) for family in families]
            anchors = [d for d in anchors if d is not None]
            candidates = sorted(anchors, key=score) + [d for d in candidates if d not in anchors]
        sets = 2 if data.experience in ("new", "returning") else 3
        reps = (
            6
            if data.objective == "strength" and data.experience in ("regular", "advanced")
            else (10 if data.objective == "hypertrophy" else 8)
        )
        rest = 180 if data.objective == "strength" else 120
        # Include setup / warm-up allowance; disclose these arithmetic assumptions.
        used = 300
        patterns = set()
        selected = []
        for d in candidates:
            pattern = "Vertical pull" if d["id"] in {"pull-up", "chin-up"} else d["pattern"]
            if pattern in patterns:
                continue
            cost = sets * 45 + (sets - 1) * rest + 60
            if used + cost > data.minutes * 60:
                continue
            selected.append(d)
            patterns.add(pattern)
            used += cost
            if len(selected) >= 6:
                break
        for d in selected:
            counts[d["id"]] = counts.get(d["id"], 0) + 1
            day["exercises"].append(
                {
                    "movement_id": d["id"],
                    "name": LABELS[d["id"]],
                    "catalog_version": d["catalog_version"],
                    "modality": d["modality"],
                    "equipment": ", ".join(d["equipment"]),
                    "load_kind": d["load_kind"],
                    "variant": "standard",
                    "sets": sets,
                    "reps": reps,
                    "rir": 3,
                    "rest_seconds": rest,
                    "set_kind": "working",
                }
            )
        day["label"] = {
            "full_body": "Tüm vücut",
            "upper": "Üst vücut",
            "lower": "Alt vücut",
            "push": "İtiş",
            "pull": "Çekiş",
            "legs": "Bacak",
        }[kind]
        day_info.append(
            {
                "weekday": day["weekday"],
                "estimated_minutes": round(used / 60, 1),
                "exercise_count": len(selected),
            }
        )
        if not selected:
            notes.append(
                day["label"]
                + ": ekipman ve süreye uygun hareket bulunamadı; elle düzenle veya seçimlerini değiştir."
            )
    muscles = {
        g: round(
            sum(
                e["sets"]
                * max((BY_ID[e["movement_id"]].get("muscles", {}).get(m, 0) for m in keys), default=0)
                for d in baseline["program"]["days"]
                for e in d["exercises"]
            ),
            1,
        )
        for g, keys in GROUPS.items()
    }
    missing = [
        g
        for g, v in data.focus.items()
        if v
        and not any(
            max((BY_ID[e["movement_id"]].get("muscles", {}).get(m, 0) for m in GROUPS[g]), default=0) >= 0.5
            for day in baseline["program"]["days"]
            for e in day["exercises"]
        )
    ]
    if missing:
        notes.append(
            "Seçili ekipman/katalogla karşılanamayan öncelikler: "
            + ", ".join(missing)
            + ". Bu bölgeler için kapsama iddiası yok."
        )
    if safe:
        for group, label in [
            ("back", "Sırt"),
            ("chest", "Göğüs"),
            ("quads", "Ön bacak"),
            ("posterior", "Kalça / arka bacak"),
        ]:
            if not any(
                max((BY_ID[e["movement_id"]].get("muscles", {}).get(m, 0) for m in GROUPS[group]), default=0)
                >= 0.5
                for day in baseline["program"]["days"]
                for e in day["exercises"]
            ):
                notes.append(
                    label
                    + ": bu taslakta belirgin çalışma kapsamı yok. Ekipmanını, süreyi veya hareketlerini düzenle; tam vücut yeterliliği varsayılmadı."
                )
    program = {**baseline["program"], "name": data.name, "guided_choices": choices.model_dump()}
    return {
        "program": program,
        "notes": notes,
        "review": {
            "days": day_info,
            "muscle_sets": muscles,
            "missing_focus": missing,
            "meaning": "Katalog katsayılarıyla tahmini haftalık set dağılımı; büyüme veya hasar yüzdesi değil.",
            "duration_assumptions": "5 dk hazırlık + set başına 45 sn uygulama + hareket başına 60 sn geçiş + belirtilen dinlenmeler.",
            "version": "guided-strength-1",
            "health_context": baseline["health_context"],
            "input_revision": snapshot["cursor"],
        },
    }
