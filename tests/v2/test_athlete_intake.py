"""Synthetic intake, provider payload, schedule and first-use completion contracts."""

import json
from datetime import date, timedelta

import pytest
from alos import ai_planning as ai
from alos.athlete_intake import AthleteIntake, break_dates, schedule_breaks
from alos.errors import DomainError
from alos.programming import ProgramInput
from conftest import cmd, login
from fastapi.testclient import TestClient
from pydantic import ValidationError
from test_ai_planning import data, reply
from test_core import write
from test_science import AT, snap


def intake(**patch):
    return AthleteIntake.model_validate(
        {
            "age_years": 28,
            "height_cm": 168,
            "weight_kg": 64,
            "sex": "female",
            "training_months": 60,
            "recorded_on": "2026-09-15",
            "cycle": {},
        }
        | patch
    )


def cycle(**patch):
    return (
        {
            "applicable": "yes",
            "last_start": "2026-09-14",
            "bleeding_days": 4,
            "length_days": 28,
            "preference": "pause",
            "confirm_estimated_breaks": False,
        }
        | patch
    )


def test_provider_gets_explicit_context_not_profile_or_identity():
    request = data(athlete_context=intake(cycle=cycle()))
    baseline, context = ai.prepare(request, snap(), AT)
    sent = context["athlete_context"]
    assert (
        sent["sex"] == "female" and sent["height_cm"] == 168 and sent["weight_kg"] == 64
    )
    assert sent["training_months"] == 60 and sent["age_years"] == 28
    assert sent["cycle"]["last_start"] == "2026-09-14"
    assert context["user_requested_rest_dates"] == [
        f"2026-09-{d}" for d in range(14, 18)
    ]
    assert (
        not {"birth_date", "athlete_id", "name", "profile", "health"} & context.keys()
    )
    result = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic", "EVREN"
    )
    ProgramInput.model_validate(result["program"])
    assert result["program"]["guided_choices"]["athlete_context"] == sent
    json.dumps(result)


def test_novice_consistency_and_underage_gate():
    with pytest.raises(ValidationError, match="0 ay"):
        data(athlete_context=intake(training_months=0))
    novice = data(
        experience="new",
        athlete_context=intake(training_months=0),
        methods=["weights"],
        competencies=[],
    )
    baseline, context = ai.prepare(novice, snap(), AT)
    assert context["experience"] == "new"
    assert (
        baseline["program"]["guided_choices"]["athlete_context"]["training_months"] == 0
    )
    with pytest.raises(DomainError) as blocked:
        ai.prepare(data(athlete_context=intake(age_years=16), adult=True), snap(), AT)
    assert blocked.value.code == "ai_health_gate"


@pytest.mark.parametrize("preference", ["continue", "decide"])
def test_continue_or_decide_keeps_same_program(preference):
    request = data()
    baseline, context = ai.prepare(request, snap(), AT)
    program = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic"
    )["program"]
    result, notes = schedule_breaks(program, intake(cycle=cycle(preference=preference)))
    assert result is program and notes == []
    assert break_dates(intake(sex="male"), date(2026, 9, 14), 12) == []


def test_future_breaks_require_explicit_confirmation():
    start = date(2026, 10, 1)
    assert break_dates(intake(cycle=cycle()), start, 8) == []
    expected = break_dates(intake(cycle=cycle(confirm_estimated_breaks=True)), start, 8)
    assert "2026-10-12" in expected and "2026-11-09" in expected
    assert len(expected) == 8
    with pytest.raises(ValidationError):
        intake(cycle=cycle(last_start="2026-09-20"))
    with pytest.raises(ValidationError):
        intake(cycle=cycle(last_start=None))
    with pytest.raises(ValidationError):
        intake(cycle=cycle(applicable="no"))


