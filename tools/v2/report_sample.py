from datetime import datetime, timezone
from pathlib import Path

from alos.domain.science import compute
from alos.reports import build_pdf

snapshot = {
    "timezone": "Europe/Istanbul",
    "cursor": 2,
    "sets": [
        {
            "id": "synthetic",
            "version": 1,
            "local_date": "2026-09-15",
            "occurred_at": "2026-09-15T10:00:00Z",
            "modality": "strength",
            "movement_id": "Weighted Pull-Up",
            "name": "Weighted Pull-Up",
            "reps": 5,
            "external_kg": 20,
            "status": "completed",
        }
    ],
    "goals": [
        {
            "id": "goal",
            "version": 1,
            "title": "Çekiş gücümü ölçüyorum",
            "metric": "custom",
            "baseline": 5,
            "target": 10,
            "unit": "tekrar",
            "start_date": "2026-09-01",
            "target_date": "2026-12-01",
            "archived": False,
        }
    ],
    "goal_measurements": [
        {
            "id": "measurement",
            "version": 1,
            "local_date": "2026-09-15",
            "goal_id": "goal",
            "value": 6,
        }
    ],
    "labs": [
        {
            "id": "lab",
            "version": 1,
            "local_date": "2026-09-15",
            "analyte": "Sentetik örnek; klinik veri değil",
            "value": 12,
            "unit": "örnek birim",
            "reference_low": 8,
            "reference_high": 15,
            "laboratory": "Sentetik test laboratuvarı",
            "method": "Test yöntemi",
        }
    ],
}
result = compute(snapshot, datetime(2026, 9, 15, 20, tzinfo=timezone.utc))
Path("docs/evidence/stage-5/synthetic-report.pdf").write_bytes(
    build_pdf(snapshot, result, "Deniz - sentetik test profili")
)
