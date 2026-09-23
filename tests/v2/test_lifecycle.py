from conftest import cmd, login
from test_core import write
from test_workouts import actual, prescription, program, session


def test_password_recovery_revokes_sessions_and_codes_are_single_use(app, client):
    other = login(app)
    assert (
        client.post(
            "/api/v2/auth/password",
            json={"current_password": "wrong", "new_password": "new-password-123"},
        ).status_code
        == 403
    )
    response = client.post(
        "/api/v2/auth/password",
        json={
            "current_password": "test-password-123",
            "new_password": "new-password-123",
        },
    )
    assert response.status_code == 200
    assert other.get("/api/v2/auth/me").status_code == 401
    assert client.get("/api/v2/auth/me").status_code == 200
    codes = client.post(
        "/api/v2/auth/recovery-codes", json={"password": "new-password-123"}
    ).json()["codes"]
    assert len(set(codes)) == 8
    from fastapi.testclient import TestClient

    anonymous = TestClient(app)
    anonymous.headers["Origin"] = "http://testserver"
    payload = {
        "username": "deniz",
        "recovery_code": codes[0],
        "new_password": "recovered-password",
    }
    assert anonymous.post("/api/v2/auth/recover", json=payload).status_code == 200
    assert client.get("/api/v2/auth/me").status_code == 401
    assert anonymous.post("/api/v2/auth/recover", json=payload).status_code == 401
    assert (
        login(app, password="recovered-password").get("/api/v2/auth/me").status_code
        == 200
    )


def test_account_delete_is_owner_scoped_and_requires_password(app, client):
    other = login(app, "arda", "test-password-456")
    write(client, cmd("hydration.save", local_date="2026-09-15", ml=250))
    write(other, cmd("hydration.save", local_date="2026-09-15", ml=500))
    assert (
        client.post("/api/v2/auth/delete", json={"password": "wrong"}).status_code
        == 403
    )
    assert len(client.get("/api/v2/bootstrap").json()["hydrations"]) == 1
    assert (
        client.post(
            "/api/v2/auth/delete", json={"password": "test-password-123"}
        ).status_code
        == 200
    )
    assert client.get("/api/v2/auth/me").status_code == 401
    assert other.get("/api/v2/bootstrap").json()["hydrations"][0]["ml"] == 500


def test_session_undo_restores_only_children_deleted_with_session(client, app):
    p, d = program(client)
    rx = prescription(client, p, d)
    slots = [c["entity"] for c in rx["changes"] if c["kind"] == "slot"]
    s = session(client, rx)
    first = write(client, actual(client, s, slots[0]))["entity"]
    second = write(client, actual(client, s, slots[1]))["entity"]
    write(client, cmd("set.delete", first["id"], first["version"]))
    current = client.get("/api/v2/bootstrap").json()["sessions"][0]
    deleted = write(client, cmd("session.delete", s["id"], current["version"]))[
        "entity"
    ]
    other = login(app, "arda", "test-password-456")
    assert (
        other.post(
            "/api/v2/commands",
            json=cmd("record.restore", s["id"], deleted["version"], kind="session"),
        ).status_code
        == 404
    )
    restored = write(
        client, cmd("record.restore", s["id"], deleted["version"], kind="session")
    )
    snap = client.get("/api/v2/bootstrap").json()
    assert restored["entity"]["deleted_at"] is None
    assert (
        next(x for x in snap["sets"] if x["id"] == first["id"])["deleted_at"]
        is not None
    )
    assert (
        next(x for x in snap["sets"] if x["id"] == second["id"])["deleted_at"] is None
    )


def test_archive_reset_is_atomic_stale_safe_and_preserves_history(client, app):
    write(client, cmd("profile.save", experience="new", interface_mode="simple"))
    water = write(client, cmd("hydration.save", local_date="2026-09-15", ml=250))[
        "entity"
    ]
    before = client.get("/api/v2/bootstrap").json()
    reset = cmd(
        "archive.reset",
        label="First era",
        expected_cursor=before["cursor"],
        confirmation="YENİ BAŞLANGIÇ",
    )
    write(client, cmd("checkin.save", local_date="2026-09-15", energy=7))
    assert client.post("/api/v2/commands", json=reset).status_code == 409
    assert client.get("/api/v2/bootstrap").json()["hydrations"][0]["deleted_at"] is None
    reset["payload"]["expected_cursor"] = client.get("/api/v2/bootstrap").json()[
        "cursor"
    ]
    result = write(client, reset)
    assert write(client, reset) == result
    snap = client.get("/api/v2/bootstrap").json()
    assert snap["profiles"][0]["deleted_at"] is None
    assert snap["hydrations"][0]["deleted_at"] is not None
    archive = client.get("/api/v2/archives/" + result["entity"]["id"])
    assert archive.status_code == 200
    assert water["id"] in archive.text
    assert (
        login(app, "arda", "test-password-456")
        .get("/api/v2/archives/" + result["entity"]["id"])
        .status_code
        == 404
    )
    assert (
        client.post(
            "/api/v2/commands",
            json=cmd(
                "record.restore",
                water["id"],
                snap["hydrations"][0]["version"],
                kind="hydration",
            ),
        ).status_code
        == 409
    )
