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


class Competency(StrictModel):
    movement_id: str
    reps: int | None = Field(default=None, ge=1, le=100)
    seconds: float | None = Field(default=None, gt=0, le=600)

    @model_validator(mode="after")
    def metric_matches(self):
        from .planner_catalog import META

        if self.movement_id not in META:
            raise ValueError("Yetkinlik için katalogdan hareket seç.")
        metric = "seconds" if BY_ID[self.movement_id]["modality"] in ("isometric", "cardio") else "reps"
        if metric == "seconds" and self.reps is not None or metric != "seconds" and self.seconds is not None:
            raise ValueError("Tutuş saniyesi ile tekrar sayısını karıştırma.")
        return self


class GuidedChoices(StrictModel):
    experience: Literal["new", "returning", "regular", "advanced"]
    objective: Literal["strength", "hypertrophy", "strength_hypertrophy"]
    equipment: list[str] = Field(max_length=50)
    weekdays: list[int] = Field(min_length=1, max_length=6)
    minutes: int = Field(ge=15, le=180)
    split: Literal["full_body", "upper_lower", "push_pull_legs"]
    focus: dict[str, int] = Field(default_factory=dict)
    goal: str = Field(min_length=1, max_length=1000)
    methods: list[Literal["weights", "calisthenics", "gymnastics", "conditioning"]] = Field(
        default_factory=lambda: ["weights"], min_length=1, max_length=4
    )
    competencies: list[Competency] = Field(default_factory=list, max_length=54)
    conditioning_minutes: int = Field(default=10, ge=5, le=45)

    @model_validator(mode="after")
    def validate_choices(self):
        if len(set(self.weekdays)) != len(self.weekdays) or any(d not in range(7) for d in self.weekdays):
            raise ValueError("Günler tekil ve 0–6 aralığında olmalı.")
        if (
            any(k not in GROUPS or type(v) is not int or v < 0 or v > 5 for k, v in self.focus.items())
            or sum(self.focus.values()) > 5
        ):
            raise ValueError("En fazla beş öncelik puanı dağıtabilirsin.")
        if len(self.methods) != len(set(self.methods)) or len(
            {c.movement_id for c in self.competencies}
        ) != len(self.competencies):
            raise ValueError("Yöntem ve yetkinlikler tekil olmalı.")
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
    from .planner_catalog import FAMILY_LABELS, META, VERSION

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
    allowed = any(d["exercises"] for d in baseline["program"]["days"])
    available = {normalize(e) for e in data.equipment} | {"floor", "bodyweight"}
    profiles = [p for p in snapshot.get("profiles", []) if not p.get("deleted_at")]
    dislikes = (
        (profiles[0].get("planning_preferences") or {}).get("disliked_movements", []) if profiles else []
    )
    competencies = {c.movement_id: c for c in data.competencies}
    excluded = []
    pool = []
    for key, meta in META.items():
        reason = (
            "Tercihlerin dışında"
            if key in dislikes
            else "Seçilen yöntemlere ait değil"
            if not set(meta["methods"]) & set(data.methods)
            else "Gerekli ekipman seçilmedi"
            if not equipment_matches(BY_ID[key], available)
            else "Kontrollü yapabildiğini belirtmedin"
            if meta["competency_required"] and key not in competencies
            else None
        )
        if reason:
            excluded.append({"movement_id": key, "reason": reason})
        else:
            pool.append(key)
    notes = [
        "Taslak; seçtiğin yöntemler, kontrollü yapabildiğin hareketler, ekipman ve süre birlikte değerlendirilerek üretildi.",
        "Kilogram otomatik belirlenmez. Set/tekrar/tutuş süreleri düzenlenebilir koçluk varsayımlarıdır; kişisel gelişim veya klinik uygunluk garantisi değildir.",
        "Beceri bloğu teknik kalite içindir; tutuş süreleri ve kondisyon saniyeleri hipertrofi setleriyle aynı doz sayılmaz.",
    ]
    if not allowed:
        notes = baseline["notes"] + ["Sağlık/yaş bağlamı nedeniyle otomatik hareket dozu üretilmedi."]
    week_counts = {}
    day_info = []
    all_planned = []
    training_days = sorted(data.weekdays)

    def family(key):
        return META[key]["family"]

    def label(key):
        return BY_ID[key].get("displayNameTR", LABELS.get(key, BY_ID[key]["name"]))

    def rank(key):
        definition = BY_ID[key]
        priority = sum(
            data.focus.get(g, 0) * max((definition.get("muscles", {}).get(m, 0) for m in members), default=0)
            for g, members in GROUPS.items()
        )
        skill_fit = 4 if key in competencies else 0
        equipment_fit = (
            2 if definition["load_kind"] == "external" and data.experience in ("regular", "advanced") else 0
        )
        return (
            -(skill_fit + equipment_fit + priority * 0.6 - week_counts.get(key, 0) * 1.5),
            list(META).index(key),
        )

    for day in baseline["program"]["days"]:
        day["exercises"] = []
        if day["kind"] != "training" or not allowed:
            continue
        index = training_days.index(day["weekday"])
        kind = (
            "full_body"
            if data.split == "full_body"
            else (
                ["upper", "lower"][index % 2]
                if data.split == "upper_lower"
                else ["push", "pull", "legs"][index % 3]
            )
        )
        families = {
            "full_body": [
                "knee",
                "hinge",
                "horizontal_push",
                "horizontal_pull",
                "vertical_pull",
                "vertical_push",
                "core",
            ],
            "upper": ["horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull"],
            "lower": ["knee", "hinge", "knee_flexion", "core", "calf"],
            "push": ["horizontal_push", "vertical_push", "elbow_extension", "shoulder"],
            "pull": ["horizontal_pull", "vertical_pull", "elbow_flexion", "scapular"],
            "legs": ["knee", "hinge", "knee_flexion", "core", "calf"],
        }[kind]
        extras = {
            "full_body": ["elbow_flexion", "elbow_extension", "shoulder", "scapular", "calf"],
            "upper": ["elbow_flexion", "elbow_extension", "shoulder", "scapular", "core"],
            "lower": [],
            "push": ["core"],
            "pull": ["core"],
            "legs": [],
        }[kind]
        expected = families[:4] if kind in ("full_body", "upper") else families[:2]
        if set(data.methods) == {"conditioning"}:
            families, extras, expected = [], [], []
        limit = data.minutes * 60
        used = 480 if data.minutes >= 30 else 300
        max_sets = {"new": 12, "returning": 12, "regular": 20, "advanced": 24}[data.experience]
        count = 2 if data.experience in ("new", "returning") else 3
        selected = []
        decisions = []
        selected_sets = 0
        cardio = next((key for key in sorted(pool, key=rank) if META[key]["block"] == "conditioning"), None)
        reserve = (data.conditioning_minutes * 60 + 60) if cardio and "conditioning" in data.methods else 0
        # Conditioning cannot consume a whole mixed session silently.
        if reserve > limit * 0.35 and len(data.methods) > 1:
            notes.append(
                f"{day['weekday'] + 1}. gün: kondisyon isteği toplam sürenin büyük kısmını kaplıyor; süreyi artır veya kondisyonu ayrı güne ayır."
            )
            reserve = 0
        strength_limit = limit - reserve

        def prescribe(key, count=count):
            definition = BY_ID[key]
            block = META[key]["block"]
            ability = competencies.get(key)
            reps = 6 if data.objective == "strength" else 10 if data.objective == "hypertrophy" else 8
            if data.experience in ("new", "returning"):
                reps = 8
            seconds = None
            sets = count
            rest = 150 if block == "main" else 90
            if data.objective == "strength" and block == "main":
                rest = 180
            if block == "skill":
                sets = 2
                reps = 3
                rest = 120
            if definition["modality"] == "isometric":
                reps = None
                seconds = 8 if block == "skill" else 20
                if ability and ability.seconds:
                    seconds = max(1, min(seconds, int(ability.seconds * 0.6)))
            elif ability and ability.reps:
                reps = max(1, min(reps, int(ability.reps * 0.7)))
            execution = seconds if seconds is not None else reps * 4
            cost = sets * execution + (sets - 1) * rest + 60
            return {
                "movement_id": key,
                "name": label(key),
                "catalog_version": definition["catalog_version"],
                "modality": "skill"
                if block == "skill" and definition["modality"] != "isometric"
                else definition["modality"],
                "equipment": ", ".join(definition["equipment"]),
                "load_kind": definition["load_kind"],
                "variant": "standard",
                "sets": sets,
                "reps": reps,
                "seconds": seconds,
                "rir": None if definition["modality"] == "isometric" or block == "skill" else 3,
                "rest_seconds": rest,
                "set_kind": "working",
            }, cost

        def add(key, cap, max_sets=max_sets, selected=selected, decisions=decisions):
            nonlocal used, selected_sets
            exercise, cost = prescribe(key)
            if used + cost > cap or selected_sets + exercise["sets"] > max_sets:
                return False
            selected.append(exercise)
            used += cost
            selected_sets += exercise["sets"]
            week_counts[key] = week_counts.get(key, 0) + 1
            decisions.append(
                {
                    "movement_id": key,
                    "block": META[key]["block"],
                    "family": family(key),
                    "family_label": FAMILY_LABELS[family(key)],
                    "reason": ("Kontrollü yapabildiğin hareket; " if key in competencies else "")
                    + "ekipman ve yöntem uyumu; "
                    + FAMILY_LABELS[family(key)]
                    + " kapsamı",
                    "estimated_minutes": round(cost / 60, 1),
                }
            )
            return True

        # Technical practice gets a bounded first block, never displaces all main patterns.
        skill_families = {"skill_pull", "skill_push", "skill_core", "core"}
        if kind == "push":
            skill_families = {"skill_push", "skill_core"}
        elif kind == "pull":
            skill_families = {"skill_pull", "skill_core"}
        elif kind in ("lower", "legs"):
            skill_families = set()
        skill_budget = min(strength_limit * 0.2, 900)
        skill_start = used
        for key in sorted(pool, key=rank):
            if (
                META[key]["block"] == "skill"
                and family(key) in skill_families
                and len([e for e in selected if META[e["movement_id"]]["block"] == "skill"]) < 2
            ):
                add(key, min(strength_limit, skill_start + skill_budget))
        missing_families = []
        for fam in families:
            candidates = [
                key
                for key in pool
                if family(key) == fam and META[key]["block"] not in ("skill", "conditioning")
            ]
            candidates.sort(key=rank)
            if not any(add(key, strength_limit) for key in candidates) and fam in expected:
                missing_families.append(FAMILY_LABELS[fam])
        for fam in sorted(
            extras, key=lambda f: min((rank(k) for k in pool if family(k) == f), default=(999, 0))
        ):
            candidates = sorted((k for k in pool if family(k) == fam), key=rank)
            if candidates:
                add(candidates[0], strength_limit)
        if reserve:
            definition = BY_ID[cardio]
            selected.append(
                {
                    "movement_id": cardio,
                    "name": label(cardio),
                    "catalog_version": definition["catalog_version"],
                    "modality": "cardio",
                    "load_kind": "none",
                    "equipment": ", ".join(e for e in definition["equipment"] if normalize(e) in available),
                    "sets": 1,
                    "seconds": data.conditioning_minutes * 60,
                    "rest_seconds": 0,
                    "set_kind": "working",
                }
            )
            used += reserve
            decisions.append(
                {
                    "movement_id": cardio,
                    "block": "conditioning",
                    "family": "conditioning",
                    "family_label": "Kondisyon",
                    "reason": "Seçtiğin kondisyon süresi; nabız bölgesi veya enerji tüketimi hesaplanmadı.",
                    "estimated_minutes": round(reserve / 60, 1),
                }
            )
        if not selected or missing_families:
            notes.append(
                f"{day['weekday'] + 1}. gün eksik kapsam: "
                + (", ".join(missing_families) or "uygun hareket yok")
                + ". Süre/ekipman/yetkinlik seçimini düzenle; eksik gün tam program sayılmaz."
            )
        day["exercises"] = selected
        day["label"] = (
            "Kondisyon"
            if set(data.methods) == {"conditioning"}
            else {
                "full_body": "Tüm vücut",
                "upper": "Üst vücut",
                "lower": "Alt vücut",
                "push": "İtiş",
                "pull": "Çekiş",
                "legs": "Bacak",
            }[kind]
        )
        all_planned.extend(selected)
        day_info.append(
            {
                "weekday": day["weekday"],
                "estimated_minutes": round(used / 60, 1),
                "exercise_count": len(selected),
                "working_sets": sum(
                    e["sets"]
                    for e in selected
                    if e["modality"] == "strength" and META[e["movement_id"]]["block"] != "skill"
                ),
                "missing_patterns": missing_families,
                "blocks": decisions,
                "budget_minutes": data.minutes,
            }
        )
    muscles = {
        g: round(
            sum(
                e["sets"]
                * max((BY_ID[e["movement_id"]].get("muscles", {}).get(m, 0) for m in members), default=0)
                for e in all_planned
                if e["modality"] == "strength" and META[e["movement_id"]]["block"] != "skill"
            ),
            1,
        )
        for g, members in GROUPS.items()
    }
    missing_focus = [
        g
        for g, points in data.focus.items()
        if points
        and not any(
            e["modality"] == "strength"
            and META[e["movement_id"]]["block"] != "skill"
            and max((BY_ID[e["movement_id"]].get("muscles", {}).get(m, 0) for m in GROUPS[g]), default=0)
            >= 0.5
            for e in all_planned
        )
    ]
    if missing_focus:
        notes.append(
            "Öncelik verdiğin bazı bölgeler kuvvet bloğunda karşılanamadı: " + ", ".join(missing_focus)
        )
    represented = {method for e in all_planned for method in META[e["movement_id"]]["methods"]} & set(
        data.methods
    )
    if set(data.methods) - represented:
        notes.append("Taslakta karşılanamayan yöntem: " + ", ".join(sorted(set(data.methods) - represented)))
    if len(training_days) == 3 and data.split == "upper_lower":
        notes.append(
            "Bu haftalık döngüde iki üst, bir alt gün var. Eşit sıklık için tüm vücut veya dört gün seçebilirsin."
        )
    return {
        "program": {**baseline["program"], "name": data.name, "guided_choices": choices.model_dump()},
        "notes": list(dict.fromkeys(notes)),
        "review": {
            "days": day_info,
            "muscle_sets": muscles,
            "missing_focus": missing_focus,
            "version": VERSION,
            "excluded": excluded,
            "selected_methods": data.methods,
            "input_revision": snapshot["cursor"],
            "health_context": baseline["health_context"],
            "meaning": "Haftalık kuvvet setlerinin katalog katsayılarıyla dağılımı. Teknik tutuş ve kondisyon bu toplama katılmaz; büyüme/hasar ölçümü değildir.",
            "duration_assumptions": "5–8 dk hazırlık + tekrar başına 4 sn veya hedef tutuş süresi + belirtilen dinlenmeler + hareket başına 60 sn geçiş. Gerçek süre değişebilir.",
            "skill_sets": sum(e["sets"] for e in all_planned if META[e["movement_id"]]["block"] == "skill"),
            "isometric_seconds": sum(
                e["sets"] * (e.get("seconds") or 0) for e in all_planned if e["modality"] == "isometric"
            ),
            "conditioning_seconds": sum(
                e.get("seconds") or 0 for e in all_planned if e["modality"] == "cardio"
            ),
            "status": "needs_review"
            if any(d["missing_patterns"] for d in day_info)
            or missing_focus
            or not all_planned
            or set(data.methods) - represented
            else "draft",
        },
    }
