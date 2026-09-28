"""Explicit branch foundations, not an exhaustive or clinically validated curriculum.

Stable identities preserve branch/technique lineage. No muscle coefficients are inferred
from a technique label. Dose limits below are editable product guardrails, not sport norms.
"""

import json
from pathlib import Path

from .sports import BY_SPORT

CATALOG = json.loads((Path(__file__).parent / "catalogs/sport_training.json").read_text())
VERSION = CATALOG["version"]
PROFILES = CATALOG["profiles"]
BRANCH_METHODS = {"sport_technique", "sport_practice", "sport_tactics"}
METHODS = [
    {
        "id": "sport_technique",
        "label": "Branş tekniği",
        "description": "Seçtiğin branşın temel tekniklerini kısa çalışma bloklarıyla geliştir.",
    },
    {
        "id": "sport_practice",
        "label": "Uygulama / raunt / saha çalışması",
        "description": "Branşa uygun uygulama; gereken ortam, eğitmen ve partneri ayrıca belirt.",
    },
    {
        "id": "sport_tactics",
        "label": "Taktik ve teknik analiz",
        "description": "Pozisyon, rutin, maç veya parkur analizi. Fiziksel antrenman dozu sayılmaz.",
    },
    {
        "id": "explosive_power",
        "label": "Patlayıcı güç",
        "description": "Bildiğin sıçrama ve sağlık topu hareketleri; az tekrar ve uzun dinlenme.",
    },
]


NATIVE_METHODS = {
    "strength": "weights",
    "bodybuilding": "weights",
    "powerlifting": "weights",
    "calisthenics": "calisthenics",
    "running": "running",
    "trail-running": "running",
    "track-running": "running",
    "swimming": "swimming",
}


def methods_for(data, sport):
    mapping = getattr(data, "sport_methods", {})
    return set(mapping[sport]) if sport in mapping else BRANCH_METHODS & set(data.methods)


def active_sports(data):
    return [s for s in data.sport_ids if methods_for(data, s)]


def method_options(sport):
    p, name = PROFILES[sport], BY_SPORT[sport]["name"]
    return [
        {
            "id": "sport_technique",
            "label": name + " · Teknik çalışma",
            "description": ", ".join(t["name"] for t in p["techniques"][:4]),
            "automatic": p["automatic_physical_dose"],
        },
        {
            "id": "sport_practice",
            "label": name
            + " · "
            + ("Uygulama" if p["practice_label"] == "Branşa özgü uygulama bloğu" else p["practice_label"]),
            "description": p["environment"]
            + ". Uygunluk, eğitmen ve partner bilgilerini sonraki adımda belirt.",
            "automatic": p["automatic_physical_dose"],
        },
        {
            "id": "sport_tactics",
            "label": name + " · Teknik / taktik analiz",
            "description": "Branşa ait teknik, rutin, parkur veya kararların analizi; fiziksel yük sayılmaz.",
            "automatic": True,
        },
    ]


def sport_mode(data):
    return bool(set(data.methods) & BRANCH_METHODS)


def definition(sport, key, name, method, partner=False):
    profile = PROFILES[sport]
    return {
        "id": f"sport-{sport}-{key}",
        "name": BY_SPORT[sport]["name"] + " · " + name,
        "displayNameTR": BY_SPORT[sport]["name"] + " · " + name,
        "aliases": [],
        "catalog_version": VERSION,
        "sport_id": sport,
        "type": "SPORT_PRACTICE",
        "modality": "circuit",
        "metric": "seconds",
        "load_kind": "none",
        "equipment": [],
        "muscles": {},
        "method": method,
        "partner_required": partner,
        "physical": method != "sport_tactics" and BY_SPORT[sport]["family"] != "mind",
        "note": "Temel çalışma başlığı; teknik öğretim görseli veya eksiksiz müfredat değildir. Doz kişisel eğitmenle düzenlenir. Kas etkisi UNKNOWN.",
        "source_urls": profile["source_urls"],
        "evidenceConfidence": "unknown",
    }


DEFINITIONS = []
for sport, profile in PROFILES.items():
    for technique in profile["techniques"]:
        DEFINITIONS.append(definition(sport, technique["key"], technique["name"], "sport_technique"))
    DEFINITIONS.append(
        definition(
            sport,
            "practice",
            profile["practice_label"],
            "sport_practice",
            BY_SPORT[sport]["family"] in {"combat", "racket", "team"},
        )
    )
    DEFINITIONS.append(definition(sport, "analysis", "Teknik / taktik analiz", "sport_tactics"))

