"""Shared sport identities for the profile and the planning questionnaire."""

import json
from pathlib import Path

SPORTS = json.loads((Path(__file__).parent / "catalogs/sports.json").read_text())["sports"]
BY_SPORT = {s["id"]: s for s in SPORTS}
ENDURANCE_METHODS = {"conditioning", "running", "swimming"}

CATEGORIES = {
    "strength": "Fitness ve kuvvet",
    "gymnastics": "Jimnastik, kalistenik ve hareket",
    "endurance": "Atletizm ve dayanıklılık",
    "water": "Yüzme ve su sporları",
    "combat": "Dövüş sporları",
    "team": "Takım sporları",
    "racket": "Raket sporları",
    "winter": "Kış sporları",
    "outdoor": "Doğa ve macera",
    "wheels": "Bisiklet ve tekerlekli sporlar",
    "equestrian": "Binicilik",
    "precision": "Hedef ve hassasiyet sporları",
    "traditional": "Geleneksel sporlar",
    "mind": "Zihin sporları",
    "adaptive": "Uyarlanmış ve para sporları",
}


def categorized_sports():
    result = []
    for sport in SPORTS:
        category = "gymnastics" if sport["id"] == "calisthenics" else sport["family"]
        if "cycling" in sport["id"] or sport["id"] in {"mountain-bike", "bmx"}:
            category = "wheels"
        result.append({**sport, "category": category, "category_label": CATEGORIES[category]})
    return result
