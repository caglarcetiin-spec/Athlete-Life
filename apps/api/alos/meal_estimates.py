"""User-selected reference portions. No provider-generated nutrient values."""

from typing import Literal

from pydantic import Field

from .contracts import StrictModel
from .errors import DomainError

VERSION = "reference-portions-2026-10-08"
# USDA SR reference composition, per100g; presentation mirrors linked in docs.
OATS = "https://fdc.nal.usda.gov/food-details/169705/nutrients"
RICE = "https://fdc.nal.usda.gov/food-details/168878/nutrients"
CHICKEN = "https://fdc.nal.usda.gov/food-details/171477/nutrients"
BURGER = "https://www.mcdonalds.com.sg/food-menu/mcchicken/"
CATALOG = {
    "oats": {
        "label": "Sade yulaf (kuru miktar karşılığı)",
        "basis": "50 g sade kuru yulaf; süt, meyve, bal dahil değil",
        "kcal": 194.5,
        "protein_g": 8.45,
        "carbs_g": 33.15,
        "fat_g": 3.45,
        "sources": [OATS],
    },
    "rice": {
        "label": "Sade pişmiş pirinç",
        "basis": "200 g pişmiş pirinç; ek yağ ve sos dahil değil",
        "kcal": 260,
        "protein_g": 5.4,
        "carbs_g": 56.6,
        "fat_g": 0.6,
        "sources": [RICE],
    },
    "chicken": {
        "label": "Pişmiş derisiz tavuk göğsü",
        "basis": "150 g pişmiş derisiz tavuk göğsü; ek yağ ve sos dahil değil",
        "kcal": 247.5,
        "protein_g": 46.5,
        "carbs_g": 0,
        "fat_g": 5.4,
        "sources": [CHICKEN],
    },
    "chicken_rice": {
        "label": "Tavuklu pilav (örnek tarif)",
        "basis": "200 g pişmiş pirinç + 100 g tavuk göğsü; ek yağ ve sos dahil değil",
        "kcal": 425,
        "protein_g": 36.4,
        "carbs_g": 56.6,
        "fat_g": 4.2,
        "sources": [RICE, CHICKEN],
    },
    "chicken_burger": {
        "label": "Tavuk burger (benzer ürün referansı)",
        "basis": "1 McChicken Singapur referans ürünü (ekmek, pane tavuk, mayonez); tükettiğin marka/ürün doğrulanmış değil",
        "kcal": 391,
        "protein_g": 15,
        "carbs_g": 42,
        "fat_g": 18,
        "sources": [BURGER],
    },
}
METRICS = ("kcal", "protein_g", "carbs_g", "fat_g")


class PortionChoice(StrictModel):
    token: str = Field(max_length=150000)
    index: int = Field(ge=0, le=29)
    reference: str = Field(max_length=50)
    size: Literal["small", "medium", "large", "unknown", "none"]
    count: int = Field(default=1, ge=1, le=10)
    oil: Literal["none", "teaspoon", "tablespoon", "unknown"] = "unknown"


def options():
    return [{"id": key, "label": item["label"], "basis": item["basis"]} for key, item in CATALOG.items()]


def estimate(choice):
    if choice.reference not in CATALOG:
        raise DomainError("portion_reference", "Bu yiyecek için doğrulanmış referans bulunamadı.")
    item = CATALOG[choice.reference]
    factor = {"small": 0.75, "medium": 1, "large": 1.5, "unknown": 1}[choice.size] * choice.count
    oil = {"none": 0, "teaspoon": 5, "tablespoon": 15, "unknown": 0}[choice.oil]
    values = {k: round(item[k] * factor, 1) for k in METRICS}
    values["fat_g"] = round(values["fat_g"] + oil, 1)
    values["kcal"] = round(values["kcal"] + oil * 9, 1)
    size = {
        "small": "Küçük (×0,75)",
        "medium": "Orta (×1)",
        "large": "Büyük (×1,5)",
        "unknown": "Bilmiyorum → orta porsiyon varsayımı",
    }[choice.size]
    assumption = f"{choice.count} porsiyon · {size}. Orta porsiyon: {item['basis']}."
    assumption += (
        f" Ayrıca {oil:g} g yağ varsayımı eklendi."
        if oil
        else " Ek yağ/sos bilinmiyorsa hesaba dahil değil; toplam eksik olabilir."
    )
    return values, {
        "version": VERSION,
        "reference": choice.reference,
        "size": choice.size,
        "count": choice.count,
        "oil": choice.oil,
        "assumption": assumption,
        "sources": item["sources"],
        "source": "estimated-reference-portion",
    }


def is_estimated(snapshot):
    if not isinstance(snapshot, dict):
        return False
    return snapshot.get("source") == "estimated-reference-portion" or is_estimated(
        snapshot.get("original_source")
    )
