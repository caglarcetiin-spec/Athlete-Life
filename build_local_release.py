"""Build an allowlisted, credential-free local application ZIP (stdlib only)."""
import argparse
import hashlib
import json
import re
import stat
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
NAME = 'Athlete_Life_Local_2026-09-16'
EXTRAS = '''health_report.py health_report_pdf.py health-report-ui.js assets/report-fonts/LICENSE_LIBERATION premium-workspace.css health-lab-library.js health-core.js wellness-ui.js appearance.css appearance.js accounts.html accounts.css accounts-ui.js account-context.js
account-sync.js account-security.js account-photos.js sport-catalog.js
sport-science-engine.js sport-science-ui.js workout-program-core.js workout-program-ui.js
account-design.js account-design.css account-personal-model.js account-personal-ui.js private_delivery.py
sports-profile-core.js sports-profile-ui.js sports-profile.css
athlete-workspace-core.js account-workspace.js account-workspace.css
accounts.py account_states.py account_photos.py account_server.py mongo_accounts.py mongo_account_photos.py
state_common.py state_repository.py mongo_store.py sqlite_store.py
start_local.py START_LOCAL_MAC.command requirements.txt BASLA.md
service-worker.js SCIENCE_MODELS.md REVISION_V2.md'''.split()


def content():
    index = (ROOT / 'index.html').read_text()
    files = {'index.html', 'styles.css', *EXTRAS}
    files.update(re.findall(r'<script src="([^"?]+)', index))
    files.update(['athlete-profile-library.json', 'exercise-library.json',
                  'science-library.json', 'nutrition-library-meta.json', 'manifest.json'])
    files.update(p.name for pattern in ('*-evidence.json', '*-rules.json') for p in ROOT.glob(pattern))
    files.update(str(p.relative_to(ROOT)) for p in (ROOT / 'assets').rglob('*')
                 if p.is_file() and p.suffix.lower() in {'.png', '.jpg', '.svg', '.glb', '.woff', '.woff2', '.ico', '.ttf'})
    payload = {}
    for name in sorted(files):
        path = ROOT / name
        if path.is_symlink() or not path.resolve().is_relative_to(ROOT):
            raise ValueError('Unexpected external file: ' + name)
        payload[name] = path.read_bytes()
    payload['.env.example'] = b'STORAGE_BACKEND=sqlite\nMONGODB_URI=\nMONGODB_DATABASE=athlete_life\n'
    # Account-only manifest, without changing the legacy application's manifest.
    payload['manifest.json'] = (json.dumps({
        'name': 'Athlete Life', 'short_name': 'Athlete Life', 'lang': 'tr',
        'start_url': './accounts.html', 'display': 'standalone',
        'background_color': '#0d1117', 'theme_color': '#0d1117',
        'description': 'Kişisel antrenman, plan ve gelişim günlüğü.'
    }, ensure_ascii=False, indent=2) + '\n').encode()
    # Fail closed if any app text accidentally contains a credential-bearing URI.
    for name, data in payload.items():
        if Path(name).suffix in {'.js', '.json', '.html', '.css', '.py', '.md', '.txt'}:
            if re.search(rb'mongodb(?:\+srv)?://[^\s\"\x27<>]+:[^\s\"\x27<>]+@', data):
                raise ValueError('Credential-bearing URI found in: ' + name)
    payload['DOSYA_LISTESI.json'] = (json.dumps({
        'package': NAME, 'files': {name: {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
                                 for name, data in sorted(payload.items())}
    }, ensure_ascii=False, indent=2) + '\n').encode()
    return payload


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist' / (NAME + '.zip'))
    args = parser.parse_args()
    payload = content()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name, data in sorted(payload.items()):
            item = zipfile.ZipInfo(NAME + '/' + name, date_time=(2026, 9, 16, 0, 0, 0))
            item.create_system = 3
            item.external_attr = (stat.S_IFREG | (0o755 if name.endswith('.command') else 0o644)) << 16
            archive.writestr(item, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)
    with zipfile.ZipFile(args.output) as archive:
        if archive.testzip() is not None:
            raise ValueError('Archive integrity check failed')
    digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
    args.output.with_suffix('.zip.sha256').write_text(digest + '  ' + args.output.name + '\n')
    print(json.dumps({'path': str(args.output), 'files': len(payload),
                      'bytes': args.output.stat().st_size, 'sha256': digest}, indent=2))


if __name__ == '__main__':
    main()
