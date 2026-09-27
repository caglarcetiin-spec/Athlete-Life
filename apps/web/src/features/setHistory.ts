import type { Entity } from "../api/contracts";

const identity = [
  "movement_id",
  "variant",
  "equipment",
  "side",
  "load_kind",
  "modality",
  "set_kind",
];
export function previousComparable(
  rows: Entity[],
  target: Entity,
  session: Entity,
) {
  return rows
    .filter(
      (row) =>
        !row.deleted_at &&
        !row.local_pending &&
        row.status !== "skipped" &&
        row.id !== target.id &&
        row.session_id !== session.id &&
        String(row.local_date) <= String(session.local_date) &&
        identity.every((k) => row[k] === target[k]),
    )
    .sort((a, b) =>
      String(b.occurred_at || b.local_date).localeCompare(
        String(a.occurred_at || a.local_date),
      ),
    )[0];
}
