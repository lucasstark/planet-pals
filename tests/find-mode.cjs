// Run with node --test tests/find-mode.cjs. No browser or audio device required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function game() {
  const timers = [];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => gradient : () => {} });
  const canvasListeners = {};
  const sandbox = { canvasListeners, console, Math, Map, performance: { now: () => 0 },
    document: { getElementById: () => ({ getContext: () => ctx, addEventListener(name, fn) { canvasListeners[name] = fn; } }), documentElement: {}, addEventListener() {} },
    window: { innerWidth: 1280, innerHeight: 800, addEventListener() {} },
    getComputedStyle: () => ({ getPropertyValue: () => '0' }),
    navigator: {}, requestAnimationFrame() {}, setTimeout: fn => timers.push(fn) };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync('game.js', 'utf8'), sandbox);
  const run = code => vm.runInContext(code, sandbox);
  run(`const originalSay = say; const responses = []; say = (...keys) => new Promise(resolve => responses.push({keys, resolve})); setMode('find');`);
  return { run, timers };
}

// Exercise the real tone/ownership code without requiring an audio device.
function mockAudio(run) {
  run(`const oscillators=[], gains=[];
    const parameter=()=>({events:[],
      setValueAtTime(...args){this.events.push(['set',...args]);},
      exponentialRampToValueAtTime(...args){this.events.push(['exp',...args]);},
      linearRampToValueAtTime(...args){this.events.push(['linear',...args]);},
      cancelScheduledValues(...args){this.events.push(['cancel',...args]);}});
    audio={currentTime:10,state:'running',destination:{},
      createOscillator(){const o={frequency:parameter(),stops:[],starts:[],disconnected:false,
        connect(node){this.output=node;return node;},start(at){this.starts.push(at);},stop(at){this.stops.push(at);},
        disconnect(){this.disconnected=true;}};oscillators.push(o);return o;},
      createGain(){const g={gain:parameter(),disconnected:false,
        connect(node){return node;},disconnect(){this.disconnected=true;}};gains.push(g);return g;}};`);
}

test('transient audio cancels future notes, releases active envelopes, and stops idempotently', () => {
  const { run } = game();
  mockAudio(run);
  run('const future=tone(440,.5); future.stop(); future.stop();');
  assert.equal(run('oscillators[0].stops.length'), 2, 'scheduled natural end plus one cancellation');
  assert.equal(run('oscillators[0].stops.at(-1)'), 10);
  assert.equal(run("JSON.stringify(gains[0].gain.events.slice(-2))"), JSON.stringify([['cancel',10],['set',0,10]]));
  assert.equal(run('transientSounds.size'), 0);
  run('const active=tone(440); audio.currentTime+=.1; active.stop(); active.stop();');
  assert.equal(run('oscillators[1].stops.length'), 2);
  assert.ok(Math.abs(run('oscillators[1].stops.at(-1)')-10.12)<1e-8);
  assert.equal(run("oscillators[1].output.gain.events.at(-1)[0]"), 'linear');
  assert.ok(run("oscillators[1].output.gain.events.at(-2)[1]")>0, 'fallback preserves the current envelope before fading');
});

test('transient audio removes completed nodes and bounds overlapping effects', () => {
  const { run } = game();
  mockAudio(run);
  run('const completed=tone(440); oscillators[0].onended(); completed.stop();');
  assert.equal(run('transientSounds.size'), 0);
  assert.equal(run('oscillators[0].disconnected && gains[0].disconnected'), true);
  assert.equal(run('oscillators[0].stops.length'), 1, 'ending naturally makes subsequent stop harmless');
  run('for(let i=0;i<49;i++)tone(440,.5);');
  assert.equal(run('transientSounds.size'), 48);
  assert.equal(run('oscillators[1].stops.at(-1)'), 10, 'oldest future note is cancelled at the cap');
  run('stopTransientSounds(); stopTransientSounds();');
  assert.equal(run('transientSounds.size'), 0);
  assert.equal(run('oscillators.slice(1).every(o=>o.stops.length===2)'), true);
});

