# Profile, health and interior design · 2026-09-16

## User flows

- Six main destinations: Bugün, Antrenman, Beslenme, Sağlık, Gelişim, Profilim.
- Profile: display name, optional contact email, existing password change, recovery codes, logout, sport profile and preferences. Email is **unverified contact information**; no email delivery, login or reset has been enabled.
- Health: overview, sleep entry and 7/30/90-day trends, blood test reports, daily health and existing body/recovery view. One sleep editor writes the existing `daily` fields; the older daily form cannot overwrite them.
- Blood reports: date, laboratory, fasting state, notes, numeric result/operator, exact unit, optional laboratory reference bounds and method. Multiple tests per report. Edits and reversible archive operations retain prior versions.
- Existing light/dark selection and reduced-motion support remain. Warm surfaces, editorial headings, restrained emerald/gold accents and icon navigation apply only inside the authenticated app. No external fonts or images.

## Clinical scope and sources

`health-lab-library.js` contains concise Turkish educational summaries and direct NIH/NLM MedlinePlus references for 17 markers. Reviewed September 16, 2026. General principles: https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/

The app is a longitudinal record and reference-interval comparison tool, **not a diagnostic system**. It has no universal normal ranges, disease probabilities, critical-value thresholds, medication/supplement doses, or lab-driven workout changes. Laboratory reference intervals are not necessarily treatment targets. Absence of a flag does not establish health. Critical results must follow the reporting laboratory/healthcare team's instructions.

Series match test identity, exact unit, named laboratory, recorded method, fasting state and reference bounds. Unknown method/fasting remains visibly qualified. No implicit unit conversions. Censored results (`<`, `>`, `≤`, `≥`) retain the operator and are omitted from exact-value plots/deltas. Reference changes form separate series. A numerical delta is not called improvement or deterioration. Custom markers have no invented medical explanation. No patient data is sent to source websites.

Sleep duration is a user-reported interval less awake minutes; missing nights are gaps, not zero. Equal start/end times, invalid dates and impossible awake durations are rejected. Quality averages include only entered 1–5 values.

## Persistence and security

- `POST /api/auth/profile`: existing session, origin, CSRF and account binding; validated name/email; optimistic profile version. SQLite adds backward-compatible columns; Mongo updates existing account documents atomically. Password hashes, auth epochs and sessions are unchanged by profile edits.
- `healthLabRecords` / `healthLabHistory` live in the existing per-account snapshot (`/api/state` / Mongo account state revisions), covered by local durability and backup. Backup merge retains overwritten lab versions in history. Existing training/nutrition/daily state is preserved.
- Authenticated assets only. No real user's profile, password or medical record was changed for QA. Local SQLite fixtures and mongomock isolate writes from production.

## Verification

- `node --test health-core.test.js`: six cases covering small-value decimal precision, dates/numbers/reference interpretation, historical edit/archive, series isolation, sleep missingness and preservation.
- `python profile-authority.test.py`: two authority cases, old SQLite schema and old Mongo documents; concurrent profile edits, validation, no hash exposure, password/session invalidation.
- `python accounts.test.py`: nine contracts; `python cloud-http.test.py`: five of the same HTTP contracts on mocked Mongo; `python private-delivery.test.py`: three existing delivery tests.
- `node wellness-integration.test.js`: actual-script engine integration plus dedicated sleep editor/daily check-in coexistence and lossless lab backup merge.
- `node account-context.test.js`: account-scoped browser storage and session-lock regression.
- Browser UI on isolated test account: profile name/email saved and survived reload; historical sleep produced 8h after 30min awake deduction; two dated ferritin results produced correct delta; edit and high-reference label; reversible archive; existing password/recovery controls present.
- Desktop and narrow-phone light/dark layouts, readable-text contrast and no whole-page horizontal overflow checked through the browser. Numerical chart data has a text table alternative.
