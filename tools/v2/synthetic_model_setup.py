"""Generate a triangle GLB for the synthetic browser DB; never read a real model."""

import json
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "tests/v2"))
from sqlalchemy import create_engine, text
from test_body_model import synthetic_glb

name = sys.argv[1]
if not name.startswith("alos_test_") or not name.replace("_", "").isalnum():
    raise SystemExit("Synthetic DB only")
if os.environ.get("ALOS_TEST_BACKEND") == "mongodb":
    from alos.mongo_db import PREFIX
    from pymongo import MongoClient
    with MongoClient("mongodb://127.0.0.1:27028/?replicaSet=alos-test") as client:
        database = client[name]
        user = database[PREFIX + "users"].find_one({"username": "deniz"})
        owner = database[PREFIX + "athletes"].find_one({"user_id": user["id"]})["id"]
else:
    engine = create_engine("postgresql+psycopg://localhost:15432/" + name)
    with engine.connect() as conn:
        owner = conn.execute(text(
            "SELECT a.id FROM athletes a JOIN users u ON a.user_id=u.id WHERE u.username='deniz'"
        )).scalar_one()
    engine.dispose()
folder = Path(tempfile.mkdtemp(prefix="alos-synthetic-glb-"))
path = folder / "triangle.glb"
path.write_bytes(synthetic_glb())
print(json.dumps({"owner": str(owner), "path": str(path)}))
