"""Run the existing tests with synthetic storage; never read private backups.

Usage: python tools/stage0/run_baseline.py --node /path/to/node --node-path /path/to/node_modules
Raw stdout/stderr, exit codes and environment are evidence, not a 2.0 release gate.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import platform
import signal
import subprocess
import sys
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]
EXCLUDED = {
    'backup-rehearsal.test.js': 'NOT RUN: reads a personal .local-backups file; synthetic-only audit.',
    'private-package-browser.test.js': 'NOT RUN: expects a private first-profile backup and bundled runtime.',
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--node', required=True)
    parser.add_argument('--node-path', required=True)
    parser.add_argument('--output', default='docs/evidence/stage-0/baseline')
    parser.add_argument('--only', nargs='*')
    args = parser.parse_args()
    out = ROOT / args.output
    out.mkdir(parents=True, exist_ok=True)
    source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    report = {'source_commit': source, 'branch': subprocess.check_output(['git', 'branch', '--show-current'], cwd=ROOT, text=True).strip(),
              'started_at': dt.datetime.now(dt.timezone.utc).isoformat(),
              'python': sys.version, 'platform': platform.platform(),
              'node': subprocess.check_output([args.node, '--version'], text=True).strip(),
              'fixture': 'synthetic; private backup tests excluded; live MongoDB not contacted',
              'results': []}
    tests = sorted([*ROOT.glob('*.test.js'), *ROOT.glob('*.test.py')])
    with tempfile.TemporaryDirectory(prefix='alos-stage0-baseline-') as temp:
        env = {k: v for k, v in os.environ.items() if not any(s in k.upper() for s in ['MONGODB', 'AL_OS_PRIVATE', 'ALOS_PUBLIC', 'RENDER_EXTERNAL'])}
        env.update(STORAGE_BACKEND='sqlite', ACCOUNT_STORAGE_BACKEND='sqlite',
                   PYTHON_DOTENV_DISABLED='1', PYTHONDONTWRITEBYTECODE='1',
                   ATHLETE_LIFE_OS_DATA_DIR=temp, NODE_PATH=args.node_path,
                   AL_OS_TEST_PYTHON=sys.executable, ALOS_TEST_NODE=args.node,
                   PATH=str(Path(args.node).parent) + os.pathsep + env.get('PATH', ''))
        for test in tests:
            if args.only and test.name not in args.only:
                continue
            command = [args.node, test.name] if test.suffix == '.js' else [sys.executable, '-B', test.name]
            row = {'test': test.name, 'command': command, 'cwd': '<repo>', 'fixture': 'synthetic'}
            if test.name in EXCLUDED:
                row.update(status='NOT RUN', exit_code=None, reason=EXCLUDED[test.name])
            else:
                start = time.monotonic()
                process = subprocess.Popen(command, cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                           text=True, start_new_session=True)
                try:
                    stdout, stderr = process.communicate(timeout=100 if 'browser' in test.name else 60)
                    row.update(exit_code=process.returncode, status='PASS' if process.returncode == 0 else 'FAIL')
                except subprocess.TimeoutExpired:
                    os.killpg(process.pid, signal.SIGTERM)
                    try:
                        stdout, stderr = process.communicate(timeout=5)
                    except subprocess.TimeoutExpired:
                        os.killpg(process.pid, signal.SIGKILL)
                        stdout, stderr = process.communicate()
                    row.update(exit_code=process.returncode, status='BLOCKED', reason='100s browser / 60s other timeout; no assertions changed')
                row['seconds'] = round(time.monotonic() - start, 3)
                # Synthetic browser screenshots may be under the printed temp path. Preserve that path locally.
                row['stdout'] = test.name + '.stdout.txt'
                row['stderr'] = test.name + '.stderr.txt'
                for name, value in [('stdout', stdout), ('stderr', stderr)]:
                    (out / row[name]).write_text(value.replace(str(ROOT), '<repo>').replace(temp, '<synthetic-data>'))
            report['results'].append(row)
            (out / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
            print(row['status'], test.name, flush=True)
    report['finished_at'] = dt.datetime.now(dt.timezone.utc).isoformat()
    report['counts'] = {s: sum(r['status'] == s for r in report['results']) for s in ['PASS', 'FAIL', 'BLOCKED', 'NOT RUN']}
    (out / 'results.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report['counts']), flush=True)
    return int(any(r['status'] in ('FAIL', 'BLOCKED') for r in report['results']))


if __name__ == '__main__':
    raise SystemExit(main())
