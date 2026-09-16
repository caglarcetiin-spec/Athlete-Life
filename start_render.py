"""Start the existing account edition behind Render's HTTPS proxy."""
import os
import sys

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


def main():
    from state_repository import load_environment
    load_environment()
    try:
        arguments = render_arguments(os.environ)
    except ValueError:
        print('Render başlatılamadı: HTTPS adresini ve MongoDB uygulama/hesap ayarlarını kontrol et.', flush=True)
        return 1
    sys.argv = [sys.argv[0], *arguments]
    from account_server import main as serve
    return serve()


if __name__ == '__main__':
    raise SystemExit(main())
