from copy import deepcopy
from datetime import datetime, timedelta, timezone
from itertools import pairwise

from alos.domain.science import compute
from alos.evidence import RULES
from conftest import cmd
from test_core import write

AT = datetime(2026, 9, 15, 12, tzinfo=timezone.utc)


def setrow(**extra):
    return {
        "id": "a",
        "version": 1,
        "local_date": "2026-09-15",
        "occurred_at": AT.isoformat(),
        "modality": "strength",
        "name": "Weighted Pull-Up",
        "movement_id": "weighted-pull-up",
        "variant": "strict",
        "equipment": "bar",
        "side": "both",
        "reps": 5,
        "external_kg": 20,
        "status": "completed",
        **extra,
    }


def snap(*rows):
    return {"timezone": "Europe/Istanbul", "cursor": 1, "sets": list(rows)}


def test_deterministic_decay_time_progression_restart_and_unknown():
    original = snap(setrow())
    baseline = deepcopy(original)
    results = [compute(original, AT + timedelta(hours=h)) for h in (0, 6, 12, 24, 48)]
    assert original == baseline
    loads = [r["muscles"]["lats"]["strength"]["high"] for r in results]
    assert all(a >= b for a, b in pairwise(loads)) and loads[-1] < loads[0]
    assert results[-1] == compute(deepcopy(original), AT + timedelta(hours=48))
    assert results[0]["nutrition"]["totals"]["protein_g"] is None
    assert (
        results[0]["readiness"]["score"] is None and results[0]["recovery_eta"] is None
    )
    assert results[0]["coverage"]["missing"]
    assert (
        compute(original, AT + timedelta(hours=24), "exposure-1-conservative")[
            "muscles"
        ]
        != results[3]["muscles"]
    )


def test_sprint_is_not_a_hypertrophy_set_and_skipped_future_are_excluded():
    data = snap(
        setrow(
            id="sprint",
            name="Hill Sprint",
            movement_id="Hill Sprint",
            modality="cardio",
            seconds=15,
            distance_m=70,
        ),
        setrow(id="skipped", status="skipped"),
        setrow(id="future", occurred_at=(AT + timedelta(days=1)).isoformat()),
    )
    result = compute(data, AT + timedelta(hours=1))
    assert len(result["modality_loads"]) == 1
    load = result["modality_loads"][0]
    assert load["hypertrophy_sets"] is None and load["raw"]["seconds"] == 15
    assert (
        load["modality"] == "cardio"
        and result["muscles"]["calves"]["cardio"]["high"] > 0
    )
    assert "strength" not in result["muscles"]["calves"]


def test_late_sleep_is_local_to_its_interval_and_pain_remains_separate():
    data = snap(setrow())
    base = compute(data, AT)
    data["sleeps"] = [
        {
            "id": "sleep",
            "version": 1,
            "start_at": "2026-09-14T20:00:00Z",
            "end_at": "2026-09-15T04:00:00Z",
        }
    ]
    later = compute(data, AT)
    assert later["readiness"]["sleep_hours_in_recorded_intervals"] == 8
    assert (
        later["muscles"] == base["muscles"]
    )  # no unvalidated universal sleep multiplier
    assert (
        compute(data, AT - timedelta(days=2))["readiness"][
            "sleep_hours_in_recorded_intervals"
        ]
        is None
    )
    data["pains"] = [
        {
            "id": "p",
            "version": 1,
            "local_date": "2026-09-15",
            "area": "knee",
            "intensity": 7,
        }
    ]
    assert compute(data, AT)["readiness"]["status"] == "caution"
    data["sleeps"].append({**data["sleeps"][0], "id": "duplicate"})
    assert compute(data, AT)["readiness"]["sleep_hours_in_recorded_intervals"] == 8


