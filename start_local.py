"""Start the downloadable account edition with its own persistent data directory."""
import sys
import argparse
import os
from pathlib import Path


def launch_defaults(root, argv, environment, home):
    """Resolve CLI > environment > SQLite before selecting the browser origin."""
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--backend', choices=['sqlite', 'mongodb'])
    options, _ = parser.parse_known_args(argv)
    backend = options.backend or environment.get('STORAGE_BACKEND', 'sqlite').lower()
    private_seed = root / 'private-data' / 'first-profile.alosbackup'
    private = private_seed.is_file()
    data_dir = home / '.athlete-life-os' / ('private-edition' if private else 'local-edition')
    port = ('10004' if backend == 'mongodb' else '10003') if private else '10002'
    defaults = ['--port', port, '--data-dir', str(data_dir), '--backend', backend]
    if private and environment.get('ACCOUNT_STORAGE_BACKEND') != 'mongodb':
        defaults += ['--seed-backup', str(private_seed)]
    return defaults


def main():
    import hashlib
    if sys.version_info < (3, 10) or not hasattr(hashlib, 'scrypt'):
        print('Python 3.10+ ve scrypt desteği gerekli. BASLA.md dosyasına bak.')
        return 1
    root = Path(__file__).resolve().parent
    if (root / '.env').is_file():
        try:
            import dotenv  # noqa: F401 — configured backends need the optional dependencies
        except ImportError:
            print('Yapılandırma bulundu; gerekli paketler eksik.')
            print('Kullandığın Python ile: python3 -m pip install -r requirements.txt')
            return 1
    from state_repository import load_environment
    load_environment()
    # argparse uses the final occurrence for explicit port/data-directory overrides.
    defaults = launch_defaults(root, sys.argv[1:], os.environ, Path.home())
    sys.argv[1:1] = defaults
    print('Athlete Life · Hesaplı yerel sürüm', flush=True)
    print('Durdurmak için bu pencerede Control+C kullan. Kayıtların diskte kalır.', flush=True)
    from account_server import main as serve
    return serve()


if __name__ == '__main__':
    result = main()
    if result and sys.stdin.isatty():
        input('BASLA.md dosyasını kontrol et. Kapatmak için Enter: ')
    raise SystemExit(result)