test('navigation, resize and background cleanup stop transient audio while menu entry preserves its fanfare', () => {
  const { run } = game();
  mockAudio(run);
  for (const cleanup of ["setMode('menu')", 'resize()', 'quietGame()']) {
    run(`tone(440,.5); sfx.thump(); ${cleanup};`);
    assert.equal(run('transientSounds.size'), 0, cleanup);
    assert.equal(run('oscillators.at(-2).stops.at(-1)'), 10, 'pending note cancelled');
    assert.ok(Math.abs(run('oscillators.at(-1).stops.at(-1)')-10.02)<1e-8, 'drum releases');
  }
  run(`setMode('menu'); preloadVoice=()=>{};
    const button=state.menuButtons.find(b=>b.mode==='silly');
    canvasListeners.pointerdown({preventDefault(){},clientX:button.x,clientY:button.y,pointerId:1});`);
  assert.equal(run('state.mode'), 'silly');
  assert.equal(run('transientSounds.size'), 5, 'entry fanfare is created after mode cleanup');
  assert.equal(run('oscillators.slice(-5).every(o=>o.stops.length===1)'), true);
});
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
    audio = { currentTime: 1, destination: {},
      createGain() { return { gain: { setValueAtTime() {} }, connect() {} }; }, createBufferSource() {
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

test('songs play every note at its beat, finish once, and keep targets fixed', () => {
  const { run } = game();
  run(`setMode('explore'); state.talk = false;
    const played = []; let cancelled = 0;
    tone = (freq, when, duration) => {
      played.push({freq, duration}); return {stop() {cancelled++;}};
    };
    const positions = JSON.stringify(state.bodies.map(b => [b.x,b.y]));`);
  for (let index = 0; index < 3; index++) {
    run(`played.length = 0; startSong(${index});`);
    const count = run('state.song.notes.length');
    assert.equal(run('played.length'), 2, 'first note starts immediately');
    run(`const playing${index} = state.song;`);
    for (let i = 1; i < count; i++) {
      run(`state.time = playing${index}.started + playing${index}.notes[${i}].at + .001; update(.016);`);
      assert.equal(run('played.length'), (i + 1) * 2);
    }
    assert.equal(run('JSON.stringify(state.bodies.map(b => [b.x,b.y]))'), run('positions'));
    run(`state.time = playing${index}.started + playing${index}.duration + .01; update(.016); draw();`);
    assert.equal(run('state.song'), null);
    run('state.time += 5; update(.016);');
    assert.equal(run('played.length'), count * 2, 'songs do not loop or echo');
  }
});

test('song controls replace and stop playback, play-along avoids echo, lifecycle cleans up', () => {
  const { run } = game();
  run(`setMode('explore'); state.talk=false;
    let cancelled=0; const played=[];
    tone=(freq)=>{played.push(freq); return {stop(){cancelled++;}};};
    startSong(0); const oldSong=state.song; startSong(1);`);
  assert.equal(run('cancelled'), 2);
  assert.equal(run('state.song.index'), 1);
  run(`const b=state.bodies[4]; exploreTap(b.x,b.y,1);`);
  assert.equal(run('state.song.index'), 1);
  assert.equal(run('state.echo.notes.length'), 0);
  assert.equal(run('played[4]'), run('SONG_SCALE[4]'), 'play-along matches melody tuning');
  run('releaseAllHolds(); const stop= songControls().stop; exploreTap(stop.x+10,stop.y+10,2);');
  assert.equal(run('state.song'), null);
  for (const cleanup of ["resize()", "quietGame()", "setMode('menu')", "exploreTap(talkButton().x,talkButton().y,3)"]) {
    run(`state.talk=false; setMode('explore'); startSong(0); ${cleanup};`);
    assert.equal(run('state.song'), null, cleanup);
  }
  run(`state.talk=false; setMode('explore'); startSong(0);
    audio={currentTime:0}; state.song.started=0;
    audio.currentTime=10; played.length=0; updateSong();`);
  assert.ok(run('played.length') <= 2, 'slow frames skip missed notes without a burst');
});

test('personal stars speak the right names in Talk and Music without grabbing notes', () => {
  const { run } = game();
  for (const talk of [true, false]) {
    run(`setMode('explore'); state.talk=${talk};`);
    for (let i = 0; i < 2; i++) {
      run(`{ const star=nameStars()[${i}]; exploreTap(star.x,star.y,4); draw(); }`);
      assert.equal(run('responses.at(-1).keys[0]'), i ? 'Langston' : 'Jettson');
      assert.equal(run('state.holds.size'), 0);
      assert.equal(run('state.spotlight'), null);
    }
  }
  run('startSong(0); const star=nameStars()[0]; exploreTap(star.x,star.y,5);');
  assert.equal(run('state.song.index'), 0, 'a name star leaves the song playing');
});


test('Home navigates immediately on pointerdown and cleans up active sound', () => {
  const { run } = game();
  run(`unlockAudio=()=>{}; preloadVoice=()=>{};
    const pointer=(x,y,id=1)=>canvasListeners.pointerdown({preventDefault(){},clientX:x,clientY:y,pointerId:id});
    setMode('explore'); state.talk=false; startSong(0);
    pointer(HOME.x,HOME.y);`);
  assert.equal(run('state.mode'), 'menu');
  assert.equal(run('state.song'), null);
  run(`const sillyButton=state.menuButtons.find(b=>b.mode==='silly'); pointer(sillyButton.x,sillyButton.y);
    let stopped=0; tone=()=>({stop(){stopped++;}});
    pointer(state.sun.x,state.sun.y); state.time+=.4; update(.016);
    pointer(HOME.x,HOME.y);`);
  assert.equal(run('state.mode'), 'menu');
  assert.equal(run('state.silly'), null);
  assert.ok(run('stopped') > 0);
});

test('Silly feather tickles on a tap, holding the character does not, and cleanup cancels', () => {
  const { run } = game();
  run(`setMode('silly'); const sounds=[];
    tone=()=>{const sound={stopped:false,stop(){this.stopped=true;}}; sounds.push(sound); return sound;};
    sillyTap(state.sun.x,state.sun.y,1); state.time+=3; update(.016);`);
  assert.equal(run('state.silly.tickling'), false, 'holding the character leaves dragging available');
  run(`endHold({pointerId:1}); const feather=sillyToys()[0]; sillyTap(feather.x,feather.y,2); endHold({pointerId:2}); draw();`);
  assert.equal(run('state.silly.tickling'), false, 'the feather approaches before laughter begins');
  assert.equal(run('state.silly.touches.size'), 0, 'toy taps do not grab the character');
  run('state.time+=.5; update(.016); draw();');
  assert.ok(run('state.silly.sounds.length') > 0, 'contact produces laughter');
  run('sillyTap(feather.x,feather.y,3); state.time+=1; update(.016);');
  assert.equal(run('state.silly.tickling'), true, 'another tap refreshes the laugh');
  run('state.time+=1.3; update(.016);');
  assert.equal(run('state.silly.tickling'), false);
  assert.equal(run('sounds.every(sound=>sound.stopped)'), true);
  for (const cleanup of ['quietGame()', 'resize()', "setMode('menu')"]) {
    run(`{ setMode('silly'); const toy=sillyToys()[0]; sillyTap(toy.x,toy.y,1); ${cleanup}; }`);
    assert.equal(run('sounds.every(sound=>sound.stopped)'), true, cleanup);
    assert.equal(run('state.silly ? state.silly.touches.size : 0'), 0);
  }
});

test('Silly taps use Music tones and six quick taps complete an uninterrupted full spin', () => {
  const { run } = game();
  run(`setMode('silly'); const tones=[];
    tone=(freq)=>{tones.push(freq);return {stop(){}};};
    const center=JSON.stringify([state.sun.x,state.sun.y,state.sun.r]);`);
  for (let i=0; i<6; i++) {
    run('sillyTap(state.sun.x,state.sun.y,1); endHold({pointerId:1});');
    assert.equal(run('tones.at(-2)'), run(`SCALE[${i}]`));
    assert.equal(run('tones.at(-1)'), run(`SCALE[${i}]*2`));
    if(i<5) run('state.time+=.1;');
  }
  assert.equal(run('state.silly.spins'), 1);
  assert.equal(run('sillyRotation()'), 0);
  run('const spinStart=state.silly.spinAt; state.time=spinStart+.55;');
  assert.ok(Math.abs(run('sillyRotation()')-Math.PI)<.00001);
  run('sillyTap(state.sun.x,state.sun.y,2); endHold({pointerId:2});');
  assert.equal(run('state.silly.spinAt'), run('spinStart'), 'extra taps do not restart a turn');
  run('state.time=spinStart+1.1; draw();');
  assert.equal(run('sillyRotation()'), run('TAU'));
  assert.equal(run('JSON.stringify([state.sun.x,state.sun.y,state.sun.r])'), run('center'));
  // Further bursts rotate through party hat, rainbow freckles, and star glasses.
  for(let i=1; i<=2; i++) {
    run(`state.time+=2; for(let j=0;j<6;j++){sillyTap(state.sun.x,state.sun.y,1);endHold({pointerId:1});state.time+=.1;} draw();`);
    assert.equal(run('state.silly.surprise'), i);
  }
  run('quietGame();');
  assert.equal(run('state.silly.spinAt'), -99);
});


test('finger dragging follows the angle, coasts on release, and ignores a stale or cancelled fling', () => {
  const { run } = game();
  run(`setMode('silly'); const cx=state.sun.x, cy=state.sun.y, radius=state.sun.r;
    const move=(x,y,id=1,at=16)=>sillyDrag({clientX:x,clientY:y,pointerId:id,timeStamp:at});
    sillyTap(cx+radius,cy,1); move(cx,cy+radius);`);
  assert.ok(Math.abs(run('sillyRotation()')-Math.PI/2)<.00001);
  const angle=run('sillyRotation()');
  run('state.time+=.05; update(.05);');
  assert.equal(run('sillyRotation()'), angle, 'no momentum while the finger owns the character');
  run('endHold({pointerId:1,type:"pointerup"}); update(.05);');
  assert.ok(run('sillyRotation()')>angle);
  assert.ok(run('state.silly.velocity')<10);
  run('quietGame(); sillyTap(cx-radius,cy+1,1); move(cx-radius,cy-1);');
  assert.ok(Math.abs(run('sillyRotation()'))<.05, 'crossing the angle wrap does not jump a turn');
  run('endHold({pointerId:1,type:"pointercancel"});');
  assert.equal(run('state.silly.velocity'), 0);
  run('sillyTap(cx,cy,1); move(cx+80,cy);');
  assert.ok(run('sillyRotation()')>.1, 'a swipe starting in the middle still turns');
  run('state.time+=.3; endHold({pointerId:1,type:"pointerup"});');
  assert.equal(run('state.silly.velocity'), 0, 'holding still before release prevents a stale fling');
  run('sillyTap(cx+radius,cy,1); sillyTap(cx-radius,cy,2); move(cx,cy+radius); endHold({pointerId:1});');
  assert.equal(run('state.silly.dragId'), 2);
  run('endHold({pointerId:2,type:"pointerleave"});');
  assert.equal(run('state.silly.dragId'), null);
  assert.equal(run('state.silly.velocity'), 0);
});

test('every planet and Sun can be selected, tickled, dressed up and resized', () => {
  const { run } = game();
  run("setMode('silly');");
  assert.equal(run('sillyFriends().length'), 9);
  for (let i=0;i<9;i++) {
    run(`{ const friend=sillyFriends()[${i}]; sillyTap(friend.x,friend.y,1); }`);
    assert.equal(run('state.silly.friend?.name || "Sun"'), ['Sun','Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune'][i]);
    run('const feather'+i+'=sillyToys()[0]; sillyTap(feather'+i+'.x,feather'+i+'.y,2); state.time+=.4; update(.016); draw();');
    assert.equal(run('state.silly.tickling'), true);
    run(`{ const gift=sillyToys()[1]; sillyTap(gift.x,gift.y,3); draw(); } resize(); draw();`);
    assert.equal(run('state.silly.tickling'), false);
    assert.equal(run('state.silly.touches.size'), 0);
    assert.equal(run('state.silly.friend?.name || "Sun"'), ['Sun','Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune'][i]);
  }
});

test('center-origin swipes keep their mapping beyond the center zone and transfer ownership smoothly', () => {
  const { run } = game();
  run(`setMode('silly'); const cx=state.sun.x, cy=state.sun.y, r=state.sun.r;
    sillyTap(cx,cy,1);
    sillyDrag({clientX:cx+r*.4,clientY:cy,pointerId:1,timeStamp:16});
    const firstAngle=sillyRotation();
    sillyDrag({clientX:cx+r*.8,clientY:cy,pointerId:1,timeStamp:32});`);
  assert.ok(Math.abs(run('sillyRotation()-firstAngle')-.4)<1e-8, 'horizontal motion still rotates outside the initial center zone');
  run(`sillyTap(cx,cy,2); endSillyTouch({pointerId:1,type:'pointerup'});
    const transferredAngle=sillyRotation();
    sillyDrag({clientX:cx+r*.4,clientY:cy,pointerId:2,timeStamp:48});`);
  assert.ok(Math.abs(run('sillyRotation()-transferredAngle')-.4)<1e-8, 'new owner uses its own starting position');
});

test('outer-origin drags cross the center without an angular half-turn jump', () => {
  const { run } = game();
  run(`setMode('silly'); const cx=state.sun.x,cy=state.sun.y,r=state.sun.r;
    sillyTap(cx+r,cy,1);
    sillyDrag({clientX:cx+r*.1,clientY:cy,pointerId:1,timeStamp:16});
    const beforeCenter=sillyRotation();
    sillyDrag({clientX:cx-r*.1,clientY:cy,pointerId:1,timeStamp:32});`);
  assert.ok(Math.abs(run('sillyRotation()-beforeCenter')+.2)<1e-8,
    'a short movement through the center produces a small horizontal turn');
  run(`quietGame(); sillyTap(cx+r,cy,2);
    const beforeCrossing=sillyRotation();
    sillyDrag({clientX:cx-r,clientY:cy,pointerId:2,timeStamp:48});`);
  assert.ok(Math.abs(run('sillyRotation()-beforeCrossing')+2)<1e-8,
    'a segment whose endpoints are outside the center zone still uses horizontal mapping when it crosses the center');
});

test('secondary pointers join an active drag without triggering music or automatic spins', () => {
  const { run } = game();
  run(`setMode('silly'); preloadVoice=()=>{}; const cx=state.sun.x,cy=state.sun.y,r=state.sun.r;
    const down=(x,y,id)=>canvasListeners.pointerdown({preventDefault(){},clientX:x,clientY:y,pointerId:id});
    const move=(x,y,id)=>canvasListeners.pointermove({preventDefault(){},clientX:x,clientY:y,pointerId:id,timeStamp:16});
    down(cx+r,cy,1); move(cx,cy+r,1);
    const countBefore=state.silly.count, angleBefore=sillyRotation();
    for(let id=2;id<=8;id++) down(cx,cy,id);`);
  assert.equal(run('state.silly.count'), run('countBefore'));
  assert.equal(run('state.silly.spins'), 0);
  assert.equal(run('sillyRotation()'), run('angleBefore'));
  assert.equal(run('state.silly.touches.size'), 8);
  run(`canvasListeners.lostpointercapture({pointerId:1});`);
  assert.equal(run('state.silly.dragId'), 2);
  assert.equal(run('state.silly.velocity'), 0);
  run(`for(let id=2;id<=8;id++) canvasListeners.pointercancel({pointerId:id,type:'pointercancel'});`);
  assert.equal(run('state.silly.touches.size'), 0);
  assert.equal(run('state.silly.dragId'), null);
});

test('feather contact controls laughter and hero or gift interrupts the entire feather action', () => {
  const { run } = game();
  run(`setMode('silly'); const sounds=[];
    tone=()=>{const sound={stopped:false,stop(){this.stopped=true;}}; sounds.push(sound); return sound;};
    const feather=sillyToys()[0],gift=sillyToys()[1];
    sillyTap(feather.x,feather.y,1); const start=state.time;
    state.time=start+.34; update(.016);`);
  assert.equal(run('state.silly.tickling'), false);
  run('state.time=start+.36; update(.016);');
  assert.equal(run('state.silly.tickling'), true);
  run('state.time=start+1.86; update(.016);');
  assert.equal(run('state.silly.tickling'), false, 'laughter stops as the feather withdraws');
  assert.equal(run('sounds.every(sound=>sound.stopped)'), true);
  for (const interaction of ['sillyTap(state.sun.x,state.sun.y,2)', 'sillyTap(gift.x,gift.y,2)']) {
    run(`sillyTap(feather.x,feather.y,1); state.time+=.4; update(.016);
      const oldSounds${interaction.includes('gift') ? 'Gift' : 'Hero'}=state.silly.sounds.slice(); ${interaction};`);
    assert.equal(run('state.silly.featherAt'), -99);
    assert.equal(run('state.silly.tickleUntil'), -99);
    assert.equal(run('state.silly.tickling'), false);
    assert.equal(run(`oldSounds${interaction.includes('gift') ? 'Gift' : 'Hero'}.every(sound=>sound.stopped)`), true);
    run('state.time+=.5; update(.016);');
    assert.equal(run('state.silly.tickling'), false, 'old feather action cannot restart laughter');
  }
});

test('either toy catches the current orientation and clears all character gesture ownership', () => {
  const { run } = game();
  for (let toy=0;toy<2;toy++) {
    run(`setMode('silly');
      for(let i=0;i<6;i++){sillyTap(state.sun.x,state.sun.y,1);endSillyTouch({pointerId:1,type:'pointerup'});state.time+=.1;}
      state.time+=.2;
      sillyTap(state.sun.x,state.sun.y,1); sillyTap(state.sun.x,state.sun.y,2);
      const before${toy}=sillyRotation();
      {const toy=sillyToys()[${toy}];sillyTap(toy.x,toy.y,3);}`);
    assert.equal(run('sillyRotation()'), run(`before${toy}`));
    assert.equal(run('state.silly.spinAt'), -99);
    assert.equal(run('state.silly.touches.size'), 0);
    assert.equal(run('state.silly.dragId'), null);
    assert.equal(run('state.silly.velocity'), 0);
  }
});
