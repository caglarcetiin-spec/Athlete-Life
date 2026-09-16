"""Create an explicitly authorized PRIVATE delivery with data, secrets and runtimes."""
import argparse
import hashlib
import json
import os
import stat
import sys
import zipfile
from pathlib import Path
from build_local_release import ROOT, content
from state_common import checksum

NAME = 'Athlete_Life_Private_Mac_2026-09-16'


def tree(payload, source, destination, exclude=()):
    for path in sorted(source.rglob('*')):
        relative = path.relative_to(source)
        if any(part in {'__pycache__', '.DS_Store', *exclude} for part in relative.parts):
            continue
        if path.is_file() and path.suffix not in {'.pyc', '.pyo'}:
            # Materialize runtime symlinks so extraction never points outside the package.
            payload[str(Path(destination) / relative)] = path.read_bytes()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node-runtime', type=Path, required=True)
    parser.add_argument('--python-runtime', type=Path, default=Path(sys._base_executable).parent.parent)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist' / (NAME + '.zip'))
    args = parser.parse_args()
    payload = content()
    payload.pop('DOSYA_LISTESI.json')
    payload['.env'] = (ROOT / '.env').read_bytes()
    payload['private-data/original-server.env'] = payload['.env']
    selected = ROOT / '.local-backups' / 'private-mongodb-latest.alosbackup'
    if not selected.is_file():
        selected = ROOT / 'private-data' / 'first-profile.alosbackup'
    if not selected.is_file():
        raise ValueError('A verified live snapshot is required for this private release')
    seed = json.loads(selected.read_text())
    integrity = seed.pop('integrity', {})
    if integrity.get('sha256') != checksum(seed):
        raise ValueError('Private snapshot checksum mismatch')
    payload['private-data/first-profile.alosbackup'] = selected.read_bytes()
    sources = [ROOT / '.local-backups' / 'merged-2026-09-15.alosbackup']
    sources += sorted((Path.home() / 'Downloads').glob('Athlete_Life_OS_FULL_*.alosbackup*'))
    sources += sorted((ROOT / 'private-data' / 'original-backups').glob('*'))
    for source in sources:
        if source.is_file():
            payload['private-data/original-backups/' + source.name] = source.read_bytes()
    # Include source tests and a reproducible local development environment.
    for pattern in ('*.test.js', '*.test.py'):
        for path in ROOT.glob(pattern):
            payload[path.name] = path.read_bytes()
    for path in ROOT.glob('*.py'):
        payload[path.name] = path.read_bytes()
    for name in ['build_local_release.py', 'build_private_release.py', 'requirements-dev.txt', 'DEVELOPMENT.md', 'PRIVATE_README.md', 'ACCOUNT_REVISION.md', 'REVISION_PROGRESS.md', 'ACCOUNTS.md', 'SPORTS_PROFILE.md', 'SYSTEM_PARAMETER_INVENTORY.md', 'SYSTEM_ENGINE_AUDIT.md', 'DELIVERY_TESTS.md', 'migrate_account_storage.py']:
        payload[name] = (ROOT / name).read_bytes()
    tree(payload, ROOT / 'deployment', 'deployment')
    payload['BASLA.md'] = payload['PRIVATE_README.md']
    runtime = args.python_runtime
    python_binary = runtime / 'bin' / 'python3.12'
    if not python_binary.is_file():
        python_binary = runtime / 'bin' / 'python3'
    payload['runtime/python/bin/python3'] = python_binary.read_bytes()
    tree(payload, runtime / 'lib', 'runtime/python/lib', exclude={'site-packages'})
    packages = ROOT / '.venv-modern' / 'lib' / 'python3.12' / 'site-packages'
    if not packages.is_dir():
        packages = runtime / 'lib' / 'python3.12' / 'site-packages'
    tree(payload, packages, 'runtime/python/lib/python3.12/site-packages')
    node = args.node_runtime
    payload['runtime/node/bin/node'] = (node / 'bin' / 'node').read_bytes()
    for module in ('playwright', 'playwright-core'):
        tree(payload, node / 'node_modules' / module, 'runtime/node/node_modules/' + module)
    # Preserve the Node distribution licence when provided by the runtime.
    for candidate in [node / 'LICENSE', node / 'share/doc/node/LICENSE', node / 'share/doc/node/LICENSE.md', ROOT / 'runtime-licenses/NODE_LICENSE.txt']:
        if candidate.is_file():
            payload['runtime/node/LICENSE'] = candidate.read_bytes()
            break
    tree(payload, ROOT / 'runtime-licenses', 'runtime-licenses')
    if 'runtime/node/LICENSE' not in payload:
        raise ValueError('The bundled Node runtime requires its distribution licence')
    payload['PRIVATE_PACKAGE.json'] = (json.dumps({
        'name': NAME, 'private': True, 'containsCredentials': True, 'containsPersonalData': True,
        'platform': 'macOS-arm64', 'python': sys.version.split()[0],
        'sourceBackupExportedAt': seed.get('exportedAt'), 'sourceBackupSha256': integrity['sha256'],
        'defaultStorage': 'sqlite', 'defaultOrigin': 'http://127.0.0.1:10003',
        'firstAccountReceivesBackup': True
    }, ensure_ascii=False, indent=2) + '\n').encode()
    payload['DOSYA_LISTESI.json'] = (json.dumps({'package': NAME, 'private': True, 'files': {
        name: {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for name, data in sorted(payload.items())
    }}, ensure_ascii=False, indent=2) + '\n').encode()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name, data in sorted(payload.items()):
            executable = name.endswith('.command') or name in {'runtime/python/bin/python3', 'runtime/node/bin/node'}
            mode = 0o755 if executable else (0o600 if name == '.env' or name.startswith('private-data/') else 0o644)
            item = zipfile.ZipInfo(NAME + '/' + name, date_time=(2026, 9, 16, 0, 0, 0))
            item.create_system = 3
            item.external_attr = (stat.S_IFREG | mode) << 16
            archive.writestr(item, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)
    args.output.chmod(0o600)
    with zipfile.ZipFile(args.output) as archive:
        if archive.testzip() is not None:
            raise ValueError('Archive integrity failure')
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    args.output.with_suffix('.zip.sha256').write_text(digest + '  ' + args.output.name + '\n')
    print(json.dumps({'path': str(args.output), 'private': True, 'files': len(payload), 'bytes': args.output.stat().st_size, 'sha256': digest}, indent=2))


if __name__ == '__main__':
    main()
