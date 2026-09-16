# Guided interface and personal health context

Released September 2026. No database schema migration or replacement of existing account snapshots is needed.

## User flow

- Every account receives a one-time welcome choice: **Basit** (default) or **Profesyonel**. Health fields are optional. Interface complexity is independent of athletic experience.
- Simple mode shows Today, Activity, Health and Profile. Activity recording accepts past dates and starts with familiar activities, with search for the full catalog.
- Profile → Appearance and guide (also the top-bar Rehber button) changes mode and restarts the five-step tutorial. The roadmap reflects actual saved records.
- The professional workspace and historical records remain accessible. Mode, tutorial progress and new health fields are stored in the authenticated account snapshot and synchronize through the existing MongoDB persistence path.

## Health context and boundaries

- Optional date of birth, physiological context, training background and opt-in menstrual diary. No hormone, fertility, muscle-gain or recovery-speed estimate is inferred from sex or age.
- Menstrual tracking records bleeding, pain and fatigue on specific dates. Bleeding alone does not lower training targets. Disabling tracking hides it without deleting history.
- Illness, injury and fatigue episodes record onset, assessment, recovery and end dates. Historical revisions remain in the account. An assessment older than two days requires an update; this is a data-freshness rule, not a recovery timetable.
- Current red-flag symptoms override other recommendations. Injury records do not generate automatic numeric prescriptions without a reported clinician-approved return and mild symptoms.
- Adults with a current mild recovery context may review a lighter week. The editable defaults (70% set/duration cap, 90% external-load cap, RIR ≥3) are **application heuristics, not a validated medical rehabilitation protocol**. Unknown ages and minors receive no adult numeric recovery prescription.
- Applied adjustments are derived for new sessions. Main periods and completed workout snapshots remain intact. Current safety assessment takes priority over an accepted week. Cancellation preserves history.
- Shared health assessment reaches period review, planned sessions, workout targets, legacy strength recommendations and coach modules. Nutrition shows contextual source-linked guidance; it does not prescribe supplements or treatment.
- New/returning trainees receive gradual-start guidance; older adults receive balance/function guidance. Neither demographic field is treated as a deterministic capacity coefficient.

## Reviewed primary sources · 2026-09-16

- McNulty et al., systematic review of menstrual cycle and exercise performance: https://pmc.ncbi.nlm.nih.gov/articles/PMC7497427/
- IOC consensus on acute respiratory infection in athletes: https://pubmed.ncbi.nlm.nih.gov/35863871/
- NIH Office of Dietary Supplements, Iron: https://ods.od.nih.gov/factsheets/Iron-Consumer/
- NHS, Period problems: https://www.nhs.uk/conditions/periods/period-problems/
- WHO, physical activity guidelines: https://www.who.int/publications/i/item/9789240014886
- ACSM, 2026 resistance training guidelines: https://acsm.org/resistance-training-guidelines-update-2026/

## Verification

- Pure-model and shared-engine tests cover chronology, stale assessments, symptoms, consent, conflict detection, minor/unknown-age boundaries, week acceptance/cancellation and immutable periods/session snapshots.
- Backup tests cover preserved records and before/after history on collisions, including repeated imports.
- Account HTTP tests verify authenticated assets, separate accounts and preferences/health records across sessions. Cloud HTTP tests use mocked MongoDB, not live medical records.
- Browser checks use synthetic accounts in an isolated SQLite directory. No live profile, cycle or illness records are inserted for testing.
