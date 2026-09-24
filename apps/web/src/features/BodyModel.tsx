import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { api } from "../api/contracts";
import type { SyncStore } from "../sync/store";
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
export default function BodyModel({ store }: { store: SyncStore }) {
  const [uploadNotice, setUploadNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const revision = store
    .view("media")
    .filter((row) => row.mime === "model/gltf-binary")
    .map((row) => row.id + ":" + row.version)
    .sort()
    .join("|");
  const uploadIdentity = useRef<{ key: string; operation: string; entity: string } | null>(null);
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
        uploadIdentity.current = { key, operation: crypto.randomUUID(), entity: crypto.randomUUID() };
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
            setUploadNotice(percent < 100 ? `Model yükleniyor · %${percent}` : "Dosya gönderildi; sunucu kaydı doğrulanıyor…");
          }
        };
        request.onerror = () => reject(Error("Bağlantı kesildi. Aynı dosyayı yeniden seçerek güvenle tekrar deneyebilirsin."));
        request.onload = () => {
          if (request.status >= 200 && request.status < 300) resolve();
          else {
            let message = "Model kaydedilemedi. Aynı dosyayla yeniden deneyebilirsin.";
            try { message = JSON.parse(request.responseText).error?.message || message; } catch { /* Non-JSON proxy response. */ }
            reject(Error(message));
          }
        };
        request.send(file);
      });
      setUploadNotice("Model sunucuya kaydedildi. Kütüphanende diğer cihazlarından da açabilirsin.");
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
      model: THREE.Object3D | undefined;
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
      model = gltf.scene;
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
        size = bounds.getSize(new THREE.Vector3()),
        center = bounds.getCenter(new THREE.Vector3());
      if (!Number.isFinite(size.length()) || size.length() === 0)
        throw Error("Modelin görünür geometrisi bulunamadı.");
      const scale = 2 / Math.max(size.x, size.y, size.z);
      model.position.sub(center).multiplyScalar(scale);
      model.scale.multiplyScalar(scale);
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
      setStatus(
        "Kütüphane modeli açıldı. Bu geometri üzerinde ölçülmüş kas hasarı veya iyileşme yüzdesi gösterilmez. Bölgesel hesapları 2B harita ve tablodan inceleyebilirsin.",
      );
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
      if (model) disposeModel(model);
      renderer?.dispose();
      renderer?.domElement.remove();
      actions.current = () => {};
    };
  }, [attempt, revision]);
  return (
    <section className="card">
      <h2>3B model kütüphanem</h2>
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
