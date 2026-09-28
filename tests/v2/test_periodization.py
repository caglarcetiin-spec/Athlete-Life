"""Synthetic phase contract and actual scheduler integration."""

import pytest
from alos import ai_planning as ai
from alos.periodization import apply
from alos.programming import ProgramInput
from test_ai_planning import data, reply
from test_science import AT, snap


@pytest.mark.parametrize("weeks", [4, 8, 12])
def test_phase_week_coverage_and_payload(weeks):
    request = data(
        weeks=weeks,
        progression_mode="phased",
        target_rir=2,
        goal="Halka ve barfikste kontrollü tekrar sayısını artırmak",
    )
    baseline, context = ai.prepare(request, snap(), AT)
    assert context["goal"] == request.goal
    assert context["target_rir"] == 2
    assert context["periodization_policy"]["phases"][-1]["last_week"] == weeks
    result = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic", "EVREN"
    )
    plan = ProgramInput.model_validate(result["program"])
    for week in range(1, weeks + 1):
        days = [d for d in plan.days if d.first_week <= week <= (d.last_week or weeks)]
        assert len(days) == len(baseline["program"]["days"])
        assert len({d.weekday for d in days}) == len(days)
        for day in days:
            base = next(
                d for d in baseline["program"]["days"] if d["weekday"] == day.weekday
            )
            for e in day.exercises:
                original = next(
                    x for x in base["exercises"] if x["movement_id"] == e.movement_id
                )
                assert e.sets <= original["sets"]
                assert e.external_kg == original.get("external_kg")
                if e.modality == "strength" and e.rir is not None:
                    assert e.rir == (2 if week % 4 in (2, 3) else 3)
                else:
                    assert e.rir == original.get("rir")
    assert plan.guided_choices["progression_mode"] == "phased"
    assert any("İlerleme koşulu" in n for n in result["notes"])


def test_repeat_and_non_strength_not_reclassified():
    request = data(progression_mode="phased")
    program = {
        "days": [
            {
                "label": "Koşu",
                "weekday": 0,
                "kind": "training",
                "exercises": [
                    {
                        "movement_id": "run",
                        "modality": "cardio",
                        "sets": 1,
                        "seconds": 1200,
                        "rir": None,
                    }
                ],
            }
        ]
    }
    output, notes = apply(program, request)
    assert output == program and notes
    output, notes = apply(program, data(progression_mode="repeat"))
    assert output == program and not notes


def test_generated_phases_persist_and_materialize(client):
    from datetime import timedelta

    from conftest import cmd
    from test_core import write
    from test_workouts import prescription

    request = data(weeks=4, progression_mode="phased", target_rir=2)
    baseline, context = ai.prepare(request, snap(), AT)
    result = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic", "EVREN"
    )
    created = write(client, cmd("program.create", **result["program"]))
    program = write(client, cmd("program.activate", created["entity"]["id"], 1))[
        "entity"
    ]
    assert program["decisions"]["guided_choices"]["target_rir"] == 2
    days = [
        c["entity"]
        for c in created["changes"]
        if c["kind"] == "program_day" and c["entity"]["kind"] == "training"
    ]
    first = next(d for d in days if d["first_week"] == 1)
    fourth = next(
        d for d in days if d["first_week"] == 4 and d["weekday"] == first["weekday"]
    )
    day = request.start_date + timedelta(
        days=(first["weekday"] - request.start_date.weekday()) % 7
    )
    before = prescription(client, program, first, day.isoformat())
    after = prescription(
        client, program, fourth, (day + timedelta(weeks=3)).isoformat()
    )
    before_slots = [c for c in before["changes"] if c["kind"] == "slot"]
    after_slots = [c for c in after["changes"] if c["kind"] == "slot"]
    assert len(after_slots) < len(before_slots)
