import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
import mongomock
from accounts import Accounts, AccountError, token_hash
from account_photos import AccountPhotos
from account_states import Conflict
from mongo_accounts import MongoAccounts
from mongo_account_photos import MongoAccountPhotos
from migrate_cloud_accounts import source_records, preview

PASSWORD = 'synthetic cloud migration passphrase'
PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmwAAAABJRU5ErkJggg=='


class CloudTests(unittest.TestCase):
    def setUp(self):
        self.database = mongomock.MongoClient().test
        self.accounts = MongoAccounts(self.database)

    def test_migration_preserves_login_owner_and_survives_new_process(self):
        with tempfile.TemporaryDirectory() as root:
            local = Accounts(Path(root) / 'accounts.sqlite3')
            user = local.signup('existing', PASSWORD, 'Existing')
            codes = local.create_recovery_codes(user, PASSWORD)
            AccountPhotos(Path(root) / 'photos.sqlite3')
            users, photos = source_records(Path(root))
            self.assertEqual(preview(self.database, users, photos)[0][2], 'copy')
            self.database.account_users.insert_many(users)
            remote = MongoAccounts(self.database)
            self.assertEqual(remote.login('existing', PASSWORD)['id'], user['id'])
            self.assertEqual(preview(self.database, users, photos)[0][2], 'same')
            remote.recover('existing', codes[0], PASSWORD + ' new')
            with self.assertRaises(ValueError): preview(self.database, users, photos)

    def test_password_change_revokes_existing_and_inflight_logins(self):
        user = self.accounts.signup('athlete', PASSWORD, 'A')
        verified = self.accounts.login('athlete', PASSWORD)
        token = self.accounts.start_session(verified)
        self.assertEqual(self.accounts.session(token)['id'], user['id'])
        self.assertIsNone(self.accounts.session('unknown'))
        self.assertNotIn(token, str(self.database.account_sessions.find_one()))
        self.accounts.change_password(user, PASSWORD, PASSWORD + ' new')
        self.assertIsNone(self.accounts.session(token))
        with self.assertRaises(AccountError): self.accounts.start_session(verified)
        with self.assertRaises(AccountError): self.accounts.login('athlete', PASSWORD)
        with self.assertRaises(AccountError): self.accounts.signup('athlete', PASSWORD, 'Other')

    def test_recovery_single_use_concurrently(self):
        user = self.accounts.signup('recover', PASSWORD, 'A')
        code = self.accounts.create_recovery_codes(user, PASSWORD)[0]
        token = self.accounts.start_session(user)
        results = []
        def reset():
            try:
                self.accounts.recover('recover', code, PASSWORD + ' new'); results.append('ok')
            except AccountError:
                results.append('denied')
        threads = [threading.Thread(target=reset) for _ in range(2)]
        for thread in threads: thread.start()
        for thread in threads: thread.join()
        self.assertCountEqual(results, ['ok', 'denied'])
        self.assertIsNone(self.accounts.session(token))

    def test_throttle_enforces_limit_across_instances_and_expires(self):
        with patch('mongo_accounts.time.time', return_value=2100000000):
            for _ in range(8): self.accounts.throttle('test-peer', 'test-user')
            other = MongoAccounts(self.database)
            with self.assertRaises(AccountError): other.throttle('test-peer', 'test-user')
        with patch('mongo_accounts.time.time', return_value=2100000601):
            self.accounts.throttle('test-peer', 'test-user')

    def test_photos_owner_revision_tombstone_and_quota(self):
        photos = MongoAccountPhotos(self.database)
        # MongoMock has no transactions. Real transaction behavior is integration-tested separately.
        photos.transaction = lambda callback: callback(None)
        record = {'id': 1, 'date': '2026-09-16', 'photos': {'front': PNG}}
        self.assertEqual(photos.commit('owner', 1, 0, record)['revision'], 1)
        self.assertIsNone(photos.get('other', 1))
        self.assertEqual(photos.list('other'), [])
        with self.assertRaises(Conflict): photos.commit('owner', 1, 0, record)
        self.assertEqual(photos.get('owner', 1)['record'], record | {'createdAt': None})
        self.assertTrue(photos.commit('owner', 1, 1)['deleted'])
        self.assertEqual(self.database.account_photo_quotas.find_one({'_id': 'owner'})['size'], 0)
        self.assertEqual(photos.commit('owner', 1, 2, record)['revision'], 3)
        self.database.account_photo_quotas.update_one({'_id': 'owner'}, {'$set': {'count': 5000}})
        with self.assertRaises(ValueError): photos.commit('owner', 2, 0, {**record, 'id': 2})


if __name__ == '__main__':
    unittest.main()
