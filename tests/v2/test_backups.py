import base64
import hashlib
import io
import json

import rfc8785
from alos.backups import export_checksum
from conftest import cmd, login
from PIL import Image
from test_core import write


def legacy():
    body = {
        "format": "alos-portable-backup",
        "schemaVersion": 2,
        "appVersion": "10.1.0",
        "data": {
            "week": {"0": {"shift": "14-22"}},
            "scheduleByDate": {"2026-09-15": {"shift": "14-22"}},
            "trainingLogs": {
                "2026-09-10": [
                    {"movement": "pull-up", "reps": 5},
                    {"movement": "pull-up", "reps": 5},
                ]
            },
            "foodLogs": {"2026-09-10": [{"name": "Oats", "grams": 60.0}]},
            "waterLogs": {"2026-09-10": [{"ml": 500}]},
            "capabilityRecords": [
                {"name": "Muscle-up", "variant": "strict-rings", "value": 3}
            ],
            "activeGuidedWorkout": {
                "id": "legacy-run",
                "status": "paused",
                "sets": [{"reps": 5}],
            },
            "unknownNovelField": {"custom": 42},
            "workspaceArchives": [{"unknownNested": ["kept"]}],
        },
        "photos": [],
        "events": {"records": [{"kind": "deleted", "id": "old"}]},
        "extraEnvelope": "preserve",
    }
    body["integrity"] = {
        "algorithm": "SHA-256",
        "sha256": hashlib.sha256(rfc8785.dumps(body)).hexdigest(),
    }
    return body


def test_legacy_preview_lossless_and_idempotent(client, app):
    raw = legacy()
    before = json.dumps(raw)
    staged = client.post("/api/v2/imports/stage", content=json.dumps(raw)).json()
    assert staged["status"] == "staged" and "raw" not in staged
    assert len(staged["summary"]["duplicate_candidates"]) == 1
    assert client.get("/api/v2/legacy").json()["records"] == []
    assert (
        client.post("/api/v2/imports/stage", content=json.dumps(raw)).json()["id"]
        == staged["id"]
    )
    operation = cmd("import.apply", staged["id"], 1)
    result = write(client, operation)
    assert write(client, operation) == result
    rows = client.get("/api/v2/legacy").json()["records"]
    assert len([r for r in rows if r["domain"] == "trainingLogs"]) == 2
    assert all(
        r["time_precision"] == "date_only"
        for r in rows
        if r["domain"] == "trainingLogs"
    )
    assert next(r for r in rows if r["domain"] == "unknownNovelField")["value"] == 42
    exported = client.get("/api/v2/backups/export").json()
    assert exported["records"]["import"][0]["raw"] == raw
    assert json.dumps(raw) == before
    assert (
        client.get("/api/v2/bootstrap").json()["shifts"] == []
    )  # week indices are never assigned to today
    other = login(app, "arda", "test-password-456")
    assert other.get("/api/v2/legacy").json()["records"] == []
    assert (
        other.post(
            "/api/v2/commands", json=cmd("import.apply", staged["id"], 1)
        ).status_code
        == 404
    )


