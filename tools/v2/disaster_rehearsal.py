"""Real pg_dump/restore rehearsal, strictly limited to new local synthetic databases."""

import base64
import hashlib
import io
import json
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps/api"))
from alos.config import Settings
from alos.db import Base
from alos.main import create_app

run_id = uuid4().hex
source, target = "alos_test_dr_source_" + run_id, "alos_test_dr_restore_" + run_id
admin = create_engine(
    "postgresql+psycopg://localhost:15432/postgres", isolation_level="AUTOCOMMIT"
)
pgbin = ROOT / ".runtime-v2/pgsql/bin"


def connection(name):
    return "postgresql://localhost:15432/" + name


def fingerprint(name):
    engine = create_engine(
        connection(name).replace("postgresql:", "postgresql+psycopg:")
    )
    result = {}
    try:
        with engine.connect() as db:
            for table in sorted(Base.metadata.tables):
                rows = list(
                    db.execute(
                        text(
                            f'SELECT to_jsonb(t)::text FROM "{table}" t ORDER BY to_jsonb(t)::text'
                        )
                    ).scalars()
                )
                result[table] = {
                    "count": len(rows),
                    "sha256": hashlib.sha256("\n".join(rows).encode()).hexdigest(),
                }
    finally:
        engine.dispose()
    return result


try:
    subprocess.run(
        [sys.executable, "tools/v2/test_database.py", "create", source],
        cwd=ROOT,
        check=True,
    )
    with admin.connect() as db:
        db.execute(text("CREATE DATABASE " + target))
    app = create_app(
        Settings(
            enabled=True,
            environment="test",
            database_url=connection(source),
            public_origin="http://testserver",
            worker_enabled=False,
        )
    )
    with TestClient(app) as client:
        client.headers["Origin"] = "http://testserver"
        assert (
            client.post(
                "/api/v2/auth/login",
                json={"username": "deniz", "password": "test-password-123"},
            ).status_code
            == 200
        )
        client.headers["X-CSRF-Token"] = client.get("/api/v2/auth/me").json()["csrf"]
        for i in range(25):
            response = client.post(
                "/api/v2/commands",
                json={
                    "operation_id": str(uuid4()),
                    "entity_id": str(uuid4()),
                    "expected_version": 0,
                    "command_type": "hydration.save",
                    "payload": {"local_date": "2026-09-15", "ml": 200 + i},
                },
            )
            assert response.status_code == 200, response.text
        buffer = io.BytesIO()
        Image.new("RGB", (8, 8), "green").save(buffer, format="PNG")
        response = client.post(
            "/api/v2/commands",
            json={
                "operation_id": str(uuid4()),
                "entity_id": str(uuid4()),
                "expected_version": 0,
                "command_type": "media.save",
                "payload": {
                    "name": "Synthetic recovery photo",
                    "content": base64.b64encode(buffer.getvalue()).decode(),
                },
            },
        )
        assert response.status_code == 200, response.text
    expected = fingerprint(source)
    with tempfile.TemporaryDirectory(prefix="alos-synthetic-dr-") as temporary:
        backup = Path(temporary) / "synthetic.dump"
        began = time.perf_counter()
        subprocess.run(
            [
                str(pgbin / "pg_dump"),
                "--format=custom",
                "--no-owner",
                "--no-acl",
                "--file",
                str(backup),
                connection(source),
            ],
            check=True,
        )
        backup_seconds = time.perf_counter() - began
        began = time.perf_counter()
        subprocess.run(
            [
                str(pgbin / "pg_restore"),
                "--exit-on-error",
                "--no-owner",
                "--no-acl",
                "--dbname",
                connection(target),
                str(backup),
            ],
            check=True,
        )
        restored = fingerprint(target)
        assert restored == expected, "Restored table counts or hashes differ"
        restore_seconds = time.perf_counter() - began
        report = {
            "result": "PASS",
            "database": "PostgreSQL local synthetic only",
            "tables": expected,
            "backup_seconds": backup_seconds,
            "restore_and_verify_seconds": restore_seconds,
            "backup_bytes": backup.stat().st_size,
            "lost_acknowledged_fixture_records": 0,
            "rpo_scope": "No writes after dump began; zero fixture record loss. Continuous backup/PITR RPO not measured.",
            "rto_scope": "Local dump restore plus table hash validation, excluding cloud provisioning and traffic cutover.",
        }
        (ROOT / "docs/evidence/stage-8/disaster-results.json").write_text(
            json.dumps(report, indent=2) + "\n"
        )
        print(json.dumps({k: v for k, v in report.items() if k != "tables"}, indent=2))
finally:
    with admin.connect() as db:
        for name in (source, target):
            db.execute(text("DROP DATABASE IF EXISTS " + name + " WITH (FORCE)"))
    admin.dispose()
