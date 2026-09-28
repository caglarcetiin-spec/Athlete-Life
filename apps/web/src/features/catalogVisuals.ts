/** Original, deliberately simplified pose drawings, bound to canonical movement IDs.
 * No substring matching: an unknown technique never inherits another exercise's form.
 */
import { findMovement, type Movement } from "./movementLibrary";
export type CatalogMovement = {
  id: string;
  name: string;
  displayNameTR?: string;
  aliases?: string[];
  modality: string;
  equipment: string[];
  muscles: Record<string, number>;
  pattern?: string;
  contraction?: string;
  catalog_version: string;
  note?: string;
  sport_id?: string;
  source_urls?: string[];
};
export const muscleLabels: Record<string, string> = {
  chest: "Göğüs",
  lats: "Geniş sırt",
  upperBack: "Üst sırt",
  lowerBack: "Bel",
  frontDelts: "Ön omuz",
  sideDelts: "Yan omuz",
  rearDelts: "Arka omuz",
  biceps: "Biseps",
  triceps: "Triseps",
  forearms: "Önkol",
  abs: "Karın",
  obliques: "Yan karın",
  glutes: "Kalça",
  quads: "Ön bacak",
  hamstrings: "Arka bacak",
  calves: "Baldır",
  scapular: "Kürek kemiği çevresi",
  hipFlexors: "Kalça fleksörleri",
};
type Template = {
  poses: [string, string];
  phases: [string, string];
  cue: string;
  source?: string;
  props?: [string, string];
};
const standing =
  "88,24|M87 42L87 89|M87 50L105 79L105 98|M87 89L71 117L70 145|M87 89L99 117L102 145";
const hanging =
  "88,58|M88 74L88 110|M88 76L60 50L56 25|M88 76L115 50L120 25|M88 110L78 142|M88 110L98 142";
const support =
  "88,25|M88 42L88 84|M88 46L63 75L62 101|M88 46L113 75L114 101|M88 84L78 134|M88 84L98 134";
const pulling =
  "88,20|M88 38L88 78|M88 42L54 55L56 25|M88 42L120 55L120 25|M88 78L78 120L64 141|M88 78L98 121L109 141";
const row1 =
  "127,66|M114 80L69 109L26 142|M112 81L89 103L90 135|M69 109L91 120L105 145";
const row2 =
  "127,66|M114 80L69 109L26 142|M112 81L75 75L87 100|M69 109L91 120L105 145";
const lever = "30,83|M46 90L95 90|M49 90L69 52L80 20|M95 90L126 90L157 90";
const tuckLever = "30,83|M46 90L95 90|M49 90L69 52L80 20|M95 90L69 108L101 127";
const planche = "145,83|M128 92L80 92|M126 94L109 143|M80 92L47 92L19 92";
const tuckPlanche =
  "145,83|M128 92L80 92|M126 94L109 143|M80 92L102 115L74 131";
