"""Static metric inventory; no database, accounts, environment files or provider calls."""
import json
import sys
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "apps/api"))
from alos.movements import BY_ID
from alos.sport_training import PROFILES

counts = Counter((d.get("modality"), d.get("metric")) for d in BY_ID.values())
result = {
    "branch_count": len(PROFILES),
    "movement_count": len(BY_ID),
    "modality_metric_counts": [{"modality": k[0], "catalog_metric": k[1], "count": v} for k, v in counts.items()],
    "canonical_storage": {"duration": "seconds", "distance": "metres", "external_load": "kg", "repetitions": "integer"},
    "input_units": {"duration": ["seconds", "minutes", "hours"], "distance": ["metres", "kilometres"]},
    "note": "Static inventory; legacy minutes/km catalog metadata does not change canonical seconds/distance_m storage. This does not establish a complete measurement protocol for every sport or clinical validity.",
}
out = root / "docs/evidence/metrics/CATALOG_AUDIT.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, ensure_ascii=False))