def test_export_restore_semantic_counts_and_media(app, client, app_factory):
    write(
        client,
        cmd(
            local_date="2026-09-15",
            status="work",
            start_local="22:00",
            end_local="06:00",
        ),
    )
    staged = client.post("/api/v2/imports/stage", content=json.dumps(legacy())).json()
    write(client, cmd("import.apply", staged["id"], 1))
    image = Image.new("RGB", (20, 20), (80, 160, 90))
    file = io.BytesIO()
    image.save(file, format="PNG")
    media = write(
        client,
        cmd(
            "media.save",
            name="Synthetic photo",
            content=base64.b64encode(file.getvalue()).decode(),
        ),
    )
    package = client.get("/api/v2/backups/export").json()
    assert (
        hashlib.sha256(
            client.get("/api/v2/media/" + media["entity"]["id"]).content
        ).hexdigest()
        == media["entity"]["sha256"]
    )
    other = login(app_factory(), "arda", "test-password-456")
    assert other.get("/api/v2/media/" + media["entity"]["id"]).status_code == 404
    transfer = {
        "format": "alos-v2-transfer",
        "canonical": package,
        "pending_journal": [{"id": "preserved-offline"}],
    }
    prepared = other.post("/api/v2/imports/stage", content=json.dumps(transfer)).json()
    assert prepared["summary"]["pending_count"] == 1
    write(other, cmd("import.apply", prepared["id"], 1))
    restored = other.get("/api/v2/backups/export").json()
    for kind in ["shift", "legacy", "media"]:
        assert restored["counts"][kind] == package["counts"][kind]
    a, b = package["records"]["shift"][0], restored["records"]["shift"][0]
    assert {k: v for k, v in a.items() if k != "id"} == {
        k: v for k, v in b.items() if k != "id"
    }
    assert (
        restored["records"]["media"][0]["sha256"]
        == package["records"]["media"][0]["sha256"]
    )
    assert (
        other.get("/api/v2/media/" + restored["records"]["media"][0]["id"]).content
        == client.get("/api/v2/media/" + media["entity"]["id"]).content
    )
    assert [
        r["value"]
        for r in sorted(restored["records"]["legacy"], key=lambda r: r["pointer"])
    ] == [
        r["value"]
        for r in sorted(package["records"]["legacy"], key=lambda r: r["pointer"])
    ]


def test_bad_checksum_schema_compression_depth_and_duplicate_keys(client):
    bad = legacy()
    bad["data"]["week"]["0"]["shift"] = "changed"
    assert (
        client.post("/api/v2/imports/stage", content=json.dumps(bad)).json()["error"][
            "code"
        ]
        == "checksum"
    )
    for raw in [
        b"PK../../secrets",
        b'{"settings":{},"settings":{"lost":1}}',
        b'{"settings":{"x":NaN}}',
    ]:
        assert client.post("/api/v2/imports/stage", content=raw).status_code == 422
    assert (
        client.post(
            "/api/v2/imports/stage", content=b"[" * 45 + b"0" + b"]" * 45
        ).status_code
        == 413
    )
    good = client.get("/api/v2/backups/export").json()
    good["backup_schema_version"] = 999
    assert (
        client.post("/api/v2/imports/stage", content=json.dumps(good)).status_code
        == 422
    )
    assert client.get("/api/v2/bootstrap").json()["cursor"] == 0


def test_restore_is_atomic_when_later_record_invalid(app, client):
    write(client, cmd(local_date="2026-09-15"))
    package = client.get("/api/v2/backups/export").json()
    bad = dict(package["records"]["shift"][0])
    bad["id"] = "7f462c1f-d142-4c85-a22e-ed1c602c2b75"
    bad["local_date"] = "2026-09-16"
    bad["commute_min"] = -1
    package["records"]["shift"].append(bad)
    package["counts"]["shift"] = 2
    package["checksum"] = export_checksum(
        {k: v for k, v in package.items() if k != "checksum"}
    )
    other = login(app, "arda", "test-password-456")
    prepared = other.post("/api/v2/imports/stage", content=json.dumps(package)).json()
    rejected = other.post(
        "/api/v2/commands", json=cmd("import.apply", prepared["id"], 1)
    )
    assert rejected.status_code == 422
    assert rejected.json()["error"]["code"] == "restore_domain"
    snapshot = other.get("/api/v2/bootstrap").json()
    assert snapshot["shifts"] == [] and snapshot["cursor"] == 0
    assert snapshot["imports"][0]["status"] == "staged"


