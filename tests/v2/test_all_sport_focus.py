"""All-branch focus lineage and actual EVREN HTTP payload, with synthetic transport."""
import io
import json

import pytest
from alos import ai_planning as ai
from alos.guided_planning import GROUPS
from alos.sport_training import PROFILES
from alos.sports import BY_SPORT
from pydantic import SecretStr, ValidationError
from test_ai_planning import data, reply, settings
from test_running_planning import runner
from test_science import AT, snap
from test_sport_training import branch

FOCUS = {"core": 1, "quads": 1, "posterior": 1, "chest": 1, "back": 1}


@pytest.mark.parametrize("sport", list(BY_SPORT))
def test_focus_preserved_for_every_branch(sport):
    request = branch(sport, focus=FOCUS)
    if not PROFILES[sport]["automatic_physical_dose"]:
        request = branch(sport, focus=FOCUS, methods=["sport_tactics"])
    baseline, context = ai.prepare(request, snap(), AT)
    assert context["focus"] == FOCUS
    assert context["body_region_priorities"] == [
        {"region": k, "priority_points": v, "muscle_ids": GROUPS[k]} for k, v in FOCUS.items()
    ]
    result = ai.validate_plan(reply(request), request, baseline, context, AT, "synthetic", "EVREN")
    assert result["program"]["guided_choices"]["focus"] == FOCUS
    # Unknown branch muscle mappings cannot masquerade as measured coverage.
    assert set(result["review"]["missing_focus"]) == set(FOCUS)


@pytest.mark.parametrize("plan_request", [runner(focus=FOCUS), data(methods=["swimming"], equipment=["Pool"], competencies=[{"movement_id": "swim-freestyle", "seconds": 600}], split="endurance_days", objective="endurance", focus=FOCUS), data(focus=FOCUS)])
def test_evren_wire_payload_and_returned_plan_preserve_focus(monkeypatch, plan_request):
    request = plan_request
    baseline, context = ai.prepare(request, snap(), AT)
    synthetic = reply(request)
    captured = {}
    class Opener:
        def open(self, req, timeout):
            captured.update(url=req.full_url, body=json.loads(req.data))
            return io.BytesIO(json.dumps({"choices": [{"finish_reason": "stop", "message": {"content": synthetic.model_dump_json()}}]}).encode())
    monkeypatch.setattr(ai, "build_opener", lambda *_: Opener())
    config = settings()
    config.ai_provider = "evren"
    config.evren_api_key = SecretStr("synthetic-key")
    config.evren_model = "synthetic-model"
    plan = ai.call_provider(config, context)
    assert captured["url"] == "https://evren-llmapi.ssyz.org.tr/v1/chat/completions"
    messages = captured["body"]["messages"]
    assert "Body region priorities (focus) apply to ALL sports" in messages[0]["content"]
    payload = json.loads(messages[1]["content"])
    assert payload["focus"] == FOCUS
    assert len(payload["body_region_priorities"]) == 5
    assert "NOT measured deficits or growth percentages" in messages[0]["content"]
    result = ai.validate_plan(plan, request, baseline, context, AT, "synthetic", "EVREN")
    assert result["program"]["guided_choices"]["focus"] == FOCUS


def test_focus_budget_is_still_validated():
    with pytest.raises(ValidationError):
        runner(focus=FOCUS | {"arms": 1})
    with pytest.raises(ValidationError):
        runner(focus={"unknown": 1})
