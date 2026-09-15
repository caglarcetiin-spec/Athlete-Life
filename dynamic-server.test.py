import json, os, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def req(path, method='GET', body=None):
    data=None if body is None else json.dumps(body).encode()
    r=urllib.request.Request('http://127.0.0.1:8765'+path,data=data,method=method,headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(r,timeout=4) as x: return json.loads(x.read())

def main():
    with tempfile.TemporaryDirectory() as td:
        env=os.environ.copy();env['ATHLETE_LIFE_OS_DATA_DIR']=td
        p=subprocess.Popen([sys.executable,str(ROOT/'launch.py')],cwd=ROOT,env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        try:
            for _ in range(50):
                try:
                    if req('/api/health')['ok']: break
                except Exception: time.sleep(.1)
            else: raise AssertionError('server did not start')
            state={'week':{'Pazartesi':{'shift':'morning'}},'trainingLogs':{'2026-09-15':[{'exercise':'Pull-Up'}]},'meta':{}}
            a=req('/api/state','POST',{'data':state,'reason':'test'})
            assert a['ok'] and a['revision']>=1
            b=req('/api/state')
            assert b['data']['week']['Pazartesi']['shift']=='morning'
            assert b['data']['trainingLogs']['2026-09-15'][0]['exercise']=='Pull-Up'
            c=req('/api/revisions')
            assert len(c['revisions'])>=1
            db=Path(td)/'athlete-life-os.sqlite3'
            assert db.exists() and db.stat().st_size>0
            print('dynamic-server.test.py: PASS')
        finally:
            p.terminate();
            try:p.wait(timeout=3)
            except Exception:p.kill()
if __name__=='__main__':main()
