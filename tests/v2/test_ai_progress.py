"""Synthetic-only progress analysis: privacy, periods, consent and evidence lineage."""

import json
from copy import deepcopy
from datetime import timedelta

import pytest
from alos import ai_progress as progress
from alos.ai_planning import parse_evren_plan
from alos.errors import DomainError
from alos.guided_planning import GuidedRequest
from alos.sports import SPORTS, categorized_sports
from conftest import cmd, login
from pydantic import SecretStr, ValidationError
from test_ai_planning import data
from test_core import write
from test_science import AT, setrow, snap


def request(**patch):
    return progress.PeriodRequest.model_validate(
        {"end_date": "2026-09-15", "days": 7, **patch}
    )


def review(context):
    return progress.ProgressReview(
        overview="Yalnız kaydedilen verilere dayalı sentetik yorum.",
        findings=[
            {
                "title": "Kayıt düzeni",
                "text": "Gözlenen set kayıtları kas büyümesini doğrudan ölçmez.",
                "evidence_ids": [context["facts"][0]["id"]],
            }
        ],
        next_steps=["Aynı koşullarda kayıt tut."],
        limitations=["Eksik kayıt sıfır değildir."],
    )


def test_minimized_payload_periods_and_optional_scopes():
    snapshot = snap(
        setrow(id="current-private-id", note="PRIVATE_NOTE"),
        setrow(
            id="previous-private-id",
            local_date="2026-09-08",
            occurred_at="2026-09-08T10:00:00+00:00",
        ),
        setrow(
            id="future",
            local_date="2026-09-16",
            occurred_at="2026-09-16T10:00:00+00:00",
        ),
        setrow(id="deleted", deleted_at=AT.isoformat()),
        setrow(id="skip", status="skipped"),
    )
    snapshot.update(
        athlete_id="PRIVATE_ACCOUNT",
        profiles=[{"name": "PRIVATE_NAME"}],
        labs=[
            {
                "id": "PRIVATE_LAB",
                "local_date": "2026-09-15",
                "deleted_at": AT.isoformat(),
            }
        ],
        measurements=[
            {
                "id": "PRIVATE_MEASUREMENT",
                "local_date": "2026-09-15",
                "metric": "weight",
                "value": 72,
                "unit": "kg",
                "protocol": "PRIVATE_PROTOCOL",
            }
        ],
    )
    before = deepcopy(snapshot)
    preview = progress.prepare(request(), snapshot, AT)
    assert preview["context"]["window"]["from"] == "2026-09-09"
    counts = [
        f for f in preview["context"]["facts"] if f["kind"] == "recorded_sessions"
    ]
    assert [f["recorded_sets"] for f in counts] == [1, 1]
    raw = json.dumps(preview)
    assert "PRIVATE" not in raw and "private-id" not in raw
    assert not any(f["kind"] == "body_measurement" for f in preview["context"]["facts"])
    included = progress.prepare(request(include_measurements=True), snapshot, AT)
    assert any(f.get("value") == 72 for f in included["context"]["facts"])
    assert "PRIVATE" not in json.dumps(included)
    assert snapshot == before
    assert (
        preview["digest"]
        == progress.prepare(request(), snapshot, AT + timedelta(minutes=1))["digest"]
    )
    assert preview["digest"] != included["digest"]


def test_response_must_cite_real_facts_and_transport_schema():
    p = progress.prepare(request(), snap(setrow()), AT)
    result = review(p["context"])
    raw = json.dumps(
        {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {"content": result.model_dump_json()},
                }
            ]
        }
    )
    assert parse_evren_plan(raw, progress.ProgressReview) == result
    with pytest.raises(ValidationError):
        progress.ReviewRequest.model_validate(
            {**request().model_dump(), "preview_digest": p["digest"]}
        )
    with pytest.raises(DomainError, match="Gelecek"):
        progress.prepare(request(end_date="2026-09-16"), snap(), AT)


def test_progress_api_isolated_read_only_consent_stale_quota(client, app, monkeypatch):
    settings = app.state.settings
    settings.ai_provider = "evren"
    settings.evren_api_key = SecretStr("synthetic-key")
    settings.evren_model = "synthetic-model"
    s = write(
        client, cmd("session.open", local_date="2026-09-15", title="PRIVATE_SESSION")
    )["entity"]
    write(
        client,
        cmd(
            "set.save",
            session_id=s["id"],
            movement_id="ring-l-sit",
            name="PRIVATE_NAME",
            seconds=10,
            modality="isometric",
            time_precision="date_only",
        ),
    )
    payload = request().model_dump(mode="json")
    before = client.get("/api/v2/bootstrap").json()
    p = client.post("/api/v2/ai-progress-preview", json=payload)
    assert p.status_code == 200, p.text
    p = p.json()
    assert "PRIVATE" not in json.dumps(p)
    other = login(app, "arda", "test-password-456")
    assert (
        other.post("/api/v2/ai-progress-preview", json=payload).json()["context"][
            "coverage"
        ]["selected_signal_count"]
        == 0
    )
    calls = []

    def fake(settings, context, **options):
        calls.append(context)
        assert options["response_model"] is progress.ProgressReview
        return review(context)

    monkeypatch.setattr(progress, "call_evren", fake)
    request_body = {
        **payload,
        "preview_digest": p["digest"],
        "consent": "progress-openai-v1",
    }
    assert (
        client.post("/api/v2/ai-progress-review", json=request_body).status_code == 409
    )
    request_body["consent"] = "progress-evren-v1"
    assert (
        client.post(
            "/api/v2/ai-progress-review",
            json={**request_body, "preview_digest": "0" * 64},
        ).status_code
        == 409
    )
    assert calls == []
    result = client.post("/api/v2/ai-progress-review", json=request_body)
    assert result.status_code == 200, result.text
    assert len(calls) == 1
    after = client.get("/api/v2/bootstrap").json()
    assert (
        after["sets"] == before["sets"]
        and after["programs"] == before["programs"]
        and after["cursor"] == before["cursor"]
    )
    settings.ai_user_limit = 1
    assert (
        client.post("/api/v2/ai-progress-review", json=request_body).status_code == 429
    )
    assert len(calls) == 1


