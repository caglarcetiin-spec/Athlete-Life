"""Account-scoped snapshots. Existing single-user stores are never opened.

The authenticated server supplies owner, never a client-provided userId.
base_revision provides optimistic concurrency across devices and tabs.
"""
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from state_common import canonical_json, checksum, data_weight, utcnow


class Conflict(Exception):
    pass


def snapshot(owner, data, reason, revision):
    if not isinstance(data, dict) or not isinstance(data.get('meta', {}), dict):
        raise ValueError('state and meta must be objects')
    cloned = json.loads(canonical_json(data))
    now = utcnow()
    cloned.setdefault('meta', {}).update(accountId=owner, persistenceRevision=revision,
                                         lastSavedAt=now, lastSaveReason=reason)
    return {'user_id': owner, 'revision': revision, 'saved_at': now, 'reason': reason,
            'checksum': checksum(cloned), 'weight': data_weight(cloned), 'payload': canonical_json(cloned)}


def decode(row):
    if row is None:
        return None
    data = json.loads(row['payload'])
    if checksum(data) != row['checksum']:
        raise ValueError('snapshot checksum mismatch')
    return {'data': data, 'revision': row['revision'], 'savedAt': row['saved_at'],
            'checksum': row['checksum'], 'reason': row['reason'], 'weight': row['weight']}


class SQLiteAccountStates:
    backend = 'sqlite'

    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.path.touch(mode=0o600, exist_ok=True)
        with self.connect() as db:
            db.execute('''CREATE TABLE IF NOT EXISTS account_revisions (
                user_id TEXT NOT NULL, revision INTEGER NOT NULL, saved_at TEXT NOT NULL,
                reason TEXT NOT NULL, checksum TEXT NOT NULL, weight INTEGER NOT NULL,
                payload TEXT NOT NULL, PRIMARY KEY(user_id, revision))''')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def read_state(self, owner):
        with self.connect() as db:
            return decode(db.execute('SELECT * FROM account_revisions WHERE user_id=? ORDER BY revision DESC LIMIT 1', (owner,)).fetchone())

    def commit_state(self, owner, data, reason, base_revision):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            latest = db.execute('SELECT MAX(revision) FROM account_revisions WHERE user_id=?', (owner,)).fetchone()[0] or 0
            if base_revision != latest:
                raise Conflict('revision changed')
            row = snapshot(owner, data, reason, latest + 1)
            db.execute('INSERT INTO account_revisions VALUES (:user_id,:revision,:saved_at,:reason,:checksum,:weight,:payload)', row)
            db.execute('DELETE FROM account_revisions WHERE user_id=? AND revision<=?', (owner, latest + 1 - 250))
        return decode(row)

    def list_revisions(self, owner):
        with self.connect() as db:
            return [dict(r) for r in db.execute('SELECT revision,saved_at,reason,checksum,weight FROM account_revisions WHERE user_id=? ORDER BY revision DESC LIMIT 50', (owner,))]

    def revision_data(self, owner, revision):
        with self.connect() as db:
            row = db.execute('SELECT * FROM account_revisions WHERE user_id=? AND revision=?', (owner, revision)).fetchone()
        return decode(row)['data'] if row else None


class MongoAccountStates:
    backend = 'mongodb'

    def __init__(self, uri, database):
        from pymongo import MongoClient
        from pymongo.write_concern import WriteConcern
        self.client = MongoClient(uri, serverSelectionTimeoutMS=20000, connectTimeoutMS=10000, socketTimeoutMS=15000)
        self.client.admin.command('ping')
        self.collection = self.client[database].get_collection('account_state_revisions', write_concern=WriteConcern(w='majority'))
        self.collection.create_index([('user_id', 1), ('revision', 1)], unique=True)

    def read_state(self, owner):
        return decode(self.collection.find_one({'user_id': owner}, sort=[('revision', -1)]))

    def commit_state(self, owner, data, reason, base_revision):
        from bson import BSON
        from pymongo.errors import DuplicateKeyError
        latest = self.collection.find_one({'user_id': owner}, {'revision': 1}, sort=[('revision', -1)])
        revision = latest['revision'] if latest else 0
        if base_revision != revision:
            raise Conflict('revision changed')
        row = snapshot(owner, data, reason, revision + 1)
        if len(BSON.encode(row)) > 16 * 1024 * 1024:
            raise ValueError('snapshot too large')
        try:
            self.collection.insert_one(row)
        except DuplicateKeyError:
            raise Conflict('revision changed') from None
        try:
            self.collection.delete_many({'user_id': owner, 'revision': {'$lte': revision + 1 - 250}})
        except Exception:
            pass  # A successful insert remains a successful commit.
        return decode(row)

    def list_revisions(self, owner):
        return list(self.collection.find({'user_id': owner}, {'_id': 0, 'revision': 1, 'saved_at': 1, 'reason': 1, 'checksum': 1, 'weight': 1}).sort('revision', -1).limit(50))

    def revision_data(self, owner, revision):
        row = self.collection.find_one({'user_id': owner, 'revision': revision})
        return decode(row)['data'] if row else None
