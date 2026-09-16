"""Append-only MongoDB snapshots; one atomic insert is one durable commit.

The latest revision is the current state, avoiding a partially written separate
head document. Snapshot payloads preserve arbitrary legacy JSON keys verbatim.
"""
import json
from state_common import canonical_json, checksum, data_weight, utcnow


class MongoStore:
    backend = "mongodb"

    def __init__(self, uri, database):
        from pymongo import MongoClient
        from pymongo.write_concern import WriteConcern
        self.client = MongoClient(uri, serverSelectionTimeoutMS=20000, connectTimeoutMS=10000,
                                  socketTimeoutMS=15000)
        self.collection = self.client[database].get_collection(
            "state_revisions", write_concern=WriteConcern(w="majority"))

    def init_db(self):
        self.client.admin.command("ping")
        self.collection.create_index("revision", unique=True)

    @staticmethod
    def decode(row):
        if row is None:
            return None
        try:
            data = json.loads(row["payload"])
            if checksum(data) != row["checksum"]:
                return None
            return {"revision": row["revision"], "savedAt": row["saved_at"],
                    "reason": row["reason"], "checksum": row["checksum"],
                    "weight": row["weight"], "data": data}
        except (ValueError, KeyError, TypeError):
            return None

    def read_state(self):
        for row in self.collection.find().sort("revision", -1).limit(250):
            decoded = self.decode(row)
            if decoded is not None:
                return decoded
        if self.collection.find_one({}, {"_id": 1}) is not None:
            raise RuntimeError("no verified revision available")
        return None

    def commit_state(self, data, reason):
        from bson import BSON
        from pymongo.errors import DuplicateKeyError
        if not isinstance(data, dict) or not isinstance(data.get("meta", {}), dict):
            raise ValueError("state and meta must be objects")
        client_rev = int(data.get("meta", {}).get("persistenceRevision") or 0)
        for _ in range(20):
            latest = self.collection.find_one({}, {"revision": 1}, sort=[("revision", -1)])
            revision = max(latest["revision"] if latest else 0, client_rev) + 1
            saved_at = utcnow()
            cloned = json.loads(canonical_json(data))
            cloned.setdefault("meta", {}).update(persistenceRevision=revision,
                lastSavedAt=saved_at, lastSaveReason=reason)
            row = {"_id": revision, "schema_version": 1, "revision": revision,
                   "saved_at": saved_at, "reason": reason, "checksum": checksum(cloned),
                   "weight": data_weight(cloned), "payload": canonical_json(cloned)}
            if len(BSON.encode(row)) > 16 * 1024 * 1024:
                raise ValueError("snapshot exceeds MongoDB document limit")
            try:
                self.collection.insert_one(row)
            except DuplicateKeyError:
                continue
            # Retention is maintenance: a failure must not turn a committed save
            # into a failed response. Future successful commits retry pruning.
            try:
                boundary = list(self.collection.find({}, {"revision": 1})
                                .sort("revision", -1).skip(249).limit(1))
                if boundary:
                    self.collection.delete_many({"revision": {"$lt": boundary[0]["revision"]}})
            except Exception:
                pass
            return self.decode(row)
        raise RuntimeError("concurrent save contention; retry")

    def list_revisions(self):
        return list(self.collection.find({}, {"_id": 0, "revision": 1, "saved_at": 1,
                    "reason": 1, "checksum": 1, "weight": 1}).sort("revision", -1).limit(50))

    def revision_data(self, revision):
        row = self.collection.find_one({"revision": revision})
        decoded = self.decode(row)
        if row is not None and decoded is None:
            raise ValueError("revision checksum mismatch")
        return decoded["data"] if decoded else None
