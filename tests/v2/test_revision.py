from copy import deepcopy

import pytest
from alos.domain.science import compute
from alos.domain.workouts import Targets
from alos.lifestyle import CapabilityInput, nutrition_summary
from alos.movements import VERSION, resolve
from pydantic import ValidationError
from test_science import AT, setrow, snap


def test_canonical_squat_identity_and_turkish_aliases():
    assert (
        resolve({"movement_id": "barbell-squat", "name": "Squat"})["status"]
        == "matched"
    )
    assert (
        resolve({"movement_id": "barbell-squat"})["definition"]["load_kind"]
        == "external"
    )
    assert (
        resolve({"name": "  VÜCUT AĞIRLIĞIYLA ÇÖMELME  "})["definition"]["id"]
        == "bodyweight-squat"
    )
    assert (
        resolve({"movement_id": "squat", "name": "Vücut ağırlığıyla çömelme"})[
            "definition"
        ]["id"]
        == "bodyweight-squat"
    )
    assert resolve({"name": "Squat"})["status"] == "ambiguous"
    assert resolve({"name": "Made up exercise"})["status"] == "unmatched"


def test_record_coverage_distribution_and_quantity_do_not_require_external_load():
    rows = [
        setrow(
            id=str(i),
            movement_id="barbell-squat",
            name="Squat",
            reps=10,
            external_kg=60,
            rir=2,
        )
        for i in range(3)
    ]
    rows += [
        setrow(id="bw", movement_id="bodyweight-squat", external_kg=None),
        setrow(id="unknown", movement_id="custom-z", name="Custom"),
    ]
    result = compute(snap(*rows), AT)
    assert result["catalog_version"] == VERSION
    assert result["coverage"]["total_sets"] == 5
    assert result["coverage"]["analyzed_sets"] == 4
    assert result["coverage"]["unmapped_loads"][0]["code"] == "unmatched"
    assert result["recorded_distribution"]["quads"]["strength"]["amount"] == 4
    assert sum(r["reps"] for r in rows[:3]) == 30
    assert sum(r["reps"] * r["external_kg"] for r in rows[:3]) == 1800
    assert result["set_counts"] == {"working": 0, "warmup": 0, "unknown": 5}


def test_known_nutrients_and_missing_scope_survive_partial_day():
    original = {
        "meals": [
            {"id": "a", "local_date": "2026-09-15", "kcal": 300, "protein_g": 15},
            {"id": "b", "local_date": "2026-09-15", "kcal": 100},
        ]
    }
    before = deepcopy(original)
    result = nutrition_summary(original, "2026-09-15")
    assert result["totals"]["kcal"] == 400
    assert result["totals"]["protein_g"] == 15
    assert result["missing_counts"]["protein_g"] == 1
    assert result["totals"]["fat_g"] is None
    assert original == before


def test_back_squat_rejects_time_protocol_and_keeps_measured_load():
    fields = {
        "definition_id": "squat",
        "local_date": "2026-09-15",
        "protocol_version": "recorded-load-1",
        "variant": "standard",
        "value": 100,
        "components": {"reps": 5},
    }
    assert CapabilityInput(**fields, unit="kg").value == 100
    with pytest.raises(ValidationError):
        CapabilityInput(**fields, unit="seconds")


def test_additive_set_semantics_preserve_unknown_and_zero():
    record = Targets(movement_id="barbell-squat", name="Squat", external_kg=0)
    assert record.set_kind == "unknown" and record.external_kg == 0
    assert record.catalog_version is None
    with pytest.raises(ValidationError):
        Targets(movement_id="barbell-squat", name="Squat", set_kind="inferred")


def test_mapping_preview_repeat_and_lossless_rollback():
    from alos.movement_migration import preview, transform

    original = {
        "set": [
            {
                "id": "a",
                "version": 1,
                "movement_id": "legacy",
                "name": "Vücut ağırlığıyla çömelme",
                "unknown_extra": {"keep": True},
            },
            {"id": "b", "version": 1, "name": "Squat"},
        ]
    }
    plan = preview(original)
    assert plan["counts"]["matched"] == 1 and plan["counts"]["ambiguous"] == 1
    migrated = transform(original, plan)
    assert migrated["set"][0]["movement_id"] == "bodyweight-squat"
    assert migrated == transform(migrated, plan)
    assert transform(migrated, plan, rollback=True) == original
    assert migrated["set"][1] == original["set"][1]