def test_non_monday_start_and_phases_keep_doses_and_unique_days():
    request = data(
        start_date="2026-09-16",
        weeks=12,
        progression_mode="phased",
        athlete_context=intake(cycle=cycle(confirm_estimated_breaks=True)),
    )
    baseline, context = ai.prepare(request, snap(), AT)
    result = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic"
    )
    program = ProgramInput.model_validate(result["program"])
    blocked = set(context["user_requested_rest_dates"])
    for week in range(1, 13):
        rows = [d for d in program.days if d.first_week <= week <= (d.last_week or 12)]
        assert len(rows) == len({d.weekday for d in rows}) == 7
        for d in rows:
            start = request.start_date + timedelta(weeks=week - 1)
            scheduled = start + timedelta(days=(d.weekday - start.weekday()) % 7)
            if scheduled.isoformat() in blocked:
                assert d.kind == "rest" and not d.exercises
    assert any("başka güne eklenmez" in n for n in result["notes"])


def test_signup_gate_persistence_and_activation_ack(app):
    app.state.settings.registration_enabled = True
    app.state.settings.email_verification_required = False
    with TestClient(app, headers={"Origin": "http://testserver"}) as signup:
        assert (
            signup.post(
                "/api/v2/auth/signup",
                json={
                    "username": "intake-test",
                    "name": "Synthetic",
                    "password": "synthetic-password",
                },
            ).status_code
            == 201
        )
    c = login(app, "intake-test", "synthetic-password")
    profile = c.get("/api/v2/bootstrap").json()["profiles"][0]
    assert profile["planning_preferences"]["onboarding_required"] is True
    draft = ai.prepare(data(), snap(), AT)[0]["program"]
    created = write(c, cmd("program.create", **draft))
    rejected = c.post(
        "/api/v2/commands", json=cmd("program.activate", created["entity"]["id"], 1)
    )
    assert (
        rejected.status_code == 422
        and rejected.json()["error"]["code"] == "intake_required"
    )
    updated = write(
        c,
        cmd(
            "profile.save",
            profile["id"],
            profile["version"],
            planning_preferences={
                "intake": intake().model_dump(mode="json"),
                "onboarding_required": False,
                "onboarding_completed": True,
            },
        ),
    )["entity"]
    assert updated["sex"] == "female"
    assert updated["planning_preferences"]["onboarding_required"] is True
    assert updated["planning_preferences"]["onboarding_completed"] is False
    activated = write(c, cmd("program.activate", created["entity"]["id"], 1))
    acknowledged = next(
        change["entity"]
        for change in activated["changes"]
        if change["kind"] == "profile"
    )
    assert acknowledged["planning_preferences"]["onboarding_completed"] is True
    assert (
        c.get("/api/v2/bootstrap").json()["profiles"][0]["planning_preferences"][
            "onboarding_completed"
        ]
        is True
    )
    # A later profile edit cannot accidentally lock the user back into onboarding.
    later = write(
        c,
        cmd(
            "profile.save",
            profile["id"],
            acknowledged["version"],
            planning_preferences={"intake": intake().model_dump(mode="json")},
        ),
    )["entity"]
    assert later["planning_preferences"]["onboarding_completed"] is True
    assert login(app).get("/api/v2/bootstrap").json()["profiles"] == []


def test_ai_context_and_cycle_week_definitions_persist(client):
    request = data(
        athlete_context=intake(cycle=cycle()), progression_mode="phased", weeks=4
    )
    base, context = ai.prepare(request, snap(), AT)
    result = ai.validate_plan(reply(request), request, base, context, AT, "synthetic")
    saved = write(client, cmd("program.create", **result["program"]))
    assert (
        saved["entity"]["decisions"]["guided_choices"]["athlete_context"]["cycle"][
            "last_start"
        ]
        == "2026-09-14"
    )
    days = [r["entity"] for r in saved["changes"] if r["kind"] == "program_day"]
    assert any(
        d["first_week"] == 1 and d["weekday"] == 0 and d["kind"] == "rest" for d in days
    )
