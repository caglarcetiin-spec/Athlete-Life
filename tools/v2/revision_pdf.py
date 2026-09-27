"""Synthetic multi-page PDF visual fixture; no database or personal files."""

import json
import sys
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps/api"))
from alos.domain.science import compute
from alos.reports import build_pdf, report_sections

out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
as_of = datetime(2026, 9, 27, 20, tzinfo=UTC)
snapshot = {
    "timezone": "Europe/Istanbul",
    "cursor": 1,
    "sets": [],
    "goals": [],
    "meals": [
        {
            "id": "meal-a",
            "version": 1,
            "local_date": "2026-09-27",
            "kcal": 300,
            "protein_g": 15,
        },
        {"id": "meal-b", "version": 1, "local_date": "2026-09-27", "kcal": 100},
    ],
}
for i in range(90):
    at = as_of - timedelta(days=i)
    snapshot["sets"].append(
        {
            "id": f"set-{i}",
            "version": 1,
            "movement_id": "barbell-squat",
            "name": "Barbell Squat",
            "modality": "strength",
            "status": "completed",
            "local_date": at.date().isoformat(),
            "occurred_at": at.isoformat(),
            "reps": 10,
            "external_kg": 60,
            "rir": 2,
            "set_kind": "working",
        }
    )
for i in range(12):
    snapshot["goals"].append(
        {
            "id": f"goal-{i}",
            "version": 1,
            "title": (
                "Sentetik ölçüm: Çekiş gücü, çalışma düzeni ve sürdürülebilir kayıt; ıİ şŞ ğĞ üÜ öÖ çÇ. "
                * 5
            )
            + str(i),
            "metric": "custom",
            "baseline": 80,
            "target": 76,
            "unit": "kg",
            "start_date": "2026-07-01",
            "target_date": "2026-12-31",
            "archived": False,
        }
    )
result = compute(snapshot, as_of, window_days=90)
content = build_pdf(snapshot, result, "Sentetik Revizyon — kişisel veri içermez")
(out / "synthetic-report.pdf").write_bytes(content)
preview = report_sections(snapshot, result)
assert preview["sections"][-1]["rows"][0][0:2] == [400, 15]
(out / "pdf-check.json").write_text(
    json.dumps(
        {
            "scope": "synthetic 90 dates and 12 long Turkish goals; 400 kcal / 15 g known protein",
            "sha256": sha256(content).hexdigest(),
            "bytes": len(content),
            "preview_sections": [r["title"] for r in preview["sections"]],
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n"
)
print(
    "Synthetic multi-page PDF and source hash written; visual inspection is separate."
)
