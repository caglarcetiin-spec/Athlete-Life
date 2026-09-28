# Initial failures and corrections

2026-09-28, base 2111810. All fixtures synthetic, dotenv disabled.

- `sport_training_initial`: 59 passed, four fixture errors. Sandbox denied localhost PostgreSQL connections (`Operation not permitted`); rerun with local network permission. No assertion changed for this.
- `sport_training_api`: 337 passed, two assertions failed. New storage test looked for `program.guided_choices`; the existing canonical contract stores it under `program.decisions.guided_choices`. Correct the test path, do not add a second storage location. Existing hybrid test expected literal `guided-hybrid-3`; the new intentional planner version is `guided-sports-4`. Update that literal while retaining all canonical IDs and actual/report assertions. Failure logs are retained.

## Final checks

- API/domain regression suite: **342 passed**. Includes all 199 branch paths, resource/competency isolation, per-sport experience, method/metric validation, power budget, program→slot→actual→report identity and unknown muscle mapping.
- Disposable local MongoDB parity: **2 passed** (branch persistence/report and progress privacy/consent).
- Web unit suite: **25 passed**; production TypeScript/Vite build exit 0.
- Browser: **PASS**, synthetic EVREN substitute through real validation endpoint. Mobile/desktop 390/1280 px, no horizontal overflow, no serious/critical Axe violations, retained questionnaire, prefilled editor, actual branch report. No real provider calls.
- Ruff and changed-file ESLint passed. First ESLint invocation used repo root instead of apps/web; correcting the working directory located the existing configuration. No lint assertion relaxed. A transient shell-script UTF-8 parse failure made no edits; the patch was reapplied using apply_patch before the final checks.
- Build continues to report existing large bundle and dependency annotation warnings; no build failure.
- Source safety text/file-type scan PASS; no detected credentials/runtime DB/media in staged sources. Not a guarantee against every possible PII form.
