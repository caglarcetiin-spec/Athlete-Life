"""Capture a reproducible synthetic test command without collecting environment secrets."""

import argparse
import hashlib
import json
import os
import platform
import shutil
import subprocess
from datetime import UTC, datetime
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--stage", choices=[str(i) for i in range(10)], default="6")
parser.add_argument("name")
parser.add_argument("command", nargs=argparse.REMAINDER)
args = parser.parse_args()
if not args.command or not args.name.replace("-", "").replace("_", "").isalnum():
    parser.error("A simple evidence name and explicit command are required")
root = Path(__file__).resolve().parents[2]
evidence = root / ("docs/evidence/stage-" + args.stage)
evidence.mkdir(parents=True, exist_ok=True)
manifest = {}
for area in ("apps/api", "apps/web/src", "infra/v2", "tests/v2", "tests/mongodb", "tools/v2"):
    for current, dirs, files in os.walk(root / area):
        dirs[:] = sorted(
            d
            for d in dirs
            if d
            not in {
                "__pycache__",
                ".pytest_cache",
                ".ruff_cache",
                "node_modules",
                "dist",
            }
            and not d.endswith(".egg-info")
        )
        for name in sorted(files):
            path = Path(current) / name
            if path.suffix in {
                ".py",
                ".ts",
                ".tsx",
                ".js",
                ".mjs",
                ".css",
                ".json",
                ".toml",
                ".yaml",
                ".yml",
                ".lock",
            }:
                manifest[str(path.relative_to(root))] = hashlib.sha256(
                    path.read_bytes()
                ).hexdigest()
started = datetime.now(UTC)
previous = evidence / (args.name + ".json")
if previous.exists():
    history = (
        evidence / "runs" / (args.name + "-" + started.strftime("%Y%m%dT%H%M%S%fZ"))
    )
    history.mkdir(parents=True)
    for suffix in (".json", ".log"):
        old = evidence / (args.name + suffix)
        if old.exists():
            shutil.copy2(old, history / old.name)
with (evidence / (args.name + ".log")).open("wb") as output:
    completed = subprocess.run(
        args.command, cwd=root, stdout=output, stderr=subprocess.STDOUT, check=False
    )
finished = datetime.now(UTC)
metadata = {
    "command": args.command,
    "cwd": str(root),
    "base_commit": subprocess.check_output(
        ["git", "rev-parse", "HEAD"], cwd=root, text=True
    ).strip(),
    "branch": subprocess.check_output(
        ["git", "branch", "--show-current"], cwd=root, text=True
    ).strip(),
    "working_tree_sources": manifest,
    "platform": platform.platform(),
    "test_environment": {
        key: os.environ[key]
        for key in ("PYTHON_DOTENV_DISABLED", "STORAGE_BACKEND", "ACCOUNT_STORAGE_BACKEND", "ALOS_TEST_BACKEND")
        if key in os.environ
    },
    "started_at": started.isoformat(),
    "finished_at": finished.isoformat(),
    "elapsed_seconds": (finished - started).total_seconds(),
    "exit_code": completed.returncode,
    "data_scope": "Only isolated synthetic fixtures; no production source or environment values collected.",
}
(evidence / (args.name + ".json")).write_text(json.dumps(metadata, indent=2) + "\n")
print(
    f"{args.name}: exit {completed.returncode}; {metadata['elapsed_seconds']:.2f}s; {evidence / (args.name + '.log')}"
)
raise SystemExit(completed.returncode)
