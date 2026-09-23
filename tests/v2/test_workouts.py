from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

import pytest
from alos.domain.workouts import Targets, first_missing, timer_remaining
from conftest import cmd, login
from test_core import write


def program(client, variant="bar-strict"):
    created = write(
        client,
        cmd(
            "program.create",
            name="Pull 4 weeks",
            goal="Controlled pull-ups",
            start_date="2026-09-14",
            weeks=4,
            days=[
                {
                    "weekday": 1,
                    "label": "Pull",
                    "kind": "training",
                    "exercises": [
                        {
                            "movement_id": "pullup",
                            "name": "Pull-up",
                            "variant": variant,
                            "modality": "strength",
                            "load_kind": "bodyweight",
                            "sets": 4,
                            "reps": 5,
                            "rest_seconds": 90,
                            "rir": 3,
                        }
                    ],
                }
            ],
        ),
    )
    active = write(client, cmd("program.activate", created["entity"]["id"], 1))
    day = next(c["entity"] for c in created["changes"] if c["kind"] == "program_day")
    return active["entity"], day


def prescription(client, program, day, date="2026-09-15"):
    return write(
        client,
        cmd(
            "prescription.materialize",
            program_id=program["id"],
            day_id=day["id"],
            scheduled_date=date,
        ),
    )


def session(client, prescription, title="Pull"):
    return write(
        client,
        cmd(
            "session.open",
            prescription_id=prescription["entity"]["id"],
            local_date=prescription["entity"]["scheduled_date"],
            title=title,
        ),
    )["entity"]


def actual(client, session, slot, **extra):
    fields = {k: slot[k] for k in Targets.model_fields}
    fields.update(
        session_id=session["id"],
        slot_id=slot["id"],
        occurred_at="2026-09-15T20:45:00Z",
        reps=5,
    )
    fields.update(extra)
    return cmd("set.save", **fields)


def test_manual_and_guided_share_slots_and_idempotent_actuals(client, app):
    p, d = program(client)
    rx = prescription(client, p, d)
    slots = [c["entity"] for c in rx["changes"] if c["kind"] == "slot"]
    s = session(client, rx)
    assert s["status"] == "ready" and s["started_at"] is None
    assert (
        client.get("/api/v2/bootstrap").json()["prescriptions"][0]["locked_at"] is None
    )
    write(client, actual(client, s, slots[0]))
    write(client, actual(client, s, slots[1]))
    snap = client.get("/api/v2/bootstrap").json()
    assert first_missing(slots, snap["sets"])["id"] == slots[2]["id"]
    third = actual(client, s, slots[2])
    saved = write(client, third)
    for _ in range(10):
        assert write(client, third) == saved
    assert len(login(app).get("/api/v2/bootstrap").json()["sets"]) == 3
    assert (
        client.post("/api/v2/commands", json=actual(client, s, slots[2])).status_code
        == 409
    )
    repeated = prescription(client, p, d)
    assert repeated["entity"]["id"] == rx["entity"]["id"]
    assert repeated["entity"]["locked_at"] is not None
    assert (
        client.post(
            "/api/v2/commands", json=cmd("prescription.edit", rx["entity"]["id"], 2)
        ).status_code
        == 409
    )


def test_same_day_second_session_and_variation_do_not_steal_sets(client):
    p, d = program(client)
    rx = prescription(client, p, d)
    slot = next(c["entity"] for c in rx["changes"] if c["kind"] == "slot")
    a = session(client, rx)
    b = session(client, rx)
    write(client, actual(client, a, slot))
    write(client, actual(client, b, slot))
    p2, d2 = program(client, "rings-strict")
    rx2 = prescription(client, p2, d2)
    c = session(client, rx2)
    assert (
        client.post("/api/v2/commands", json=actual(client, c, slot)).status_code == 409
    )
    snap = client.get("/api/v2/bootstrap").json()
    assert len(snap["sessions"]) == 3 and len(snap["sets"]) == 2
    assert {r["session_id"] for r in snap["sets"]} == {a["id"], b["id"]}


