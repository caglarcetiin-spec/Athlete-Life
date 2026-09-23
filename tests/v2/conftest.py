import os
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps/api"))
from alos.auth import create_user
from alos.config import Settings
from alos.main import create_app


@pytest.fixture
def app_factory(monkeypatch):
    applications = []

    def factory():
        admin_url = os.environ.get(
            "ALOS_TEST_ADMIN_URL", "postgresql+psycopg://localhost:15432/postgres"
        )
        if not admin_url.endswith("/postgres") or "localhost:15432" not in admin_url:
            pytest.fail("Test DB safety guard: localhost:15432/postgres required")
        name = "alos_test_" + uuid4().hex
        engine = create_engine(admin_url, isolation_level="AUTOCOMMIT")
        with engine.connect() as conn:
            conn.execute(text("CREATE DATABASE " + name))
        url = admin_url.rsplit("/", 1)[0] + "/" + name
        monkeypatch.setenv("ALOS_V2_DATABASE_URL", url)
        command.upgrade(Config("apps/api/alembic.ini"), "head")
        application = create_app(
            Settings(
                database_url=url,
                enabled=True,
                environment="test",
                public_origin="http://testserver",
            )
        )
        with application.state.database.sessions.begin() as db:
            _a, athlete_a = create_user(db, "deniz", "Deniz Test", "test-password-123")
            _b, athlete_b = create_user(db, "arda", "Arda Test", "test-password-456")
        application.state.athletes = [athlete_a.id, athlete_b.id]
        applications.append((application, engine, name))
        return application

    yield factory
    for application, engine, name in applications:
        application.state.database.engine.dispose()
        with engine.connect() as conn:
            conn.execute(text("DROP DATABASE " + name + " WITH (FORCE)"))
        engine.dispose()


@pytest.fixture
def app(app_factory):
    return app_factory()


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


@pytest.fixture
def client(app):
    return login(app)


def cmd(command_type="shift.save", entity_id=None, version=0, **payload):
    return {
        "operation_id": str(uuid4()),
        "entity_id": str(entity_id or uuid4()),
        "expected_version": version,
        "schema_version": 1,
        "command_type": command_type,
        "payload": payload,
    }
