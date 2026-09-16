// Network-first: updates show up whenever the tablet is online; the cache keeps it playable offline.
const CACHE = 'planet-pals-v4';
const PLANETS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
const VOICE = ['tap', 'sun', 'expert', 'yay']
  .concat(PLANETS.flatMap((p) => ['name', 'fact', 'find', 'found', 'thats'].map((k) => `${k}-${p}`)))
  .map((k) => `voice/${k}.m4a`);
const FILES = ['./', 'index.html', 'game.js', 'manifest.json', 'icon-192.png', 'icon-512.png', ...VOICE];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
