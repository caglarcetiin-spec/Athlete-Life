"""AI adapter tests use synthetic responses only; never call paid APIs."""

import io
import json
from copy import deepcopy
from urllib.error import HTTPError, URLError

import pytest
from alos import ai_planning as ai
from alos.config import Settings
from alos.errors import DomainError
from alos.guided_planning import generate
from conftest import cmd, login
from pydantic import SecretStr, ValidationError
from test_core import write
from test_hybrid_planning import hybrid
from test_science import AT, snap


def data(**patch):
    return ai.AIRequest.model_validate(
        hybrid().model_dump() | {"consent": ai.CONSENT} | patch
    )


def reply(request):
    plan = generate(request, snap(), AT)["program"]
    return ai.AIPlan.model_validate(
        {
            "summary": "Sentetik karma çalışma taslağı",
            "limitations": ["Sentetik yanıt; biyolojik ölçüm değildir."],
            "days": [
                {
                    "weekday": d["weekday"],
                    "exercises": [
                        {
                            **{
                                k: e.get(k)
                                for k in ai.AIExercise.model_fields
                                if k != "reason"
                            },
                            "reason": "Ekipman ve hedef uyumu.",
                        }
                        for e in d["exercises"]
                    ],
                }
                for d in plan["days"]
                if d["kind"] == "training"
            ],
        }
    )


def settings():
    return Settings(
        database_url="postgresql://localhost:15432/alos_test_unused",
        openai_api_key=SecretStr("synthetic-not-a-real-key"),
        openai_model="synthetic-model",
    )


def test_payload_allowlist_and_health_gate():
    snapshot = snap()
    snapshot.update(
        athlete_id="private-id",
        labs=[
            {
                "id": "private-lab-id",
                "version": 1,
                "local_date": "2026-09-14",
                "result": "private-lab",
            }
        ],
        meals=[
            {
                "id": "private-meal-id",
                "version": 1,
                "note": "private-food",
                "local_date": "2026-09-14",
            }
        ],
    )
    _baseline, context = ai.prepare(data(), snapshot, AT)
    raw = json.dumps(context)
    assert "private-" not in raw
    assert (
        not {"name", "start_date", "symptoms", "adult", "consent", "athlete_id"}
        & context.keys()
    )
    assert context["goal"] == data().goal
    assert context["eligible_movements"]
    for patch in ({"symptoms": True}, {"adult": False}):
        with pytest.raises(DomainError, match="sağlık"):
            ai.prepare(data(**patch), snapshot, AT)
    assert not snapshot["sets"]


def test_valid_ai_plan_uses_canonical_ids_and_preview_is_pure():
    request = data()
    snapshot = snap()
    before = deepcopy(snapshot)
    baseline, context = ai.prepare(request, snapshot, AT)
    result = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic-model"
    )
    assert result["program"]["ai_origin"]["model"] == "synthetic-model"
    assert result["review"]["version"] == ai.VERSION
    assert result["review"]["status"] == "draft"
    assert all(
        d["estimated_minutes"] <= request.minutes for d in result["review"]["days"]
    )
    assert snapshot == before


@pytest.mark.parametrize(
    "fault",
    [
        "equipment",
        "duplicate",
        "days",
        "capacity",
        "duration",
        "units",
        "volume",
        "coverage",
        "skill_order",
    ],
)
def test_bad_ai_draft_cannot_be_accepted(fault):
    request = data()
    baseline, context = ai.prepare(request, snap(), AT)
    plan = reply(request)
    first = plan.days[0].exercises[0]
    if fault == "equipment":
        first.movement_id = "dumbbell-row"
    elif fault == "duplicate":
        plan.days[0].exercises.append(first)
    elif fault == "days":
        plan.days.pop()
    elif fault == "capacity":
        first.reps = 8
    elif fault == "duration":
        for e in plan.days[0].exercises:
            if e.reps and e.rir:
                e.sets, e.rest_seconds = 5, 300
    elif fault == "units":
        first.seconds = 20
    elif fault == "volume":
        request = data(experience="new")
    elif fault == "coverage":
        plan.days[0].exercises = plan.days[0].exercises[:2]
    else:
        plan.days[0].exercises.append(plan.days[0].exercises.pop(0))
    with pytest.raises(DomainError):
        ai.validate_plan(plan, request, baseline, context, AT, "synthetic-model")


