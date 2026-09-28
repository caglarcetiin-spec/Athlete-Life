"""Synthetic privileged-account contract. Never tests personal accounts."""

from uuid import UUID

from alos.models import Administrator, SecurityAudit, User
from conftest import cmd, login
from sqlalchemy import select
from test_core import write


def grant(app):
    with app.state.database.sessions.begin() as db:
        user = db.scalar(select(User).where(User.username == "deniz"))
        db.add(Administrator(user_id=user.id))


def test_normal_users_cannot_use_admin_endpoints_or_assign_role(app, client):
    target = login(app, "arda", "test-password-456").get("/api/v2/auth/me").json()["id"]
    assert client.get("/api/v2/auth/me").json()["is_admin"] is False
    for path in ["admin/users", "admin/users/" + target, "admin/audit"]:
        assert client.get("/api/v2/" + path).status_code == 403
    assert (
        client.post(
            f"/api/v2/admin/users/{target}/delete",
            json={"password": "test-password-123", "confirm_username": "arda"},
        ).status_code
        == 403
    )
    me = client.get("/api/v2/auth/me").json()
    assert (
        client.patch(
            "/api/v2/auth/profile",
            json={
                "name": "Test",
                "expected_version": me["version"],
                "email": None,
                "is_admin": True,
            },
        ).status_code
        == 422
    )


def test_admin_details_exclude_credentials_and_actions_reauthenticate(app, client):
    grant(app)
    other = login(app, "arda", "test-password-456")
    target = other.get("/api/v2/auth/me").json()["id"]
    write(other, cmd("hydration.save", local_date="2026-09-28", ml=500))
    assert client.get("/api/v2/auth/me").json()["is_admin"] is True
    listing = client.get("/api/v2/admin/users").json()
    assert len(listing["users"]) == 2
    detail = client.get("/api/v2/admin/users/" + target)
    assert detail.json()["records"]["hydrations"][0]["ml"] == 500
    for forbidden in [
        "password_hash",
        "session_hash",
        "recovery_code",
        "test-password",
        "csrf",
    ]:
        assert forbidden not in detail.text and forbidden not in str(listing)
    path = f"/api/v2/admin/users/{target}/delete"
    assert (
        client.post(
            path, json={"password": "wrong", "confirm_username": "arda"}
        ).status_code
        == 403
    )
    assert (
        client.post(
            path, json={"password": "test-password-123", "confirm_username": "deniz"}
        ).status_code
        == 422
    )
    csrf = client.headers.pop("X-CSRF-Token")
    assert (
        client.post(
            path, json={"password": "test-password-123", "confirm_username": "arda"}
        ).status_code
        == 403
    )
    client.headers["X-CSRF-Token"] = csrf
    assert other.get("/api/v2/auth/me").status_code == 200
    assert (
        client.post(
            path, json={"password": "test-password-123", "confirm_username": "arda"}
        ).status_code
        == 200
    )
    assert other.get("/api/v2/auth/me").status_code == 401
    assert client.get("/api/v2/auth/me").status_code == 200
    assert client.get("/api/v2/admin/users/" + target).status_code == 404
    assert any(
        e["event"] == "admin_delete:" + target
        for e in client.get("/api/v2/admin/audit").json()["events"]
    )


def test_revoke_preserves_data_and_admins_are_protected(app, client):
    grant(app)
    other = login(app, "arda", "test-password-456")
    target = other.get("/api/v2/auth/me").json()["id"]
    write(other, cmd("hydration.save", local_date="2026-09-28", ml=500))
    assert (
        client.post(
            f"/api/v2/admin/users/{target}/revoke",
            json={"password": "test-password-123", "confirm_username": "arda"},
        ).status_code
        == 200
    )
    assert other.get("/api/v2/auth/me").status_code == 401
    again = login(app, "arda", "test-password-456")
    assert again.get("/api/v2/bootstrap").json()["hydrations"][0]["ml"] == 500
    me = client.get("/api/v2/auth/me").json()
    assert (
        client.post(
            f"/api/v2/admin/users/{me['id']}/delete",
            json={"password": "test-password-123", "confirm_username": "deniz"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/v2/auth/delete", json={"password": "test-password-123"}
        ).status_code
        == 409
    )
    with app.state.database.sessions.begin() as db:
        db.delete(db.get(Administrator, UUID(me["id"])))
    assert client.get("/api/v2/admin/users").status_code == 403


def test_admin_media_stays_bound_to_target_and_is_audited(app, client):
    from test_registration_chat import picture

    grant(app)
    other = login(app, "arda", "test-password-456")
    target = other.get("/api/v2/auth/me").json()["id"]
    own = client.get("/api/v2/auth/me").json()["id"]
    media = write(other, cmd("media.save", name="Synthetic image", content=picture()))[
        "entity"
    ]
    assert (
        client.get(f"/api/v2/admin/users/{target}/media/{media['id']}").status_code
        == 200
    )
    assert (
        client.get(f"/api/v2/admin/users/{own}/media/{media['id']}").status_code == 404
    )
    assert (
        other.get(f"/api/v2/admin/users/{target}/media/{media['id']}").status_code
        == 403
    )
    with app.state.database.snapshot() as db:
        assert any(
            r.event == "admin_media:" + target
            for r in db.scalars(select(SecurityAudit))
        )
