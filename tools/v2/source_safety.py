"""Inspect files intended for source publication without printing matching secrets."""

import json
import re
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[2]
paths = subprocess.check_output(
    ["git", "ls-files", "--others", "--exclude-standard"], cwd=root, text=True
).splitlines()
paths = sorted(set(paths) | set(subprocess.check_output(
    ["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"], cwd=root, text=True
).splitlines()))
patterns = {
    "credential_uri": re.compile(
        r"(?:mongodb(?:\+srv)?|postgres(?:ql)?|https?)://[^\s/@:]+:[^\s/@]+@"
    ),
    "private_key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "provider_token": re.compile(
        r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-proj-[A-Za-z0-9_-]{25,})"
    ),
}
findings = []
for item in paths:
    path = root / item
    if not path.is_file():
        continue
    if path.stat().st_size > 10 * 1024 * 1024:
        findings.append({"path": item, "reason": "oversize_source_file"})
    if (
        path.suffix.lower() in {".sqlite", ".db", ".alosbackup", ".glb", ".dump"}
        or path.name == ".env"
    ):
        findings.append({"path": item, "reason": "private_runtime_type"})
    if path.suffix.lower() not in {
        ".py",
        ".js",
        ".mjs",
        ".ts",
        ".tsx",
        ".json",
        ".md",
        ".yaml",
        ".yml",
        ".toml",
        ".log",
        ".txt",
        ".example",
    }:
        continue
    content = path.read_text(errors="replace")
    for label, pattern in patterns.items():
        for match in pattern.finditer(content):
            value = match.group()
            if (
                value == "postgresql://alos:local-development-only@"
                or "localhost" in value
                or "127.0.0.1" in value
                or "user:password@" in value
                or "username:password@" in value
            ):
                continue
            findings.append(
                {
                    "path": item,
                    "line": content.count("\n", 0, match.start()) + 1,
                    "reason": label,
                }
            )
report = {
    "result": "PASS" if not findings else "REVIEW_REQUIRED",
    "files": len(paths),
    "findings": findings,
    "scope": "Text pattern and file-type screening, not proof that all personal information is absent.",
}
print(json.dumps(report, indent=2))
(root / "docs/evidence/stage-8/source-safety.json").write_text(
    json.dumps(report, indent=2) + "\n"
)
raise SystemExit(bool(findings))
