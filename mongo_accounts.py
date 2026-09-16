"""Durable identities and sessions for hosts with ephemeral filesystems."""
import re
import secrets
import time
from datetime import datetime, timezone

from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError
from pymongo.write_concern import WriteConcern
from accounts import Accounts, AccountError, SESSION_SECONDS, password_hash, password_matches, token_hash


class MongoAccounts:
    backend = 'mongodb'
    public = staticmethod(Accounts.public)

    def __init__(self, database):
        self.database = database
        self.users = database.get_collection('account_users', write_concern=WriteConcern(w='majority'))
        self.sessions = database.get_collection('account_sessions', write_concern=WriteConcern(w='majority'))
        self.attempts = database.get_collection('account_login_attempts', write_concern=WriteConcern(w='majority'))
        self.users.create_index('username', unique=True)
        self.sessions.create_index('expiresAt', expireAfterSeconds=0)
        self.attempts.create_index('expiresAt', expireAfterSeconds=0)
        self.dummy_hash = password_hash(secrets.token_urlsafe(32))

    def throttle(self, peer, username):
        now = time.time()
        for bucket, limit in ((f'peer:{peer}', 30), (f'user:{username}', 8)):
            try:
                self.attempts.update_one({'_id': bucket}, {'$setOnInsert': {'events': []}}, upsert=True)
            except DuplicateKeyError:
                pass  # Another worker created the same bucket.
            self.attempts.update_one({'_id': bucket}, {'$pull': {'events': {'$lte': now - 600}}})
            result = self.attempts.update_one(
                {'_id': bucket, f'events.{limit - 1}': {'$exists': False}},
                {'$push': {'events': now}, '$set': {'expiresAt': datetime.fromtimestamp(now + 600, timezone.utc)}})
            if not result.matched_count:
                raise AccountError('Çok fazla deneme. 10 dakika sonra yeniden dene.', 429)

    def signup(self, username, password, name):
        username, name = username.strip().lower(), name.strip()
        if not re.fullmatch(r'[a-z0-9_.-]{3,40}', username):
            raise AccountError('Kullanıcı adı 3–40 karakter olmalı; harf, rakam, nokta, tire kullanabilirsin.')
        if not 15 <= len(password) <= 128:
            raise AccountError('Şifren 15–128 karakter olmalı. Birkaç kelimelik bir ifade kullanabilirsin.')
        if not 1 <= len(name) <= 60:
            raise AccountError('Görünen adını gir (en fazla 60 karakter).')
        identifier = secrets.token_hex(16)
        user = {'_id': identifier, 'id': identifier, 'username': username, 'name': name,
                'password_hash': password_hash(password), 'created_at': time.time(),
                'auth_epoch': 0, 'recovery_codes': []}
        try:
            self.users.insert_one(user)
        except DuplicateKeyError:
            raise AccountError('Bu kullanıcı adı kullanılamıyor. Başka bir ad seç.', 409) from None
        return self.public(user)

    def verified_user(self, username, password):
        row = self.users.find_one({'username': username.strip().lower()})
        valid = password_matches(password, row['password_hash'] if row else self.dummy_hash)
        if not row or not valid:
            raise AccountError('Kullanıcı adı veya şifre hatalı.', 401)
        return row

    def login(self, username, password):
        row = self.verified_user(username, password)
        # Carry the epoch from password verification through session creation.
        return {**self.public(row), '_auth_epoch': row.get('auth_epoch', 0)}

    def start_session(self, user):
        row = self.users.find_one({'_id': user['id']})
        epoch = user.get('_auth_epoch', row.get('auth_epoch', 0) if row else None)
        if not row or row.get('auth_epoch', 0) != epoch:
            raise AccountError('Hesap değişti. Yeniden giriş yap.', 401)
        token = secrets.token_urlsafe(32)
        expires = time.time() + SESSION_SECONDS
        self.sessions.insert_one({'_id': token_hash(token), 'user_id': user['id'],
                                  'csrf': secrets.token_urlsafe(32), 'auth_epoch': epoch,
                                  'expires_at': expires, 'expiresAt': datetime.fromtimestamp(expires, timezone.utc)})
        return token

    def session(self, token):
        if not token or len(token) > 128:
            return None
        session = self.sessions.find_one({'_id': token_hash(token), 'expires_at': {'$gt': time.time()}})
        if not session:
            return None
        user = self.users.find_one({'_id': session['user_id']})
        if not user or user.get('auth_epoch', 0) != session['auth_epoch']:
            return None
        return {**self.public(user), 'csrf': session['csrf']}

    def logout(self, token):
        self.sessions.delete_one({'_id': token_hash(token)})

    def update_profile(self, user, name, email, version):
        name, email = Accounts.validate_profile(name, email, version)
        query = {'_id': user['id'], 'profile_version': version}
        if version == 0:
            query = {'_id': user['id'], '$or': [{'profile_version': 0}, {'profile_version': {'$exists': False}}]}
        row = self.users.find_one_and_update(query,
            {'$set': {'name': name, 'email': email}, '$inc': {'profile_version': 1}},
            return_document=ReturnDocument.AFTER)
        if not row:
            raise AccountError('Profil başka bir ekranda değişti. Sayfayı yenileyip tekrar dene.', 409)
        return self.public(row)

    def change_password(self, user, current, new):
        if not 15 <= len(new) <= 128:
            raise AccountError('Yeni şifren 15–128 karakter olmalı.')
        row = self.verified_user(user['username'], current)
        result = self.users.update_one({'_id': row['_id'], 'password_hash': row['password_hash']},
                                       {'$set': {'password_hash': password_hash(new)}, '$inc': {'auth_epoch': 1}})
        if not result.matched_count:
            raise AccountError('Hesap değişti. Yeniden giriş yap.', 409)

    def create_recovery_codes(self, user, current):
        row = self.verified_user(user['username'], current)
        codes = [secrets.token_hex(16) for _ in range(5)]
        result = self.users.update_one({'_id': row['_id'], 'password_hash': row['password_hash']},
                                       {'$set': {'recovery_codes': [token_hash(code) for code in codes]}})
        if not result.matched_count:
            raise AccountError('Hesap değişti. Yeniden giriş yap.', 409)
        return codes

    def recover(self, username, code, new_password):
        if not isinstance(code, str) or len(code) > 128 or not isinstance(new_password, str) or not 15 <= len(new_password) <= 128:
            raise AccountError('Kurtarma kodunu ve 15–128 karakterlik yeni şifreyi kontrol et.')
        digest = token_hash(code.strip().lower())
        row = self.users.find_one_and_update(
            {'username': username.strip().lower(), 'recovery_codes': digest},
            {'$pull': {'recovery_codes': digest}, '$set': {'password_hash': password_hash(new_password)},
             '$inc': {'auth_epoch': 1}}, return_document=ReturnDocument.AFTER)
        if not row:
            raise AccountError('Kullanıcı adı veya kurtarma kodu geçersiz.', 401)
