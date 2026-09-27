"""Synthetic mixed-method plan and canonical actual-report pipeline."""

import pytest
from alos.guided_planning import generate
from alos.programming import ProgramInput
from conftest import cmd
from pydantic import ValidationError
from test_core import write
from test_guided_planning import replace
from test_science import AT, snap
from test_workouts import actual, prescription, session


def hybrid(**changes):
    return replace(
        **(
            {
                "equipment": ["EZ Bar", "Pull-Up Bar", "Outdoor", "Rings"],
                "methods": ["weights", "calisthenics", "gymnastics", "conditioning"],
                "experience": "advanced",
                "objective": "hypertrophy",
                "weekdays": [0, 1, 3, 4],
                "minutes": 75,
                "split": "upper_lower",
                "start_date": "2026-09-14",
                "competencies": [
                    {"movement_id": "front-lever", "seconds": 10},
                    {"movement_id": "muscle-up", "reps": 5},
                    {"movement_id": "pull-up", "reps": 12},
                    {"movement_id": "ring-dip", "reps": 10},
                ],
            }
            | changes
        )
    )


def exercises(result):
    return [e for d in result["program"]["days"] for e in d["exercises"]]


def test_hybrid_fits_equipment_capacity_time_and_has_main_patterns():
    result = generate(hybrid(), snap(), AT)
    ProgramInput.model_validate(result["program"])
    rows = exercises(result)
    ids = {e["movement_id"] for e in rows}
    assert {"ez-bar-row", "ez-bar-rdl", "front-lever", "muscle-up"} <= ids
    assert not any("dumbbell" in key or "barbell" in key for key in ids)
    assert all(
        d["estimated_minutes"] <= 75 and not d["missing_patterns"]
        for d in result["review"]["days"]
    )
    upper = result["review"]["days"][0]
    assert upper["working_sets"] >= 12
    assert {"horizontal_push", "horizontal_pull", "vertical_push", "vertical_pull"} <= {
        b["family"] for b in upper["blocks"]
    }
    for e in rows:
        if e["movement_id"] == "front-lever":
            assert e["seconds"] <= 6 and e["reps"] is None and e["rir"] is None
        if e["movement_id"] == "muscle-up":
            assert e["reps"] <= 3 and e["modality"] == "skill"
        assert e.get("external_kg") is None
    assert result["review"]["conditioning_seconds"] == 4 * 600


def test_experience_never_substitutes_for_skill_or_equipment():
    unknown = generate(hybrid(competencies=[]), snap(), AT)
    assert not {"front-lever", "muscle-up", "pull-up"} & {
        e["movement_id"] for e in exercises(unknown)
    }
    bare = generate(hybrid(equipment=[]), snap(), AT)
    assert not {"front-lever", "muscle-up", "ez-bar-row"} & {
        e["movement_id"] for e in exercises(bare)
    }
    assert bare["review"]["status"] == "needs_review"


@pytest.mark.parametrize("minutes", [15, 30, 45, 60, 75, 90])
def test_budget_is_enforced_even_with_many_requested_skills(minutes):
    result = generate(hybrid(minutes=minutes), snap(), AT)
    assert all(d["estimated_minutes"] <= minutes for d in result["review"]["days"])
    ProgramInput.model_validate(result["program"])


@pytest.mark.parametrize(
    "competencies",
    [
        [{"movement_id": "front-lever", "reps": 5}],
        [{"movement_id": "muscle-up", "seconds": 5}],
        [{"movement_id": "invented", "reps": 5}],
        [{"movement_id": "pull-up"}, {"movement_id": "pull-up"}],
    ],
)
def test_incompatible_capacities_rejected(competencies):
    with pytest.raises(ValidationError):
        hybrid(competencies=competencies)


def test_plan_actual_and_muscle_report_share_canonical_ids(client):
    data = hybrid()
    preview = client.post(
        "/api/v2/guided-program-drafts", json=data.model_dump(mode="json")
    )
    assert preview.status_code == 200, preview.text
    assert client.get("/api/v2/bootstrap").json()["sets"] == []
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
    slots = [c["entity"] for c in rx["changes"] if c["kind"] == "slot"]
    saved = []
    for key in ("front-lever", "muscle-up", "ez-bar-row"):
        slot = next(s for s in slots if s["movement_id"] == key)
        saved.append(
            write(
                client,
                actual(
                    client,
                    current,
                    slot,
                    reps=slot["reps"],
                    seconds=slot["seconds"],
                    occurred_at="2026-09-14T12:00:00Z",
                ),
            )["entity"]
        )

    def report():
        response = client.get(
            "/api/v2/analysis",
            params={"as_of": "2026-09-15T12:00:00Z", "window_days": 7},
        )
        assert response.status_code == 200, response.text
        return response.json()

    channels = report()["recorded_distribution"]["lats"]
    assert channels["isometric"]["amount"] > 0
    assert channels["skill"]["amount"] > 0
    assert channels["strength"]["amount"] > 0
    assert channels["isometric"]["source_ids"] == [saved[0]["id"]]
    assert channels["skill"]["source_ids"] == [saved[1]["id"]]
    assert channels["strength"]["source_ids"] == [saved[2]["id"]]
    write(client, cmd("set.delete", saved[2]["id"], saved[2]["version"]))
    assert "strength" not in report()["recorded_distribution"]["lats"]
    assert (
        client.get("/api/v2/bootstrap").json()["programs"][0]["decisions"][
            "guided_model_version"
        ]
        == "guided-hybrid-2"
    )


def test_conditioning_only_does_not_invent_strength_work():
    result = generate(hybrid(methods=["conditioning"], focus={}), snap(), AT)
    assert all(e["modality"] == "cardio" for e in exercises(result))
    assert all(not d["missing_patterns"] for d in result["review"]["days"])
    assert result["review"]["status"] == "draft"
