"""Preview or explicitly copy local account snapshots into empty MongoDB owners."""
import argparse
import json
import sqlite3
from pathlib import Path
from account_states import decode, MongoAccountStates
from state_common import checksum
from state_repository import load_environment


def comparable(data):
    value = json.loads(json.dumps(data))
    for key in ('persistenceRevision', 'lastSavedAt', 'lastSaveReason'):
        value.get('meta', {}).pop(key, None)
    return checksum(value)


def plan(rows, collection):
    result = []
    for row in rows:
        source = decode(row)
        remote = decode(collection.find_one({'user_id': row['user_id']}, sort=[('revision', -1)]))
        status = 'copy' if remote is None else ('same' if comparable(source['data']) == comparable(remote['data']) else 'conflict')
        result.append({'owner': row['user_id'], 'status': status, 'data': source['data']})
    return result


def apply(items, store):
    if any(item['status'] == 'conflict' for item in items):
        raise ValueError('Remote data differs; nothing may be overwritten')
    count = 0
    for item in items:
        if item['status'] != 'copy':
            continue
        # Optimistic revision zero prevents a concurrent first write being replaced.
        store.commit_state(item['owner'], item['data'], 'local-account-migration', 0)
        if comparable(store.read_state(item['owner'])['data']) != comparable(item['data']):
            raise ValueError('Read-back verification failed')
        count += 1
    return count


def main():
    import os
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, default=Path.home() / '.athlete-life-os' / 'private-edition')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    source = args.data_dir / 'states.sqlite3'
    if not source.is_file():
        print('Yerel hesap verisi bulunamadı. Önce uygulamada hesabını oluştur.')
        return 1
    load_environment()
    from pymongo import MongoClient
    uri = os.environ.get('MONGODB_URI', '').strip()
    if not uri:
        print('.env içinde MongoDB bağlantısı bulunamadı.')
        return 1
    with sqlite3.connect(source.resolve().as_uri() + '?mode=ro', uri=True) as local:
        local.row_factory = sqlite3.Row
        rows = [dict(row) for row in local.execute('SELECT r.* FROM account_revisions r JOIN (SELECT user_id, MAX(revision) AS revision FROM account_revisions GROUP BY user_id) h ON r.user_id=h.user_id AND r.revision=h.revision')]
    database = os.environ.get('MONGODB_DATABASE', 'athlete_life')
    client = MongoClient(uri, serverSelectionTimeoutMS=15000, connectTimeoutMS=10000, socketTimeoutMS=15000)
    try:
        items = plan(rows, client[database]['account_state_revisions'])
        counts = {status: sum(x['status'] == status for x in items) for status in ('copy', 'same', 'conflict')}
        print('Aktarılabilir hesap:', counts['copy'], '· zaten aynı:', counts['same'], '· farklı uzak veri:', counts['conflict'])
        if counts['conflict']:
            print('İşlem durdu. Mevcut farklı uzak kayıtların üzerine yazılmaz.')
            return 1
        if not args.apply:
            print('Kontrol tamamlandı; yazma yapılmadı. Uygulamayı kapatıp --apply ile aktarabilirsin.')
            return 0
        store = MongoAccountStates(uri, database)
        try:
            count = apply(items, store)
        finally:
            store.client.close()
        print('Aktarılan ve geri okunarak doğrulanan hesap:', count)
        print('Yerel dosyalar korundu. MongoDB sürümünü START_LOCAL_MAC.command --backend mongodb ile aç.')
        return 0
    finally:
        client.close()


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        # Connection strings and server errors may contain credentials; do not echo them.
        print('Geçiş tamamlanamadı:', type(error).__name__, '· yerel dosyaların korundu.')
        raise SystemExit(1)