def test_readonly_sqlite_extraction_preserves_source(tmp_path):
    import sqlite3
    import subprocess
    import sys

    source = tmp_path / "source.sqlite"
    db = sqlite3.connect(source)
    db.execute("CREATE TABLE app_state(id INTEGER PRIMARY KEY,payload TEXT)")
    data = legacy()["data"]
    db.execute("INSERT INTO app_state VALUES(1,?)", (json.dumps(data),))
    db.commit()
    db.close()
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    destination = tmp_path / "export.json"
    subprocess.run(
        [
            sys.executable,
            "tools/v2/extract_legacy_sqlite.py",
            str(source),
            str(destination),
        ],
        check=True,
    )
    assert json.loads(destination.read_text())["data"] == data
    assert hashlib.sha256(source.read_bytes()).hexdigest() == before


def test_export_consistent_during_writes(app):
    from concurrent.futures import ThreadPoolExecutor

    from alos.backups import full_export
    from alos.contracts import Command
    from alos.service import execute

    athlete = app.state.athletes[0]
    database = app.state.database
    with ThreadPoolExecutor(max_workers=2) as pool:
        future = pool.submit(
            lambda: [
                execute(
                    database,
                    athlete,
                    Command.model_validate(cmd(local_date=f"2026-09-{i:02}")),
                )
                for i in range(1, 21)
            ]
        )
        for _ in range(15):
            package = full_export(database, athlete)
            assert package["cursor"] == package["counts"]["shift"]
            assert (
                export_checksum({k: v for k, v in package.items() if k != "checksum"})
                == package["checksum"]
            )
        future.result(timeout=10)


def test_legacy_photo_keeps_original_and_owner_preview(app, client):
    image = Image.new("RGB", (12, 12), (15, 45, 90))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    raw = {
        "app": "Athlete Life OS",
        "data": {"settings": {}},
        "photos": [
            {
                "id": 123,
                "date": "2026-09-10",
                "photos": {
                    "front": "data:image/png;base64,"
                    + base64.b64encode(buffer.getvalue()).decode()
                },
            }
        ],
    }
    prepared = client.post("/api/v2/imports/stage", content=json.dumps(raw)).json()
    write(client, cmd("import.apply", prepared["id"], 1))
    result = client.get("/api/v2/backups/export").json()
    assert result["records"]["import"][0]["raw"] == raw
    assert result["counts"]["media"] == 1
    assert result["records"]["media"][0]["captured_date"] == "2026-09-10"
    assert result["records"]["media"][0]["details"]["view"] == "front"
    media = result["records"]["media"][0]
    annotated = write(
        client,
        cmd(
            "media.annotate",
            media["id"],
            media["version"],
            captured_date="2026-09-09",
            weight_kg=72.5,
            view="front",
        ),
    )["entity"]
    assert annotated["captured_date"] == "2026-09-09"
    assert annotated["details"]["weight_kg"] == 72.5
    assert annotated["details"]["legacy_context"]["date"] == "2026-09-10"
    assert annotated["sha256"] == media["sha256"]
    assert (
        client.get("/api/v2/media/" + result["records"]["media"][0]["id"]).status_code
        == 200
    )


