import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, MagicMock
import sqlite_store
from state_repository import create_store
from mongo_store import MongoStore
from state_common import canonical_json, checksum


class StorageTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / 'state.sqlite3'

    def test_sqlite_roundtrip_restore_and_retention(self):
        with patch.dict(os.environ, {'STORAGE_BACKEND': 'sqlite'}):
            store = create_store(self.path)
        store.init_db()
        original = {'meta': {}, 'foodLogs': {'2026-09-15': [{'name': 'Çağlar', 'amount': 2}]}}
        first = store.commit_state(original, 'test')
        self.assertEqual(store.read_state()['data'], first['data'])
        self.assertEqual(original['meta'], {})
        restored = store.commit_state(store.revision_data(1), 'restore')
        self.assertEqual(restored['revision'], 2)
        for _ in range(251):
            store.commit_state(original, 'retention')
        with store.connect() as c:
            self.assertEqual(c.execute('SELECT COUNT(*) FROM state_revisions').fetchone()[0], 250)
        self.assertIsNone(store.revision_data(1))

    def test_config_rejects_missing_uri_and_unknown_backend(self):
        for backend in ['mongodb', 'invalid']:
            with patch.dict(os.environ, {'STORAGE_BACKEND': backend, 'MONGODB_URI': ''}):
                with self.assertRaises(ValueError):
                    create_store(self.path)
        self.assertFalse(self.path.exists())

    def test_mongo_checksum_recovery_and_restore(self):
        store = MongoStore.__new__(MongoStore)
        store.collection = MagicMock()
        data = {'meta': {}, 'waterLogs': [100], 'arbitrary.key': {'$value': 'ö'}}
        row = {'revision': 1, 'saved_at': 'now', 'reason': 'test', 'weight': 1,
               'payload': canonical_json(data), 'checksum': checksum(data)}
        corrupt = dict(row, checksum='bad')
        store.collection.find.return_value.sort.return_value.limit.return_value = [corrupt, row]
        self.assertEqual(store.read_state()['data'], data)
        store.collection.find_one.return_value = corrupt
        with self.assertRaises(ValueError):
            store.revision_data(1)
        store.collection.find.return_value.sort.return_value.limit.return_value = [corrupt]
        with self.assertRaises(RuntimeError):
            store.read_state()

    def test_api_storage_errors_and_private_files(self):
        import io
        import launch
        handler = launch.Handler.__new__(launch.Handler)
        handler.directory = str(launch.ROOT)
        handler.command = 'GET'
        handler._json = MagicMock()
        with patch.object(launch, 'STORE') as store:
            handler.path = '/api/health'
            store.read_state.side_effect = RuntimeError('secret-uri')
            handler.do_GET()
            self.assertEqual(handler._json.call_args.args, (503, {'ok': False, 'error': 'database unavailable'}))
        for path in ['/.env', '/%2eenv', '/mongo_store.py', '/.git/config']:
            handler.path = path
            handler.do_GET()
            self.assertEqual(handler._json.call_args.args[0], 404)
        handler.path = '/api/state'
        handler._body = lambda: {'data': []}
        handler.do_POST()
        self.assertEqual(handler._json.call_args.args[0], 400)

    def test_migration_preserves_source_and_refuses_nonempty_target(self):
        from migrate_to_mongodb import migrate
        with patch.dict(os.environ, {'STORAGE_BACKEND': 'sqlite'}):
            source = create_store(self.path)
        source.init_db()
        state = source.commit_state({'meta': {}, 'trainingLogs': [1]}, 'source')
        target = MagicMock()
        target.list_revisions.return_value = []
        target.commit_state.return_value = state
        target.read_state.return_value = state
        self.assertEqual(migrate(self.path, target), 1)
        self.assertTrue(self.path.exists())
        self.assertEqual(source.read_state()['checksum'], state['checksum'])
        target.list_revisions.return_value = [{'revision': 1}]
        with self.assertRaises(ValueError):
            migrate(self.path, target)
        self.assertEqual(target.commit_state.call_count, 1)

    def test_mongo_driver_roundtrip(self):
        try:
            import mongomock
            import pymongo
        except ImportError:
            self.skipTest('Install requirements.txt and mongomock for driver tests')
        with patch('pymongo.MongoClient', mongomock.MongoClient):
            store = MongoStore('mongodb://localhost', 'test')
        store.init_db()
        for _ in range(255):
            result = store.commit_state({'meta': {}, 'waterLogs': [200]}, 'test')
        self.assertEqual(result['revision'], 255)
        self.assertEqual(store.collection.count_documents({}), 250)
        self.assertEqual(store.read_state()['data']['waterLogs'], [200])
        self.assertIsNone(store.revision_data(1))
        self.assertEqual(len(store.list_revisions()), 50)
        self.assertEqual(store.commit_state(store.revision_data(255), 'restore')['revision'], 256)
        with self.assertRaises(ValueError):
            store.commit_state({'large': 'x' * (16 * 1024 * 1024)}, 'too-large')


if __name__ == '__main__':
    unittest.main()
