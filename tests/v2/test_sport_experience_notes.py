"""Prove notes reach the provider wire and remain bound to the approved plan.

Synthetic data and transport only: no external request or private account.
"""

import io
import json

import pytest
from alos import ai_planning as ai
from conftest import cmd
from test_ai_planning import data, reply
from test_core import write
from test_evren_planning import evren_settings
from test_science import AT, snap

NOTES = [
    {
        "sport_id": "calisthenics",
        "known_skills": "6 kontrollü barfiks; L tutuş 10 saniye. Tempo: yavaş.",
    },
    {
        "sport_id": "running",
        "known_skills": "30 dk kesintisiz koşu; 5 km 32:15. Sprint bilmiyorum.",
    },
    {
        "sport_id": "swimming",
        "known_skills": "Serbest 100 m: 2:10, kelebek bilmiyorum.\nHaftada iki gün.",
    },
    {
        "sport_id": "boxing",
        "known_skills": "Henüz teknik veya ölçülmüş performans bilgim yok.",
    },
]


@pytest.mark.parametrize("entry", NOTES, ids=[e["sport_id"] for e in NOTES])
def test_notes_reach_evren_wire_unchanged_and_cannot_unlock_skills(monkeypatch, entry):
    request = data(
        consent=ai.EVREN_CONSENT,
        sport_ids=[entry["sport_id"]],
        sport_experience=[entry],
        training_history="İki yıl çalıştım; son üç ay ara verdim.",
        competencies=[],
    )
    baseline, context = ai.prepare(request, snap(), AT)
    captured = {}
    plan = reply(request)

    class Opener:
        def open(self, outgoing, timeout):
            captured.update(json.loads(outgoing.data))
            return io.BytesIO(
                json.dumps(
                    {
                        "choices": [
                            {
                                "finish_reason": "stop",
                                "message": {"content": plan.model_dump_json()},
                            }
                        ]
                    }
                ).encode()
            )

    monkeypatch.setattr(ai, "build_opener", lambda *_: Opener())
    result = ai.call_provider(evren_settings(), context)
    wire = json.loads(captured["messages"][1]["content"])
    assert wire["sport_experience"][0]["known_skills"] == entry["known_skills"]
    assert wire["sport_experience"][0]["sport_id"] == entry["sport_id"]
    assert wire["training_history"] == request.training_history
    assert ai.EXPERIENCE_INSTRUCTIONS in captured["messages"][0]["content"]
    assert not {"front-lever", "muscle-up", "ring-l-sit"} & {
        m["movement_id"] for m in wire["eligible_movements"]
    }
    accepted = ai.validate_plan(
        result, request, baseline, context, AT, "synthetic", "EVREN"
    )
    assert (
        accepted["program"]["guided_choices"]["sport_experience"][0]["known_skills"]
        == entry["known_skills"]
    )


def test_notes_persist_with_the_approved_program(client):
    request = data(sport_ids=["calisthenics", "running"], sport_experience=NOTES[:2])
    baseline, context = ai.prepare(request, snap(), AT)
    accepted = ai.validate_plan(
        reply(request), request, baseline, context, AT, "synthetic", "EVREN"
    )
    saved = write(client, cmd("program.create", **accepted["program"]))["entity"]
    notes = saved["decisions"]["guided_choices"]["sport_experience"]
    assert [(n["sport_id"], n["known_skills"]) for n in notes] == [
        (n["sport_id"], n["known_skills"]) for n in NOTES[:2]
    ]
