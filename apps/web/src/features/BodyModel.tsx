import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { api } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import { attachOverlay, type AnatomicalSurface } from "./bodyOverlay";
import {
  muscleNames,
  regions,
  rangeText,
  recoveryGroup,
  type MuscleRecovery,
} from "./muscleRecovery";
function disposeModel(scene: THREE.Object3D) {
  scene.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      for (const material of Array.isArray(node.material)
        ? node.material
        : [node.material]) {
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    }
  });
}
export default function BodyModel({
  store,
  recovery,
  asOf,
  context,
  frozen,
  exposure,
  pending,
  error,
  onNow,
}: {
  store: SyncStore;
  recovery?: MuscleRecovery;
  asOf?: string;
  context?: string[];
  frozen?: boolean;
  exposure?: Record<
    string,
    Record<string, { low: number; high: number; unit: string }>
  >;
  pending?: boolean;
  error?: string;
  onNow: () => void;
}) {
  const preferenceKey = "alos-body-view:" + store.me.athlete_id;
  const [initial] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(preferenceKey) || "{}") as {
        source?: string;
        axis?: string;
        flipped?: boolean;
      };
    } catch {
      return {};
    }
  });
  const [source, setSource] = useState(
    initial.source === "atlas" ? "atlas" : "personal",
  );
  const [library, setLibrary] = useState<{ available: boolean; name?: string }>(
    { available: false },
  );
  const [surfaces, setSurfaces] = useState<AnatomicalSurface[]>([]);
  const [surfaceId, setSurfaceId] = useState("");
  const [search, setSearch] = useState("");
  const [isolate, setIsolate] = useState(false);
  const [musclesOnly, setMusclesOnly] = useState(true);
  const focusSurface = useRef<() => void>(() => {});
  const selectedSurface = surfaces.find((s) => s.id === surfaceId);
  const [selected, setSelected] = useState("lats");
  const [mode, setMode] = useState("load");
  const [axis, setAxis] = useState(initial.axis || "auto");
  const [flipped, setFlipped] = useState(initial.flipped || false);
  const updateOverlay = useRef<() => void>(() => {});
  const orientModel = useRef<() => void>(() => {});
  const current = useRef({
    recovery,
    selected,
    mode,
    axis,
    flipped,
    surfaceId,
    isolate,
    musclesOnly,
  });
  current.current = {
    recovery,
    selected,
    mode,
    axis,
    flipped,
    surfaceId,
    isolate,
    musclesOnly,
  };
  useEffect(() => {
    try {
      localStorage.setItem(
        preferenceKey,
        JSON.stringify({ source, axis, flipped }),
      );
    } catch {
      /* Display preferences only. */
    }
  }, [preferenceKey, source, axis, flipped]);
  useEffect(() => {
    updateOverlay.current();
  }, [recovery, selected, mode, surfaceId, isolate, musclesOnly]);
  useEffect(() => {
    orientModel.current();
  }, [axis, flipped]);
  const activeRegion =
    source === "atlas" && selectedSurface ? selectedSurface.region : selected;
  const detail = recoveryGroup(recovery, activeRegion);

  const [uploadNotice, setUploadNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const revision = store
    .view("media")
    .filter((row) => row.mime === "model/gltf-binary")
    .map((row) => row.id + ":" + row.version)
    .sort()
    .join("|");
  const uploadIdentity = useRef<{
    key: string;
    operation: string;
    entity: string;
  } | null>(null);
  async function upload(file: File) {
    setUploading(true);
    try {
      if (
        !file.name.toLowerCase().endsWith(".glb") ||
        file.size > 96 * 1024 * 1024
      )
        throw Error("En fazla 96 MB boyutunda GLB dosyası seç.");
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (uploadIdentity.current?.key !== key)
        uploadIdentity.current = {
          key,
          operation: crypto.randomUUID(),
          entity: crypto.randomUUID(),
        };
      const params = new URLSearchParams({
        operation_id: uploadIdentity.current.operation,
        entity_id: uploadIdentity.current.entity,
        name: file.name.slice(0, 150),
      });
      setUploadNotice("Model yükleniyor · %0");
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/v2/body-model/upload?" + params);
        request.setRequestHeader("Content-Type", "model/gltf-binary");
        request.setRequestHeader("X-CSRF-Token", store.me.csrf);
        request.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadNotice(
              percent < 100
                ? `Model yükleniyor · %${percent}`
                : "Dosya gönderildi; sunucu kaydı doğrulanıyor…",
            );
          }
        };
        request.onerror = () =>
          reject(
            Error(
              "Bağlantı kesildi. Aynı dosyayı yeniden seçerek güvenle tekrar deneyebilirsin.",
            ),
          );
        request.onload = () => {
          if (request.status >= 200 && request.status < 300) resolve();
          else {
            let message =
              "Model kaydedilemedi. Aynı dosyayla yeniden deneyebilirsin.";
            try {
              message =
                JSON.parse(request.responseText).error?.message || message;
            } catch {
              /* Non-JSON proxy response. */
            }
            reject(Error(message));
          }
        };
        request.send(file);
      });
      setUploadNotice(
        "Model sunucuya kaydedildi. Kütüphanende diğer cihazlarından da açabilirsin.",
      );
      setSource("personal");
      setAxis("auto");
      setFlipped(false);
      setAttempt((value) => value + 1);
      await store.sync();
    } catch (error) {
      setUploadNotice((error as Error).message);
    } finally {
      setUploading(false);
    }
  }
  const mount = useRef<HTMLDivElement>(null),
    actions = useRef<(angle: number) => void>(() => {});
  const [attempt, setAttempt] = useState(0),
    [status, setStatus] = useState("3B kütüphanesi kontrol ediliyor…"),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    let cancelled = false,
      renderer: THREE.WebGLRenderer | undefined,
      controls: OrbitControls | undefined,
      observer: ResizeObserver | undefined,
      model: THREE.Object3D | undefined,
      overlay: ReturnType<typeof attachOverlay> | undefined;
    setReady(false);
    setSurfaces([]);
    setSurfaceId("");
    setIsolate(false);
    setFailed(false);
    setStatus("3B kütüphanesi kontrol ediliyor…");
    async function load() {
      const info = (await api("body-model")) as {
        available: boolean;
        message?: string;
        url?: string;
        bytes?: number;
        name?: string;
      };
      if (cancelled) return;
      setLibrary({ available: info.available, name: info.name });
      if (!info.available && source === "personal") {
        setSource("atlas");
        setAxis("auto");
        setFlipped(false);
        return;
      }
      if (!mount.current) return;
      setStatus("Kütüphanendeki model yükleniyor…");
      const response = await fetch(
        source === "atlas"
          ? "/anatomy/muscles.glb"
          : "/api/v2/body-model/content",
        {
          credentials: "same-origin",
          signal: abort.signal,
        },
      );
      if (!response.ok)
        throw Error("Model alınamadı. Kayıtlar ve 2B harita kullanılabilir.");
      const buffer = await response.arrayBuffer();
      if (cancelled) return;
      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        if (
          url.startsWith("blob:") ||
          /^data:(?:image\/(?:png|jpeg|webp)|application\/octet-stream);base64,/.test(
            url,
          )
        )
          return url;
        throw Error(
          "Modelin harici dosya bağlantısı var; bağımsız GLB gerekli.",
        );
      });
      const gltf = await new GLTFLoader(manager).parseAsync(buffer, "");
      if (source === "atlas") {
        gltf.scene.updateMatrixWorld(true);
        const meshes: THREE.Mesh[] = [];
        gltf.scene.traverse((node) => {
          if (node instanceof THREE.Mesh) meshes.push(node);
        });
        for (const mesh of meshes) {
          let ancestor: THREE.Object3D | null = mesh;
          while (ancestor && !ancestor.userData.za_name)
            ancestor = ancestor.parent;
          if (ancestor) mesh.userData.za_name = ancestor.userData.za_name;
        }
        for (const mesh of meshes) gltf.scene.attach(mesh);
      }
      model = new THREE.Group();
      model.add(gltf.scene);
      if (cancelled) {
        disposeModel(model);
        return;
      }
      const scene = new THREE.Scene();
      scene.add(model);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x43584b, 2.5));
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(3, 5, 4);
      scene.add(light);
      const bounds = new THREE.Box3().setFromObject(model),
        size = bounds.getSize(new THREE.Vector3());
      if (!Number.isFinite(size.length()) || size.length() === 0)
        throw Error("Modelin görünür geometrisi bulunamadı.");

      const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
      camera.position.set(0, 0, 3.4);
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.domElement.setAttribute(
        "aria-label",
        "Kütüphanedeki 3B model; kamera düğmeleri ile döndürülebilir",
      );
      renderer.domElement.setAttribute("role", "img");
      mount.current.appendChild(renderer.domElement);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false;
      controls.minDistance = 1;
      controls.maxDistance = 8;
      controls.enableDamping = false;
      const draw = () => {
        if (!cancelled && renderer) renderer.render(scene, camera);
      };
      controls.addEventListener("change", draw);
      updateOverlay.current = () => {
        overlay?.update(
          current.current.recovery,
          current.current.selected,
          current.current.mode,
          current.current.surfaceId,
          current.current.isolate,
          source === "atlas" && current.current.musclesOnly,
        );
        draw();
      };
      orientModel.current = () => {
        if (!model) return;
        overlay?.dispose();
        model.position.set(0, 0, 0);
        model.scale.set(1, 1, 1);
        model.rotation.set(0, 0, 0);
        const vertical =
          current.current.axis === "auto"
            ? size.z > size.y && size.z > size.x
              ? "z"
              : "y"
            : current.current.axis;
        if (vertical === "z") model.rotation.x = -Math.PI / 2;
        if (vertical === "x") model.rotation.z = Math.PI / 2;
        if (current.current.flipped)
          model.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), Math.PI);
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model),
          extent = box.getSize(new THREE.Vector3());
        const scale = 2 / Math.max(extent.x, extent.y, extent.z);
        model.position
          .copy(box.getCenter(new THREE.Vector3()))
          .multiplyScalar(-scale);
        model.scale.setScalar(scale);
        model.updateMatrixWorld(true);
        overlay = attachOverlay(
          model,
          new THREE.Box3().setFromObject(model),
          source !== "atlas",
        );
        setSurfaces(overlay.surfaces);
        focusSurface.current = () => {
          const box = overlay?.bounds(current.current.surfaceId);
          if (!box) return;
          const center = box.getCenter(new THREE.Vector3()),
            extent = box.getSize(new THREE.Vector3());
          controls?.target.copy(center);
          camera.position
            .copy(center)
            .add(new THREE.Vector3(0, 0, Math.max(0.2, extent.length() * 1.8)));
          controls?.update();
          draw();
        };
        setStatus(
          source === "atlas"
            ? `Ayrıntılı anatomik atlas · ${overlay.surfaces.length} seçilebilir yüzey. Kas alt yapıları ayrı seçilir; yük yüzdesi ait olduğu kas grubunun ortak tahminidir.`
            : `Kayıtlı model açık · ${overlay.named}/${overlay.total} parça adıyla eşleşti. Adsız yüzeylerde boyama yaklaşık bölgeseldir. Ayrıntılı kas yapıları için anatomik atlası seçebilirsin.`,
        );
        updateOverlay.current();
      };
      orientModel.current();
      const ray = new THREE.Raycaster();
      let down = { x: 0, y: 0 };
      renderer.domElement.onpointerdown = (event) => {
        down = { x: event.clientX, y: event.clientY };
      };
      renderer.domElement.onpointerup = (event) => {
        if (
          !renderer ||
          !model ||
          Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5
        )
          return;
        const rect = renderer.domElement.getBoundingClientRect();
        ray.setFromCamera(
          new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            (-(event.clientY - rect.top) / rect.height) * 2 + 1,
          ),
          camera,
        );
        const hit = ray.intersectObject(model, true).find((hit) => {
          if (!(hit.object instanceof THREE.Mesh)) return false;
          const materials = hit.object.material;
          return (
            Array.isArray(materials)
              ? materials[hit.face?.materialIndex || 0]
              : materials
          )?.visible;
        });
        if (hit) {
          const key = overlay?.pick(
            hit.point,
            hit.object,
            hit.face?.materialIndex,
          );
          if (key) setSelected(key);
          const surface = overlay?.surface(
            hit.point,
            hit.object,
            hit.face?.materialIndex,
          );
          if (surface) setSurfaceId(surface.id);
        }
      };
      const resize = () => {
        if (!renderer || !mount.current) return;
        const width = mount.current.clientWidth;
        renderer.setSize(width, 400);
        camera.aspect = width / 400;
        camera.updateProjectionMatrix();
        draw();
      };
      observer = new ResizeObserver(resize);
      observer.observe(mount.current);
      actions.current = (angle) => {
        controls?.target.set(0, 0, 0);
        camera.position.set(Math.sin(angle) * 3.4, 0, Math.cos(angle) * 3.4);
        controls?.update();
        draw();
      };
      resize();
      setReady(true);
    }
    void load().catch((error) => {
      if (!cancelled) {
        setFailed(true);
        setStatus(
          error instanceof Error
            ? error.message
            : "3B görüntü açılamadı. Diğer kayıtlar kullanılabilir.",
        );
      }
    });
    return () => {
      cancelled = true;
      abort.abort();
      observer?.disconnect();
      controls?.dispose();
      overlay?.dispose();
      if (model) disposeModel(model);
      renderer?.dispose();
      renderer?.domElement.remove();
      actions.current = () => {};
      updateOverlay.current = () => {};
      orientModel.current = () => {};
    };
  }, [attempt, revision, source]);
  return (
    <section className="card">
      <h2>3B kas yükü ve toparlanma</h2>
      <p>
        Modelde bir bölgeye dokun veya kas listesinden seç. Renkler kayıtlı
        kuvvet setlerinden hesaplanan yorgunluk endeksini gösterir.
      </p>
      <div className="actions">
        <span>
          {frozen
            ? "Geçmiş / sabit hesap"
            : "Canlı hesap · dakikada bir yenilenir"}{" "}
          · {asOf ? new Date(asOf).toLocaleString("tr-TR") : "Veri bekleniyor"}
        </span>
        <button className="secondary" onClick={onNow}>
          Şimdi hesapla
        </button>
      </div>
      {pending && (
        <p role="status">Analiz yenileniyor; son hesap zamanı yukarıda.</p>
      )}
      {error && <p role="alert">Analiz yenilenemedi: {error}</p>}
      <div className="report-controls">
        <label>
          Kas bölgesi
          <select
            aria-label="Kas bölgesi"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setSurfaceId("");
              setIsolate(false);
            }}
          >
            {regions.filter(Boolean).map((key) => (
              <option key={key} value={key}>
                {muscleNames[key]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Boyama
          <select
            aria-label="Boyama"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="load">Yorgunluk endeksi</option>
            <option value="original">Orijinal model</option>
          </select>
        </label>
      </div>
      <p className="caption">
        Yeşil: düşük kayıtlı yük · sarı: orta · kırmızı: yüksek · gri: yüzde
        hesabı için veri yok. Sağ ve sol taraf birlikte değerlendirilir.
      </p>
      <label>
        Görüntülenecek model
        <select
          aria-label="Görüntülenecek model"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setAxis("auto");
            setFlipped(false);
          }}
        >
          <option value="atlas">Ayrıntılı anatomik kas atlası</option>
          <option value="personal" disabled={!library.available}>
            Kayıtlı modelim{library.name ? " · " + library.name : ""}
          </option>
        </select>
      </label>
      {library.available && (
        <p>Kayıtlı modelin hesabında korunuyor; tekrar yüklemen gerekmez.</p>
      )}
      <details>
        <summary>
          {library.available
            ? "Kayıtlı modelimi değiştir"
            : "Kendi 3B modelimi ekle"}
        </summary>
        <label>
          Kalıcı 3B model ekle (GLB, en fazla 96 MB)
          <input
            type="file"
            accept=".glb,model/gltf-binary"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
        </label>
      </details>
      {uploadNotice && <p role="status">{uploadNotice}</p>}
      <p role={failed ? "alert" : "status"}>{status}</p>
      <div className="body-model-canvas" ref={mount} />
      {ready && (
        <div className="card">
          <h3>Anatomik yapıları incele</h3>
          <label>
            Kas / yapı ara
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Örn. vastus, biceps, latissimus"
            />
          </label>
          <label>
            Anatomik yapı
            <select
              aria-label="Anatomik yapı"
              value={surfaceId}
              onChange={(e) => {
                setSurfaceId(e.target.value);
                const item = surfaces.find((s) => s.id === e.target.value);
                if (item?.region) setSelected(item.region);
              }}
            >
              <option value="">Modelden dokunarak veya listeden seç</option>
              {surfaces
                .filter(
                  (s, i) =>
                    source !== "atlas" ||
                    surfaces.findIndex((other) => other.name === s.name) === i,
                )
                .filter(
                  (s) =>
                    (!musclesOnly || !s.support) &&
                    s.name
                      .toLocaleLowerCase()
                      .includes(search.toLocaleLowerCase()),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name.replace(/\.l$/, " · Sol").replace(/\.r$/, " · Sağ")}
                  </option>
                ))}
            </select>
          </label>
          <div className="actions">
            <label>
              <input
                type="checkbox"
                checked={isolate}
                onChange={(e) => setIsolate(e.target.checked)}
                disabled={!surfaceId}
              />
              Yalnız seçili yapıyı göster
            </label>
            <button
              className="secondary"
              disabled={!surfaceId}
              onClick={() => focusSurface.current()}
            >
              Seçili yapıya yaklaş
            </button>
          </div>
          {source === "atlas" && (
            <label>
              <input
                type="checkbox"
                checked={musclesOnly}
                onChange={(e) => setMusclesOnly(e.target.checked)}
              />
              Kas dışı destek dokularını gizle
            </label>
          )}
          {selectedSurface && (
            <p>
              <strong>{selectedSurface.name}</strong> ·{" "}
              {selectedSurface.region
                ? muscleNames[selectedSurface.region] + " grubu"
                : "Bu yapı için antrenman yük eşlemesi yok"}
              . Ayrı kas başlarına veya sağ/sol tarafa özel ölçüm üretilmez.
            </p>
          )}
        </div>
      )}
      {source === "atlas" && (
        <details>
          <summary>Atlas kaynağı ve lisansı</summary>
          <p>
            BodyParts3D - The Database Center for Life Science - CC-BY-SA 2.1
            Japan
            <br />
            Z-Anatomy - The open source atlas of anatomy - CC-BY-SA 4.0
          </p>
          <a href="/anatomy/LICENSE.txt">
            Kaynak, değişiklik ve lisans bilgisi
          </a>{" "}
          · <a href="/anatomy/muscles.glb">Atlas GLB dosyasını indir</a>
        </details>
      )}
      <section
        className="card"
        aria-label="Seçili kas analizi"
        aria-live="polite"
      >
        <h3>
          {selectedSurface?.name || muscleNames[selected] || "Eşlenmemiş yapı"}
        </h3>
        {detail ? (
          <>
            <div className="report-controls">
              <div>
                <span>Tahmini yorgunluk endeksi</span>
                <h3>{rangeText(detail.fatigue)}</h3>
              </div>
              <div>
                <span>Model rezervi</span>
                <h3>{rangeText(detail.reserve)}</h3>
              </div>
            </div>
            <p>
              Son kayıtlı yükten beri azalma:{" "}
              {detail.released_since_last_load.low.toFixed(1)}–
              {detail.released_since_last_load.high.toFixed(1)} yüzde puanı.
            </p>
            <p>
              {recovery?.forecast_assumption}{" "}
              {detail.forecast
                .map(
                  (f) =>
                    `${f.hours} saat sonra yorgunluk ${rangeText(f.fatigue)}`,
                )
                .join(" · ")}
            </p>
            {detail.uncertain_time && (
              <p>
                Saat girilmeyen kayıtlar nedeniyle zaman aralığı kullanıldı.
              </p>
            )}
            {detail.missing_effort && (
              <p>
                Bazı setlerde RIR/RPE eksik; tek bir kesin yüzde yerine aralık
                gösteriliyor.
              </p>
            )}
            <details>
              <summary>Hesaba giren {detail.sources.length} set</summary>
              <ul>
                {detail.sources.map((row) => (
                  <li key={row.id}>
                    <a href={"?date=" + row.local_date + "#workout"}>
                      {row.local_date} · {row.name}
                    </a>{" "}
                    · {row.reps ?? "?"} tekrar · {row.external_kg ?? "?"} kg ·
                    RIR {row.rir ?? "?"} / RPE {row.rpe ?? "?"}
                  </li>
                ))}
              </ul>
            </details>
          </>
        ) : (
          <p>
            Bu bölgenin yüzde hesabı için eşleşen kuvvet seti yok. Bu, tamamen
            iyileştiği anlamına gelmez.
          </p>
        )}
        {Object.entries(exposure?.[activeRegion] || {}).map(([key, value]) => (
          <p key={key}>
            {key}: {value.low.toFixed(2)}–{value.high.toFixed(2)} {value.unit}{" "}
            kalan kayıtlı yük
          </p>
        ))}
        <p className="caption">
          {recovery?.meaning ||
            "Yüzdeler biyolojik ölçüm değildir. Eski sabit analizlerde bu hesap bulunmayabilir; Şimdi hesapla ile güncelle."}{" "}
          Tutuş, kardiyo ve beceri yükleri kendi birimlerinde izlenir; kuvvet
          rezervine çevrilmez.
        </p>
        {context?.length ? (
          <details>
            <summary>Sağlık ve toparlanma bağlamı</summary>
            <ul>
              {context.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
            <p>Yükün azalması, ağrı veya hastalığın geçtiğini doğrulamaz.</p>
          </details>
        ) : null}
      </section>
      {ready && (
        <details>
          <summary>Model yönünü düzelt</summary>
          <p>
            Yaklaşık boyama için model ayakta, ön yüzü Önden kamerasına bakıyor
            olmalı.
          </p>
          <label>
            Modelin dik ekseni
            <select value={axis} onChange={(e) => setAxis(e.target.value)}>
              <option value="auto">Otomatik</option>
              <option value="y">Y</option>
              <option value="z">Z</option>
              <option value="x">X</option>
            </select>
          </label>
          <button className="secondary" onClick={() => setFlipped((v) => !v)}>
            Ön / arka yönünü değiştir
          </button>
        </details>
      )}
      {ready && (
        <div className="actions">
          <button className="secondary" onClick={() => actions.current(0)}>
            Önden
          </button>
          <button
            className="secondary"
            onClick={() => actions.current(Math.PI)}
          >
            Arkadan
          </button>
          <button
            className="secondary"
            onClick={() => actions.current(-Math.PI / 2)}
          >
            Soldan
          </button>
          <button
            className="secondary"
            onClick={() => actions.current(Math.PI / 2)}
          >
            Sağdan
          </button>
          <a
            className="link-button secondary"
            href={
              source === "atlas"
                ? "/anatomy/muscles.glb"
                : "/api/v2/body-model/content"
            }
          >
            Kütüphane dosyasını indir
          </a>
        </div>
      )}
      {failed && (
        <button className="secondary" onClick={() => setAttempt((v) => v + 1)}>
          3B modeli yeniden dene
        </button>
      )}
      <p className="caption">
        Buradan yüklenen modeller yalnız bu profile bağlıdır ve tam yedeğe
        dahildir. Son yüklenen model açılır; önceki dosyalar korunur. Yönetici
        tarafından ayrı dosya olarak yapılandırılan modelleri indirme
        seçeneğiyle ayrıca sakla. Model olmadan tüm kayıt ve 2B analizler
        kullanılabilir.
      </p>
    </section>
  );
}
