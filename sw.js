// Network-first: updates show up whenever the tablet is online; the cache keeps it playable offline.
const CACHE = 'planet-pals-v13';
const PLANETS = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
const VOICE = ['tap', 'sun', 'expert', 'yay', 'good-job', 'hooray', 'Jettson', 'Langston']
  .concat(PLANETS.flatMap((p) => ['name', 'fact', 'find', 'found', 'thats'].map((k) => `${k}-${p}`)))
  .map((k) => `voice/${k}.m4a`);
const JOURNEY_VOICE = ['play-intro', 'order-intro', 'parade-done', 'meet-intro', 'letters-intro', 'journey-done', 'clue-red', 'clue-rings', 'clue-big', 'clue-hot', 'clue-side', 'puzzle-rings', 'puzzle-moon', 'puzzle-storm', 'hint-Mars', 'hint-Saturn', 'hint-Jupiter', 'hint-Venus', 'hint-Uranus', 'answer-Mars', 'answer-Saturn', 'answer-Jupiter', 'answer-Venus', 'answer-Uranus', 'answer-ring', 'answer-moon', 'answer-storm'].map(k => `voice/${k}.m4a`);
const FILES = ['./', 'index.html', 'game.js', 'adventure.js', 'adventure.css', 'art/pip.svg', 'art/pip-laugh.svg', 'art/pip-curious.svg', 'art/pip-five.svg', 'manifest.json', 'icon-192.png', 'icon-512.png', ...VOICE, ...JOURNEY_VOICE];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('planet-pals-') && k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && new URL(e.request.url).origin === self.location.origin) {
          const copy = res.clone();
          e.waitUntil(caches.open(CACHE).then(c => c.put(e.request, copy)));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
