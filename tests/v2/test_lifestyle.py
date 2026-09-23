from concurrent.futures import ThreadPoolExecutor

from alos.lifestyle import DEFINITIONS
from conftest import cmd, login
from test_core import write


def test_nutrition_unknown_partial_complete_and_dedup(client):
    assert client.get("/api/v2/nutrition-summary?on=2026-09-15").json() == {
        "status": "not_logged",
        "entries": 0,
        "totals": {
            k: None for k in ["kcal", "protein_g", "carbs_g", "fat_g", "fiber_g"]
        },
        "water_ml": None,
        "source_ids": [],
    }
    meal = write(
        client,
        cmd(
            "meal.save",
            local_date="2026-09-15",
            name="Breakfast",
            grams="60,5",
            kcal=240,
        ),
    )
    assert meal["entity"]["protein_g"] is None
    summary = client.get("/api/v2/nutrition-summary?on=2026-09-15").json()
    assert summary["status"] == "partial" and summary["totals"]["protein_g"] is None
    water = cmd("hydration.save", local_date="2026-09-15", ml=250)
    for _ in range(5):
        write(client, water)
    write(client, cmd("nutrition_day.save", local_date="2026-09-15", status="complete"))
    summary = client.get("/api/v2/nutrition-summary?on=2026-09-15").json()
    assert summary["status"] == "complete" and summary["water_ml"] == 250
    assert (
        client.get("/api/v2/nutrition-summary?on=2026-09-16").json()["status"]
        == "not_logged"
    )


def test_food_recipe_consumption_snapshot_and_owner(client, app):
    food = write(
        client,
        cmd(
            "food.save",
            name="Synthetic oats",
            kcal=400,
            protein_g=12,
            carbs_g=60,
            fat_g=8,
        ),
    )["entity"]
    recipe = write(
        client,
        cmd(
            "recipe.save",
            name="Oats bowl",
            total_grams=100,
            ingredients=[{"food_id": food["id"], "grams": 100}],
        ),
    )["entity"]
    meal = write(
        client,
        cmd(
            "meal.save",
            name="My bowl",
            local_date="2026-09-15",
            grams=50,
            recipe_id=recipe["id"],
        ),
    )["entity"]
    assert meal["kcal"] == 200 and meal["protein_g"] == 6
    write(client, cmd("food.save", food["id"], food["version"], kcal=500))
    write(
        client,
        cmd(
            "recipe.save",
            recipe["id"],
            recipe["version"],
            ingredients=[{"food_id": food["id"], "grams": 100}],
        ),
    )
    past = next(
        r
        for r in client.get("/api/v2/bootstrap").json()["meals"]
        if r["id"] == meal["id"]
    )
    assert past == meal
    edited = write(client, cmd("meal.save", meal["id"], meal["version"], grams=60))[
        "entity"
    ]
    assert edited["kcal"] == 240  # original 400/100, not today's revised 500/100
    other = login(app, "arda", "test-password-456")
    assert (
        other.post(
            "/api/v2/commands",
            json=cmd(
                "meal.save",
                local_date="2026-09-15",
                name="Unauthorized",
                grams=50,
                recipe_id=recipe["id"],
            ),
        ).status_code
        == 404
    )


def test_checkin_shift_do_not_overwrite_and_sleep_overnight(app, client):
    checkin = write(
        client, cmd("checkin.save", local_date="2026-09-15", energy=7, stress=3)
    )["entity"]
    other = login(app)
    with ThreadPoolExecutor(max_workers=2) as pool:
        a = pool.submit(
            write,
            client,
            cmd(
                local_date="2026-09-15",
                status="work",
                start_local="22:00",
                end_local="06:00",
            ),
        )
        b = pool.submit(write, other, cmd("checkin.save", checkin["id"], 1, energy=8))
        a.result()
        b.result()
    snap = client.get("/api/v2/bootstrap").json()
    assert snap["checkins"][0]["energy"] == 8 and snap["checkins"][0]["stress"] == 3
    sleep = write(
        client,
        cmd(
            "sleep.save",
            start_date="2026-09-14",
            start_time="23:00",
            end_date="2026-09-15",
            end_time="07:00",
            quality=7,
        ),
    )["entity"]
    assert sleep["start_at"] == "2026-09-14T20:00:00+00:00"
    assert sleep["end_at"] == "2026-09-15T04:00:00+00:00"
    assert snap["checkins"][0]["sleep_quality"] is None


def test_capability_protocol_variant_side_units_and_delete(client):
    def measurement(variant, value, unit="seconds", definition="front_lever"):
        return write(
            client,
            cmd(
                "capability.save",
                local_date="2026-09-15",
                definition_id=definition,
                protocol_version="self-test-1",
                variant=variant,
                side="unknown",
                equipment="bar",
                value=value,
                unit=unit,
            ),
        )["entity"]

    measurement("tuck", 20)
    measurement("full", 5)
    other = measurement("full", 0.1, "min")
    series = client.get("/api/v2/capability-series").json()["series"]
    assert len(series) == 2
    current = next(s for s in series if s["variant"] == "full")
    assert current["best"]["value"] == 6 and current["missing"]
    write(client, cmd("capability.delete", other["id"], 1))
    current = next(
        s
        for s in client.get("/api/v2/capability-series").json()["series"]
        if s["variant"] == "full"
    )
    assert current["best"]["value"] == 5
    assert (
        client.post(
            "/api/v2/commands",
            json=cmd(
                "capability.save",
                local_date="2026-09-15",
                definition_id="front_lever",
                protocol_version="v1",
                variant="full",
                value=20,
                unit="kg",
            ),
        ).status_code
        == 422
    )
    assert client.get("/api/v2/catalogs").status_code == 200
    assert len(client.get("/api/v2/catalogs").json()["sports"]["sports"]) == 199
    assert "ring_muscle_up" in DEFINITIONS and "ring_rto_support" in DEFINITIONS
    names = {row["domain"] for row in DEFINITIONS.values()}
    assert {
        "balance_control",
        "mobility",
        "work_capacity",
        "endurance",
        "calisthenics",
    } <= names


