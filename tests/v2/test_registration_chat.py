"""Synthetic mail, images and chat transport only; no external account data."""

import base64
import io
import json
from datetime import timedelta

from alos import ai_chat as chat
from alos import email_registration as registration
from alos.db import utcnow
from alos.errors import DomainError
from alos.models import EmailChallenge, User
from PIL import Image
from pydantic import SecretStr
from sqlalchemy import select


def setup(app, monkeypatch):
    settings = app.state.settings
    settings.registration_enabled = True
    settings.resend_api_key = SecretStr("synthetic-email")
    settings.email_code_secret = SecretStr("synthetic-code-secret-01234567890123456789")
    settings.email_from = "Athlete Test <noreply@example.org>"
    delivered = []
    monkeypatch.setattr(
        registration, "deliver", lambda s, email, code: delivered.append((email, code))
    )
    return delivered


def signup(challenge, email="new@example.org", code="000000"):
    return {
        "username": "newperson",
        "name": "Synthetic Person",
        "password": "eight888",
        "email": email,
        "challenge_id": challenge,
        "code": code,
    }


def test_email_required_single_use_and_bound_to_address(client, app, monkeypatch):
    sent = setup(app, monkeypatch)
    response = client.post("/api/v2/auth/email-code", json={"email": "New@Example.org"})
    assert response.status_code == 200
    challenge = response.json()["challenge_id"]
    assert "code" not in response.json()
    with app.state.database.snapshot() as db:
        assert db.scalar(select(User).where(User.username == "newperson")) is None
        row = db.get(EmailChallenge, challenge)
        assert row.code_hash != sent[0][1] and len(row.code_hash) == 64
    assert (
        client.post(
            "/api/v2/auth/signup",
            json=signup(challenge, "other@example.org", sent[0][1]),
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v2/auth/signup", json=signup(challenge, code=sent[0][1])
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/api/v2/auth/signup",
            json=signup(challenge, code=sent[0][1]) | {"username": "another"},
        ).status_code
        == 422
    )
    with app.state.database.snapshot() as db:
        assert (
            db.scalar(select(User).where(User.username == "newperson")).email
            == "new@example.org"
        )
        assert db.get(EmailChallenge, challenge) is None


def test_wrong_codes_commit_attempts_and_expire(client, app, monkeypatch):
    sent = setup(app, monkeypatch)
    cid = client.post(
        "/api/v2/auth/email-code", json={"email": "new@example.org"}
    ).json()["challenge_id"]
    wrong = "111111" if sent[0][1] != "111111" else "222222"
    for _ in range(5):
        # Direct complete avoids the independent IP signup limiter in this attempt-counter test.
        from alos.contracts import Signup

        try:
            registration.complete(
                app.state.database,
                app.state.settings,
                Signup(**signup(cid, code=wrong)),
            )
        except DomainError as exc:
            assert exc.code == "email_code"
        else:
            raise AssertionError("Wrong code accepted")
    with app.state.database.snapshot() as db:
        assert db.get(EmailChallenge, cid).attempts == 5
    assert (
        client.post(
            "/api/v2/auth/signup", json=signup(cid, code=sent[0][1])
        ).status_code
        == 422
    )
    with app.state.database.sessions.begin() as db:
        db.get(EmailChallenge, cid).expires_at = utcnow() - timedelta(minutes=1)
    registration.cleanup(app.state.database)
    with app.state.database.snapshot() as db:
        assert db.get(EmailChallenge, cid) is None


def test_email_unconfigured_and_failed_delivery_create_no_account(
    client, app, monkeypatch
):
    app.state.settings.registration_enabled = True
    assert client.post("/api/v2/auth/signup", json=signup("unknown")).status_code == 503
    setup(app, monkeypatch)

    def fail(*args):
        raise DomainError("email_delivery", "synthetic", 503)

    monkeypatch.setattr(registration, "deliver", fail)
    assert (
        client.post(
            "/api/v2/auth/email-code", json={"email": "new@example.org"}
        ).status_code
        == 503
    )
    with app.state.database.snapshot() as db:
        assert (
            db.scalar(
                select(EmailChallenge).where(EmailChallenge.email == "new@example.org")
            )
            is None
        )


def picture():
    out = io.BytesIO()
    Image.new("RGB", (10, 10), (50, 100, 150)).save(out, format="PNG")
    return "data:image/png;base64," + base64.b64encode(out.getvalue()).decode()


