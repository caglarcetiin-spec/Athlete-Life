"""All data synthetic. Provider output is injected; no external AI or real account used."""

import io
import json
from datetime import date

import pytest
from alos import daily_log as d
from alos.errors import DomainError
from conftest import cmd, login
from test_core import write
from test_evren_planning import evren_settings

TEXT = "02:00–07:00 uyudum. 10:00 işe başladım 8 saat çalıştım; ulaşım 0 dk hazırlık 0 dk. Gün toplamı 2,5 litre su. Pilav burger makarna yedim. 30 dk kalistenik; 3 set 5 tekrar pushup yaptım."


def narrative():
    return d.Narrative(local_date=date(2026, 10, 5), messages=[TEXT], consent=d.CONSENT)


def extraction():
    return d.Extraction(
        entries=[
            d.Entry(
                kind="water",
                quote="Gün toplamı 2,5 litre su.",
                amount=2.5,
                unit="l",
                scope="total",
            ),
            d.Entry(
                kind="meal",
                quote="Pilav burger makarna yedim.",
                name="Pilav, burger, makarna",
            ),
            d.Entry(
                kind="sleep", quote="02:00–07:00 uyudum.", start="02:00", end="07:00"
            ),
            d.Entry(
                kind="work",
                commute_min=0,
                prep_min=0,
                quote="10:00 işe başladım 8 saat çalıştım; ulaşım 0 dk hazırlık 0 dk.",
                start="10:00",
                amount=8,
                unit="h",
            ),
            d.Entry(
                kind="workout",
                quote="30 dk kalistenik; 3 set 5 tekrar pushup yaptım.",
                amount=30,
                unit="min",
                name="Kalistenik",
                movements=[
                    d.Movement(
                        name="pushup",
                        quote="3 set 5 tekrar pushup yaptım.",
                        sets=3,
                        reps=5,
                    )
                ],
            ),
        ]
    )


