"""Synthetic EVREN adapter and explicit provider-consent contract."""

import io
import json
from urllib.error import HTTPError, URLError

import pytest
from alos import ai_planning as ai
from alos.errors import DomainError
from conftest import cmd
from pydantic import SecretStr
from test_ai_planning import data, reply, settings
from test_core import write
from test_science import AT, snap


def evren_settings():
    configuration = settings()
    configuration.ai_provider = "evren"
    configuration.evren_api_key = SecretStr("synthetic-evren-key")
    configuration.evren_model = "synthetic-model"
    return configuration


def test_provider_status_and_secret_isolation():
    config = evren_settings()
    status = ai.status(config)
    assert status["provider"] == "EVREN"
    assert status["consent_version"] == ai.EVREN_CONSENT
    assert status["available"]
    assert "synthetic-evren-key" not in repr(config) + json.dumps(status)
    config.evren_api_key = None
    assert not ai.status(config)["available"]  # Never uses the OpenAI credential.


@pytest.mark.parametrize(
    "provider,consent,valid",
    [
        ("openai", ai.CONSENT, True),
        ("evren", ai.EVREN_CONSENT, True),
        ("evren", ai.CONSENT, False),
        ("openai", ai.EVREN_CONSENT, False),
    ],
)
def test_provider_specific_consent(provider, consent, valid):
    config = evren_settings()
    config.ai_provider = provider
    if valid:
        ai.require_consent(data(consent=consent), config)
    else:
        with pytest.raises(DomainError):
            ai.require_consent(data(consent=consent), config)


def test_evren_transport_and_canonical_validation(monkeypatch):
    request = data(consent=ai.EVREN_CONSENT)
    plan = reply(request)
    captured = {}

    class Opener:
        def open(self, request, timeout):
            captured.update(
                url=request.full_url,
                headers=request.headers,
                body=json.loads(request.data),
                timeout=timeout,
            )
            return io.BytesIO(
                json.dumps(
                    {
                        "choices": [
                            {
                                "finish_reason": "stop",
                                "message": {
                                    "content": "```json\n"
                                    + plan.model_dump_json()
                                    + "\n```"
                                },
                            }
                        ]
                    }
                ).encode()
            )

    monkeypatch.setattr(ai, "build_opener", lambda *_: Opener())
    config = evren_settings()
    config.evren_reasoning_effort = "none"
    result = ai.call_provider(config, {"goal": "synthetic"})
    assert result == plan
    assert captured["url"] == "https://evren-llmapi.ssyz.org.tr/v1/chat/completions"
    assert captured["headers"]["Authorization"] == "Bearer synthetic-evren-key"
    assert "synthetic-not-a-real-key" not in json.dumps(captured)
    assert "tools" not in captured["body"]
    assert captured["body"]["reasoning_effort"] == "none"
    baseline, context = ai.prepare(request, snap(), AT)
    canonical = ai.validate_plan(
        result, request, baseline, context, AT, "synthetic-model", "EVREN"
    )
    assert canonical["program"]["ai_origin"]["provider"] == "EVREN"


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"choices": []},
        {"choices": [{"finish_reason": "length", "message": {"content": "{}"}}]},
        {"choices": [{"finish_reason": "stop", "message": {"content": None}}]},
        {"choices": [{"finish_reason": "stop", "message": {"content": "not json"}}]},
        {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {"content": "{}", "refusal": "private"},
                }
            ]
        },
        {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {"content": "{}", "tool_calls": [{}]},
                }
            ]
        },
    ],
)
def test_evren_rejects_incomplete_invalid_or_tool_response(monkeypatch, payload):
    class Opener:
        def open(self, *_args, **_kwargs):
            return io.BytesIO(json.dumps(payload).encode())

    monkeypatch.setattr(ai, "build_opener", lambda *_: Opener())
    with pytest.raises(DomainError) as error:
        ai.call_provider(evren_settings(), {})
    assert error.value.code == "ai_invalid_response"


@pytest.mark.parametrize(
    "failure",
    [HTTPError("private", c, "private", {}, None) for c in (301, 401, 403, 429, 500)]
    + [TimeoutError(), URLError("private")],
)
def test_evren_errors_never_leak_retry_or_fallback(monkeypatch, failure):
    calls = []

    class Opener:
        def open(self, *_args, **_kwargs):
            calls.append(1)
            raise failure

    monkeypatch.setattr(ai, "build_opener", lambda *_: Opener())
    monkeypatch.setattr(
        ai, "call_openai", lambda *_: pytest.fail("No provider fallback allowed")
    )
    with pytest.raises(DomainError) as error:
        ai.call_provider(evren_settings(), {})
    assert "private" not in str(error.value)
    assert len(calls) == 1


