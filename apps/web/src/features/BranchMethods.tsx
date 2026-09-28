import {
  branchMap,
  supportMethods,
  type BranchProfile,
  type Selection,
} from "./branchSelection";
export function BranchMethods({
  profiles,
  state,
  onBranch,
  onSupport,
}: {
  profiles: BranchProfile[];
  state: Selection;
  onBranch: (sport: string, method: string) => void;
  onSupport: (method: string) => void;
}) {
  const map = branchMap(state);
  const native = new Set(profiles.map((p) => p.native_method).filter(Boolean));
  const card = ([key, label, text]: [string, string, string]) => (
    <button
      type="button"
      key={key}
      className="guided-option secondary"
      aria-pressed={state.methods.includes(key)}
      onClick={() => onSupport(key)}
    >
      <strong>{label}</strong>
      <span>{text}</span>
    </button>
  );
  return (
    <>
      <div aria-live="polite" className="notice">
        {profiles.length
          ? `Yöntemler ${profiles.map((p) => p.name).join(", ")} için güncellendi. Her branşın seçimini ayrı yapabilirsin.`
          : "Branşını eklediğinde yöntemler ona göre değişir. İstersen aşağıdan doğrudan bir çalışma yöntemiyle de başlayabilirsin."}
      </div>
      {profiles.map((p) => (
        <section key={p.sport_id} aria-label={p.name + " çalışma yöntemleri"}>
          <h3>{p.name}</h3>
          <div className="guided-options">
            {p.native_method &&
              supportMethods.filter((m) => m[0] === p.native_method).map(card)}
            {p.method_options.map((m) => (
              <button
                type="button"
                key={m.id}
                className="guided-option secondary"
                aria-pressed={map[p.sport_id]?.includes(m.id) || false}
                disabled={!m.automatic}
                onClick={() => onBranch(p.sport_id, m.id)}
              >
                <strong>{m.label}</strong>
                <span>{m.description}</span>
                {!m.automatic && (
                  <span>Bu çalışma uzmanla manuel planlanır.</span>
                )}
              </button>
            ))}
          </div>
        </section>
      ))}
      {profiles.length > 0 ? (
        <>
          {state.methods.some(
            (m) => supportMethods.some((s) => s[0] === m) && !native.has(m),
          ) && (
            <section aria-label="Seçili destek çalışmaları">
              <h3>Eklediğin destek çalışmaları</h3>
              <div className="guided-options">
                {supportMethods
                  .filter(
                    (m) => state.methods.includes(m[0]) && !native.has(m[0]),
                  )
                  .map(card)}
              </div>
            </section>
          )}
          <details>
            <summary>Başka bir destek çalışması ekle</summary>
            <p>
              Bu çalışmalar seçili branşların yanında, kalan seans süresine göre
              planlanır.
            </p>
            <div className="guided-options">
              {supportMethods
                .filter(
                  (m) => !native.has(m[0]) && !state.methods.includes(m[0]),
                )
                .map(card)}
            </div>
          </details>
        </>
      ) : (
        <div className="guided-options">{supportMethods.map(card)}</div>
      )}
    </>
  );
}
