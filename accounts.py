"""Local account authority for the opt-in, single-host account server.

Passwords use scrypt; only hashes of opaque session cookies are persisted.
No application snapshot or legacy database is accessed here.
"""
import hashlib
import hmac
import re
import secrets
import sqlite3
import threading
import time
from contextlib import contextmanager
from pathlib import Path

HASH_SLOTS = threading.BoundedSemaphore(2)
SESSION_SECONDS = 12 * 60 * 60


class AccountError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    with HASH_SLOTS:
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt),
                                n=131072, r=8, p=1, maxmem=256 * 1024 * 1024).hex()
    return f"scrypt$131072$8$1${salt}${digest}"


def password_matches(password, encoded):
    return hmac.compare_digest(password_hash(password, encoded.split('$')[4]), encoded)


def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


class Accounts:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        self.path.touch(mode=0o600, exist_ok=True)
        with self.connect() as db:
            db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL, password_hash TEXT NOT NULL, created_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
                csrf TEXT NOT NULL, expires_at REAL NOT NULL
            );
            CREATE TABLE IF NOT EXISTS recovery_codes (
                user_id TEXT NOT NULL REFERENCES users(id), code_hash TEXT PRIMARY KEY
            );
            CREATE TABLE IF NOT EXISTS attempts (
                bucket TEXT NOT NULL, occurred_at REAL NOT NULL
            );
            CREATE INDEX IF NOT EXISTS attempts_bucket ON attempts(bucket, occurred_at);
            """)
            columns = {r['name'] for r in db.execute('PRAGMA table_info(users)')}
            if 'email' not in columns:
                db.execute("ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''")
            if 'profile_version' not in columns:
                db.execute('ALTER TABLE users ADD COLUMN profile_version INTEGER NOT NULL DEFAULT 0')
        self.dummy_hash = password_hash(secrets.token_urlsafe(32))

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        try:
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def public(row):
        fields = dict(row)
        return {**{key: fields[key] for key in ('id', 'username', 'name')},
                'email': fields.get('email', ''), 'profileVersion': fields.get('profile_version', fields.get('profileVersion', 0))}

    @staticmethod
    def validate_profile(name, email, version):
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 60 or any(ord(c) < 32 for c in name):
            raise AccountError('Görünen adını gir (en fazla 60 karakter).')
        if not isinstance(email, str) or len(email) > 254 or any(ord(c) < 32 for c in email):
            raise AccountError('Geçerli bir e-posta adresi gir.')
        email = email.strip()
        if email and not re.fullmatch(r'[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+', email):
            raise AccountError('Geçerli bir e-posta adresi gir.')
        if type(version) is not int or version < 0:
            raise AccountError('Profil sürümü gerekli.')
        return name.strip(), email

    def update_profile(self, user, name, email, version):
        name, email = self.validate_profile(name, email, version)
        with self.connect() as db:
            result = db.execute('UPDATE users SET name=?, email=?, profile_version=profile_version+1 WHERE id=? AND profile_version=?',
                                (name, email, user['id'], version))
            if result.rowcount != 1:
                raise AccountError('Profil başka bir ekranda değişti. Sayfayı yenileyip tekrar dene.', 409)
            return self.public(db.execute('SELECT * FROM users WHERE id=?', (user['id'],)).fetchone())

    def throttle(self, peer, username):
        now = time.time()
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM attempts WHERE occurred_at < ?', (now - 600,))
            for bucket, limit in ((f'peer:{peer}', 30), (f'user:{username}', 8)):
                count = db.execute('SELECT COUNT(*) FROM attempts WHERE bucket=?', (bucket,)).fetchone()[0]
                if count >= limit:
                    raise AccountError('Çok fazla deneme. 10 dakika sonra yeniden dene.', 429)
            db.executemany('INSERT INTO attempts VALUES (?,?)',
                           [(f'peer:{peer}', now), (f'user:{username}', now)])

    def signup(self, username, password, name):
        username = username.strip().lower()
        name = name.strip()
        if not re.fullmatch(r'[a-z0-9_.-]{3,40}', username):
            raise AccountError('Kullanıcı adı 3–40 karakter olmalı; harf, rakam, nokta, tire kullanabilirsin.')
        if not 15 <= len(password) <= 128:
            raise AccountError('Şifren 15–128 karakter olmalı. Birkaç kelimelik bir ifade kullanabilirsin.')
        if not 1 <= len(name) <= 60:
            raise AccountError('Görünen adını gir (en fazla 60 karakter).')
        encoded = password_hash(password)
        user = {'id': secrets.token_hex(16), 'username': username, 'name': name, 'email': '', 'profileVersion': 0}
        try:
            with self.connect() as db:
                db.execute('INSERT INTO users (id,username,name,password_hash,created_at) VALUES (?,?,?,?,?)',
                           (user['id'], username, name, encoded, time.time()))
        except sqlite3.IntegrityError:
            raise AccountError('Bu kullanıcı adı kullanılamıyor. Başka bir ad seç.', 409) from None
        return user

    def login(self, username, password):
        with self.connect() as db:
            row = db.execute('SELECT * FROM users WHERE username=?', (username.strip().lower(),)).fetchone()
        valid = password_matches(password, row['password_hash'] if row else self.dummy_hash)
        if not row or not valid:
            raise AccountError('Kullanıcı adı veya şifre hatalı.', 401)
        return self.public(row)

    def start_session(self, user):
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        with self.connect() as db:
            db.execute('DELETE FROM sessions WHERE expires_at <= ?', (time.time(),))
            db.execute('INSERT INTO sessions VALUES (?,?,?,?)',
                       (token_hash(token), user['id'], csrf, time.time() + SESSION_SECONDS))
        return token

    def session(self, token):
        if not token or len(token) > 128:
            return None
        with self.connect() as db:
            row = db.execute('''SELECT users.id, users.username, users.name, users.email, users.profile_version, sessions.csrf
                FROM sessions JOIN users ON users.id=sessions.user_id
                WHERE sessions.token_hash=? AND expires_at>?''', (token_hash(token), time.time())).fetchone()
        return {**self.public(row), 'csrf': row['csrf']} if row else None

    def logout(self, token):
        with self.connect() as db:
            db.execute('DELETE FROM sessions WHERE token_hash=?', (token_hash(token),))

    def change_password(self, user, current, new):
        if not 15 <= len(new) <= 128:
            raise AccountError('Yeni şifren 15–128 karakter olmalı.')
        self.login(user['username'], current)
        encoded = password_hash(new)
        with self.connect() as db:
            db.execute('UPDATE users SET password_hash=? WHERE id=?', (encoded, user['id']))
            db.execute('DELETE FROM sessions WHERE user_id=?', (user['id'],))

    def create_recovery_codes(self, user, current):
        self.login(user['username'], current)
        codes = [secrets.token_hex(16) for _ in range(5)]
        with self.connect() as db:
            db.execute('DELETE FROM recovery_codes WHERE user_id=?', (user['id'],))
            db.executemany('INSERT INTO recovery_codes VALUES (?,?)',
                           [(user['id'], token_hash(code)) for code in codes])
        return codes

    def recover(self, username, code, new_password):
        if not isinstance(code, str) or len(code) > 128 or not isinstance(new_password, str) or not 15 <= len(new_password) <= 128:
            raise AccountError('Kurtarma kodunu ve 15–128 karakterlik yeni şifreyi kontrol et.')
        encoded = password_hash(new_password)
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('''SELECT users.id FROM users JOIN recovery_codes ON users.id=recovery_codes.user_id
                WHERE users.username=? AND recovery_codes.code_hash=?''',
                (username.strip().lower(), token_hash(code.strip().lower()))).fetchone()
            if not row:
                raise AccountError('Kullanıcı adı veya kurtarma kodu geçersiz.', 401)
            db.execute('DELETE FROM recovery_codes WHERE user_id=? AND code_hash=?',
                       (row['id'], token_hash(code.strip().lower())))
            db.execute('UPDATE users SET password_hash=? WHERE id=?', (encoded, row['id']))
            db.execute('DELETE FROM sessions WHERE user_id=?', (row['id'],))
