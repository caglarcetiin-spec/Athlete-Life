import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from accounts import Accounts
from account_states import SQLiteAccountStates, MongoAccountStates, Conflict
from account_photos import AccountPhotos
from private_delivery import PrivateDelivery
from state_common import checksum
from migrate_account_storage import plan, apply, comparable


class PrivateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.accounts = Accounts(self.root / 'accounts.sqlite3')
        self.states = SQLiteAccountStates(self.root / 'states.sqlite3')
        self.photos = AccountPhotos(self.root / 'photos.sqlite3')
        self.payload = {'format': 'alos-portable-backup', 'data': {'daily': {'2026-09-10': {'healthNote': 'synthetic private data'}}}, 'photos': []}
        self.backup = self.root / 'seed.alosbackup'
        self.backup.write_text(json.dumps({**self.payload, 'integrity': {'algorithm': 'SHA-256', 'sha256': checksum(self.payload)}}))

    def tearDown(self):
        self.tmp.cleanup()

    def users(self):
        return [self.accounts.signup(name, 'synthetic delivery passphrase', name) for name in ('first', 'second')]

    def test_seed_first_only_once_and_existing_data_preserved(self):
        delivery = PrivateDelivery(self.backup, self.accounts)
        first, second = self.users()
        delivery.apply(second, self.accounts, self.states, self.photos)
        self.assertIsNone(self.states.read_state(second['id']))
        delivery.apply(first, self.accounts, self.states, self.photos)
        original = self.states.read_state(first['id'])
        self.assertIn('2026-09-10', original['data']['daily'])
        self.states.commit_state(first['id'], {'new': 'retained'}, 'edit', original['revision'])
        PrivateDelivery(self.backup, self.accounts).apply(first, self.accounts, self.states, self.photos)
        self.assertEqual(self.states.read_state(first['id'])['data']['new'], 'retained')
        self.assertIsNone(self.states.read_state(second['id']))

    def test_existing_profile_wins_and_bad_checksum_rejected(self):
        first, second = self.users()
        self.states.commit_state(first['id'], {'existing': True}, 'old', 0)
        PrivateDelivery(self.backup, self.accounts).apply(first, self.accounts, self.states, self.photos)
        self.assertTrue(self.states.read_state(first['id'])['data']['existing'])
        changed = json.loads(self.backup.read_text());changed['data']['secret'] = 'tampered'
        self.backup.write_text(json.dumps(changed))
        with self.assertRaises(ValueError):
            PrivateDelivery(self.backup, self.accounts)

    def test_migration_preview_apply_idempotence_conflict_and_concurrent_write(self):
        import mongomock
        first, second = self.users()
        self.states.commit_state(first['id'], self.payload['data'], 'seed', 0)
        with self.states.connect() as db:
            rows = [dict(row) for row in db.execute('SELECT * FROM account_revisions')]
        client = mongomock.MongoClient()
        collection = client.test.account_state_revisions
        items = plan(rows, collection)
        self.assertEqual(items[0]['status'], 'copy')
        self.assertEqual(collection.count_documents({}), 0)
        with patch('pymongo.MongoClient', return_value=client):
            remote = MongoAccountStates('mongodb://unused', 'test')
        self.assertEqual(apply(items, remote), 1)
        self.assertEqual(plan(rows, collection)[0]['status'], 'same')
        self.assertEqual(apply(plan(rows, collection), remote), 0)
        remote.commit_state(first['id'], {'changed': True}, 'remote-edit', 1)
        with self.assertRaises(ValueError):
            apply(plan(rows, collection), remote)
        with self.assertRaises(Conflict):
            apply(items, remote)
        self.assertTrue(remote.read_state(first['id'])['data']['changed'])


if __name__ == '__main__':
    unittest.main()
