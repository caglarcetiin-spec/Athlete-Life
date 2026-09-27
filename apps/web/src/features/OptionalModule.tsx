import type { ReactNode } from "react";
import type { SyncStore } from "../sync/store";
export function OptionalModule({
  store,
  id,
  label,
  children,
}: {
  store: SyncStore;
  id: string;
  label: string;
  children: ReactNode;
}) {
  const prefs = store.view("profile")[0]?.planning_preferences as
    { optional_modules?: string[] } | undefined;
  return prefs?.optional_modules && !prefs.optional_modules.includes(id) ? (
    <details className="card">
      <summary>{label} · İsteğe bağlı kayıtlarımı aç</summary>
      <p>
        Bu modülü günlük takibinden çıkardın. Önceki verilerin korunuyor;
        yeniden etkinleştirmek için profil tercihlerini kullan.
      </p>
      {children}
    </details>
  ) : (
    <>{children}</>
  );
}
