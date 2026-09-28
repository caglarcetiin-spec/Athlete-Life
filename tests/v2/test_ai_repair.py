"""Synthetic provider failures; no credentials or real account data."""
from copy import deepcopy
from datetime import timedelta

import pytest
from alos import ai_planning as ai
from alos import auth
from alos.db import utcnow
from alos.errors import DomainError
from pydantic import SecretStr
from test_ai_planning import data, reply


def configure(app):
    app.state.settings.openai_api_key = SecretStr("synthetic-key")
    app.state.settings.openai_model = "synthetic-model"
    app.state.settings.ai_user_limit = 1


def test_repair_preserves_input_and_saves_editable_plan(client, app, monkeypatch):
    configure(app)
    calls = []
    payload = data(methods=["calisthenics"], equipment=["Bodyweight", "Pull-Up Bar", "Rings"]).model_dump(mode="json")
    request = ai.AIRequest.model_validate(payload)
    def provider(_settings, context):
        calls.append(deepcopy(context))
        plan = reply(request)
        if len(calls) == 1:
            plan.days[0].exercises[0].seconds = 999
        return plan
    monkeypatch.setattr(ai, "call_openai", provider)
    result = client.post("/api/v2/ai-program-drafts", json=payload)
    assert result.status_code == 200, result.text
    assert len(calls) == 2
    assert "validation_feedback" not in calls[0]
    assert calls[1]["validation_feedback"]["failure"]
    assert {k: v for k, v in calls[1].items() if k != "validation_feedback"} == calls[0]
    from conftest import cmd
    from test_core import write
    saved = write(client, cmd("program.create", **result.json()["program"]))
    assert saved["entity"]["status"] == "draft"
    assert client.post("/api/v2/ai-program-drafts", json=payload).status_code == 429
    assert len(calls) == 2


def test_failed_plan_refunds_success_allowance_but_attempts_are_bounded(client, app, monkeypatch):
    configure(app)
    app.state.settings.ai_global_limit = 100
    calls = []
    def provider(_settings, _context):
        calls.append(1)
        raise DomainError("ai_invalid_response", "Sentetik biçim hatası", 502)
    monkeypatch.setattr(ai, "call_openai", provider)
    for _ in range(6):
        result = client.post("/api/v2/ai-program-drafts", json=data().model_dump(mode="json"))
        assert result.status_code == 502, result.text
        assert result.json()["error"]["code"] == "ai_draft_rejected"
    result = client.post("/api/v2/ai-program-drafts", json=data().model_dump(mode="json"))
    assert result.status_code == 429
    assert 0 < result.json()["error"]["details"]["retry_after_seconds"] <= 900
    assert len(calls) == 12
    assert client.get("/api/v2/bootstrap").json()["programs"] == []


@pytest.mark.parametrize("code", ["ai_quota", "ai_unavailable", "ai_access", "ai_refusal"])
def test_transport_not_retried_and_failure_does_not_block_next_plan(client, app, monkeypatch, code):
    configure(app)
    calls = []
    def provider(_settings, _context):
        calls.append(1)
        if len(calls) == 1:
            raise DomainError(code, "Sentetik sağlayıcı hatası", 503)
        return reply(data())
    monkeypatch.setattr(ai, "call_openai", provider)
    payload = data().model_dump(mode="json")
    assert client.post("/api/v2/ai-program-drafts", json=payload).status_code == 503
    assert len(calls) == 1
    assert client.post("/api/v2/ai-program-drafts", json=payload).status_code == 200
    assert len(calls) == 2


def test_repair_respects_global_call_budget(client, app, monkeypatch):
    configure(app)
    app.state.settings.ai_global_limit = 1
    calls = []
    def provider(_settings, _context):
        calls.append(1)
        raise DomainError("ai_invalid_response", "Sentetik biçim hatası", 502)
    monkeypatch.setattr(ai, "call_openai", provider)
    result = client.post("/api/v2/ai-program-drafts", json=data().model_dump(mode="json"))
    assert result.status_code == 429
    assert len(calls) == 1


def test_refund_does_not_modify_new_window(app, monkeypatch):
    database = app.state.database
    at = utcnow()
    monkeypatch.setattr(auth, "utcnow", lambda: at)
    old = auth.rate_limit(database, "synthetic-window", 1)
    monkeypatch.setattr(auth, "utcnow", lambda: at + timedelta(minutes=16))
    auth.rate_limit(database, "synthetic-window", 1)
    auth.release_rate_slot(database, "synthetic-window", old)
    with pytest.raises(DomainError):
        auth.rate_limit(database, "synthetic-window", 1)
