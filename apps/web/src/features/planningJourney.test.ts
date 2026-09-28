import { describe, expect, it } from "vitest";
import {
  enduranceOnly,
  nextMethods,
  focusOptions,
  runningEquipment,
} from "./planningJourney";
describe("sport-specific planning journey", () => {
  it("running replaces the implicit weights default, explicit mixed training remains possible", () => {
    expect(nextMethods(["weights"], "running")).toEqual({
      methods: ["running"],
      split: "endurance_days",
    });
    expect(nextMethods(["running"], "weights")).toEqual({
      methods: ["running", "weights"],
      split: "full_body",
    });
    expect(enduranceOnly(["running", "conditioning"])).toBe(true);
    expect(enduranceOnly(["running", "weights"])).toBe(false);
  });
  it("offers performance choices instead of body parts for runners and combat athletes", () => {
    expect(focusOptions(["running"], false).map((x) => x[0])).toContain(
      "distance",
    );
    expect(focusOptions(["sport_technique"], true).map((x) => x[0])).toEqual(
      expect.arrayContaining(["footwork", "defence", "round_endurance"]),
    );
    expect(focusOptions(["swimming"], false).map((x) => x[0])).toContain(
      "technique_quality",
    );
    expect(runningEquipment.map((x) => x[0])).toEqual(
      expect.arrayContaining([
        "Road",
        "Track",
        "Trail",
        "Hill",
        "Incline Treadmill",
      ]),
    );
  });
});