def test_equipment_context_is_frozen_and_feedback_is_not_set_effort(client):
    from conftest import cmd
    from test_core import write

    prefs = {
        "goal": "Strength",
        "weekdays": [1, 3],
        "minutes": 30,
        "equipment_profiles": [
            {
                "id": "home",
                "name": "Home",
                "revision": 1,
                "equipment": ["Dumbbell"],
                "available_kg": [5, 10],
            }
        ],
        "active_equipment_id": "home",
        "optional_modules": [],
    }
    profile = write(
        client, cmd("profile.save", experience="regular", planning_preferences=prefs)
    )["entity"]
    session = write(
        client, cmd("session.open", local_date="2026-09-15", title="Synthetic")
    )["entity"]
    assert session["planning_context"]["equipment"]["revision"] == 1
    updated = deepcopy(prefs)
    updated["equipment_profiles"][0].update(revision=2, available_kg=[20])
    write(
        client,
        cmd(
            "profile.save",
            profile["id"],
            profile["version"],
            planning_preferences=updated,
        ),
    )
    feedback = write(
        client,
        cmd(
            "session.feedback",
            session["id"],
            session["version"],
            duration_seconds=1800,
            session_rpe=6,
            feasibility="manageable",
        ),
    )["entity"]
    assert feedback["planning_context"]["equipment"]["available_kg"] == [5, 10]
    assert feedback["feedback"]["session_load_au"] == 180
    assert client.get("/api/v2/bootstrap").json()["sets"] == []


def test_copy_meal_retains_source_values_and_missing_macros(client):
    from conftest import cmd
    from test_core import write

    source = write(
        client,
        cmd(
            "meal.save",
            local_date="2026-09-15",
            name="Synthetic portion",
            grams=150,
            kcal=300,
            protein_g=15,
        ),
    )["entity"]
    copied = write(
        client,
        cmd(
            "meal.save",
            local_date="2026-09-16",
            name="Copy",
            copy_from=source["id"],
            grams=75,
        ),
    )["entity"]
    assert (
        copied["kcal"] == 150 and copied["protein_g"] == 7.5 and copied["fat_g"] is None
    )
    assert copied["nutrient_snapshot"]["copied_version"] == source["version"]
    write(client, cmd("meal.save", source["id"], source["version"], kcal=400))
    saved = next(
        r
        for r in client.get("/api/v2/bootstrap").json()["meals"]
        if r["id"] == copied["id"]
    )
    assert saved["kcal"] == 150


def test_duration_unknowns_alternatives_and_optional_modules():
    from alos.planning_context import alternatives, duration_preview

    days = [{"exercises": [{"sets": 3, "rest_seconds": 90}]}]
    assert duration_preview(days)["estimated_seconds"] is None
    assert duration_preview(days, 30, 10)["estimated_seconds"] == 270
    assert alternatives("barbell-squat", None) == []
    assert all(
        r["movement_id"] != "barbell-squat"
        for r in alternatives("bodyweight-squat", ["Dumbbell"])
    )
    data = snap()
    data["profiles"] = [
        {"id": "p", "version": 1, "planning_preferences": {"optional_modules": []}}
    ]
    report = compute(data, AT)
    assert "Su kaydı" not in report["coverage"]["missing"]
    assert "Tamamlanmış beslenme günlüğü" not in report["coverage"]["missing"]


