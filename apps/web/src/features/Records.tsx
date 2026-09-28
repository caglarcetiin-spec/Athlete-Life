import { QuantityInput } from "./QuantityInput";
import { measureFor } from "./quantities";
import { useState, useId, useEffect, type ReactNode } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import type { Entity } from "../api/contracts";
import type { SyncStore } from "../sync/store";
export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "decimal"
    | "integer"
    | "date"
    | "time"
    | "textarea"
    | "select"
    | "checkbox";
  required?: boolean;
  options?: [string, string][];
  value?: unknown;
  hint?: string;
  min?: number;
  max?: number;
  positive?: boolean;
  onChange?: (value: string) => Record<string, string>;
};
export function RecordForm({
  fields,
  initial,
  submitLabel = "Kaydı sakla",
  onSave,
  onCancel,
  children,
  draft,
}: {
  fields: Field[];
  initial?: Record<string, unknown>;
  submitLabel?: string;
  onSave: (values: Record<string, unknown>) => Promise<unknown>;
  onCancel?: () => void;
  children?: ReactNode;
  draft?: { store: SyncStore; key: string };
}) {
  const formId = useId();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [loaded, setLoaded] = useState(!draft),
    [savedDraft, setSavedDraft] = useState<Record<string, unknown> | null>(
      null,
    ),
    [draftNotice, setDraftNotice] = useState("");
  const [unitNotice, setUnitNotice] = useState("");
  useEffect(() => {
    if (!draft) return;
    let active = true;
    void draft.store
      .loadDraft(draft.key)
      .then((value) => {
        if (active) {
          if (value) {
            setSavedDraft(value);
            setDraftNotice(
              "Yarım kalan formun bu cihazdan geri açıldı. Henüz tamamlanmış kayıt değildir.",
            );
          }
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [draft?.store, draft?.key]);
  function rawValues(form: HTMLFormElement) {
    const data = new FormData(form);
    return Object.fromEntries(
      fields.map((field) => [
        field.key,
        field.type === "checkbox"
          ? data.get(field.key) === "on"
          : (data.get(field.key) ?? ""),
      ]),
    );
  }
  if (!loaded) return <p role="status">Form taslağı açılıyor…</p>;
  return (
    <form
      className="record-form"
      onChange={(e) => {
        const changed = e.target as unknown as HTMLInputElement;
        const updates = fields
          .find((f) => f.key === changed.name)
          ?.onChange?.(changed.value);
        if (updates) {
          for (const [key, value] of Object.entries(updates)) {
            const input = e.currentTarget.elements.namedItem(
              key,
            ) as HTMLInputElement | null;
            if (input) input.value = value;
          }
          setUnitNotice(
            "Ölçüm değişti; birim yenilendi. Değeri yeni birimle tekrar gir.",
          );
        }
        if (draft) {
          const values = rawValues(e.currentTarget);
          setDraftNotice("Form taslağı cihaza yazılıyor…");
          void draft.store
            .saveDraft(draft.key, values)
            .then(() =>
              setDraftNotice(
                "Form taslağı bu cihazda korundu; kaydı tamamlamak için Kaydı sakla.",
              ),
            )
            .catch((e) => setError(e.message));
        }
      }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const f = new FormData(e.currentTarget),
          values: Record<string, unknown> = {};
        try {
          for (const field of fields) {
            const raw = f.get(field.key);
            if (field.type === "checkbox") values[field.key] = raw === "on";
            else if (raw === "")
              values[field.key] = [
                "decimal",
                "integer",
                "date",
                "time",
                "select",
              ].includes(field.type || "")
                ? null
                : "";
            else if (["integer", "decimal"].includes(field.type || "")) {
              const value = String(raw).trim();
              if (!/^-?\d+(?:[.,]\d+)?$/.test(value))
                throw new Error(
                  field.label + ": Geçerli sayı gir; binlik ayraç kullanma.",
                );
              const number = Number(value.replace(",", "."));
              if (
                !Number.isFinite(number) ||
                (field.type === "integer" && !Number.isInteger(number)) ||
                (field.min != null && number < field.min) ||
                (field.max != null && number > field.max) ||
                (field.positive && number <= 0)
              )
                throw new Error(
                  field.label + ": Değer izin verilen aralıkta olmalı.",
                );
              values[field.key] = number;
            } else values[field.key] = raw;
          }
        } catch (e) {
          setError((e as Error).message);
          return;
        }
        setBusy(true);
        setError("");
        try {
          await onSave(values);
          if (draft) {
            await draft.store.saveDraft(draft.key, null);
            setDraftNotice("");
          }
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        {fields.map((field) => {
          const v =
            savedDraft?.[field.key] ??
            initial?.[field.key] ??
            field.value ??
            "";
          const props = {
            name: field.key,
            required: field.required,
            defaultValue: String(v),
            "aria-label": field.label,
            "aria-describedby": field.hint ? formId + field.key : undefined,
          };
          if (measureFor(field.key))
            return (
              <QuantityInput
                key={field.key}
                name={field.key}
                label={field.label.replace(/ \(saniye\)| \(sn\)| \(m\)/g, "")}
                kind={measureFor(field.key)!}
                defaultUnit={
                  field.key === "duration_seconds" ? "min" : undefined
                }
                defaultValue={String(v)}
                required={field.required}
              />
            );
          return (
            <label
              key={field.key}
              className={
                field.type === "textarea"
                  ? "wide"
                  : field.type === "checkbox"
                    ? "check"
                    : ""
              }
            >
              {field.type === "checkbox" ? (
                <>
                  <input
                    name={field.key}
                    type="checkbox"
                    defaultChecked={Boolean(v)}
                  />
                  {field.label}
                </>
              ) : (
                <>
                  {field.label}
                  {field.type === "select" ? (
                    <select {...props}>
                      {!field.required && (
                        <option value="">Belirtilmedi</option>
                      )}
                      {field.options?.map(([id, name]) => (
                        <option value={id} key={id}>
                          {name}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea {...props} rows={3} />
                  ) : (
                    <input
                      {...props}
                      type={
                        field.type === "date" || field.type === "time"
                          ? field.type
                          : "text"
                      }
                      inputMode={
                        field.type === "decimal"
                          ? "decimal"
                          : field.type === "integer"
                            ? "numeric"
                            : undefined
                      }
                      pattern={field.type === "integer" ? "[0-9]*" : undefined}
                      maxLength={
                        field.type === "decimal"
                          ? 20
                          : field.type === "text"
                            ? 150
                            : undefined
                      }
                    />
                  )}
                </>
              )}
              {field.hint && (
                <small id={formId + field.key}>{field.hint}</small>
              )}
            </label>
          );
        })}
      </div>
      {children}
      {draftNotice && (
        <p className="caption" role="status">
          {draftNotice}
        </p>
      )}
      {unitNotice && <p role="status">{unitNotice}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="actions">
        <button disabled={busy}>
          <Check size={17} />
          {busy ? "Cihaza yazılıyor…" : submitLabel}
        </button>
        {onCancel && (
          <button
            className="secondary"
            type="button"
            onClick={() => {
              if (draft) void draft.store.saveDraft(draft.key, null);
              onCancel();
            }}
          >
            <X size={17} />
            Vazgeç
          </button>
        )}
      </div>
      <small>Sunucu onayı üstteki eşitleme alanında görünür.</small>
    </form>
  );
}
export function RecordList({
  store,
  kind,
  title,
  fields,
  rows,
  describe,
  initial,
  getInitial,
  mapSave,
  children,
}: {
  store: SyncStore;
  kind: string;
  title: string;
  fields: Field[];
  rows?: Entity[];
  describe: (r: Entity) => ReactNode;
  initial?: Record<string, unknown>;
  getInitial?: (r: Entity) => Record<string, unknown>;
  mapSave?: (
    values: Record<string, unknown>,
    current: Entity | null,
  ) => Record<string, unknown>;
  children?: ReactNode;
}) {
  const [edit, setEdit] = useState<Entity | null | undefined>(),
    [removing, setRemoving] = useState<string>(),
    [error, setError] = useState("");
  const data = rows ?? store.view(kind);
  return (
    <section className="card record-section">
      <div className="section-heading compact-row">
        <h2>{title}</h2>
        <button className="secondary small" onClick={() => setEdit(null)}>
          <Plus size={17} />
          Ekle
        </button>
      </div>
      {children}
      {edit !== undefined && (
        <RecordForm
          key={edit?.id || "new"}
          draft={{
            store,
            key:
              "record-form:" + kind + ":" + title + ":" + (edit?.id || "new"),
          }}
          fields={fields}
          initial={edit ? (getInitial ? getInitial(edit) : edit) : initial}
          onCancel={() => setEdit(undefined)}
          onSave={async (values) => {
            await store.enqueue(
              kind + ".save",
              edit,
              mapSave ? mapSave(values, edit) : values,
            );
            setEdit(undefined);
          }}
        />
      )}
      {!data.length && edit === undefined && (
        <p className="empty-state">
          Henüz kayıt yok. Bir kayıt ekleyerek başlayabilirsin.
        </p>
      )}
      {data.map((r) => (
        <article key={r.id} className="record-row">
          <div>
            {describe(r)}
            {Boolean(r.local_pending) && (
              <small>
                {r.local_state === "failed"
                  ? "Kaydedilmedi: " +
                    String(r.local_error) +
                    " — Düzenleyip yeniden gönder."
                  : "Sunucu onayı bekliyor"}
              </small>
            )}
          </div>
          <div className="record-actions">
            <button
              className="icon"
              aria-label={title + " kaydını düzenle"}
              disabled={Boolean(r.local_pending) && r.local_state !== "failed"}
              onClick={() => setEdit(r)}
            >
              <Pencil size={16} />
            </button>
            <button
              className="icon"
              aria-label={title + " kaydını sil"}
              disabled={Boolean(r.local_pending)}
              onClick={() => setRemoving(r.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
          {removing === r.id && (
            <div className="inline-confirm">
              <p>
                Bu kayıt güncel hesaplamalardan kaldırılacak. İşlem geçmişi
                yedekte korunur.
              </p>
              <button
                className="secondary small"
                onClick={() => setRemoving(undefined)}
              >
                Vazgeç
              </button>
              <button
                className="small"
                onClick={() =>
                  void store
                    .enqueue(kind + ".delete", r, {})
                    .then(() => setRemoving(undefined))
                    .catch((e) => setError(e.message))
                }
              >
                Silmeyi onayla
              </button>
            </div>
          )}
        </article>
      ))}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
export const note: Field = { key: "note", label: "Not", type: "textarea" };
export const day = (value: string): Field => ({
  key: "local_date",
  label: "Kayıt tarihi",
  type: "date",
  required: true,
  value,
});
export const decimalField = (
  key: string,
  label: string,
  required = false,
  value?: unknown,
): Field => ({
  key,
  label,
  type: "decimal",
  required,
  value,
  hint: "Ondalık için virgül veya nokta kullanabilirsin.",
  ...([
    "kcal",
    "protein_g",
    "carbs_g",
    "fat_g",
    "fiber_g",
    "baseline",
    "target",
  ].includes(key)
    ? { min: 0, max: 1000000 }
    : {}),
  ...(["grams", "total_grams"].includes(key)
    ? { positive: true, max: 1000000 }
    : {}),
  ...(key === "ml" ? { positive: true, max: 10000 } : {}),
});
export const choice = (
  key: string,
  label: string,
  options: [string, string][],
  value?: string,
  required = true,
): Field => ({ key, label, type: "select", options, value, required });
export const textField = (
  key: string,
  label: string,
  required = true,
  value?: string,
): Field => ({ key, label, required, value });
export const shown = (value: unknown, unit = "") =>
  value == null
    ? "Bilgi yok"
    : `${typeof value === "number" ? value.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) : String(value)}${unit ? " " + unit : ""}`;
export function DayToolbar({
  selected,
  onDate,
}: {
  selected: string;
  onDate: (s: string) => void;
}) {
  return (
    <div className="toolbar">
      <label>
        Görüntülenen tarih
        <input
          type="date"
          value={selected}
          onChange={(e) => e.target.value && onDate(e.target.value)}
        />
      </label>
    </div>
  );
}
