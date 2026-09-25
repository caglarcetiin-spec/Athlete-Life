import * as THREE from "three";
import { regions, recoveryGroup, type MuscleRecovery } from "./muscleRecovery";
// Relative standing-body zones, adapted from the legacy coordinate classifier.
// These are explicitly approximate for unlabelled/one-piece surfaces.
export function classifyBody(x: number, y: number, z: number) {
  const a = Math.abs(x),
    front = z >= 0;
  if (y < 0.05 || y > 0.85) return 0;
  if (y < 0.25 && a < 0.15) return 18;
  if (y < 0.45 && a < 0.16) return front ? (a < 0.045 ? 17 : 15) : 16;
  if (y < 0.55 && a < 0.16) return front ? 19 : 14;
  if (a > 0.13 && y < 0.65) return 7;
  if (a > 0.13 && y < 0.76) return front ? 6 : 5;
  if (a > 0.085 && y > 0.73) return a > 0.15 ? 3 : front ? 2 : 4;
  if (front) return y > 0.67 ? 1 : a > 0.05 ? 13 : 12;
  if (y > 0.77) return 10;
  if (y > 0.7) return a > 0.035 ? 20 : 9;
  return a > 0.04 ? 8 : 11;
}
const classifier = `int zone(vec3 p){float a=abs(p.x);bool f=p.z>=0.;float y=p.y;
if(y<.05||y>.85)return 0;
if(y<.25&&a<.15)return 18;
if(y<.45&&a<.16)return f?(a<.045?17:15):16;
if(y<.55&&a<.16)return f?19:14;
if(a>.13&&y<.65)return 7;
if(a>.13&&y<.76)return f?6:5;
if(a>.085&&y>.73)return a>.15?3:f?2:4;
if(f)return y>.67?1:a>.05?13:12;
if(y>.77)return 10;
if(y>.7)return a>.035?20:9;
return a>.04?8:11;}`;
const aliases: Record<string, string[]> = {
  chest: ["pectoralis", "chest"],
  lats: ["latissimus", "lats"],
  traps: ["trapezius", "traps"],
  biceps: ["bicepsbrachii", "biceps"],
  triceps: ["triceps"],
  quads: ["quadriceps", "rectusfemoris", "vastus"],
  hamstrings: [
    "hamstring",
    "bicepsfemoris",
    "semitendinosus",
    "semimembranosus",
  ],
  glutes: ["glute"],
  calves: ["gastrocnemius", "soleus", "calves"],
  abs: ["rectusabdominis", "abdominal"],
  obliques: ["oblique"],
  lowerBack: [
    "erectorspinae",
    "spinalerector",
    "iliocostalis",
    "longissimus",
    "spinalis",
    "multifidus",
  ],
  adductors: ["adductor"],
  frontDelts: ["anteriordeltoid", "frontdelt", "clavicularpartofdeltoid"],
  rearDelts: ["posteriordeltoid", "reardelt", "scapularspinalpartofdeltoid"],
  sideDelts: ["lateraldeltoid", "middledeltoid", "acromialpartofdeltoid"],
  scapular: [
    "rhomboid",
    "serratusanterior",
    "infraspinatus",
    "supraspinatus",
    "subscapularis",
    "teresminor",
  ],
  forearms: [
    "brachioradialis",
    "forearm",
    "carpi",
    "palmaris",
    "flexordigitorum",
    "extensordigitorum",
  ],
  hipFlexors: ["iliopsoas"],
};
export const isSupportStructure = (name: string) =>
  /fascia|bursa|tendon|retinacul|aponeuros|sheath|ligament|raphe|membrane|septum/i.test(
    name,
  );
