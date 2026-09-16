"""Synthetic model and PDF tests; no real records, network or .env access."""
from datetime import datetime, timezone
from io import BytesIO
import json
import os
from pathlib import Path
import shutil
import subprocess
import unittest
from pypdf import PdfReader
from health_report import build_summary, sleep_entry, TEST_NAMES, fmt
from health_report_pdf import render_pdf, fit_summary

NOW = datetime(2026,9,16,9,0,tzinfo=timezone.utc)
USER = {'name':'Çağlar Şen - TEST PROFİLİ'}


def report(identifier, day, value, **row):
    return {'id':identifier,'date':day,'lab':'Örnek Şehir Laboratuvarı','fasting':'fasting',
            'rows':[{'marker':'tsh','value':value,'unit':'mIU/L','method':'A','low':0.4,'high':4,'comparator':'=',**row}]}


def fixture():
    rows = [report('a','2026-09-01',0.001), report('b','2026-09-12',0.005)]
    for i in range(24):
        rows.append(report('extra'+str(i),'2026-09-14',i+.125,marker='custom',name='Özel ölçüm '+str(i),unit='µg/L',low=None,high=None))
    return {'daily':{'2026-09-02':{'sleepTime':'23:00','wakeTime':'07:30','nightAwake':30,'sleepQuality':4},
                     '2026-09-03':{'sleepTime':'00:00','wakeTime':'07:00','sleepQuality':3},
                     '2026-09-08':{'sleepTime':'23:00','wakeTime':'06:45','sleepQuality':5}},'healthLabRecords':rows}


def model(state=None):
    return fit_summary(build_summary(fixture() if state is None else state,USER,'2026-09-01','2026-09-16',7,NOW))


class HealthReportTests(unittest.TestCase):
    def test_period_and_sleep_missingness(self):
        m=model(); self.assertEqual(m['sleep']['count'],3);self.assertEqual(m['sleep']['days'],16)
        self.assertEqual(m['sleep']['average'],455);self.assertEqual(m['sleep']['quality'],4)
        self.assertIsNone(sleep_entry({'sleepTime':'23:00','wakeTime':'23:00'}))
        self.assertIsNone(sleep_entry({'sleepTime':'25:00','wakeTime':'07:00'}))
        for start,end in [('2026-02-30','2026-09-16'),('2026-09-16','2026-09-01'),('2024-01-01','2026-09-16')]:
            with self.assertRaises(ValueError):build_summary({},USER,start,end,now=NOW)
        self.assertIsNone(model({})['sleep']['average'])

    def test_like_for_like_prior_and_censored_values(self):
        state={'healthLabRecords':[report('a','2026-09-01',.001),report('b','2026-09-12',.005),report('c','2026-09-13',.004,unit='µIU/mL'),report('d','2026-09-14',.006,method='B'),report('e','2026-09-15',.007,comparator='<')]}
        m=model(state);r=next(r for r in m['rows'] if r['method']=='A' and r['unit']=='mIU/L')
        self.assertEqual(r['resultText'],'<0,007');self.assertEqual(r['previous']['date'],'2026-09-12');self.assertIsNone(r['delta'])
        for other in m['rows']:
            if other is not r:self.assertIsNone(other['previous'])
        state['healthLabRecords'][-1]['archivedAt']='2026-09-16'
        state['healthLabRecords'].append({'id':'bad'})
        m=model(state);r=next(r for r in m['rows'] if r['method']=='A' and r['unit']=='mIU/L')
        self.assertAlmostEqual(r['delta'],.004);self.assertEqual(m['invalidReports'],1)
        self.assertEqual(fmt(.001),'0,001')

    def test_frontend_library_and_sleep_semantics_match(self):
        node=os.environ.get('ALOS_TEST_NODE') or shutil.which('node')
        if not node:self.skipTest('Node is required for frontend parity; set ALOS_TEST_NODE.')
        cases=[{}, {'sleepTime':'09:00','wakeTime':'17:00'}, {'sleepTime':'23:00','wakeTime':'07:00','nightAwake':30,'sleepQuality':4}, {'sleepTime':'23:00','wakeTime':'07:00','nightAwake':600}, {'sleepTime':'23:00','wakeTime':'07:00','sleepQuality':'bad'}]
        script="const H=require('./health-core');const rows="+json.dumps(cases)+";console.log(JSON.stringify({names:Object.fromEntries(H.library.map(x=>[x.id,x.name])),sleep:rows.map(r=>H.sleepEntry(r))}));"
        result=json.loads(subprocess.check_output([node,'-e',script],text=True))
        self.assertEqual(result['names'],TEST_NAMES)
        for raw,js in zip(cases,result['sleep']):
            py=sleep_entry(raw)
            self.assertEqual(None if py is None else [py['minutes'],py['quality']],None if js is None else [js['minutes'],js['quality']])

    def test_pdf_single_page_unicode_and_full_appendix(self):
        m=model();reader=PdfReader(BytesIO(render_pdf(m)))
        self.assertEqual(len(reader.pages),1)
        text=reader.pages[0].extract_text();self.assertIn('Çağlar Şen',text);self.assertIn('gösterilmiyor',text)
        expanded=PdfReader(BytesIO(render_pdf(m,True)))
        self.assertGreater(len(expanded.pages),1)
        text='\n'.join(p.extract_text() for p in expanded.pages)
        for i in range(24):self.assertIn('Özel ölçüm '+str(i),text)
        self.assertIn('0,001',text);self.assertIn('0,005',text)
        self.assertEqual(len(PdfReader(BytesIO(render_pdf(model({})))).pages),1)

    def test_long_text_is_preserved_in_appendix_and_not_interpreted(self):
        state={'healthLabRecords':[report(str(i),'2026-09-10',.000015,marker='custom',name=('Uzun ölçüm adı '+str(i)+' ŞĞİ '*20)[:100],unit='çok uzun özel birim açıklaması µg/L',method='<img src="https://example.invalid/a">') for i in range(30)]}
        for r in state['healthLabRecords']:r['lab']='Uzun Laboratuvar Adı '*5
        m=model(state);self.assertGreater(m['omitted'],0)
        self.assertEqual(len(PdfReader(BytesIO(render_pdf(m))).pages),1)
        text='\n'.join(p.extract_text() for p in PdfReader(BytesIO(render_pdf(m,True))).pages)
        self.assertIn('0,000015',text);self.assertIn('<img',text)

if __name__=='__main__':
    import sys
    if '--fixtures' in sys.argv:
        out=Path('tmp/pdfs');out.mkdir(parents=True,exist_ok=True)
        (out/'health-summary.pdf').write_bytes(render_pdf(model()))
        (out/'health-appendix.pdf').write_bytes(render_pdf(model(),True))
        (out/'health-empty.pdf').write_bytes(render_pdf(model({})))
        print('Synthetic PDF fixtures written.')
    else:unittest.main()
