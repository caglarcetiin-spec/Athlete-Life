import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { attachOverlay, classifyBody, namedRegion } from "./bodyOverlay";
import { regions } from "./muscleRecovery";
describe("regional body mapping", () => {
  it("distinguishes named thigh biceps from arm and positional front/back", () => {
    expect(regions[namedRegion("Biceps_femoris_L")]).toBe("hamstrings");
    expect(regions[namedRegion("Latissimus_Dorsi_R")]).toBe("lats");
    expect(regions[classifyBody(0.07, 0.6, -0.03)]).toBe("lats");
    expect(regions[classifyBody(0.03, 0.72, 0.03)]).toBe("chest");
    expect(classifyBody(0, 0.95, 0)).toBe(0);
  });
  it("selects the named surface and restores original materials", () => {
    const original = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), original);
    mesh.name = "Latissimus_Dorsi";
    const overlay = attachOverlay(mesh, new THREE.Box3().setFromObject(mesh));
    expect(overlay.named).toBe(1);
    expect(overlay.pick(new THREE.Vector3(), mesh)).toBe("lats");
    expect(mesh.material).not.toBe(original);
    overlay.dispose();
    expect(mesh.material).toBe(original);
    mesh.geometry.dispose();
    original.dispose();
  });
});

it("maps detailed muscle heads without treating fascia as muscle", () => {
  expect(regions[namedRegion("Clavicular part of deltoid muscle.l")]).toBe(
    "frontDelts",
  );
  expect(regions[namedRegion("Vastus medialis muscle.r")]).toBe("quads");
  expect(namedRegion("Deltoid fascia.l")).toBe(-1);
});
it("isolates every primitive of one atlas structure and restores visibility", () => {
  const model = new THREE.Group();
  const parts = [
    "Vastus medialis muscle.l",
    "Vastus medialis muscle.l",
    "Vastus medialis muscle.r",
  ].map((name) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshStandardMaterial(),
    );
    mesh.userData.za_name = name;
    model.add(mesh);
    return mesh;
  });
  const overlay = attachOverlay(
    model,
    new THREE.Box3().setFromObject(model),
    false,
  );
  overlay.update(
    undefined,
    "quads",
    "load",
    overlay.surfaces[0].id,
    true,
    true,
  );
  expect(parts.map((m) => m.material.visible)).toEqual([true, true, false]);
  expect(overlay.surface(new THREE.Vector3(), parts[1])?.id).toBe(
    overlay.surfaces[0].id,
  );
  overlay.update(undefined, "quads", "load");
  expect(parts.every((m) => m.material.visible)).toBe(true);
  overlay.dispose();
  parts.forEach((m) => {
    m.material.dispose();
    m.geometry.dispose();
  });
});