def preview(client, monkeypatch, parsed=None):
    monkeypatch.setattr(d, "extract", lambda *_: parsed or extraction())
    response = client.post(
        "/api/v2/daily-log-preview", json=narrative().model_dump(mode="json")
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_daily_atomic_full_day_and_idempotency(client, app, monkeypatch):
    p = preview(client, monkeypatch)
    assert p["items"][0]["payload"]["ml"] == 2500
    assert p["items"][3]["payload"]["end_local"] == "18:00"
    assert len(p["items"][4]["payload"]["sets"]) == 3
    assert "kcal" not in p["items"][1]["payload"]
    command = cmd("daily_log.save", token=p["token"], selected=list(range(5)))
    result = write(client, command)
    assert write(client, command) == result
    snap = client.get("/api/v2/bootstrap").json()
    for key in ["hydrations", "meals", "sleeps", "shifts", "sessions"]:
        assert len(snap[key]) == 1
    assert len(snap["sets"]) == 3
    assert snap["sessions"][0]["time_precision"] == "date_only"
    assert snap["sessions"][0]["feedback"]["duration_seconds"] == 1800
    assert snap["sets"][0]["external_kg"] is None
    assert snap["meals"][0]["kcal"] is None
    report = client.get("/api/v2/nutrition-summary?on=2026-10-05").json()
    assert report["water_ml"] == 2500 and report["status"] == "partial"
    assert report["totals"]["kcal"] is None and report["missing_counts"]["kcal"] == 1
    integrity = client.post("/api/v2/system/integrity").json()
    assert all(r["status"] == "PASS" for r in integrity["results"])

    assert (
        login(app, "arda", "test-password-456")
        .get("/api/v2/bootstrap")
        .json()["sessions"]
        == []
    )
    p2 = preview(client, monkeypatch)
    r = client.post(
        "/api/v2/commands", json=cmd("daily_log.save", token=p2["token"], selected=[1])
    )
    assert r.status_code == 409 and r.json()["error"]["code"] == "daily_duplicate"


def test_daily_stale_no_partial_write(client, monkeypatch):
    p = preview(client, monkeypatch)
    write(client, cmd("hydration.save", local_date="2026-10-05", ml=1000))
    r = client.post(
        "/api/v2/commands",
        json=cmd("daily_log.save", token=p["token"], selected=[0, 1]),
    )
    assert r.status_code == 409
    assert client.get("/api/v2/bootstrap").json()["meals"] == []
    current = preview(client, monkeypatch)
    assert current["items"][0]["payload"]["ml"] == 1500


def test_daily_overlapping_sleep_rolls_back_water(client, monkeypatch):
    write(
        client,
        cmd(
            "sleep.save",
            start_date="2026-10-05",
            start_time="03:00",
            end_date="2026-10-05",
            end_time="08:00",
        ),
    )
    p = preview(client, monkeypatch)
    r = client.post(
        "/api/v2/commands",
        json=cmd("daily_log.save", token=p["token"], selected=[0, 2]),
    )
    assert r.status_code == 409
    assert client.get("/api/v2/bootstrap").json()["hydrations"] == []


def test_daily_token_tamper_other_owner_and_blocked(client, app, monkeypatch):
    p = preview(client, monkeypatch)
    other = login(app, "arda", "test-password-456")
    for c, token in [(other, p["token"]), (client, p["token"] + "x")]:
        assert (
            c.post(
                "/api/v2/commands",
                json=cmd("daily_log.save", token=token, selected=[0]),
            ).status_code
            == 409
        )
    for selection in [[-1], [0, 0], [True], [], [50]]:
        assert (
            client.post(
                "/api/v2/commands",
                json=cmd("daily_log.save", token=p["token"], selected=selection),
            ).status_code
            == 422
        )
    parsed = extraction()
    parsed.entries[0].scope = "unknown"
    p = preview(client, monkeypatch, parsed)
    assert p["items"][0]["blocked"]
    assert (
        client.post(
            "/api/v2/commands",
            json=cmd("daily_log.save", token=p["token"], selected=[0]),
        ).status_code
        == 422
    )


def test_daily_unknown_movement_is_not_fabricated():
    data = d.Narrative(
        local_date=date(2026, 10, 5),
        messages=["3 set 5 tekrar uzay hareketi yaptım."],
        consent=d.CONSENT,
    )
    parsed = d.Extraction(
        entries=[
            d.Entry(
                kind="workout",
                quote=data.messages[0],
                movements=[
                    d.Movement(
                        name="uzay hareketi", quote=data.messages[0], sets=3, reps=5
                    )
                ],
            )
        ]
    )
    p = d.review(data, parsed, {"cursor": 0})
    assert not p["items"][0]["payload"]["sets"]
    assert "varyant" in p["items"][0]["warning"]
    parsed.entries[0].movements[0].reps = 17
    with pytest.raises(ValueError):
        d.validate_quotes(data, parsed)


def test_daily_overnight_and_expiry(monkeypatch):
    data = d.Narrative(
        local_date=date(2026, 10, 5), messages=["23:00–07:00 uyudum"], consent=d.CONSENT
    )
    p = d.review(
        data,
        d.Extraction(
            entries=[
                d.Entry(
                    kind="sleep", quote=data.messages[0], start="23:00", end="07:00"
                )
            ]
        ),
        {"cursor": 0},
    )
    assert p["items"][0]["payload"]["start_date"] == "2026-10-04"
    token = d.sign("owner", p)
    monkeypatch.setattr(d.time, "time", lambda: 10**12)
    with pytest.raises(DomainError):
        d.verify("owner", token)


def test_daily_transport_only_explicit_messages(monkeypatch):
    captured = []

    class Opener:
        def open(self, request, **_):
            captured.append(json.loads(request.data))
            return io.BytesIO(
                json.dumps(
                    {
                        "choices": [
                            {
                                "finish_reason": "stop",
                                "message": {"content": extraction().model_dump_json()},
                            }
                        ]
                    }
                ).encode()
            )

    monkeypatch.setattr("urllib.request.build_opener", lambda *_: Opener())
    assert d.extract(evren_settings(), narrative()).entries
    assert json.loads(captured[0]["messages"][1]["content"]) == {
        "selected_date": "2026-10-05",
        "messages": [TEXT],
    }
    parsed = extraction()
    parsed.entries[0].quote = "invented"
    with pytest.raises(ValueError):
        d.validate_quotes(narrative(), parsed)


def test_daily_conflicting_water_totals_blocked():
    parsed = extraction()
    parsed.entries.append(parsed.entries[0].model_copy())
    p = d.review(narrative(), parsed, {"cursor": 0})
    assert p["items"][0]["blocked"] and p["items"][-1]["blocked"]


def test_daily_hallucinated_clock_and_movement_are_rejected():
    parsed = extraction()
    parsed.entries[2].start = "13:47"
    with pytest.raises(ValueError):
        d.validate_quotes(narrative(), parsed)
    parsed = extraction()
    parsed.entries[-1].movements[0].name = "squat"
    p = d.review(narrative(), parsed, {"cursor": 0})
    assert p["items"][-1]["payload"]["sets"] == []


@pytest.mark.parametrize(
    "finish,content",
    [
        ("length", "{}"),
        ("stop", "not json"),
        ("stop", '{"entries":[{"kind":"delete_account"}]}'),
    ],
)
def test_daily_invalid_provider_output_cannot_write(monkeypatch, finish, content):
    class Opener:
        def open(self, *_args, **_kwargs):
            return io.BytesIO(
                json.dumps(
                    {
                        "choices": [
                            {"finish_reason": finish, "message": {"content": content}}
                        ]
                    }
                ).encode()
            )

    monkeypatch.setattr("urllib.request.build_opener", lambda *_: Opener())
    with pytest.raises(DomainError):
        d.extract(evren_settings(), narrative())


def test_daily_invalid_command_and_concurrent_commit(client, app, monkeypatch):
    from concurrent.futures import ThreadPoolExecutor
    from uuid import UUID

    from alos.contracts import Command
    from alos.service import execute

    p = preview(client, monkeypatch)
    assert (
        client.post(
            "/api/v2/commands",
            json=cmd("daily_log.delete", token=p["token"], selected=[0]),
        ).status_code
        == 422
    )
    athlete_id = UUID(client.get("/api/v2/bootstrap").json()["athlete_id"])

    def run(_):
        try:
            execute(
                app.state.database,
                athlete_id,
                Command.model_validate(
                    cmd("daily_log.save", token=p["token"], selected=[0, 1])
                ),
            )
            return "saved"
        except DomainError as exc:
            return exc.code

    with ThreadPoolExecutor(2) as pool:
        results = list(pool.map(run, [0, 1]))
    assert results.count("saved") == 1
    assert len(client.get("/api/v2/bootstrap").json()["hydrations"]) == 1


def test_daily_followup_quotes_and_explicit_nutrients():
    data = d.Narrative(
        local_date=date(2026, 10, 5),
        messages=["Pilav yedim.", "Miktarı 150 g ve 250 kcal."],
        consent=d.CONSENT,
    )
    parsed = d.Extraction(
        entries=[
            d.Entry(
                kind="meal",
                name="Pilav",
                quote="Pilav yedim.\nMiktarı 150 g ve 250 kcal.",
                grams=150,
                kcal=250,
            )
        ]
    )
    p = d.review(data, parsed, {"cursor": 0})
    assert p["items"][0]["payload"]["grams"] == 150
    assert p["items"][0]["payload"]["kcal"] == 250
    assert "protein_g" not in p["items"][0]["payload"]


def test_daily_inconsistent_sleep_and_unknown_work_preparation():
    data = d.Narrative(
        local_date=date(2026, 10, 5),
        messages=["02:00–07:00 uyudum 6 saat.", "10:00–18:00 işteydim."],
        consent=d.CONSENT,
    )
    parsed = d.Extraction(
        entries=[
            d.Entry(
                kind="sleep",
                quote=data.messages[0],
                start="02:00",
                end="07:00",
                amount=6,
                unit="h",
            ),
            d.Entry(kind="work", quote=data.messages[1], start="10:00", end="18:00"),
        ]
    )
    p = d.review(data, parsed, {"cursor": 0})
    assert all(i["blocked"] for i in p["items"])


def test_daily_explicit_rir_and_rpe_are_preserved():
    text = "3 set 5 tekrar pushup RIR 2 RPE 8 yaptım."
    data = d.Narrative(local_date=date(2026, 10, 5), messages=[text], consent=d.CONSENT)
    parsed = d.Extraction(
        entries=[
            d.Entry(
                kind="workout",
                quote=text,
                movements=[
                    d.Movement(name="pushup", quote=text, sets=3, reps=5, rir=2, rpe=8)
                ],
            )
        ]
    )
    result = d.review(data, parsed, {"cursor": 0})
    sets = result["items"][0]["payload"]["sets"]
    assert len(sets) == 3 and all(x["rir"] == 2 and x["rpe"] == 8 for x in sets)
