import { useEffect, useState } from "react";
export function AppUpdate({ blocked }: { blocked: boolean }) {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [error, setError] = useState("");
  const [version, setVersion] = useState("");
  const [dismissed, setDismissed] = useState(false);
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
        const inspect = async () => {
          if (
            mounted &&
            navigator.serviceWorker.controller &&
            reg.waiting?.state === "installed"
          ) {
            const worker = reg.waiting;
            const key = await new Promise<string>((resolve) => {
              const channel = new MessageChannel();
              const timer = setTimeout(() => {
                channel.port1.close();
                resolve("");
              }, 1500);
              channel.port1.onmessage = (event) => {
                clearTimeout(timer);
                channel.port1.close();
                resolve(typeof event.data === "string" ? event.data : "");
              };
              worker.postMessage({ type: "GET_VERSION" }, [channel.port2]);
            });
            if (!mounted || reg.waiting !== worker) return;
            setVersion(key);
            try {
              setDismissed(
                !!key && localStorage.getItem("alos-update-dismissed") === key,
              );
            } catch {
              /* optional preference */
            }
            setWaiting(worker);
          }
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
    <aside
      className={dismissed ? "caption" : "notice"}
      aria-label="Uygulama güncellemesi"
      role={dismissed ? undefined : "status"}
    >
      {!dismissed && (
        <span>
          Yeni sürüm hazır. Açık formunu kaydettikten sonra geçebilirsin.
        </span>
      )}
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
        {blocked
          ? "Önce bekleyen kayıtları eşitle"
          : dismissed
            ? "Güncellemeyi aç"
            : "Yeni sürümü aç"}
      </button>
      {!dismissed && (
        <button
          className="text-button"
          onClick={() => {
            setDismissed(true);
            try {
              if (version)
                localStorage.setItem("alos-update-dismissed", version);
            } catch {
              /* optional preference */
            }
          }}
        >
          Daha sonra
        </button>
      )}
    </aside>
  ) : error ? (
    <p className="caption">{error}</p>
  ) : null;
}
