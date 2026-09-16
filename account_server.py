"""Opt-in account edition; run separately from launch.py on loopback port 10001."""
import argparse
import json
import os
import re
import secrets
import webbrowser
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

from accounts import Accounts, AccountError, SESSION_SECONDS
from account_photos import AccountPhotos
from account_states import SQLiteAccountStates, MongoAccountStates, Conflict

ROOT = Path(__file__).resolve().parent
COOKIE = 'alos_account_session'
MAX_BODY = 16 * 1024 * 1024
PUBLIC = {'accounts.html', 'accounts.css', 'accounts-ui.js', 'account-security.js'}
LIBRARIES = {'athlete-profile-library.json', 'exercise-library.json', 'science-library.json',
             'nutrition-library-meta.json', 'manifest.json'}


class AccountHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def setup(self):
        super().setup()
        self.connection.settimeout(20)

    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'")
        if getattr(self.server, 'secure_cookies', False):
            self.send_header('Strict-Transport-Security', 'max-age=31536000')
        super().end_headers()

    def send_bytes(self, status, body, content_type, cookie=None, location=None):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        if cookie is not None:
            age = SESSION_SECONDS if cookie else 0
            self.send_header('Set-Cookie', f'{COOKIE}={cookie}; HttpOnly; SameSite=Strict; Path=/; Max-Age={age}' + ('; Secure' if getattr(self.server, 'secure_cookies', False) else ''))
        if location:
            self.send_header('Location', location)
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(body)

    def json(self, status, body, cookie=None):
        return self.send_bytes(status, json.dumps(body, ensure_ascii=False).encode(), 'application/json; charset=utf-8', cookie)

    def token(self):
        try:
            cookies = SimpleCookie(self.headers.get('Cookie', ''))
            return cookies[COOKIE].value if COOKIE in cookies else ''
        except Exception:
            return ''

    def session(self, bound=False, body=None):
        user = self.server.accounts.session(self.token())
        if not user:
            raise AccountError('Oturumun sona erdi. Yeniden giriş yap.', 401)
        if bound:
            owner = self.headers.get('X-ALOS-Account') or (body or {}).get('accountId')
            if owner != user['id']:
                raise AccountError('Bu sekmenin hesabı değişti. Sayfayı yeniden aç.', 403)
        return user

    def body(self):
        if self.headers.get_content_type() != 'application/json':
            raise AccountError('JSON gerekli.', 415)
        n = int(self.headers.get('Content-Length', '0'))
        if not 0 < n <= MAX_BODY:
            raise AccountError('İstek boyutu uygun değil.', 413)
        value = json.loads(self.rfile.read(n))
        if not isinstance(value, dict):
            raise AccountError('Geçersiz istek.')
        return value

    def check_host(self):
        # Loopback-only edition. Host/Origin checks also prevent DNS rebinding.
        if self.headers.get('Host') != urlparse(self.server.origin).netloc:
            raise AccountError('Geçersiz adres.', 403)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        try:
            self.check_host()
            self.get()
        except AccountError as error:
            self.json(error.status, {'ok': False, 'error': str(error)})
        except Exception:
            self.json(503, {'ok': False, 'error': 'Hizmete ulaşılamıyor. Yeniden dene.'})

    def get(self):
        path = unquote(urlparse(self.path).path).lstrip('/')
        if path in PUBLIC or path == '':
            name = path or 'accounts.html'
            body = (ROOT / name).read_bytes()
            if name == 'accounts.html' and getattr(self.server, 'private_delivery', None):
                body = body.replace('Kayıtların sana ait. Yeni hesaplar kendi boş profiliyle başlar.'.encode(), 'Kişisel paket: yedeğin ilk oluşturulan hesaba aktarılır. Sonraki hesaplar boş başlar.'.encode())
            return self.send_bytes(200, body, self.guess_type(name) + '; charset=utf-8')
        user = self.server.accounts.session(self.token())
        if path == 'index.html' and not user:
            return self.send_bytes(303, b'', 'text/plain', location='/accounts.html')
        if not user:
            raise AccountError('Giriş yapmalısın.', 401)
        if path == 'api/auth/session':
            return self.json(200, {'ok': True, 'user': Accounts.public(user), 'csrf': user['csrf']})
        if path in ('api/state', 'api/revisions', 'api/health'):
            user = self.session(bound=True)
            store = self.server.states
            if path == 'api/revisions':
                return self.json(200, {'ok': True, 'revisions': store.list_revisions(user['id'])})
            state = store.read_state(user['id'])
            return self.json(200, {'ok': True, 'database': store.backend, 'accountId': user['id'],
                                  'data': state['data'] if state and path == 'api/state' else None,
                                  'revision': state['revision'] if state else 0,
                                  'savedAt': state['savedAt'] if state else None})
        if path == 'api/photos' or re.fullmatch(r'api/photos/[0-9]+', path):
            user = self.session(bound=True)
            if path == 'api/photos':
                return self.json(200, {'ok': True, 'photos': self.server.photos.list(user['id'])})
            item = self.server.photos.get(user['id'], int(path.rsplit('/', 1)[1]))
            if item is None:
                raise AccountError('Fotoğraf bulunamadı.', 404)
            return self.json(200, {'ok': True, **item})
        if path.startswith('api/'):
            return self.json(404, {'ok': False, 'error': 'Bulunamadı.'})
        if path == 'account-bootstrap.js':
            config = json.dumps({'user': Accounts.public(user), 'csrf': user['csrf']}, ensure_ascii=True).replace('<', '\\u003c')
            return self.send_bytes(200, f'window.ALOSAccountConfig={config};'.encode(), 'text/javascript; charset=utf-8')
        if path == 'index.html':
            source = (ROOT / 'index.html').read_text()
            source = source.replace('</head>', '<link rel="stylesheet" href="accounts.css"><link rel="stylesheet" href="sports-profile.css"><link rel="stylesheet" href="account-workspace.css"><link rel="stylesheet" href="account-design.css"><script src="account-bootstrap.js"></script><script src="account-context.js"></script><script src="account-personal-model.js"></script></head>')
            source = source.replace('</body>', '<script src="sport-catalog.js"></script><script src="sport-science-engine.js"></script><script src="workout-program-core.js"></script><script src="sports-profile-core.js"></script><script src="athlete-workspace-core.js"></script><script src="sports-profile-ui.js"></script><script src="account-workspace.js"></script><script src="account-security.js"></script><script src="account-photos.js"></script><script src="sport-science-ui.js"></script><script src="workout-program-ui.js"></script><script src="account-design.js"></script><script src="account-personal-ui.js"></script></body>')
            source = source.replace('src="server-sync.js', 'src="account-sync.js')
            source = source.replace('>Çağlar</button>', '>Profilim</button>')
            source = source.replace('Çağlar için Hibrit Taslak Doldur', 'Hibrit Örnek Taslak Doldur')
            source = source.replace('Çağlar Hybrid Mass 12W', 'Hibrit Örnek Program · 12 Hafta')
            return self.send_bytes(200, source.encode(), 'text/html; charset=utf-8')
        if path == 'service-worker.js':
            # Account HTML and snapshots must never be cached by the legacy worker.
            code = "self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))).then(()=>self.clients.claim())));"
            return self.send_bytes(200, code.encode(), 'text/javascript')
        target = (ROOT / path).resolve()
        scripts = set(re.findall(r'<script src="([^"?]+)', (ROOT / 'index.html').read_text()))
        scripts |= {'account-context.js', 'account-sync.js', 'sport-catalog.js', 'sport-science-engine.js', 'workout-program-core.js', 'workout-program-ui.js', 'sport-science-ui.js', 'account-design.js', 'account-personal-model.js', 'account-personal-ui.js', 'sports-profile-core.js', 'sports-profile-ui.js', 'athlete-workspace-core.js', 'account-workspace.js', 'account-security.js', 'account-photos.js'}
        is_library = path in LIBRARIES or re.fullmatch(r'[a-z-]+-(evidence|rules)\.json', path)
        is_asset = path.startswith('assets/') and target.suffix.lower() in {'.png', '.jpg', '.svg', '.glb', '.woff', '.woff2', '.ico'}
        if not target.is_relative_to(ROOT) or not target.is_file() or not (path in scripts or path in {'styles.css', 'sports-profile.css', 'account-workspace.css', 'account-design.css'} or is_library or is_asset):
            return self.json(404, {'ok': False, 'error': 'Bulunamadı.'})
        return super().do_GET()

    def do_POST(self):
        try:
            self.check_host()
            if self.headers.get('Origin') != self.server.origin:
                raise AccountError('İstek kaynağı doğrulanamadı.', 403)
            body = self.body()
            path = urlparse(self.path).path
            accounts = self.server.accounts
            if path == '/api/auth/recover':
                username = body.get('username', '')
                if not isinstance(username, str) or len(username) > 40:
                    raise AccountError('Geçersiz giriş bilgileri.')
                accounts.throttle(self.client_address[0], username.strip().lower())
                accounts.recover(username, body.get('code'), body.get('newPassword'))
                return self.json(200, {'ok': True}, cookie='')
            if path in ('/api/auth/signup', '/api/auth/login'):
                username, password = body.get('username', ''), body.get('password', '')
                if not isinstance(username, str) or not isinstance(password, str) or len(username) > 40 or len(password) > 128:
                    raise AccountError('Geçersiz giriş bilgileri.')
                accounts.throttle(self.client_address[0], username.strip().lower())
                if path.endswith('signup'):
                    name = body.get('name', '')
                    if not isinstance(name, str):
                        raise AccountError('Adını gir.')
                    user = accounts.signup(username, password, name)
                else:
                    user = accounts.login(username, password)
                delivery = getattr(self.server, 'private_delivery', None)
                if delivery:
                    delivery.apply(user, accounts, self.server.states, self.server.photos)
                accounts.logout(self.token())
                return self.json(200, {'ok': True, 'user': Accounts.public(user)}, cookie=accounts.start_session(user))
            user = self.session(bound=True, body=body)
            csrf = self.headers.get('X-ALOS-CSRF') or body.get('csrf', '')
            if not isinstance(csrf, str) or not secrets.compare_digest(csrf, user['csrf']):
                raise AccountError('Oturum doğrulanamadı. Sayfayı yenile.', 403)
            if path == '/api/auth/recovery-codes':
                current = body.get('currentPassword')
                if not isinstance(current, str) or len(current) > 128:
                    raise AccountError('Mevcut şifreni gir.')
                accounts.throttle(self.client_address[0], user['username'])
                codes = accounts.create_recovery_codes(user, current)
                return self.json(200, {'ok': True, 'codes': codes})
            if path == '/api/photos':
                result = self.server.photos.commit(user['id'], body.get('id'), body.get('baseRevision'), body.get('record'))
                return self.json(200, {'ok': True, **result})
            if path == '/api/auth/logout':
                accounts.logout(self.token())
                return self.json(200, {'ok': True}, cookie='')
            if path == '/api/auth/password':
                current, new = body.get('currentPassword'), body.get('newPassword')
                if not isinstance(current, str) or not isinstance(new, str) or len(current) > 128:
                    raise AccountError('Geçersiz şifre.')
                accounts.throttle(self.client_address[0], user['username'])
                accounts.change_password(user, current, new)
                return self.json(200, {'ok': True}, cookie='')
            if path in ('/api/state', '/api/state/beacon') or path.startswith('/api/restore/'):
                base = body.get('baseRevision')
                if type(base) is not int or base < 0:
                    raise AccountError('Kayıt sürümü gerekli.')
                data = body.get('data')
                reason = str(body.get('reason', 'account-save'))[:120]
                if path.startswith('/api/restore/'):
                    rev = int(path.rsplit('/', 1)[1])
                    data = self.server.states.revision_data(user['id'], rev)
                    if data is None:
                        raise AccountError('Kayıt sürümü bulunamadı.', 404)
                    reason = f'restore-revision-{rev}'
                result = self.server.states.commit_state(user['id'], data, reason, base)
                return self.json(200, {'ok': True, 'revision': result['revision'], 'savedAt': result['savedAt']})
            return self.json(404, {'ok': False, 'error': 'Bulunamadı.'})
        except AccountError as error:
            self.json(error.status, {'ok': False, 'error': str(error)})
        except Conflict:
            self.json(409, {'ok': False, 'error': 'Başka bir sekme veya cihaz daha yeni veri kaydetti. Yerel değişikliklerini yedekleyip yeniden yükle.'})
        except (ValueError, TypeError, KeyError):
            self.json(400, {'ok': False, 'error': 'Geçersiz veri.'})
        except Exception:
            self.json(503, {'ok': False, 'error': 'Kayıt tamamlanamadı. Yeniden dene.'})

    def list_directory(self, path):
        self.send_error(404)


