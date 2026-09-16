"""Owner-scoped bounded photo snapshots with per-photo optimistic revisions.
Stored beside account identities; independent of application-state backend.
"""
import base64
import datetime
import hashlib
import json
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from account_states import Conflict

MAX_PHOTO_BYTES = 1500000
MAX_ACCOUNT_BYTES = 100 * 1024 * 1024


def normalize(record):
    if not isinstance(record, dict) or type(record.get('id')) is not int or not 0 < record['id'] < 9007199254740991:
        raise ValueError('photo id')
    date = record.get('date', '')
    if not isinstance(date, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date):
        raise ValueError('photo date')
    datetime.date.fromisoformat(date)
    photos = record.get('photos')
    if not isinstance(photos, dict) or not 1 <= len(photos) <= 3 or any(k not in ('front', 'side', 'back') for k in photos):
        raise ValueError('photo views')
    for value in photos.values():
        if not isinstance(value, str) or len(value) > MAX_PHOTO_BYTES * 4 // 3 + 40:
            raise ValueError('photo size')
        match = re.fullmatch(r'data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)', value)
        if not match:
            raise ValueError('photo type')
        raw = base64.b64decode(match[2], validate=True)
        valid = ((match[1] == 'jpeg' and raw.startswith(b'\xff\xd8\xff') and raw.endswith(b'\xff\xd9')) or
                 (match[1] == 'png' and raw.startswith(b'\x89PNG\r\n\x1a\n')) or
                 (match[1] == 'webp' and raw.startswith(b'RIFF') and raw[8:12] == b'WEBP'))
        if not valid or len(raw) > MAX_PHOTO_BYTES:
            raise ValueError('photo content')
    created = record.get('createdAt')
    if created is not None and (not isinstance(created, str) or len(created) > 60):
        raise ValueError('photo timestamp')
    return {'id': record['id'], 'date': date, 'createdAt': created, 'photos': photos}


class AccountPhotos:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.path.touch(mode=0o600, exist_ok=True)
        with self.connect() as db:
            db.execute('''CREATE TABLE IF NOT EXISTS photos (
                owner TEXT NOT NULL, id INTEGER NOT NULL, revision INTEGER NOT NULL,
                deleted INTEGER NOT NULL, payload TEXT, hash TEXT, size INTEGER NOT NULL,
                PRIMARY KEY(owner,id))''')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15);db.row_factory = sqlite3.Row
        try:
            with db: yield db
        finally: db.close()

    def list(self, owner):
        with self.connect() as db:
            return [dict(r) for r in db.execute('SELECT id,revision,deleted,hash FROM photos WHERE owner=? ORDER BY id', (owner,))]

    def get(self, owner, photo_id):
        with self.connect() as db:
            r = db.execute('SELECT * FROM photos WHERE owner=? AND id=?', (owner, photo_id)).fetchone()
            if not r: return None
            return {'revision': r['revision'], 'deleted': bool(r['deleted']), 'record': json.loads(r['payload']) if r['payload'] else None}

    def commit(self, owner, photo_id, base_revision, record=None):
        if type(photo_id) is not int or not 0 < photo_id < 9007199254740991 or type(base_revision) is not int or base_revision < 0:
            raise ValueError('photo revision')
        normalized = normalize(record) if record is not None else None
        if normalized and normalized['id'] != photo_id: raise ValueError('photo id mismatch')
        payload = json.dumps(normalized, ensure_ascii=False, separators=(',', ':'), sort_keys=True) if normalized else None
        size = len(payload.encode()) if payload else 0
        digest = hashlib.sha256(payload.encode()).hexdigest() if payload else None
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            old = db.execute('SELECT revision,size FROM photos WHERE owner=? AND id=?', (owner, photo_id)).fetchone()
            if base_revision != (old['revision'] if old else 0): raise Conflict('photo changed')
            total, count = db.execute('SELECT COALESCE(SUM(size),0),COUNT(*) FROM photos WHERE owner=?', (owner,)).fetchone()
            if total - (old['size'] if old else 0) + size > MAX_ACCOUNT_BYTES or (not old and count >= 5000):
                raise ValueError('photo quota exceeded')
            revision = base_revision + 1
            db.execute('INSERT OR REPLACE INTO photos VALUES (?,?,?,?,?,?,?)',
                       (owner, photo_id, revision, int(record is None), payload, digest, size))
        return {'revision': revision, 'deleted': record is None}
