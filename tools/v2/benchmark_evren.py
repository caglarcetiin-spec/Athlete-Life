"""Manual EVREN model comparison on synthetic forms; never connects to a database."""

import argparse
import getpass
import hashlib
import io
import json
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path
from urllib.request import Request, build_opener

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "apps/api"))
from alos import ai_planning as ai
from alos.config import Settings
from alos.errors import DomainError
from pydantic import SecretStr

MODELS = [
    "glm-5.3",
    "mimo-v2.6-pro",
    "deepseek-v4.1-flash",
    "deepseek-v4-flash",
    "qwen3.8-flash-next",
    "gemma-4-31b",
    "qwen3-vl-30b",
]
BASE = {
    "experience": "regular",
    "objective": "hypertrophy",
    "equipment": ["EZ Bar", "Rings", "Pull-Up Bar"],
    "weekdays": [0, 1, 3, 4],
    "minutes": 75,
    "split": "upper_lower",
    "focus": {"back": 3, "shoulders": 2},
    "goal": "Sentetik profil: dengeli kuvvet ve kas gelişimi; ölçülmüş kas hasarı veya kesin gelişim yüzdesi vaat etme.",
    "methods": ["weights", "calisthenics"],
    "competencies": [
        {"movement_id": "pull-up", "reps": 10},
        {"movement_id": "ring-dip", "reps": 10},
    ],
    "conditioning_minutes": 5,
    "weeks": 8,
    "start_date": "2026-09-28",
    "name": "Sentetik model karşılaştırması",
    "adult": True,
    "symptoms": False,
    "consent": ai.EVREN_CONSENT,
}
CASES = {
    "hybrid": BASE,
    "beginner": BASE
    | {
        "experience": "new",
        "equipment": ["Bodyweight"],
        "weekdays": [0, 2, 4],
        "minutes": 35,
        "split": "full_body",
        "focus": {"quads": 3, "back": 2},
        "methods": ["calisthenics"],
        "competencies": [],
        "goal": "Sentetik başlangıç: evde ekipmansız düzenli çalışma alışkanlığı; eksik ekipmanı veya bilinmeyen yetkinliği varsayma.",
    },
    "skill": BASE
    | {
        "experience": "advanced",
        "equipment": ["Rings", "Pull-Up Bar", "EZ Bar", "Outdoor"],
        "weekdays": [0, 1, 3, 4],
        "minutes": 75,
        "split": "upper_lower",
        "focus": {"back": 3, "shoulders": 2},
        "methods": ["weights", "calisthenics", "gymnastics", "conditioning"],
        "competencies": [
            {"movement_id": "front-lever", "seconds": 10},
            {"movement_id": "muscle-up", "reps": 5},
            {"movement_id": "pull-up", "reps": 12},
            {"movement_id": "ring-dip", "reps": 10},
        ],
        "conditioning_minutes": 8,
        "goal": "Sentetik ileri sporcu: front lever ve muscle-up tekniğini korurken kuvvet ve kas gelişimi; beceri setleri önce, süre sınırını aşmadan kısa kondisyon.",
    },
}
LOCAL = threading.local()
ORIGINAL_OPENER = ai.build_opener


class Capture:
    def __init__(self, opener):
        self.opener = opener

    def open(self, request, **kwargs):
        with self.opener.open(request, **kwargs) as response:
            raw = response.read(1_000_001)
        try:
            payload = json.loads(raw)
            usage = payload.get("usage", {})
            LOCAL.transport = {
                "finish_reason": payload.get("choices", [{}])[0].get("finish_reason"),
                "usage": {
                    k: usage[k]
                    for k in ["prompt_tokens", "completion_tokens", "total_tokens"]
                    if k in usage
                },
            }
        except (ValueError, TypeError, AttributeError, IndexError):
            LOCAL.transport = {"parseable": False}
        return io.BytesIO(raw)