POWER = [
    ("countermovement-jump", "Kontrollü dikey sıçrama", ["Outdoor"]),
    ("medicine-ball-chest-throw", "Sağlık topuyla göğüs atışı", ["Medicine Ball", "Outdoor"]),
    ("medicine-ball-rotational-throw", "Sağlık topuyla rotasyon atışı", ["Medicine Ball", "Outdoor"]),
]
for key, name, equipment in POWER:
    DEFINITIONS.append(
        {
            "id": key,
            "name": name,
            "displayNameTR": name,
            "aliases": [],
            "catalog_version": VERSION,
            "type": "POWER",
            "modality": "skill",
            "metric": "reps",
            "load_kind": "none",
            "equipment": equipment,
            "muscles": {},
            "method": "explosive_power",
            "note": "Teknik kalite öncelikli, düzenlenebilir çalışma. Güç ölçer verisi olmadan watt veya güç kazanımı hesaplanmaz.",
            "evidenceConfidence": "unknown",
        }
    )
BY_ID = {d["id"]: d for d in DEFINITIONS}


def coverage():
    return [
        {
            **p,
            "name": BY_SPORT[s]["name"],
            "movement_count": len(p["techniques"]) + 2,
            "method_options": method_options(s),
            "native_method": NATIVE_METHODS.get(s),
        }
        for s, p in PROFILES.items()
    ]


def exclusion(data, key):
    d = BY_ID.get(key)
    if not d or not d.get("sport_id"):
        return None
    sport = d["sport_id"]
    if sport not in data.sport_ids:
        return "Bu teknik seçili branşa ait değil"
    if d["method"] not in methods_for(data, sport):
        return "Bu branş için çalışma yöntemi seçilmedi"
    if not d["physical"]:
        return None
    readiness = next((r for r in data.sport_readiness if r.sport_id == sport), None)
    if not PROFILES[sport]["automatic_physical_dose"]:
        return "Bu branşta fiziksel doz eğitmenle manuel hazırlanır; taktik analiz seçilebilir"
    if not readiness or not readiness.environment_ready:
        return "Branşa uygun ortam ve ekipmanı belirt"
    if not readiness.coach_present and (
        experience_for(data, sport) not in ("regular", "advanced")
        or (d["method"] == "sport_practice" and BY_SPORT[sport]["family"] == "combat")
    ):
        return "Branş teknik uygulaması için eğitmen eşliği belirtilmedi"
    if (
        d["partner_required"]
        or (
            BY_SPORT[sport]["family"] == "combat"
            and d["method"] == "sport_technique"
            and sport
            in {"wrestling", "bjj", "ju-jitsu", "judo", "sambo", "mma", "aikido", "sumo", "arm-wrestling"}
        )
    ) and not readiness.partner_available:
        return "Bu uygulama için partner veya takım belirtilmedi"
    if not any(c.movement_id == key for c in data.competencies) and d["method"] == "sport_technique":
        return "Bu tekniği eğitmenle çalışmaya uygun olduğunu belirtmedin"
    return None


def days(data):
    # Explicit one-branch-per-day schedule. User can select the order in the form.
    sports = active_sports(data)
    return {day: sports[i % len(sports)] for i, day in enumerate(sorted(data.weekdays))}


def rules(key, capacity=None):
    d = BY_ID[key]
    if d.get("type") == "POWER":
        maximum = min(5, max(1, int(capacity.reps * 0.7))) if capacity and capacity.reps else 5
        return {
            "modality": "skill",
            "reps": {"min": 1, "max": maximum},
            "seconds": None,
            "rir": None,
            "rest_min": 120,
            "sets_max": 3,
        }
    cap = min(300, max(1, int(capacity.seconds * 0.7))) if capacity and capacity.seconds else 300
    return {
        "modality": "circuit",
        "reps": None,
        "seconds": {"min": 1, "max": cap},
        "rir": None,
        "rest_min": 30,
        "sets_max": 3,
    }


def experience_for(data, sport):
    return next((s.level for s in data.sport_experience if s.sport_id == sport and s.level), "new")


def set_limit(data, sport):
    return {"new": 12, "returning": 12, "regular": 20, "advanced": 24}[experience_for(data, sport)]
