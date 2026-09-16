"""Synthetic account/security tests. Never loads .env or touches live stores."""
import http.client
import json
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from accounts import Accounts, AccountError, token_hash
from account_states import SQLiteAccountStates, MongoAccountStates, Conflict
from account_server import make_server, COOKIE

PASSWORD = 'synthetic test password 2026'


class AccountTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.accounts = Accounts(Path(cls.tmp.name) / 'users.sqlite3')

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_password_and_session_lifecycle(self):
        self.assertEqual(self.accounts.path.stat().st_mode & 0o777, 0o600)
        user = self.accounts.signup('athlete_a', PASSWORD, 'Sporcu A')
        with self.accounts.connect() as db:
            row = db.execute('SELECT * FROM users WHERE id=?', (user['id'],)).fetchone()
            self.assertTrue(row['password_hash'].startswith('scrypt$131072$8$1$'))
            self.assertNotIn(PASSWORD, row['password_hash'])
        self.assertEqual(self.accounts.login('ATHLETE_A', PASSWORD), user)
        for username, password in [('athlete_a', 'incorrect'), ('missing', PASSWORD)]:
            with self.assertRaises(AccountError) as error:
                self.accounts.login(username, password)
            self.assertEqual(error.exception.status, 401)
        with self.assertRaises(AccountError):
            self.accounts.signup('athlete_a', PASSWORD, 'Duplicate')
        token = self.accounts.start_session(user)
        self.assertEqual(self.accounts.session(token)['id'], user['id'])
        with self.accounts.connect() as db:
            self.assertEqual(db.execute('SELECT token_hash FROM sessions WHERE user_id=?', (user['id'],)).fetchone()[0], token_hash(token))
        self.accounts.logout(token)
        self.assertIsNone(self.accounts.session(token))
        expired = self.accounts.start_session(user)
        with self.accounts.connect() as db:
            db.execute('UPDATE sessions SET expires_at=? WHERE user_id=?', (time.time()-1, user['id']))
        self.assertIsNone(self.accounts.session(expired))
        token = self.accounts.start_session(user)
        self.accounts.change_password(user, PASSWORD, PASSWORD+' new')
        self.assertIsNone(self.accounts.session(token))
        self.assertEqual(self.accounts.login('athlete_a', PASSWORD+' new'), user)

    def test_validation_and_throttle(self):
        for username, password, name in [('bad name', PASSWORD, 'A'), ('valid', 'short', 'A'), ('valid', PASSWORD, '')]:
            with self.assertRaises(AccountError):
                self.accounts.signup(username, password, name)
        for _ in range(8):
            self.accounts.throttle('test-peer', 'rate-limited')
        with self.assertRaises(AccountError) as error:
            self.accounts.throttle('test-peer', 'rate-limited')
        self.assertEqual(error.exception.status, 429)


