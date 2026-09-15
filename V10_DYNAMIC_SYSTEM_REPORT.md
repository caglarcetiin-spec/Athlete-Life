# Athlete Life OS v10.0.0 — Dynamic Application Conversion

## What changed
- Existing UI and client-side engines are preserved.
- `launch.py` is now an application server, not a static file server.
- Canonical state is stored transactionally in SQLite at `~/.athlete-life-os/athlete-life-os.sqlite3`.
- Browser localStorage/IndexedDB remains as cache/offline safety, not the only source of truth.
- New REST endpoints: `/api/health`, `/api/state`, `/api/revisions`, `/api/restore/<revision>`.
- Every server commit uses SQLite WAL, `synchronous=FULL`, an IMMEDIATE transaction, SHA-256 checksum, revision history, and read recovery.
- Up to 250 server revisions are retained.
- `server-sync.js` hydrates the browser from the server before application bootstrap and migrates legacy browser state to SQLite when the server database is empty/older.
- Every durable client save mirrors to the server; `pagehide` uses Beacon/keepalive as a final flush.
- Database location can be overridden with `ATHLETE_LIFE_OS_DATA_DIR`.

## Persistence hierarchy
1. SQLite canonical state (cross-release)
2. SQLite revision journal (250 revisions)
3. Browser durable cache / rollback
4. Browser IndexedDB revision journal
5. User-created `.alosbackup`

## Validation
- 35 JavaScript regression tests: PASS
- Dynamic SQLite server integration test: PASS
- Launcher tests: PASS

## Start
Use `START_MAC.command`, `START_WINDOWS.bat`, or `python3 launch.py`.
Do not open `index.html` directly with `file://` if you want the dynamic backend.
