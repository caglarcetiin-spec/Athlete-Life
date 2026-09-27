import { BrandLogo } from "./BrandLogo";
import { ConflictComparison } from "./features/ConflictComparison";
import { brand } from "./brand";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  CloudCheck,
  CloudOff,
  House,
  Moon,
  RefreshCw,
  Sun,
  GraduationCap,
} from "lucide-react";
import { api, meSchema, serverNow, type Me } from "./api/contracts";
import { SyncStore } from "./sync/store";
import { Backups } from "./features/Backups";
import { Programming } from "./features/Programming";
import { Login } from "./features/Login";
import { Profile } from "./features/Profile";
import { Guide, Tour, Tools } from "./features/Guide";
import { Reports, Science } from "./features/Reports";
import { Goals, Events } from "./features/Goals";
import { Nutrition } from "./features/Nutrition";
import { Health } from "./features/Health";
import { Capabilities } from "./features/Capabilities";
import { Workouts } from "./features/Workouts";
import { Scheduling } from "./features/Scheduling";
import { displayDate, today, selectedAfterTick } from "./time";
import { readLocation } from "./navigation";
import { PrimaryNavigation, SectionNavigation } from "./features/Navigation";
import { AppUpdate } from "./features/AppUpdate";
import { SystemChecks } from "./features/SystemChecks";
import { PageBoundary } from "./PageBoundary";
export function download(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Workspace({
  me,
  onLogout,
  onAccount,
}: {
  me: Me;
  onLogout: () => void;
  onAccount: (m: Me) => void;
}) {
  const [store] = useState(() => new SyncStore(me));
  const [tour, setTour] = useState<number | null>(null);
  const [modeNotice, setModeNotice] = useState("");
  const welcomeKey = "alos-guide-dismissed:" + me.athlete_id;
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try {
      return localStorage.getItem(welcomeKey) === "yes";
    } catch {
      return false;
    }
  });
  const [previousMode, setPreviousMode] = useState("");
  const profile = store.view("profile")[0];
  const professional = profile?.interface_mode === "professional";
  const [, render] = useState(0);
  const [route, setRoute] = useState(
    readLocation(new URL(location.href)).route,
  );
  const lastRoute = useRef(route);
  useEffect(() => {
    if (lastRoute.current === route) return;
    lastRoute.current = route;
    document.getElementById("content")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [route]);
  const [selected, setSelected] = useState(
    readLocation(new URL(location.href)).selected,
  );
  const [following, setFollowing] = useState(
    readLocation(new URL(location.href)).following,
  );
  const [theme, setTheme] = useState(
    localStorage.getItem("alos-theme") || "light",
  );
  const [logoutDialog, setLogoutDialog] = useState(false);
  const logoutRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!logoutDialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = logoutRef.current;
    if (!dialog) return;
    dialog.querySelector<HTMLButtonElement>("button")?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setLogoutDialog(false);
      }
      if (event.key !== "Tab") return;
      const buttons = [
        ...dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
      ];
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [logoutDialog]);
  const [error, setError] = useState("");
  useEffect(() => {
    const un = store.subscribe(() => render((v) => v + 1));
    void store.init().catch((e) => setError(e.message));
    return () => {
      un();
      store.close();
    };
  }, [store]);
  useEffect(() => {
    const changed = () => {
      const next = readLocation(
        new URL(location.href),
        today(
          store.snapshot?.timezone,
          new Date(serverNow()),
          store.snapshot?.day_boundary_hour,
        ),
      );
      setRoute(next.route);
      setSelected(next.selected);
      setFollowing(next.following);
    };
    window.addEventListener("hashchange", changed);
    window.addEventListener("popstate", changed);
    return () => {
      window.removeEventListener("hashchange", changed);
      window.removeEventListener("popstate", changed);
    };
  }, [store]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("alos-theme", theme);
  }, [theme]);
  useEffect(() => {
    const tick = setInterval(
      () =>
        setSelected((v) =>
          selectedAfterTick(
            v,
            following,
            today(
              store.snapshot?.timezone,
              new Date(serverNow()),
              store.snapshot?.day_boundary_hour,
            ),
          ),
        ),
      15000,
    );
    return () => clearInterval(tick);
  }, [following, store]);
  function date(value: string) {
    const url = new URL(location.href);
    url.searchParams.set("date", value);
    const next = readLocation(url);
    if (next.following) return;
    setSelected(next.selected);
    setFollowing(false);
    history.pushState(null, "", url);
  }
  function go(value: string) {
    location.hash = value;
  }
  async function logout() {
    try {
      await api("auth/logout", {
        method: "POST",
        headers: { "X-CSRF-Token": me.csrf },
      });
      onLogout();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!store.snapshot) return;
    const current = professional ? "professional" : "simple";
    if (previousMode && previousMode !== current)
      setModeNotice(
        professional
          ? "Profesyonel görünüm açık. Bölümler aynı yerde; ayrıntılı araçlara Araçlar’dan ulaşabilirsin."
          : "Sade görünüm açık. Beş ana bölüm aynı yerde; diğer araçlar Araçlar’da.",
      );
    setPreviousMode(current);
  }, [professional, previousMode, store.snapshot]);
  const conflicts = store.pending.filter(
    (p) => p.state === "conflict" || p.state === "failed",
  );
  return (
    <div className="app">
      <a
        className="skip-link"
        href="#content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("content")?.focus();
        }}
      >
        İçeriğe geç
      </a>
      <aside className="sidebar">
        <a
          className="brand"
          href="#today"
          aria-label={brand.name + " ana sayfa"}
        >
          <BrandLogo /> {brand.name}
        </a>
        <span className="eyebrow nav-caption">{brand.tagline}</span>
        <PrimaryNavigation route={route} />
        <div className="sidebar-foot">
          <span className="avatar">{me.name.slice(0, 1)}</span>
          <div>
            <strong>{me.name}</strong>
            <small>Kendi ritminde</small>
          </div>
        </div>
      </aside>
      <div className="shell">
        <header>
          <button className="sync-pill" onClick={() => go("system")}>
            {store.error || store.pending.length ? (
              <CloudOff size={17} />
            ) : (
              <CloudCheck size={17} />
            )}
            <span>
              {store.writing
                ? "Cihaza yazılıyor"
                : conflicts.length
                  ? "Çatışma çözülmeli"
                  : store.pending.length
                    ? `${store.pending.length} kayıt eşitlenmeyi bekliyor`
                    : store.snapshot
                      ? "Sunucuya kaydedildi"
                      : "Bağlanıyor"}
            </span>
          </button>
          <div className="header-actions">
            <button
              className="icon"
              aria-label={
                theme === "light"
                  ? "Açık tema; koyu temaya geç"
                  : "Koyu tema; açık temaya geç"
              }
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Sun size={19} /> : <Moon size={19} />}
              <span className="theme-label">
                {theme === "light" ? "Açık" : "Koyu"}
              </span>
            </button>
            <a
              className="profile-link"
              href="#profile"
              aria-label={"Profilim · " + me.name}
              aria-current={route === "profile" ? "page" : undefined}
            >
              <span className="avatar small-avatar">
                {profile?.avatar_id ? (
                  <img src={"/api/v2/media/" + profile.avatar_id} alt="" />
                ) : (
                  me.name.slice(0, 1)
                )}
              </span>
              <span>{me.name}</span>
            </a>
          </div>
        </header>
        <main id="content" tabIndex={-1}>
          <AppUpdate blocked={!!store.writing || store.pending.length > 0} />
          {modeNotice && (
            <div className="notice" role="status">
              <span>{modeNotice}</span>
              <button className="text-button" onClick={() => setModeNotice("")}>
                Anladım
              </button>
            </div>
          )}
          {tour !== null && (
            <Tour
              step={tour}
              onStep={setTour}
              onClose={() => setTour(null)}
              onComplete={() => {
                void store
                  .enqueue("profile.save", profile || null, {
                    tutorial_completed: true,
                  })
                  .catch((e) => setError(e.message));
                setTour(null);
              }}
            />
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {store.error && (
            <div className="notice" role="status">
              {store.error}{" "}
              <button
                className="text-button"
                onClick={() => void store.retry()}
              >
                Tekrar dene
              </button>
            </div>
          )}
          <SectionNavigation route={route} />
          <PageBoundary key={route}>
            <div className="page-enter">
              {route === "tools" ? (
                <Tools />
              ) : route === "guide" ? (
                <Guide
                  store={store}
                  onStart={() => {
                    setTour(0);
                    go("profile");
                  }}
                />
              ) : route === "reports" || route === "status" ? (
                <Reports
                  store={store}
                  selected={selected}
                  onDate={date}
                  statusOnly={route === "status"}
                />
              ) : route === "science" ? (
                <Science />
              ) : route === "goals" ? (
                <Goals store={store} selected={selected} />
              ) : route === "events" ? (
                <Events store={store} selected={selected} />
              ) : route === "nutrition" ? (
                <Nutrition store={store} selected={selected} onDate={date} />
              ) : route === "health" ? (
                <Health store={store} selected={selected} onDate={date} />
              ) : route === "capability" ? (
                <Capabilities store={store} selected={selected} />
              ) : route === "workout" ? (
                <Workouts store={store} selected={selected} onDate={date} />
              ) : route === "program" ? (
                <Programming store={store} />
              ) : route === "backups" ? (
                <Backups store={store} />
              ) : route === "week" ? (
                <Scheduling store={store} selected={selected} onDate={date} />
              ) : route === "system" ? (
                <>
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">Kayıtlarının durumu</span>
                      <h1>Sistem Durumu</h1>
                      <p>Sunucu onayı ve cihazındaki bekleyen işlemler.</p>
                    </div>
                    <CloudCheck className="heading-icon" />
                  </div>
                  <div className="card">
                    <h2>
                      {store.pending.length
                        ? `${store.pending.length} işlem bekliyor`
                        : "Kayıtların güncel"}
                    </h2>
                    <p>
                      Son onay:{" "}
                      {store.lastSync
                        ? new Date(store.lastSync).toLocaleString("tr-TR")
                        : "Henüz yok"}
                    </p>
                    <button onClick={() => void store.retry()}>
                      <RefreshCw size={18} />
                      Eşitlemeyi dene
                    </button>
                  </div>
                  {store.pending.map((p) => (
                    <article className="card" key={p.id}>
                      <h3>{p.command.command_type}</h3>
                      <p>
                        {p.error ||
                          "Bu cihazda kaydedildi — sunucu onayı bekliyor."}
                      </p>
                      {p.state === "conflict" && p.current && (
                        <div className="actions">
                          <button
                            className="secondary"
                            onClick={() =>
                              void store
                                .resolveConflict(p.id, false)
                                .catch((e) => setError(e.message))
                            }
                          >
                            Sunucu sürümünü kullan
                          </button>
                          <button
                            onClick={() =>
                              void store
                                .resolveConflict(p.id, true)
                                .catch((e) => setError(e.message))
                            }
                          >
                            Karşılaştırdım, benim değişikliğimi uygula
                          </button>
                        </div>
                      )}
                      <details>
                        <summary>İki sürümü karşılaştır</summary>
                        <ConflictComparison pending={p} />
                      </details>
                      <button
                        className="secondary"
                        disabled={p.state === "in_flight"}
                        onClick={() => {
                          download(p, "bekleyen-islem.json");
                          void store
                            .discard(p.id)
                            .catch((e) => setError(e.message));
                        }}
                      >
                        Yerel işlemi indir ve kuyruktan kaldır
                      </button>
                    </article>
                  ))}
                  <SystemChecks store={store} />
                  <p className="caption">
                    Tarayıcı verilerini silmek, henüz sunucuya ulaşmamış
                    kayıtları silebilir. Yedekte bekleyen işlemler ayrıca
                    gösterilir.
                  </p>
                </>
              ) : route === "profile" ? (
                <Profile
                  store={store}
                  me={me}
                  onAccount={onAccount}
                  onLogout={() => setLogoutDialog(true)}
                />
              ) : (
                <>
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">
                        {displayDate(selected, true)}
                      </span>
                      <h1>Merhaba, {me.name.split(" ")[0]}.</h1>
                      <p>Bugün kendine iyi gelen bir adımla başla.</p>
                    </div>
                    <span className="hero-mark">
                      <Activity />
                    </span>
                  </div>
                  {!profile?.tutorial_completed && !welcomeDismissed && (
                    <section className="welcome-path card">
                      <GraduationCap size={24} />
                      <div>
                        <h2>Kendi yolunu birlikte oluşturalım.</h2>
                        <p>
                          Profil, hedef, haftalık plan. Nereden başlayacağını
                          rehberde görebilirsin.
                        </p>
                      </div>
                      <a className="link-button secondary" href="#guide">
                        Yol haritamı aç
                      </a>
                      <button
                        className="text-button"
                        onClick={() => {
                          setWelcomeDismissed(true);
                          try {
                            localStorage.setItem(welcomeKey, "yes");
                          } catch {
                            /* optional preference */
                          }
                        }}
                      >
                        Bu hatırlatmayı kapat
                      </button>
                    </section>
                  )}
                  <div className="today-grid">
                    <section className="hero-card">
                      <span className="eyebrow">Sıradaki adımın</span>
                      <h2>
                        Kendi hızında.
                        <br />
                        <em>Her gün ileri.</em>
                      </h2>
                      <p>
                        Planındaki antrenmanı aç veya serbest bir seans kaydet.
                        İlerlemeni kendi kayıtların üzerinden takip et.
                      </p>
                      <button onClick={() => go("workout")}>
                        Antrenmanımı aç
                        <ArrowRight size={19} />
                      </button>
                    </section>
                    <section className="card">
                      <CalendarDays size={25} />
                      <h2>Seçili gün</h2>
                      <label>
                        Tarih
                        <input
                          type="date"
                          value={selected}
                          onChange={(e) =>
                            e.target.value && date(e.target.value)
                          }
                        />
                      </label>
                      {!following && (
                        <button
                          className="text-button"
                          onClick={() => {
                            setFollowing(true);
                            setSelected(
                              today(
                                store.snapshot?.timezone,
                                new Date(serverNow()),
                                store.snapshot?.day_boundary_hour,
                              ),
                            );
                            const url = new URL(location.href);
                            url.searchParams.delete("date");
                            history.pushState(null, "", url);
                          }}
                        >
                          Bugüne dön
                        </button>
                      )}
                      <div className="day-summary">
                        {store
                          .view("shift")
                          .find((s) => s.local_date === selected)?.status ===
                        "work"
                          ? "Çalışma günü"
                          : store
                                .view("shift")
                                .some((s) => s.local_date === selected)
                            ? "Dinlenme / izin günü"
                            : "Vardiya henüz girilmedi"}
                      </div>
                      <button
                        className="text-button"
                        onClick={() => go("week")}
                      >
                        Haftalık planı aç
                        <ChevronRight size={16} />
                      </button>
                    </section>
                  </div>
                  {store
                    .view("program")
                    .filter((p) => p.status === "active")
                    .map((p) => (
                      <section className="card active-plan" key={p.id}>
                        <div>
                          <span className="eyebrow">Ana programın</span>
                          <h2>{String(p.name)}</h2>
                          <p>
                            {String(p.goal)} · {Number(p.weeks)} hafta
                          </p>
                        </div>
                        <button onClick={() => go("workout")}>
                          Günün antrenmanını aç
                          <ArrowRight size={18} />
                        </button>
                      </section>
                    ))}
                  <section className="card activity-feed">
                    <div className="section-heading compact">
                      <div>
                        <span className="eyebrow">Senin hareket günlüğün</span>
                        <h2>Son aktiviteler</h2>
                      </div>
                      <Activity size={24} />
                    </div>
                    {store.view("session").length === 0 ? (
                      <p>İlk seansını kaydettiğinde burada göreceksin.</p>
                    ) : (
                      [...store.view("session")]
                        .sort((a, b) =>
                          String(b.local_date).localeCompare(
                            String(a.local_date),
                          ),
                        )
                        .slice(0, 4)
                        .map((session) => (
                          <a
                            className="activity-item"
                            key={session.id}
                            href={
                              "?date=" +
                              encodeURIComponent(String(session.local_date)) +
                              "&session=" +
                              encodeURIComponent(session.id) +
                              "#workout"
                            }
                          >
                            <span className="activity-symbol">
                              <Activity size={20} />
                            </span>
                            <span>
                              <strong>{String(session.title)}</strong>
                              <small>
                                {displayDate(String(session.local_date))} ·{" "}
                                {(
                                  {
                                    ready: "Başlamadı",
                                    active: "Devam ediyor",
                                    paused: "Molada",
                                    completed: "Tamamlandı",
                                    abandoned: "Bırakıldı",
                                  } as Record<string, string>
                                )[String(session.status)] ||
                                  "Eşitleme bekliyor"}
                              </small>
                            </span>
                            <ChevronRight size={18} />
                          </a>
                        ))
                    )}
                  </section>
                </>
              )}
            </div>
          </PageBoundary>
        </main>
        <footer className="page-history" aria-label="Sayfa gezintisi">
          <button aria-label="Geri git" onClick={() => history.back()}>
            <ArrowLeft size={18} />
            <span>Geri</span>
          </button>
          <button aria-label="Ana sayfaya dön" onClick={() => go("today")}>
            <House size={18} />
            <span>Bugün</span>
          </button>
          <button aria-label="İleri git" onClick={() => history.forward()}>
            <ArrowRight size={18} />
            <span>İleri</span>
          </button>
        </footer>
        <PrimaryNavigation route={route} mobile />
      </div>
      {logoutDialog && (
        <div className="modal-backdrop">
          <section
            ref={logoutRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            className="card modal"
          >
            <h2 id="logout-title">Çıkış yap</h2>
            <p>
              {store.pending.length
                ? `${store.pending.length} bekleyen işlem bu cihazda, yalnız bu hesabına bağlı kalacak. İstersen önce indirebilirsin.`
                : "Tekrar giriş yaptığında kayıtların sunucudan açılacak."}
            </p>
            <div className="actions">
              <button
                className="secondary"
                onClick={() => setLogoutDialog(false)}
              >
                Vazgeç
              </button>
              {store.pending.length > 0 && (
                <button
                  className="secondary"
                  onClick={() =>
                    void store
                      .exportLocal()
                      .then((d) => download(d, "bekleyen-kayitlar.json"))
                  }
                >
                  Önce yedeği indir
                </button>
              )}
              <button onClick={() => void logout()}>
                Kayıtları koru ve çık
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void api("auth/me")
      .then((d) => setMe(meSchema.parse(d)))
      .catch(() => {})
      .finally(() => setLoading(false));
    const expired = () => setMe(null);
    window.addEventListener("alos-session-expired", expired);
    return () => window.removeEventListener("alos-session-expired", expired);
  }, []);
  if (loading)
    return (
      <main className="loading" role="status">
        Athlete Life açılıyor…
      </main>
    );
  return me ? (
    <Workspace
      key={me.id + me.csrf}
      me={me}
      onAccount={setMe}
      onLogout={() => setMe(null)}
    />
  ) : (
    <Login onLogin={setMe} />
  );
}
