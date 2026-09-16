"""MongoDB photo records; revision and quota changes share one transaction."""
import hashlib
import json
from pymongo.write_concern import WriteConcern
from account_photos import normalize, MAX_ACCOUNT_BYTES
from account_states import Conflict


class MongoAccountPhotos:
    def __init__(self, database):
        self.database = database
        self.collection = database.get_collection('account_photos', write_concern=WriteConcern(w='majority'))
        self.quotas = database.get_collection('account_photo_quotas', write_concern=WriteConcern(w='majority'))
        self.collection.create_index([('owner', 1), ('id', 1)], unique=True)

    def list(self, owner):
        return list(self.collection.find({'owner': owner}, {'_id': 0, 'id': 1, 'revision': 1, 'deleted': 1, 'hash': 1}).sort('id', 1))

    def get(self, owner, photo_id):
        row = self.collection.find_one({'owner': owner, 'id': photo_id})
        if not row:
            return None
        return {'revision': row['revision'], 'deleted': bool(row['deleted']),
                'record': json.loads(row['payload']) if row['payload'] else None}

    def transaction(self, callback):
        with self.database.client.start_session() as session:
            return session.with_transaction(callback, write_concern=WriteConcern(w='majority'))

    def commit(self, owner, photo_id, base_revision, record=None):
        if type(photo_id) is not int or not 0 < photo_id < 9007199254740991 or type(base_revision) is not int or base_revision < 0:
            raise ValueError('photo revision')
        normalized = normalize(record) if record is not None else None
        if normalized and normalized['id'] != photo_id:
            raise ValueError('photo id mismatch')
        payload = json.dumps(normalized, ensure_ascii=False, separators=(',', ':'), sort_keys=True) if normalized else None
        size = len(payload.encode()) if payload else 0
        digest = hashlib.sha256(payload.encode()).hexdigest() if payload else None

        def write(session):
            options = {'session': session} if session is not None else {}
            old = self.collection.find_one({'owner': owner, 'id': photo_id}, **options)
            if base_revision != (old['revision'] if old else 0):
                raise Conflict('photo changed')
            self.quotas.update_one({'_id': owner}, {'$setOnInsert': {'size': 0, 'count': 0}}, upsert=True, **options)
            quota = self.quotas.find_one({'_id': owner}, **options)
            total = quota['size'] - (old['size'] if old else 0) + size
            count = quota['count'] + (0 if old else 1)
            if total > MAX_ACCOUNT_BYTES or count > 5000:
                raise ValueError('photo quota exceeded')
            self.quotas.update_one({'_id': owner}, {'$set': {'size': total, 'count': count}}, **options)
            row = {'_id': f'{owner}:{photo_id}', 'owner': owner, 'id': photo_id,
                   'revision': base_revision + 1, 'deleted': int(record is None),
                   'payload': payload, 'hash': digest, 'size': size}
            self.collection.replace_one({'_id': row['_id']}, row, upsert=True, **options)
            return {'revision': row['revision'], 'deleted': bool(row['deleted'])}

        return self.transaction(write)
