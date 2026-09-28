import { expect, it } from "vitest";
import {
  canonical,
  displayed,
  factor,
  formatQuantity,
  measureFor,
} from "./quantities";
import { capacityMaximum } from "./planningCapacity";
it("converts user units once to canonical seconds/metres", () => {
  expect(canonical("30", factor("duration", "min"))).toBe(1800);
  expect(canonical("1,5", factor("duration", "h"))).toBe(5400);
  expect(canonical("5", factor("distance", "km"))).toBe(5000);
  expect(canonical("0,025", 1000)).toBe(25);
});
it("changing display units does not mutate the quantity", () => {
  for (const n of [0, 1.5, 90, 1800, 5400, 86400])
    for (const u of ["s", "min", "h"]) {
      const f = factor("duration", u);
      expect(Number(canonical(displayed(n, f), f))).toBeCloseTo(n, 7);
    }
  expect(displayed("1,5", 60)).toBe("0.025");
});
it("missing values remain missing and invalid syntax is never coerced to zero", () => {
  expect(canonical("", 60)).toBeNull();
  expect(canonical(" ", 60)).toBeNull();
  for (const v of ["abc", "1.000,5", "-2", "Infinity", "1e3"])
    expect(canonical(v, 60)).toBe(v);
  expect(canonical("0", 60)).toBe(0);
});
it("formats durations/distances and keeps repetitions/load distinct", () => {
  expect(formatQuantity(1800, "duration")).toBe("30 dk");
  expect(formatQuantity(5400, "duration")).toBe("1,5 saat");
  expect(formatQuantity(5000, "distance")).toBe("5 km");
  expect(measureFor("reps")).toBeUndefined();
  expect(measureFor("external_kg")).toBeUndefined();
  expect(capacityMaximum({ metric: "seconds", block: "sport_technique" })).toBe(
    86400,
  );
  expect(capacityMaximum({ metric: "seconds", block: "skill" })).toBe(600);
});
it("uses appropriate primary measurements for timed skills, holds, circuits and distance work", async () => {
  const { primaryMetrics } = await import("./quantities");
  expect(primaryMetrics("skill", "mobility")).toEqual(["seconds"]);
  expect(primaryMetrics("skill", "custom-timed", 60, null)).toEqual([
    "seconds",
  ]);
  expect(primaryMetrics("skill", "muscle-up", null, 5)).toEqual([
    "reps",
    "external_kg",
  ]);
  expect(primaryMetrics("isometric", "front-lever")).toEqual(["seconds"]);
  expect(primaryMetrics("circuit", "sport-boxing-practice")).toEqual([
    "seconds",
  ]);
  expect(primaryMetrics("cardio", "zone-2-run")).toEqual([
    "seconds",
    "distance_m",
  ]);
});
