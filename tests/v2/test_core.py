from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from uuid import UUID

import pytest
from alos.contracts import Command
from alos.db import utcnow
from alos.domain.scheduling import local_instant, shift_interval
from alos.errors import DomainError
from alos.models import Athlete, Audit, Operation, Outbox, Shift
from alos.service import bootstrap, execute, pull
from alos.worker import claim, process
from conftest import cmd, login
from fastapi.testclient import TestClient
from sqlalchemy import func, select


def write(c, command):
    r = c.post("/api/v2/commands", json=command)
    assert r.status_code == 200, r.text
    return r.json()


def test_shift_ack_idempotency_conflict_delete_and_restart(app, client):
    command = cmd(
        local_date="2026-09-15", status="work", start_local="14:00", end_local="22:00"
    )
    result = write(client, command)
    for _ in range(10):
        assert write(client, command) == result
    bad = dict(command, payload={**command["payload"], "end_local": "23:00"})
    assert (
        client.post("/api/v2/commands", json=bad).json()["error"]["code"]
        == "operation_mismatch"
    )
    b = login(app)
    assert b.get("/api/v2/bootstrap").json()["shifts"][0] == result["entity"]
    write(b, cmd(entity_id=command["entity_id"], version=1, end_local="23:00"))
    stale = client.post(
        "/api/v2/commands",
        json=cmd(entity_id=command["entity_id"], version=1, end_local="21:00"),
    )
    assert (
        stale.status_code == 409
        and stale.json()["error"]["details"]["current"]["version"] == 2
    )
    write(client, cmd("shift.delete", command["entity_id"], 2))
    assert (
        client.post(
            "/api/v2/commands",
            json=cmd(entity_id=command["entity_id"], version=2, social="stale"),
        ).status_code
        == 409
    )
    app.state.database.engine.dispose()  # new connection pool, no process-local source of truth
    snap = login(app).get("/api/v2/bootstrap").json()
    assert snap["shifts"][0]["deleted_at"] is not None and snap["cursor"] == 3
    with app.state.database.sessions() as db:
        assert db.scalar(select(func.count()).select_from(Operation)) == 3
        assert db.scalar(select(func.count()).select_from(Audit)) == 3
        assert db.scalar(select(func.count()).select_from(Outbox)) == 3


def test_optimizer_saved_approved_then_stale(app, client):
    shift = write(
        client,
        cmd(
            local_date="2026-09-15",
            status="work",
            start_local="14:00",
            end_local="22:00",
        ),
    )
    proposed = write(
        client, cmd("optimization.propose", week_start="2026-09-14", input_cursor=1)
    )
    assert len(proposed["entity"]["items"]) == 7
    accepted = write(client, cmd("optimization.accept", proposed["entity"]["id"], 1))
    assert accepted["entity"]["status"] == "accepted"
    app.state.database.engine.dispose()
    assert (
        login(app).get("/api/v2/bootstrap").json()["optimizations"][0]
        == accepted["entity"]
    )
    updated = write(
        client, cmd(entity_id=shift["entity"]["id"], version=1, commute_min=60)
    )
    assert updated["changes"][1]["entity"]["status"] == "stale"
    assert (
        client.post(
            "/api/v2/commands",
            json=cmd("optimization.propose", week_start="2026-09-14", input_cursor=1),
        ).status_code
        == 409
    )


def test_concurrent_distinct_writes_ordered_cursor_and_snapshot(app):
    database, athlete = app.state.database, app.state.athletes[0]
    commands = [
        Command.model_validate(cmd(local_date=f"2026-09-{day:02}"))
        for day in range(1, 21)
    ]
    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(lambda c: execute(database, athlete, c), commands))
    assert sorted(r["cursor"] for r in results) == list(range(1, 21))
    changes = pull(database, athlete, 0)
    assert [r["cursor"] for r in changes["changes"]] == list(range(1, 21))
    snap = bootstrap(database, athlete)
    assert len(snap["shifts"]) == snap["cursor"] == 20
    assert {r["id"] for r in snap["shifts"]} == {str(c.entity_id) for c in commands}


