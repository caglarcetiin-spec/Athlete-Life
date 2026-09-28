import { useRef, useState } from "react";
import {
  canonical,
  displayed,
  factor,
  preferredUnit,
  units,
  type Measure,
} from "./quantities";
export function QuantityInput({
  label,
  inputLabel,
  kind,
  value,
  defaultValue,
  defaultUnit,
  name,
  onChange,
  required = false,
}: {
  label: string;
  inputLabel?: string;
  kind: Measure;
  value?: number | string | null;
  defaultValue?: number | string | null;
  defaultUnit?: string;
  name?: string;
  onChange?: (value: number | string | null) => void;
  required?: boolean;
}) {
  const [local, setLocal] = useState(defaultValue ?? null);
  const current = value === undefined ? local : value;
  const [unit, setUnit] = useState(defaultUnit || preferredUnit(current, kind));
  const [edit, setEdit] = useState({
    base: String(current ?? ""),
    raw: displayed(current, factor(kind, unit)),
  });
  const hidden = useRef<HTMLInputElement>(null);
  const raw =
    edit.base === String(current ?? "")
      ? edit.raw
      : displayed(current, factor(kind, unit));
  return (
    <div role="group" aria-label={label + " ölçüm alanı"}>
      <label>
        {label}
        <input
          aria-label={inputLabel || label}
          inputMode="decimal"
          required={required}
          value={raw}
          onChange={(e) => {
            const next = canonical(e.target.value, factor(kind, unit));
            e.target.setCustomValidity(
              typeof next === "string"
                ? "Geçerli sayı gir; örneğin 1,5. Binlik ayraç kullanma."
                : "",
            );
            if (hidden.current) hidden.current.value = String(next ?? "");
            setEdit({ base: String(next ?? ""), raw: e.target.value });
            setLocal(next);
            onChange?.(next);
          }}
        />
      </label>
      <label>
        {label} birimi
        <select
          aria-label={(inputLabel || label) + " birimi"}
          value={unit}
          onChange={(e) => {
            setUnit(e.target.value);
            setEdit({
              base: String(current ?? ""),
              raw: displayed(current, factor(kind, e.target.value)),
            });
          }}
        >
          {units[kind].map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
      </label>
      {name && (
        <input ref={hidden} type="hidden" name={name} value={current ?? ""} />
      )}
    </div>
  );
}
