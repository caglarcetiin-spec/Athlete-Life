"""Versioned identity resolver. Alias ambiguity is never resolved by a fuzzy guess."""

import json
import re
import unicodedata
from pathlib import Path

VERSION = "movement-catalog-2"
DEFINITIONS = json.loads((Path(__file__).parent / "catalogs/movements.json").read_text())


def normalize(value):
    value = str(value).translate(str.maketrans("İıŞşĞğÜüÖöÇç", "iiSsGgUuOoCc")).casefold()
    value = unicodedata.normalize("NFKD", value)
    return re.sub(r"[^a-z0-9]", "", value)


BY_ID = {d["id"]: d for d in DEFINITIONS.values()}
ALIASES = {}
for definition in BY_ID.values():
    for label in [
        definition["name"],
        definition.get("displayNameTR", definition["name"]),
        definition["id"],
        *definition.get("aliases", []),
    ]:
        ALIASES.setdefault(normalize(label), set()).add(definition["id"])


def resolve(row):
    identity = row.get("movement_id", "")
    if identity in BY_ID:
        return {"status": "matched", "definition": BY_ID[identity], "candidates": [identity], "via": "id"}
    candidates = ALIASES.get(normalize(identity), set())
    by_name = ALIASES.get(normalize(row.get("name", "")), set())
    # A specific old visible name can disambiguate a generic old alias.
    candidates = candidates & by_name if candidates and by_name else candidates or by_name
    if len(candidates) == 1:
        key = next(iter(candidates))
        return {"status": "matched", "definition": BY_ID[key], "candidates": [key], "via": "legacy_alias"}
    return {
        "status": "ambiguous" if candidates else "unmatched",
        "definition": None,
        "candidates": sorted(candidates),
        "via": "none",
    }
