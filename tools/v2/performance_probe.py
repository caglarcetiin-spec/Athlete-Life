"""Local ASGI + real PostgreSQL benchmark; not a staging/network SLA claim."""

import concurrent.futures
import json
import platform
import resource
import statistics
import subprocess
import sys
import time
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "apps/api"))
from alos.config import Settings
from alos.main import create_app

name = "alos_test_performance_" + uuid4().hex
application = None


def login():
    client = TestClient(application)
    client.headers["Origin"] = "http://testserver"
    assert (
        client.post(
            "/api/v2/auth/login",
            json={"username": "deniz", "password": "test-password-123"},
        ).status_code
        == 200
    )
    client.headers["X-CSRF-Token"] = client.get("/api/v2/auth/me").json()["csrf"]
    return client


def summary(values):
    values = sorted(values)
    return {
        "samples": len(values),
        "p50_ms": statistics.median(values),
        "p95_ms": values[min(len(values) - 1, int(len(values) * 0.95))],
        "max_ms": max(values),
    }


try:
    subprocess.run(
        [sys.executable, "tools/v2/test_database.py", "create", name],
        check=True,
        cwd=root,
    )
    application = create_app(
        Settings(
            enabled=True,
            environment="test",
            database_url="postgresql://localhost:15432/" + name,
            public_origin="http://testserver",
            worker_enabled=False,
        )
    )
    client = login()
    writes = []
    for index in range(1000):
        command = {
            "operation_id": str(uuid4()),
            "entity_id": str(uuid4()),
            "expected_version": 0,
            "command_type": "hydration.save",
            "payload": {"local_date": f"2026-09-{index % 28 + 1:02d}", "ml": 200},
        }
        began = time.perf_counter()
        response = client.post("/api/v2/commands", json=command)
        writes.append((time.perf_counter() - began) * 1000)
        assert response.status_code == 200, response.text
    clients = [login() for _ in range(4)]

    def reads(client):
        timings = []
        for _ in range(20):
            began = time.perf_counter()
            r = client.get("/api/v2/bootstrap")
            timings.append((time.perf_counter() - began) * 1000)
            assert r.status_code == 200 and len(r.json()["hydrations"]) == 1000
        client.close()
        return timings

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(reads, clients))
    footprint = len(client.get("/api/v2/bootstrap").content)
    report = {
        "result": "MEASURED",
        "platform": platform.platform(),
        "processor": platform.machine(),
        "dataset": {
            "canonical_hydration_rows": 1000,
            "command_audit_and_change_rows": "one per successful write",
        },
        "read_concurrency": 4,
        "writes": summary(writes),
        "bootstrap": summary([v for batch in results for v in batch]),
        "bootstrap_bytes": footprint,
        "max_rss_native_units": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "limitations": [
            "ASGI TestClient transport plus real PostgreSQL; not remote network or Render",
            "Single domain reference dataset; not years of media, every table, or full-session memory-leak proof",
            "Measurements are not production SLA promises",
        ],
    }
    (root / "docs/evidence/stage-8/performance-results.json").write_text(
        json.dumps(report, indent=2) + "\n"
    )
    print(json.dumps(report, indent=2))
    client.close()
finally:
    if application:
        application.state.database.engine.dispose()
    subprocess.run(
        [sys.executable, "tools/v2/test_database.py", "drop", name],
        cwd=root,
        check=True,
    )
