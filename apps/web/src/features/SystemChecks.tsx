import { useEffect, useState } from "react";
import { api } from "../api/contracts";
import type { SyncStore } from "../sync/store";
export function SystemChecks({ store }: { store: SyncStore }) {
  const [connections, setConnections] = useState<
    { id: string; status: string; explanation: string }[]
  >([]);
  const [connectionError, setConnectionError] = useState("");
  useEffect(() => {
    let active = true;
    void api("integrations")
      .then((value) => {
        if (active)
          setConnections(
            (value as { integrations: typeof connections }).integrations,
          );
      })
      .catch(() => {
        if (active)
          setConnectionError("Bağlantı durumu şu anda sunucudan alınamadı.");
      });
    return () => {
      active = false;
    };
  }, []);
  const [result, setResult] = useState<{
      results: {
        name?: string;
        id?: string;
        fixture?: string;
        status: string;
      }[];
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section className="card">
      <h2>Hesaplama kontrolü</h2>
      <p>
        Bu kontrol örnek veriler üzerinde çalışır. Kişisel kayıtlarını okumaz
        veya değiştirmez.
      </p>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = (await api("system/integrity", {
              method: "POST",
              headers: { "X-CSRF-Token": store.me.csrf },
              body: "{}",
            })) as {
              results: {
                name?: string;
                id?: string;
                fixture?: string;
                status: string;
              }[];
            };
            setResult(result);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Kontrol ediliyor…" : "Sistem bütünlüğünü kontrol et"}
      </button>
      {error && <p role="alert">{error}</p>}
      {result && (
        <div role="status">
          <p>
            {result.results.filter((r) => r.status === "PASS").length} /{" "}
            {result.results.length} kontrol geçti.
          </p>
          <ul>
            {result.results.map((r, i) => (
              <li key={i}>
                {r.name || r.id || r.fixture || "Kontrol " + (i + 1)} ·{" "}
                {r.status === "PASS" ? "Geçti" : "İncelenmeli"}
              </li>
            ))}
          </ul>
        </div>
      )}
      <h3>Bağlı hizmetler</h3>
      {connectionError && <p>{connectionError}</p>}
      {connections.map((connection) => (
        <p key={connection.id}>{connection.explanation}</p>
      ))}
    </section>
  );
}
