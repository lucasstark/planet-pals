// Service worker contract tests: all promised assets exist and unrelated caches survive.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function worker(fetcher = async () => ({ ok: true, clone: () => 'copy' })) {
  const handlers = {}, added = [], deleted = [], written = [];
  const sandbox = { URL, fetch: fetcher, self: {location:{origin:'https://example.test'}, addEventListener:(n,f)=>handlers[n]=f,skipWaiting(){},clients:{claim(){}}}, caches: {
    open:async()=>({addAll:async files=>added.push(...files),put:async(...args)=>written.push(args),match:async()=> 'offline response'}),
    keys:async()=>['another-app-v1','planet-pals-v12','planet-pals-v16'], delete:async k=>deleted.push(k),match:async()=> 'offline response'
  }};
  vm.runInNewContext(fs.readFileSync('sw.js','utf8'),sandbox);
  async function event(name, extra={}) {
    let pending=[],response;
    handlers[name]({...extra,waitUntil:p=>pending.push(p),respondWith:p=>response=p});
    const result=await response;
    await Promise.all(pending);
    return result;
  }
  return {added,deleted,written,event};
}
test('precache includes every app file, companion state and recorded prompt',async()=>{
  const w=worker();await w.event('install');
  for(const path of w.added)assert.ok(fs.existsSync(path),`Missing offline asset: ${path}`);
  for(const path of ['adventure.js','adventure.css','art/pip.svg','art/pip-laugh.svg','art/pip-five.svg','art/pip-curious.svg'])assert.ok(w.added.includes(path));
  const prompts=fs.readFileSync('tools/journey-voice.tsv','utf8').trim().split('\n').map(line=>line.split('\t')[0]);
  for(const key of prompts)assert.ok(w.added.includes(`voice/${key}.m4a`),`Uncached prompt: ${key}`);
  assert.equal(w.added.length,new Set(w.added).size);
});
test('activation deletes only old Planet Pals caches',async()=>{
  const w=worker();await w.event('activate');assert.deepEqual(w.deleted,['planet-pals-v12']);
});
test('network successes cache, errors do not replace offline content',async()=>{
  const request={method:'GET',url:'https://example.test/adventure.js'};
  const ok=worker();await ok.event('fetch',{request});assert.equal(ok.written.length,1);
  const failed=worker(async()=>({ok:false}));await failed.event('fetch',{request});assert.equal(failed.written.length,0);
  const offline=worker(async()=>{throw Error('offline')});assert.equal(await offline.event('fetch',{request}),'offline response');
});