def test_provider_unknown_evidence_rejected(monkeypatch):
    from alos.config import Settings

    settings = Settings(
        database_url="postgresql://localhost:15432/alos_test_unused",
        ai_provider="evren",
        evren_api_key=SecretStr("synthetic"),
        evren_model="synthetic",
    )
    p = progress.prepare(request(), snap(setrow()), AT)
    result = review(p["context"])
    result.findings[0].evidence_ids = ["invented"]
    monkeypatch.setattr(progress, "call_evren", lambda *a, **kw: result)
    with pytest.raises(DomainError, match="dayanak"):
        progress.analyze(settings, p)


def test_categories_complete_and_sport_experience_reaches_ai():
    categorized = categorized_sports()
    assert len(categorized) == 199 and {s["id"] for s in categorized} == {
        s["id"] for s in SPORTS
    }
    assert (
        next(s for s in categorized if s["id"] == "calisthenics")["category"]
        == "gymnastics"
    )
    from alos.ai_planning import prepare

    d = data(
        sport_ids=["boxing", "swimming"],
        sport_experience=[
            {"sport_id": "boxing", "level": "new", "sessions_per_week": 2},
            {"sport_id": "swimming", "level": "advanced", "years": 5},
        ],
    )
    assert prepare(d, snap(), AT)[1]["sport_experience"][1]["years"] == 5
    with pytest.raises(ValidationError):
        GuidedRequest.model_validate(
            d.model_dump(exclude={"consent"}) | {"sport_ids": ["boxing"]}
        )


def test_optional_sleep_goals_and_unknown_data_remain_separate():
    snapshot = snap()
    snapshot.update(
        sleeps=[
            {
                "id": "sleep-private",
                "version": 1,
                "start_at": "2026-09-14T20:00:00+00:00",
                "end_at": "2026-09-15T04:00:00+00:00",
                "timezone": "Europe/Istanbul",
                "note": "PRIVATE_SLEEP",
            }
        ],
        goals=[
            {
                "id": "goal-private",
                "metric": "weight",
                "title": "PRIVATE_GOAL",
                "variant": "",
                "baseline": 75,
                "target": 70,
                "unit": "kg",
                "start_date": "2026-09-01",
                "target_date": "2026-10-01",
                "archived": False,
            }
        ],
        goal_measurements=[
            {
                "id": "goal-point-private",
                "goal_id": "goal-private",
                "local_date": "2026-09-15",
                "value": 73,
                "note": "PRIVATE_POINT",
            }
        ],
    )
    base = progress.prepare(request(), snapshot, AT)
    assert base["context"]["coverage"]["selected_signal_count"] == 0
    result = progress.prepare(
        request(include_sleep=True, include_goals=True, include_nutrition=True),
        snapshot,
        AT,
    )
    facts = result["context"]["facts"]
    daily = next(f for f in facts if f["kind"] == "daily_context")
    assert daily["sleep_hours"] == 8 and daily["energy_kcal"] is None
    assert next(f for f in facts if f["kind"] == "goal_measurement")["value"] == 73
    assert "PRIVATE" not in json.dumps(result) and "goal-private" not in json.dumps(
        result
    )


def test_bad_dates_scopes_and_csrf_do_not_contact_provider(client, app, monkeypatch):
    from fastapi.testclient import TestClient

    anon = TestClient(app)
    assert anon.post(
        "/api/v2/ai-progress-preview", json=request().model_dump(mode="json")
    ).status_code in (401, 403)
    assert (
        client.post(
            "/api/v2/ai-progress-preview",
            json={**request().model_dump(mode="json"), "athlete_id": "another"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/v2/ai-progress-preview",
            json={**request().model_dump(mode="json"), "days": 365},
        ).status_code
        == 422
    )
    no_csrf = login(app)
    del no_csrf.headers["X-CSRF-Token"]
    assert (
        no_csrf.post(
            "/api/v2/ai-progress-preview", json=request().model_dump(mode="json")
        ).status_code
        == 403
    )


def test_evren_progress_transport_uses_review_schema_not_plan_schema(monkeypatch):
    import io

    from alos import ai_planning
    from test_evren_planning import evren_settings

    preview = progress.prepare(request(), snap(setrow()), AT)
    reply = review(preview["context"])
    captured = {}

    class Opener:
        def open(self, request, timeout):
            captured.update(url=request.full_url, body=json.loads(request.data))
            return io.BytesIO(
                json.dumps(
                    {
                        "choices": [
                            {
                                "finish_reason": "stop",
                                "message": {"content": reply.model_dump_json()},
                            }
                        ]
                    }
                ).encode()
            )

    monkeypatch.setattr(ai_planning, "build_opener", lambda *_: Opener())
    result = progress.analyze(evren_settings(), preview)
    assert result["review"] == reply.model_dump()
    assert captured["url"] == "https://evren-llmapi.ssyz.org.tr/v1/chat/completions"
    assert "ProgressReview" in captured["body"]["messages"][0]["content"]
    assert (
        "Analyze the supplied recorded training facts"
        in captured["body"]["messages"][0]["content"]
    )
    assert json.loads(captured["body"]["messages"][1]["content"]) == preview["context"]
