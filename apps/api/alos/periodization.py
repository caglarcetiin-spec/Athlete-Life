"""Explicit, user-approved phase scaffold. Never a physiological prediction.

Only strength working sets receive RIR/volume phases. Other modalities keep
validated prescriptions. Real performance must be reviewed before adding load.
"""

import math
from copy import deepcopy

VERSION = "periodization-draft-1"


def policy(data):
    phases = []
    if data.progression_mode == "phased":
        for start in range(1, data.weeks + 1, 4):
            phases.extend(
                [
                    {
                        "first_week": start,
                        "last_week": start,
                        "label": "Uyum",
                        "rir": min(5, data.target_rir + 1),
                        "set_factor": 1.0,
                    },
                    {
                        "first_week": start + 1,
                        "last_week": min(start + 2, data.weeks),
                        "label": "Gelişim",
                        "rir": data.target_rir,
                        "set_factor": 1.0,
                    },
                    {
                        "first_week": start + 3,
                        "last_week": min(start + 3, data.weeks),
                        "label": "Hafif hafta",
                        "rir": min(5, data.target_rir + 1),
                        "set_factor": 0.7,
                    },
                ]
            )
    return {
        "version": VERSION,
        "mode": data.progression_mode,
        "target_rir": data.target_rir,
        "phases": phases,
        "scope": "Strength working sets only. Keep skill, isometric, cardio and branch-technique doses unchanged. No inferred kg or automatic increases.",
        "progression_rule": "Review two completed comparable sessions. Only when all target reps and RIR are maintained, consider a manual repetition or load increase in a new approved program version. Do not increase load and volume together. Missing RIR, pain or illness requires review, never assumed readiness.",
        "goal": data.goal,
    }


def apply(program, data):
    """Materialize bounded phases into existing week-scoped program days."""
    rules = policy(data)
    if data.progression_mode != "phased":
        return program, []
    eligible = any(
        e.get("modality") == "strength" and e.get("rir") is not None
        for d in program["days"]
        for e in d["exercises"]
    )
    if not eligible:
        return program, [
            "Bu taslakta kuvvet çalışma seti yok. RIR ve kuvvet yük artışı diğer branşlara uygulanmadı; branşa özgü ilerleme manuel değerlendirilir."
        ]
    result = deepcopy(program)
    result["days"] = []
    for phase in rules["phases"]:
        for day in program["days"]:
            clone = deepcopy(day)
            clone.update(first_week=phase["first_week"], last_week=phase["last_week"])
            clone["label"] = f"{phase['label']} · {day['label']}"[:120]
            for e in clone["exercises"]:
                if e.get("modality") == "strength" and e.get("rir") is not None:
                    e["rir"] = phase["rir"]
                    e["sets"] = max(1, math.floor(e["sets"] * phase["set_factor"]))
            result["days"].append(clone)
    return result, [
        "Dönem şablonu uygulandı: her dört haftada uyum, iki gelişim haftası ve hafif hafta. Bu kullanıcı onayına sunulan planlama varsayımıdır.",
        f"Kuvvet çalışma setlerinde gelişim haftası RIR {data.target_rir}; uyum/hafif hafta RIR {min(5, data.target_rir + 1)}. Hafif haftada setler yaklaşık %30 azaltılır (aşağı yuvarlanır, en az bir set).",
        "İlerleme koşulu: aynı hareket/yükte iki tamamlanmış seansta hedef tekrarlar ve RIR korunursa tekrar veya ağırlık artışını incele. Program ağırlığı kendiliğinden artırmaz; yeni plan sürümünü onaylarsın.",
        "Teknik, tutuş ve dayanıklılık dozları aynen korunur. Sonraki dört haftada daha yüksek kg varsayılmaz; gerçek kayıtlarına göre planı yeniden değerlendir.",
    ]
