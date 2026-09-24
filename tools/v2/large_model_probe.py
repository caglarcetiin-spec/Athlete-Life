"""Actual HTTP/80 MiB synthetic GLB probe in an isolated local Mongo database."""
import json
import os
import resource
import signal
import struct
import subprocess
import sys
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'apps/api'))
URI = 'mongodb://127.0.0.1:27028/?replicaSet=alos-test'
PORT = 10017
ORIGIN = f'http://127.0.0.1:{PORT}'


def serve(name):
    import uvicorn
    from alos.auth import create_user
    from alos.config import Settings
    from alos.main import create_app
    app = create_app(Settings(database_url=URI, mongo_database=name, enabled=True,
                              environment='test', public_origin=ORIGIN, worker_enabled=False))
    @app.get('/probe/memory')
    def memory():
        peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        return {'peak_mib':peak / (1024**2 if sys.platform == 'darwin' else 1024)}
    app.router.routes.insert(0, app.router.routes.pop())
    app.state.database.migrate()
    with app.state.database.sessions.begin() as db:
        create_user(db, 'synthetic', 'Synthetic', 'synthetic-test-password')
        create_user(db, 'restore', 'Restore', 'synthetic-test-password')
    class MeasuredServer(uvicorn.Server):
        @contextmanager
        def capture_signals(self):
            previous = signal.signal(signal.SIGTERM, lambda *_: setattr(self, 'should_exit', True))
            try:
                yield
            finally:
                signal.signal(signal.SIGTERM, previous)
    try:
        MeasuredServer(uvicorn.Config(app, host='127.0.0.1', port=PORT, access_log=False, log_level='error')).run()
    finally:
        peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
        print(json.dumps({'server_peak_mib': peak / (1024**2 if sys.platform == 'darwin' else 1024)}), flush=True)


def probe():
    import hashlib

    import httpx
    from pymongo import MongoClient
    model_mib = int(os.environ.get('ALOS_SYNTHETIC_MODEL_MIB', '80'))
    assert 1 <= model_mib <= 95
    name = 'alos_test_large_' + uuid4().hex
    with tempfile.TemporaryDirectory(prefix='alos-synthetic-model-') as directory:
        directory = Path(directory)
        document = json.dumps({'asset': {'version': '2.0'}, 'buffers': [{'byteLength': model_mib*1024*1024}]}).encode()
        document += b' ' * (-len(document) % 4)
        path = directory / 'synthetic.glb'
        size = model_mib*1024*1024
        with path.open('wb') as stream:
            stream.write(struct.pack('<IIIII', 0x46546C67, 2, 28+len(document)+size, len(document), 0x4E4F534A))
            stream.write(document)
            stream.write(struct.pack('<II', size, 0x004E4942))
            for _ in range(model_mib): stream.write(bytes(1024*1024))
        with path.open('rb') as stream: expected = hashlib.file_digest(stream, 'sha256').hexdigest()
        log = directory / 'server.log'
        with log.open('w') as output:
            process = subprocess.Popen([sys.executable, __file__, 'serve', name], cwd=root, stdout=output, stderr=subprocess.STDOUT,
                                       env={**os.environ, 'PYTHON_DOTENV_DISABLED':'1','STORAGE_BACKEND':'sqlite','ACCOUNT_STORAGE_BACKEND':'sqlite'})
        try:
            with httpx.Client(base_url=ORIGIN, timeout=180, headers={'Origin':ORIGIN}) as client:
                for _ in range(100):
                    try:
                        if client.get('/health/ready').status_code == 200: break
                    except httpx.TransportError: pass
                    if process.poll() is not None: raise RuntimeError('Synthetic server failed')
                    time.sleep(0.2)
                assert client.post('/api/v2/auth/login', json={'username':'synthetic','password':'synthetic-test-password'}).status_code == 200
                client.headers['X-CSRF-Token'] = client.get('/api/v2/auth/me').json()['csrf']
                params = {'operation_id':str(uuid4()),'entity_id':str(uuid4()),'name':f'synthetic-{model_mib}MiB.glb'}
                started = time.monotonic()
                with path.open('rb') as content:
                    uploaded = client.post('/api/v2/body-model/upload', params=params, content=content,
                                           headers={'Content-Length':str(path.stat().st_size),'Content-Type':'model/gltf-binary'})
                assert uploaded.status_code == 200, uploaded.text[:200]
                print("upload", client.get("/probe/memory").json(), flush=True)
                digest = hashlib.sha256()
                with client.stream('GET','/api/v2/body-model/content') as response:
                    assert response.status_code == 200
                    for chunk in response.iter_bytes(): digest.update(chunk)
                assert digest.hexdigest() == expected
                print("download", client.get("/probe/memory").json(), flush=True)
                assert client.get('/api/v2/body-model').json()['bytes'] == path.stat().st_size
                bootstrap = client.get('/api/v2/bootstrap')
                assert bootstrap.status_code == 200 and len(bootstrap.content) < 100_000
                export = directory / 'backup.json'
                with client.stream('GET','/api/v2/backups/export') as response, export.open('wb') as output:
                    assert response.status_code == 200
                    for chunk in response.iter_bytes(): output.write(chunk)
                print('export', client.get('/probe/memory').json(), flush=True)
                # Match the browser's exact-text transfer envelope, including local data.
                envelope = directory / 'transfer.json'
                with envelope.open('w') as output:
                    json.dump({'format':'alos-v2-transfer-text','canonical_text':export.read_text(),
                               'pending_journal':[], 'local_drafts':{'note':'Sentetik İı 😊'}}, output, ensure_ascii=False)
                export = envelope
                assert client.post('/api/v2/auth/login', json={'username':'restore','password':'synthetic-test-password'}).status_code == 200
                client.headers['X-CSRF-Token'] = client.get('/api/v2/auth/me').json()['csrf']
                with export.open('rb') as content:
                    staged = client.post('/api/v2/imports/stage', content=content, headers={'Content-Length':str(export.stat().st_size)})
                assert staged.status_code == 200, staged.text[:200]
                print("stage", client.get("/probe/memory").json(), flush=True)
                staged = staged.json()
                restored = client.post('/api/v2/commands', json={'operation_id':str(uuid4()),'entity_id':staged['id'],
                    'expected_version':staged['version'],'schema_version':1,'command_type':'import.apply','payload':{}})
                assert restored.status_code == 200, restored.text[:200]
                print("restore", client.get("/probe/memory").json(), flush=True)
                restored_hash = hashlib.sha256()
                with client.stream('GET','/api/v2/body-model/content') as response:
                    assert response.status_code == 200
                    for chunk in response.iter_bytes(): restored_hash.update(chunk)
                assert restored_hash.hexdigest() == expected
                memory = client.get('/probe/memory').json()['peak_mib']
                assert memory < (480 if model_mib <= 80 else 512), f'Excessive server RSS: {memory} MiB'
                print(json.dumps({'result':'PASS','model_bytes':path.stat().st_size,'hash_matches':True,
                                  'bootstrap_bytes':len(bootstrap.content),'backup_bytes':export.stat().st_size,
                                  'elapsed_seconds':round(time.monotonic()-started,2)}))
        finally:
            process.terminate()
            try: process.wait(timeout=20)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            with MongoClient(URI) as mongo: mongo.drop_database(name)
            print(log.read_text())


if __name__ == '__main__':
    if len(sys.argv) > 1:
        assert sys.argv[1] == 'serve' and sys.argv[2].startswith('alos_test_large_')
        serve(sys.argv[2])
    else:
        probe()
