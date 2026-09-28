import { expect, it } from "vitest";
import {
  addBranch,
  removeBranch,
  toggleBranchMethod,
  activeBranches,
  type BranchProfile,
  type Selection,
} from "./branchSelection";
const profile = (
  id: string,
  native?: string,
  automatic = true,
): BranchProfile => ({
  sport_id: id,
  name: id,
  native_method: native,
  automatic_physical_dose: automatic,
  method_options: [],
});
const initial: Selection = {
  sport_ids: [],
  methods: ["weights"],
  sport_methods: {},
};
it("adding cycling replaces implicit weights with its own technique", () => {
  const next = addBranch(initial, profile("road-cycling"));
  expect(next.methods).toEqual(["sport_technique"]);
  expect(next.sport_methods).toEqual({ "road-cycling": ["sport_technique"] });
});
it("selections are independent across cycling and skiing, removal cleans the map", () => {
  let next = addBranch(
    addBranch(initial, profile("road-cycling")),
    profile("alpine-skiing"),
  );
  next = toggleBranchMethod(next, "alpine-skiing", "sport_tactics");
  next = toggleBranchMethod(next, "alpine-skiing", "sport_technique");
  expect(next.sport_methods["road-cycling"]).toEqual(["sport_technique"]);
  expect(next.sport_methods["alpine-skiing"]).toEqual(["sport_tactics"]);
  const removed = removeBranch(next, "road-cycling");
  expect(removed.methods).toEqual(["sport_tactics"]);
  expect(removed.sport_methods["road-cycling"]).toBeUndefined();
});
it("native running stays endurance; adding cycling makes running support explicit", () => {
  const running = addBranch(initial, profile("running", "running"));
  expect(running).toMatchObject({
    methods: ["running"],
    split: "endurance_days",
    sport_methods: { running: [] },
  });
  const mixed = addBranch(running, profile("road-cycling"));
  expect(activeBranches(mixed)).toEqual(["road-cycling"]);
  expect(mixed.methods).toEqual(["running", "sport_technique"]);
});
it("specialist-only branches default to analysis and old choices preserve semantics", () => {
  expect(
    addBranch(initial, profile("ski-jumping", undefined, false)).methods,
  ).toEqual(["sport_tactics"]);
  const old = {
    ...initial,
    sport_ids: ["boxing"],
    methods: ["sport_technique"],
  };
  expect(addBranch(old, profile("road-cycling")).sport_methods.boxing).toEqual([
    "sport_technique",
  ]);
});