def test_legacy_dated_health_and_shift_adapters_preserve_existing_profile(client):
    write(client, cmd("profile.save", experience="advanced"))
    source = {
        "scheduleByDate": {
            "2026-09-15": {"status": "work", "shift": "evening"},
            "2026-09-16": {"status": "work", "shift": "unknown"},
        },
        "daily": {
            "2026-09-15": {
                "sleepTime": "23:00",
                "wakeTime": "07:00",
                "nightAwake": 0,
                "sleepQuality": 4,
            }
        },
        "painLogs": {
            "2026-09-15": [
                {"joint": "wrist", "side": "left", "severity": 4, "status": "active"}
            ]
        },
        "healthLabRecords": [
            {
                "date": "2026-09-15",
                "lab": "Synthetic Lab",
                "rows": [
                    {
                        "name": "Example",
                        "value": 12,
                        "unit": "unit",
                        "low": 8,
                        "high": 15,
                        "comparator": "=",
                    },
                    {"name": "Limited", "value": 3, "unit": "unit", "comparator": "<"},
                ],
            }
        ],
        "personalHealthProfile": {"trainingHistory": "new", "sex": "female"},
        "unknown": {"preserve": True},
    }
    staged = client.post("/api/v2/imports/stage", content=json.dumps(source)).json()
    imported = write(client, cmd("import.apply", staged["id"], staged["version"]))
    snap = client.get("/api/v2/bootstrap").json()
    assert snap["profiles"][0]["experience"] == "advanced"
    assert len(snap["shifts"]) == 1 and snap["shifts"][0]["start_local"] == "14:00"
    assert snap["sleeps"][0]["start_at"] == "2026-09-14T20:00:00+00:00"
    assert snap["sleeps"][0]["quality"] is None
    assert snap["pains"][0]["intensity"] == 4
    assert len(snap["labs"]) == 2
    assert (
        next(r for r in snap["labs"] if r["analyte"] == "Example")["reference_low"] == 8
    )
    assert (
        next(r for r in snap["labs"] if r["analyte"] == "Limited")["comparator"] == "<"
    )
    assert len(imported["entity"]["summary"]["lifestyle_adapter"]["warnings"]) >= 2
    package = client.get("/api/v2/backups/export").json()
    assert "Limited" in json.dumps(package) and "preserve" in json.dumps(package)


def test_legacy_missing_identity_never_activates_a_period(client):
    source = {
        "multisportPeriods": [
            {
                "name": "No stable ID",
                "startDate": "2026-09-14",
                "weeks": 4,
                "blocks": [],
            }
        ],
        "settings": {},
    }
    staged = client.post("/api/v2/imports/stage", content=json.dumps(source)).json()
    write(client, cmd("import.apply", staged["id"], staged["version"]))
    assert client.get("/api/v2/bootstrap").json()["programs"][0]["status"] == "archived"


def test_malformed_legacy_nested_identifiers_are_archived_without_server_error(client):
    source = {
        "sportSessions": [
            {
                "id": {},
                "date": "2026-09-15",
                "workout": {"steps": None, "actual": [{"done": True, "stepId": []}]},
            }
        ],
        "capabilityRecords": [{"testId": {}, "date": "2026-09-15"}],
        "scheduleByDate": {"2026-09-15": {"status": "work", "shift": {}}},
        "activeWorkoutRun": {"date": "2026-09-15", "steps": [], "actual": None},
    }
    staged = client.post("/api/v2/imports/stage", content=json.dumps(source)).json()
    response = client.post(
        "/api/v2/commands", json=cmd("import.apply", staged["id"], staged["version"])
    )
    assert response.status_code == 200, response.text
    package = client.get("/api/v2/backups/export").json()
    assert "stepId" in json.dumps(package)


def test_legacy_period_ranges_and_light_week_are_native_without_fake_actuals(client):
    source = {
        "trainingPeriods": [
            {
                "id": "period-old",
                "name": "Four weeks",
                "model": "Original model",
                "goal": "strength",
                "startDate": "2026-09-14",
                "weeks": 4,
                "deloadEvery": 4,
                "progression": "double",
                "weekly": [
                    [
                        {
                            "name": "Weighted Pull-Up",
                            "sets": 4,
                            "min": 6,
                            "max": 8,
                            "load": 20,
                            "rir": 2,
                            "rest": 180,
                        }
                    ],
                    [],
                    [],
                    [],
                    [],
                    [],
                    [],
                ],
            }
        ]
    }
    staged = client.post("/api/v2/imports/stage", content=json.dumps(source)).json()
    imported = write(client, cmd("import.apply", staged["id"], staged["version"]))
    snapshot = client.get("/api/v2/bootstrap").json()
    assert imported["entity"]["summary"]["period_adapter"]["programs"] == 1
    assert snapshot["programs"][0]["status"] == "archived"
    assert len(snapshot["program_days"]) == 28
    days = {d["id"]: d for d in snapshot["program_days"]}
    exercises = snapshot["program_exercises"]
    assert len(exercises) == 4
    fourth = next(e for e in exercises if days[e["day_id"]]["first_week"] == 4)
    assert fourth["sets"] == 3 and fourth["external_kg"] == 18
    assert fourth["target_range"] == {"unit": "reps", "minimum": 6, "maximum": 8}
    assert fourth["reps"] is None
    assert not snapshot["sets"] and not snapshot["sessions"]
    rx = write(
        client,
        cmd(
            "prescription.materialize",
            program_id=snapshot["programs"][0]["id"],
            day_id=fourth["day_id"],
            scheduled_date="2026-10-05",
        ),
    )
    slots = [c["entity"] for c in rx["changes"] if c["kind"] == "slot"]
    assert len(slots) == 3 and all(
        s["target_range"]["maximum"] == 8 and s["reps"] is None for s in slots
    )


