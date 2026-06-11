const CACHE = 'vitale-v4';
const ASSETS = [
  './index.html',
  './css/style.css',
  './js/state.js','./js/data.js','./js/utils.js',
  './js/compute.js','./js/persistence.js','./js/ui.js',
  './js/charts.js','./js/dashboard.js','./js/home-modes.js',
  './js/nutrition.js','./js/body.js','./js/training.js',
  './js/health-import.js','./js/init.js'
  // './assets/logo.png' — uncomment once the file exists
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Network-first: immer frischen Code laden, Cache nur als Offline-Fallback.
  // Verhindert, dass iOS dauerhaft alte gecachte JS-Dateien ausliefert.
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
