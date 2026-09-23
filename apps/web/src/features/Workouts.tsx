import { useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  Dumbbell,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Plus,
  Trash2,
} from "lucide-react";
import { serverNow, type Entity } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import { displayDate, today } from "../time";
const targetFields = [
  "movement_id",
  "name",
  "variant",
  "modality",
  "equipment",
  "side",
  "load_kind",
  "reps",
  "seconds",
  "distance_m",
  "external_kg",
  "assistance_kg",
  "bodyweight_kg",
  "rir",
  "rpe",
  "rest_seconds",
];
const metrics = [
  ["reps", "Tekrar"],
  ["external_kg", "Ek ağırlık (kg)"],
  ["seconds", "Süre (sn)"],
  ["distance_m", "Mesafe (m)"],
  ["rir", "Yedekte tekrar (RIR)"],
  ["rpe", "Zorluk (RPE)"],
];
function numeric(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") return null;
  if (!/^\d+(?:[.,]\d+)?$/.test(value.trim()))
    throw new Error(
      "Sayı için örneğin 1,5 yazabilirsin. Binlik ayraç kullanma.",
    );
  return Number(value.replace(",", "."));
}
function describe(row: Entity) {
  const range = row.target_range as {
    unit: string;
    minimum: number;
    maximum: number;
  } | null;
  return [
    range
      ? `${range.minimum}–${range.maximum} ${{ reps: "tekrar", seconds: "sn", m: "m" }[range.unit] || range.unit} hedef aralığı`
      : null,
    row.reps ? row.reps + " tekrar" : null,
    row.seconds ? row.seconds + " sn" : null,
    row.distance_m ? row.distance_m + " m" : null,
    row.external_kg != null ? row.external_kg + " kg ek yük" : null,
    row.rir != null ? row.rir + " RIR" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
function SetForm({
  store,
  session,
  slot,
  editing,
  onDone,
}: {
  store: SyncStore;
  session: Entity;
  slot?: Entity;
  editing?: Entity;
  onDone: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [past] = useState(
    String(session.local_date) !== today(store.snapshot?.timezone),
  );
  const [formDraft, setFormDraft] = useState<Record<string, string>>({});
  const key =
    "actual:" + session.id + ":" + (editing?.id || slot?.id || "extra");
  useEffect(() => {
    void store.loadDraft(key).then((v) => v && setFormDraft(v));
  }, [store, key]);
  async function record(
    form: HTMLFormElement,
    status = "completed",
    useTarget = false,
  ) {
    setBusy(true);
    setError("");
    try {
      const data = new FormData(form);
      const source = editing || slot;
      const fields = Object.fromEntries(
        targetFields
          .map((k) => [k, source?.[k]])
          .filter(([, v]) => v !== undefined),
      );
      if (!source) {
        fields.movement_id = String(
          data.get("movement_id") || "custom-" + crypto.randomUUID(),
        );
        fields.name = String(data.get("name"));
        fields.variant = String(data.get("variant") || "standard");
        fields.modality = String(data.get("modality") || "strength");
        fields.load_kind = "external";
      }
      for (const [key] of metrics)
        fields[key] =
          status === "skipped"
            ? null
            : useTarget
              ? (source?.[key] ?? null)
              : numeric(data.get(key));
      const payload = {
        ...fields,
        session_id: session.id,
        slot_id: editing?.slot_id || slot?.id || null,
        status:
          status === "skipped"
            ? "skipped"
            : !slot && !editing
              ? "extra"
              : status,
        note: String(data.get("note") || ""),
        ...(editing
          ? {
              occurred_at: editing.occurred_at,
              time_precision: editing.time_precision,
            }
          : past
            ? {
                local_time: data.get("time") || null,
                occurred_at: null,
                time_precision: data.get("time") ? "exact" : "date_only",
              }
            : {
                occurred_at: new Date(serverNow()).toISOString(),
                time_precision: "exact",
              }),
      };
      await store.enqueue("set.save", editing || null, payload);
      await store.saveDraft(key, null);
      setFormDraft({});
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const source = editing || slot;
  return (
    <form
      className="set-form"
      onSubmit={(e) => {
        e.preventDefault();
        void record(e.currentTarget);
      }}
      onChange={(e) => {
        const data = Object.fromEntries(
          new FormData(e.currentTarget).entries(),
        ) as Record<string, string>;
        setFormDraft(data);
        void store.saveDraft(key, data).catch((e) => setError(e.message));
      }}
    >
      <div className="eyebrow">
        {editing
          ? "Geçmiş kaydı düzenle"
          : slot
            ? "Sıradaki çalışma"
            : "Plan dışı ek çalışma"}
      </div>
      <h2>{String(source?.name || "Hareket ekle")}</h2>
      {slot && (
        <p className="target">
          <strong>Hedef:</strong> {describe(slot)}
          <br />
          <small>
            {String(slot.variant)} ·{" "}
            {String(slot.equipment || "Ekipman belirtilmemiş")}
          </small>
        </p>
      )}
      {!source && (
        <div className="form-grid">
          <label className="wide">
            Hareket adı
            <input
              name="name"
              required
              value={formDraft.name || ""}
              onChange={() => {}}
            />
          </label>
          <label>
            Varyasyon / koşul
            <input
              name="variant"
              value={formDraft.variant || "standard"}
              onChange={() => {}}
            />
          </label>
          <label>
            Çalışma türü
            <select
              name="modality"
              value={formDraft.modality || "strength"}
              onChange={() => {}}
            >
              <option value="strength">Hareket / set</option>
              <option value="isometric">Sabit tutuş</option>
              <option value="cardio">Süre / mesafe</option>
              <option value="skill">Teknik deneme</option>
              <option value="circuit">Tur / istasyon</option>
            </select>
          </label>
        </div>
      )}
      <div className="form-grid">
        {metrics.map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              name={key}
              inputMode={key === "reps" ? "numeric" : "decimal"}
              value={
                formDraft[key] ??
                (editing?.[key] != null ? String(editing[key]) : "")
              }
              onChange={() => {}}
              placeholder={
                slot?.[key] != null
                  ? "Hedef: " + String(slot[key])
                  : "İsteğe bağlı"
              }
            />
          </label>
        ))}
        {past && !editing && (
          <label>
            Gerçek saat (isteğe bağlı)
            <input
              name="time"
              type="time"
              value={formDraft.time || ""}
              onChange={() => {}}
            />
            <small>{String(session.timezone)}; boşsa yalnız tarih kaydı.</small>
          </label>
        )}
        <label className="wide">
          Not
          <input
            name="note"
            maxLength={1000}
            value={formDraft.note ?? String(editing?.note || "")}
            onChange={() => {}}
          />
        </label>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button disabled={busy} type="submit">
          <Check size={19} />
          {editing ? "Düzeltmeyi kaydet" : "Gerçek seti kaydet"}
        </button>
        {slot && !editing && (
          <>
            {Boolean(slot.reps || slot.seconds || slot.distance_m) && (
              <button
                className="secondary"
                type="button"
                disabled={busy}
                onClick={(e) =>
                  void record(e.currentTarget.form!, "completed", true)
                }
              >
                Hedefi aynen tamamladım
              </button>
            )}
            <button
              className="text-button"
              type="button"
              disabled={busy}
              onClick={(e) => void record(e.currentTarget.form!, "skipped")}
            >
              <SkipForward size={16} />
              Bu seti atla
            </button>
          </>
        )}
      </div>
    </form>
  );
}
export function Workouts({
  store,
  selected,
  onDate,
  onPlan,
}: {
  store: SyncStore;
  selected: string;
  onDate: (d: string) => void;
  onPlan: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(
    new URLSearchParams(location.search).get("session"),
  );
  const [error, setError] = useState("");
  const [extra, setExtra] = useState(false);
  const [editing, setEditing] = useState<Entity | undefined>();
  const [clock, setClock] = useState(serverNow());
  const [manualTitle, setManualTitle] = useState("Serbest antrenman");
  useEffect(() => {
    const timer = setInterval(() => setClock(serverNow()), 500);
    return () => clearInterval(timer);
  }, []);
  const sessions = store.view("session");
  const active = sessions.find((s) => s.id === sessionId);
  const prescriptions = store.view("prescription");
  const slots = store
    .view("slot")
    .filter((s) => s.prescription_id === active?.prescription_id)
    .sort((a, b) => Number(a.ordinal) - Number(b.ordinal));
  const actuals = store
    .view("set")
    .filter((s) => s.session_id === active?.id)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  const next = slots.find((s) => !actuals.some((a) => a.slot_id === s.id));
  const programs = store.view("program").filter((p) => p.status === "active");
  const weekday = (new Date(selected + "T12:00:00Z").getUTCDay() + 6) % 7;
  const days = store.view("program_day").filter(
    (d) =>
      d.weekday === weekday &&
      programs.some((p) => {
        const week =
          Math.floor(
            (Date.parse(selected + "T12:00:00Z") -
              Date.parse(String(p.start_date) + "T12:00:00Z")) /
              604800000,
          ) + 1;
        return (
          p.id === d.program_id &&
          week >= Number(d.first_week || 1) &&
          week <= Number(d.last_week || p.weeks)
        );
      }),
  );
  const pendingSession = store.pending.some(
    (p) => p.command.entity_id === active?.id,
  );
  const remaining =
    active?.timer_remaining_ms != null
      ? Number(active.timer_remaining_ms)
      : active?.timer_deadline
        ? Math.max(0, Date.parse(String(active.timer_deadline)) - clock)
        : 0;
  function choose(id: string) {
    setSessionId(id);
    setEditing(undefined);
    setExtra(false);
    history.replaceState(
      null,
      "",
      "?date=" + selected + "&session=" + id + "#workout",
    );
  }
  async function open(prescription?: Entity) {
    try {
      const id = await store.enqueue("session.open", null, {
        prescription_id: prescription?.id || null,
        local_date: selected,
        title: prescription?.title || manualTitle,
      });
      choose(id);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function action(type: string, payload: Record<string, unknown>) {
    if (!active) return;
    try {
      await store.enqueue(type, active, payload);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Planını hayata geçir</span>
          <h1>Antrenman</h1>
          <p>
            Hedef ve gerçek performans ayrı saklanır. Yaptığın her set kendi
            seansına bağlı kalır.
          </p>
        </div>
        <Dumbbell className="heading-icon" />
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="toolbar">
        <label>
          Seçili tarih
          <input
            type="date"
            value={selected}
            onChange={(e) => e.target.value && onDate(e.target.value)}
          />
        </label>
        <button className="secondary" onClick={onPlan}>
          Programımı düzenle
        </button>
      </div>
      {active && (
        <section className="card runner">
          <div className="runner-heading">
            <div>
              <span className="eyebrow">
                {active.status === "ready"
                  ? "Henüz başlamadın"
                  : active.status === "completed"
                    ? "Tamamlanmış seans"
                    : active.status === "paused"
                      ? "Moladasın"
                      : "Seansın"}
              </span>
              <h2>{String(active.title)}</h2>
              <p>
                {displayDate(String(active.local_date), true)} ·{" "}
                {String(active.timezone)}
              </p>
            </div>
            <button
              className="secondary small"
              onClick={() => {
                setSessionId(null);
                history.replaceState(
                  null,
                  "",
                  "?date=" + selected + "#workout",
                );
              }}
            >
              Seans listesini göster
            </button>
          </div>
          {String(active.local_date) !== selected && (
            <p className="notice">
              Açık seansın {displayDate(String(active.local_date))} tarihine
              ait. Seçili gün değişti diye bu seansı taşımadık.
            </p>
          )}
          {active.status === "ready" &&
            active.local_date === today(store.snapshot?.timezone) &&
            !active.local_pending && (
              <button
                disabled={pendingSession}
                onClick={() =>
                  void action("session.begin", { slot_id: next?.id || null })
                }
              >
                <Play size={18} />
                İlk sete başla
              </button>
            )}
          <div className="runner-progress">
            <strong>
              {actuals.filter((a) => a.status !== "skipped").length}
            </strong>
            <span>gerçek set · {slots.length} planlanan slot</span>
            <progress
              value={actuals.filter((a) => a.slot_id).length}
              max={Math.max(1, slots.length)}
              aria-label="Planlanan set ilerlemesi"
            />
          </div>
          {active.status === "active" || active.status === "paused" ? (
            <div className="timer">
              <span role="timer" aria-label="Dinlenme süresi">
                {Math.floor(remaining / 60000)
                  .toString()
                  .padStart(2, "0")}
                :
                {Math.floor((remaining / 1000) % 60)
                  .toString()
                  .padStart(2, "0")}
              </span>
              <div className="actions">
                <button
                  className="secondary small"
                  disabled={pendingSession}
                  onClick={() =>
                    void action("session.timer", {
                      action: "start",
                      seconds: Number(next?.rest_seconds ?? 90),
                    })
                  }
                >
                  <Play size={16} />
                  Dinlenmeyi başlat
                </button>
                <button
                  className="secondary small"
                  disabled={pendingSession}
                  onClick={() =>
                    void action("session.timer", {
                      action:
                        active.timer_remaining_ms != null ? "resume" : "pause",
                    })
                  }
                >
                  <Pause size={16} />
                  {active.timer_remaining_ms != null
                    ? "Sayacı sürdür"
                    : "Sayacı duraklat"}
                </button>
                <button
                  className="text-button"
                  disabled={pendingSession}
                  onClick={() =>
                    void action("session.timer", { action: "reset" })
                  }
                >
                  <RotateCcw size={16} />
                  Süreyi sıfırla
                </button>
              </div>
            </div>
          ) : null}
          {!active.local_pending &&
          (editing ||
            (active.status !== "completed" && active.status !== "abandoned")) &&
          (editing || extra || next || !slots.length) ? (
            <SetForm
              key={
                editing?.id || extra
                  ? "extra-" + (editing?.id || "new")
                  : next?.id || "manual"
              }
              store={store}
              session={active}
              slot={!extra && !editing ? next : undefined}
              editing={editing}
              onDone={() => {
                setEditing(undefined);
                setExtra(false);
              }}
            />
          ) : active.local_pending ? (
            <p>Seans açılışı eşitleniyor…</p>
          ) : (
            <p>
              {next
                ? "Geçmiş setleri aşağıdan düzenleyebilirsin."
                : "Planlanan bütün slotlar kayıtlı. İstersen seansı tamamla."}
            </p>
          )}
          <div className="actions">
            {active.status !== "abandoned" && active.status !== "completed" && (
              <button className="secondary" onClick={() => setExtra(true)}>
                <Plus size={17} />
                Plan dışı set ekle
              </button>
            )}
            {(active.status === "active" || active.status === "paused") && (
              <>
                <button
                  disabled={pendingSession || store.pending.length > 0}
                  onClick={() =>
                    void action("session.transition", { status: "completed" })
                  }
                >
                  Seansı tamamla
                </button>
                <button
                  className="text-button"
                  disabled={pendingSession}
                  onClick={() =>
                    void action("session.transition", {
                      status: active.status === "active" ? "paused" : "active",
                    })
                  }
                >
                  {active.status === "active"
                    ? "Seansa mola ver"
                    : "Seansa devam et"}
                </button>
              </>
            )}
          </div>
          <h3 className="subheading">Kaydettiğin setler</h3>
          {actuals.map((a) => (
            <div className="record-row" key={a.id}>
              <div>
                <strong>{String(a.name)}</strong>
                <span>
                  {a.status === "skipped"
                    ? "Atlandı; gerçek yük sayılmaz"
                    : describe(a)}
                </span>
                <small>
                  {a.local_pending
                    ? "Cihazda · onay bekliyor"
                    : a.time_precision === "date_only"
                      ? "Yalnız tarih biliniyor"
                      : "Kaydedildi"}
                </small>
              </div>
              <div className="actions">
                <button
                  className="text-button"
                  disabled={Boolean(a.local_pending)}
                  onClick={() => {
                    setEditing(a);
                    setExtra(false);
                  }}
                >
                  Düzenle
                </button>
                <button
                  className="icon"
                  aria-label={String(a.name) + " setini sil"}
                  disabled={Boolean(a.local_pending)}
                  onClick={() =>
                    void store
                      .enqueue("set.delete", a, {})
                      .catch((e) => setError(e.message))
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
      {!active && (
        <>
          <section className="card">
            <h2>{displayDate(selected)} planı</h2>
            {days.map((day) => {
              const prescription = prescriptions.find(
                (p) => p.day_id === day.id && p.scheduled_date === selected,
              );
              return (
                <div className="record-row" key={day.id}>
                  <div>
                    <strong>{String(day.label)}</strong>
                    <p>
                      {day.kind === "rest"
                        ? "Dinlenme günü"
                        : "Ana programından"}
                    </p>
                  </div>
                  {day.kind === "training" &&
                    (prescription ? (
                      <button onClick={() => void open(prescription)}>
                        Yeni seans aç
                        <ChevronRight size={17} />
                      </button>
                    ) : (
                      <button
                        disabled={store.pending.length > 0}
                        onClick={() =>
                          void store
                            .enqueue("prescription.materialize", null, {
                              program_id: day.program_id,
                              day_id: day.id,
                              scheduled_date: selected,
                            })
                            .catch((e) => setError(e.message))
                        }
                      >
                        Günün reçetesini hazırla
                      </button>
                    ))}
                </div>
              );
            })}
            {!days.length && (
              <p>
                Bu tarihte ana planına ait çalışma yok. Serbest seans
                kaydedebilir veya program oluşturabilirsin.
              </p>
            )}
          </section>
          <section className="card">
            <h2>Plan dışı / geçmiş seans</h2>
            <p>
              Tarih: {displayDate(selected)}. Aynı gün birden fazla seans
              açabilirsin.
            </p>
            <label>
              Seans adı
              <input
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
              />
            </label>
            <button className="secondary" onClick={() => void open()}>
              Serbest seans aç
            </button>
          </section>
        </>
      )}
      <section className="card">
        <h2>Seans geçmişim</h2>
        {[...sessions]
          .sort((a, b) =>
            String(b.local_date).localeCompare(String(a.local_date)),
          )
          .map((s) => (
            <div className="record-row" key={s.id}>
              <div>
                <strong>{String(s.title)}</strong>
                <span>
                  {displayDate(String(s.local_date))} ·{" "}
                  {{
                    ready: "Başlamadı",
                    active: "Devam ediyor",
                    paused: "Molada",
                    completed: "Tamamlandı",
                    abandoned: "Bırakıldı",
                  }[String(s.status)] || "Eşitleme bekliyor"}
                </span>
              </div>
              <div className="actions">
                <button
                  className="secondary small"
                  onClick={() => choose(s.id)}
                >
                  Aç
                </button>
                <button
                  className="icon"
                  aria-label={String(s.title) + " seansını sil"}
                  onClick={() => {
                    if (
                      confirm(
                        "Seans ve setlerini silmek istiyor musun? Değişiklik geçmişi yedeğinde korunur.",
                      )
                    )
                      void store
                        .enqueue("session.delete", s, {})
                        .then(() => {
                          if (sessionId === s.id) setSessionId(null);
                        })
                        .catch((e) => setError(e.message));
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        {!sessions.length && <p>Henüz gerçek seans kaydı yok.</p>}
      </section>
    </>
  );
}
