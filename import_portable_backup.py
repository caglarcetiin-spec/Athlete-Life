"""Verify and import a portable backup into an empty MongoDB state repository."""
import argparse
import json
from pathlib import Path
from state_common import checksum
from state_repository import load_environment, create_store


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    payload = json.loads(args.source.read_text())
    integrity = payload.pop('integrity')
    if integrity.get('algorithm') != 'SHA-256' or checksum(payload) != integrity.get('sha256'):
        raise ValueError('Backup integrity verification failed')
    if payload.get('format') != 'alos-portable-backup' or not isinstance(payload.get('data'), dict):
        raise ValueError('Unsupported backup format')
    if payload.get('photos'):
        raise ValueError('Photo import needs a separate media migration')
    print('Backup SHA-256: verified')
    data = payload['data']
    print('Source counts:', json.dumps({k:sum(len(x) for x in data.get(k,{}).values()) for k in ('foodLogs','trainingLogs','waterLogs')}))
    load_environment()
    store = create_store(Path('unused.sqlite3'))
    if store.backend != 'mongodb':
        raise ValueError('MongoDB required')
    try:
        store.init_db()
        current = store.read_state()
        print('Destination revision:', current['revision'] if current else 0)
        if current:
            if current['data'].get('_portableImport',{}).get('sha256') == integrity['sha256']:
                print('Already imported; no changes made.')
                return
            raise ValueError('Destination contains data; merge review required before writing')
        if not args.apply:
            print('Dry run passed; no writes to application state.')
            return
        archive = dict(payload, integrity=integrity, _id=integrity['sha256'])
        store.collection.database['portable_backups'].update_one({'_id':archive['_id']},{'$setOnInsert':archive},upsert=True)
        data['_portableImport'] = {'sha256': integrity['sha256'], 'events': payload.get('events')}
        result = store.commit_state(data, 'portable-backup-import')
        verified = store.read_state()
        assert verified['checksum'] == result['checksum']
        expected = dict(data)
        expected['meta'] = result['data']['meta']
        assert verified['data'] == expected
        print('Import verified; revision:',result['revision'])
        print('Event archive count:',len((payload.get('events') or {}).get('events',[])))
    finally:
        store.client.close()


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print('Import stopped:',type(exc).__name__)
        raise SystemExit(1)
