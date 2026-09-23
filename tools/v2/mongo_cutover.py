"""Explicit operator tool. Reads existing Mongo, writes only V2 prefixed collections.

`inspect` is read only. `snapshot` writes private 0600 BSON recovery files.
`apply` requires the operator to quiesce the old service; never a startup hook.
Connection secrets are read from the existing environment/.env, never printed.
"""
import argparse
import json
import os
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "apps/api"))
from alos.cutover import fingerprint, migrate_account, package_from
from alos.mongo_db import MongoDatabase
from bson import BSON
from dotenv import dotenv_values
from pymongo import MongoClient
from pymongo.read_concern import ReadConcern


def capture(source):
    result = []
    with source.client.start_session() as session:
        session.start_transaction(read_concern=ReadConcern("snapshot"))
        try:
            for user in source.account_users.find({}, session=session).sort("_id", 1):
                owner = str(user["_id"])
                state = source.account_state_revisions.find_one(
                    {"user_id": owner}, sort=[("revision", -1)], session=session,
                )
                photos = list(source.account_photos.find({"owner": owner}, session=session).sort("id", 1))
                result.append({"user": user, "state": state, "photos": photos})
        finally:
            session.abort_transaction()
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("inspect", "snapshot", "apply"))
    parser.add_argument("--directory", type=Path)
    parser.add_argument("--source-frozen", action="store_true")
    args = parser.parse_args()
    config = {**dotenv_values(root / ".env"), **os.environ}
    uri = config.get("MONGODB_URI")
    name = config.get("MONGODB_DATABASE", "athlete_life")
    if not uri or not uri.startswith(("mongodb://", "mongodb+srv://")):
        raise ValueError("Existing Mongo configuration is required")
    with MongoClient(uri, serverSelectionTimeoutMS=10000, maxPoolSize=3) as client:
        bundles = capture(client[name])
        # Validate every source before creating destination identities.
        packages = [package_from(bundle) for bundle in bundles]
        counts = {"accounts": len(bundles), "snapshots": sum(bool(b["state"]) for b in bundles),
                  "photo_records": sum(len(p["photos"]) for p in packages)}
        if args.action == "inspect":
            print(json.dumps({"action": "read-only", "checksums_valid": True, **counts}))
            return
        if args.directory is None:
            raise ValueError("Explicit private snapshot directory is required")
        directory = args.directory.resolve()
        if args.action == "snapshot":
            directory.mkdir(mode=0o700, parents=True, exist_ok=False)
            manifest = []
            for index, bundle in enumerate(bundles):
                filename = f"account-{index}.bson"
                with os.fdopen(os.open(directory / filename, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "wb") as output:
                    output.write(BSON.encode(bundle))
                manifest.append({"file": filename, "sha256": fingerprint(bundle)})
            with os.fdopen(os.open(directory / "manifest.json", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w") as output:
                json.dump(manifest, output)
            print(json.dumps({"private_snapshot_created": True, **counts}))
            return
        if not args.source_frozen:
            raise ValueError("Quiesce the old writer before explicit --source-frozen apply")
        manifest = json.loads((directory / "manifest.json").read_text())
        saved = []
        for item in manifest:
            path = directory / item["file"]
            if path.parent != directory or path.suffix != ".bson":
                raise ValueError("Invalid snapshot filename")
            bundle = BSON(path.read_bytes()).decode()
            if fingerprint(bundle) != item["sha256"]:
                raise ValueError("Private snapshot integrity failure")
            saved.append(bundle)
        if sorted(map(fingerprint, bundles)) != sorted(map(fingerprint, saved)):
            raise ValueError("Live source changed since snapshot; take a fresh frozen snapshot")
        database = MongoDatabase(uri, name)
        try:
            database.migrate()
            for bundle in saved:
                migrate_account(database, bundle)
            if sorted(map(fingerprint, capture(client[name]))) != sorted(map(fingerprint, saved)):
                raise ValueError("Source changed during apply; do not switch traffic")
        finally:
            database.client.close()
        print(json.dumps({"cutover_verified": True, "source_unchanged": True, **counts}))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:  # noqa: BLE001 — CLI fails closed without exposing secrets
        # Driver/validation messages can contain private payloads or credentials.
        print(json.dumps({"status": "stopped", "error_type": type(error).__name__}))
        raise SystemExit(1) from None
