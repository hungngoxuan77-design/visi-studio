/* Visi Studio PWA. Scope: /visi-studio/makeup-assistant/ only. Never precache 105 MP4 files. */
'use strict';
const CACHE='visi-makeup-mobile-v1';
const CORE=['./','./index.html','./style.css','./inventory.css','./mobile.css',
 './script.js','./curriculum.js','./inventory-ai.js','./mobile-ui.js',
 './data/steps.sample.json','./assets/logo.svg','./assets/guide-poster.svg',
 './assets/icon-192.png','./assets/icon-512.png','./manifest.webmanifest',
 './assets/styles/clean.svg','./assets/styles/douyin.svg','./assets/styles/korean.svg',
 './assets/styles/latin.svg','./assets/styles/thai.svg','./assets/styles/vietnam.svg',
 './assets/styles/western.svg'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('visi-makeup-mobile-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin)return;
 const scope=new URL(self.registration.scope);
 if(!url.pathname.startsWith(scope.pathname))return;
 // Never cache video ranges, third-party AI modules, user uploads or images from network.
 if(req.headers.has('range')||/\.(mp4|webm)$/i.test(url.pathname))return;
 if(req.mode==='navigate'){
   event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));}return res;}).catch(()=>caches.match('./index.html')));
   return;
 }
 // Network-first on JSON: new curriculum content is respected, offline cached fallback.
 if(url.pathname.endsWith('/data/steps.sample.json')){
   event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;}).catch(()=>caches.match(req)));
   return;
 }
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(res=>{
   // Only cache local static CSS/JS/PNG/SVG; do not grow storage without bound.
   if(res.ok&&/\.(css|js|png|svg)$/i.test(url.pathname)){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
   return res;
 })));
});
