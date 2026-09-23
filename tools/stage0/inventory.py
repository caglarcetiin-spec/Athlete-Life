"""Source-only inventory: tracked filenames, module exports and state references.

Regex references are navigation aids, not proof of complete dynamic data flow.
Never opens .env, databases, backups or media bodies.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/evidence/stage-0/inventory'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
    tracked = [n for n in tracked if n and not n.startswith(('docs/', 'tools/stage0/', 'prompts/', 'reference/'))]
    sources = [n for n in tracked if '/' not in n and n.endswith(('.js', '.py', '.html', '.css', '.json')) and '.test.' not in n]
    files = [{'path': n, 'bytes': (ROOT / n).stat().st_size} for n in tracked if (ROOT / n).is_file()]
    modules, state = [], {}
    for name in sources:
        p = ROOT / name
        text = p.read_text()
        lines = text.splitlines()
        exports, calls, functions = {}, {}, {}
        for i, line in enumerate(lines, 1):
            for m in re.finditer(r'(?:window|root)\.([A-Za-z_$][\w$]*)\s*=', line):
                exports.setdefault(m[1], i)
            for m in re.finditer(r'window\.([A-Za-z_$][\w$]*)\??\.', line):
                calls.setdefault(m[1], i)
            for m in re.finditer(r'(?:function\s+|^\s*(?:async\s+)?def\s+)([A-Za-z_$][\w$]*)\s*\(', line):
                functions.setdefault(m[1], i)
            for m in re.finditer(r'\b(?:db|d)(?:\(\))?\??\.([A-Za-z_$][\w$]*)', line):
                tail = line[m.end():]
                kind = 'write-candidate' if re.match(r'\s*(?:=(?!=)|\|\|=|\?\?=|\.push\(|\.splice\()', tail) else 'reference'
                state.setdefault(m[1], []).append({'file': name, 'line': i, 'kind': kind})
        modules.append({'file': name, 'lines': len(lines), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'exports': exports, 'global_dependencies': calls, 'functions': functions})
    # Literal key lists and computed db[key] are reviewed separately in LEGACY_DATA_MAP.
    result = {'source_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip(),
              'method': 'tracked source only; regex candidate references need manual interpretation; dynamic keys excluded',
              'files': files, 'modules': modules, 'state_references': state}
    (OUT / 'source-index.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    lines = ['# Kaynak envanteri — Aşama 0', '', 'Otomatik kaynak taraması. Gerçek kullanıcı verisi okunmadı. `d.x` yerel değişken de olabilir; yazıcı adayı semantik kanıt değildir. Dinamik anahtarlar ana veri haritasında ayrıca incelendi.', '', '## İzlenen dosya ağacı', '', '```text', *[f"{f['path']} ({f['bytes']} bayt)" for f in files], '```', '', '## Modüller ve global bağlantılar', '', '| Dosya | Satır | Dışa açılan API (satır) | Global bağımlılıklar |', '|---|---:|---|---|']
    for m in modules:
        lines.append(f"| `{m['file']}` | {m['lines']} | "+', '.join(f'{k}:{v}' for k,v in m['exports'].items())+' | '+', '.join(m['global_dependencies'])+' |')
    lines += ['', '## Durum alanı referansları', '', 'Bu liste alan sözleşmesi değildir; kaynak konumu dizinidir. Her gerçek domain alanının taşıma kararı LEGACY_DATA_MAP içindedir.', '', '| Alan adayı | Kaynak konumları |', '|---|---|']
    for key, refs in sorted(state.items()):
        locations = {}
        for r in refs: locations.setdefault(r['file'], []).append(str(r['line']))
        lines.append(f'| `{key}` | '+ '; '.join(f"{n}:{','.join(sorted(set(ls), key=int))}" for n,ls in locations.items())+' |')
    lines += ['', '## Fonksiyon konumları', '', '| Dosya | Fonksiyon:satır |', '|---|---|']
    for m in modules:
        if m['functions']:
            lines.append(f"| `{m['file']}` | "+', '.join(f'{k}:{v}' for k,v in m['functions'].items())+' |')
    (OUT / 'SOURCE_INDEX.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({'tracked_files':len(files),'source_modules':len(modules),'state_key_candidates':len(state)}))


if __name__ == '__main__': main()