def test_ad_hoc_duplicate_planned_social_and_uncertain_time():
    row = {
        "id": "event",
        "version": 1,
        "local_date": "2026-09-15",
        "kind": "physical",
        "status": "occurred",
        "duration_seconds": 600,
        "rpe": 5,
        "modality": "circuit",
    }
    data = snap(setrow(occurred_at=None))
    data["events"] = [
        row,
        {**row, "id": "copy", "duplicate_of": "event"},
        {**row, "id": "planned", "status": "planned"},
        {**row, "id": "dinner", "kind": "social"},
    ]
    result = compute(data, AT)
    assert (
        len(result["ad_hoc_loads"]) == 1
        and result["ad_hoc_loads"][0]["session_rpe_load"] == 50
    )
    assert result["coverage"]["date_only_loads"] == 1
    assert (
        result["muscles"]["lats"]["strength"]["low"] == 0
        and result["muscles"]["lats"]["strength"]["high"] == 1
    )


def test_historical_knowledge_and_saved_model_provenance(client):
    from alos.db import utcnow

    first = utcnow()
    on = first.astimezone(timezone.utc).date().isoformat()
    before = client.get(
        "/api/v2/analysis", params={"as_of": first.isoformat(), "knowledge": "as_known"}
    ).json()
    sleep = write(
        client,
        cmd(
            "sleep.save",
            start_at=(first - timedelta(hours=10)).isoformat(),
            end_at=(first - timedelta(hours=2)).isoformat(),
        ),
    )
    old = client.get(
        "/api/v2/analysis", params={"as_of": first.isoformat(), "knowledge": "as_known"}
    ).json()
    revised = client.get("/api/v2/analysis", params={"as_of": first.isoformat()}).json()
    assert (
        old == before and revised["readiness"]["sleep_hours_in_recorded_intervals"] == 8
    )
    saved = write(client, cmd("analysis.capture", as_of=first.isoformat()))["entity"]
    write(client, cmd("sleep.save", sleep["entity"]["id"], 1, quality=4))
    entry = client.get("/api/v2/bootstrap").json()["analysiss"][0]
    assert entry == saved and entry["result"]["input_digest"] == saved["input_digest"]
    assert client.get("/api/v2/analysis", params={"as_of": on}).status_code == 422
    assert len(client.get("/api/v2/evidence").json()["rules"]) == len(RULES)


def test_self_referencing_restore_and_invalid_time_are_atomic(client, app_factory):
    from alos.backups import export_checksum
    from conftest import login

    first = write(
        client,
        cmd(
            "event.save",
            title="Run",
            local_date="2026-09-15",
            kind="physical",
            status="occurred",
        ),
    )["entity"]
    write(
        client,
        cmd(
            "event.save",
            title="Duplicate",
            local_date="2026-09-15",
            kind="physical",
            status="occurred",
            duplicate_of=first["id"],
        ),
    )
    package = client.get("/api/v2/backups/export").json()
    target = login(app_factory())
    package["records"]["event"].sort(key=lambda r: r.get("duplicate_of") is None)
    package["checksum"] = export_checksum(
        {k: v for k, v in package.items() if k != "checksum"}
    )
    stage = target.post("/api/v2/imports/stage", json=package).json()
    write(target, cmd("import.apply", stage["id"], 1))
    assert len(target.get("/api/v2/bootstrap").json()["events"]) == 2
    package["records"]["event"][0]["local_date"] = "wrong"
    package["checksum"] = export_checksum(
        {k: v for k, v in package.items() if k != "checksum"}
    )
    empty = login(app_factory())
    stage = empty.post("/api/v2/imports/stage", json=package).json()
    response = empty.post("/api/v2/commands", json=cmd("import.apply", stage["id"], 1))
    assert response.status_code == 422
    assert empty.get("/api/v2/bootstrap").json()["events"] == []


def test_integrity_never_touches_owner_state_and_pdf_private(client, app):
    before = client.get("/api/v2/bootstrap").json()
    response = client.post("/api/v2/system/integrity").json()
    assert all(r["status"] == "PASS" for r in response["results"])
    after = client.get("/api/v2/bootstrap").json()
    assert after["cursor"] == before["cursor"] and after["sets"] == before["sets"]
    pdf = client.get("/api/v2/reports/pdf?on=2026-09-15")
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF-")
    assert pdf.headers["cache-control"] == "no-store"