def test_transport_schema_store_false_and_no_sensitive_error(monkeypatch):
    plan = reply(data())
    body = {
        "status": "completed",
        "output": [
            {
                "type": "message",
                "content": [{"type": "output_text", "text": plan.model_dump_json()}],
            }
        ],
    }
    captured = {}

    class Opener:
        def open(self, request, timeout):
            captured.update(
                url=request.full_url, body=json.loads(request.data), timeout=timeout
            )
            return io.BytesIO(json.dumps(body).encode())

    monkeypatch.setattr(ai, "build_opener", lambda *_: Opener())
    assert ai.call_openai(settings(), {"goal": "sentetik"}) == plan
    assert captured["url"] == "https://api.openai.com/v1/responses"
    assert captured["body"]["store"] is False
    assert captured["body"]["text"]["format"]["strict"] is True
    assert "tools" not in captured["body"]
    body["status"] = "incomplete"
    with pytest.raises(DomainError, match="okunamadı"):
        ai.call_openai(settings(), {})
    body["status"] = "completed"
    body["output"][0]["content"] = [
        {"type": "refusal", "refusal": "provider-private-text"}
    ]
    with pytest.raises(DomainError, match="taslak hazırlayamadı"):
        ai.call_openai(settings(), {})


@pytest.mark.parametrize(
    "failure",
    [
        TimeoutError(),
        URLError("private"),
        HTTPError("private", 401, "private", {}, None),
        HTTPError("private", 429, "private", {}, None),
    ],
)
def test_transport_errors_do_not_leak_or_retry(monkeypatch, failure):
    calls = []

    class Opener:
        def open(self, *_args, **_kwargs):
            calls.append(1)
            raise failure

    monkeypatch.setattr(ai, "build_opener", lambda *_: Opener())
    with pytest.raises(DomainError) as error:
        ai.call_openai(settings(), {})
    assert "private" not in str(error.value)
    assert len(calls) == 1


def test_missing_consent_invalid_and_secret_masked():
    with pytest.raises(ValidationError):
        ai.AIRequest.model_validate(hybrid().model_dump())
    assert "synthetic-not-a-real-key" not in repr(settings())
    assert "synthetic-not-a-real-key" not in json.dumps(ai.status(settings()))


def test_ai_endpoint_auth_disabled_consent_health_quota_and_persistence(
    client, app, monkeypatch
):
    configuration = app.state.settings
    configuration.openai_api_key = None
    assert client.get("/api/v2/ai-planning-status").json()["available"] is False
    payload = data().model_dump(mode="json")
    assert client.post("/api/v2/ai-program-drafts", json=payload).status_code == 503
    configuration.openai_api_key = SecretStr("synthetic-key")
    configuration.openai_model = "synthetic-model"
    calls = []

    def fake_call(_settings, context):
        calls.append(context)
        return reply(data())

    monkeypatch.setattr(ai, "call_openai", fake_call)
    denied = login(app)
    del denied.headers["X-CSRF-Token"]
    assert denied.post("/api/v2/ai-program-drafts", json=payload).status_code == 403
    assert (
        client.post(
            "/api/v2/ai-program-drafts", json=hybrid().model_dump(mode="json")
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v2/ai-program-drafts", json=payload | {"symptoms": True}
        ).status_code
        == 422
    )
    assert not calls
    response = client.post("/api/v2/ai-program-drafts", json=payload)
    assert response.status_code == 200, response.text
    assert client.get("/api/v2/bootstrap").json()["programs"] == []
    created = write(client, cmd("program.create", **response.json()["program"]))
    assert created["entity"]["status"] == "draft"
    assert created["entity"]["decisions"]["ai_origin"]["model"] == "synthetic-model"
    assert client.get("/api/v2/bootstrap").json()["sets"] == []
    configuration.ai_user_limit = 1
    assert client.post("/api/v2/ai-program-drafts", json=payload).status_code == 429
    assert len(calls) == 1


def test_global_ai_limit_is_shared_between_accounts(client, app, monkeypatch):
    app.state.settings.openai_api_key = SecretStr("synthetic-key")
    app.state.settings.openai_model = "synthetic-model"
    app.state.settings.ai_global_limit = 1
    calls = []

    def fake_call(_settings, _context):
        calls.append(1)
        return reply(data())

    monkeypatch.setattr(ai, "call_openai", fake_call)
    payload = data().model_dump(mode="json")
    assert client.post("/api/v2/ai-program-drafts", json=payload).status_code == 200
    other = login(app, "arda", "test-password-456")
    assert other.post("/api/v2/ai-program-drafts", json=payload).status_code == 429
    assert len(calls) == 1
