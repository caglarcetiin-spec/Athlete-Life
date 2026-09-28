import { focusOptions } from "./planningJourney";
export function PerformanceFocus({
  methods,
  combat,
  value,
  onChange,
}: {
  methods: string[];
  combat: boolean;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const options = focusOptions(methods, combat);
  return (
    <section aria-label="Performans öncelikleri">
      <p>
        {methods.includes("running")
          ? "Koşuda önceliğini mesafe, rahat sürdürebildiğin süre ve tempoya göre belirle. Kas bölgeleri yalnız ek kuvvet çalışmasının hedefi olabilir."
          : combat
            ? "Branş performansı için teknik, ayak çalışması, savunma ve raunt hedeflerini seç. Kas bölgesi seçimi bunların yerine geçmez."
            : "Branş performansında hangi becerilerini ve çalışma düzenini geliştirmek istediğini seç."}
      </p>
      <p>
        En fazla üç öncelik seçebilirsin; seçimler plan taslağına aktarılır.
      </p>
      <div className="guided-options">
        {options.map(([id, label]) => (
          <button
            type="button"
            className="guided-option secondary"
            key={id}
            aria-pressed={value.includes(id)}
            disabled={!value.includes(id) && value.length >= 3}
            onClick={() =>
              onChange(
                value.includes(id)
                  ? value.filter((v) => v !== id)
                  : [...value, id],
              )
            }
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
