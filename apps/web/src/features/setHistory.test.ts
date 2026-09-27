import { expect, it } from "vitest";
import { previousComparable } from "./setHistory";
const session = { id: "current", version: 1, local_date: "2026-09-27" };
const target = {
  id: "slot",
  version: 1,
  movement_id: "barbell-squat",
  variant: "standard",
  equipment: "barbell",
  side: "both",
  load_kind: "external",
  modality: "strength",
};
it("uses identity, variant and load meaning, never a similar name or future record", () => {
  const previous = {
    ...target,
    id: "past",
    session_id: "previous",
    local_date: "2026-09-26",
    status: "completed",
    reps: 10,
    external_kg: 0,
  };
  const rows = [
    previous,
    { ...previous, id: "wrong", movement_id: "bodyweight-squat" },
    { ...previous, id: "future", local_date: "2026-10-01" },
    { ...previous, id: "variant", variant: "partial" },
  ];
  expect(previousComparable(rows, target, session)).toEqual(previous);
  expect(rows).toHaveLength(4);
});