def test_cross_owner_and_body_owner_rejected(app, client):
    row = write(client, cmd(local_date="2026-09-15"))["entity"]
    other = login(app, "arda", "test-password-456")
    assert other.get("/api/v2/bootstrap").json()["shifts"] == []
    assert other.get("/api/v2/changes").json()["changes"] == []
    assert (
        other.post(
            "/api/v2/commands", json=cmd(entity_id=row["id"], version=1, social="x")
        ).status_code
        == 404
    )
    bad = cmd(local_date="2026-09-17")
    bad["athlete_id"] = str(app.state.athletes[0])
    assert other.post("/api/v2/commands", json=bad).status_code == 422
    assert TestClient(app).get("/api/v2/bootstrap").status_code == 401
    assert client.get("/.env").status_code == 404
    assert client.get("/account_state.db").status_code == 404


def test_csrf_sessions_bruteforce_closed_registration(app, client):
    assert (
        client.post(
            "/api/v2/auth/signup",
            json={"username": "new", "name": "Test", "password": "eight888"},
        ).status_code
        == 403
    )
    token = client.cookies.get("alos_v2_session")
    bad = TestClient(app)
    bad.cookies.set("alos_v2_session", token)
    assert (
        bad.post("/api/v2/commands", json=cmd(local_date="2026-09-15")).status_code
        == 403
    )
    bad.headers["Origin"] = "http://testserver"
    assert (
        bad.post("/api/v2/commands", json=cmd(local_date="2026-09-15")).status_code
        == 403
    )
    client.post("/api/v2/auth/logout")
    assert client.get("/api/v2/bootstrap").status_code == 401
    for _ in range(10):
        response = bad.post(
            "/api/v2/auth/login",
            json={"username": "missing", "password": "wrong-password"},
        )
        assert response.status_code == 401
    assert (
        bad.post(
            "/api/v2/auth/login",
            json={"username": "missing", "password": "wrong-password"},
        ).status_code
        == 429
    )


def test_domain_rollback_and_outbox_lease(app, client):
    invalid = cmd(local_date="2026-09-15", status="work")
    assert client.post("/api/v2/commands", json=invalid).status_code == 422
    assert client.get("/api/v2/bootstrap").json()["cursor"] == 0
    write(client, cmd(local_date="2026-09-15"))
    job = claim(app.state.database)
    assert job and claim(app.state.database) is None
    with app.state.database.sessions.begin() as db:
        db.get(Outbox, job[0]).leased_until = utcnow() - timedelta(seconds=1)
    retry = claim(app.state.database)
    assert retry[0] == job[0] and retry[1] != job[1]
    assert process(app.state.database, job) is False
    assert process(app.state.database, retry) is True
    assert process(app.state.database, retry) is False


def test_time_validation_and_date_only():
    a, b = shift_interval(date(2026, 9, 15), "22:00", "06:00", "Europe/Istanbul")
    assert (b - a).total_seconds() == 8 * 3600
    with pytest.raises(DomainError):
        local_instant(date(2026, 3, 8), "02:30", "America/New_York")
    a = local_instant(date(2026, 11, 1), "01:30", "America/New_York", 0)
    b = local_instant(date(2026, 11, 1), "01:30", "America/New_York", 1)
    assert (b - a).total_seconds() == 3600


