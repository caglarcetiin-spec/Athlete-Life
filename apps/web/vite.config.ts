import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
function shellWorker(): Plugin {
  return {
    name: "private-safe-shell",
    async generateBundle(_options, bundle) {
      const assets = [
        "/index.html",
        "/manifest.webmanifest",
        "/app-icon.svg",
        ...Object.keys(bundle)
          .filter((p) => /\.(js|css)$/.test(p))
          .map((p) => "/" + p),
      ];
      const digest = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(JSON.stringify(assets)),
      );
      const version = Array.from(new Uint8Array(digest))
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 16);
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: `
const CACHE='alos-shell-${version}',FILES=${JSON.stringify(assets)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil((async()=>{const names=(await caches.keys()).filter(name=>name.startsWith('alos-shell-'));const keep=new Set([CACHE,...names.filter(name=>name!==CACHE).slice(-2)]);await Promise.all(names.filter(name=>!keep.has(name)).map(name=>caches.delete(name)));await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){
  event.respondWith(caches.open(CACHE).then(cache=>cache.match('/index.html')).then(hit=>hit||fetch(request)));return;
 }
 if(!FILES.includes(url.pathname)&&!/^\\/assets\\/[^/]+\\.(js|css)$/.test(url.pathname))return;
 event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
});
`,
      });
    },
  };
}
export default defineConfig({
  plugins: [react(), shellWorker()],
  server: { port: 5173, proxy: { "/api": "http://127.0.0.1:10005" } },
  build: { sourcemap: false },
});
