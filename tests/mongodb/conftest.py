"""Real MongoDB replica-set fixtures. Never accept Atlas or any personal DB name."""

import sys
from pathlib import Path
from uuid import uuid4

import pytest
from pymongo import MongoClient

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "apps/api"))
sys.path.insert(0, str(root / "tests/v2"))
from alos.auth import create_user
from alos.config import Settings
from alos.main import create_app
from fastapi.testclient import TestClient


@pytest.fixture
def app_factory():
    applications = []

    def factory():
        name = "alos_test_" + uuid4().hex
        app = create_app(
            Settings(
                database_url="mongodb://127.0.0.1:27028/?replicaSet=alos-test",
                mongo_database=name,
                enabled=True,
                environment="test",
                public_origin="http://testserver",
            )
        )
        applications.append((app, name))  # Clean up even if migration/seed fails.
        app.state.database.migrate()
        with app.state.database.sessions.begin() as db:
            _, a = create_user(db, "deniz", "Deniz Test", "test-password-123")
            _, b = create_user(db, "arda", "Arda Test", "test-password-456")
        app.state.athletes = [a.id, b.id]
        return app

    yield factory
    admin = MongoClient("mongodb://127.0.0.1:27028/?replicaSet=alos-test")
    for app, name in applications:
        app.state.database.client.close()
        assert name.startswith("alos_test_")
        admin.drop_database(name)
    admin.close()


@pytest.fixture
def app(app_factory):
    return app_factory()


@pytest.fixture
def client(app):
    c = TestClient(app)
    c.headers["Origin"] = "http://testserver"
    assert (
        c.post(
            "/api/v2/auth/login",
            json={"username": "deniz", "password": "test-password-123"},
        ).status_code
        == 200
    )
    c.headers["X-CSRF-Token"] = c.get("/api/v2/auth/me").json()["csrf"]
    return c


def login(app, username="deniz", password="test-password-123"):
    c = TestClient(app, raise_server_exceptions=True)
    c.headers["Origin"] = "http://testserver"
    assert (
        c.post(
            "/api/v2/auth/login", json={"username": username, "password": password}
        ).status_code
        == 200
    )
    me = c.get("/api/v2/auth/me").json()
    c.headers["X-CSRF-Token"] = me["csrf"]
    return c


def cmd(command_type="shift.save", entity_id=None, version=0, **payload):
    return {
        "operation_id": str(uuid4()),
        "entity_id": str(entity_id or uuid4()),
        "expected_version": version,
        "schema_version": 1,
        "command_type": command_type,
        "payload": payload,
    }
