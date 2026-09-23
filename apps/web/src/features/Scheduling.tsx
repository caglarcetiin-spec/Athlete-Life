import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import type { Entity } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import { addDays, displayDate, weekOf } from "../time";
const str = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;
const num = (v: unknown, fallback: number) =>
  typeof v === "number" ? v : fallback;
function ShiftDay({
  day,
  row,
  store,
}: {
  day: string;
  row: Entity | undefined;
  store: SyncStore;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [error, setError] = useState("");
  useEffect(() => {
    setDraft({});
  }, [row?.version, day]);
  const value = (key: string, fallback: unknown) =>
    draft[key] ?? row?.[key] ?? fallback;
  const dirty = Object.keys(draft).length > 0;
  const pending = store.pending.some((p) => p.command.entity_id === row?.id);
  const change = (key: string, value: unknown) => {
    setError("");
    setDraft((d) => ({ ...d, [key]: value }));
  };
  async function save() {
    if (!dirty) return;
    try {
      await store.enqueue("shift.save", row || null, {
        ...(!row ? { local_date: day } : {}),
        ...draft,
      });
      setDraft({});
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <article
      onBlur={(e) => {
        if (
          !e.currentTarget.contains(e.relatedTarget) &&
          dirty &&
          !pending &&
          (value("status", "off") !== "work" ||
            (value("start_local", "") && value("end_local", "")))
        )
          void save();
      }}
      className={"shift-day " + (pending ? "pending" : "")}
    >
      <div className="day-title">
        <h2>{displayDate(day, true)}</h2>
        {row?.pinned === true && (
          <LockKeyhole size={16} aria-label="Sabit gün" />
        )}
        <span className="eyebrow">
          {dirty
            ? "Düzenleniyor"
            : pending
              ? "Cihazda · bekliyor"
              : row
                ? "Sunucuda"
                : "Henüz girilmedi"}
        </span>
      </div>
      <div className="form-grid">
        <label>
          Gün türü
          <select
            value={str(value("status", "off"))}
            onChange={(e) => change("status", e.target.value)}
            disabled={pending}
          >
            <option value="off">Dinlenme / izin</option>
            <option value="work">Çalışma</option>
            <option value="annual">Yıllık izin</option>
          </select>
        </label>
        {value("status", "off") === "work" && (
          <>
            <label>
              Başlangıç
              <input
                type="time"
                value={str(value("start_local", ""))}
                onChange={(e) => change("start_local", e.target.value)}
                disabled={pending}
              />
            </label>
            <label>
              Bitiş
              <input
                type="time"
                value={str(value("end_local", ""))}
                onChange={(e) => change("end_local", e.target.value)}
                disabled={pending}
              />
            </label>
          </>
        )}
        <label className="wide">
          Sosyal plan / not
          <input
            value={str(value("social", ""))}
            maxLength={500}
            onChange={(e) => change("social", e.target.value)}
            placeholder="İstersen ekle"
            disabled={pending}
          />
        </label>
      </div>
      <details>
        <summary>Ulaşım, hazırlık ve uyku hedefi</summary>
        <div className="form-grid">
          {[
            ["commute_min", "Ulaşım (dk)", 30],
            ["prep_min", "Hazırlık (dk)", 30],
            ["sleep_target_min", "Uyku hedefi (dk)", 480],
          ].map(([key, label, fallback]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                min={key === "sleep_target_min" ? 60 : 0}
                max={key === "sleep_target_min" ? 1440 : 720}
                value={num(value(String(key), fallback), Number(fallback))}
                onChange={(e) => change(String(key), Number(e.target.value))}
                disabled={pending}
              />
            </label>
          ))}
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={Boolean(value("pinned", false))}
            onChange={(e) => change("pinned", e.target.checked)}
            disabled={pending}
          />
          Bu günü sabitle
        </label>
      </details>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button
        className="secondary small"
        onClick={() => void save()}
        disabled={!dirty || pending}
      >
        <Check size={16} />
        {dirty
          ? "Değişiklikleri kaydet"
          : row
            ? "Kaydedildi"
            : "Bir alanı düzenle"}
      </button>
    </article>
  );
}
export function Scheduling({
  store,
  selected,
  onDate,
}: {
  store: SyncStore;
  selected: string;
  onDate: (s: string) => void;
}) {
  const start = weekOf(selected, store.snapshot?.week_start);
  const [error, setError] = useState("");
  const shifts = store.view("shift");
  const proposals = store
    .view("optimization")
    .filter((o) => o.week_start === start)
    .sort((a, b) => str(b.created_at).localeCompare(str(a.created_at)));
  async function optimize() {
    try {
      await store.enqueue("optimization.propose", null, {
        week_start: start,
        input_cursor: store.snapshot?.cursor,
      });
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Zamanını kendine ayır</span>
          <h1>Haftam</h1>
          <p>
            Önce vardiyanı kaydet. Ardından sana uygun zamanları birlikte
            bulalım.
          </p>
        </div>
        <CalendarDays className="heading-icon" />
      </div>
      <div className="toolbar">
        <button
          className="icon"
          aria-label="Önceki hafta"
          onClick={() => onDate(addDays(start, -7))}
        >
          <ArrowLeft />
        </button>
        <label>
          Haftayı seç
          <input
            type="date"
            value={selected}
            onChange={(e) => e.target.value && onDate(e.target.value)}
          />
        </label>
        <button
          className="icon"
          aria-label="Sonraki hafta"
          onClick={() => onDate(addDays(start, 7))}
        >
          <ArrowRight />
        </button>
        <span>
          {displayDate(start)} — {displayDate(addDays(start, 6))}
        </span>
      </div>
      <div className="split">
        <section aria-label="Haftalık vardiyalar">
          {Array.from({ length: 7 }, (_, i) => {
            const day = addDays(start, i);
            return (
              <ShiftDay
                key={day}
                day={day}
                row={shifts.find((s) => s.local_date === day)}
                store={store}
              />
            );
          })}
        </section>
        <aside aria-label="Haftalık zaman önerileri">
          <div className="card sticky">
            <span className="eyebrow">Haftanın ritmi</span>
            <h2>Uygun zamanlar</h2>
            <p>
              Vardiya kaydı ve zaman önerisi ayrı işlemlerdir. Bir öneriyi ancak
              sen onaylarsan plana alırız.
            </p>
            <button
              disabled={store.pending.length > 0 || !store.snapshot}
              onClick={() => void optimize()}
            >
              <Sparkles size={18} />
              Haftayı değerlendir
            </button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            {proposals.map((o) => (
              <div className="proposal" key={o.id}>
                <h3>
                  {o.status === "accepted"
                    ? "Onayladığın plan"
                    : o.status === "stale"
                      ? "Vardiya değişti · yeniden değerlendir"
                      : "Zaman önerisi"}
                </h3>
                {Array.isArray(o.items) &&
                  o.items.map((item: Record<string, unknown>) => (
                    <div className="proposal-day" key={str(item.local_date)}>
                      <strong>{displayDate(str(item.local_date), true)}</strong>
                      <span>
                        <Clock size={14} />
                        {str(item.window, "Belirlenmedi")}
                      </span>
                      <small>{str(item.reason)}</small>
                    </div>
                  ))}
                {o.status === "proposed" && (
                  <button
                    className="secondary"
                    onClick={() =>
                      void store
                        .enqueue("optimization.accept", o, {})
                        .catch((e) => setError(e.message))
                    }
                  >
                    Bu öneriyi onayla
                  </button>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}
