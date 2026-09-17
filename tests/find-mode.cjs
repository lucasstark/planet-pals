// Run with node --test tests/find-mode.cjs. No browser or audio device required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function game() {
  const timers = [];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => gradient : () => {} });
  const sandbox = { console, Math, Map, performance: { now: () => 0 },
    document: { getElementById: () => ({ getContext: () => ctx, addEventListener() {} }), documentElement: {}, addEventListener() {} },
    window: { innerWidth: 1280, innerHeight: 800, addEventListener() {} },
    getComputedStyle: () => ({ getPropertyValue: () => '0' }),
    navigator: {}, requestAnimationFrame() {}, setTimeout: fn => timers.push(fn) };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('game.js', 'utf8'), sandbox);
  const run = code => vm.runInContext(code, sandbox);
  run(`const originalSay = say; const responses = []; say = (...keys) => new Promise(resolve => responses.push({keys, resolve})); setMode('find');`);
  return { run, timers };
}
const tapCorrect = `const b = state.bodies.find(b => b.planet === state.find.target); findTap(b.x, b.y);`;
test('five-star challenges, ten-answer parade, score reset and guarded navigation', () => {
  const { run, timers } = game();
  for (let i = 1; i <= 10; i++) {
    run(`{ ${tapCorrect} }`);
    assert.equal(run('state.find.total'), i);
    assert.equal(run('state.find.stars'), (i - 1) % 5 + 1);
    if (i % 5 === 0) {
      assert.equal(run('state.find.celebration.big'), i === 10);
      assert.equal(run('state.word.text'), i === 10 ? 'Hooray!' : 'Good job!');
      run('state.time += 0.5; update(0.016); draw();');
      assert.ok(run('state.ripples.length') > 0);
    }
    run(`{ ${tapCorrect} }`);
    assert.equal(run('state.find.total'), i, 'locked round cannot score twice');
    timers.shift()();
  }
  assert.equal(run('state.find.stars'), 0);
  run(`{ ${tapCorrect} } setMode('menu');`);
  timers.shift()();
  assert.equal(run('state.mode'), 'menu');
});
test('same wrong planet is suppressed; different choices interrupt without stale unlocks', async () => {
  const { run } = game();
  run(`const wrong = state.bodies.filter(b => b.planet !== state.find.target);
    findTap(wrong[0].x, wrong[0].y);
    findTap(wrong[0].x, wrong[0].y);`);
  assert.equal(run('responses.length'), 2);
  run('findTap(wrong[1].x, wrong[1].y); responses[1].resolve();');
  await Promise.resolve();
  assert.equal(run('state.find.correction.planet === wrong[1].planet'), true);
  run('responses[2].resolve();');
  await Promise.resolve();
  assert.equal(run('state.find.correction'), null);
  run('findTap(wrong[1].x, wrong[1].y);');
  assert.equal(run('responses.length'), 4);
  run(`{ ${tapCorrect} } responses[3].resolve();`);
  await Promise.resolve();
  assert.equal(run('state.find.locked'), true);
  assert.equal(run('state.find.stars'), 1);
  assert.equal(run('state.find.correction'), null);
});
test('Music freezes planet targets and Talk resumes their paused orbits', () => {
  const { run } = game();
  run("setMode('explore'); update(0.05); state.talk = false;");
  const positions = run('JSON.stringify(state.bodies.map(b => [b.x, b.y]))');
  run('state.time += 10; update(0.05); draw();');
  assert.equal(run('JSON.stringify(state.bodies.map(b => [b.x, b.y]))'), positions);
  run('state.talk = true; update(0.05);');
  assert.notEqual(run('JSON.stringify(state.bodies.map(b => [b.x, b.y]))'), positions);
  assert.ok(run('state.bodies.every(b => b.orbit.time < 0.2)'), 'music time does not advance orbit phase');
});

test('Talk stage keeps every friend selectable and survives resize and mode changes', () => {
  const { run } = game();
  run("setMode('explore'); playBody(state.bodies[4], true); state.time += 0.5; draw();");
  assert.equal(run('state.spotlight.body.planet.name'), 'Jupiter');
  run('const venusDock = dockBodies()[2]; exploreTap(venusDock.x, venusDock.y, 1); draw();');
  assert.equal(run('state.spotlight.body.planet.name'), 'Venus');
  assert.equal(run('state.holds.size'), 0);
  run('resize();');
  assert.equal(run('state.spotlight.body === state.bodies[1]'), true);
  run('const tb = talkButton(); exploreTap(tb.x, tb.y, 1);');
  assert.equal(run('state.spotlight'), null);
  assert.equal(run('state.talk'), false);
  run("state.talk = true; playBody(state.sun, true); state.time += 1; draw(); const close = spotlightClose(); exploreTap(close.x, close.y, 1);");
  assert.equal(run('state.spotlight'), null);
  run("for (const b of state.bodies) { playBody(b,true); state.time += 1; draw(); } setMode('menu');");
  assert.equal(run('state.spotlight'), null);
});
test('speech performance follows playback and interrupted completion cannot clear a newer face', async () => {
  const { run } = game();
  run(`const sources = [];
    audio = { currentTime: 1, destination: {}, createBufferSource() {
      const src = { connect() {}, start() {}, stop() { this.onended(); } }; sources.push(src); return src;
    }};
    const buffer = { sampleRate: 30, getChannelData: () => new Float32Array([.1,.05,0,.08]) };
    clips.set('name-Earth', Promise.resolve(buffer)); clips.set('name-Mars', Promise.resolve(buffer));
    say = originalSay; say('name-Earth');`);
  await Promise.resolve();
  assert.equal(run('state.speech.name'), 'Earth');
  run("say('name-Mars');");
  await Promise.resolve(); await Promise.resolve();
  assert.equal(run('state.speech.name'), 'Mars');
  run('sources[1].onended();');
  await Promise.resolve(); await Promise.resolve();
  assert.equal(run('state.speech'), null);
});
test('Music holds and echoes perform without moving targets, and cleanup releases notes', () => {
  const { run } = game();
  run(`setMode('explore'); state.talk=false;
    let stopped=0; startSustain=()=>({stop(){stopped++;}});
    const b0=state.bodies[0], b1=state.bodies[1];
    exploreTap(b0.x,b0.y,1); exploreTap(b1.x,b1.y,2);
    state.time+=1; update(.05);`);
  assert.equal(run('state.holds.size'), 2);
  assert.ok(run('performanceFor(b0).mouth') > 0);
  assert.equal(run('state.spotlight'), null);
  run('releaseAllHolds(); state.time+=3; updateEcho();');
  assert.equal(run('stopped'), 2);
  assert.ok(run('state.echo.playing'));
  run('state.time+=.5; updateEcho();');
  assert.ok(run('performanceFor(b0).mouth') > 0);
  run('quietGame();');
  assert.equal(run('state.echo.playing'), null);
  assert.equal(run('state.holds.size'), 0);
});