def test_edit_preserves_original_time_skip_extra_delete_and_timer(client):
    p, d = program(client)
    rx = prescription(client, p, d)
    slots = [c["entity"] for c in rx["changes"] if c["kind"] == "slot"]
    s = session(client, rx)
    write(
        client,
        actual(
            client,
            s,
            slots[0],
            status="skipped",
            reps=None,
            occurred_at=None,
            time_precision="date_only",
        ),
    )
    assert client.get("/api/v2/bootstrap").json()["sessions"][0]["status"] == "ready"
    first = write(client, actual(client, s, slots[1]))
    row = first["entity"]
    patch = actual(client, s, slots[1], reps=7, occurred_at="2026-09-17T00:00:00Z")
    patch["entity_id"] = row["id"]
    patch["expected_version"] = 1
    changed = write(client, patch)["entity"]
    assert changed["occurred_at"] == row["occurred_at"]
    assert changed["updated_at"] > row["updated_at"]
    active = client.get("/api/v2/bootstrap").json()["sessions"][0]
    timed = write(
        client,
        cmd(
            "session.timer", active["id"], active["version"], action="start", seconds=90
        ),
    )["entity"]
    assert timed["timer_deadline"] is not None
    reset = write(
        client, cmd("session.timer", timed["id"], timed["version"], action="reset")
    )["entity"]
    assert reset["timer_deadline"] is None
    assert len(client.get("/api/v2/bootstrap").json()["sets"]) == 2
    extra = actual(client, s, slots[2], slot_id=None, status="extra")
    write(client, extra)
    latest = client.get("/api/v2/bootstrap").json()["sessions"][0]
    done = write(
        client,
        cmd("session.transition", latest["id"], latest["version"], status="completed"),
    )["entity"]
    assert (
        client.post(
            "/api/v2/commands",
            json=cmd(
                "session.transition", done["id"], done["version"], status="active"
            ),
        ).status_code
        == 409
    )
    write(client, cmd("set.delete", changed["id"], changed["version"]))
    records = client.get("/api/v2/bootstrap").json()["sets"]
    assert len([r for r in records if not r["deleted_at"]]) == 2
    assert first_missing(slots, records)["id"] == slots[1]["id"]


def test_cross_owner_refs_and_program_version_retention(app, client):
    p, d = program(client)
    rx = prescription(client, p, d)
    other = login(app, "arda", "test-password-456")
    assert (
        other.post(
            "/api/v2/commands",
            json=cmd(
                "session.open",
                prescription_id=rx["entity"]["id"],
                local_date="2026-09-15",
                title="Steal",
            ),
        ).status_code
        == 404
    )
    new = write(
        client,
        cmd(
            "program.create",
            parent_id=p["id"],
            name="Next block",
            goal="Continue",
            start_date="2026-10-12",
            weeks=8,
            days=[
                {
                    "weekday": 1,
                    "kind": "training",
                    "label": "Rings",
                    "exercises": [
                        {
                            "movement_id": "ring_pullup",
                            "name": "Ring pull-up",
                            "sets": 2,
                            "reps": 5,
                        }
                    ],
                }
            ],
        ),
    )
    write(client, cmd("program.activate", new["entity"]["id"], 1))
    snap = client.get("/api/v2/bootstrap").json()
    assert len(snap["programs"]) == 2 and len(snap["prescriptions"]) == 1
    assert (
        next(r for r in snap["programs"] if r["id"] == p["id"])["status"] == "archived"
    )


def test_timer_deadline_and_decimal_semantics():
    now = datetime(2026, 9, 15, tzinfo=UTC)
    assert (
        timer_remaining(now + timedelta(seconds=90), None, now + timedelta(seconds=35))
        == 55000
    )
    assert timer_remaining(None, 40000, now + timedelta(days=2)) == 40000
    assert timer_remaining(now, None, now + timedelta(days=2)) == 0
    assert Targets(movement_id="x", name="X", external_kg="1,5").external_kg == 1.5
    with pytest.raises(ValueError):
        Targets(movement_id="x", name="X", external_kg="1.234,5")
    with pytest.raises(ValueError):
        Targets(movement_id="x", name="X", external_kg=-1)