def test_process_death_before_and_after_commit(app):
    import json
    import os
    import subprocess
    import sys
    from pathlib import Path

    database = app.state.database
    script = """import json,sys,time
from sqlalchemy import event
from alos.db import Database
from alos.contracts import Command
from alos.service import execute
from uuid import UUID
args=json.loads(sys.stdin.readline())
db=Database(args['url'])
def boundary(session):
    print('BOUNDARY',flush=True)
    time.sleep(60)
event.listen(db.sessions.class_,args['phase'],boundary)
execute(db,UUID(args['athlete']),Command.model_validate(args['command']))
"""
    for phase, day, persisted in [
        ("before_commit", "2026-09-20", 0),
        ("after_commit", "2026-09-21", 1),
    ]:
        operation = cmd(local_date=day)
        proc = subprocess.Popen(
            [sys.executable, "-c", script],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**os.environ, "PYTHONPATH": str(Path("apps/api").resolve())},
        )
        proc.stdin.write(
            json.dumps(
                {
                    "url": database.engine.url.render_as_string(hide_password=False),
                    "phase": phase,
                    "athlete": str(app.state.athletes[0]),
                    "command": operation,
                }
            )
            + "\n"
        )
        proc.stdin.flush()
        assert proc.stdout.readline().strip() == "BOUNDARY"
        proc.kill()
        proc.wait(timeout=5)
        with database.sessions() as db:
            assert (
                db.scalar(
                    select(func.count())
                    .select_from(Operation)
                    .where(Operation.operation_id == UUID(operation["operation_id"]))
                )
                == persisted
            )
        result = execute(
            database, app.state.athletes[0], Command.model_validate(operation)
        )
        assert result["entity"]["local_date"] == day
        with database.sessions() as db:
            assert (
                db.scalar(
                    select(func.count())
                    .select_from(Shift)
                    .where(Shift.id == UUID(operation["entity_id"]))
                )
                == 1
            )


def test_pull_during_locked_writer_cannot_skip_later_commit(app):
    import threading

    db = app.state.database
    athlete = app.state.athletes[0]
    first = Command.model_validate(cmd(local_date="2026-09-20"))
    second = Command.model_validate(cmd(local_date="2026-09-21"))
    started = threading.Event()
    with ThreadPoolExecutor(max_workers=2) as pool:
        with db.sessions.begin() as holding:
            holding.get(Athlete, athlete, with_for_update=True)

            def run_first():
                started.set()
                return execute(db, athlete, first)

            future = pool.submit(run_first)
            assert started.wait(2)
            assert pull(db, athlete, 0)["cursor"] == 0
            assert not future.done()
        a = future.result(timeout=5)
        b = pool.submit(execute, db, athlete, second).result(timeout=5)
    assert [a["cursor"], b["cursor"]] == [1, 2]
    assert [r["cursor"] for r in pull(db, athlete, 0)["changes"]] == [1, 2]


def test_late_shift_proposal_never_wraps_to_earlier_same_day():
    from alos.domain.scheduling import propose_week

    row = {
        "id": "synthetic",
        "version": 1,
        "local_date": "2026-09-14",
        "status": "work",
        "start_local": "15:00",
        "end_local": "23:30",
        "commute_min": 30,
        "pinned": False,
    }
    suggestion = propose_week(date(2026, 9, 14), [row])[0]
    assert suggestion["window"] is None
    assert "ertesi güne" in suggestion["reason"]


def test_readiness_rejects_a_stale_migration_revision_without_exposing_database(
    client, app
):
    from sqlalchemy import text

    assert client.get("/health/ready").status_code == 200
    with app.state.database.sessions.begin() as db:
        db.execute(
            text("UPDATE alembic_version SET version_num='unknown-old-revision'")
        )
    response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json() == {"status": "migration_required"}
    assert client.get("/health/live").status_code == 200


def test_configuration_errors_do_not_echo_connection_credentials():
    import pytest
    from alos.config import Settings
    from pydantic import ValidationError

    sentinel = "synthetic-secret-that-must-not-be-logged"
    with pytest.raises(ValidationError) as error:
        Settings(database_url="mysql://test:" + sentinel + "@invalid.example/test")
    assert sentinel not in str(error.value)
    assert sentinel not in repr(
        Settings(database_url="postgresql://test:" + sentinel + "@invalid.example/test")
    )
