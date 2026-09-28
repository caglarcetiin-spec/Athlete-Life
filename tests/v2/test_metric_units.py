"""Canonical metric audit; synthetic records only, no physiological validation."""

import pytest
from alos.lifestyle import CapabilityInput
from alos.sport_training import DEFINITIONS, PROFILES
from conftest import cmd
from pydantic import ValidationError
from test_core import write


@pytest.mark.parametrize("sport", list(PROFILES))
def test_all_branch_rows_use_declared_time_metric(sport):
    rows = [r for r in DEFINITIONS if r.get("sport_id") == sport]
    assert rows
    assert all(r["metric"] == "seconds" and r["modality"] == "circuit" for r in rows)
    assert all(
        not r["muscles"] for r in rows
    )  # duration is not a muscle-damage measurement


def test_hours_minutes_seconds_share_series_and_original_unit_is_preserved(client):
    for value, unit in [(1800, "seconds"), (30, "min"), (0.5, "h")]:
        write(
            client,
            cmd(
                "capability.save",
                local_date="2026-09-15",
                definition_id="custom:run-duration",
                protocol_version="synthetic-1",
                variant="easy",
                value=value,
                unit=unit,
            ),
        )
    series = client.get("/api/v2/capability-series").json()["series"]
    assert len(series) == 1 and series[0]["unit"] == "seconds"
    assert [p["value"] for p in series[0]["points"]] == [1800] * 3
    rows = client.get("/api/v2/bootstrap").json()["capabilitys"]
    assert {r["unit"] for r in rows} == {"seconds", "min", "h"}


def test_time_unit_does_not_turn_repetition_test_into_a_duration():
    with pytest.raises(ValidationError, match="ölçüm türü"):
        CapabilityInput.model_validate(
            {
                "local_date": "2026-09-15",
                "definition_id": "muscle_up",
                "protocol_version": "synthetic-1",
                "variant": "strict",
                "value": 1,
                "unit": "h",
            }
        )
