"""Synthetic running regression: eligibility, context, canonical doses, no provider calls."""

from copy import deepcopy

import pytest
from alos import ai_planning as ai
from alos.errors import DomainError
from alos.guided_planning import generate
from alos.planner_catalog import options
from alos.running import RUNS
from test_ai_planning import reply
from test_guided_planning import replace
from test_science import AT, snap


def runner(**patch):
    return ai.AIRequest.model_validate(
        replace().model_dump()
        | {
            "methods": ["running"],
            "sport_ids": ["running"],
            "experience": "regular",
            "objective": "endurance",
            "split": "endurance_days",
            "equipment": ["Road"],
            "focus": {},
            "performance_focus": ["distance", "pace"],
            "competencies": [{"movement_id": k} for k in RUNS],
            "running_profile": {
                "continuous_minutes": 30,
                "weekly_minutes": 75,
                "target_distance_km": 10,
            },
            "consent": ai.CONSENT,
        }
        | patch
    )


def checked(data, snapshot=None, plan=None):
    baseline, context = ai.prepare(data, snapshot or snap(), AT)
    result = ai.validate_plan(
        plan or reply(data), data, baseline, context, AT, "synthetic"
    )
    return result, context


def test_running_week_and_provider_context_have_real_semantics():
    data = runner()
    result, context = checked(data)
    assert set(RUNS) <= {o["movement_id"] for o in options()}
    assert context["running_profile"]["target_distance_km"] == 10
    assert context["performance_focus"] == ["distance", "pace"]
    rows = [e for d in result["program"]["days"] for e in d["exercises"]]
    assert {"zone-2-run", "tempo-run", "long-run"} <= {e["movement_id"] for e in rows}
    assert sum(e["sets"] * e["seconds"] for e in rows) <= 75 * 60
    assert all(e["reps"] is None and e["rir"] is None for e in rows)
    assert all(not d["required_patterns"] for d in context["day_split"])
    assert all(d["estimated_minutes"] <= data.minutes for d in result["review"]["days"])


def test_empty_strength_seed_is_not_health_gate():
    snapshot = snap()
    snapshot["profiles"] = [
        {
            "id": "synthetic",
            "version": 1,
            "birth_date": "1990-01-01",
            "planning_preferences": {
                "equipment_profiles": [
                    {"id": "pool", "name": "Pool", "revision": 1, "equipment": ["Pool"]}
                ],
                "active_equipment_id": "pool",
            },
        }
    ]
    result, _ = checked(runner(), snapshot)
    assert any(d["exercises"] for d in result["program"]["days"])
    assert result["review"].get("health_blocked") is not True


def test_missing_environment_has_actionable_error_not_health_error():
    with pytest.raises(DomainError) as error:
        ai.prepare(runner(equipment=["GPS Watch", "Running Shoes"]), snap(), AT)
    assert error.value.code == "ai_no_candidates"
    assert "ortam" in str(error.value)


@pytest.mark.parametrize("patch", [{"adult": False}, {"symptoms": True}])
def test_genuine_form_health_gate_preserved(patch):
    with pytest.raises(DomainError) as error:
        ai.prepare(runner(**patch), snap(), AT)
    assert error.value.code == "ai_health_gate"
    assert error.value.details["reasons"]


def test_recorded_age_and_pain_not_bypassed():
    snapshot = snap()
    snapshot["profiles"] = [
        {"id": "synthetic", "version": 1, "birth_date": "2014-01-01"}
    ]
    with pytest.raises(DomainError, match="doğum tarihi"):
        ai.prepare(runner(), snapshot, AT)
    snapshot.pop("profiles")
    snapshot["pains"] = [
        {
            "id": "pain",
            "version": 1,
            "local_date": "2026-09-15",
            "area": "knee",
            "intensity": 4,
        }
    ]
    with pytest.raises(DomainError) as error:
        ai.prepare(runner(), snapshot, AT)
    assert error.value.code == "ai_health_gate"


def test_beginner_does_not_need_test_result_or_advanced_competency():
    result, context = checked(
        runner(experience="new", competencies=[], running_profile=None)
    )
    rows = [e for d in result["program"]["days"] for e in d["exercises"]]
    assert {e["movement_id"] for e in rows} == {"run-walk"}
    assert all(e["sets"] == 3 and e["rest_seconds"] == 60 for e in rows)
    assert context["running_profile"] is None


