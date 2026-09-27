import json
from pathlib import Path

BRAND = json.loads((Path(__file__).parent / "catalogs/brand.json").read_text())
