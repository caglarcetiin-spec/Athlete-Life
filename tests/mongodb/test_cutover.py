"""Only synthetic v10 records; never opens a personal backup or live database."""
import base64
import copy
import hashlib
import io
import json
import time
from uuid import uuid4

import pytest
from alos.backups import full_export
from alos.credentials import verify_password
from alos.cutover import migrate_account
from alos.models import User
from conftest import login
from PIL import Image
from sqlalchemy import select


def source():
    password = "synthetic-legacy-password"
    salt = "1a" * 16
    encoded = "scrypt$131072$8$1$" + salt + "$" + hashlib.scrypt(
        password.encode(), salt=bytes.fromhex(salt), n=131072, r=8, p=1, maxmem=256*1024*1024,
    ).hex()
    photo = io.BytesIO()
    Image.new("RGB", (16, 16), "blue").save(photo, format="PNG")
    payload = json.dumps({"id": 1, "date": "2026-09-20", "photos": {
        "front": "data:image/png;base64," + base64.b64encode(photo.getvalue()).decode(),
    }})
    state = json.dumps({"waterLogs": {"2026-09-20": [{"ml": 500}]}, "futureField": {"kept": 123}},
                       ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return {
        "user": {"_id": uuid4().hex, "username": "legacy-user", "name": "Synthetic User",
                 "email": "synthetic@example.invalid", "password_hash": encoded,
                 "created_at": time.time(), "recovery_codes": []},
        "state": {"payload": state, "checksum": hashlib.sha256(state.encode()).hexdigest()},
        "photos": [{"payload": payload, "hash": hashlib.sha256(payload.encode()).hexdigest()}],
    }


def test_cutover_preserves_login_archive_media_and_is_resumable(app):
    bundle = source()
    original = copy.deepcopy(bundle)
    result = migrate_account(app.state.database, bundle)
    assert migrate_account(app.state.database, bundle) == result
    assert bundle == original
    client = login(app, "legacy-user", "synthetic-legacy-password")
    assert client.get("/api/v2/auth/me").json()["email"] == "synthetic@example.invalid"
    snap = client.get("/api/v2/bootstrap").json()
    assert len(snap["medias"]) == 1
    image = client.get("/api/v2/media/" + snap["medias"][0]["id"])
    assert image.status_code == 200 and image.headers["content-type"] == "image/jpeg"
    from uuid import UUID
    archive = full_export(app.state.database, UUID(result["athlete_id"]))
    assert archive["records"]["import"][0]["raw"]["data"]["futureField"] == {"kept": 123}
    wrong = client.post("/api/v2/auth/login", json={"username":"legacy-user", "password":"wrong-password"})
    assert wrong.status_code == 401
    changed = copy.deepcopy(bundle)
    changed["user"]["name"] = "Changed while importing"
    with pytest.raises(ValueError, match="Source changed"):
        migrate_account(app.state.database, changed)


def test_cutover_refuses_collision_and_corrupt_source(app):
    bundle = source()
    bundle["user"]["username"] = "deniz"
    with pytest.raises(ValueError, match="collision"):
        migrate_account(app.state.database, bundle)
    bundle["user"]["username"] = "new-legacy"
    bundle["state"]["checksum"] = "bad"
    with pytest.raises(ValueError, match="checksum"):
        migrate_account(app.state.database, bundle)
    with app.state.database.snapshot() as db:
        assert db.scalar(select(User).where(User.username == "new-legacy")) is None


def test_legacy_hash_parameters_cannot_request_unbounded_memory():
    assert not verify_password("test-password", "scrypt$999999999999$8$1$" + "a" * 32 + "$" + "a" * 128)
    assert not verify_password("test-password", "not-a-hash")


def test_partial_cutover_blocks_login_and_readiness_until_resumed(app):
    from alos.cutover import prepare
    from fastapi.testclient import TestClient
    bundle = source()
    prepare(app.state.database, bundle)
    assert not app.state.database.ready()
    client = TestClient(app)
    response = client.post("/api/v2/auth/login", headers={"Origin": "http://testserver"},
                           json={"username": "legacy-user", "password": "synthetic-legacy-password"})
    assert response.status_code == 503
    migrate_account(app.state.database, bundle)
    assert app.state.database.ready()
    login(app, "legacy-user", "synthetic-legacy-password")
