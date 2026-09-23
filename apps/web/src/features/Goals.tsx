import { Target, CalendarPlus } from "lucide-react";
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
import { addDays } from "../time";
export function Goals({
  store,
  selected,
}: {
  store: SyncStore;
  selected: string;
}) {
  const goals = store.view("goal");
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Nereye gitmek istiyorum?</span>
          <h1>Hedeflerim</h1>
          <p>Bir başlangıç, ölçülebilir bir hedef ve kendi zaman çizgin.</p>
        </div>
        <Target className="heading-icon" />
      </div>
      <RecordList
        store={store}
        kind="goal"
        title="Hedefler"
        fields={[
          textField("title", "Hedefimin adı"),
          textField("metric", "Ölçtüğüm özellik", true, "weight"),
          textField("variant", "Karşılaştırma koşulu / varyasyon", false),
          decimalField("baseline", "Başlangıç değerim", true),
          decimalField("target", "Hedef değerim", true),
          textField("unit", "Ölçüm birimi", true, "kg"),
          {
            key: "start_date",
            label: "Başlangıç tarihi",
            type: "date",
            required: true,
            value: selected,
          },
          {
            key: "target_date",
            label: "Hedef tarihi",
            type: "date",
            required: true,
            value: addDays(selected, 84),
          },
          {
            key: "archived",
            label: "Geçmiş hedef olarak sakla",
            type: "checkbox",
          },
        ]}
        describe={(r) => (
          <>
            <strong>{String(r.title)}</strong>
            <p>
              {shown(r.baseline, String(r.unit))} →{" "}
              {shown(r.target, String(r.unit))} · {String(r.target_date)}
              {r.archived ? " · Arşivde" : ""}
            </p>
          </>
        )}
      />
      {goals.map((g) => (
        <RecordList
          key={g.id}
          store={store}
          kind="goal_measurement"
          title={String(g.title) + " · Ölçümler"}
          rows={store
            .view("goal_measurement")
            .filter((r) => r.goal_id === g.id)}
          fields={[
            day(selected),
            choice("goal_id", "İlgili hedef", [[g.id, String(g.title)]], g.id),
            decimalField("value", "Güncel değer (" + g.unit + ")", true),
            note,
          ]}
          describe={(r) => (
            <>
              <strong>{shown(r.value, String(g.unit))}</strong>
              <p>
                {String(r.local_date)} · {String(r.note || "")}
              </p>
            </>
          )}
        />
      ))}
    </>
  );
}
export function Events({
  store,
  selected,
}: {
  store: SyncStore;
  selected: string;
}) {
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="eyebrow">Hayatın plana sığmayan kısmı</span>
          <h1>Sürpriz Plan</h1>
          <p>
            Bir davet, ek bir yürüyüş veya beklenmedik hareket. Planlamak ile
            yapmak ayrı kayıtlardır.
          </p>
        </div>
        <CalendarPlus className="heading-icon" />
      </div>
      <RecordList
        store={store}
        kind="event"
        title="Planlar ve ek aktiviteler"
        fields={[
          day(selected),
          textField("title", "Etkinlik adı"),
          choice(
            "kind",
            "Etkinliğin türü",
            [
              ["social", "Sosyal plan"],
              ["physical", "Fiziksel aktivite"],
            ],
            "social",
          ),
          choice(
            "status",
            "Durumu",
            [
              ["planned", "Planladım"],
              ["occurred", "Gerçekleşti"],
              ["cancelled", "İptal oldu"],
            ],
            "planned",
          ),
          choice(
            "modality",
            "Fiziksel aktivite türü",
            [
              ["strength", "Kuvvet"],
              ["cardio", "Dayanıklılık"],
              ["skill", "Teknik"],
              ["isometric", "Sabit tutuş"],
              ["circuit", "Devre"],
            ],
            undefined,
            false,
          ),
          {
            key: "duration_seconds",
            label: "Gerçek süre (saniye)",
            type: "integer",
          },
          decimalField("rpe", "Algılanan efor (0–10)"),
          choice(
            "duplicate_of",
            "Zaten kayıtlıysa asıl etkinlik",
            store
              .view("event")
              .filter((e) => !e.duplicate_of)
              .map((e) => [e.id, String(e.title)]),
            undefined,
            false,
          ),
          note,
        ]}
        describe={(r) => (
          <>
            <strong>{String(r.title)}</strong>
            <p>
              {String(r.local_date)} ·{" "}
              {r.status === "occurred"
                ? "Gerçekleşti"
                : r.status === "cancelled"
                  ? "İptal"
                  : "Planlandı"}{" "}
              · {r.kind === "social" ? "Sosyal etkinlik" : "Fiziksel aktivite"}
            </p>
            {r.duplicate_of && (
              <small>Asıl kayda bağlı; tekrar yük sayılmaz.</small>
            )}
          </>
        )}
      >
        <p>
          Yalnız gerçekleşmiş fiziksel aktiviteler yük analizine katılır. Sosyal
          plan için süre ve efor girmen gerekmez.
        </p>
      </RecordList>
    </>
  );
}
