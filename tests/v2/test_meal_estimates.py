"""Synthetic reference-portion previews, ownership, provenance and rollback."""

import pytest
from alos.meal_estimates import PortionChoice, estimate, is_estimated
from conftest import cmd, login
from test_daily_log import extraction, narrative, preview


def choose(client, review, **changes):
    return client.post(
        "/api/v2/daily-log-portion",
        json={
            "token": review["token"],
            "index": 1,
            "reference": "oats",
            "size": "unknown",
            **changes,
        },
    )


def test_portion_preview_save_edit_copy_report(client, app, monkeypatch):
    p = preview(client, monkeypatch)
    cursor = client.get("/api/v2/bootstrap").json()["cursor"]
    response = choose(client, p)
    assert response.status_code == 200, response.text
    p = response.json()
    assert client.get("/api/v2/bootstrap").json()["cursor"] == cursor
    assert (
        p["items"][1]["payload"]["protein_g"] == 8.4
        or p["items"][1]["payload"]["protein_g"] == 8.5
    )
    assert "orta porsiyon" in p["items"][1]["warning"]
    c = cmd("daily_log.save", token=p["token"], selected=[1])
    assert client.post("/api/v2/commands", json=c).status_code == 200
    assert client.post("/api/v2/commands", json=c).status_code == 200
    snapshot = client.get("/api/v2/bootstrap").json()
    assert len(snapshot["meals"]) == 1
    meal = snapshot["meals"][0]
    assert meal["grams"] is None  # no measured weight invented
    assert is_estimated(meal["nutrient_snapshot"])
    from alos.lifestyle import nutrition_summary

    assert nutrition_summary(snapshot, "2026-10-05")["estimated_entries"] == 1
    edit = cmd(
        "meal.save", entity_id=meal["id"], version=meal["version"], name="Yeni isim"
    )
    assert client.post("/api/v2/commands", json=edit).status_code == 200
    meal = client.get("/api/v2/bootstrap").json()["meals"][0]
    assert is_estimated(meal["nutrient_snapshot"])
    copy = cmd("meal.save", copy_from=meal["id"], name="Kopya", local_date="2026-10-06")
    assert client.post("/api/v2/commands", json=copy).status_code == 200
    assert all(
        is_estimated(m["nutrient_snapshot"])
        for m in client.get("/api/v2/bootstrap").json()["meals"]
    )


def test_portion_preserves_reported_values_and_can_remove(client, monkeypatch):
    parsed = extraction()
    parsed.entries[1].kcal = 30  # quote must support it; use matching synthetic quote
    parsed.entries[1].quote = narrative().messages[0]
    p = preview(client, monkeypatch, parsed)
    p = choose(client, p).json()
    assert p["items"][1]["payload"]["kcal"] == 30
    assert "kcal" not in p["items"][1]["estimate"]["estimated_fields"]
    p = choose(client, p, size="large").json()
    assert p["items"][1]["payload"]["kcal"] == 30
    p = choose(client, p, size="none").json()
    assert "protein_g" not in p["items"][1]["payload"]
    assert "estimate" not in p["items"][1]


def test_portion_owner_and_validation(client, app, monkeypatch):
    p = preview(client, monkeypatch)
    assert choose(login(app, "arda", "test-password-456"), p).status_code >= 400
    for fields in (
        {"index": 0},
        {"index": 29},
        {"reference": "invented"},
        {"count": 0},
        {"size": "huge"},
    ):
        assert choose(client, p, **fields).status_code >= 400
    assert not client.get("/api/v2/bootstrap").json()["meals"]


@pytest.mark.parametrize(
    "size,factor", [("small", 0.75), ("medium", 1), ("large", 1.5), ("unknown", 1)]
)
def test_portion_math(size, factor):
    values, meta = estimate(
        PortionChoice(
            token="test",
            index=0,
            reference="chicken_rice",
            size=size,
            count=2,
            oil="teaspoon",
        )
    )
    assert values["kcal"] == round(425 * factor * 2 + 45, 1)
    assert values["protein_g"] == round(36.4 * factor * 2, 1)
    assert meta["sources"] and meta["source"] == "estimated-reference-portion"
