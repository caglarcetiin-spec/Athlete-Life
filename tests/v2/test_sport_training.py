"""Synthetic 199-branch contract: eligibility, AI response validation, storage lineage."""

import pytest
from alos import ai_planning as ai
from alos.errors import DomainError
from alos.guided_planning import generate
from alos.movements import BY_ID, resolve
from alos.programming import ProgramInput
from alos.sport_training import DEFINITIONS, PROFILES, set_limit
from alos.sports import BY_SPORT
from conftest import cmd
from test_ai_planning import data, reply
from test_core import write
from test_science import AT, snap
from test_workouts import actual, prescription, session


def branch(sport="boxing", **patch):
    techniques = [
        d
        for d in DEFINITIONS
        if d.get("sport_id") == sport and d["method"] == "sport_technique"
    ]
    return data(
        **(
            {
                "sport_ids": [sport],
                "sport_experience": [{"sport_id": sport, "level": "regular"}],
                "methods": ["sport_technique", "sport_practice"],
                "split": "sport_days",
                "sport_readiness": [
                    {
                        "sport_id": sport,
                        "environment_ready": True,
                        "coach_present": True,
                        "partner_available": True,
                    }
                ],
                "competencies": [
                    {"movement_id": d["id"], "seconds": 180} for d in techniques
                ],
                "equipment": [],
                "minutes": 45,
                "weekdays": [0, 2, 4],
                "focus": {},
                "objective": "technique",
            }
            | patch
        )
    )


@pytest.mark.parametrize("sport", list(BY_SPORT))
def test_every_branch_has_distinct_canonical_planning_path(sport):
    profile = PROFILES[sport]
    assert len(profile["techniques"]) >= 3 and not profile["exhaustive"]
    request = branch(sport)
    if not profile["automatic_physical_dose"]:
        request = branch(sport, methods=["sport_tactics"])
    baseline, context = ai.prepare(request, snap(), AT)
    result = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic", "EVREN"
    )
    ProgramInput.model_validate(result["program"])
    assert len(context["eligible_movements"]) < 20
    assert len(result["program"]["days"]) == 7
    for day in result["program"]["days"]:
        for row in day["exercises"]:
            assert BY_ID[row["movement_id"]]["sport_id"] == sport
            assert (
                row["modality"] == "circuit"
                and row["reps"] is None
                and row["rir"] is None
            )
            assert resolve(row)["via"] == "id"
            assert BY_ID[row["movement_id"]]["muscles"] == {}
    assert all(
        d["estimated_minutes"] <= request.minutes for d in result["review"]["days"]
    )


def test_selected_sport_never_borrows_another_branch_technique():
    request = branch()
    baseline, context = ai.prepare(request, snap(), AT)
    plan = reply(request)
    alien = next(d["id"] for d in DEFINITIONS if d.get("sport_id") == "bjj")
    assert alien not in {o["movement_id"] for o in context["eligible_movements"]}
    plan.days[0].exercises[0].movement_id = alien
    with pytest.raises(DomainError):
        ai.validate_plan(plan, request, baseline, context, AT, "synthetic")


@pytest.mark.parametrize(
    "field", ["environment_ready", "coach_present", "partner_available"]
)
def test_required_resources_fail_before_provider(field):
    request = branch("wrestling")
    setattr(request.sport_readiness[0], field, False)
    with pytest.raises(DomainError, match="branş|Branş"):
        ai.prepare(request, snap(), AT)


def test_unknown_skills_are_not_inferred_from_advanced_global_experience():
    request = branch(competencies=[], experience="advanced")
    with pytest.raises(DomainError):
        ai.prepare(request, snap(), AT)
    request = branch(sport_experience=[], experience="advanced")
    assert set_limit(request, "boxing") == 12
    result = generate(request, snap(), AT)
    assert all(
        sum(e["sets"] for e in day["exercises"]) <= 12
        for day in result["program"]["days"]
    )


def test_multi_branch_days_and_cross_day_injection():
    request = branch(
        sport_ids=["boxing", "dressage"],
        sport_readiness=branch().sport_readiness + branch("dressage").sport_readiness,
        competencies=branch().competencies + branch("dressage").competencies,
        sport_experience=[],
    )
    baseline, context = ai.prepare(request, snap(), AT)
    assert [d["sport_id"] for d in context["day_split"]] == [
        "boxing",
        "dressage",
        "boxing",
    ]
    plan = reply(request)
    result = ai.validate_plan(plan, request, baseline, context, AT, "synthetic")
    assert result["program"]["days"][0]["label"] == "Boks"
    plan.days[0].exercises[0] = plan.days[1].exercises[0]
    with pytest.raises(DomainError):
        ai.validate_plan(plan, request, baseline, context, AT, "synthetic")
    with pytest.raises(ValueError, match="Her branş"):
        branch(sport_ids=["boxing", "dressage"], weekdays=[0])


