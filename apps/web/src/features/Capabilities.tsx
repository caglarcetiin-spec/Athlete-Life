import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { api, type Entity } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import {
  RecordList,
  day,
  choice,
  textField,
  decimalField,
  note,
  shown,
} from "./Records";
const groupNames: Record<string, string> = {
  calisthenics: "Kalistenik ve halkalar",
  strength: "Kuvvet",
  power_speed: "Güç ve hız",
  power: "Güç ve hız",
  running: "Koşu",
  balance_control: "Denge ve kontrol",
  mobility: "Mobilite",
  work_capacity: "İş kapasitesi",
  endurance: "Dayanıklılık",
  body: "Vücut",
};
export function Capabilities({
  store,
  selected,
}: {
  store: SyncStore;
  selected: string;
}) {
  const [catalog, setCatalog] = useState<Record<string, unknown>[]>([]),
    [group, setGroup] = useState("calisthenics"),
    [test, setTest] = useState(""),
    [customName, setCustomName] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    void api("catalogs")
      .then((v) => {
        const data = v as { capabilities: Record<string, unknown>[] };
        setCatalog(data.capabilities);
        void store.saveDraft("capability-catalog", data.capabilities);
      })
      .catch(async (e) => {
        const saved = await store.loadDraft("capability-catalog");
        if (saved) setCatalog(saved);
        else setError(e.message);
      });
  }, [store]);
  const customTests = [
    ...new Set(
      store
        .view("capability")
        .map((r) => String(r.definition_id))
        .filter((id) => id.startsWith("custom:")),
    ),
  ].map((id) => ({
    id,
    name: id.slice(7),
    domain: "custom",
    metric: "custom",
  }));
  const allTests: Record<string, unknown>[] = [...catalog, ...customTests];
  const definition =
    allTests.find((r) => r.id === test) ||
    (test.startsWith("custom:")
      ? { id: test, name: test.slice(7), domain: "custom", metric: "custom" }
      : undefined);
  const groups = [
    ...new Set([...catalog.map((r) => String(r.domain)), "custom"]),
  ];
  const tests = allTests.filter((r) => r.domain === group);
  const rows = store.view("capability").filter((r) => r.definition_id === test);
  const strength = definition?.metric === "load_reps";
  const unit = String(
    definition?.unit ||
      (
        { seconds: "seconds", reps: "reps", load_reps: "kg" } as Record<
          string,
          string
        >
      )[String(definition?.metric)] ||
      "seconds",
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Kendinle karşılaştır</span>
          <h1>Capability Lab</h1>
          <p>
            Her ölçüm aynı yöntem, varyasyon ve koşullarda anlam kazanır.
            Katalogdaki ileri hareketler bir antrenman reçetesi değildir.
          </p>
        </div>
        <FlaskConical className="heading-icon" />
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="card">
        <div className="form-grid">
          <label>
            Yetenek alanı
            <select
              aria-label="Yetenek alanı"
              value={group}
              onChange={(e) => {
                setGroup(e.target.value);
                setTest("");
              }}
            >
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g === "custom" ? "Kendi testlerim" : groupNames[g] || g}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ölçmek istediğim test
            <select
              aria-label="Ölçmek istediğim test"
              value={test}
              onChange={(e) => setTest(e.target.value)}
            >
              <option value="">Test seç</option>
              {tests.map((r) => (
                <option key={String(r.id)} value={String(r.id)}>
                  {String(r.name || r.label || r.id)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {group === "custom" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = customName.trim();
              if (name) setTest("custom:" + name);
            }}
          >
            <label>
              Kendi testimin adı
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                maxLength={93}
                required
              />
            </label>
            <button type="submit" className="secondary">
              Bu testin sonucunu gir
            </button>
            <p className="caption">
              Yöntemi, birimi ve koşulları tanımla. Bu test için doğrulanmış
              toplum normu veya otomatik başarı seviyesi üretilmez.
            </p>
          </form>
        )}
        {definition && (
          <>
            <h2>{String(definition.name || definition.label || test)}</h2>
            <p>
              {String(
                definition.description ||
                  definition.notes ||
                  "Karşılaştırılabilir sonuçlar için uyguladığın yöntemi not et.",
              )}
            </p>
            <small>
              Protokol:{" "}
              {group === "custom"
                ? "Kullanıcının tanımladığı yöntem"
                : "legacy-catalog-1"}{" "}
              · İstatistiksel toplum normları doğrulanmadığı için seviye yüzdesi
              üretilmez.
            </small>
          </>
        )}
      </div>
      {definition && (
        <RecordList
          key={test}
          store={store}
          kind="capability"
          title="Test sonuçları"
          rows={rows}
          initial={{ definition_id: test }}
          getInitial={(r) => ({
            ...r,
            component_reps: (r.components as Record<string, unknown>)?.reps,
            component_bodyweight_kg: (r.components as Record<string, unknown>)
              ?.bodyweight_kg,
          })}
          mapSave={(values, current) => {
            const { component_reps, component_bodyweight_kg, ...base } = values;
            const extra = {
              ...((current?.components as Record<string, unknown>) || {}),
            };
            delete extra.reps;
            delete extra.bodyweight_kg;
            return {
              ...base,
              components: strength
                ? {
                    ...extra,
                    ...(component_reps != null ? { reps: component_reps } : {}),
                    ...(component_bodyweight_kg != null
                      ? { bodyweight_kg: component_bodyweight_kg }
                      : {}),
                  }
                : extra,
            };
          }}
          fields={[
            day(selected),
            {
              key: "definition_id",
              label: "Test kimliği",
              type: "select",
              required: true,
              value: test,
              options: [
                [test, String(definition.name || definition.label || test)],
              ],
            },
            textField(
              "protocol_version",
              "Uyguladığım yöntem / protokol",
              true,
              group === "custom" ? "custom-v1" : "legacy-catalog-1",
            ),
            textField("variant", "Varyasyon / koşul", true, "standard"),
            choice(
              "side",
              "Taraf",
              [
                ["unknown", "Belirtilmedi"],
                ["left", "Sol"],
                ["right", "Sağ"],
                ["both", "Her iki taraf"],
              ],
              "unknown",
            ),
            textField("equipment", "Ekipman", false),
            decimalField("value", "Ölçülen sonuç"),
            ...(strength
              ? [
                  decimalField(
                    "component_reps",
                    "Bu ağırlıkla yaptığım tekrar sayısı",
                    true,
                  ),
                  decimalField(
                    "component_bodyweight_kg",
                    "Ölçümdeki vücut ağırlığım (kg)",
                  ),
                ]
              : []),
            choice(
              "unit",
              "Birim",
              [
                "kg",
                "reps",
                "seconds",
                "min",
                "m",
                "cm",
                "km",
                "deg",
                "percent",
              ].map((u) => [u, u]),
              unit,
            ),
            {
              key: "attempt",
              label: "Deneme numarası",
              type: "integer",
              value: 1,
              required: true,
            },
            choice(
              "selection",
              "Bu sonucun seçimi",
              [
                ["single", "Tek deneme"],
                ["best", "Denemelerin en iyisi"],
                ["last", "Son deneme"],
                ["mean", "Denemelerin ortalaması"],
              ],
              "single",
            ),
            note,
          ]}
          describe={(r: Entity) => (
            <>
              <strong>
                {shown(r.value, String(r.unit))} · {String(r.variant)}
              </strong>
              <p>
                {String(r.local_date)} · {String(r.protocol_version)} ·{" "}
                {String(r.equipment)}
              </p>
            </>
          )}
        >
          <p>
            Sonucu bilmiyorsan boş bırak. Farklı taraf, varyasyon veya
            protokoller aynı kişisel rekor serisine katılmaz.
          </p>
        </RecordList>
      )}
    </>
  );
}
