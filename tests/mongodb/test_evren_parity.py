"""Same explicit consent and persistence contract on isolated local MongoDB."""

from test_evren_planning import (
    test_evren_api_consent_and_persistence,
    test_long_cardio_capacity_reaches_provider_and_saves_draft,
    test_recorded_live_synthetic_plan_saves_and_reads_back,
)

__all__ = [
    "test_evren_api_consent_and_persistence",
    "test_long_cardio_capacity_reaches_provider_and_saves_draft",
    "test_recorded_live_synthetic_plan_saves_and_reads_back",
]