def test_csv_exact_units_unknowns_formula_safety_and_atomic_import(client, app):
    from alos.csv_transfer import export, parse
    from conftest import cmd
    from test_core import write

    package = {
        "format": "alos-csv-1",
        "csv": "date,name,movement_id,reps,external_kg,load_unit\n2026-09-15,Squat,barbell-squat,10,60,kg\n2026-09-15,Unknown,,,0,kg\n",
    }
    staged = client.post("/api/v2/imports/stage", json=package).json()
    assert staged["summary"]["errors"][0]["line"] == 3
    rejected = client.post(
        "/api/v2/commands", json=cmd("import.apply", staged["id"], staged["version"])
    )
    assert rejected.status_code == 422
    assert client.get("/api/v2/bootstrap").json()["sets"] == []
    package["csv"] = (
        "date,name,movement_id,reps,external_kg,load_unit\n2026-09-15,Squat,barbell-squat,10,60,kg\n"
    )
    staged = client.post("/api/v2/imports/stage", json=package).json()
    operation = cmd("import.apply", staged["id"], staged["version"])
    first = write(client, operation)
    assert write(client, operation) == first
    assert (
        client.post("/api/v2/imports/stage", json=package).json()["status"] == "applied"
    )
    data = client.get("/api/v2/bootstrap").json()
    assert len(data["sets"]) == 1 and data["sets"][0]["external_kg"] == 60
    other = isolated_other_client(app)
    assert other.get("/api/v2/bootstrap").json()["sets"] == []
    row = data["sets"][0]
    text = export([{**row, "name": "=2+2"}])
    assert "'=2+2" in text
    bad = parse(
        {"csv": "date,name,reps,external_kg,load_unit\n09/10/2026,Squat,10,60,kg\n"}
    )
    assert bad["errors"] and not bad["rows"]


def test_report_scope_preview_and_saved_owner_boundary(client, app):
    from conftest import cmd
    from test_core import write

    write(
        client,
        cmd(
            "pain.save",
            local_date="2026-09-15",
            area="Synthetic private area",
            intensity=8,
        ),
    )
    captured = write(
        client, cmd("analysis.capture", as_of=AT.isoformat(), window_days=7)
    )["entity"]
    url = "/api/v2/reports/preview?saved_id=" + captured["id"] + "&selection=training"
    preview = client.get(url)
    assert preview.status_code == 200
    assert (
        "Synthetic private area" not in preview.text
        and "sağlık kayıtları" not in preview.text
    )
    assert preview.json()["window"]["days"] == 7
    pdf = client.get(
        "/api/v2/reports/pdf?saved_id="
        + captured["id"]
        + "&selection=training&expected_digest="
        + preview.json()["input_digest"]
    )
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")
    assert client.get(url + "&expected_digest=stale").status_code == 409
    other = isolated_other_client(app)
    assert other.get(url).status_code == 404
    assert other.get(url.replace("preview", "pdf")).status_code == 404


def isolated_other_client(app):
    import secrets

    from alos.auth import create_user
    from conftest import login

    secret = secrets.token_urlsafe(24)
    with app.state.database.sessions.begin() as db:
        create_user(db, "revision-other", "Synthetic Other", secret)
    return login(app, username="revision-other", password=secret)


def test_night_shift_explicit_sleep_and_adjacent_shift_conflicts():
    from datetime import date

    from alos.domain.scheduling import propose_week

    row = {
        "id": "shift",
        "version": 1,
        "local_date": "2026-09-14",
        "timezone": "Europe/Istanbul",
        "status": "work",
        "start_local": "22:00",
        "end_local": "06:00",
        "commute_min": 30,
        "prep_min": 30,
        "pinned": False,
    }
    start = date(2026, 9, 14)
    assert propose_week(start, [row])[0]["window"] is None
    row.update(
        available_start_local="06:00",
        available_end_local="18:00",
        sleep_start_local="07:00",
        sleep_end_local="15:00",
        training_minutes=60,
    )
    result = propose_week(start, [row])[0]
    assert result["window"] == "15:00" and result["window_date"] == "2026-09-15"
    row["available_end_local"] = "15:30"
    assert propose_week(start, [row])[0]["window"] is None
    row["available_end_local"] = "18:00"
    next_shift = {
        **row,
        "id": "next",
        "local_date": "2026-09-15",
        "start_local": "15:30",
        "end_local": "23:00",
    }
    assert propose_week(start, [row, next_shift])[0]["window"] is None


