export type Movement = {
  id: string; name: string; aliases: string[]; muscles: string; regions: string[];
  phases: [string, string]; poses: [string, string]; cue: string; detail: string; source: string;
};
const source = "https://www.acefitness.org/resources/everyone/exercise-library/";
export const movements: Movement[] = [
  { id: "squat", name: "Vücut ağırlığıyla squat", aliases: ["squat", "bodyweight squat", "vücut ağırlığıyla squat", "çömelme"],
    muscles: "Ön bacak · kalça", regions: ["quads", "glutes"], phases: ["Ayakta başla", "Kontrollü alçal"],
    poses: ["91,24|M90 42L85 91|M87 51L120 63|M85 91L85 121L90 145|M85 91L68 120L67 145", "109,51|M103 67L74 105|M101 74L141 75|M74 105L112 114L109 145|M74 105L96 121L90 145"],
    cue: "Kalçanı geriye ve aşağıya götür; ayağının tamamını yerde tut. Kontrollü biçimde tekrar doğrul.", detail: "Dizlerin ayaklarınla aynı yönde ilerlesin. Rahat ve kontrol edebildiğin derinliği kullan.", source: source + "135/bodyweight-squat/" },
  { id: "pushup", name: "Şınav", aliases: ["şınav", "push up", "pushup"], muscles: "Göğüs · arka kol · ön omuz", regions: ["chest", "triceps", "shoulders"], phases: ["Yüksek destek", "Göğsünü yaklaştır"],
    poses: ["137,65|M124 77L77 102L27 141|M120 80L115 112L116 145|M29 142L20 146", "142,111|M125 118L76 128L26 141|M121 119L137 135L116 145|M28 142L20 146"],
    cue: "Ellerin yerde, gövden bir çizgide olsun. Dirseklerini bükerek alçal, zemini iterek yüksel.", detail: "Belini çökertmeden ve nefesini tutmadan ilerle. Çizim standart yerde şınav içindir.", source: source + "41/push-up/" },
  { id: "bridge", name: "Kalça köprüsü", aliases: ["glute bridge", "kalça köprüsü", "floor bridge"], muscles: "Kalça · gövde", regions: ["glutes", "core"], phases: ["Sırtüstü hazırlan", "Kalçanı yükselt"],
    poses: ["28,132|M44 141L91 141L119 103L143 145|M48 139L75 145", "28,132|M44 141L93 111L122 104L143 145|M48 139L75 145"],
    cue: "Dizlerin bükülü ve ayakların yerde olsun. Kalçanı kaldır, ardından kontrollü indir.", detail: "Üst noktada beli aşırı yaylandırmadan omuz, kalça ve diz hattını koru.", source: source + "49/glute-bridge/" },
  { id: "plank", name: "Ön kol plank", aliases: ["plank", "front plank", "ön kol plank"], muscles: "Karın · sırt stabilizatörleri", regions: ["core", "back"], phases: ["Ön kolları yerleştir", "Hizayı koruyarak tut"],
    poses: ["137,73|M124 87L79 98L69 143L36 144|M123 88L122 145L148 145", "142,90|M126 103L76 119L25 143|M125 104L120 145L146 145|M25 144L18 147"],
    cue: "Dirseklerini omuzlarının altına yerleştir. Dizlerini kaldırıp gövde hizanı sabit tut.", detail: "Bu bir tekrar hareketi değil, sabit tutuştur. Nefes almaya devam et; kalçanı düşürme.", source: source + "32/front-plank/" },
  { id: "lunge", name: "Öne hamle", aliases: ["lunge", "forward lunge", "öne hamle"], muscles: "Ön bacak · kalça", regions: ["quads", "glutes"], phases: ["Ayakta hazırlan", "Adım at ve alçal"],
    poses: ["88,24|M87 42L87 89|M87 50L105 79|M87 89L71 117L70 145|M87 89L99 117L102 145", "92,49|M92 67L88 105|M92 76L112 96|M88 105L128 108L133 145|M88 105L62 137L32 135"],
    cue: "Öne adım atıp iki dizini kontrollü bük. Ön ayağından güç alarak başlangıca dön.", detail: "Gövdeni dik tut; ön dizin ayak yönünde ilerlesin. Diğer tarafla da çalış.", source: source + "94/forward-lunge/" },
  { id: "bird-dog", name: "Bird dog", aliases: ["bird dog", "bird-dog"], muscles: "Gövde · sırt · kalça", regions: ["core", "back", "glutes"], phases: ["Dört ayak desteği", "Karşı kol ve bacağı uzat"],
    poses: ["135,66|M121 81L73 82|M120 84L119 145|M74 84L77 139L49 144", "131,67|M117 82L77 83|M116 84L115 145|M78 85L79 140L52 145|M118 82L157 78|M77 82L29 78"],
    cue: "Eller ve dizler üzerinde başla. Bir kolunu ve karşı bacağını uzat; kontrollü geri getir.", detail: "Kalçanı döndürmeden dengeyi koru. Çizim yandan görünümü gösterir; uzanan kol ve bacak karşı taraflardadır.", source: source + "14/bird-dog/" },
];
function normalize(value: string) { return value.trim().toLocaleLowerCase("tr-TR").replace(/[-_]+/g, " ").replace(/\s+/g, " "); }
export function findMovement(name: string, variant: string = "standard") {
  if (!["", "standard", "standart"].includes(normalize(variant))) return undefined;
  return movements.find(item => item.aliases.some(alias => normalize(alias) === normalize(name)));
}