def test_evren_api_consent_and_persistence(client, app, monkeypatch):
    config = app.state.settings
    config.ai_provider = "evren"
    config.evren_api_key = SecretStr("synthetic-key")
    config.evren_model = "synthetic-model"
    calls = []

    def fake(_config, context):
        calls.append(context)
        return reply(data())

    monkeypatch.setattr(ai, "call_evren", fake)
    payload = data().model_dump(mode="json")
    assert client.post("/api/v2/ai-program-drafts", json=payload).status_code == 422
    assert not calls
    response = client.post(
        "/api/v2/ai-program-drafts", json=payload | {"consent": ai.EVREN_CONSENT}
    )
    assert response.status_code == 200, response.text
    assert client.get("/api/v2/bootstrap").json()["programs"] == []
    created = write(client, cmd("program.create", **response.json()["program"]))
    assert created["entity"]["status"] == "draft"
    assert created["entity"]["decisions"]["ai_origin"]["provider"] == "EVREN"
    assert len(calls) == 1


def test_model_receives_explicit_unit_capacity_and_split_rules():
    request = data(consent=ai.EVREN_CONSENT)
    _, context = ai.prepare(request, snap(), AT)
    by_id = {row["movement_id"]: row for row in context["eligible_movements"]}
    assert by_id["pull-up"]["prescription_rules"]["rir"] == {"min": 2, "max": 5}
    assert by_id["pull-up"]["prescription_rules"]["seconds"] is None
    assert by_id["pull-up"]["prescription_rules"]["reps"]["max"] <= 20
    assert context["day_split"][0]["kind"] == "upper"
    assert context["day_split"][0]["required_patterns"] == [
        "horizontal_pull",
        "horizontal_push",
        "vertical_pull",
        "vertical_push",
    ]
    assert context["day_split"][0]["minimum_strength_sets"] == 6
    assert context["day_split"][1]["kind"] == "lower"
    assert context["session_limits"]["max_non_cardio_sets"] == 24
    assert context["reference_draft"]
    assert "name" not in context["reference_draft"][0]


def test_long_cardio_capacity_reaches_provider_and_saves_draft(
    client, app, monkeypatch
):
    app.state.settings.ai_provider = "evren"
    app.state.settings.evren_api_key = SecretStr("synthetic-key")
    app.state.settings.evren_model = "synthetic-model"
    request = data(
        consent=ai.EVREN_CONSENT,
        competencies=[{"movement_id": "zone-2-run", "seconds": 1800}],
    )
    calls = []

    def fake(_config, context):
        calls.append(context)
        return reply(request)

    monkeypatch.setattr(ai, "call_evren", fake)
    response = client.post(
        "/api/v2/ai-program-drafts", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    assert calls[0]["competencies"][0]["seconds"] == 1800
    assert client.get("/api/v2/bootstrap").json()["programs"] == []
    created = write(client, cmd("program.create", **response.json()["program"]))
    assert created["entity"]["status"] == "draft"


def test_invalid_capacity_is_actionable_and_never_calls_provider(client, monkeypatch):
    monkeypatch.setattr(
        ai, "call_provider", lambda *_: pytest.fail("Invalid form sent externally")
    )
    payload = data().model_dump(mode="json")
    payload["competencies"] = [{"movement_id": "front-lever", "seconds": 1800}]
    payload["goal"] = "private-synthetic-goal"
    response = client.post("/api/v2/ai-program-drafts", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "ai_form_invalid"
    assert "Hareket kapasitesi" in response.json()["error"]["message"]
    assert "private-synthetic-goal" not in response.text


def test_generated_schema_error_does_not_blame_form(client, app, monkeypatch):
    from alos.programming import ProgramInput

    app.state.settings.ai_provider = "evren"
    app.state.settings.evren_api_key = SecretStr("synthetic-key")
    app.state.settings.evren_model = "synthetic-model"
    calls = []

    def provider(*_args):
        calls.append(1)
        return reply(data())

    monkeypatch.setattr(ai, "call_provider", provider)

    def invalid(*_args):
        ProgramInput.model_validate({"name": "private-output"})

    monkeypatch.setattr(ai, "validate_plan", invalid)
    response = client.post(
        "/api/v2/ai-program-drafts",
        json=data(consent=ai.EVREN_CONSENT).model_dump(mode="json"),
    )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "ai_draft_rejected"
    assert response.json()["error"]["details"]["repair_attempted"] is True
    assert len(calls) == 2
    assert "private-output" not in response.text
    assert client.get("/api/v2/bootstrap").json()["programs"] == []


def test_evren_budget_includes_reasoning_and_complete_week(monkeypatch):
    captured = {}
    plan = reply(data())

    class Opener:
        def open(self, request, timeout):
            captured.update(body=json.loads(request.data), timeout=timeout)
            return io.BytesIO(
                json.dumps(
                    {
                        "choices": [
                            {
                                "finish_reason": "stop",
                                "message": {"content": plan.model_dump_json()},
                            }
                        ]
                    }
                ).encode()
            )

    monkeypatch.setattr(ai, "build_opener", lambda *_: Opener())
    assert ai.call_evren(evren_settings(), {}) == plan
    assert captured["body"]["max_tokens"] == 16000
    assert captured["timeout"] == 150


@pytest.mark.parametrize("fence", ["json", "JSON", ""])
def test_evren_accepts_only_complete_enclosing_fence(fence):
    plan = reply(data())
    raw = json.dumps(
        {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "content": f"```{fence}\n" + plan.model_dump_json() + "\n```"
                    },
                }
            ]
        }
    )
    assert ai.parse_evren_plan(raw) == plan


