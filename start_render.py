"""Start the existing account edition behind Render's HTTPS proxy."""
import os
import sys
from pathlib import Path

from account_server import validate_public_origin


def render_arguments(environment):
    origin = environment.get('ALOS_PUBLIC_ORIGIN') or environment.get('RENDER_EXTERNAL_URL')
    if not origin:
        raise ValueError('RENDER_EXTERNAL_URL veya ALOS_PUBLIC_ORIGIN gerekli.')
    validate_public_origin(origin)
    if environment.get('STORAGE_BACKEND') != 'mongodb' or not environment.get('MONGODB_URI', '').strip():
        raise ValueError('MongoDB ortam ayarları eksik.')
    if environment.get('ACCOUNT_STORAGE_BACKEND') != 'mongodb':
        raise ValueError('Render hesap ve fotoğraf depolaması MongoDB olmalı.')
    port = int(environment.get('PORT', '10000'))
    if not 1 <= port <= 65535:
        raise ValueError('Geçersiz PORT.')
    return ['--host', '0.0.0.0', '--port', str(port), '--backend', 'mongodb',
            '--public-origin', origin, '--no-browser']


def v2_environment(environment):
    """Reuse existing secrets; never migrate, copy accounts, or choose another DB."""
    render_arguments(environment)  # Keep the existing Mongo/HTTPS/port guards.
    return {
        'ALOS_V2_ENABLED': '1',
        'ALOS_V2_ENVIRONMENT': 'production',
        'ALOS_V2_DATABASE_URL': environment['MONGODB_URI'],
        'ALOS_V2_MONGO_DATABASE': environment.get('MONGODB_DATABASE', 'athlete_life'),
        'ALOS_V2_PUBLIC_ORIGIN': environment.get('ALOS_PUBLIC_ORIGIN') or environment['RENDER_EXTERNAL_URL'],
        'ALOS_V2_STATIC_DIR': str(Path(__file__).resolve().parent / 'release/v2'),
        'ALOS_V2_REGISTRATION_ENABLED': environment.get('ALOS_V2_REGISTRATION_ENABLED', '0'),
    }


def maintenance(port):
    """Quiesce both reads and writes; no account DB is opened in this process."""
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def respond(self):
            healthy = self.path in ('/health/live', '/health/ready')
            body = ('{"status":"maintenance"}' if healthy else
                    '{"error":{"code":"maintenance","message":"Güncelleme yapılıyor. Kayıtların korunuyor; kısa süre sonra yeniden dene."}}').encode()
            self.send_response(200 if healthy else 503)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Retry-After', '60')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)

        do_GET = do_HEAD = do_POST = do_PUT = do_PATCH = do_DELETE = respond

    ThreadingHTTPServer(('0.0.0.0', port), Handler).serve_forever()


def main():
    from state_repository import load_environment
    load_environment()
    try:
        arguments = render_arguments(os.environ)
        edition = os.environ.get('ALOS_EDITION', 'v10')
        if edition not in ('v10', 'maintenance', 'v2'):
            raise ValueError('Unsupported edition')
        if edition == 'maintenance':
            return maintenance(int(os.environ.get('PORT', '10000')))
        if edition == 'v2':
            os.environ.update(v2_environment(os.environ))
            sys.path.insert(0, str(Path(__file__).resolve().parent / 'apps/api'))
            from alos.config import Settings
            from alos.db import open_database
            database = open_database(Settings())
            try:
                if not database.ready():
                    raise ValueError('Migration required')
            finally:
                database.client.close()
            from alos.cli import main as serve_v2
            sys.argv = [sys.argv[0], 'serve']
            return serve_v2()
    except ValueError:
        print('Render başlatılamadı: HTTPS, MongoDB, sürüm ve geçiş ayarlarını kontrol et.', flush=True)
        return 1
    sys.argv = [sys.argv[0], *arguments]
    from account_server import main as serve
    return serve()


if __name__ == '__main__':
    raise SystemExit(main())
