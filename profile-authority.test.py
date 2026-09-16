"""Isolated SQLite + mocked Mongo profile migration and security contracts."""
import tempfile
import unittest
from pathlib import Path
import mongomock
from accounts import Accounts, AccountError
from mongo_accounts import MongoAccounts

class ProfileTests(unittest.TestCase):
    def exercise(self, authority):
        u = authority.signup('profile_qa', 'temporary profile test password', 'Test')
        token = authority.start_session(u)
        self.assertEqual(authority.session(token)['email'], '')
        updated = authority.update_profile(u, 'Yeni ad', 'test@example.invalid', 0)
        self.assertEqual(updated['profileVersion'], 1)
        self.assertEqual(authority.session(token)['email'], 'test@example.invalid')
        self.assertNotIn('password_hash', updated)
        with self.assertRaises(AccountError) as error:
            authority.update_profile(u, 'Stale', 'stale@example.invalid', 0)
        self.assertEqual(error.exception.status, 409)
        for name, email, version in [('', '', 1), ('A', 'invalid', 1), ('A', 'a\nb@c.com', 1), ('A', '', True), ('A\nB','',1)]:
            with self.assertRaises(AccountError): authority.update_profile(u, name, email, version)
        self.assertEqual(authority.update_profile(u, 'Yeni ad', '', 1)['email'], '')
        authority.change_password(u, 'temporary profile test password', 'changed profile test password')
        self.assertIsNone(authority.session(token))
        self.assertEqual(authority.login('profile_qa', 'changed profile test password')['name'], 'Yeni ad')

    def test_sqlite_old_schema_migration(self):
        import sqlite3
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp)/'accounts.sqlite'
            with sqlite3.connect(path) as conn:
                conn.execute('CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at REAL NOT NULL)')
            self.exercise(Accounts(path))

    def test_mongo_old_documents_and_epoch(self):
        self.exercise(MongoAccounts(mongomock.MongoClient().test))

if __name__=='__main__': unittest.main()