class StateTests(unittest.TestCase):
    def exercise(self, store):
        self.assertIsNone(store.read_state('b'))
        original = {'meta': {'accountId': 'spoofed'}, 'daily': {'2026-09-16': {'energy': 4}},
                    'athleteProfile': {'completedAt': '2026-09-16', 'sports': [{'sportId': 'swimming'}]},
                    'sportSessions': [{'id': 'swim-a', 'sportId': 'swimming', 'date': '2026-09-10', 'metrics': {'distanceM': 1000}}]}
        a = store.commit_state('a', original, 'test-a', 0)
        self.assertEqual(a['data']['meta']['accountId'], 'a')
        self.assertEqual(store.read_state('a')['data']['sportSessions'], original['sportSessions'])
        self.assertEqual(store.read_state('a')['data']['athleteProfile'], original['athleteProfile'])
        self.assertGreaterEqual(a['weight'], 3)
        self.assertEqual(original['meta']['accountId'], 'spoofed')
        b = store.commit_state('b', {'secret': 'only-b'}, 'test-b', 0)
        self.assertEqual(a['revision'], b['revision'])
        self.assertNotIn('secret', store.revision_data('a', 1))
        self.assertEqual(store.revision_data('b', 1)['secret'], 'only-b')
        with self.assertRaises(Conflict):
            store.commit_state('a', {'overwrite': True}, 'stale', 0)
        self.assertNotIn('overwrite', store.read_state('a')['data'])
        store.commit_state('a', store.revision_data('a', 1), 'restore-own', 1)
        self.assertIsNone(store.revision_data('b', 2))
        self.assertEqual(len(store.list_revisions('b')), 1)
        # Parallel devices start from the same revision; precisely one wins.
        results = []
        def save(i):
            try:
                store.commit_state('a', {'writer': i}, 'concurrent', 2)
                results.append('saved')
            except Conflict:
                results.append('conflict')
        threads = [threading.Thread(target=save, args=(i,)) for i in range(2)]
        for thread in threads: thread.start()
        for thread in threads: thread.join()
        self.assertCountEqual(results, ['saved', 'conflict'])

    def test_sqlite_isolation_restore_and_concurrency(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = SQLiteAccountStates(Path(tmp) / 'states.sqlite3')
            self.assertEqual(store.path.stat().st_mode & 0o777, 0o600)
            self.exercise(store)

    def test_mongodb_isolation_restore_retention_and_concurrency(self):
        import mongomock
        client = mongomock.MongoClient()
        client.test.state_revisions.insert_one({'legacy': 'unchanged'})
        with patch('pymongo.MongoClient', return_value=client):
            store = MongoAccountStates('mongodb://unused', 'test')
        self.exercise(store)
        for rev in range(3, 254):
            store.commit_state('a', {'value': rev}, 'retention', rev)
        self.assertEqual(store.collection.count_documents({'user_id': 'a'}), 250)
        self.assertEqual(store.collection.count_documents({'user_id': 'b'}), 1)
        self.assertEqual(client.test.state_revisions.find_one()['legacy'], 'unchanged')
        self.assertIsNone(store.revision_data('a', 1))


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        root = Path(cls.tmp.name)
        cls.accounts = Accounts(root / 'users.sqlite3')
        cls.states = SQLiteAccountStates(root / 'states.sqlite3')
        cls.server = make_server(cls.accounts, cls.states, port=0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.tmp.cleanup()

    def request(self, method, path, data=None, token=None, user=None, **extra):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_address[1], timeout=10)
        headers = {'Origin': self.server.origin, 'Content-Type': 'application/json'}
        if token: headers['Cookie'] = f'{COOKIE}={token}'
        if user: headers.update({'X-ALOS-Account': user['id'], 'X-ALOS-CSRF': user['csrf']})
        headers.update(extra)
        connection.request(method, path, json.dumps(data) if data is not None else None, headers)
        response = connection.getresponse()
        body, metadata = response.read(), dict(response.getheaders())
        status = response.status;connection.close()
        return status, json.loads(body) if 'application/json' in metadata.get('Content-Type', '') else body.decode(), metadata

    def test_theme_assets_and_cross_session_preference(self):
        for path in ('/appearance.css', '/appearance.js'):
            self.assertEqual(self.request('GET', path)[0], 200)
        person = self.accounts.signup('theme_contract', PASSWORD, 'Theme Test')
        token = self.accounts.start_session(person); user = self.accounts.session(token)
        status, source, _ = self.request('GET', '/index.html', token=token)
        self.assertEqual(status, 200)
        self.assertIn('href="appearance.css"', source)
        self.assertLess(source.index('src="account-context.js"'), source.index('src="appearance.js"'))
        records = {'settings': {'theme': 'dark', 'targetSleep': 8},
                   'sportSessions': [{'id': 'existing-session', 'durationMin': 45}]}
        payload = {'data': records, 'baseRevision': 0, 'reason': 'theme-test'}
        self.assertEqual(self.request('POST', '/api/state', payload, token, user)[0], 200)
        second = self.accounts.start_session(person); second_user = self.accounts.session(second)
        remote = self.request('GET', '/api/state', token=second, user=second_user)[1]
        self.assertEqual(remote['data']['settings']['theme'], 'dark')
        remote['data']['settings']['theme'] = 'light'
        self.assertEqual(self.request('POST', '/api/state', {
            'data': remote['data'], 'baseRevision': remote['revision'], 'reason': 'theme-test'
        }, second, second_user)[0], 200)
        saved = self.request('GET', '/api/state', token=token, user=user)[1]['data']
        self.assertEqual(saved['settings'], {'theme': 'light', 'targetSleep': 8})
        self.assertEqual(saved['sportSessions'], records['sportSessions'])
        other = self.accounts.signup('theme_other', PASSWORD, 'Other')
        other_token = self.accounts.start_session(other)
        self.assertIsNone(self.request('GET', '/api/state', token=other_token,
                                      user=self.accounts.session(other_token))[1]['data'])

    def test_photo_and_recovery_routes(self):
        png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmwAAAABJRU5ErkJggg=='
        user = self.accounts.signup('http_extensions', PASSWORD, 'Extension')
        token = self.accounts.start_session(user); user = self.accounts.session(token)
        record = {'id': 345, 'date': '2026-09-16', 'photos': {'front': png}}
        payload = {'id': 345, 'baseRevision': 0, 'record': record}
        self.assertEqual(self.request('POST', '/api/photos', payload)[0], 401)
        self.assertEqual(self.request('POST', '/api/photos', payload, token, user, **{'X-ALOS-CSRF': 'bad'})[0], 403)
        self.assertEqual(self.request('POST', '/api/photos', payload, token, user)[0], 200)
        self.assertEqual(self.request('POST', '/api/photos', payload, token, user)[0], 409)
        self.assertEqual(self.request('GET', '/api/photos/345', token=token, user=user)[1]['record']['id'], 345)
        b = self.accounts.signup('http_photos_b', PASSWORD, 'Other')
        tb = self.accounts.start_session(b); b = self.accounts.session(tb)
        self.assertEqual(self.request('GET', '/api/photos', token=tb, user=b)[1]['photos'], [])
        self.assertEqual(self.request('GET', '/api/photos/345', token=tb, user=b)[0], 404)
        self.assertEqual(self.request('GET', '/api/photos/345', token=tb, user=user)[0], 403)
        status, result, _ = self.request('POST', '/api/auth/recovery-codes', {'currentPassword': PASSWORD}, token, user)
        self.assertEqual(status, 200)
        code = result['codes'][0]
        reset = {'username': user['username'], 'code': code, 'newPassword': PASSWORD + ' recovered'}
        self.assertEqual(self.request('POST', '/api/auth/recover', reset, Origin='https://foreign.invalid')[0], 403)
        self.assertEqual(self.request('POST', '/api/auth/recover', reset)[0], 200)
        self.assertEqual(self.request('POST', '/api/auth/recover', reset)[0], 401)
        self.assertEqual(self.request('GET', '/api/photos', token=token, user=user)[0], 401)

    def test_secure_cookie_mode(self):
        server = make_server(self.accounts, self.states, port=0, public_origin='https://athlete.example.org')
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        try:
            conn = http.client.HTTPConnection('127.0.0.1', server.server_address[1], timeout=10)
            conn.request('POST', '/api/auth/signup', json.dumps({'username': 'secure_http', 'name': 'S', 'password': PASSWORD}),
                         {'Host': 'athlete.example.org', 'Origin': server.origin, 'Content-Type': 'application/json'})
            response = conn.getresponse(); response.read()
            self.assertEqual(response.status, 200)
            self.assertIn('; Secure', response.getheader('Set-Cookie'))
            self.assertEqual(response.getheader('Strict-Transport-Security'), 'max-age=31536000')
            conn.close()
        finally:
            server.shutdown(); server.server_close(); thread.join()

    def test_end_to_end_and_denied_paths(self):
        self.assertEqual(self.request('GET', '/api/state')[0], 401)
        status, body, headers = self.request('POST', '/api/auth/signup', {'username': 'http_a', 'password': PASSWORD, 'name': 'A'})
        self.assertEqual(status, 200)
        self.assertIn('HttpOnly', headers['Set-Cookie']);self.assertIn('SameSite=Strict', headers['Set-Cookie'])
        token = headers['Set-Cookie'].split(';')[0].split('=', 1)[1]
        user = self.accounts.session(token)
        self.assertEqual(self.request('GET', '/api/state', token=token)[0], 403)
        status, body, _ = self.request('GET', '/api/state', token=token, user=user)
        self.assertIsNone(body['data'])
        payload = {'baseRevision': 0, 'data': {'trainingLogs': {'2026-09-10': [{'name': 'A only'}]}}}
        self.assertEqual(self.request('POST', '/api/state', payload, token, user)[0], 200)
        self.assertEqual(self.request('POST', '/api/state', payload, token, user)[0], 409)
        self.assertEqual(self.request('POST', '/api/state', payload, token, user, Origin='http://foreign.test')[0], 403)
        self.assertEqual(self.request('POST', '/api/state', payload, token, user, **{'X-ALOS-CSRF': 'wrong'})[0], 403)
        self.assertEqual(self.request('POST', '/api/auth/login', {'username': 'http_a', 'password': PASSWORD}, Origin='http://foreign.test')[0], 403)
        other = self.accounts.signup('http_b', PASSWORD, 'B')
        token_b = self.accounts.start_session(other);user_b = self.accounts.session(token_b)
        self.assertEqual(self.request('POST', '/api/state', payload, token_b, user)[0], 403, 'old tab cannot write into B')
        self.assertEqual(self.request('POST', '/api/restore/1', {'baseRevision': 0}, token_b, user_b)[0], 404)
        self.assertEqual(self.request('GET', '/api/revisions', token=token_b, user=user_b)[1]['revisions'], [])
        self.assertIsNone(self.request('GET', '/api/state', token=token_b, user=user_b)[1]['data'])
        for path in ['/.env', '/%2eenv', '/accounts.py', '/accounts.test.py', '/storage.test.py', '/.git/config', '/.local-backups/test.json', '/accounts.sqlite3', '/requirements.txt', '/not-a-library.json']:
            self.assertEqual(self.request('GET', path, token=token)[0], 404, path)
        status, source, headers = self.request('GET', '/index.html', token=token)
        self.assertEqual(status, 200);self.assertIn('account-context.js', source);self.assertIn('src="account-sync.js', source)
        self.assertIn('no-store', headers['Cache-Control'])
        self.assertNotIn('>Çağlar</button>', source)
        self.assertEqual(self.request('POST', '/api/auth/logout', {}, token, user)[0], 200)
        self.assertEqual(self.request('GET', '/api/state', token=token, user=user)[0], 401)


if __name__ == '__main__':
    unittest.main()
