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
    assert context["day_split"][1]["kind"] == "lower"
    assert context["session_limits"]["max_non_cardio_sets"] == 24
    assert context["reference_draft"]
    assert "name" not in context["reference_draft"][0]
