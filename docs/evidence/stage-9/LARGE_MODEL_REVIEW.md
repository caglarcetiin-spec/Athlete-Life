# Large model acceptance — 2026-09-24

Scope: 96 MiB raw GLB upload, owner isolation, server ACK/progress, bounded memory,
metadata projection, compatible Mongo chunk writer and complete JSON backups.
No personal model or production records are used in these tests.

Synthetic fixtures: 80 MiB and 95 MiB binary GLB, exact SHA-256 on download and
restored download, browser-format text envelope including local draft data.
These large fixtures verify storage, not anatomical rendering complexity. A
separate synthetic triangle browser test verifies WebGL, camera, failed-library
fallback, upload and reload at a 390 px viewport.

Early measurements exceeded free-service memory: no release was made from those
versions. Raw uploads, chunked BSON, metadata queries, streaming base64 and JSON
processing remove large transient copies. Archived runs retain failures and
memory measurements; latest run JSON records command/source hashes/exit status.
The original backup boundary test expected rejection at 65 MiB; it now checks
193 MiB because the documented bound is 192 MiB. No success assertion was removed.

Schema: unchanged. Existing Mongo BSON chunk format and backup checksum semantics
remain compatible. Account/media migration: none. Rollback: prior release can
read newly stored chunk documents; it restores the smaller upload/import limits.
No infrastructure plan or environment secret changes are required.

Local results: 78 Mongo tests; 13 final command/API tests; 3 upload/serialization
guards; 30 PostgreSQL shared API tests; mobile synthetic browser PASS. Final
80 MiB peak 465.98 MiB, 95 MiB peak 491.58 MiB (macOS process RSS, not a claim
about physical-phone GPU memory). Linux CI also runs the 80 MiB full cycle with
a 480 MiB RSS gate. Browser fixture initially used PostgreSQL even when selecting
Mongo; fixed its storage selection and collection prefix without altering assertions.
