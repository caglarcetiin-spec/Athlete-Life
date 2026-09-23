"""Generate a triangle GLB for the synthetic browser DB; never read a real model."""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tests/v2"))
from sqlalchemy import create_engine, text
from test_body_model import synthetic_glb

name = sys.argv[1]
if not name.startswith("alos_test_") or not name.replace("_", "").isalnum():
    raise SystemExit("Synthetic DB only")
engine = create_engine("postgresql+psycopg://localhost:15432/" + name)
with engine.connect() as conn:
    owner = conn.execute(
        text(
            "SELECT a.id FROM athletes a JOIN users u ON a.user_id=u.id WHERE u.username='deniz'"
        )
    ).scalar_one()
folder = Path(tempfile.mkdtemp(prefix="alos-synthetic-glb-"))
path = folder / "triangle.glb"
path.write_bytes(synthetic_glb())
print(json.dumps({"owner": str(owner), "path": str(path)}))
engine.dispose()