def run(key, selected=None, cases=None, repeats=1):
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    folder = ROOT / "docs/evidence/evren" / ("benchmark-" + stamp)
    folder.mkdir(parents=True, exist_ok=True)
    req = Request(
        "https://evren-llmapi.ssyz.org.tr/v1/models",
        headers={"Authorization": "Bearer " + key},
    )
    with build_opener(ai.NoRedirect()).open(req, timeout=25) as response:
        catalog = json.loads(response.read(1000000))["data"]
    available = {m["id"]: m for m in catalog}
    selected = selected or MODELS
    cases = cases or list(CASES)
    meta = {
        "at": stamp,
        "source_commit": subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip(),
        "source_hashes": {
            p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest()
            for p in ["tools/v2/benchmark_evren.py", "apps/api/alos/ai_planning.py"]
        },
        "synthetic": True,
        "personal_records_read": False,
        "database_connections": 0,
        "concurrency": 3,
        "repeats": repeats,
        "cases": cases,
        "models": [
            {k: m[k] for k in ["id", "task", "capabilities"] if k in m}
            for m in catalog
            if m["id"] in selected
        ],
        "selection_rule": "Prefer plan-validation success across cases, then missing focus/method coverage and latency; not clinical validation.",
    }
    (folder / "manifest.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n"
    )
    ai.build_opener = lambda *args: Capture(ORIGINAL_OPENER(*args))

    def one(model, case, repeat):
        start = time.monotonic()
        LOCAL.transport = {}
        record = {"model": model, "case": case, "repeat": repeat, "result": "FAIL"}
        config = Settings(
            database_url="postgresql://localhost:15432/alos_test_unused",
            ai_provider="evren",
            evren_api_key=SecretStr(key),
            evren_model=model,
            evren_reasoning_effort="low"
            if available.get(model, {}).get("capabilities", {}).get("reasoning_effort")
            else None,
        )
        record["reasoning_effort"] = config.evren_reasoning_effort
        plan = None
        try:
            if model not in available:
                raise ValueError("Unavailable model")
            data = ai.AIRequest.model_validate(CASES[case])
            at = datetime.now(UTC)
            baseline, context = ai.prepare(
                data, {"timezone": "Europe/Istanbul", "cursor": 1, "sets": []}, at
            )
            plan = ai.call_provider(config, context)
            validated = ai.validate_plan(
                plan, data, baseline, context, at, model, "EVREN"
            )
            record.update(
                result="PASS", review=validated["review"], notes=validated["notes"]
            )
        except DomainError as exc:
            record.update(code=exc.code, message=str(exc))
        except Exception as exc:  # noqa: BLE001 — sanitized errors only
            record.update(error_type=type(exc).__name__)
        record.update(
            elapsed_seconds=round(time.monotonic() - start, 2),
            transport=LOCAL.transport,
        )
        if plan:
            record["synthetic_plan"] = plan.model_dump(mode="json")
        (folder / f"{model}-{case}-{repeat}.json").write_text(
            json.dumps(record, ensure_ascii=False, indent=2) + "\n"
        )
        print(
            json.dumps(
                {
                    k: record[k]
                    for k in [
                        "model",
                        "case",
                        "repeat",
                        "result",
                        "elapsed_seconds",
                        "code",
                        "error_type",
                    ]
                    if k in record
                }
            ),
            flush=True,
        )
        return record

    records = []
    try:
        with ThreadPoolExecutor(max_workers=3) as pool:
            futures = [
                pool.submit(one, m, c, r)
                for r in range(repeats)
                for c in cases
                for m in selected
            ]
            for future in as_completed(futures):
                records.append(future.result())
    finally:
        ai.build_opener = ORIGINAL_OPENER
    summary = []
    for model in selected:
        rows = [r for r in records if r["model"] == model]
        passed = [r for r in rows if r["result"] == "PASS"]
        summary.append(
            {
                "model": model,
                "valid": len(passed),
                "attempts": len(rows),
                "mean_seconds": round(
                    sum(r["elapsed_seconds"] for r in rows) / len(rows), 2
                ),
                "needs_review": sum(
                    r["review"]["status"] == "needs_review" for r in passed
                ),
                "cases": {
                    c: [r["result"] for r in rows if r["case"] == c] for c in cases
                },
            }
        )
    (folder / "summary.json").write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + "\n"
    )
    print(json.dumps({"folder": str(folder), "summary": summary}), flush=True)
    return folder


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models", nargs="+", choices=MODELS)
    parser.add_argument("--cases", nargs="+", choices=list(CASES))
    parser.add_argument("--repeats", type=int, choices=[1, 2, 3], default=1)
    args = parser.parse_args()
    secret = getpass.getpass("EVREN key (hidden): ").strip()
    run(secret, args.models, args.cases, args.repeats)
