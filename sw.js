// The Vercel build replaces this value with a hash of the complete app release.
const RELEASE = 'local';
const CACHE_PREFIX = 'vitale-app-';
const CACHE = CACHE_PREFIX + RELEASE;
const ASSETS = [
  './index.html', './css/style.css', './manifest.json', './assets/logo.png',
  './js/icons.js', './js/state.js', './js/data.js', './js/utils.js',
  './js/compute.js', './js/persistence.js', './js/ui.js', './js/charts.js',
  './js/dashboard.js', './js/home-modes.js', './js/nutrition.js', './js/body.js',
  './js/training.js', './js/health-import.js', './js/renpho-import.js',
  './js/program.js', './js/init.js', './js/app-updates.js'
];
const assetURLs = new Set(ASSETS.map(p => new URL(p, self.registration.scope).href));
const shellURL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  // Installation fails as a whole if a required file is unavailable.
  // No skipWaiting here: the user chooses when to leave the running version.
  event.waitUntil(caches.open(CACHE).then(cache =>
    cache.addAll(ASSETS.map(p => new Request(new URL(p, self.registration.scope), {cache: 'reload'})))
  ));
});

self.addEventListener('message', event => {
  if(event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Keep the preceding release for tabs that still have its code loaded.
    const previous = keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).pop();
    await Promise.all(keys.filter(k =>
      (/^vitale-v\d+$/.test(k) || k.startsWith(CACHE_PREFIX)) && k !== CACHE && k !== previous
    ).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  // Health responses and other APIs must never enter the offline app cache.
  if(request.method !== 'GET' || url.origin !== self.location.origin ||
     /\/api(?:\/|$)/.test(url.pathname)) return;
  const key = request.mode === 'navigate' ? shellURL : url.href;
  if(!assetURLs.has(key)) return;
  event.respondWith(caches.open(CACHE).then(async cache =>
    (await cache.match(key)) || fetch(request)
  ));
});
