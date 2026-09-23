"""Explicit, resumable v10 Mongo cutover. Never called by web startup.

The source must be quiesced by the operator. Old collections are read only.
Each account receives a deterministic identity; username collisions fail closed.
"""
import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID, uuid5

from bson import json_util
from sqlalchemy import select

from .backups import full_export, parse_bytes, stage, validate_export
from .contracts import Command
from .credentials import supported
from .models import Athlete, RecoveryCode, User
from .mongo_db import retry_transaction
from .service import execute

NAMESPACE = UUID("5f4e8e99-73b8-437f-a32b-5519d0c29b07")


def fingerprint(bundle):
    return hashlib.sha256(json_util.dumps(bundle, sort_keys=True).encode()).hexdigest()


def package_from(bundle):
    row = bundle.get("state")
    data = parse_bytes(row["payload"].encode()) if row else {}
    if row:
        canonical = json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        if hashlib.sha256(canonical.encode()).hexdigest() != row["checksum"]:
            raise ValueError("Source snapshot checksum mismatch")
    photos = []
    for item in bundle.get("photos", []):
        if not item.get("deleted") and item.get("payload"):
            if hashlib.sha256(item["payload"].encode()).hexdigest() != item["hash"]:
                raise ValueError("Source photo checksum mismatch")
            photos.append(parse_bytes(item["payload"].encode()))
    package = {"format": "legacy-mongo-cutover", "data": data, "photos": photos}
    if "preview_journal" in bundle:
        # Unacknowledged commands remain archival; never invent missing fields or replay them.
        package["preview_device_journal"] = bundle["preview_journal"]
    return package


@retry_transaction
def prepare(database, bundle):
    raw = bundle["user"]
    owner = str(raw["_id"])
    uid, aid = uuid5(NAMESPACE, "user:" + owner), uuid5(NAMESPACE, "athlete:" + owner)
    digest = fingerprint(bundle)
    if not supported(raw.get("password_hash")):
        raise ValueError("Unsupported source credential format")
    if not isinstance(raw.get("username"), str) or not 3 <= len(raw["username"]) <= 40:
        raise ValueError("Invalid source username")
    with database.sessions.begin() as db:
        marker = database.collection("cutovers").find_one({"_id": owner}, session=db.session)
        if marker:
            if marker["source_digest"] != digest:
                raise ValueError("Source changed after cutover preparation; reconciliation required")
            return aid, digest, marker["status"]
        if db.scalar(select(User).where(User.username == raw["username"].casefold())) or db.get(User, uid):
            raise ValueError("Destination identity collision; no account overwritten")
        db.add(User(id=uid, username=raw["username"].casefold(), name=raw["name"],
                    email=raw.get("email") or None, password_hash=raw["password_hash"],
                    auth_epoch=raw.get("auth_epoch", 0),
                    created_at=datetime.fromtimestamp(raw["created_at"], UTC)))
        db.flush()
        db.add(Athlete(id=aid, user_id=uid))
        db.flush()
        for code in raw.get("recovery_codes", []):
            if not isinstance(code, str) or len(code) != 64:
                raise ValueError("Invalid source recovery digest")
            db.add(RecoveryCode(id=uuid5(uid, code), user_id=uid, code_hash=code))
        database.collection("cutovers").insert_one(
            {"_id": owner, "user_id": str(uid), "athlete_id": str(aid), "source_digest": digest, "status": "prepared"},
            session=db.session,
        )
    return aid, digest, "prepared"


def migrate_account(database, bundle):
    # Validate source before any account is created.
    package = package_from(bundle)
    preview = bundle.get("preview")
    if preview is not None:
        validate_export(preview)
    aid, digest, status = prepare(database, bundle)
    if status != "complete":
        # Restore the newer canonical preview first, while the destination is empty.
        # The legacy adapter then archives old plans if a newer active plan exists.
        if preview is not None:
            staged = stage(database, aid, json.dumps(preview, ensure_ascii=False).encode())
            execute(database, aid, Command(
                operation_id=uuid5(aid, "preview:" + digest), entity_id=UUID(staged["id"]),
                expected_version=1, schema_version=1, command_type="import.apply", payload={},
            ))
        imported = stage(database, aid, json.dumps(package, ensure_ascii=False).encode())
        execute(database, aid, Command(
            operation_id=uuid5(aid, "cutover:" + digest), entity_id=UUID(imported["id"]),
            expected_version=1, schema_version=1, command_type="import.apply", payload={},
        ))
        archive = full_export(database, aid)
        if not any(row.get("raw") == package for row in archive["records"]["import"]):
            raise ValueError("Source archive verification failed")
        expected = sum(len(photo.get("photos", {})) for photo in package["photos"])
        expected += len(preview["records"].get("media", [])) if preview is not None else 0
        if len(archive["records"]["media"]) != expected:
            raise ValueError("Photo migration incomplete; source archive retained, cutover stopped")
        if preview is not None:
            for kind, rows in preview["records"].items():
                actual = {row["id"] for row in archive["records"][kind]}
                if any(str(uuid5(aid, "restore:" + row["id"])) not in actual for row in rows):
                    raise ValueError("Preview record verification failed")
        database.collection("cutovers").update_one(
            {"_id": str(bundle["user"]["_id"]), "source_digest": digest},
            {"$set": {"status": "complete", "verified_at": datetime.now(UTC),
                      "counts": archive["counts"]}},
        )
    return {"status": "complete", "athlete_id": str(aid)}
