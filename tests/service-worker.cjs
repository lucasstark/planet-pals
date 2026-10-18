// Run with node --test tests/service-worker.cjs. VM tests complement browser worker checks.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync('sw.js', 'utf8');
const origin = 'https://example.test';
const cacheName = 'planet-pals-v15';
function worker() {
  const listeners = {}, stores = new Map(), events = [], added = [];
  let network = async () => new Response('online'), rejectAdd = false, rejectPut = false, claimWait;
  const key = request => new URL(typeof request === 'string' ? request : request.url, origin + '/planet-pals/').href;
  const caches = {
    async keys() { return [...stores.keys()]; },
    async delete(name) { events.push('delete:' + name); return stores.delete(name); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async addAll(files) {
          if (rejectAdd) throw new Error('missing asset');
          for (const file of files) { added.push(file); entries.set(key(file), new Response('asset:' + file)); }
          events.push('precache');
        },
        async put(request, response) {
          if (rejectPut) throw new Error('quota exceeded');
          entries.set(key(request), response.clone()); events.push('put');
        },
        async match(request) { return entries.get(key(request))?.clone(); },
      };
    },
  };
  const context = {
    caches, URL, Response,
    fetch: request => network(request),
    self: {
      location: { origin },
      addEventListener: (type, listener) => { listeners[type] = listener; },
      async skipWaiting() { events.push('skipWaiting'); },
      clients: { async claim() { events.push('claim'); await claimWait; } },
    },
  };
  vm.runInNewContext(source, context);
  return {
    stores, caches, events, added,
    network(fn) { network = fn; },
    rejectAdd() { rejectAdd = true; },
    rejectPut() { rejectPut = true; },
    delayClaim(promise) { claimWait = promise; },
    lifecycle(type) { let lifetime; listeners[type]({ waitUntil(promise) { lifetime = promise; } }); return lifetime; },
    fetch(path = 'game.js', options) {
      let result;
      listeners.fetch({ request: new Request(key(path), options), respondWith(promise) { result = promise; } });
      return result;
    },
  };
}

test('installation precaches all three reactions before requesting activation', async () => {
  const w = worker();
  await w.lifecycle('install');
  for (const reaction of ['whoa', 'whee', 'giggle']) assert.ok(w.added.includes(`voice/reaction-${reaction}.m4a`));
  assert.equal(w.added.length, 58);
  assert.ok(w.added.includes('device-audio.js'));
  assert.deepEqual(w.events, ['precache', 'skipWaiting']);
  const failing = worker(); failing.rejectAdd();
  await assert.rejects(failing.lifecycle('install'), /missing asset/);
  assert.ok(!failing.events.includes('skipWaiting'));
});

test('activation preserves other applications and awaits cleanup before claiming clients', async () => {
  const w = worker();
  for (const name of ['planet-pals-v12', 'planet-pals-v13', cacheName, 'another-game-v1']) await w.caches.open(name);
  let releaseClaim, finished = false;
  w.delayClaim(new Promise(resolve => { releaseClaim = resolve; }));
  const activation = w.lifecycle('activate').then(() => { finished = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, false, 'the activation lifetime includes pending clients.claim');
  releaseClaim();
  await activation;
  assert.deepEqual([...w.stores.keys()], [cacheName, 'another-game-v1']);
  assert.deepEqual(w.events, ['delete:planet-pals-v12', 'delete:planet-pals-v13', 'claim']);
});

test('successful network content replaces cache and survives the next offline request', async () => {
  const w = worker();
  await w.lifecycle('install');
  w.network(async () => new Response('new game'));
  assert.equal(await (await w.fetch()).text(), 'new game');
  w.network(async () => { throw new TypeError('offline'); });
  assert.equal(await (await w.fetch()).text(), 'new game');
  for (const name of ['whoa', 'whee', 'giggle']) {
    assert.equal((await w.fetch(`voice/reaction-${name}.m4a`)).status, 200);
  }
});

test('server failures use current release cache without poisoning it', async () => {
  const w = worker(); await w.lifecycle('install');
  const other = await w.caches.open('unrelated');
  await other.put(origin + '/planet-pals/uncached', new Response('wrong app'));
  for (const status of [404, 500, 503]) {
    w.network(async () => new Response('failure', { status }));
    assert.equal(await (await w.fetch()).text(), 'asset:game.js');
    assert.equal((await w.fetch('uncached')).status, status);
  }
  w.network(async () => { throw new TypeError('offline'); });
  assert.equal((await w.fetch('uncached')).status, 503);
  assert.equal(await (await w.fetch()).text(), 'asset:game.js');
});

test('partial audio and storage errors still return network content without replacing a full clip', async () => {
  const w = worker(); await w.lifecycle('install');
  w.network(async () => new Response('range', { status: 206 }));
  assert.equal((await w.fetch('voice/reaction-whoa.m4a')).status, 206);
  w.network(async () => { throw new TypeError('offline'); });
  assert.equal(await (await w.fetch('voice/reaction-whoa.m4a')).text(), 'asset:voice/reaction-whoa.m4a');
  w.rejectPut(); w.network(async () => new Response('fresh'));
  assert.equal(await (await w.fetch()).text(), 'fresh');
});

test('foreign origins and writes are left to the browser', () => {
  const w = worker();
  assert.equal(w.fetch('https://other.test/file.js'), undefined);
  assert.equal(w.fetch('save', { method: 'POST', body: 'hello' }), undefined);
});
