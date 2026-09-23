"""No DB handle or transport: each fixture owns a fresh, immutable input."""

from copy import deepcopy
from datetime import UTC, datetime, timedelta

from .domain.science import compute


def run():
    at = datetime(2026, 1, 1, 12, tzinfo=UTC)
    fixtures = [
        {"timezone": "UTC", "cursor": 0, "sets": []},
        {
            "timezone": "UTC",
            "cursor": 1,
            "sets": [
                {
                    "id": "synthetic-sprint",
                    "version": 1,
                    "name": "Hill Sprint",
                    "movement_id": "Hill Sprint",
                    "status": "completed",
                    "local_date": "2026-01-01",
                    "occurred_at": at.isoformat(),
                    "modality": "cardio",
                    "seconds": 15,
                    "distance_m": 70,
                }
            ],
        },
    ]
    results = []
    for index, fixture in enumerate(fixtures):
        before = deepcopy(fixture)
        a = compute(fixture, at)
        b = compute(fixture, at + timedelta(hours=48))
        checks = [fixture == before, a == compute(deepcopy(fixture), at)]
        if index == 0:
            checks.extend([a["nutrition"]["totals"]["protein_g"] is None, a["readiness"]["score"] is None])
        else:
            checks.extend(
                [
                    a["modality_loads"][0]["hypertrophy_sets"] is None,
                    b["muscles"]["calves"]["cardio"]["high"] < a["muscles"]["calves"]["cardio"]["high"],
                ]
            )
        results.append(
            {
                "fixture": "empty-unknown" if index == 0 else "sprint-modalities",
                "status": "PASS" if all(checks) else "FAIL",
                "checks": len(checks),
            }
        )
    return {
        "scope": "İzole sentetik domain kontrolü; canlı veriye okuma/yazma yok. Biyolojik doğrulama değildir.",
        "results": results,
    }
