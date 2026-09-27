"""Reuse the unchanged business assertions against real MongoDB, not mongomock."""

from test_backups import *
from test_body_model import *
from test_lifecycle import *
from test_lifestyle import *
from test_revision import *
from test_science import *
from test_workouts import *


def test_revision_additive_fields_read_old_documents_without_rewrite(client, app):
    from conftest import cmd
    from test_core import write

    profile = write(client, cmd("profile.save", experience="regular"))["entity"]
    session = write(
        client, cmd("session.open", local_date="2026-09-15", title="Synthetic")
    )["entity"]
    set_ = write(
        client,
        cmd(
            "set.save",
            session_id=session["id"],
            movement_id="barbell-squat",
            name="Squat",
            reps=10,
            time_precision="date_only",
        ),
    )["entity"]
    fields = [
        ("athlete_profiles", profile["id"], ["planning_preferences"]),
        ("workout_sessions", session["id"], ["planning_context", "feedback"]),
        (
            "performed_sets",
            set_["id"],
            ["catalog_version", "set_kind", "superset_group", "sequence"],
        ),
    ]
    for table, identity, keys in fields:
        collection = app.state.database.collection(table)
        result = collection.update_one(
            {"id": identity}, {"$unset": {key: "" for key in keys}}
        )
        assert result.matched_count == 1
    loaded = client.get("/api/v2/bootstrap").json()
    assert loaded["profiles"][0]["planning_preferences"] == {}
    assert loaded["sessions"][0]["feedback"] == {}
    assert loaded["sets"][0]["set_kind"] == "unknown"
    assert "set_kind" not in app.state.database.collection("performed_sets").find_one(
        {"id": set_["id"]}
    )
