import { describe, expect, it } from "vitest";
import { missingSportNotes, unknownSportNotes } from "./sportExperience";

describe("sport experience completion", () => {
  it("requires a nonblank answer for every selected sport", () => {
    expect(missingSportNotes({ sport_ids: ["running", "swimming"] })).toEqual([
      "running",
      "swimming",
    ]);
    expect(
      missingSportNotes({
        sport_ids: ["running", "swimming"],
        sport_experience: [
          { sport_id: "running", known_skills: "30 dk koşu" },
          { sport_id: "swimming", known_skills: " \n\t " },
        ],
      }),
    ).toEqual(["swimming"]);
  });
  it("accepts an explicit unknown without inventing performance", () => {
    expect(
      missingSportNotes({
        sport_ids: ["running"],
        sport_experience: [
          { sport_id: "running", known_skills: unknownSportNotes },
        ],
      }),
    ).toEqual([]);
  });
  it("does not use a different sport's answer or block an unselected sport", () => {
    const sport_experience = [
      { sport_id: "running", known_skills: "30 dk koşu" },
    ];
    expect(
      missingSportNotes({ sport_ids: ["swimming"], sport_experience }),
    ).toEqual(["swimming"]);
    expect(missingSportNotes({ sport_ids: [], sport_experience })).toEqual([]);
    expect(missingSportNotes({})).toEqual([]);
  });
});
