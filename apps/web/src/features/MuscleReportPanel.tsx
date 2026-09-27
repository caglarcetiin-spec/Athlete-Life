import { lazy, Suspense, useEffect, useState } from "react";
import { api } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import type { RecordedDistribution } from "./bodyOverlay";
import type { MuscleRecovery } from "./muscleRecovery";
import { today } from "../time";
const BodyModel = lazy(() => import("./BodyModel"));
type Analysis = {
  as_of: string;
  recorded_distribution: RecordedDistribution;
  muscle_recovery: MuscleRecovery;
  muscles: Record<
    string,
    Record<string, { low: number; high: number; unit: string }>
  >;
  readiness: { reasons: string[] };
  coverage: { total_sets: number; analyzed_sets: number };
};
export function MuscleReportPanel({
  store,
  selected,
  onDate,
}: {
  store: SyncStore;
  selected: string;
  onDate: (date: string) => void;
}) {
  const [report, setReport] = useState<Analysis | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [refresh, setRefresh] = useState(0),
    [days, setDays] = useState(7);
  const cursor = store.snapshot?.cursor;
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setRefresh((n) => n + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    let active = true;
    setPending(true);
    void api(`analysis?on=${selected}&window_days=${days}&knowledge=recomputed`)
      .then((value) => {
        if (active) {
          setReport(value as Analysis);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [selected, days, refresh, cursor]);
  return (
    <section>
      <h2>Kas çalışmalarım</h2>
      <p>
        Gerçek setlerin, tutuşların ve kondisyon kayıtların aynı analizden
        okunur. Henüz yapmadığın plan hedefleri bu hesaba girmez.
      </p>
      <label>
        İncelenen dönem
        <select
          aria-label="Kas raporu dönemi"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {[7, 28, 84].map((n) => (
            <option key={n} value={n}>
              Son {n} gün
            </option>
          ))}
        </select>
      </label>
      {report && (
        <p>
          {report.coverage.analyzed_sets} / {report.coverage.total_sets} gerçek
          kayıt eşlendi.
        </p>
      )}
      <Suspense fallback={<p role="status">Kas görünümü hazırlanıyor…</p>}>
        <BodyModel
          store={store}
          recovery={error ? undefined : report?.muscle_recovery}
          distribution={error ? undefined : report?.recorded_distribution}
          exposure={error ? undefined : report?.muscles}
          asOf={report?.as_of}
          context={report?.readiness.reasons}
          frozen={selected !== today()}
          pending={pending}
          error={error}
          onNow={() => {
            onDate(today());
            setRefresh((n) => n + 1);
          }}
        />
      </Suspense>
      <a className="link-button secondary" href={`?date=${selected}#nutrition`}>
        Beslenmemi kaydet
      </a>
    </section>
  );
}
