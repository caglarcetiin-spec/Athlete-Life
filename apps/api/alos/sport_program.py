"""Branch-first drafts using canonical blocks; no implicit strength split or muscle claims."""

from .guided_planning import GROUPS, generate
from .movements import BY_ID
from .planner_catalog import FAMILY_LABELS, META, VERSION
from .sport_training import BRANCH_METHODS, PROFILES, days, experience_for, methods_for, rules, set_limit
from .sports import BY_SPORT


def generate_sport_program(data, baseline, choices, pool, excluded, allowed, snapshot, as_of):
    assignments = days(data)
    capacities = {c.movement_id: c for c in data.competencies}
    support = set(data.methods) - BRANCH_METHODS
    support_days = {}
    if support and allowed:
        support_data = data.model_copy(
            update={"methods": sorted(support), "split": "full_body", "sport_methods": {}}
        )
        support_result = generate(support_data, snapshot, as_of)
        support_days = {d["weekday"]: d["exercises"] for d in support_result["program"]["days"]}
    notes = [
        "199 branş için temel çalışma kataloğu vardır; hiçbir branşta tüm tekniklerin veya uzman müfredatının tamamlandığı iddia edilmez.",
        "Branş günleri seçtiğin branş sırasını izler. Kayıtlı blok süreleri ve çalışma sayıları takip edilir; bunlardan kas hasarı veya büyüme yüzdesi türetilmez.",
        "Teknik ve uygulama blokları eğitmenle düzenlenebilir başlangıç dozlarıdır. Her turdaki saniye çalışma süresidir; dinlenme ayrıca tutulur.",
    ]
    if not allowed:
        notes.extend(baseline["notes"])
    info, all_rows = [], []
    for day in baseline["program"]["days"]:
        day["exercises"] = []
        if day["kind"] != "training":
            continue
        sport = assignments[day["weekday"]]
        day["label"] = BY_SPORT[sport]["name"]
        selected, blocks, missing = [], [], []
        used = 300 if data.minutes < 30 else 480
        cap = set_limit(data, sport)
        level = experience_for(data, sport)

        def add(row, reason, selected=selected, blocks=blocks, cap=cap):
            nonlocal used
            cost = (
                row["sets"] * (row.get("seconds") or (row.get("reps") or 0) * 4)
                + (row["sets"] - 1) * (row.get("rest_seconds") or 0)
                + 60
            )
            if used + cost > data.minutes * 60 or sum(e["sets"] for e in selected) + row["sets"] > cap:
                return False
            selected.append(row)
            used += cost
            blocks.append(
                {
                    "movement_id": row["movement_id"],
                    "block": META[row["movement_id"]]["block"],
                    "family_label": FAMILY_LABELS[META[row["movement_id"]]["family"]],
                    "reason": reason,
                }
            )
            return True

        if allowed:
            branch_pool = [k for k in pool if BY_ID[k].get("sport_id") == sport]
            # At least one block of each selected branch method gets first chance at budget.
            queues = {
                m: [k for k in branch_pool if m in META[k]["methods"]]
                for m in sorted(methods_for(data, sport))
            }
            order = [q[0] for q in queues.values() if q]
            order += [k for q in queues.values() for k in q[1:]]
            for key in order:
                if len(selected) >= 5:
                    break
                d = BY_ID[key]
                rule = rules(key, capacities.get(key))
                seconds = min(
                    90
                    if d["method"] == "sport_technique"
                    else 120
                    if d["method"] == "sport_practice"
                    else 180,
                    rule["seconds"]["max"],
                )
                count = 1 if d["method"] == "sport_tactics" else 2 if level in ("new", "returning") else 3
                row = {
                    "movement_id": key,
                    "name": d["displayNameTR"],
                    "catalog_version": d["catalog_version"],
                    "modality": "circuit",
                    "load_kind": "none",
                    "equipment": "",
                    "sets": count,
                    "reps": None,
                    "seconds": seconds,
                    "rir": None,
                    "rest_seconds": 60,
                    "set_kind": "working",
                }
                add(row, "Seçili branş, çalışma yöntemi ve belirttiğin ortamla eşleşen süreli blok.")
            for row in support_days.get(day["weekday"], []):
                if len(selected) >= 8:
                    break
                add(row, "Branş gününe eklediğin destek çalışması; kalan süre içinde.")
            # Technique and power precede support strength/conditioning.
            selected.sort(
                key=lambda r: META[r["movement_id"]]["block"] not in ("sport_technique", "skill", "power")
            )
            blocks.sort(key=lambda b: b["block"] not in ("sport_technique", "skill", "power"))
            represented = {m for row in selected for m in META[row["movement_id"]]["methods"]}
            missing = [m for m in methods_for(data, sport) | support if m not in represented]
        else:
            missing = list(data.methods)
        for method in missing:
            notes.append(
                f"{day['label']}: {FAMILY_LABELS.get(method, method)} için uygun teknik, ortam veya süre yok. Seçimleri düzenle; eksik kapsam tamamlanmış plan değildir."
            )
        if not PROFILES[sport]["automatic_physical_dose"]:
            notes.append(
                day["label"]
                + ": fiziksel çalışma dozunu uzmanla manuel düzenle; otomatik kapsam teknik/taktik analizdir."
            )
        day["exercises"] = selected
        all_rows.extend(selected)
        info.append(
            {
                "weekday": day["weekday"],
                "sport_id": sport,
                "estimated_minutes": round(used / 60, 1),
                "working_sets": sum(r["sets"] for r in selected if r["modality"] == "strength"),
                "exercise_count": len(selected),
                "missing_patterns": missing,
                "blocks": blocks,
                "budget_minutes": data.minutes,
            }
        )
    return {
        "program": {**baseline["program"], "name": data.name, "guided_choices": choices.model_dump()},
        "notes": list(dict.fromkeys(notes)),
        "review": {
            "days": info,
            "muscle_sets": {
                g: round(
                    sum(
                        r["sets"]
                        * max(
                            (BY_ID[r["movement_id"]].get("muscles", {}).get(m, 0) for m in members), default=0
                        )
                        for r in all_rows
                        if r["modality"] == "strength"
                    ),
                    1,
                )
                for g, members in GROUPS.items()
            },
            "missing_focus": [],
            "version": VERSION,
            "excluded": excluded,
            "selected_methods": data.methods,
            "input_revision": snapshot["cursor"],
            "health_context": baseline["health_context"],
            "health_blocked": not allowed,
            "eligibility_reasons": baseline["automatic_eligibility"]["reasons"],
            "meaning": "Branş tekniği süre ve tur olarak; kuvvet ayrı set olarak takip edilir. Haritasız tekniklerin kas etkisi UNKNOWN.",
            "duration_assumptions": "5–8 dk hazırlık + tur başına çalışma + turlar arası dinlenme + blok başına 60 sn geçiş. Bu süreler eğitmenle düzenlenebilir.",
            "skill_sets": sum(r["sets"] for r in all_rows if r["modality"] == "skill"),
            "isometric_seconds": sum(
                r["sets"] * (r.get("seconds") or 0) for r in all_rows if r["modality"] == "isometric"
            ),
            "conditioning_seconds": sum(
                r["sets"] * (r.get("seconds") or 0) for r in all_rows if r["modality"] == "cardio"
            ),
            "status": "needs_review" if any(d["missing_patterns"] for d in info) or not all_rows else "draft",
        },
    }