def test_five_sets_three_mapped_warmup_and_superset_are_separate():
    records = [
        setrow(
            id=str(i),
            movement_id="barbell-squat",
            name="Barbell Squat",
            set_kind="warmup" if i < 2 else "working",
            superset_group="A",
            sequence=i,
            reps=10,
            external_kg=60,
            rir=2,
        )
        for i in range(5)
    ]
    records[3].update(movement_id="custom-z", name="Unknown")
    records[4].update(movement_id="custom-y", name="Unknown two")
    report = compute(snap(*records), AT)
    assert (
        report["coverage"]["total_sets"] == 5
        and report["coverage"]["analyzed_sets"] == 3
    )
    assert len(report["coverage"]["unmapped_loads"]) == 2
    assert report["set_counts"] == {"working": 3, "warmup": 2, "unknown": 0}
    assert [r["sequence"] for r in records] == [0, 1, 2, 3, 4]


def test_profile_context_not_replaced_by_newcomer_default():
    from datetime import date

    from alos.programming import DraftRequest, draft_with_context

    request = DraftRequest(
        goal="Synthetic strength",
        objective="strength",
        experience="new",
        sport="strength",
        weeks=4,
        start_date=date(2026, 9, 15),
        weekdays=[0, 2, 4],
        adult=True,
    )
    data = snap()
    data["profiles"] = [
        {
            "id": "profile",
            "version": 2,
            "experience": "regular",
            "planning_preferences": {
                "equipment_profiles": [
                    {
                        "id": "gym",
                        "name": "Gym",
                        "revision": 1,
                        "equipment": ["Barbell", "Dumbbell", "Squat rack", "Floor"],
                        "available_kg": [10, 20],
                    }
                ],
                "active_equipment_id": "gym",
            },
        }
    ]
    result = draft_with_context(request, data, AT)
    assert result["planning_context"]["experience"] == "regular"
    assert result["template"]["content_approval"] is None
    assert any("kişiselleştirilmiş" in note for note in result["notes"])
    assert all(
        e["sets"] == 3 for d in result["program"]["days"] for e in d["exercises"]
    )


def test_goal_equal_legacy_is_unknown_and_normal_directions_are_unclamped():
    from alos.lifestyle import GoalInput

    data = snap()
    goal = {
        "id": "goal",
        "version": 1,
        "title": "Synthetic goal",
        "metric": "weight",
        "baseline": 80,
        "target": 76,
        "unit": "kg",
        "start_date": "2026-09-01",
        "target_date": "2026-10-01",
        "archived": False,
    }
    data["goals"] = [goal]
    data["measurements"] = [
        {
            "id": "m",
            "version": 1,
            "metric": "weight",
            "unit": "kg",
            "value": 78,
            "local_date": "2026-09-15",
        }
    ]
    assert compute(data, AT)["goals"][0]["progress"] == 50
    data["measurements"][0]["value"] = 74
    assert compute(data, AT)["goals"][0]["progress"] == 150
    data["measurements"][0]["value"] = 82
    assert compute(data, AT)["goals"][0]["progress"] == -50
    goal["target"] = 80
    assert compute(data, AT)["goals"][0]["progress"] is None
    with pytest.raises(ValidationError):
        GoalInput(**{k: v for k, v in goal.items() if k not in ("id", "version")})


def test_csv_mapping_pounds_decimal_zero_and_ambiguous_alias():
    from alos.csv_transfer import parse

    result = parse(
        {
            "csv": "date,name,movement_id,reps,external_kg,load_unit\n2026-09-15,Squat,barbell-squat,10,100,lb\n2026-09-15,Squat,barbell-squat,10,0,kg\n"
        }
    )
    assert not result["errors"]
    assert abs(result["rows"][0]["fields"]["external_kg"] - 45.359237) < 1e-6
    assert result["rows"][1]["fields"]["external_kg"] == 0
    ambiguous = parse({"csv": "date,name,reps\n2026-09-15,Squat,10\n"})
    assert ambiguous["errors"]


