# Athlete Life OS v9.3.0 — Durable Database

## Goal
Eliminate intermittent state loss by making persistence transactional and recoverable instead of relying on a single mutable localStorage object.

## Changes
- Added `durable-persistence.js` as the persistence authority loaded before `app.js`.
- Every save receives a monotonic persistence revision and checksum.
- Save path performs read-after-write verification before acknowledging success.
- Exactly one previous verified snapshot is retained in localStorage as rollback state.
- Successful revisions are journaled to IndexedDB; newest 30 verified revisions are retained.
- Boot verifies the live DB and falls back to the previous verified snapshot if the live value is corrupt.
- Backup Vault checks IndexedDB for a newer verified revision on startup and recovers it automatically.
- Manual/local checkpoints are mirrored into the durable journal.
- A global dirty-state guard checks the in-memory DB every 2 seconds and persists mutations even if a feature forgot to call `save()`.
- `pagehide` and `beforeunload` perform a final dirty flush.
- Persistence data-weight calculation now includes weekly schedule/optimization and other major maps.
- Service worker and launcher were bumped to v9.3.0.

## Storage strategy
1. `athleteLifeOS`: current live compatibility DB.
2. `athleteLifeOS.commit.v3`: small revision/checksum commit metadata.
3. `athleteLifeOSLastKnownGood`: one previous verified rollback snapshot.
4. IndexedDB `AthleteLifeOSDurable/revisions`: up to 30 verified full revisions.
5. Existing Backup Vault checkpoints and `.alosbackup` exports remain available.

This avoids keeping many full localStorage copies (quota risk) while maintaining a synchronous rollback plus deeper IndexedDB history.

## Verification
- Existing JavaScript regression suite passes.
- Added `durable-persistence-v930.test.js` covering revision increments, latest-state bootstrap, and recovery from corrupt live storage.
