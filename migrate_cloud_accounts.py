"""Copy local account identities/photos to MongoDB without changing user IDs.

Preview by default. Existing different cloud records always stop migration.
Application snapshots are already in account_state_revisions and are not rewritten.
"""
import argparse
import json
import sqlite3
from pathlib import Path
from state_repository import load_environment


def read_rows(path, query):
    with sqlite3.connect(Path(path).resolve().as_uri() + '?mode=ro', uri=True) as db:
        db.row_factory = sqlite3.Row
        return [dict(row) for row in db.execute(query)]


def source_records(directory):
    users = read_rows(directory / 'accounts.sqlite3', 'SELECT * FROM users')
    recovery = read_rows(directory / 'accounts.sqlite3', 'SELECT * FROM recovery_codes')
    for user in users:
        user.update(_id=user['id'], auth_epoch=0,
                    recovery_codes=sorted(row['code_hash'] for row in recovery if row['user_id'] == user['id']))
    photos = read_rows(directory / 'photos.sqlite3', 'SELECT * FROM photos')
    for photo in photos:
        photo['_id'] = f"{photo['owner']}:{photo['id']}"
    return users, photos


def preview(database, users, photos):
    items = []
    for collection, records in [('account_users', users), ('account_photos', photos)]:
        for record in records:
            current = database[collection].find_one({'_id': record['_id']})
            if collection == 'account_users':
                duplicate = database[collection].find_one({'username': record['username'], '_id': {'$ne': record['_id']}})
                if duplicate:
                    raise ValueError('Username belongs to a different remote account; migration stopped')
            if current is not None and current != record:
                raise ValueError('Remote account or photo has different data; migration stopped')
            items.append((collection, record, 'same' if current else 'copy'))
    return items


def apply(database, items):
    # One transaction prevents half-imported identity/photo authority.
    def write(session):
        options = {'session': session} if session is not None else {}
        for collection, record, _ in items:
            current = database[collection].find_one({'_id': record['_id']}, **options)
            if current is not None and current != record:
                raise ValueError('Remote data changed; migration stopped')
            if current is None:
                database[collection].insert_one(record, **options)
        for owner in {record['owner'] for collection, record, _ in items if collection == 'account_photos'}:
            records = list(database.account_photos.find({'owner': owner}, **options))
            database.account_photo_quotas.update_one({'_id': owner},
                {'$set': {'size': sum(row['size'] for row in records), 'count': len(records)}}, upsert=True, **options)
    with database.client.start_session() as session:
        session.with_transaction(write)


def main():
    import os
    from pymongo import MongoClient
    from pymongo.write_concern import WriteConcern
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-dir', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    load_environment()
    users, photos = source_records(args.data_dir)
    if not users:
        raise ValueError('No local accounts; migration stopped')
    with MongoClient(os.environ['MONGODB_URI'], serverSelectionTimeoutMS=20000) as client:
        database = client.get_database(os.environ.get('MONGODB_DATABASE', 'athlete_life'), write_concern=WriteConcern(w='majority'))
        items = preview(database, users, photos)
        print(json.dumps({'users': len(users), 'photos': len(photos),
                          'newRecords': sum(status == 'copy' for _, _, status in items), 'apply': args.apply}))
        if args.apply:
            database.account_users.create_index('username', unique=True)
            apply(database, items)
            assert all(status == 'same' for _, _, status in preview(database, users, photos))
            print('Identity/photo migration verified; user IDs and password hashes preserved.')


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('Cloud account migration stopped:', type(error).__name__)
        raise SystemExit(1)
