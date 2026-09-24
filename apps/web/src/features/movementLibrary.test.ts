import { describe, expect, it } from "vitest";
import { findMovement, movements } from "./movementLibrary";
describe("movement illustration matching", () => {
  it("matches explicit Turkish/English aliases without guessing variants", () => {
    expect(findMovement(" Şınav ")?.id).toBe("pushup");
    expect(findMovement("push-up")?.id).toBe("pushup");
    expect(findMovement("squat", "weighted")).toBeUndefined();
    expect(findMovement("Bulgarian split squat")).toBeUndefined();
    expect(findMovement("side plank")).toBeUndefined();
    expect(findMovement("custom technique")).toBeUndefined();
  });
  it("keeps accessible descriptions, two phases, and sources for each illustration", () => {
    for (const movement of movements) {
      expect(movement.poses).toHaveLength(2);
      expect(movement.phases).toHaveLength(2);
      expect(movement.muscles.length).toBeGreaterThan(4);
      expect(movement.source).toMatch(/^https:\/\/www.acefitness.org\//);
    }
  });
});
