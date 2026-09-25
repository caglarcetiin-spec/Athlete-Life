
const CACHE='alos-shell-5b9c8ba7f3b238b8',FILES=["/index.html","/manifest.webmanifest","/app-icon.svg","/assets/index-DBMhrk8E.css","/assets/index-iBxX4IqK.js","/assets/BodyModel-B1iabk2u.js"];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting(); if(event.data?.type==='GET_VERSION')event.ports?.[0]?.postMessage(CACHE)});
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
