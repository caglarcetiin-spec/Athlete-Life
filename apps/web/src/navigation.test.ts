import { describe, it, expect } from "vitest";
import { readLocation } from "./navigation";
describe("shared route and date context", () => {
  it("keeps a selected past date across routes", () => {
    expect(
      readLocation(
        new URL("https://example.test/?date=2026-09-10#workout"),
        "2026-09-23",
      ),
    ).toEqual({ route: "workout", selected: "2026-09-10", following: false });
  });
  it("rejects impossible dates without crashing date rendering", () => {
    for (const date of ["2026-02-30", "bad", "2026-13-01"])
      expect(
        readLocation(
          new URL("https://example.test/?date=" + date + "#week"),
          "2026-09-23",
        ),
      ).toEqual({ route: "week", selected: "2026-09-23", following: true });
  });
  it("falls back for unknown route and follows today without an explicit date", () => {
    expect(
      readLocation(new URL("https://example.test/#content"), "2026-09-23"),
    ).toEqual({ route: "today", selected: "2026-09-23", following: true });
  });
});
