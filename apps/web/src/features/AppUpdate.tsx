import { useEffect, useState } from "react";
export function AppUpdate({ blocked }: { blocked: boolean }) {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
    let mounted = true;
    let ownUpdate = false;
    const changed = () => {
      setWaiting(null);
      if (ownUpdate) location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    const activate = (e: Event) => {
      ownUpdate = true;
      (e as CustomEvent<ServiceWorker>).detail.postMessage({
        type: "ACTIVATE_UPDATE",
      });
    };
    window.addEventListener("alos-update-shell", activate);
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        const inspect = () => {
          if (
            mounted &&
            navigator.serviceWorker.controller &&
            reg.waiting?.state === "installed"
          )
            setWaiting(reg.waiting);
        };
        inspect();
        reg.addEventListener("updatefound", () =>
          reg.installing?.addEventListener("statechange", inspect),
        );
      })
      .catch(() => {
        if (mounted)
          setError(
            "Çevrimdışı açılış şu anda hazırlanamadı. İnternet bağlantısıyla kullanmaya devam edebilirsin.",
          );
      });
    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
      window.removeEventListener("alos-update-shell", activate);
    };
  }, []);
  return waiting ? (
    <aside className="notice" role="status">
      <span>
        Yeni sürüm hazır. Açık formunu kaydettikten sonra geçebilirsin.
      </span>
      <button
        disabled={blocked}
        onClick={() => {
          if (
            window.confirm(
              "Kaydetmediğin form değişiklikleri yeniden açılışta kapanır. Kaydettiysen yeni sürümü aç.",
            )
          )
            window.dispatchEvent(
              new CustomEvent("alos-update-shell", { detail: waiting }),
            );
        }}
      >
        {blocked ? "Önce bekleyen kayıtları eşitle" : "Yeni sürümü aç"}
      </button>
    </aside>
  ) : error ? (
    <p className="caption">{error}</p>
  ) : null;
}
