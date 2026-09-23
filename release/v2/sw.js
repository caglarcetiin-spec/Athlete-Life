
const CACHE='alos-shell-1fe8b48122fd9183',FILES=["/index.html","/manifest.webmanifest","/app-icon.svg","/assets/index-C5ajwxXK.css","/assets/index-CLfEeEdJ.js","/assets/BodyModel-DgJ48Vln.js"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil((async()=>{const names=(await caches.keys()).filter(name=>name.startsWith('alos-shell-'));const keep=new Set([CACHE,...names.filter(name=>name!==CACHE).slice(-2)]);await Promise.all(names.filter(name=>!keep.has(name)).map(name=>caches.delete(name)));await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
 if(request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html')){
  event.respondWith(caches.open(CACHE).then(cache=>cache.match('/index.html')).then(hit=>hit||fetch(request)));return;
 }
 if(!FILES.includes(url.pathname)&&!/^\/assets\/[^/]+\.(js|css)$/.test(url.pathname))return;
 event.respondWith(caches.match(request).then(hit=>hit||fetch(request)));
});
