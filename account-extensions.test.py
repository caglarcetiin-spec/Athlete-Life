"""Synthetic recovery and photo tests: no .env, real Atlas or user storage."""
import base64
import tempfile
import threading
import unittest
from pathlib import Path
from accounts import Accounts, AccountError
from account_photos import AccountPhotos, normalize
from account_states import Conflict

PASSWORD = 'temporary test passphrase 2026'
PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nmwAAAABJRU5ErkJggg=='

class RecoveryTests(unittest.TestCase):
    def test_single_use_and_session_invalidation(self):
        with tempfile.TemporaryDirectory() as tmp:
            a = Accounts(Path(tmp)/'a.sqlite3');user=a.signup('recover_a',PASSWORD,'A')
            token=a.start_session(user);codes=a.create_recovery_codes(user,PASSWORD)
            with a.connect() as db:
                self.assertNotIn(codes[0], str([dict(r) for r in db.execute('SELECT * FROM recovery_codes')]))
            with self.assertRaises(AccountError): a.recover('other', codes[0], PASSWORD+' new')
            a.recover('recover_a',codes[0],PASSWORD+' new');self.assertIsNone(a.session(token))
            with self.assertRaises(AccountError): a.recover('recover_a',codes[0],PASSWORD+' new')
            a.login('recover_a',PASSWORD+' new')
            replacement=a.create_recovery_codes(user,PASSWORD+' new')
            with self.assertRaises(AccountError): a.recover('recover_a',codes[1],PASSWORD)
            outcomes=[]
            def recover():
                try: a.recover('recover_a',replacement[0],PASSWORD);outcomes.append('ok')
                except AccountError: outcomes.append('denied')
            threads=[threading.Thread(target=recover) for _ in range(2)]
            for t in threads:t.start()
            for t in threads:t.join()
            self.assertCountEqual(outcomes,['ok','denied'])

class PhotoTests(unittest.TestCase):
    def test_validation_isolation_revision_and_tombstone(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=AccountPhotos(Path(tmp)/'photos.sqlite3')
            record={'id':123,'date':'2026-09-16','photos':{'front':PNG}}
            self.assertEqual(p.commit('a',123,0,record)['revision'],1)
            self.assertEqual(p.list('b'),[]);self.assertIsNone(p.get('b',123))
            self.assertEqual(p.get('a',123)['record']['photos']['front'],PNG)
            with self.assertRaises(Conflict):p.commit('a',123,0,None)
            self.assertTrue(p.commit('a',123,1,None)['deleted'])
            self.assertIsNone(p.get('a',123)['record'])
            with self.assertRaises(Conflict):p.commit('a',123,1,record)
            self.assertEqual(p.commit('a',123,2,record)['revision'],3)
            self.assertEqual(p.path.stat().st_mode & 0o777,0o600)
            for invalid in [dict(record,date='<img onerror=evil()>'),dict(record,id='../other'),dict(record,photos={'front':'data:image/svg+xml;base64,PHN2Zz4='}),dict(record,photos={'front':'data:image/png;base64,YmFk'}),dict(record,photos={'front':PNG,'injected':PNG})]:
                with self.assertRaises(ValueError): normalize(invalid)

class OriginTests(unittest.TestCase):
    def test_public_origin_requires_https_root(self):
        from account_server import validate_public_origin
        self.assertEqual(validate_public_origin('https://athlete.example.org'), 'https://athlete.example.org')
        for value in ['http://example.org', 'https://user:pass@example.org', 'https://example.org/path', 'https://example.org?x=1', 'https://example.org/#fragment']:
            with self.assertRaises(ValueError):validate_public_origin(value)

if __name__=='__main__':unittest.main()
