"""Same explicit consent and persistence contract on isolated local MongoDB."""

from test_evren_planning import (
    test_evren_api_consent_and_persistence,
    test_long_cardio_capacity_reaches_provider_and_saves_draft,
)

__all__ = [
    "test_evren_api_consent_and_persistence",
    "test_long_cardio_capacity_reaches_provider_and_saves_draft",
]
