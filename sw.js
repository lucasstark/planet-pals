// Network-first: updates show up whenever the tablet is online; the cache keeps it playable offline.
const CACHE = 'planet-pals-v17';
const PLANETS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
const VOICE = ['tap', 'sun', 'expert', 'yay', 'good-job', 'hooray', 'Jettson', 'Langston',
  'reaction-whoa', 'reaction-whee', 'reaction-giggle']
  .concat(PLANETS.flatMap((p) => ['name', 'fact', 'find', 'found', 'thats'].map((k) => `${k}-${p}`)))
  .map((k) => `voice/${k}.m4a`);
const JOURNEY_VOICE = ['play-intro', 'order-intro', 'parade-done', 'meet-intro', 'letters-intro', 'journey-done', 'clue-red', 'clue-rings', 'clue-big', 'clue-hot', 'clue-side', 'puzzle-rings', 'puzzle-moon', 'puzzle-storm', 'hint-Mars', 'hint-Saturn', 'hint-Jupiter', 'hint-Venus', 'hint-Uranus', 'answer-Mars', 'answer-Saturn', 'answer-Jupiter', 'answer-Venus', 'answer-Uranus', 'answer-ring', 'answer-moon', 'answer-storm'].map(k => `voice/${k}.m4a`);
const FILES = ['./', 'index.html', 'game.js', 'device-audio.js', 'adventure.js', 'adventure.css', 'art/pip.svg', 'art/pip-laugh.svg', 'art/pip-curious.svg', 'art/pip-five.svg', 'manifest.json', 'icon-192.png', 'icon-512.png', ...VOICE, ...JOURNEY_VOICE, 'game.js?v=17', 'adventure.js?v=17', 'device-audio.js?v=17', 'adventure.css?v=17'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('planet-pals-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    (async () => {
      let response;
      try { response = await fetch(e.request); } catch (_) { /* Try the installed offline copy. */ }
      // Partial responses cannot be stored with Cache.put (Safari may request audio ranges).
      if (response && response.ok) {
        if (response.status !== 206) {
          try {
            const cache = await caches.open(CACHE);
            await cache.put(e.request, response.clone());
          } catch (_) { /* Storage failure must not discard a usable network response. */ }
        }
        return response;
      }
      try {
        const cache = await caches.open(CACHE);
        const saved = await cache.match(e.request);
        if (saved) return saved;
      } catch (_) { /* Return an explicit failure if storage is unavailable too. */ }
      return response || new Response('Unavailable offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    })()
  );
});
