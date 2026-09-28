"""Explicit live EVREN probe: synthetic form only, no database or account records.

Run manually with user-authorized key; not part of automated test suites.
Credentials are prompted without echo and are never written to artifacts.
"""

import argparse
import getpass
import hashlib
import json
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, build_opener

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps/api"))
from alos import ai_planning as ai
from alos.config import Settings
from alos.errors import DomainError
from pydantic import SecretStr


def probe(key, model, reasoning_effort=None):
    started = time.monotonic()
    at = datetime.now(UTC)
    record = {
        "at": at.isoformat(),
        "provider": "EVREN",
        "model": model,
        "reasoning_effort": reasoning_effort,
        "synthetic": True,
        "personal_records_read": False,
        "generation_attempts": 0,
        "source_commit": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip(),
        "source_hashes": {
            p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest()
            for p in ("apps/api/alos/ai_planning.py", "tools/v2/verify_evren.py")
        },
        "command": [
            ".venv-v2/bin/python",
            "tools/v2/verify_evren.py",
            "--model",
            model,
        ],
        "environment": "local Python; no database connection; manually entered in-memory secret",
    }
    if reasoning_effort is not None:
        record["command"].extend(["--reasoning-effort", reasoning_effort])
    settings = Settings(
        database_url="postgresql://localhost:15432/alos_test_unused",
        ai_provider="evren",
        evren_api_key=SecretStr(key),
        evren_model=model,
        evren_reasoning_effort=reasoning_effort,
    )
    opener = build_opener(ai.NoRedirect())

    def get(path):
        request = Request(
            "https://evren-llmapi.ssyz.org.tr/v1" + path,
            headers={"Authorization": "Bearer " + key},
        )
        with opener.open(request, timeout=25) as response:
            return json.loads(response.read(1_000_000))

    try:
        record["terms_accepted"] = get("/terms/status").get("accepted") is True
        if not record["terms_accepted"]:
            record["result"] = "BLOCKED_TERMS"
        elif model not in [m["id"] for m in get("/models").get("data", [])]:
            record["result"] = "MODEL_NOT_AVAILABLE"
        else:
            data = ai.AIRequest.model_validate(
                {
                    "experience": "regular",
                    "objective": "hypertrophy",
                    "equipment": ["EZ Bar", "Rings", "Pull-Up Bar"],
                    "weekdays": [0, 1, 3, 4],
                    "minutes": 75,
                    "split": "upper_lower",
                    "focus": {"back": 3, "shoulders": 2},
                    "goal": "Sentetik deneme: ağırlık ve kalistenik ile dengeli çalışma; gerçek kişi profili değildir.",
                    "methods": ["weights", "calisthenics"],
                    "competencies": [
                        {"movement_id": "pull-up", "reps": 10},
                        {"movement_id": "ring-dip", "reps": 10},
                    ],
                    "conditioning_minutes": 10,
                    "weeks": 4,
                    "start_date": "2026-09-28",
                    "name": "Sentetik API bağlantı denemesi",
                    "adult": True,
                    "symptoms": False,
                    "consent": ai.EVREN_CONSENT,
                }
            )
            baseline, context = ai.prepare(
                data, {"timezone": "Europe/Istanbul", "cursor": 1, "sets": []}, at
            )
            record["generation_attempts"] = 1
            plan = ai.call_provider(settings, context)
            validated = ai.validate_plan(
                plan, data, baseline, context, at, model, "EVREN"
            )
            record.update(
                result="PASS",
                days=len(plan.days),
                exercises=sum(len(d.exercises) for d in plan.days),
                validation_status=validated["review"]["status"],
            )
    except DomainError as exc:
        record.update(result="FAIL", code=exc.code, message=str(exc))
    except HTTPError as exc:
        record.update(result="FAIL", http_status=exc.code)
    except Exception as exc:  # noqa: BLE001 — never expose provider bodies or credentials
        record.update(result="FAIL", error_type=type(exc).__name__)
    record["elapsed_seconds"] = round(time.monotonic() - started, 2)
    record["exit_code"] = 0 if record["result"] == "PASS" else 1
    directory = ROOT / "docs/evidence/evren"
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / ("live-" + at.strftime("%Y%m%dT%H%M%S%fZ") + ".json")
    path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(record, ensure_ascii=False), flush=True)
    return record


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True)
    parser.add_argument(
        "--reasoning-effort",
        choices=["none", "minimal", "low", "medium", "high", "xhigh"],
    )
    args = parser.parse_args()
    secret = getpass.getpass("EVREN key (hidden): ").strip()
    raise SystemExit(probe(secret, args.model, args.reasoning_effort)["exit_code"])