def test_environments_and_per_sport_level_are_enforced():
    _, context = ai.prepare(
        runner(sport_experience=[{"sport_id": "running", "level": "new"}]), snap(), AT
    )
    ids = {e["movement_id"] for e in context["eligible_movements"]}
    assert "tempo-run" not in ids
    assert not {"hill-repeats", "trail-easy-run", "sprint"} & ids
    _, context = ai.prepare(runner(equipment=["Hill", "Track", "Trail"]), snap(), AT)
    assert {"hill-repeats", "trail-easy-run", "sprint"} <= {
        e["movement_id"] for e in context["eligible_movements"]
    }


def test_intervals_use_repeated_bouts_and_rest():
    data = runner(
        performance_focus=["speed"],
        competencies=[{"movement_id": "intervals", "seconds": 90}],
    )
    result, _context = checked(data)
    item = next(
        e
        for d in result["program"]["days"]
        for e in d["exercises"]
        if e["movement_id"] == "intervals"
    )
    assert item["sets"] > 1 and item["seconds"] <= 72 and item["rest_seconds"] >= 60
    plan = reply(data)
    interval = next(
        e for d in plan.days for e in d.exercises if e.movement_id == "intervals"
    )
    interval.rest_seconds = 0
    with pytest.raises(DomainError, match="dinlenme"):
        checked(data, plan=plan)


def test_demanding_work_cannot_be_repeated_or_moved_to_easy_day():
    data = runner()
    plan = reply(data)
    hard = next(
        e for d in plan.days for e in d.exercises if e.movement_id == "tempo-run"
    )
    plan.days[0].exercises = [deepcopy(hard)]
    with pytest.raises(DomainError, match="dağılım"):
        checked(data, plan=plan)


def test_weekly_volume_and_continuous_capacity_are_hard_bounds():
    data = runner(running_profile={"continuous_minutes": 5, "weekly_minutes": 9})
    result, _ = checked(data)
    assert (
        sum(
            e["seconds"] * e["sets"]
            for d in result["program"]["days"]
            for e in d["exercises"]
        )
        <= 540
    )
    plan = reply(data)
    for day in plan.days:
        day.exercises[0].seconds = 240
    with pytest.raises(DomainError, match="haftalık"):
        checked(data, plan=plan)


def test_legacy_full_body_running_choices_remain_valid():
    result, _ = checked(runner(split="full_body"))
    assert any(d["exercises"] for d in result["program"]["days"])
    assert (
        generate(runner(), snap(), AT)["program"]["guided_choices"]["running_profile"][
            "target_distance_km"
        ]
        == 10
    )


def test_mixed_strength_and_running_reference_also_obeys_interval_rules():
    data = runner(
        methods=["weights", "running"],
        split="full_body",
        minutes=60,
        equipment=["Road", "Dumbbell"],
        competencies=[{"movement_id": "intervals"}],
    )
    result, _ = checked(data)
    rows = [e for d in result["program"]["days"] for e in d["exercises"]]
    assert any(e["modality"] == "strength" for e in rows)
    assert any(e["movement_id"] == "intervals" for e in rows)


def test_running_preferences_persist_only_after_acceptance(client):
    from conftest import cmd
    from test_core import write

    data = runner()
    before = client.get("/api/v2/bootstrap").json()["programs"]
    response = client.post(
        "/api/v2/guided-program-drafts",
        json=data.model_dump(mode="json", exclude={"consent"}),
    )
    assert response.status_code == 200, response.text
    assert client.get("/api/v2/bootstrap").json()["programs"] == before
    result = write(client, cmd("program.create", **response.json()["program"]))
    program = next(
        p
        for p in client.get("/api/v2/bootstrap").json()["programs"]
        if p["id"] == result["entity"]["id"]
    )
    choices = program["decisions"]["guided_choices"]
    assert choices["running_profile"] == data.running_profile.model_dump()
    assert choices["performance_focus"] == data.performance_focus
    assert choices["split"] == "endurance_days"
    assert program["status"] == "draft"
