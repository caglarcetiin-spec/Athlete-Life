import { branchMethods, enduranceOnly } from "./planningJourney";
export type BranchProfile = {
  sport_id: string;
  name: string;
  native_method?: string | null;
  automatic_physical_dose: boolean;
  method_options: {
    id: string;
    label: string;
    description: string;
    automatic: boolean;
  }[];
};
export type Selection = {
  sport_ids: string[];
  methods: string[];
  sport_methods: Record<string, string[]>;
};
export function branchMap(state: Selection) {
  return Object.fromEntries(
    state.sport_ids.map((id) => [
      id,
      state.sport_methods?.[id] ??
        state.methods.filter((m) => branchMethods.includes(m)),
    ]),
  );
}
export function activeBranches(state: Selection) {
  const map = branchMap(state);
  return state.sport_ids.filter((id) => map[id].length > 0);
}
function reconciled(
  ids: string[],
  support: string[],
  map: Record<string, string[]>,
) {
  const methods = [...new Set([...support, ...Object.values(map).flat()])];
  return {
    sport_ids: ids,
    sport_methods: map,
    methods,
    split: methods.some((m) => branchMethods.includes(m))
      ? "sport_days"
      : enduranceOnly(methods)
        ? "endurance_days"
        : "full_body",
  };
}
export function addBranch(state: Selection, profile: BranchProfile) {
  if (state.sport_ids.includes(profile.sport_id)) return state;
  const support =
    state.sport_ids.length === 0 && state.methods.join() === "weights"
      ? []
      : state.methods.filter((m) => !branchMethods.includes(m));
  if (profile.native_method) support.push(profile.native_method);
  return reconciled([...state.sport_ids, profile.sport_id], support, {
    ...branchMap(state),
    [profile.sport_id]: profile.native_method
      ? []
      : [profile.automatic_physical_dose ? "sport_technique" : "sport_tactics"],
  });
}
export function toggleBranchMethod(
  state: Selection,
  sport: string,
  method: string,
) {
  const map = branchMap(state),
    selected = map[sport] || [];
  map[sport] = selected.includes(method)
    ? selected.filter((m) => m !== method)
    : [...selected, method];
  return reconciled(
    state.sport_ids,
    state.methods.filter((m) => !branchMethods.includes(m)),
    map,
  );
}
export function removeBranch(state: Selection, sport: string) {
  const map = branchMap(state);
  delete map[sport];
  return reconciled(
    state.sport_ids.filter((id) => id !== sport),
    state.methods.filter((m) => !branchMethods.includes(m)),
    map,
  );
}
export const supportMethods: [string, string, string][] = [
  [
    "weights",
    "Ağırlık çalışması",
    "Bar, EZ bar, dambıl ve temel kuvvet hareketleri.",
  ],
  [
    "calisthenics",
    "Kalistenik",
    "Vücut ağırlığı, barfiks ve halka çalışmaları.",
  ],
  [
    "gymnastics",
    "Jimnastik becerileri",
    "Kontrollü tutuş ve bildiğin teknik beceriler.",
  ],
  [
    "running",
    "Koşu çalışması",
    "Kolay, tempo, interval ve diğer koşu türleri.",
  ],
  ["swimming", "Yüzme çalışması", "Havuz ve bildiğin yüzme stilleri."],
  ["conditioning", "Kondisyon", "Yürüyüş ve uygun koşu çalışmaları."],
  [
    "explosive_power",
    "Patlayıcı güç",
    "Bildiğin sıçrama ve sağlık topu hareketleri.",
  ],
];