def test_chat_consent_csrf_text_image_transport_and_no_persistence(
    client, app, monkeypatch
):
    config = app.state.settings
    config.evren_api_key = SecretStr("synthetic-chat")
    config.evren_model = "qwen3.8-flash-next"
    captured = []

    class Opener:
        def open(self, request, timeout):
            captured.append(json.loads(request.data))
            return io.BytesIO(
                json.dumps(
                    {
                        "choices": [
                            {
                                "finish_reason": "stop",
                                "message": {"content": "Sentetik spor yanıtı"},
                            }
                        ]
                    }
                ).encode()
            )

    monkeypatch.setattr(chat, "build_opener", lambda *_: Opener())
    payload = {
        "messages": [{"role": "user", "text": "Bu ekipmanla nasıl çalışabilirim?"}],
        "image": picture(),
        "consent": chat.CONSENT,
    }
    assert (
        client.post("/api/v2/ai-chat", json=payload | {"consent": "no"}).status_code
        == 422
    )
    assert not captured
    response = client.post("/api/v2/ai-chat", json=payload)
    assert response.status_code == 200, response.text
    message = captured[0]["messages"][-1]
    assert message["content"][0]["text"] == payload["messages"][0]["text"]
    url = message["content"][1]["image_url"]["url"]
    assert url.startswith("data:image/jpeg;base64,")
    assert "tools" not in captured[0]
    assert len(captured[0]["messages"]) == 2
    state = client.get("/api/v2/bootstrap").json()
    assert state["programs"] == [] and state["medias"] == []
    assert (
        client.post(
            "/api/v2/ai-chat", json=payload | {"image": "https://private.example/image"}
        ).status_code
        == 422
    )
    assert len(captured) == 1
    headers = client.headers.pop("X-CSRF-Token")
    assert client.post("/api/v2/ai-chat", json=payload).status_code == 403
    client.headers["X-CSRF-Token"] = headers


def test_chat_unsupported_vision_rejected_and_secret_not_exposed(
    client, app, monkeypatch
):
    app.state.settings.evren_api_key = SecretStr("synthetic-private")
    app.state.settings.evren_model = "text-only"

    def fail(*args):
        raise AssertionError("Must not contact provider")

    monkeypatch.setattr(chat, "build_opener", fail)
    assert client.get("/api/v2/ai-chat-status").json()["vision"] is False
    assert "synthetic-private" not in client.get("/api/v2/ai-chat-status").text
    response = client.post(
        "/api/v2/ai-chat",
        json={
            "messages": [{"role": "user", "text": "Test"}],
            "image": picture(),
            "consent": chat.CONSENT,
        },
    )
    assert response.status_code == 422


def test_resend_transport_has_code_and_support_reply_address(app, monkeypatch):
    transport = registration.deliver
    setup(app, monkeypatch)
    # Exercise the real transport function without contacting a mail service.
    original = registration
    captured = {}

    class Response(io.BytesIO):
        status = 200

    class Opener:
        def open(self, request, timeout):
            captured.update(url=request.full_url, body=json.loads(request.data))
            return Response(b"{}")

    monkeypatch.setattr(original, "build_opener", lambda *_: Opener())
    transport(app.state.settings, "new@example.org", "123456")
    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["body"]["to"] == ["new@example.org"]
    assert captured["body"]["reply_to"] == app.state.settings.support_email
    assert "123456" in captured["body"]["text"]


def test_resend_invalidates_old_code_and_expired_code_fails(client, app, monkeypatch):
    sent = setup(app, monkeypatch)
    old = client.post("/api/v2/auth/email-code", json={"email": "new@example.org"}).json()["challenge_id"]
    current = client.post("/api/v2/auth/email-code", json={"email": "new@example.org"}).json()["challenge_id"]
    assert client.post("/api/v2/auth/signup", json=signup(old, code=sent[0][1])).status_code == 422
    with app.state.database.sessions.begin() as db:
        db.get(EmailChallenge, current).expires_at = utcnow() - timedelta(seconds=1)
    assert client.post("/api/v2/auth/signup", json=signup(current, code=sent[-1][1])).status_code == 422


def test_delete_removes_photo_and_own_pending_email_only(client, app, monkeypatch):
    from alos.models import MediaObject
    from conftest import cmd
    from test_core import write
    setup(app, monkeypatch)
    me = client.get("/api/v2/auth/me").json()
    assert client.patch("/api/v2/auth/profile",json={"expected_version":me["version"],"name":"Synthetic","email":"new@example.org"}).status_code == 200
    own = client.post("/api/v2/auth/email-code",json={"email":"new@example.org"}).json()["challenge_id"]
    other = client.post("/api/v2/auth/email-code",json={"email":"other@example.org"}).json()["challenge_id"]
    write(client,cmd("media.save",name="Synthetic photo",content=picture()))
    assert client.post("/api/v2/auth/delete",json={"password":"test-password-123"}).status_code == 200
    with app.state.database.snapshot() as db:
        assert db.get(EmailChallenge, own) is None
        assert db.get(EmailChallenge, other) is not None
        assert db.scalar(select(MediaObject)) is None