const hold = (pose: string, cue: string): Template => ({
  poses: [pose, pose],
  phases: ["Pozisyonu kur", "Hizayı koruyarak tut"],
  cue,
  source: "https://gmb.io/rings/",
});
const templates: Record<string, Template> = {
  hinge: {
    poses: [
      standing,
      "124,66|M110 79L77 96|M105 82L109 133|M77 96L64 122L68 145|M77 96L98 120L103 145",
    ],
    phases: ["Ayakta başla", "Kalçadan katlan"],
    cue: "Gövde ve kalça birlikte hareket eder. Çizim kalçadan katlanma örüntüsünü gösterir; yükü ve hareket açıklığını kontrolüne göre seç.",
  },
  row: {
    poses: [row1, row2],
    phases: ["Kolları uzat", "Dirsekleri geriye çek"],
    cue: "Gövde açısını korurken yükü kendine doğru çek, kontrollü geri bırak.",
  },
  press: {
    poses: [
      "88,25|M88 42L88 90|M88 48L61 64L58 42|M88 48L114 64L119 42|M88 90L70 145|M88 90L106 145",
      "88,40|M88 57L88 96|M88 61L68 37L65 14|M88 61L108 37L113 14|M88 96L70 145|M88 96L106 145",
    ],
    phases: ["Omuz hizasında başla", "Yukarı it"],
    cue: "Kolları baş üzerine uzatırken gövdeyi sabit tut. Kontrollü biçimde başlangıca dön.",
  },
  curl: {
    poses: [
      standing,
      "88,24|M87 42L87 89|M87 50L106 83L130 54|M87 89L71 117L70 145|M87 89L99 117L102 145",
    ],
    phases: ["Dirsek açık", "Dirseği bük"],
    cue: "Üst kolun konumunu korurken dirseği bük ve kontrollü aç. Kavrama kullanılan ekipmana bağlıdır.",
  },
  lateral: {
    poses: [
      standing,
      "88,24|M87 42L87 89|M87 49L52 54L24 57|M87 49L122 54L150 57|M87 89L71 117L70 145|M87 89L99 117L102 145",
    ],
    phases: ["Kollar yanda", "Kolları yana kaldır"],
    cue: "Kolları kontrollü yana kaldır. Çizim genel yönü gösterir; sallanarak ivme üretme.",
  },
  extension: {
    poses: [
      "88,35|M88 51L88 94|M88 55L100 20L122 46|M88 94L72 145|M88 94L108 145",
      "88,35|M88 51L88 94|M88 55L100 20L112 4|M88 94L72 145|M88 94L108 145",
    ],
    phases: ["Dirsek bükülü", "Dirseği aç"],
    cue: "Üst kolu sabit tutarak dirseği aç. Burada baş üstü uzatma örüntüsü gösterilir.",
  },
  calf: {
    poses: [
      standing,
      "88,15|M87 33L87 80|M87 41L105 70L105 89|M87 80L71 108L68 134L77 145|M87 80L99 108L100 134L109 145",
    ],
    phases: ["Topuklar aşağıda", "Topukları yükselt"],
    cue: "Ayak ön kısmı üzerinde yükselip kontrollü alçal; sıçrama olarak uygulanmaz.",
  },
  pull: {
    poses: [hanging, pulling],
    phases: ["Asılma", "Yukarı çekiş"],
    cue: "Asılmadan gövdeni yukarı çek ve kontrollü geri in. Kavrama ve ekipman seçili varyasyona aittir.",
    source: "https://gmb.io/rings/",
    props: ["M40 22H138", "M40 22H138"],
  },
  dip: {
    poses: [
      "88,20|M88 38L88 82|M88 42L62 94|M88 42L115 94|M88 82L79 115L99 139",
      "88,50|M88 68L88 109|M88 72L55 71L62 94|M88 72L121 71L115 94|M88 109L79 138L101 146",
    ],
    phases: ["Yüksek destek", "Dirsekleri bükerek alçal"],
    cue: "Destekten kontrollü alçal ve tekrar yukarı it. Hareket açıklığını zorlayarak artırma.",
    source: "https://gmb.io/rings/",
    props: ["M48 96H76M101 96H129", "M48 96H76M101 96H129"],
  },
  ringRow: {
    poses: [
      "130,83|M117 96L75 119L30 142|M117 96L109 42",
      "125,53|M112 66L69 105L30 142|M112 66L88 72L109 42",
    ],
    phases: ["Kollar uzun", "Göğsü ellere yaklaştır"],
    cue: "Gövde hizasını koruyarak çekiş yap. Ayak konumu zorluğu değiştirir.",
    source: "https://gmb.io/rings/",
    props: [
      "M100 0V30M118 0V30M100 30Q109 52 118 30",
      "M100 0V30M118 0V30M100 30Q109 52 118 30",
    ],
  },
  lSit: {
    poses: [support, "71,25|M72 42L72 94|M72 47L60 105|M72 94L112 94L154 94"],
    phases: ["Destek al", "Bacakları öne uzatarak tut"],
    cue: "Gövde dik, bacaklar öne uzanır. Ellerle desteği koru; tutuşu kontrollü bitir.",
    source: "https://gmb.io/l-sit/",
    props: [
      "M51 0V95M70 0V95M51 95Q60 113 70 95M105 0V95M123 0V95M105 95Q114 113 123 95",
      "M51 0V99M70 0V99M51 99Q60 117 70 99",
    ],
  },
  frontLever: hold(
    lever,
    "Asılı düz kol desteğinde gövde yataydır. Bu ileri düzey tutuşun çizimi teknik yeterlilik değerlendirmesi değildir.",
  ),
  tuckLever: hold(
    tuckLever,
    "Dizler gövdeye yaklaşır; düz bacak front lever ile aynı varyasyon değildir.",
  ),
  straddleLever: hold(
    lever + "|M95 90L120 110L151 121",
    "Bacaklar açık varyasyon. Şema derinlik ve omuz dönüşünü sadeleştirir.",
  ),
  backLever: hold(
    "30,100|M46 90L95 90|M49 90L69 52L80 20|M95 90L126 90L157 90",
    "Yüz zemine dönük, kollar gövdenin arkasında destek verir. İleri düzey omuz becerisidir; eğitmenle çalışılır.",
  ),
  planche: hold(
    planche,
    "Düz kollu destekte ayaklar yerden kesilir; bu ileri düzey beceri basit şınav değildir.",
  ),
  tuckPlanche: hold(
    tuckPlanche,
    "Dizler bükülü, ayaklar yerden kesik düz kol desteği.",
  ),
  straddlePlanche: hold(
    planche + "|M80 92L48 113L18 128",
    "Bacaklar açık planche tutuşu. Şema derinliği sadeleştirir.",
  ),
  handstand: hold(
    "90,125|M90 108L90 64|M90 104L62 143|M90 104L118 143|M90 64L79 18|M90 64L102 18",
    "Eller yerde, gövde ters dikey destekte. Denge ve güvenli çıkış eğitimi gerekir.",
  ),
  support: hold(
    support,
    "Düz kollu halka desteğinde gövdeyi kontrol et. Halkaların dönüş açısı çizimde ayrıntılandırılmaz.",
  ),
  muscleUp: {
    poses: [hanging, support],
    phases: ["Çekiş bölümü", "Geçiş sonrası destek"],
    cue: "Çekiş, geçiş ve itiş bölümleri olan ileri düzey beceri. Çizim yalnız başlangıç/son desteği gösterir; geçiş tekniğinin tamamı değildir.",
    source: "https://gmb.io/rings/",
  },
  run: {
    poses: [
      "87,22|M88 40L79 88|M88 48L111 69L128 52|M88 48L60 64L45 43|M79 88L115 111L132 143|M79 88L55 110L78 121",
      "87,22|M88 40L79 88|M88 48L110 39L127 61|M88 48L58 72L43 62|M79 88L114 78L135 103|M79 88L62 120L37 143",
    ],
    phases: ["Bir adım", "Diğer adım"],
    cue: "Şema adım döngüsünü gösterir. Tempo, eğim ve interval yapısı hareketin planındaki süre/mesafe ile belirlenir; çizim ideal koşu tekniği ölçümü değildir.",
  },
  bench: {
    poses: [
      "145,111|M129 121L80 121L62 102L38 145|M128 121L112 97L130 74",
      "145,111|M129 121L80 121L62 102L38 145|M128 121L128 87L128 50",
    ],
    phases: ["Göğüs üzerinde hazırlan", "Yukarı it"],
    cue: "Sırt destekli itiş örüntüsü. Yük, kavrama ve güvenlik desteği kişisel olarak ayarlanır.",
    props: [
      "M65 135H153M74 135V150M147 135V150",
      "M65 135H153M74 135V150M147 135V150",
    ],
  },
};
const bindings: Record<string, string> = {};
function bind(template: string, ids: string) {
  for (const id of ids.split(" ")) bindings[id] = template;
}
bind("hinge", "rdl single-leg-rdl dumbbell-rdl ez-bar-rdl barbell-deadlift");
bind("row", "ez-bar-row dumbbell-row barbell-row");
bind("press", "ohp dumbbell-overhead-press ez-bar-overhead-press");
bind("curl", "ez-bar-curl db-hammer-curl");
bind("extension", "triceps-extension ez-bar-triceps-extension");
bind("lateral", "db-lateral-raise");
bind("calf", "calf-raise bodyweight-calf-raise");
bind("bench", "barbell-bench-press");
bind(
  "pull",
  "pull-up chin-up ring-pull-up ring-chin-up weighted-pull-up ring-archer-pull-up",
);
bind("dip", "ring-dip weighted-ring-dip");
bind(
  "ringRow",
  "ring-row feet-elevated-ring-row ring-face-pull ring-rear-delt-row",
);
bind("lSit", "ring-l-sit");
bind("frontLever", "front-lever ring-front-lever");
bind("tuckLever", "tuck-front-lever ring-tuck-front-lever");
bind("straddleLever", "straddle-front-lever ring-straddle-front-lever");
bind("backLever", "back-lever ring-back-lever");
bind("planche", "full-planche");
bind("tuckPlanche", "tuck-planche");
bind("straddlePlanche", "straddle-planche");
bind("handstand", "handstand ring-handstand");
bind("support", "ring-support-hold ring-turned-out-support");
bind("muscleUp", "muscle-up ring-muscle-up");
bind(
  "run",
  "zone-2-run sprint hill-sprint intervals vo2-intervals tempo-run threshold-run long-run walk run-walk recovery-run steady-run fartlek-run running-strides hill-repeats trail-easy-run",
);
// Exact family references are labelled as such, not disguised as variant-specific instruction.
const references: Record<string, [string, string]> = {
  "barbell-squat": [
    "bodyweight squat",
    "Çömelme örüntüsü; bar yerleşimi çizilmez.",
  ],
  "dumbbell-goblet-squat": [
    "bodyweight squat",
    "Çömelme örüntüsü; göğüs önündeki yük çizilmez.",
  ],
  "backpack-goblet-squat": [
    "bodyweight squat",
    "Çömelme örüntüsü; yükün konumu ayrıca ayarlanır.",
  ],
  "bodyweight-split-squat": [
    "forward lunge",
    "Ayrık duruş örüntüsü; bu varyasyonda ayaklar yerinde kalır.",
  ],
  "bulgarian-split-squat": [
    "forward lunge",
    "Ayrık duruş örüntüsü; bu varyasyonda arka ayak yükseltilir.",
  ],
  "ring-push-up": [
    "push-up",
    "Yatay itiş örüntüsü; halka desteği ayrıca ayarlanır.",
  ],
  "incline-push-up": [
    "push-up",
    "Yatay itiş örüntüsü; bu varyasyonda eller yüksek destektedir.",
  ],
  "ring-archer-push-up": [
    "push-up",
    "Yatay itiş örüntüsü; asimetrik kol konumu çizilmez.",
  ],
  "ring-rto-push-up": [
    "push-up",
    "Yatay itiş örüntüsü; halka dönüş açısı çizilmez.",
  ],
};
Object.assign(templates, {
  ringCurl: {
    poses: [
      "130,83|M117 96L75 119L30 142|M117 96L109 42",
      "124,60|M112 74L69 110L30 142|M112 74L86 87L103 53",
    ],
    phases: ["Kolları aç", "Dirsekleri bükerek yaklaş"],
    cue: "Eller sabit desteği tutarken dirsekler bükülür. Halka yüksekliği ve gövde açısı zorluğu değiştirir.",
    source: "https://gmb.io/rings/",
  },
  ringExtension: {
    poses: [
      "128,72|M115 86L70 115L30 143|M115 86L144 78L130 52",
      "121,43|M110 57L68 107L30 143|M110 57L128 31",
    ],
    phases: ["Dirsek bükülü destek", "Dirsekleri aç"],
    cue: "Gövde hizasını koruyarak dirsekleri aç. Şema halka üzerinde dirsek uzatma örüntüsüdür.",
    source: "https://gmb.io/rings/",
  },
  fly: {
    poses: [
      "88,35|M88 51L88 95|M88 56L51 67L20 85|M88 56L124 67L156 85|M88 95L71 145|M88 95L106 145",
      "88,35|M88 51L88 95|M88 56L67 76L83 98|M88 56L110 76L94 98|M88 95L71 145|M88 95L106 145",
    ],
    phases: ["Kollar yanda destek", "Elleri önde birleştir"],
    cue: "Önden sadeleştirilmiş kol yolu; gövde açısı ve halka yüksekliği ayrıca ayarlanır.",
    source: "https://gmb.io/rings/",
  },
  rollout: {
    poses: [
      "120,58|M109 74L75 92|M109 74L119 116|M75 92L78 142L41 145",
      "144,84|M130 96L76 120|M130 96L160 126|M76 120L78 142L41 145",
    ],
    phases: ["Kısa destek", "Kolları öne uzat"],
    cue: "Diz desteğinden kontrollü uzanma örüntüsü. Bel hizası korunamıyorsa hareket açıklığını azalt.",
  },
  hamCurl: {
    poses: [
      "24,132|M40 142L94 134L155 132|M44 139L71 145",
      "24,132|M40 142L94 111L126 102L147 131|M44 139L71 145",
    ],
    phases: ["Bacakları uzat", "Topukları kendine çek"],
    cue: "Sırtüstü destekte dizleri bükerek topukları yaklaştır. Halka/ayak desteği sabit tutulur.",
  },
  pike: {
    poses: [
      "58,49|M58 66L60 121L145 121|M59 75L91 119",
      "68,53|M68 69L60 121L144 96|M68 79L97 111",
    ],
    phases: ["Uzun oturuş", "Bacakları öne-yukarı kaldır"],
    cue: "Oturur pozisyonda kalçadan sıkıştırma örüntüsü. Şema gövde ve bacak yönünü gösterir.",
  },
  dragon: {
    poses: [
      "27,129|M42 135L77 99L115 39|M42 135L27 101L14 115",
      "27,129|M42 135L96 120L157 103|M42 135L27 101L14 115",
    ],
    phases: ["Yüksek pozisyon", "Kontrollü alçal"],
    cue: "Omuz üstü destekli ileri düzey gövde becerisi. Baş/boyun üzerine yük vermeden eğitmenle öğrenilir.",
  },
  flag: hold(
    "52,71|M68 82L103 85L159 85|M69 82L27 38|M69 82L27 123",
    "Yan yatay gövde tutuşu. Dikey destek ve iki el konumu farklıdır; ileri düzey beceridir.",
  ),
  leverRaise: {
    poses: [hanging, lever],
    phases: ["Asılı başlangıç", "Yatay gövdeye yüksel"],
    cue: "Asılı düz kol desteğinden gövdeyi kontrollü yükseltme örüntüsü.",
    source: "https://gmb.io/rings/",
  },
  planchePush: {
    poses: [
      planche,
      "145,115|M128 122L80 122|M126 123L144 137L109 143|M80 122L47 122L19 122",
    ],
    phases: ["Planche desteği", "Dirsekleri bük"],
    cue: "Ayaklar havada yatay itiş; ileri düzey beceri. Basit şınav ilerlemesiyle eşdeğer değildir.",
  },
  lean: {
    poses: [
      "137,65|M124 77L77 102L27 141|M120 80L115 112L116 145",
      "155,75|M141 88L80 111L27 141|M141 88L116 145",
    ],
    phases: ["Yüksek destek", "Omuzları öne taşı"],
    cue: "Ayaklar yerde kalırken düz kollu destekte öne ağırlık aktarımı.",
  },
});
bind("ringCurl", "ring-biceps-curl");
bind("ringExtension", "ring-triceps-extension");
bind("fly", "ring-chest-fly");
bind("rollout", "ring-rollout");
bind("hamCurl", "ring-hamstring-curl");
bind("pike", "ring-pike-compression");
bind("dragon", "dragon-flag");
bind("flag", "human-flag");
bind("leverRaise", "front-lever-pull-raise ring-front-lever-pull-raise");
bind("planchePush", "planche-push-up");
bind("lean", "planche-lean");
references["ring-body-saw"] = [
  "front plank",
  "Plank desteğinde gövde ileri–geri kayar; halka ayak desteği çizilmez.",
];

export function catalogGuide(m: CatalogMovement): Movement | undefined {
  const exact = findMovement(m.name);
  if (exact) return exact;
  const ref = references[m.id];
  if (ref) {
    const base = findMovement(ref[0])!;
    return {
      ...base,
      id: m.id,
      name: m.displayNameTR || m.name,
      detail: ref[1],
      visualScope: "Örüntü çizimi · varyasyon ayrıntıları metinde",
    };
  }
  const t = templates[bindings[m.id]];
  if (!t) return undefined;
  return {
    id: m.id,
    name: m.displayNameTR || m.name,
    aliases: [],
    poses: t.poses,
    phases: t.phases,
    cue: t.cue,
    regions: [],
    muscles: Object.keys(m.muscles)
      .map((k) => muscleLabels[k] || k)
      .join(" · "),
    detail:
      "Ekipman: " +
      (m.equipment.join(" · ") || "Ek ekipman yok") +
      ". Şematik pozlar kişisel form değerlendirmesi değildir.",
    source:
      t.source ||
      "https://www.acefitness.org/resources/everyone/exercise-library/",
    visualScope: "Hareket örüntüsü · sadeleştirilmiş çizim",
    equipmentPaths: t.props,
  };
}
