import { expect, it } from "vitest";
import { plannedDays } from "./workoutProgress";
const program = {
  id: "p",
  version: 1,
  status: "active",
  start_date: "2026-09-16",
  weeks: 4,
};
const days = [
  {
    id: "d",
    version: 1,
    program_id: "p",
    weekday: 0,
    first_week: 2,
    last_week: 3,
  },
];
it("matches period weeks anchored to the exact start date, not calendar week numbers", () => {
  expect(plannedDays("2026-09-21", [program], days)).toEqual([]);
  expect(plannedDays("2026-09-28", [program], days)).toEqual(days);
  expect(plannedDays("2026-10-05", [program], days)).toEqual(days);
  expect(plannedDays("2026-10-12", [program], days)).toEqual([]);
  expect(
    plannedDays("2026-09-28", [{ ...program, status: "archived" }], days),
  ).toEqual([]);
  expect(
    plannedDays("2026-10-19", [program], [{ ...days[0], last_week: 52 }]),
  ).toEqual([]);
});