def test_legacy_structured_program_actual_and_projection_not_double_counted(client):
    import json

    steps = [
        {
            "id": "x",
            "name": "Ring pull-up",
            "type": "resistance",
            "sets": 4,
            "reps": 5,
            "loadKg": 0,
            "rir": 3,
        }
    ]
    data = {
        "app": "Athlete Life OS",
        "data": {
            "settings": {"pinnedPeriodId": "p"},
            "multisportPeriods": [
                {
                    "id": "p",
                    "name": "My exact plan",
                    "goal": "Keep skill",
                    "startDate": "2026-09-14",
                    "weeks": 8,
                    "blocks": [
                        {"id": "b", "day": 1, "sportId": "calisthenics", "steps": steps}
                    ],
                }
            ],
            "sportSessions": [
                {
                    "id": "s",
                    "date": "2026-09-15",
                    "sportId": "calisthenics",
                    "workout": {
                        "steps": steps,
                        "actual": [
                            {
                                "stepId": "x",
                                "index": 0,
                                "done": True,
                                "reps": 6,
                                "loadKg": 0,
                            }
                        ],
                    },
                }
            ],
            "trainingLogs": {
                "2026-09-15": [
                    {
                        "source": "sport_program",
                        "sportSessionId": "s",
                        "name": "Ring pull-up",
                        "sets": [6],
                    },
                    {"name": "Other", "sets": [8]},
                ]
            },
        },
    }
    staged = client.post("/api/v2/imports/stage", content=json.dumps(data)).json()
    write(client, cmd("import.apply", staged["id"], 1))
    snap = client.get("/api/v2/bootstrap").json()
    assert len(snap["programs"]) == 1 and snap["programs"][0]["name"] == "My exact plan"
    assert (
        snap["programs"][0]["weeks"] == 8 and snap["programs"][0]["status"] == "active"
    )
    assert sorted(r["reps"] for r in snap["sets"]) == [6, 8]
    assert all(
        r["occurred_at"] is None and r["time_precision"] == "date_only"
        for r in snap["sets"]
    )


def test_first_execution_locks_and_legacy_active_runner_continues(client):
    import json

    raw = {
        "data": {
            "settings": {},
            "activeWorkoutRun": {
                "id": "old",
                "date": "2026-09-15",
                "status": "paused",
                "steps": [
                    {
                        "id": "s",
                        "name": "Pull-up",
                        "type": "resistance",
                        "sets": 4,
                        "reps": 5,
                    }
                ],
                "actual": [
                    {"stepId": "s", "index": 0, "done": True, "reps": 5},
                    {"stepId": "s", "index": 1, "done": True, "reps": 5},
                ],
            },
        }
    }
    stage = client.post("/api/v2/imports/stage", content=json.dumps(raw)).json()
    write(client, cmd("import.apply", stage["id"], 1))
    snap = client.get("/api/v2/bootstrap").json()
    assert len(snap["sets"]) == 2
    assert snap["sessions"][0]["status"] == "paused"
    assert first_missing(snap["slots"], snap["sets"])["ordinal"] == 2
    assert snap["prescriptions"][0]["locked_at"] is not None


def test_starting_live_set_locks_without_inventing_performance(client):
    from zoneinfo import ZoneInfo

    from alos.db import utcnow

    current = utcnow().astimezone(ZoneInfo("Europe/Istanbul")).date()
    p = write(
        client,
        cmd(
            "program.create",
            name="Live",
            goal="Real start",
            start_date=current.isoformat(),
            weeks=1,
            days=[
                {
                    "weekday": current.weekday(),
                    "kind": "training",
                    "label": "Today",
                    "exercises": [
                        {"movement_id": "x", "name": "X", "sets": 2, "reps": 5}
                    ],
                }
            ],
        ),
    )
    write(client, cmd("program.activate", p["entity"]["id"], 1))
    d = next(c["entity"] for c in p["changes"] if c["kind"] == "program_day")
    rx = prescription(client, p["entity"], d, current.isoformat())
    s = session(client, rx)
    slot = next(c["entity"] for c in rx["changes"] if c["kind"] == "slot")
    write(client, cmd("session.begin", s["id"], 1, slot_id=slot["id"]))
    snap = client.get("/api/v2/bootstrap").json()
    assert (
        snap["sessions"][0]["status"] == "active"
        and snap["prescriptions"][0]["locked_at"] is not None
    )
    assert snap["sets"] == []