def test_health_optional_cycle_episode_goal_labs_and_social(client, app):
    assert (
        client.post(
            "/api/v2/commands",
            json=cmd("cycle.save", local_date="2026-09-15", bleeding="light"),
        ).status_code
        == 422
    )
    write(
        client, cmd("profile.save", sex="female", cycle_tracking=True, experience="new")
    )
    write(
        client, cmd("cycle.save", local_date="2026-09-15", bleeding="light", symptoms=2)
    )
    write(
        client,
        cmd(
            "episode.save",
            kind="illness",
            start_date="2026-09-08",
            resolved_date="2026-09-14",
            return_until="2026-09-20",
        ),
    )
    goal = write(
        client,
        cmd(
            "goal.save",
            title="Target",
            metric="weight",
            baseline=70,
            target=72,
            unit="kg",
            start_date="2026-09-15",
            target_date="2026-12-15",
        ),
    )["entity"]
    write(
        client,
        cmd(
            "goal_measurement.save",
            goal_id=goal["id"],
            local_date="2026-09-16",
            value="70,5",
        ),
    )
    write(
        client,
        cmd(
            "lab.save",
            local_date="2026-09-15",
            analyte="Synthetic analyte",
            value=12,
            unit="reported unit",
            reference_low=8,
            reference_high=15,
        ),
    )
    event = write(
        client,
        cmd(
            "event.save",
            local_date="2026-09-15",
            title="Dinner",
            kind="social",
            status="planned",
        ),
    )
    assert event["entity"]["duration_seconds"] is None
    other = login(app, "arda", "test-password-456")
    assert (
        other.post(
            "/api/v2/commands",
            json=cmd(
                "goal_measurement.save",
                goal_id=goal["id"],
                local_date="2026-09-16",
                value=80,
            ),
        ).status_code
        == 404
    )
    assert other.get("/api/v2/bootstrap").json()["labs"] == []


def test_every_lifestyle_record_is_in_export(client, app_factory):
    import json

    entities = [
        ("hydration", {"ml": 250}),
        ("checkin", {"energy": 7}),
        ("pain", {"area": "knee", "intensity": 2}),
        ("measurement", {"metric": "weight", "value": 70, "unit": "kg"}),
        (
            "capability",
            {
                "definition_id": "plank_hold",
                "protocol_version": "v1",
                "variant": "standard",
                "value": 40,
                "unit": "seconds",
            },
        ),
    ]
    for kind, fields in entities:
        write(client, cmd(kind + ".save", local_date="2026-09-15", **fields))
    package = client.get("/api/v2/backups/export").json()
    restored = login(app_factory())
    stage = restored.post("/api/v2/imports/stage", content=json.dumps(package)).json()
    write(restored, cmd("import.apply", stage["id"], 1))
    second = restored.get("/api/v2/backups/export").json()
    for kind, _ in entities:
        assert package["counts"][kind] == second["counts"][kind] == 1
        assert {k: v for k, v in package["records"][kind][0].items() if k != "id"} == {
            k: v for k, v in second["records"][kind][0].items() if k != "id"
        }


def test_legacy_nutrition_water_capability_unknown_mass_and_native_restore(client):
    data = {
        "foodLogs": {
            "2026-09-15": [
                {"name": "Oats", "kcal": 200, "p": 8, "serv": "1 bowl", "unknown": 99}
            ]
        },
        "water": {"2026-09-15": 500, "2026-09-16": 300},
        "waterLogs": {"2026-09-15": [{"ml": 250}, {"ml": 250}]},
        "capabilityRecords": [
            {
                "date": "2026-09-15",
                "testId": "front_lever",
                "value": 10,
                "domain": "calisthenics",
            }
        ],
        "daily": {"2026-09-15": {"energy": 4, "fatigueLevel": 3, "weight": 70}},
        "unknown_field": {"keep": True},
    }
    stage = client.post("/api/v2/imports/stage", json=data).json()
    write(client, cmd("import.apply", stage["id"], 1))
    snap = client.get("/api/v2/bootstrap").json()
    assert len(snap["meals"]) == 1 and snap["meals"][0]["grams"] is None
    assert snap["meals"][0]["protein_g"] == 8 and snap["meals"][0]["carbs_g"] is None
    assert sum(r["ml"] for r in snap["hydrations"]) == 800
    assert (
        len(snap["capabilitys"]) == 1
        and snap["capabilitys"][0]["time_precision"] == "date_only"
    )
    assert snap["checkins"][0]["energy"] is None and snap["checkins"][0]["fatigue"] == 3
    assert len(snap["measurements"]) == 1