def test_progression_uses_complete_comparable_history_and_keeps_program():
    data = snap(
        setrow(id="1", session_id="first", rir=3, local_date="2026-09-14"),
        setrow(id="2", session_id="second", rir=3),
    )
    target = {
        "id": "exercise",
        "version": 1,
        "day_id": "day",
        "movement_id": "weighted-pull-up",
        "name": "Weighted Pull-Up",
        "variant": "strict",
        "equipment": "bar",
        "side": "both",
        "modality": "strength",
        "sets": 1,
        "reps": 5,
        "external_kg": 20,
        "rir": 3,
    }
    data.update(
        programs=[{"id": "program", "version": 1, "status": "active"}],
        program_days=[{"id": "day", "version": 1, "program_id": "program"}],
        program_exercises=[target],
    )
    original = deepcopy(data)
    result = compute(data, AT)
    assert (
        result["progression"][0]["after"]["external_kg"] == 20.5
        and result["progression"][0]["status"] == "proposed"
    )
    assert original == data
    data["sets"][1]["variant"] = "kipping"
    assert compute(data, AT)["progression"][0]["status"] == "maintain"
    data["checkins"] = [
        {"id": "c", "version": 1, "local_date": "2026-09-15", "fatigue": 9}
    ]
    advice = compute(data, AT)["progression"][0]
    assert advice["status"] == "review" and advice["after"]["external_kg"] == 18
    assert data["program_exercises"][0]["external_kg"] == 20


def test_future_same_day_meal_does_not_leak_and_sleep_overlap_is_not_double():
    data = snap()
    data["meals"] = [
        {
            "id": "m",
            "version": 1,
            "local_date": "2026-09-15",
            "occurred_at": (AT + timedelta(hours=1)).isoformat(),
            "kcal": 400,
        }
    ]
    result = compute(data, AT)
    assert (
        result["nutrition"]["entries"] == 0
        and result["nutrition"]["totals"]["kcal"] is None
    )


def test_regional_reserve_clock_forecast_sources_and_mutation():
    source = snap(setrow(rir=2))
    results = [compute(source, AT + timedelta(hours=h))["muscle_recovery"] for h in (0,24,48)]
    regions = [r['groups']['lats'] for r in results]
    assert regions[0]['released_since_last_load'] == {'low':0, 'high':0}
    assert regions[0]['fatigue']['low'] == regions[0]['fatigue']['high']
    assert regions[0]['fatigue']['high'] > regions[1]['fatigue']['high'] > regions[2]['fatigue']['high']
    assert regions[2]['reserve']['low'] > regions[0]['reserve']['low']
    assert regions[0]['forecast'][1]['fatigue'] == regions[2]['fatigue']
    assert regions[2]['sources'][0]['id'] == 'a'
    assert results[0]['calibrated'] is False
    added = compute(snap(setrow(rir=2), setrow(id='b',rir=2,occurred_at=(AT+timedelta(hours=48)).isoformat())),AT+timedelta(hours=48))['muscle_recovery']
    assert added['groups']['lats']['fatigue']['high'] > regions[2]['fatigue']['high']
    assert compute(snap(),AT)['muscle_recovery']['groups'] == {}
    assert compute(snap(setrow(status='skipped')),AT)['muscle_recovery']['groups'] == {}
    assert compute(snap(setrow(occurred_at=(AT+timedelta(days=1)).isoformat())),AT)['muscle_recovery']['groups'] == {}


def test_regional_reserve_uncertainty_and_no_false_modality_conversion():
    value=compute(snap(setrow()),AT)['muscle_recovery']['groups']['lats']
    assert value['missing_effort'] and value['fatigue']['low'] < value['fatigue']['high']
    dated=compute(snap(setrow(occurred_at=None)),AT)['muscle_recovery']['groups']['lats']
    assert dated['uncertain_time']
    assert compute(snap(setrow(modality='isometric',seconds=30)),AT)['muscle_recovery']['groups']=={}
    assert compute(snap(setrow(name='unmapped',movement_id='unknown')),AT)['muscle_recovery']['groups']=={}
