"""Opt-in private backup seed, bound permanently to the first local account."""
import json
import threading
from pathlib import Path
from state_common import checksum


class PrivateDelivery:
    def __init__(self, backup, accounts):
        payload = json.loads(Path(backup).read_text())
        integrity = payload.pop('integrity', {})
        if integrity.get('algorithm') != 'SHA-256' or checksum(payload) != integrity.get('sha256'):
            raise ValueError('Private backup integrity check failed')
        if payload.get('format') != 'alos-portable-backup' or not isinstance(payload.get('data'), dict):
            raise ValueError('Invalid private backup')
        self.data = payload['data']
        self.photos = payload.get('photos') or []
        self.digest = integrity['sha256']
        self.lock = threading.Lock()
        with accounts.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS private_delivery (id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT NOT NULL, checksum TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0)')

    def apply(self, user, accounts, states, photos):
        with self.lock:
            with accounts.connect() as db:
                db.execute('BEGIN IMMEDIATE')
                first = db.execute('SELECT id FROM users ORDER BY created_at, id LIMIT 1').fetchone()
                if not first or first['id'] != user['id']:
                    return
                db.execute('INSERT OR IGNORE INTO private_delivery (id,owner,checksum) VALUES (1,?,?)', (user['id'], self.digest))
                claim = db.execute('SELECT * FROM private_delivery WHERE id=1').fetchone()
                if claim['owner'] != user['id'] or claim['completed']:
                    return
            current = states.read_state(user['id'])
            if current is None:
                data = json.loads(json.dumps(self.data))
                data.setdefault('meta', {})['privateDeliverySource'] = self.digest
                states.commit_state(user['id'], data, 'private-delivery-import', 0)
            elif current['data'].get('meta', {}).get('privateDeliverySource') != self.digest:
                # An existing profile always wins. Never replace it with package data.
                with accounts.connect() as db:
                    db.execute('UPDATE private_delivery SET completed=1 WHERE id=1')
                return
            for row in self.photos:
                if photos.get(user['id'], row['id']) is None:
                    photos.commit(user['id'], row['id'], 0, row)
            with accounts.connect() as db:
                db.execute('UPDATE private_delivery SET completed=1 WHERE id=1')
