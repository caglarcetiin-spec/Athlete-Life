type SportNotes = {
  sport_ids?: string[];
  sport_experience?: { sport_id: string; known_skills?: string }[];
};

export const unknownSportNotes =
  "Bu branşta henüz teknik veya ölçülmüş performans bilgim yok.";

// An explicit unknown is a valid answer; silence must not imply experience.
export function missingSportNotes(answers: SportNotes): string[] {
  return (answers.sport_ids || []).filter(
    (id) =>
      !answers.sport_experience
        ?.find((s) => s.sport_id === id)
        ?.known_skills?.trim(),
  );
}