def test_browser_normalized_numbers_verify_and_exact_text_preserves_big_integers(
    app, client
):
    from alos.backups import validate_export

    write(client, cmd("hydration.save", local_date="2026-09-15", ml=500))
    package = client.get("/api/v2/backups/export").json()
    assert package["checksum_algorithm"] == "RFC8785-SHA256"
    browser = json.loads(json.dumps(package).replace("500.0", "500"))
    assert validate_export(browser)["checksum"] == package["checksum"]
    source = {
        "unknownSafeArchive": {
            "large_id": 9007199254740993123456789,
            "precise_label": "keep exactly",
        }
    }
    response = client.post(
        "/api/v2/imports/stage", content=json.dumps({"data": source})
    )
    assert response.status_code == 200, response.text
    staged = response.json()
    write(client, cmd("import.apply", staged["id"], staged["version"]))
    exact = client.get("/api/v2/backups/export").text
    assert json.loads(exact)["checksum_algorithm"] == "ALOS-JSON-SHA256"
    other = login(app, "arda", "test-password-456")
    envelope = {
        "format": "alos-v2-transfer-text",
        "canonical_text": exact,
        "pending_journal": [],
    }
    staged = other.post("/api/v2/imports/stage", content=json.dumps(envelope)).json()
    write(other, cmd("import.apply", staged["id"], staged["version"]))
    restored = other.get("/api/v2/backups/export").text
    assert "9007199254740993123456789" in restored
    assert other.get("/api/v2/bootstrap").json()["hydrations"][0]["ml"] == 500


def test_restore_rejects_active_content_media_even_with_valid_checksum(client, app):
    image = Image.new("RGB", (3, 3), "blue")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    write(
        client,
        cmd(
            "media.save",
            name="safe",
            content=base64.b64encode(buffer.getvalue()).decode(),
        ),
    )
    package = client.get("/api/v2/backups/export").json()
    row = package["records"]["media"][0]
    malicious = (
        b'<html><form action="https://example.invalid">fake sign-in</form></html>'
    )
    row["mime"] = "text/html"
    row["content"] = base64.b64encode(malicious).decode()
    row["sha256"] = hashlib.sha256(malicious).hexdigest()
    package["checksum"] = export_checksum(
        {k: v for k, v in package.items() if k != "checksum"}
    )
    other = login(app, "arda", "test-password-456")
    staged = other.post("/api/v2/imports/stage", json=package).json()
    response = other.post(
        "/api/v2/commands", json=cmd("import.apply", staged["id"], staged["version"])
    )
    assert response.status_code == 422, response.text
    assert other.get("/api/v2/bootstrap").json()["medias"] == []


