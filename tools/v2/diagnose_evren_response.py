"""Manual synthetic EVREN five-day reproduction. No DB access. Secret via hidden prompt or stdin pipe."""

import getpass
import hashlib
import io
import json
import runpy
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, "apps/api")
from alos import ai_planning as ai
from alos.config import Settings
from pydantic import SecretStr, ValidationError

key = (
    getpass.getpass("EVREN key (hidden): ") if sys.stdin.isatty() else sys.stdin.read()
)
base = runpy.run_path("tools/v2/benchmark_evren.py")["CASES"]["skill"]
data = ai.AIRequest.model_validate(
    base | {"weekdays": [0, 1, 2, 4, 5], "split": "push_pull_legs", "minutes": 60}
)
baseline, context = ai.prepare(
    data, {"timezone": "Europe/Istanbul", "cursor": 1, "sets": []}, datetime.now(UTC)
)
config = Settings(
    database_url="postgresql://localhost:15432/alos_test_unused",
    ai_provider="evren",
    evren_api_key=SecretStr(key),
    evren_model="qwen3.8-flash-next",
    evren_reasoning_effort="low",
)
original = ai.build_opener
record = {
    "synthetic": True,
    "personal_data_read": False,
    "source_commit": subprocess.check_output(
        ["git", "rev-parse", "HEAD"], text=True
    ).strip(),
    "ai_source_sha256": hashlib.sha256(
        Path("apps/api/alos/ai_planning.py").read_bytes()
    ).hexdigest(),
    "prompt_version": ai.VERSION,
    "at": datetime.now(UTC).isoformat(),
}


class Capture:
    def __init__(self, o):
        self.o = o

    def open(self, *a, **kw):
        with self.o.open(*a, **kw) as r:
            raw = r.read(1000001)
        payload = json.loads(raw)
        choice = payload.get("choices", [{}])[0]
        record.update(
            finish_reason=choice.get("finish_reason"),
            usage={
                k: v
                for k, v in payload.get("usage", {}).items()
                if k
                in {
                    "prompt_tokens",
                    "completion_tokens",
                    "total_tokens",
                    "completion_tokens_details",
                }
            },
        )
        # Synthetic generated output only; never reasoning, headers or credentials.
        content = choice.get("message", {}).get("content", "")
        record["content"] = content
        try:
            ai.AIPlan.model_validate_json(
                content.strip().removeprefix("```json\n").removesuffix("\n```")
            )
        except ValidationError as e:
            record["schema_errors"] = [
                {"loc": v["loc"], "type": v["type"]} for v in e.errors()
            ]
        return io.BytesIO(raw)


ai.build_opener = lambda *a: Capture(original(*a))
start = time.monotonic()
try:
    plan = ai.call_evren(config, context)
    result = ai.validate_plan(
        plan, data, baseline, context, datetime.now(UTC), config.evren_model, "EVREN"
    )
    record.update(result="PASS", review=result["review"]["status"])
except Exception as e:  # noqa: BLE001 — report type only; never leak credentials or provider errors
    record.update(
        result="FAIL", error_type=type(e).__name__, code=getattr(e, "code", None)
    )
record["elapsed_seconds"] = round(time.monotonic() - start, 2)
Path(
    "docs/evidence/evren/response-probe-"
    + datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    + ".json"
).write_text(json.dumps(record, ensure_ascii=False, indent=2))
print(
    json.dumps({k: v for k, v in record.items() if k != "content"}, ensure_ascii=False),
    flush=True,
)

sys.exit(0 if record["result"] == "PASS" else 1)
