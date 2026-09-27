"""Offline mapping rehearsal; consumes {kind: [records]}, never a database URI."""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "apps/api"))
from alos.movement_migration import preview, transform

parser = argparse.ArgumentParser()
parser.add_argument("input", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--proposal", type=Path)
parser.add_argument("--rollback", action="store_true")
args = parser.parse_args()
if args.input.stat().st_size > 32 * 1024 * 1024:
    parser.error("Input exceeds 32 MiB offline rehearsal limit")
records = json.loads(args.input.read_text())
if args.output.exists():
    parser.error("Refusing to overwrite an existing file")
result = (
    transform(records, json.loads(args.proposal.read_text()), args.rollback)
    if args.proposal
    else preview(records)
)
with args.output.open("x") as output:
    output.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print("Offline copy prepared. No database was accessed.")
