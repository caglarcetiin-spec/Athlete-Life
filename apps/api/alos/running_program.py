"""Time-based running week using the same canonical rows as execution and AI validation."""

from .guided_planning import GROUPS
from .movements import BY_ID
from .planner_catalog import VERSION
from .running import RUNS, allowed_on_day, demanding_day, level, rules


def generate_running_program(data, baseline, choices, pool, excluded, allowed, snapshot):
    capacities = {c.movement_id: c for c in data.competencies}
    candidates = [key for key in pool if key in RUNS]
    notes = [
        "Koşu günleri; kolay çalışma, seçtiğin koşu türleri ve süre bütçene göre düzenlenir. Kas bölgesi puanları koşu önceliği yerine kullanılmaz.",
        "Tempo ve mesafe hedeflerin tercih olarak kullanılır; hız, nabız bölgesi veya VO2max ölçümü yapılmaz. Yoğun çalışma haftada en fazla bir güne ayrılır.",
        "Süre ve tur sayıları düzenlenebilir başlangıç varsayımlarıdır. Aralıklardaki dinlenme rahat yürüyüş olabilir; çalışma süresinden ayrı kaydedilir.",
    ]
    day_info = []
    weekdays = sorted(data.weekdays)
    known_week = data.running_profile.weekly_minutes if data.running_profile else None
    work_cap = int(known_week * 60 / len(weekdays)) if known_week and known_week > 0 else None
    for day in baseline["program"]["days"]:
        day["exercises"] = []
        if day["kind"] != "training":
            continue
        day["label"] = "Kolay koşu / yürüyüş"
        eligible = [k for k in candidates if allowed_on_day(data, k, day["weekday"])]
        hard = [k for k in eligible if RUNS[k][2]]
        easy = [k for k in eligible if not RUNS[k][2]]
        preferred = []
        if day["weekday"] == demanding_day(data) and hard:
            preferred = (
                ["hill-repeats", "hill-sprint"]
                if "hills" in data.performance_focus
                else ["running-strides", "intervals", "fartlek-run"]
                if "speed" in data.performance_focus
                else ["tempo-run", "threshold-run", "intervals"]
            ) + hard
            day["label"] = "Koşu kalite günü"
        elif day["weekday"] == weekdays[-1] and "distance" in data.performance_focus and "long-run" in easy:
            preferred = ["long-run"]
            day["label"] = "Uzun ve rahat koşu"
        else:
            preferred = ["zone-2-run", "steady-run", "trail-easy-run", "recovery-run", "run-walk"]
        key = next((k for k in preferred if k in eligible), None)
        if key is None and easy:
            key = easy[0]
        preparation = 480 if data.minutes >= 30 else 300
        used = preparation
        blocks = []
        if allowed and key:
            rule = rules(data, key, capacities.get(key))
            continuous = RUNS[key][1] == "continuous"
            sets = 1 if continuous else 3 if level(data) in {"new", "returning"} else 5
            seconds = min(
                rule["seconds"]["max"],
                (1200 if level(data) in {"regular", "advanced"} else 600) if continuous else 60,
            )
            if work_cap:
                seconds = min(seconds, max(1, work_cap // sets))
            rest = rule["rest_min"]
            limit = data.minutes * 60 - preparation - 60
            while sets > 1 and sets * seconds + (sets - 1) * rest > limit:
                sets -= 1
            seconds = min(seconds, max(1, (limit - (sets - 1) * rest) // sets))
            definition = BY_ID[key]
            day["exercises"] = [
                {
                    "movement_id": key,
                    "name": definition.get("displayNameTR", definition["name"]),
                    "catalog_version": definition["catalog_version"],
                    "modality": "cardio",
                    "load_kind": "none",
                    "equipment": ", ".join(data.equipment[:3]),
                    "sets": sets,
                    "seconds": seconds,
                    "reps": None,
                    "rir": None,
                    "rest_seconds": rest,
                    "set_kind": "working",
                }
            ]
            used += sets * seconds + (sets - 1) * rest + 60
            blocks = [
                {
                    "movement_id": key,
                    "block": "conditioning",
                    "family_label": "Koşu çalışması",
                    "reason": "Koşu türü, gün dağılımı, bildirdiğin kapasite ve ortam seçimi.",
                }
            ]
        missing = (
            []
            if day["exercises"]
            else ["Uygun koşu ortamı veya çalışma seçimi eksik" if allowed else "Yaş/sağlık kontrolü"]
        )
        day_info.append(
            {
                "weekday": day["weekday"],
                "estimated_minutes": round(used / 60, 1),
                "working_sets": 0,
                "missing_patterns": missing,
                "blocks": blocks,
                "exercise_count": len(day["exercises"]),
            }
        )
    if not allowed:
        notes.extend(baseline["automatic_eligibility"]["reasons"])
    if work_cap:
        notes.append(
            "Bildirilen haftalık koşu süresi otomatik artırılmadı; günlere paylaştırılarak üst sınır olarak kullanıldı."
        )
    planned = [e for d in baseline["program"]["days"] for e in d["exercises"]]
    return {
        "program": {**baseline["program"], "name": data.name, "guided_choices": choices.model_dump()},
        "notes": notes,
        "review": {
            "days": day_info,
            "muscle_sets": {k: 0 for k in GROUPS},
            "missing_focus": [],
            "version": VERSION,
            "excluded": excluded,
            "selected_methods": data.methods,
            "input_revision": snapshot["cursor"],
            "health_context": baseline["health_context"],
            "health_blocked": not allowed,
            "eligibility_reasons": baseline["automatic_eligibility"]["reasons"],
            "meaning": "Koşu çalışma süresi ve tamamlanan aralıklar; hipertrofi seti veya ölçülmüş kas gelişimi değildir.",
            "duration_assumptions": "5–8 dakika hazırlık + tur × çalışma süresi + turlar arası dinlenme + 60 saniye geçiş.",
            "skill_sets": 0,
            "isometric_seconds": 0,
            "conditioning_seconds": sum(e["sets"] * e["seconds"] for e in planned),
            "status": "needs_review" if any(d["missing_patterns"] for d in day_info) else "draft",
        },
    }
