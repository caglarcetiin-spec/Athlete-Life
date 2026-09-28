import { expect, it } from "vitest";
import { capacityError } from "./planningCapacity";
const options = [
  {
    movement_id: "run",
    name: "Koşu",
    metric: "seconds",
    block: "conditioning",
  },
  { movement_id: "hold", name: "Tutuş", metric: "seconds", block: "skill" },
  { movement_id: "pull", name: "Barfiks", metric: "reps", block: "strength" },
];
it("accepts 30-minute cardio while preserving the hold bound", () => {
  expect(capacityError([{ movement_id: "run", seconds: 1800 }], options)).toBe(
    "",
  );
  expect(
    capacityError([{ movement_id: "hold", seconds: 1800 }], options),
  ).toContain("Tutuş");
});
it("shows invalid repetitions and allows unknown capacity without inventing a value", () => {
  expect(
    capacityError([{ movement_id: "pull", reps: 1.5 }], options),
  ).toContain("tam sayı");
  expect(capacityError([{ movement_id: "pull", reps: 0 }], options)).toContain(
    "Barfiks",
  );
  expect(capacityError([{ movement_id: "pull" }], options)).toBe("");
});
