"""Publish only built public UI assets for the existing Python-only Render build."""
import hashlib
import json
import shutil
from pathlib import Path

root = Path(__file__).resolve().parents[2]
source, target = root / "apps/web/dist", root / "release/v2"
allowed = {".html", ".js", ".css", ".svg", ".webmanifest"}
files = sorted(p for p in source.rglob("*") if p.is_file())
if not files or not (source / "index.html").is_file():
    raise SystemExit("Build the frontend first")
if any(p.suffix not in allowed for p in files):
    raise SystemExit("Unexpected build file type; publication stopped")
if target.exists():
    shutil.rmtree(target)  # Only this generated, public asset directory.
target.mkdir(parents=True)
manifest = {}
for path in files:
    relative = path.relative_to(source)
    destination = target / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(path, destination)
    manifest[str(relative)] = hashlib.sha256(path.read_bytes()).hexdigest()
(target / "build-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"Packaged {len(files)} public build files; no runtime data or source maps")
