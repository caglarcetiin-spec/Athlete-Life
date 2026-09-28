"""Synthetic sport context and identity regression tests; no provider requests."""

from datetime import timedelta

import pytest
from alos import ai_planning as ai
from alos.domain.science import compute
from alos.guided_planning import generate
from alos.movements import resolve
from alos.sports import SPORTS
from test_ai_planning import data, reply
from test_science import AT, setrow, snap


@pytest.mark.parametrize(
    "sport,method,equipment,movement",
    [
        ("swimming", "swimming", ["Pool"], "swim-freestyle"),
        ("running", "running", ["Outdoor"], "zone-2-run"),
    ],
)
def test_endurance_roundtrip(sport, method, equipment, movement):
    request = data(
        sport_ids=[sport],
        methods=[method],
        equipment=equipment,
        competencies=[{"movement_id": movement, "seconds": 1200}],
        objective="endurance",
        focus={},
        split="full_body",
        training_history="İki yıllık sentetik geçmiş",
        minutes=30,
        conditioning_minutes=20,
    )
    baseline, context = ai.prepare(request, snap(), AT)
    assert context["sports"][0]["id"] == sport
    assert context["training_history"] == request.training_history
    result = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic"
    )
    rows = [e for d in result["program"]["days"] for e in d["exercises"]]
    assert rows and all(e["movement_id"] == movement for e in rows)
    assert all(e["reps"] is None and e["rir"] is None for e in rows)
    assert all(
        d["estimated_minutes"] <= request.minutes for d in result["review"]["days"]
    )
    assert result["program"]["guided_choices"]["sport_ids"] == [sport]


def test_all_sports_context_valid_and_unknown_rejected():
    assert len(SPORTS) == 199
    for sport in SPORTS:
        request = data(sport_ids=[sport["id"]])
        assert ai.prepare(request, snap(), AT)[1]["sports"][0]["name"] == sport["name"]
    with pytest.raises(ValueError):
        data(sport_ids=["invented"])


def test_swimming_requires_pool_and_reported_stroke():
    for equipment, competencies in [
        ([], [{"movement_id": "swim-freestyle"}]),
        (["Pool"], []),
    ]:
        result = generate(
            data(
                sport_ids=["swimming"],
                methods=["swimming"],
                equipment=equipment,
                competencies=competencies,
            ),
            snap(),
            AT,
        )
        assert not any(d["exercises"] for d in result["program"]["days"])


def test_turkish_ring_hold_identity_and_time_decay():
    assert resolve({"name": "Halkada L tutuş"})["definition"]["id"] == "ring-l-sit"
    snapshot = snap(
        setrow(
            name="Halkada L tutuş",
            movement_id="ring-l-sit",
            modality="isometric",
            seconds=10,
            reps=None,
        )
    )
    now = compute(snapshot, AT)
    later = compute(snapshot, AT + timedelta(hours=24))
    assert (
        now["muscles"]["abs"]["isometric"]["high"]
        > later["muscles"]["abs"]["isometric"]["high"]
    )


def test_short_cardio_day_fits_budget():
    result = generate(
        data(
            methods=["running"],
            equipment=["Outdoor"],
            competencies=[{"movement_id": "zone-2-run", "seconds": 900}],
            minutes=15,
            conditioning_minutes=45,
        ),
        snap(),
        AT,
    )
    assert all(d["estimated_minutes"] <= 15 for d in result["review"]["days"])