def validate_public_origin(origin):
    if not origin:
        return None
    parsed = urlparse(origin)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
        raise ValueError('HTTPS public origin required, without path or credentials')
    if not re.fullmatch(r'[A-Za-z0-9.-]+(?::[0-9]+)?', parsed.netloc):
        raise ValueError('Invalid public origin')
    return origin


def make_server(accounts, states, port=10001, public_origin=None, bind_host='127.0.0.1', photos=None):
    origin = validate_public_origin(public_origin)
    if bind_host not in ('127.0.0.1', '0.0.0.0'):
        raise ValueError('Unsupported bind address')
    if bind_host != '127.0.0.1' and not origin:
        raise ValueError('An HTTPS public origin is required for external binding')
    server = ThreadingHTTPServer((bind_host, port), AccountHandler)
    server.accounts, server.states = accounts, states
    if photos is None and getattr(accounts, 'backend', None) == 'mongodb':
        from mongo_account_photos import MongoAccountPhotos
        photos = MongoAccountPhotos(accounts.database)
    server.photos = photos if photos is not None else AccountPhotos(accounts.path.parent / 'photos.sqlite3')
    server.origin = origin or f'http://127.0.0.1:{server.server_address[1]}'
    server.secure_cookies = bool(origin)
    return server


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=10001)
    parser.add_argument('--host', choices=['127.0.0.1', '0.0.0.0'], default='127.0.0.1',
                        help='Use 0.0.0.0 only behind the hosting provider HTTPS proxy')
    parser.add_argument('--data-dir', type=Path, default=Path.home() / '.athlete-life-os' / 'accounts')
    parser.add_argument('--backend', choices=['sqlite', 'mongodb'])
    parser.add_argument('--no-browser', action='store_true')
    parser.add_argument('--seed-backup', type=Path, help='Private, verified backup for the first account only')
    parser.add_argument('--public-origin', help='HTTPS origin behind a loopback reverse proxy; e.g. https://athlete.example.org')
    args = parser.parse_args()
    from state_repository import load_environment
    load_environment()
    backend = args.backend or os.environ.get('STORAGE_BACKEND', 'sqlite')
    try:
        if backend == 'mongodb':
            uri = os.environ.get('MONGODB_URI', '').strip()
            if not uri:
                raise ValueError('MONGODB_URI gerekli')
            states = MongoAccountStates(uri, os.environ.get('MONGODB_DATABASE', 'athlete_life'))
        elif backend == 'sqlite':
            states = SQLiteAccountStates(args.data_dir / 'states.sqlite3')
        else:
            raise ValueError('Geçersiz depolama türü')
        photos = None
        authority = os.environ.get('ACCOUNT_STORAGE_BACKEND', 'sqlite')
        if authority == 'mongodb':
            if backend != 'mongodb' or args.seed_backup:
                raise ValueError('Cloud accounts require MongoDB and an explicit identity migration')
            from mongo_accounts import MongoAccounts
            from mongo_account_photos import MongoAccountPhotos
            database = states.collection.database
            accounts = MongoAccounts(database)
            photos = MongoAccountPhotos(database)
        elif authority == 'sqlite':
            accounts = Accounts(args.data_dir / 'accounts.sqlite3')
        else:
            raise ValueError('Geçersiz hesap depolama türü')
        server = make_server(accounts, states, args.port, args.public_origin, args.host, photos)
        if args.seed_backup:
            from private_delivery import PrivateDelivery
            server.private_delivery = PrivateDelivery(args.seed_backup, accounts)
    except Exception as error:
        print('Hesaplı sürüm başlatılamadı (' + type(error).__name__ + '). Port, veritabanı ayarı ve bağımlılıkları kontrol et.', flush=True)
        return 1
    with server:
        print(f'Hesaplı yerel sürüm: {server.origin} · veriler: {states.backend}', flush=True)
        if not args.no_browser:
            webbrowser.open(server.origin)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