@pytest.mark.parametrize(
    "finish,content,reason",
    [
        ("length", '{"days": [', "incomplete"),
        ("length", "{}", "incomplete"),
        ("stop", "Here is your plan: {}", "json"),
        ("stop", "{}", "schema"),
    ],
)
def test_evren_failure_categories_never_repair_partial_plan(
    finish, content, reason, caplog
):
    raw = json.dumps(
        {"choices": [{"finish_reason": finish, "message": {"content": content}}]}
    )
    with pytest.raises(DomainError) as exc:
        ai.parse_evren_plan(raw)
    assert exc.value.details == {"reason": reason}
    assert content not in str(exc.value)
    assert "EVREN plan rejected: " + reason in caplog.text
    assert content not in caplog.text


def test_day_specific_movement_allowlist_matches_split_validator():
    request = data(split="push_pull_legs", weekdays=[0, 1, 2, 4, 5])
    _, context = ai.prepare(request, snap(), AT)
    by_day = {day["weekday"]: day for day in context["day_split"]}
    assert "ring-face-pull" not in by_day[0]["allowed_movement_ids"]
    assert "ring-face-pull" in by_day[1]["allowed_movement_ids"]
    assert "bodyweight-squat" in by_day[2]["allowed_movement_ids"]
    assert "bodyweight-squat" not in by_day[4]["allowed_movement_ids"]
    candidates = {c["movement_id"]: c for c in context["eligible_movements"]}
    for day in by_day.values():
        assert all(
            candidates[key]["family"] in ai.ALLOWED_FAMILIES[day["kind"]]
            for key in day["allowed_movement_ids"]
        )


def test_recorded_live_synthetic_plan_saves_and_reads_back(client, app, monkeypatch):
    from pathlib import Path

    fixture = json.loads(
        Path("docs/evidence/evren/response-after-fix.json").read_text()
    )
    assert fixture["synthetic"] is True
    assert fixture["personal_data_read"] is False
    plan = ai.parse_evren_plan(
        json.dumps(
            {
                "choices": [
                    {
                        "finish_reason": fixture["finish_reason"],
                        "message": {"content": fixture["content"]},
                    }
                ]
            }
        )
    )
    app.state.settings.ai_provider = "evren"
    app.state.settings.evren_api_key = SecretStr("synthetic-key")
    app.state.settings.evren_model = "recorded-synthetic-qwen"
    monkeypatch.setattr(ai, "call_evren", lambda *_: plan)
    response = client.post("/api/v2/ai-program-drafts", json=fixture["input"])
    assert response.status_code == 200, response.text
    assert client.get("/api/v2/bootstrap").json()["programs"] == []
    created = write(client, cmd("program.create", **response.json()["program"]))
    assert created["entity"]["status"] == "draft"
    saved = client.get("/api/v2/bootstrap").json()
    assert (
        saved["programs"][0]["decisions"]["ai_origin"]["prompt_version"] == ai.VERSION
    )
    assert len([d for d in saved["program_days"] if d["kind"] == "training"]) == 5
    assert saved["sets"] == []


def test_evren_technical_order_fix_persists_with_explicit_save(
    client, app, monkeypatch
):
    app.state.settings.ai_provider = "evren"
    app.state.settings.evren_api_key = SecretStr("synthetic-key")
    app.state.settings.evren_model = "synthetic-model"
    request = data(consent=ai.EVREN_CONSENT)
    plan = reply(request)
    plan.days[0].exercises.append(plan.days[0].exercises.pop(0))
    corrected, notes = ai.normalize_technical_order(plan)
    monkeypatch.setattr(ai, "call_evren", lambda *_: plan)
    response = client.post(
        "/api/v2/ai-program-drafts", json=request.model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    assert notes and response.json()["review"]["ordering_adjustments"] == notes
    assert client.get("/api/v2/bootstrap").json()["programs"] == []
    write(client, cmd("program.create", **response.json()["program"]))
    saved = client.get("/api/v2/bootstrap").json()
    day = next(
        d for d in saved["program_days"] if d["weekday"] == corrected.days[0].weekday
    )
    exercises = sorted(
        (e for e in saved["program_exercises"] if e["day_id"] == day["id"]),
        key=lambda e: e["position"],
    )
    assert [e["movement_id"] for e in exercises] == [
        e.movement_id for e in corrected.days[0].exercises
    ]
    assert saved["programs"][0]["status"] == "draft"
    assert saved["sets"] == []
