"""Shared sport identities for the profile and the planning questionnaire."""

import json
from pathlib import Path

SPORTS = json.loads((Path(__file__).parent / "catalogs/sports.json").read_text())["sports"]
BY_SPORT = {s["id"]: s for s in SPORTS}
ENDURANCE_METHODS = {"conditioning", "running", "swimming"}
