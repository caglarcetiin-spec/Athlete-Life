export type SportReadiness = {
  sport_id: string;
  environment_ready: boolean;
  coach_present: boolean;
  partner_available: boolean;
};
export type SportTrainingProfile = {
  sport_id: string;
  name: string;
  environment: string;
  automatic_physical_dose: boolean;
  adaptation_required: boolean;
  techniques: { key: string; name: string }[];
  practice_label: string;
  movement_count: number;
  source_urls: string[];
};
export type TrainingMethod = { id: string; label: string; description: string };
export const branchMethods = [
  "sport_technique",
  "sport_practice",
  "sport_tactics",
];

export function SportTrainingFields({
  profiles,
  readiness,
  onChange,
}: {
  profiles: SportTrainingProfile[];
  readiness: SportReadiness[];
  onChange: (value: SportReadiness[]) => void;
}) {
  return (
    <section aria-label="Branş çalışma koşulları">
      <h3>Branşına uygun çalışma ortamı</h3>
      <p>
        Ortam ve eğitmen bilgisi her branş için ayrı tutulur. Bir branştaki
        deneyimin başka bir branşta yetkinlik sayılmaz.
      </p>
      {profiles.map((profile) => {
        const row = readiness.find((r) => r.sport_id === profile.sport_id) || {
          sport_id: profile.sport_id,
          environment_ready: false,
          coach_present: false,
          partner_available: false,
        };
        return (
          <fieldset key={profile.sport_id}>
            <legend>{profile.name}</legend>
            {!profile.automatic_physical_dose && (
              <p>
                Bu branşta fiziksel çalışma dozunu{" "}
                {profile.adaptation_required
                  ? "bireysel uyarlamalarını bilen"
                  : "branşın uzmanı olan"}{" "}
                eğitmenle manuel düzenle. AI ile teknik/taktik analiz blokları
                hazırlanabilir.
              </p>
            )}
            {(
              [
                ["environment_ready", profile.environment + " hazır"],
                ["coach_present", "Branş eğitmenim uygulamaya eşlik edecek"],
                ["partner_available", "Gereken partner veya takım mevcut"],
              ] as const
            ).map(([key, label]) => (
              <label className="check" key={key}>
                <input
                  type="checkbox"
                  checked={row[key]}
                  onChange={(e) =>
                    onChange([
                      ...readiness.filter(
                        (r) => r.sport_id !== profile.sport_id,
                      ),
                      { ...row, [key]: e.target.checked },
                    ])
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
        );
      })}
    </section>
  );
}
