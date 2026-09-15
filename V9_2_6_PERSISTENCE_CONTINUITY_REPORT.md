# Athlete Life OS v9.2.6 — Persistence Continuity

- Every normal `save()` now writes both the live database and a synchronous Last Known Good mirror.
- Startup chooses the Last Known Good copy if the live database is missing/corrupt/older.
- Portable backup now also creates an internal IndexedDB checkpoint and refreshes Last Known Good before downloading the `.alosbackup` file.
- If the live database is empty but a meaningful local checkpoint exists, Backup Vault restores the newest checkpoint automatically and reloads once.
- Checkpoint restore and portable import also refresh Last Known Good.
- Weekly work schedule stays in `scheduleByDate` and is covered by all three persistence layers.
- Use `START_MAC.command` / `launch.py` at `http://127.0.0.1:8765` for cross-version continuity. Direct `file://` opening may use folder-specific browser storage and cannot guarantee continuity across extracted version folders.
