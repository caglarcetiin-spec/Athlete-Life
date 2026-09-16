import importlib.util
import tempfile
import unittest
from pathlib import Path
from io import BytesIO
from pypdf import PdfReader
from accounts import Accounts, AccountError
from mongo_accounts import MongoAccounts
import mongomock
from activity_report import build_report, render_pdf

class ReportTests(unittest.TestCase):
    def test_report_archive_and_bounds(self):
        data={'daily':{'2026-09-16':{'sleepTime':'23:30','wakeTime':'07:30','weight':80}},'sportSessions':[{'date':'2026-09-16','sportName':'Kuvvet <tag>', 'durationMin':30}], 'healthLabRecords':[]}
        report=build_report(data,{'name':'Çağlar Deneme'},'2026-09-01','2026-09-30',revision=3)
        pdf=render_pdf(report);reader=PdfReader(BytesIO(pdf));text='\n'.join(p.extract_text() for p in reader.pages)
        self.assertIn('Çağlar',text);self.assertIn('8 sa 0 dk',text);self.assertIn('Kuvvet <tag>',text)
        archived={'workspaceArchives':[{'id':'a','name':'Önceki 12 hafta','data':data}]}
        self.assertEqual(build_report(archived,{},'2026-09-01','2026-09-30','a')['entries'],report['entries'])
        self.assertEqual(build_report(archived,{},'2026-09-01','2026-09-30')['entries'],0)
        with self.assertRaises(ValueError): build_report(archived,{},'2026-09-01','2026-09-30','other-owner')
        with self.assertRaises(ValueError): build_report(data,{},'2026-09-31','2026-09-30')
        with self.assertRaises(ValueError): build_report(data,{},'2026-09-30','2026-09-01')
        with self.assertRaises(ValueError): build_report({'sportSessions':data['sportSessions']*2001},{},'2026-09-01','2026-09-30')
        # Multi-page text and hostile markup are rendered as text, never interpreted.
        data['sportSessions']=[{**data['sportSessions'][0],'notes':'Çğışöü <img src="file:///etc/passwd"> '+('uzun not '*60)} for _ in range(22)]
        pdf=render_pdf(build_report(data,{'name':'Test Hesabı'},'2026-09-01','2026-09-30'))
        self.assertGreater(len(PdfReader(BytesIO(pdf)).pages),2)
        Path('/private/tmp/alos-general-report-qa.pdf').write_bytes(pdf)

    def test_eight_character_policy_both_backends(self):
        with tempfile.TemporaryDirectory() as folder:
            for backend in (Accounts(Path(folder)/'users.db'),MongoAccounts(mongomock.MongoClient().test)):
                with self.assertRaises(AccountError): backend.signup('short','1234567','Test')
                user=backend.signup('eight','qa-eight','Test')
                self.assertEqual(backend.login('eight','qa-eight')['id'],user['id'])
                with self.assertRaises(AccountError): backend.change_password(user,'qa-eight','1234567')
                backend.change_password(user,'qa-eight','qa-new88')
                codes=backend.create_recovery_codes(user,'qa-new88')
                with self.assertRaises(AccountError): backend.recover('eight',codes[0],'1234567')
                backend.recover('eight',codes[0],'qa-back8')
                self.assertEqual(backend.login('eight','qa-back8')['id'],user['id'])

if __name__=='__main__':unittest.main()
