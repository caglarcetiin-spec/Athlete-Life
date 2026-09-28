export const branchMethods = [
  "sport_technique",
  "sport_practice",
  "sport_tactics",
];
export function enduranceOnly(methods: string[]) {
  return (
    methods.some((m) => ["running", "swimming"].includes(m)) &&
    methods.every((m) => ["running", "swimming", "conditioning"].includes(m))
  );
}
export function nextMethods(current: string[], key: string) {
  const base =
    current.length === 1 &&
    current[0] === "weights" &&
    ["running", "swimming"].includes(key)
      ? []
      : current;
  const methods = base.includes(key)
    ? base.filter((m) => m !== key)
    : [...base, key];
  return {
    methods,
    split: methods.some((m) => branchMethods.includes(m))
      ? "sport_days"
      : enduranceOnly(methods)
        ? "endurance_days"
        : "full_body",
  };
}
export function focusOptions(
  methods: string[],
  combat: boolean,
): [string, string][] {
  if (methods.includes("running"))
    return [
      ["aerobic_base", "Rahat koşu dayanıklılığı"],
      ["distance", "Daha uzun mesafe"],
      ["pace", "Hedef mesafede tempo"],
      ["speed", "Kısa hızlanma kalitesi"],
      ["hills", "Yokuş / patika"],
      ["consistency", "Düzenli koşu alışkanlığı"],
    ];
  if (combat)
    return [
      ["footwork", "Ayak çalışması ve mesafe"],
      ["defence", "Savunma"],
      ["combinations", "Teknik kombinasyonlar"],
      ["round_endurance", "Raunt dayanıklılığı"],
      ["speed", "Hız ve zamanlama"],
      ["tactics", "Taktik kararlar"],
    ];
  if (methods.includes("swimming"))
    return [
      ["aerobic_base", "Yüzme dayanıklılığı"],
      ["distance", "Daha uzun mesafe"],
      ["pace", "Mesafeye göre tempo"],
      ["technique_quality", "Kulaç ve dönüş tekniği"],
      ["consistency", "Düzenli yüzme alışkanlığı"],
    ];
  return [
    ["technique_quality", "Teknik kalite"],
    ["coordination", "Koordinasyon"],
    ["consistency", "Düzenli çalışma"],
    ["tactics", "Taktik kararlar"],
    ["mobility", "Hareket kontrolü"],
  ];
}
export const runningEquipment: [string, string][] = [
  ["Road", "Yol / düz parkur"],
  ["Track", "Atletizm pisti"],
  ["Park", "Park"],
  ["Trail", "Patika"],
  ["Hill", "Yokuş"],
  ["Treadmill", "Koşu bandı"],
  ["Incline Treadmill", "Eğimli koşu bandı"],
  ["Outdoor", "Diğer açık alan"],
  ["Running Shoes", "Koşu ayakkabısı"],
  ["GPS Watch", "GPS saati (isteğe bağlı)"],
  ["Heart Rate Monitor", "Nabız sensörü (isteğe bağlı)"],
];
export const combatEquipment: [string, string][] = [
  ["Boxing Gloves", "Boks eldiveni"],
  ["Hand Wraps", "El bandajı"],
  ["Punching Bag", "Kum torbası"],
  ["Focus Mitts", "Lapa"],
  ["Jump Rope", "Atlama ipi"],
  ["Mat", "Minder / tatami"],
  ["Protective Gear", "Branşa uygun koruyucu ekipman"],
];
export const swimmingEquipment: [string, string][] = [
  ["Pool", "Yüzme havuzu"],
  ["Swim Goggles", "Yüzücü gözlüğü"],
  ["Kickboard", "Ayak tahtası"],
  ["Pull Buoy", "Pull buoy"],
  ["Swim Fins", "Yüzme paleti"],
];