def test_large_backup_restore_preserves_data_without_recursive_canonical_copy(
    app, client
):
    # A bounded synthetic unknown field deliberately exceeds the old 16 MB transport.
    payload = "z" * (17 * 1024 * 1024)
    source = {"data": {"unknownLargeText": payload}}
    staged_response = client.post("/api/v2/imports/stage", content=json.dumps(source))
    assert staged_response.status_code == 200, staged_response.text[:500]
    staged = staged_response.json()
    write(client, cmd("import.apply", staged["id"], staged["version"]))
    package = client.get("/api/v2/backups/export").json()
    encoded = json.dumps(package)
    assert len(encoded) > 32 * 1024 * 1024
    other = login(app, "arda", "test-password-456")
    envelope = {
        "format": "alos-v2-transfer-text",
        "canonical_text": encoded,
        "pending_journal": [{"id": "uncommitted"}],
        "local_drafts": {"x": "kept"},
        "unknownEnvelope": "kept",
    }
    staged = other.post("/api/v2/imports/stage", content=json.dumps(envelope))
    assert staged.status_code == 200, staged.text[:500]
    staged = staged.json()
    write(other, cmd("import.apply", staged["id"], staged["version"]))
    restored = other.get("/api/v2/backups/export").json()
    assert restored["records"]["legacy"][0]["value"] == payload
    provenance = next(
        r["raw"]
        for r in restored["records"]["import"]
        if r["raw"].get("format") == "alos-restored-provenance"
    )
    assert provenance["source_envelope"]["pending_journal"] == [{"id": "uncommitted"}]
    assert provenance["source_envelope"]["local_drafts"] == {"x": "kept"}
    assert provenance["source_envelope"]["unknownEnvelope"] == "kept"
    assert "records" not in provenance["source_manifest"]
    assert len(json.dumps(restored)) < len(encoded) + 100_000
    assert (
        client.post(
            "/api/v2/imports/stage",
            content=b"{}",
            headers={"Content-Length": str(65 * 1024 * 1024)},
        ).status_code
        == 413
    )
    assert (
        client.post(
            "/api/v2/commands",
            content=b"{}",
            headers={"Content-Length": str(17 * 1024 * 1024)},
        ).status_code
        == 413
    )


def test_restore_rejects_invalid_calendar_and_exercise_target(client, app):
    from test_workouts import program

    program(client)
    package = client.get("/api/v2/backups/export").json()
    other = login(app, "arda", "test-password-456")
    for target in ("calendar", "rir"):
        broken = json.loads(json.dumps(package))
        if target == "calendar":
            broken["athlete_settings"]["timezone"] = "Invalid/NoZone"
        else:
            broken["records"]["program_exercise"][0]["rir"] = 999
        broken["checksum"] = export_checksum(
            {k: v for k, v in broken.items() if k != "checksum"}
        )
        staged = other.post("/api/v2/imports/stage", json=broken).json()
        response = other.post(
            "/api/v2/commands",
            json=cmd("import.apply", staged["id"], staged["version"]),
        )
        assert response.status_code == 422
        assert response.json()["error"]["code"] == (
            "restore_settings" if target == "calendar" else "restore_domain"
        )
        assert other.get("/api/v2/bootstrap").json()["programs"] == []


def test_restore_rejects_a_set_linked_to_another_session_slot(client, app):
    from test_workouts import actual, prescription, program, session

    p, d = program(client)
    rx = prescription(client, p, d)
    s = session(client, rx)
    slot = next(c["entity"] for c in rx["changes"] if c["kind"] == "slot")
    write(client, actual(client, s, slot))
    p2, d2 = program(client, variant="rings")
    rx2 = prescription(client, p2, d2)
    alien_slot = next(c["entity"] for c in rx2["changes"] if c["kind"] == "slot")
    package = client.get("/api/v2/backups/export").json()
    package["records"]["set"][0]["slot_id"] = alien_slot["id"]
    package["checksum"] = export_checksum(
        {k: v for k, v in package.items() if k != "checksum"}
    )
    other = login(app, "arda", "test-password-456")
    staged = other.post("/api/v2/imports/stage", json=package).json()
    response = other.post(
        "/api/v2/commands", json=cmd("import.apply", staged["id"], staged["version"])
    )
    assert (
        response.status_code == 422
        and response.json()["error"]["code"] == "restore_relation"
    )
    assert other.get("/api/v2/bootstrap").json()["programs"] == []