def test_branch_timed_rounds_and_mutated_metric_rejected():
    request = branch()
    baseline, context = ai.prepare(request, snap(), AT)
    plan = reply(request)
    plan.days[0].exercises[0].reps = 5
    with pytest.raises(DomainError):
        ai.validate_plan(plan, request, baseline, context, AT, "synthetic")


def test_power_is_not_a_high_rep_bodybuilding_set():
    request = data(
        methods=["explosive_power"],
        competencies=[{"movement_id": "countermovement-jump", "reps": 5}],
        equipment=["Outdoor"],
        split="full_body",
        focus={},
        objective="power",
    )
    baseline, context = ai.prepare(request, snap(), AT)
    result = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic"
    )
    assert all(
        e["reps"] <= 3 and e["rest_seconds"] >= 120 and e["rir"] is None
        for d in result["program"]["days"]
        for e in d["exercises"]
    )


def test_existing_strength_plan_and_new_methods_can_coexist():
    request = branch(
        methods=["sport_technique", "weights"], equipment=["Dumbbell"], minutes=75
    )
    baseline, context = ai.prepare(request, snap(), AT)
    result = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic"
    )
    assert any(
        e["modality"] == "strength"
        for d in result["program"]["days"]
        for e in d["exercises"]
    )


def test_branch_plan_rounds_persist_and_analysis_keeps_unknown(client):
    request = branch("bjj")
    preview = client.post(
        "/api/v2/guided-program-drafts",
        json=request.model_dump(mode="json", exclude={"consent"}),
    )
    assert preview.status_code == 200, preview.text
    created = write(client, cmd("program.create", **preview.json()["program"]))
    program = write(client, cmd("program.activate", created["entity"]["id"], 1))[
        "entity"
    ]
    day = next(
        c["entity"]
        for c in created["changes"]
        if c["kind"] == "program_day" and c["entity"]["weekday"] == 0
    )
    rx = prescription(client, program, day, "2026-09-14")
    current = session(client, rx)
    slot = next(c["entity"] for c in rx["changes"] if c["kind"] == "slot")
    saved = write(
        client,
        actual(
            client,
            current,
            slot,
            reps=None,
            seconds=slot["seconds"],
            occurred_at="2026-09-14T12:00:00Z",
        ),
    )["entity"]
    assert (
        saved["movement_id"].startswith("sport-bjj-")
        and saved["seconds"] == slot["seconds"]
    )
    assert saved["modality"] == "circuit"
    report = client.get(
        "/api/v2/analysis", params={"as_of": "2026-09-15T12:00:00Z", "window_days": 7}
    ).json()
    assert not report["recorded_distribution"]
    assert report["coverage"]["missing"]
    assert report["branch_practice"][0]["known_seconds"] == slot["seconds"]
    assert report["branch_practice"][0]["source_ids"] == [saved["id"]]
    restored = client.get("/api/v2/bootstrap").json()["programs"][0]
    assert (
        restored["decisions"]["guided_choices"]["sport_readiness"][0][
            "partner_available"
        ]
        is True
    )
    assert (
        len(client.get("/api/v2/guided-planning-options").json()["sport_training"])
        == 199
    )
    catalog = client.get("/api/v2/catalogs").json()["movements"]
    assert any(d["id"] == saved["movement_id"] for d in catalog)


def test_power_three_options_and_upper_lower_draft_still_valid():
    request = data(
        methods=["explosive_power", "weights"],
        competencies=[
            {"movement_id": d["id"], "reps": 5}
            for d in DEFINITIONS
            if d["type"] == "POWER"
        ],
        equipment=["Outdoor", "Medicine Ball", "Dumbbell"],
        minutes=90,
    )
    baseline, context = ai.prepare(request, snap(), AT)
    ai.validate_plan(reply(request), request, baseline, context, AT, "synthetic")


def test_tactics_time_is_not_muscle_training_or_missing_time_zero():
    from alos.domain.science import compute
    from test_science import setrow

    result = compute(
        snap(
            setrow(
                movement_id="sport-chess-analysis",
                modality="circuit",
                seconds=None,
                reps=None,
            )
        ),
        AT,
    )
    assert result["branch_practice"][0]["known_seconds"] is None
    assert result["branch_practice"][0]["physical"] is False
    assert not result["recorded_distribution"]


def test_experienced_solo_technique_can_train_without_current_coach():
    request = branch(methods=["sport_technique"])
    request.sport_readiness[0].coach_present = False
    baseline, context = ai.prepare(request, snap(), AT)
    ai.validate_plan(reply(request), request, baseline, context, AT, "synthetic")
    request.sport_experience[0].level = "new"
    with pytest.raises(DomainError):
        ai.prepare(request, snap(), AT)
