import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { api } from "../api/contracts";
import type { SyncStore } from "../sync/store";
import { attachOverlay } from "./bodyOverlay";
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
  const [selected, setSelected] = useState("lats");
  const [mode, setMode] = useState("load");
  const [axis, setAxis] = useState("auto");
  const [flipped, setFlipped] = useState(false);
  const updateOverlay = useRef<() => void>(() => {});
  const orientModel = useRef<() => void>(() => {});
  const current = useRef({ recovery, selected, mode, axis, flipped });
  current.current = { recovery, selected, mode, axis, flipped };
  useEffect(() => {
    updateOverlay.current();
  }, [recovery, selected, mode]);
  useEffect(() => {
    orientModel.current();
  }, [axis, flipped]);
  const detail = recoveryGroup(recovery, selected);

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
    setFailed(false);
    setStatus("3B kütüphanesi kontrol ediliyor…");
    async function load() {
      const info = (await api("body-model")) as {
        available: boolean;
        message?: string;
        url?: string;
        bytes?: number;
      };
      if (cancelled) return;
      if (!info.available) {
        setStatus(info.message || "Bu profil için 3B model yapılandırılmadı.");
        return;
      }
      if (!mount.current) return;
      setStatus("Kütüphanendeki model yükleniyor…");
      const response = await fetch("/api/v2/body-model/content", {
        credentials: "same-origin",
        signal: abort.signal,
      });
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
        overlay = attachOverlay(model, new THREE.Box3().setFromObject(model));
        setStatus(
          `3B analiz açık · ${overlay.named}/${overlay.total} parça adıyla eşleşti. Adsız yüzeyler yaklaşık vücut bölgeleriyle boyanır; bu bir anatomik segmentasyon değildir.`,
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
        const hit = ray.intersectObject(model, true)[0];
        if (hit) {
          const key = overlay?.pick(
            hit.point,
            hit.object,
            hit.face?.materialIndex,
          );
          if (key) setSelected(key);
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
  }, [attempt, revision]);
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
            onChange={(e) => setSelected(e.target.value)}
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
      {uploadNotice && <p role="status">{uploadNotice}</p>}
      <p role={failed ? "alert" : "status"}>{status}</p>
      <div className="body-model-canvas" ref={mount} />
      <section
        className="card"
        aria-label="Seçili kas analizi"
        aria-live="polite"
      >
        <h3>{muscleNames[selected]}</h3>
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
        {Object.entries(exposure?.[selected] || {}).map(([key, value]) => (
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
            href="/api/v2/body-model/content"
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