export type AnatomicalSurface = {
  id: string;
  name: string;
  region: string;
  support: boolean;
};
export function namedRegion(name: string) {
  if (isSupportStructure(name)) return -1;
  const text = name.toLowerCase().replace(/[^a-z]/g, "");
  // The more specific hamstring name must precede the generic "biceps".
  if (text.includes("bicepsfemoris")) return regions.indexOf("hamstrings");
  return regions.findIndex((key) =>
    aliases[key]?.some((alias) => text.includes(alias)),
  );
}
export function attachOverlay(
  model: THREE.Object3D,
  bounds: THREE.Box3,
  approximate = true,
) {
  const surfaces: AnatomicalSurface[] = [];
  const surfaceMaterials = new Map<string, THREE.Material>();
  const surfaceMeshes = new Map<string, THREE.Mesh>();
  const focus = { value: -1 };
  const origin = new THREE.Vector3(
    (bounds.min.x + bounds.max.x) / 2,
    bounds.min.y,
    (bounds.min.z + bounds.max.z) / 2,
  );
  const height = Math.max(0.001, bounds.max.y - bounds.min.y);
  const colors = {
    value: regions.map(() => new THREE.Vector3(0.42, 0.46, 0.48)),
  };
  const selected = { value: 0 },
    enabled = { value: 1 };
  const originals: {
    mesh: THREE.Mesh;
    material: THREE.Material | THREE.Material[];
  }[] = [];
  let named = 0,
    total = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    total++;
    const anatomicalName = String(
      node.userData.za_name || node.parent?.userData.za_name || node.name,
    );
    let id = namedRegion(anatomicalName);
    if (id < 1 && node.parent) id = namedRegion(node.parent.name);
    node.userData.bodyRegion = id;
    originals.push({ mesh: node, material: node.material });
    const materialRegions: number[] = [];
    const materials = (
      Array.isArray(node.material) ? node.material : [node.material]
    ).map((source, materialIndex) => {
      const materialId = namedRegion(source.name);
      const resolvedId = materialId > 0 ? materialId : id;
      materialRegions.push(resolvedId);
      const material = source.clone();
      const surfaceId = node.uuid + ":" + materialIndex;
      const surfaceIndex = surfaces.length;
      const label =
        anatomicalName || source.name || `Yüzey ${surfaceIndex + 1}`;
      const matching = approximate
        ? -1
        : surfaces.findIndex((s) => s.name === label);
      const highlightIndex = matching < 0 ? surfaceIndex : matching;
      surfaces.push({
        id: surfaceId,
        name: label,
        region: regions[Math.max(0, resolvedId)] || "",
        support: isSupportStructure(label),
      });
      surfaceMaterials.set(surfaceId, material);
      surfaceMeshes.set(surfaceId, node);
      material.onBeforeCompile = (
        shader: THREE.WebGLProgramParametersWithUniforms,
      ) => {
        Object.assign(shader.uniforms, {
          bodyColors: colors,
          bodySelected: selected,
          bodyEnabled: enabled,
          bodyOrigin: { value: origin },
          bodyHeight: { value: height },
          bodyNamed: { value: Math.max(0, resolvedId) },
          bodyFallback: {
            value: approximate && !isSupportStructure(label) ? 1 : 0,
          },
          bodySurface: { value: highlightIndex },
          bodyFocus: focus,
        });
        shader.vertexShader = "varying vec3 bodyPoint;\n" + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <project_vertex>",
          `#include <project_vertex>
vec4 bodyWorldPosition = vec4(transformed,1.);
#ifdef USE_BATCHING
bodyWorldPosition = batchingMatrix * bodyWorldPosition;
#endif
#ifdef USE_INSTANCING
bodyWorldPosition = instanceMatrix * bodyWorldPosition;
#endif
bodyPoint = (modelMatrix * bodyWorldPosition).xyz;`,
        );
        shader.fragmentShader =
          "varying vec3 bodyPoint; uniform vec3 bodyColors[21]; uniform float bodySelected; uniform float bodyEnabled; uniform vec3 bodyOrigin; uniform float bodyHeight; uniform int bodyNamed; uniform int bodyFallback; uniform int bodySurface; uniform float bodyFocus;\n" +
          classifier +
          "\n" +
          shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
int bodyId=bodyNamed>0?bodyNamed:(bodyFallback>0?zone((bodyPoint-bodyOrigin)/bodyHeight):0);
if(bodyEnabled>.5 && bodyId>0){vec3 tint=bodyColors[bodyId]; float blend=bodySelected==float(bodyId)?.85:.65; diffuseColor.rgb=mix(diffuseColor.rgb,tint,blend);}
if(bodyFocus==float(bodySurface)) diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.74,.3),.45);`,
        );
      };
      material.customProgramCacheKey = () => "body-overlay-1";
      return material;
    });
    node.userData.bodyMaterialRegions = materialRegions;
    if (id > 0 || materialRegions.some((value) => value > 0)) named++;
    node.material = Array.isArray(node.material) ? materials : materials[0];
  });
  return {
    named,
    total,
    surfaces,
    surface(point: THREE.Vector3, object: THREE.Object3D, materialIndex = 0) {
      void point;
      const found = surfaces.find(
        (s) => s.id === object.uuid + ":" + materialIndex,
      );
      return approximate ? found : surfaces.find((s) => s.name === found?.name);
    },
    bounds(id: string) {
      const chosen = surfaces.find((s) => s.id === id);
      if (!chosen) return undefined;
      const box = new THREE.Box3();
      for (const s of surfaces) {
        if (s.id === id || (!approximate && s.name === chosen.name)) {
          const mesh = surfaceMeshes.get(s.id);
          if (mesh) box.union(new THREE.Box3().setFromObject(mesh));
        }
      }
      return box;
    },
    pick(point: THREE.Vector3, object: THREE.Object3D, materialIndex = 0) {
      const id = Number(
        object.userData.bodyMaterialRegions?.[materialIndex] ??
          object.userData.bodyRegion,
      );
      const p = point.clone().sub(origin).divideScalar(height);
      return (
        regions[id > 0 ? id : approximate ? classifyBody(p.x, p.y, p.z) : 0] ||
        ""
      );
    },
    update(
      report: MuscleRecovery | undefined,
      key: string,
      mode: string,
      surfaceId = "",
      isolate = false,
      musclesOnly = false,
    ) {
      const chosen = surfaces.find((s) => s.id === surfaceId);
      focus.value = surfaces.findIndex(
        (s) => s.id === surfaceId || (!approximate && s.name === chosen?.name),
      );
      for (const s of surfaces) {
        const material = surfaceMaterials.get(s.id);
        if (material)
          material.visible =
            (!isolate ||
              !surfaceId ||
              surfaceId === s.id ||
              (!approximate && s.name === chosen?.name)) &&
            (!musclesOnly || !s.support);
      }
      selected.value = Math.max(0, regions.indexOf(key));
      enabled.value = mode === "original" ? 0 : 1;
      colors.value = regions.map((group) => {
        const state = recoveryGroup(report, group);
        if (!state) return new THREE.Vector3(0.42, 0.46, 0.48);
        const fatigue = (state.fatigue.low + state.fatigue.high) / 200;
        const c = new THREE.Color().setHSL((1 - fatigue) * 0.32, 0.7, 0.45);
        return new THREE.Vector3(c.r, c.g, c.b);
      });
    },
    dispose() {
      for (const { mesh, material } of originals) {
        for (const m of Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material])
          m.dispose();
        mesh.material = material;
      }
    },
  };
}
