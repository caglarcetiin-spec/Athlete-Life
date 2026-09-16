import json, os, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def req(path, method='GET', body=None):
    data=None if body is None else json.dumps(body).encode()
    r=urllib.request.Request('http://127.0.0.1:8765'+path,data=data,method=method,headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(r,timeout=4) as x: return json.loads(x.read())

def main():
    with tempfile.TemporaryDirectory() as td:
        env=os.environ.copy();env['ATHLETE_LIFE_OS_DATA_DIR']=td;env['PORT']='8765';env['STORAGE_BACKEND']='sqlite'
        server_code='import launch; launch.init_db(); launch.ThreadingHTTPServer(("127.0.0.1", launch.PORT),launch.Handler).serve_forever()'
        p=subprocess.Popen([sys.executable,'-B','-c',server_code],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            for _ in range(50):
                try:
                    if req('/api/health')['ok']: break
                except Exception: time.sleep(.1)
            else: raise AssertionError('server did not start')
            state={'week':{'Pazartesi':{'shift':'morning'}},'daily':{'2026-09-15':{'healthStatus':'fatigued','fatigueLevel':6,'healthFever':False}},'trainingLogs':{'2026-09-14':[{'name':'Pull-Up','sets':[8,8],'historicalEntry':True,'athleteDay':'2026-09-14'}]},'meta':{}}
            state['trainingPeriods']=[{'id':'test-period','startDate':'2026-09-16','weeks':12,'weekly':[[{'name':'Pull-Up','sets':3,'min':6,'max':10,'rir':2,'rest':180}],[],[],[],[],[],[]]}]
            state['trainingPeriodDraft']={'name':'Next model','goal':'hybrid'}
            state['scheduleByDate']={'2026-10-01':{'status':'annual','shift':'morning'}}
            a=req('/api/state','POST',{'data':state,'reason':'test'})
            assert a['ok'] and a['revision']>=1
            b=req('/api/state')
            assert b['data']['week']['Pazartesi']['shift']=='morning'
            assert b['data']['trainingLogs']['2026-09-14'][0]['athleteDay']=='2026-09-14'
            assert b['data']['daily']['2026-09-15']['fatigueLevel']==6
            c=req('/api/revisions')
            assert len(c['revisions'])>=1
            db=Path(td)/'athlete-life-os.sqlite3'
            assert db.exists() and db.stat().st_size>0
            req('/api/state','POST',{'data':{'meta':{}},'reason':'second-state'})
            restored=req('/api/restore/'+str(a['revision']),'POST',{})
            assert restored['ok']
            assert req('/api/state')['data']['daily']==state['daily']
            p.terminate();p.wait(timeout=3)
            p=subprocess.Popen([sys.executable,'-B','-c',server_code],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
            for _ in range(50):
                try:
                    if req('/api/state')['revision']==restored['revision']:break
                except Exception:time.sleep(.1)
            else:raise AssertionError('restart did not restore persisted state')
            restored_state=req('/api/state')['data']
            assert restored_state['trainingPeriods']==state['trainingPeriods']
            assert restored_state['trainingPeriodDraft']==state['trainingPeriodDraft']
            assert restored_state['scheduleByDate']==state['scheduleByDate']
            for path in ('/.env','/.local-backups/merged-2026-09-15.alosbackup','/mongo_store.py'):
                try:req(path)
                except urllib.error.HTTPError as error:assert error.code==404
                else:raise AssertionError('private file exposed')
            print('dynamic-server.test.py: PASS')
        finally:
            p.terminate();
            try:p.wait(timeout=3)
            except Exception:p.kill()
if __name__=='__main__':main()