def test_local_date_bounds_follow_dst_and_brand_is_not_identity(monkeypatch):
    from datetime import UTC, datetime

    from alos.brand import BRAND
    from alos.domain.science import date_bounds
    from alos.reports import report_sections

    bounds = date_bounds(
        {"local_date": "2026-03-29", "timezone": "Europe/Berlin"},
        datetime(2026, 4, 1, tzinfo=UTC),
        "Europe/Berlin",
    )
    assert (bounds[1] - bounds[0]).total_seconds() == 23 * 3600
    data = snap(setrow())
    before = deepcopy(data)
    result = compute(data, AT)
    monkeypatch.setitem(BRAND, "name", "Synthetic Brand Preview")
    report = report_sections(data, result, "training")
    assert report["name"] == "Synthetic Brand Preview"
    assert data == before and report["input_digest"] == result["input_digest"]


def test_shift_window_api_and_feedback_optional_notes(client):
    from conftest import cmd
    from test_core import write

    write(
        client,
        cmd(
            "shift.save",
            local_date="2026-09-14",
            status="work",
            start_local="22:00",
            end_local="06:00",
            commute_min=30,
            prep_min=30,
            available_start_local="06:00",
            available_end_local="18:00",
            sleep_start_local="07:00",
            sleep_end_local="15:00",
            training_minutes=60,
        ),
    )
    result = client.get("/api/v2/schedule-window?on=2026-09-14").json()
    assert result["window"] == "15:00" and result["window_date"] == "2026-09-15"
    session = write(
        client, cmd("session.open", local_date="2026-09-15", title="Synthetic")
    )["entity"]
    feedback = write(
        client,
        cmd(
            "session.feedback",
            session["id"],
            session["version"],
            note="Synthetic note only",
        ),
    )["entity"]["feedback"]
    assert feedback["session_load_au"] is None
    assert feedback["note"] == "Synthetic note only"


def test_superset_edits_preserve_each_movement_and_actual_quantity(client):
    from conftest import cmd
    from test_core import write

    session = write(
        client, cmd("session.open", local_date="2026-09-15", title="Synthetic")
    )["entity"]
    a = write(
        client,
        cmd(
            "set.save",
            session_id=session["id"],
            time_precision="date_only",
            movement_id="barbell-squat",
            name="Barbell Squat",
            reps=10,
            external_kg=60,
            set_kind="working",
            superset_group="A",
            sequence=1,
        ),
    )["entity"]
    b = write(
        client,
        cmd(
            "set.save",
            session_id=session["id"],
            time_precision="date_only",
            movement_id="push-up",
            name="Push-Up",
            reps=8,
            load_kind="bodyweight",
            set_kind="working",
            superset_group="A",
            sequence=2,
        ),
    )["entity"]
    from alos.execution import ActualInput

    for record, order in ((a, 2), (b, 1)):
        values = {k: record[k] for k in ActualInput.model_fields if k in record}
        values["sequence"] = order
        write(client, cmd("set.save", record["id"], record["version"], **values))
    rows = {r["id"]: r for r in client.get("/api/v2/bootstrap").json()["sets"]}
    assert rows[a["id"]]["reps"] == 10 and rows[a["id"]]["external_kg"] == 60
    assert rows[b["id"]]["reps"] == 8 and rows[b["id"]]["movement_id"] == "push-up"
    assert rows[a["id"]]["sequence"] == 2 and rows[b["id"]]["sequence"] == 1


def test_duration_manual_shortening_csv_locale_and_limits():
    from alos.csv_transfer import parse
    from alos.errors import DomainError
    from alos.planning_context import duration_preview

    original = [{"exercises": [{"sets": 3, "rest_seconds": 90} for _ in range(6)]}]
    draft = deepcopy(original)
    draft[0]["exercises"] = draft[0]["exercises"][:3]
    assert duration_preview(original, 120, 72)["estimated_seconds"] == 3600
    assert duration_preview(draft, 120, 72)["estimated_seconds"] == 1764
    assert len(original[0]["exercises"]) == 6
    parsed = parse(
        {
            "delimiter": ";",
            "csv": "date;name;movement_id;reps;external_kg;load_unit\n2026-09-15;Barbell Squat;barbell-squat;10;4,5;kg\n",
        }
    )
    assert parsed["rows"][0]["fields"]["external_kg"] == 4.5
    assert parsed["rows"][0]["fields"]["load_kind"] == "external"
    with pytest.raises(DomainError):
        parse({"csv": "x" * (2 * 1024 * 1024 + 1)})
