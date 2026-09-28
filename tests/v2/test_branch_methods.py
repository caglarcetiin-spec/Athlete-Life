"""Synthetic per-branch method selection, no external provider calls."""

import pytest
from alos import ai_planning as ai
from alos.guided_planning import GuidedRequest, generate
from alos.sport_training import active_sports, coverage, methods_for
from pydantic import ValidationError
from test_ai_planning import reply
from test_science import AT, snap
from test_sport_training import branch


@pytest.mark.parametrize("profile", coverage(), ids=lambda p: p["sport_id"])
def test_every_catalog_branch_exposes_real_methods(profile):
    options = profile["method_options"]
    assert {m["id"] for m in options} == {
        "sport_technique",
        "sport_practice",
        "sport_tactics",
    }
    assert all(profile["name"] in m["label"] for m in options)
    assert profile["techniques"][0]["name"] in options[0]["description"]
    assert options[0]["automatic"] == profile["automatic_physical_dose"]
    assert options[2]["automatic"] is True


def mixed():
    return branch(
        "road-cycling",
        sport_ids=["road-cycling", "alpine-skiing"],
        methods=["sport_technique", "sport_tactics"],
        sport_methods={
            "road-cycling": ["sport_technique"],
            "alpine-skiing": ["sport_tactics"],
        },
    )


def test_mixed_methods_are_isolated_in_candidates_days_and_ai_validation():
    data = mixed()
    baseline, context = ai.prepare(data, snap(), AT)
    assert context["sport_methods"] == data.sport_methods
    for day in context["day_split"]:
        expected = data.sport_methods[day["sport_id"]]
        assert day["required_methods"] == expected
        candidates = {c["movement_id"]: c for c in context["eligible_movements"]}
        assert all(
            set(candidates[key]["methods"]) <= set(expected)
            for key in day["allowed_movement_ids"]
        )
    result = ai.validate_plan(reply(data), data, baseline, context, AT, "synthetic")
    assert result["program"]["guided_choices"]["sport_methods"] == data.sport_methods
    assert any(d["exercises"] for d in result["program"]["days"])


def test_native_support_sport_does_not_get_an_unselected_technical_day():
    data = branch(
        "boxing",
        sport_ids=["boxing", "running"],
        methods=["sport_tactics", "running"],
        sport_methods={"boxing": ["sport_tactics"], "running": []},
        equipment=["Road"],
        competencies=[],
    )
    assert active_sports(data) == ["boxing"]
    result = generate(data, snap(), AT)
    assert all(
        d["label"] == "Boks"
        for d in result["program"]["days"]
        if d["kind"] == "training"
    )


@pytest.mark.parametrize(
    "mapping",
    [
        {"unknown": ["sport_technique"]},
        {"boxing": ["running"]},
        {"boxing": ["sport_tactics"]},
        {"boxing": ["sport_technique", "sport_technique"]},
        {"boxing": []},
    ],
)
def test_inconsistent_mapping_is_rejected(mapping):
    with pytest.raises(ValidationError):
        branch(sport_methods=mapping)


def test_legacy_requests_keep_global_branch_semantics():
    data = branch()
    assert methods_for(data, "boxing") == {"sport_technique", "sport_practice"}
    assert (
        GuidedRequest.model_validate(
            data.model_dump(exclude={"consent", "sport_methods"})
        ).sport_methods
        == {}
    )


def test_branch_method_map_persists_after_explicit_acceptance(client):
    from conftest import cmd
    from test_core import write

    data = mixed()
    response = client.post(
        "/api/v2/guided-program-drafts",
        json=data.model_dump(mode="json", exclude={"consent"}),
    )
    assert response.status_code == 200, response.text
    result = write(client, cmd("program.create", **response.json()["program"]))
    item = next(
        p
        for p in client.get("/api/v2/bootstrap").json()["programs"]
        if p["id"] == result["entity"]["id"]
    )
    assert item["decisions"]["guided_choices"]["sport_methods"] == data.sport_methods
