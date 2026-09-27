from copy import deepcopy

import pytest
from alos.guided_planning import GuidedRequest, generate
from alos.programming import ProgramInput
from pydantic import ValidationError
from test_science import AT, snap


def request(**changes):
    return GuidedRequest.model_validate(
        dict(
            experience="regular",
            objective="strength_hypertrophy",
            equipment=["Dumbbell", "Pull-Up Bar"],
            weekdays=[0, 2, 4],
            minutes=45,
            split="full_body",
            focus={"back": 3, "arms": 2},
            goal="Düzenli kuvvet çalışmak",
            name="Sentetik dönem",
            weeks=8,
            start_date="2026-09-28",
            adult=True,
            symptoms=False,
            **changes,
        )
    )


def replace(**changes):
    return GuidedRequest.model_validate(request().model_dump() | changes)


def test_generated_canonical_plan_is_valid_and_does_not_mutate_snapshot():
    snapshot = snap()
    before = deepcopy(snapshot)
    result = generate(request(), snapshot, AT)
    program = ProgramInput.model_validate(result["program"])
    assert program.guided_choices["focus"] == {"back": 3, "arms": 2}
    assert len([d for d in program.days if d.kind == "training"]) == 3
    assert snapshot == before
    assert all(e.external_kg is None for d in program.days for e in d.exercises)
    assert all(
        e.catalog_version and e.set_kind == "working"
        for d in program.days
        for e in d.exercises
    )
    assert all(d["estimated_minutes"] <= 45 for d in result["review"]["days"])


@pytest.mark.parametrize(
    "patch",
    [
        {"focus": {"back": 6}},
        {"focus": {"invented": 1}},
        {"weekdays": [0, 0]},
        {"weekdays": [0], "split": "upper_lower"},
        {"weekdays": [0, 2], "split": "push_pull_legs"},
        {"minutes": 0},
    ],
)
def test_invalid_choices_rejected(patch):
    with pytest.raises(ValidationError):
        replace(**patch)


def test_equipment_experience_and_split_change_actual_exercises():
    bare = generate(replace(equipment=[], experience="new"), snap(), AT)
    assert not any(
        e["movement_id"] in {"barbell-squat", "pull-up", "chin-up"}
        for d in bare["program"]["days"]
        for e in d["exercises"]
    )
    split = generate(
        replace(
            split="upper_lower",
            equipment=["Barbell", "Squat Rack", "Pull-Up Bar"],
            competencies=[{"movement_id": "barbell-squat", "reps": 10}],
        ),
        snap(),
        AT,
    )
    training = [d for d in split["program"]["days"] if d["kind"] == "training"]
    assert [d["label"] for d in training] == ["Üst vücut", "Alt vücut", "Üst vücut"]
    assert any(e["movement_id"] == "barbell-squat" for e in training[1]["exercises"])
    assert all(
        e["movement_id"] not in {"barbell-squat", "bodyweight-squat", "glute-bridge"}
        for e in training[0]["exercises"]
    )


def test_goal_and_time_are_used_and_missing_focus_is_explicit():
    strength = generate(replace(objective="strength"), snap(), AT)
    hypertrophy = generate(replace(objective="hypertrophy"), snap(), AT)
    assert (
        strength["program"]["days"][0]["exercises"][0]["reps"]
        != hypertrophy["program"]["days"][0]["exercises"][0]["reps"]
    )
    short = generate(replace(minutes=15, equipment=[], focus={"back": 5}), snap(), AT)
    assert all(d["estimated_minutes"] <= 15 for d in short["review"]["days"])
    assert short["review"]["missing_focus"] == ["back"]
    assert len(short["program"]["days"][0]["exercises"]) < len(
        strength["program"]["days"][0]["exercises"]
    )


@pytest.mark.parametrize("patch", [{"adult": False}, {"symptoms": True}])
def test_health_gate_keeps_days_but_does_not_generate_dose(patch):
    result = generate(replace(**patch), snap(), AT)
    assert all(not d["exercises"] for d in result["program"]["days"])
    assert sum(d["kind"] == "training" for d in result["program"]["days"]) == 3


def test_recorded_minor_cannot_bypass_age_gate():
    snapshot = snap()
    snapshot["profiles"] = [
        {
            "id": "synthetic",
            "version": 1,
            "birth_date": "2015-01-01",
            "experience": "regular",
        }
    ]
    result = generate(request(), snapshot, AT)
    assert all(not d["exercises"] for d in result["program"]["days"])


def test_api_generation_is_read_only_then_choices_persist_on_accept(client):
    from conftest import cmd
    from test_core import write

    before = client.get("/api/v2/bootstrap").json()
    response = client.post(
        "/api/v2/guided-program-drafts", json=request().model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    assert client.get("/api/v2/bootstrap").json()["programs"] == before["programs"]
    result = write(client, cmd("program.create", **response.json()["program"]))
    assert result
    programs = client.get("/api/v2/bootstrap").json()["programs"]
    assert programs[0]["decisions"]["guided_choices"]["focus"] == {"back": 3, "arms": 2}
    assert programs[0]["status"] == "draft"
