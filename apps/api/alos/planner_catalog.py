"""Explicit movement families and prerequisites for editable planning, not clinical rules."""

from .movements import BY_ID
from .running import RUNS

VERSION = "guided-sports-6"
# id, movement family, eligible methods, self-reported competency required, block
ROWS = [
    ("bodyweight-squat", "knee", "weights calisthenics", False, "main"),
    ("barbell-squat", "knee", "weights", True, "main"),
    ("dumbbell-goblet-squat", "knee", "weights", False, "main"),
    ("bodyweight-split-squat", "knee", "calisthenics weights", False, "main"),
    ("glute-bridge", "hinge", "weights calisthenics", False, "main"),
    ("dumbbell-rdl", "hinge", "weights", False, "main"),
    ("ez-bar-rdl", "hinge", "weights", False, "main"),
    ("barbell-deadlift", "hinge", "weights", True, "main"),
    ("incline-push-up", "horizontal_push", "calisthenics weights", False, "main"),
    ("push-up", "horizontal_push", "calisthenics weights", False, "main"),
    ("ring-push-up", "horizontal_push", "calisthenics gymnastics", True, "main"),
    ("barbell-bench-press", "horizontal_push", "weights", True, "main"),
    ("ring-row", "horizontal_pull", "calisthenics gymnastics weights", False, "main"),
    ("feet-elevated-ring-row", "horizontal_pull", "calisthenics gymnastics", True, "main"),
    ("ez-bar-row", "horizontal_pull", "weights", False, "main"),
    ("dumbbell-row", "horizontal_pull", "weights", False, "main"),
    ("barbell-row", "horizontal_pull", "weights", True, "main"),
    ("pull-up", "vertical_pull", "calisthenics weights", True, "main"),
    ("chin-up", "vertical_pull", "calisthenics weights", True, "main"),
    ("ring-pull-up", "vertical_pull", "calisthenics gymnastics", True, "main"),
    ("ring-chin-up", "vertical_pull", "calisthenics gymnastics", True, "main"),
    ("weighted-pull-up", "vertical_pull", "calisthenics weights", True, "main"),
    ("dumbbell-overhead-press", "vertical_push", "weights", False, "main"),
    ("ez-bar-overhead-press", "vertical_push", "weights", False, "main"),
    ("ring-dip", "vertical_push", "calisthenics gymnastics", True, "main"),
    ("weighted-ring-dip", "vertical_push", "calisthenics gymnastics weights", True, "main"),
    ("ez-bar-curl", "elbow_flexion", "weights", False, "accessory"),
    ("db-hammer-curl", "elbow_flexion", "weights", False, "accessory"),
    ("ring-biceps-curl", "elbow_flexion", "calisthenics gymnastics", True, "accessory"),
    ("ring-triceps-extension", "elbow_extension", "calisthenics gymnastics", True, "accessory"),
    ("ez-bar-triceps-extension", "elbow_extension", "weights", False, "accessory"),
    ("db-lateral-raise", "shoulder", "weights", False, "accessory"),
    ("ring-face-pull", "scapular", "calisthenics gymnastics weights", False, "accessory"),
    ("ring-rear-delt-row", "scapular", "calisthenics gymnastics", False, "accessory"),
    ("bodyweight-calf-raise", "calf", "calisthenics weights", False, "accessory"),
    ("ring-hamstring-curl", "knee_flexion", "calisthenics gymnastics", True, "accessory"),
    ("plank", "core", "weights calisthenics gymnastics", False, "accessory"),
    ("ring-rollout", "core", "calisthenics gymnastics", True, "accessory"),
    ("ring-body-saw", "core", "calisthenics gymnastics", True, "accessory"),
    ("dragon-flag", "core", "calisthenics gymnastics", True, "skill"),
    ("muscle-up", "skill_pull", "calisthenics gymnastics", True, "skill"),
    ("ring-muscle-up", "skill_pull", "calisthenics gymnastics", True, "skill"),
    ("front-lever", "skill_pull", "calisthenics gymnastics", True, "skill"),
    ("tuck-front-lever", "skill_pull", "calisthenics gymnastics", True, "skill"),
    ("ring-front-lever", "skill_pull", "calisthenics gymnastics", True, "skill"),
    ("ring-tuck-front-lever", "skill_pull", "calisthenics gymnastics", True, "skill"),
    ("front-lever-pull-raise", "skill_pull", "calisthenics gymnastics", True, "skill"),
    ("ring-support-hold", "skill_push", "gymnastics calisthenics", True, "skill"),
    ("ring-l-sit", "skill_core", "gymnastics calisthenics", True, "skill"),
    ("full-planche", "skill_push", "gymnastics calisthenics", True, "skill"),
    ("tuck-planche", "skill_push", "gymnastics calisthenics", True, "skill"),
    ("planche-lean", "skill_push", "gymnastics calisthenics", True, "skill"),
    ("walk", "conditioning", "conditioning", False, "conditioning"),
    ("zone-2-run", "conditioning", "conditioning running", True, "conditioning"),
]
for key in RUNS:
    if key != "zone-2-run":
        ROWS.append((key, "conditioning", "running", key != "run-walk", "conditioning"))

for stroke in ("freestyle", "backstroke", "breaststroke", "butterfly"):
    ROWS.append(("swim-" + stroke, "conditioning", "swimming", True, "conditioning"))
from .sport_training import DEFINITIONS as SPORT_DEFINITIONS

for d in SPORT_DEFINITIONS:
    method = d["method"]
    ROWS.append(
        (
            d["id"],
            method,
            method,
            method == "explosive_power",
            "power" if method == "explosive_power" else method,
        )
    )

META = {
    r[0]: {"family": r[1], "methods": r[2].split(), "competency_required": r[3], "block": r[4]} for r in ROWS
}
FAMILY_LABELS = {
    "sport_technique": "Branş tekniği",
    "sport_practice": "Branş uygulaması",
    "sport_tactics": "Taktik analiz",
    "explosive_power": "Patlayıcı güç",
    "knee": "Diz baskın / çömelme",
    "hinge": "Kalça baskın / kaldırma",
    "horizontal_push": "Yatay itiş",
    "horizontal_pull": "Yatay çekiş",
    "vertical_pull": "Dikey çekiş",
    "vertical_push": "Dikey itiş",
    "core": "Gövde",
    "elbow_flexion": "Kol bükme",
    "elbow_extension": "Kol açma",
    "shoulder": "Omuz",
    "scapular": "Kürek kemiği çevresi",
    "calf": "Baldır",
    "knee_flexion": "Arka bacak",
    "conditioning": "Kondisyon",
    "skill_pull": "Çekiş becerisi",
    "skill_push": "İtiş becerisi",
    "skill_core": "Gövde becerisi",
}


def options():
    return [
        {
            "movement_id": key,
            "name": BY_ID[key].get("displayNameTR", BY_ID[key]["name"]),
            "metric": "seconds" if BY_ID[key]["modality"] in ("isometric", "cardio", "circuit") else "reps",
            "family": value["family"],
            "equipment": BY_ID[key]["equipment"],
            "methods": value["methods"],
            "competency_required": value["competency_required"],
            "block": value["block"],
            "sport_id": BY_ID[key].get("sport_id"),
            "run_form": RUNS[key][1] if key in RUNS else None,
            "note": BY_ID[key].get("note", ""),
        }
        for key, value in META.items()
    ]
