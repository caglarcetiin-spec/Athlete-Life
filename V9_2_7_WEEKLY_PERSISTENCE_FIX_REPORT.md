# Athlete Life OS v9.2.7 — Weekly Persistence Fix

Root cause: weekly shift selections lived in the DOM until “Haftayı Optimize Et” was pressed. Full Backup serialized the database, not pending DOM selections, so a visually entered weekly schedule could be absent from both the internal checkpoint and the exported backup.

Fixes:
- Weekly status/shift/social fields autosave on change.
- Added explicit “Vardiyayı Kaydet” control.
- Added `ALOSFlushPendingUIState()` and call it before every backup.
- Flush pending weekly UI again on `pagehide` and `beforeunload`.
- Weekly rows persist to both `db.week` and date-keyed `db.scheduleByDate`.
- Every autosave updates live DB + Last Known Good mirror.
- Full Backup now captures the visible weekly form even if Optimize was never pressed.
- Service-worker/cache version bumped to v9.2.7.