def test_program_draft_respects_persisted_profile_and_health(client):

    today = datetime.now(UTC).astimezone(ZoneInfo("Europe/Istanbul")).date().isoformat()
    write(client, cmd("profile.save", birth_date="2012-01-01", experience="new"))
    body = {
        "goal": "Controlled training",
        "objective": "strength",
        "experience": "advanced",
        "sport": "strength",
        "weeks": 4,
        "start_date": today,
        "weekdays": [0, 2, 4],
        "adult": True,
        "symptoms": False,
    }
    result = client.post("/api/v2/program-drafts", json=body)
    assert result.status_code == 200
    assert all(not d["exercises"] for d in result.json()["program"]["days"])
    profile = client.get("/api/v2/bootstrap").json()["profiles"][0]
    write(
        client,
        cmd("profile.save", profile["id"], profile["version"], birth_date="1990-01-01"),
    )
    write(client, cmd("episode.save", kind="illness", start_date=today))
    before = client.get("/api/v2/bootstrap").json()["cursor"]
    result = client.post("/api/v2/program-drafts", json=body).json()
    assert result["health_context"]["status"] == "caution"
    assert all(not d["exercises"] for d in result["program"]["days"])
    assert client.get("/api/v2/bootstrap").json()["cursor"] == before


def test_program_phases_materialize_only_selected_weeks(client):
    payload = {
        "name": "Four-week phase test",
        "goal": "Explicit lighter fourth week",
        "start_date": "2026-09-14",
        "weeks": 4,
        "days": [
            {
                "weekday": 1,
                "label": "Normal",
                "kind": "training",
                "first_week": 1,
                "last_week": 3,
                "exercises": [
                    {"movement_id": "pullup", "name": "Pull-up", "sets": 3, "reps": 5}
                ],
            },
            {
                "weekday": 1,
                "label": "Lighter fourth week",
                "kind": "training",
                "first_week": 4,
                "last_week": 4,
                "exercises": [
                    {"movement_id": "pullup", "name": "Pull-up", "sets": 2, "reps": 3}
                ],
            },
        ],
    }
    created = write(client, cmd("program.create", **payload))
    p = write(client, cmd("program.activate", created["entity"]["id"], 1))["entity"]
    days = [c["entity"] for c in created["changes"] if c["kind"] == "program_day"]
    normal = next(d for d in days if d["first_week"] == 1)
    light = next(d for d in days if d["first_week"] == 4)
    before = prescription(client, p, normal, "2026-09-15")
    fourth = prescription(client, p, light, "2026-10-06")
    assert len([c for c in before["changes"] if c["kind"] == "slot"]) == 3
    assert len([c for c in fourth["changes"] if c["kind"] == "slot"]) == 2
    assert (
        client.post(
            "/api/v2/commands",
            json=cmd(
                "prescription.materialize",
                program_id=p["id"],
                day_id=normal["id"],
                scheduled_date="2026-10-06",
            ),
        ).status_code
        == 422
    )
    assert client.get("/api/v2/bootstrap").json()["prescriptions"][0]["id"] in {
        before["entity"]["id"],
        fourth["entity"]["id"],
    }
    payload["days"][1]["last_week"] = 5
    assert (
        client.post(
            "/api/v2/commands", json=cmd("program.create", **payload)
        ).status_code
        == 422
    )


def test_range_prescription_requires_an_actual_value_and_keeps_range(client):
    created = write(
        client,
        cmd(
            "program.create",
            name="Range plan",
            goal="Test explicit range",
            start_date="2026-09-14",
            weeks=4,
            days=[
                {
                    "weekday": 1,
                    "label": "Pull",
                    "kind": "training",
                    "exercises": [
                        {
                            "movement_id": "pullup",
                            "name": "Pull-up",
                            "sets": 1,
                            "target_range": {
                                "unit": "reps",
                                "minimum": 6,
                                "maximum": 8,
                            },
                        }
                    ],
                }
            ],
        ),
    )
    p = write(client, cmd("program.activate", created["entity"]["id"], 1))["entity"]
    d = next(c["entity"] for c in created["changes"] if c["kind"] == "program_day")
    rx = prescription(client, p, d)
    slot = next(c["entity"] for c in rx["changes"] if c["kind"] == "slot")
    s = session(client, rx)
    assert slot["reps"] is None and slot["target_range"]["minimum"] == 6
    performed = write(client, actual(client, s, slot, reps=7))["entity"]
    assert performed["reps"] == 7 and "target_range" not in performed
    assert (
        client.get("/api/v2/bootstrap").json()["slots"][0]["target_range"]
        == slot["target_range"]
    )
