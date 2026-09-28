import { describe, expect, it } from "vitest";
import definitions from "../../../api/alos/catalogs/movements.json";
import { catalogGuide, type CatalogMovement } from "./catalogVisuals";
const records = Object.values(definitions) as CatalogMovement[];
const get = (id: string) => records.find((m) => m.id === id)!;
describe("canonical form illustrations", () => {
  it("provides distinct poses for ring L-sit, lever, pull-up and squat", () => {
    const ids = ["ring-l-sit", "front-lever", "pull-up", "bodyweight-squat"];
    expect(
      new Set(ids.map((id) => catalogGuide(get(id))!.poses.join("|"))).size,
    ).toBe(4);
    for (const id of ids) expect(catalogGuide(get(id))?.poses.length).toBe(2);
  });
  it("does not assign a strength form to unknown branch techniques", () => {
    expect(
      catalogGuide({
        ...get("pull-up"),
        id: "sport-unknown",
        name: "Özel teknik",
      }),
    ).toBeUndefined();
    expect(catalogGuide(get("mobility"))).toBeUndefined();
  });
  it("labels family references and keeps phase descriptions readable", () => {
    expect(catalogGuide(get("barbell-squat"))?.visualScope).toMatch(/Örüntü/);
    for (const item of records) {
      const guide = catalogGuide(item);
      if (!guide) continue;
      expect(guide.phases.every((p) => p.length > 3)).toBe(true);
      expect(guide.poses.every((p) => /^[\d]+,[\d]+\|M/.test(p))).toBe(true);
      expect(guide.source).toMatch(/^https:\/\//);
    }
    console.log(
      "Illustrated core catalog:",
      records.filter((m) => catalogGuide(m)).length,
      "/",
      records.length,
    );
  });
});
