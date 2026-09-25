"""Run real browser gates serially; they intentionally share one local test port."""

import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
node = sys.argv[1]
for name, script in [
    ("shift-regression", "browser_gate.mjs"),
    ("restore-regression", "restore_browser.mjs"),
    ("runner-regression", "workout_browser.mjs"),
    ("lifestyle-regression", "lifestyle_browser.mjs"),
    ("reports-regression", "reports_browser.mjs"),
    ("movement-regression", "movement_browser.mjs"),
    ("recovery-regression", "recovery_browser.mjs"),
    ("anatomy-regression", "anatomy_browser.mjs"),
    ("experience-regression", "experience_browser.mjs"),
]:
    result = subprocess.run(
        [sys.executable, "tools/v2/run_evidence.py", name, node, "tools/v2/" + script],
        cwd=root,
        check=False,
    )
    if result.returncode:
        raise SystemExit(result.returncode)
