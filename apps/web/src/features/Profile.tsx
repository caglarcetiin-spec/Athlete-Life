import { useEffect, useState } from "react";
import {
  UserRound,
  ShieldCheck,
  GraduationCap,
  Camera,
  LogOut,
} from "lucide-react";
import { api, meSchema, type Me } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import { RecordForm, choice, textField, type Field } from "./Records";
import { saveFile } from "./Backups";
const profileFields: Field[] = [
  { key: "birth_date", label: "Doğum tarihi (isteğe bağlı)", type: "date" },
  choice(
    "sex",
    "Fizyolojik profil",
    [
      ["unspecified", "Belirtmek istemiyorum"],
      ["female", "Kadın"],
      ["male", "Erkek"],
      ["intersex", "İnterseks"],
    ],
    "unspecified",
  ),
  choice(
    "experience",
    "Spor geçmişim",
    [
      ["new", "Yeni başlıyorum"],
      ["returning", "Ara verdim, dönüyorum"],
      ["regular", "Düzenli çalışıyorum"],
      ["advanced", "İleri düzey çalışıyorum"],
    ],
    "new",
  ),
  {
    key: "cycle_tracking",
    label: "İsteğe bağlı döngü günlüğünü kullanmak istiyorum",
    type: "checkbox",
  },
  choice(
    "interface_mode",
    "Tercih ettiğim görünüm",
    [
      ["simple", "Sade görünüm"],
      ["professional", "Profesyonel görünüm"],
    ],
    "simple",
  ),
];
export function Profile({
  store,
  me,
  onAccount,
  onLogout,
}: {
  store: SyncStore;
  me: Me;
  onAccount: (m: Me) => void;
  onLogout: () => void;
}) {
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [codes, setCodes] = useState<string[]>([]),
    [catalog, setCatalog] = useState<{ id: string; name: string }[]>([]),
    [sports, setSports] = useState<string[]>([]),
    [equipment, setEquipment] = useState("");
  const profile = store.view("profile")[0];
  useEffect(() => {
    setSports((profile?.sport_ids as string[]) || []);
    setEquipment(((profile?.equipment as string[]) || []).join(", "));
  }, [profile?.version]);
  useEffect(() => {
    void api("catalogs")
      .then((v) => {
        const data = v as {
          sports: { sports: { id: string; name: string }[] };
        };
        setCatalog(data.sports.sports);
      })
      .catch(() => {});
  }, []);
  async function refresh() {
    const updated = meSchema.parse(await api("auth/me"));
    Object.assign(store.me, updated);
    onAccount(updated);
  }
  async function authAction(path: string, values: unknown) {
    return api("auth/" + path, {
      method: "POST",
      headers: { "X-CSRF-Token": me.csrf },
      body: JSON.stringify(values),
    });
  }
  async function photo(file: File) {
    setError("");
    try {
      if (file.size > 2000000) throw Error("En fazla 2 MB fotoğraf seç.");
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(Error("Fotoğraf okunamadı."));
        reader.readAsDataURL(file);
      });
      await store.enqueue("media.save", null, {
        name: "Profil fotoğrafı · " + me.name,
        content,
      });
      setNotice(
        "Fotoğraf cihazına kaydedildi. Sunucu onayından sonra aşağıdaki fotoğraflardan profil fotoğrafını seç.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Sana ait alan</span>
          <h1>Profilim</h1>
          <p>
            {me.name} · @{me.username}
          </p>
        </div>
        <UserRound className="heading-icon" />
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <section className="card profile-intro">
        <div className="profile-portrait">
          {profile?.avatar_id ? (
            <img
              src={"/api/v2/media/" + profile.avatar_id}
              alt="Profil fotoğrafın"
            />
          ) : (
            <UserRound size={40} />
          )}
        </div>
        <div>
          <h2>{me.name}</h2>
          <p>Kendi başlangıcın, kendi hedeflerin.</p>
          <a className="text-button" href="#guide">
            <GraduationCap size={18} />
            Uygulamayı tanı
          </a>
        </div>
      </section>
      <section className="card">
        <h2>Spor ve sağlık profilim</h2>
        <p>
          Yaş, deneyim ve belirtiler aynı şey değildir. Hassas bilgileri
          paylaşman isteğe bağlıdır.
        </p>
        <RecordForm
          key={
            "profile-" + (profile?.id || "new") + "-" + (profile?.version || 0)
          }
          fields={profileFields}
          initial={profile}
          onSave={async (values) => {
            await store.enqueue("profile.save", profile || null, {
              ...values,
              sport_ids: sports,
              equipment: equipment
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            });
            setNotice(
              "Profil değişikliği kayda alındı; eşitleme durumunu üstte izleyebilirsin.",
            );
          }}
        >
          <div className="form-grid">
            <label>
              Branş ekle
              <select
                aria-label="Branş ekle"
                value=""
                onChange={(e) => {
                  if (e.target.value && !sports.includes(e.target.value))
                    setSports([...sports, e.target.value]);
                }}
              >
                <option value="">Branş seç</option>
                {catalog.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ekipmanlarım
              <input
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="Örn. bar, halka, dambıl"
              />
            </label>
          </div>
          <div className="chips">
            {sports.map((id) => (
              <button
                type="button"
                className="secondary small"
                key={id}
                onClick={() => setSports(sports.filter((s) => s !== id))}
              >
                {catalog.find((s) => s.id === id)?.name || id} · Kaldır
              </button>
            ))}
          </div>
        </RecordForm>
      </section>
      <section className="card">
        <h2>Hesap bilgilerim</h2>
        <RecordForm
          key={me.version}
          fields={[
            textField("name", "Görünen adım"),
            textField("email", "E-posta adresim", false),
          ]}
          initial={{ name: me.name, email: me.email }}
          onSave={async (values) => {
            await api("auth/profile", {
              method: "PATCH",
              headers: { "X-CSRF-Token": me.csrf },
              body: JSON.stringify({
                ...values,
                email: values.email || null,
                expected_version: me.version,
              }),
            });
            await refresh();
            setNotice("Hesap bilgilerin sunucuya kaydedildi.");
          }}
        />
        <p className="caption">
          E-posta doğrulama/gönderme hizmeti yapılandırılmadı. Şifre kurtarmak
          için aşağıdaki tek kullanımlık kodları saklayabilirsin.
        </p>
      </section>
      <section className="card">
        <Camera size={24} />
        <h2>Fotoğrafım</h2>
        <label>
          Fotoğraf ekle
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) =>
              e.target.files?.[0] && void photo(e.target.files[0])
            }
          />
        </label>
        <p>
          En fazla 2 MB; kaydederken 960 piksele küçültülür ve konum metadata’sı
          çıkarılır.
        </p>
        <div className="avatar-choices">
          {store
            .view("media")
            .filter((m) => String(m.mime).startsWith("image/"))
            .map((m) => (
              <button
                className="secondary"
                key={m.id}
                disabled={
                  Boolean(m.local_pending) || Boolean(profile?.local_pending)
                }
                aria-label={String(m.name) + " profil fotoğrafı yap"}
                onClick={() =>
                  void store
                    .enqueue("profile.save", profile || null, {
                      avatar_id: m.id,
                    })
                    .catch((e) => setError(e.message))
                }
              >
                <img
                  loading="lazy"
                  src={"/api/v2/media/" + m.id}
                  alt={String(m.name)}
                />
                {profile?.avatar_id === m.id && <span>Seçili</span>}
              </button>
            ))}
        </div>
      </section>
      <section className="card">
        <ShieldCheck size={24} />
        <h2>Güvenlik</h2>
        <details>
          <summary>Şifremi değiştir</summary>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                f = new FormData(form);
              try {
                await authAction("password", {
                  current_password: f.get("old"),
                  new_password: f.get("new"),
                });
                await refresh();
                form.reset();
                setNotice(
                  "Şifren değişti. Diğer cihazların oturumları kapatıldı.",
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label>
              Mevcut şifre
              <input
                name="old"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label>
              Yeni şifre
              <input
                name="new"
                type="password"
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
            <button>Şifreyi değiştir</button>
          </form>
        </details>
        <details>
          <summary>Kurtarma kodlarım</summary>
          <p>
            8 tek kullanımlık kod oluştur. Yeni kodlar önceki kodları iptal
            eder. Hesabına erişimini kaybedersen giriş ekranındaki “Şifremi
            unuttum” alanında birini kullanabilirsin.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const result = (await authAction("recovery-codes", {
                  password: f.get("password"),
                })) as { codes: string[] };
                setCodes(result.codes);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label>
              Kod oluşturmak için şifrem
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button>Kodları oluştur</button>
          </form>
          {codes.length > 0 && (
            <>
              <p role="status">
                Bu kodlar yalnız bu ekranda bir kez gösterilir.
              </p>
              <pre>{codes.join("\n")}</pre>
              <button
                className="secondary"
                onClick={() => {
                  saveFile(
                    { username: me.username, recovery_codes: codes },
                    "Athlete-Life-kurtarma-kodlari.json",
                  );
                  setCodes([]);
                }}
              >
                Kodları indir ve ekrandan kaldır
              </button>
            </>
          )}
        </details>
      </section>
      <section className="card">
        <h2>Hesabımdan ayrıl</h2>
        <button className="secondary" onClick={onLogout}>
          <LogOut size={17} />
          Çıkış yap
        </button>
        <details>
          <summary>Hesabımı ve aktif verilerimi sil</summary>
          <p>
            Profil, sağlık kayıtları, antrenmanlar, fotoğraflar ve işlem geçmişi
            aktif veritabanından kalıcı silinir. İndirdiğin yedek dosyaları ve
            sağlayıcının süreli yedekleri ayrıca saklanmış olabilir. Bekleyen
            kayıt varken silme işlemi kapalıdır.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                if (store.pending.length)
                  throw Error("Önce bekleyen kayıtları eşitle veya yedekle.");
                await authAction("delete", { password: f.get("password") });
                await store.eraseLocal();
                location.reload();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <label>
              Silmek için mevcut şifrem
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
            <label className="check">
              <input type="checkbox" required />
              Hesabımı kalıcı silmek istiyorum.
            </label>
            <button disabled={store.pending.length > 0}>
              Hesabımı kalıcı sil
            </button>
          </form>
        </details>
      </section>
    </>
  );
}
