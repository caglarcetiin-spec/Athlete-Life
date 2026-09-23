import { useState } from "react";
import { Utensils, GlassWater } from "lucide-react";
import type { Entity } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import {
  RecordForm,
  RecordList,
  DayToolbar,
  day,
  decimalField,
  choice,
  textField,
  note,
  shown,
  type Field,
} from "./Records";
const nutrients = [
  ["kcal", "Enerji (kcal)"],
  ["protein_g", "Protein (g)"],
  ["carbs_g", "Karbonhidrat (g)"],
  ["fat_g", "Yağ (g)"],
  ["fiber_g", "Lif (g)"],
];
export function Nutrition({
  store,
  selected,
  onDate,
}: {
  store: SyncStore;
  selected: string;
  onDate: (s: string) => void;
}) {
  const [tab, setTab] = useState("day"),
    [recipe, setRecipe] = useState<Entity | null | undefined>(),
    [ingredients, setIngredients] = useState<
      { food_id: string; grams: string }[]
    >([]),
    [error, setError] = useState("");
  const meals = store.view("meal").filter((r) => r.local_date === selected),
    waters = store.view("hydration").filter((r) => r.local_date === selected),
    foods = store.view("food"),
    recipes = store.view("recipe"),
    status = store.view("nutrition_day").find((r) => r.local_date === selected);
  const totals = Object.fromEntries(
    nutrients.map(([k]) => [
      k,
      meals.length && meals.every((r) => r[k] != null)
        ? meals.reduce((s, r) => s + Number(r[k]), 0)
        : null,
    ]),
  );
  const mealFields: Field[] = [
    day(selected),
    textField("name", "Öğün adı"),
    choice(
      "meal_type",
      "Öğün",
      [
        ["breakfast", "Kahvaltı"],
        ["lunch", "Öğle"],
        ["dinner", "Akşam"],
        ["snack", "Ara öğün"],
        ["meal", "Diğer"],
      ],
      "meal",
    ),
    decimalField("grams", "Tüketilen miktar (g)", true),
    choice(
      "food_id",
      "Kütüphaneden besin",
      foods.map((r) => [r.id, String(r.name)]),
      undefined,
      false,
    ),
    choice(
      "recipe_id",
      "Kütüphaneden tarif",
      recipes.map((r) => [r.id, String(r.name)]),
      undefined,
      false,
    ),
    ...nutrients.map(([k, l]) => decimalField(k, l)),
  ];
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Beslenme günlüğün</span>
          <h1>Beslenme</h1>
          <p>
            Yediklerin, içtiklerin ve kendi tariflerin. Eksik kayıtlar sıfır
            tüketim sayılmaz.
          </p>
        </div>
        <Utensils className="heading-icon" />
      </div>
      <div className="tabs" aria-label="Beslenme görünümü">
        {[
          ["day", "Günüm"],
          ["library", "Besinler ve tarifler"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={tab === key ? "" : "secondary"}
            aria-pressed={tab === key}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "day" ? (
        <>
          <DayToolbar selected={selected} onDate={onDate} />
          <div className="metric-grid">
            {nutrients.slice(0, 4).map(([k, l]) => (
              <article className="metric card" key={k}>
                <span>{l}</span>
                <strong>{shown(totals[k])}</strong>
                <small>
                  {status?.status === "complete"
                    ? "Gün tamamlandı"
                    : meals.length
                      ? "Kısmi günlük"
                      : "Kayıt yok"}
                </small>
              </article>
            ))}
          </div>
          <section className="card">
            <h2>Günlük kapsamı</h2>
            <p>
              Tüm öğünleri girdin mi? Bu seçim yalnız kayıtların ne kadar tamam
              olduğunu belirtir.
            </p>
            <div className="actions">
              {[
                ["complete", "Günü tamamladım"],
                ["partial", "Henüz bitmedi"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={status?.status === value ? "" : "secondary"}
                  disabled={Boolean(status?.local_pending)}
                  onClick={() =>
                    void store
                      .enqueue("nutrition_day.save", status || null, {
                        local_date: selected,
                        status: value,
                      })
                      .catch((e) => setError(e.message))
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
          <RecordList
            store={store}
            kind="meal"
            title="Öğünler"
            fields={mealFields}
            rows={meals}
            describe={(r) => (
              <>
                <strong>{String(r.name)}</strong>
                <p>
                  {shown(r.grams, "g")} · {shown(r.kcal, "kcal")} · Protein{" "}
                  {shown(r.protein_g, "g")}
                </p>
              </>
            )}
          >
            <p>
              Besin veya tarif seçersen o sürümün değerleri saklanır. Doğrudan
              giriyorsan makroları tükettiğin porsiyon için yaz; bilmediklerini
              boş bırak.
            </p>
          </RecordList>
          <RecordList
            store={store}
            kind="hydration"
            title="Su"
            fields={[
              day(selected),
              decimalField("ml", "Su (ml)", true, 250),
              note,
            ]}
            rows={waters}
            describe={(r) => (
              <>
                <strong>{shown(r.ml, "ml")}</strong>
                <p>{String(r.note || "")}</p>
              </>
            )}
          >
            <p>
              <GlassWater size={17} /> Bugünkü kayıt:{" "}
              {waters.length
                ? shown(
                    waters.reduce((s, r) => s + Number(r.ml), 0),
                    "ml",
                  )
                : "Henüz yok"}
            </p>
          </RecordList>
        </>
      ) : (
        <>
          <RecordList
            store={store}
            kind="food"
            title="Besin kütüphanem"
            fields={[
              textField("name", "Besin adı"),
              ...nutrients.map(([k, l]) => decimalField(k, l, k !== "fiber_g")),
              textField(
                "reference",
                "Kaynak / etiket",
                false,
                "Kullanıcı girişi; 100 g için",
              ),
            ]}
            describe={(r) => (
              <>
                <strong>{String(r.name)}</strong>
                <p>
                  100 g için {shown(r.kcal, "kcal")} · {String(r.reference)}
                </p>
              </>
            )}
          >
            <p>
              Ambalajdaki veya güvendiğin kaynaktaki 100 gram değerlerini gir.
            </p>
          </RecordList>
          <section className="card">
            <div className="section-heading compact-row">
              <h2>Tariflerim</h2>
              <button
                className="secondary"
                onClick={() => {
                  setRecipe(null);
                  setIngredients([]);
                }}
              >
                Tarif oluştur
              </button>
            </div>
            {recipe !== undefined && (
              <RecordForm
                key={recipe?.id || "new"}
                initial={recipe || {}}
                fields={[
                  textField("name", "Tarif adı"),
                  decimalField(
                    "total_grams",
                    "Hazır tarifin toplam ağırlığı (g)",
                    true,
                  ),
                  {
                    key: "instructions",
                    label: "Hazırlanışı",
                    type: "textarea",
                  },
                ]}
                onCancel={() => setRecipe(undefined)}
                onSave={async (values) => {
                  await store.enqueue("recipe.save", recipe, {
                    ...values,
                    ingredients,
                  });
                  setRecipe(undefined);
                }}
              >
                <div className="ingredients">
                  {ingredients.map((row, i) => (
                    <div className="form-grid" key={i}>
                      <label>
                        Malzeme
                        <select
                          value={row.food_id}
                          required
                          onChange={(e) =>
                            setIngredients(
                              ingredients.map((r, n) =>
                                n === i ? { ...r, food_id: e.target.value } : r,
                              ),
                            )
                          }
                        >
                          <option value="">Besin seç</option>
                          {foods.map((r) => (
                            <option key={r.id} value={r.id}>
                              {String(r.name)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Malzeme (g)
                        <input
                          required
                          inputMode="decimal"
                          value={row.grams}
                          onChange={(e) =>
                            setIngredients(
                              ingredients.map((r, n) =>
                                n === i ? { ...r, grams: e.target.value } : r,
                              ),
                            )
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() =>
                          setIngredients(ingredients.filter((_, n) => n !== i))
                        }
                      >
                        Çıkar
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="secondary"
                    onClick={() =>
                      setIngredients([
                        ...ingredients,
                        { food_id: "", grams: "100" },
                      ])
                    }
                  >
                    Malzeme ekle
                  </button>
                </div>
              </RecordForm>
            )}
            {recipes.map((r) => (
              <article className="record-row" key={r.id}>
                <div>
                  <strong>{String(r.name)}</strong>
                  <p>
                    {shown(r.total_grams, "g")} · Sürüm {r.version}
                  </p>
                </div>
                <button
                  className="secondary small"
                  disabled={Boolean(r.local_pending)}
                  onClick={() => {
                    setRecipe(r);
                    setIngredients(
                      (
                        r.ingredients as { food_id: string; grams: number }[]
                      ).map((i) => ({ ...i, grams: String(i.grams) })),
                    );
                  }}
                >
                  Düzenle
                </button>
                <button
                  className="text-button"
                  disabled={Boolean(r.local_pending)}
                  onClick={() =>
                    void store
                      .enqueue("recipe.delete", r, {})
                      .catch((e) => setError(e.message))
                  }
                >
                  Tarifi arşivle
                </button>
              </article>
            ))}
          </section>
        </>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </>
  );
}
