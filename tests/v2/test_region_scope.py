"""Selected regions bound generation, EVREN input and result validation together."""

import pytest
from alos import ai_planning as ai
from alos.errors import DomainError
from alos.movements import BY_ID
from alos.region_scope import exclusion
from conftest import cmd
from test_ai_planning import data, reply
from test_core import write
from test_science import AT, snap

UPPER = {
    "chest": 1,
    "back": 1,
    "shoulders": 1,
    "arms": 1,
    "core": 1,
    "quads": 0,
    "posterior": 0,
    "calves": 0,
}


@pytest.mark.parametrize("split", ["full_body", "upper_lower", "push_pull_legs"])
def test_only_upper_regions_do_not_require_legs(split):
    request = data(
        region_mode="selected",
        focus=UPPER,
        split=split,
        methods=["weights", "calisthenics"],
        competencies=[],
        equipment=["Dumbbell", "Rings"],
    )
    baseline, context = ai.prepare(request, snap(), AT)
    assert context["region_mode"] == "selected"
    assert not {"quads", "posterior", "calves"} & set(
        baseline["review"]["missing_focus"]
    )
    assert not any(d["missing_patterns"] for d in baseline["review"]["days"])
    for day in context["day_split"]:
        assert not {"knee", "hinge", "calf"} & set(day["required_patterns"])
        assert all(
            exclusion(request, BY_ID[k]) is None for k in day["allowed_movement_ids"]
        )
        assert "bodyweight-squat" not in day["allowed_movement_ids"]
    result = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic", "EVREN"
    )
    assert result["program"]["guided_choices"]["region_mode"] == "selected"
    assert not any("Baldır" in note or "Ön bacak" in note for note in result["notes"])


def test_priority_retains_balanced_split_and_no_selected_regions_does_too():
    for patch in (
        {"region_mode": "priority", "focus": UPPER},
        {"region_mode": "selected", "focus": {}},
    ):
        request = data(
            methods=["weights"], equipment=["Dumbbell"], split="full_body", **patch
        )
        _, context = ai.prepare(request, snap(), AT)
        assert {"knee", "hinge"} <= set(context["day_split"][0]["required_patterns"])


def test_specific_calf_request_is_feasible_without_unselected_patterns():
    request = data(
        region_mode="selected",
        focus={"calves": 1},
        methods=["calisthenics"],
        experience="new",
        split="full_body",
        competencies=[],
        weekdays=[0],
    )
    baseline, context = ai.prepare(request, snap(), AT)
    assert not baseline["review"]["days"][0]["missing_patterns"]
    assert not baseline["review"]["missing_focus"]
    ai.validate_plan(reply(request), request, baseline, context, AT, "synthetic")


def test_out_of_scope_ai_exercise_still_rejected():
    request = data(
        region_mode="selected",
        focus=UPPER,
        methods=["weights"],
        equipment=["Dumbbell"],
        split="full_body",
    )
    baseline, context = ai.prepare(request, snap(), AT)
    response = reply(request)
    response.days[0].exercises[0].movement_id = "bodyweight-squat"
    with pytest.raises(DomainError):
        ai.validate_plan(response, request, baseline, context, AT, "synthetic")


def test_region_scope_persists_with_approved_plan(client):
    request = data(
        region_mode="selected",
        focus=UPPER,
        methods=["weights", "calisthenics"],
        competencies=[],
        equipment=["Dumbbell", "Rings"],
    )
    base, context = ai.prepare(request, snap(), AT)
    result = ai.validate_plan(reply(request), request, base, context, AT, "synthetic")
    saved = write(client, cmd("program.create", **result["program"]))["entity"]
    assert saved["decisions"]["guided_choices"]["region_mode"] == "selected"
    assert saved["decisions"]["guided_choices"]["focus"] == UPPER
