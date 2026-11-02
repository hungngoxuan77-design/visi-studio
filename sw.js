// Scoped, relative cache paths work at both a custom domain and /repo-name/ on GitHub Pages.
const CACHE = 'visi-studio-pwa-v6-live-makeup-20261102';
const SCOPE = new URL('./', self.registration.scope).href;
const FILES = ['','index.html','styles.css','app.js','lipstick-engine.js','ai-makeup.js','ai-makeup.css','icon.svg','manifest.webmanifest']
  .map(path => new URL(path, SCOPE).href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys
      .filter(key => (key.startsWith('lumi-beauty-pwa-') || key.startsWith('visi-studio-pwa-')) && key !== CACHE)
      .map(key => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(SCOPE)) return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
