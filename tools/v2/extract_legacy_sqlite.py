"""Read-only local export. Select one account explicitly; never reads auth/session tables."""

import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("destination", type=Path)
parser.add_argument("--account-id")
args = parser.parse_args()
source = args.source.resolve(strict=True)
if args.destination.resolve() == source:
    raise SystemExit("Destination must differ from source")
if args.destination.exists():
    raise SystemExit("Destination exists; choose a new file")
conn = sqlite3.connect(source.as_uri() + "?mode=ro", uri=True)
conn.execute("PRAGMA query_only=ON")
conn.execute("BEGIN")
tables = {
    r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
}
if "account_revisions" in tables:
    if not args.account_id:
        raise SystemExit(
            "Account database requires explicit --account-id; no account auto-selection"
        )
    row = conn.execute(
        "SELECT payload FROM account_revisions WHERE user_id=? ORDER BY revision DESC LIMIT 1",
        (args.account_id,),
    ).fetchone()
elif "app_state" in tables:
    row = conn.execute("SELECT payload FROM app_state WHERE id=1").fetchone()
else:
    raise SystemExit("Recognized athlete state table not found")
if not row or len(row[0]) > 16 * 1024 * 1024:
    raise SystemExit("Missing or oversized state")
data = json.loads(row[0])
output = {
    "app": "Athlete Life OS",
    "format": "legacy-sqlite-readonly",
    "data": data,
    "source_file_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
}
with args.destination.open("x") as file:
    json.dump(output, file, ensure_ascii=False)
conn.rollback()
conn.close()
print("Read-only export created. Passwords and sessions excluded.")
