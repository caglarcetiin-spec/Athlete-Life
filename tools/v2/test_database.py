"""Create/drop a named synthetic DB. Never accepts production hosts or arbitrary names."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps/api"))
import os

from alembic import command
from alembic.config import Config
from alos.auth import create_user
from alos.db import Database
from sqlalchemy import create_engine, text

name = sys.argv[2]
if not name.startswith("alos_test_") or not name.replace("_", "").isalnum():
    raise SystemExit("Only synthetic test DB names allowed")
if os.environ.get("ALOS_TEST_BACKEND") == "mongodb":
    from alos.mongo_db import MongoDatabase
    from pymongo import MongoClient

    uri = "mongodb://127.0.0.1:27028/?replicaSet=alos-test"
    if sys.argv[1] == "drop":
        with MongoClient(uri) as client:
            client.drop_database(name)
    else:
        with MongoClient(uri) as client:
            if name in client.list_database_names():
                raise SystemExit("Refusing to overwrite an existing test database")
        database = MongoDatabase(uri, name)
        database.migrate()
        with database.sessions.begin() as db:
            create_user(db, "deniz", "Deniz Test", "test-password-123")
            create_user(db, "arda", "Arda Test", "test-password-456")
        database.dispose()
    raise SystemExit(0)
engine = create_engine(
    "postgresql+psycopg://localhost:15432/postgres", isolation_level="AUTOCOMMIT"
)
with engine.connect() as conn:
    if sys.argv[1] == "drop":
        conn.execute(text("DROP DATABASE IF EXISTS " + name + " WITH (FORCE)"))
    else:
        conn.execute(text("CREATE DATABASE " + name))
if sys.argv[1] == "create":
    url = "postgresql+psycopg://localhost:15432/" + name
    os.environ["ALOS_V2_DATABASE_URL"] = url
    command.upgrade(Config("apps/api/alembic.ini"), "head")
    database = Database(url)
    with database.sessions.begin() as db:
        create_user(db, "deniz", "Deniz Test", "test-password-123")
        create_user(db, "arda", "Arda Test", "test-password-456")
    database.engine.dispose()
engine.dispose()
