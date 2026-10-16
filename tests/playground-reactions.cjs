// Behavioral VM checks; no audio device or network required.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function game({ storage = new Map(), blocked = false } = {}) {
  const canvasListeners = {}, windowListeners = {}, documentListeners = {};
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => gradient : () => {} });
  const nodes = [], requests = [];
  const param = () => ({ value: 1, events: [], setValueAtTime(v, t) { this.value=v; this.events.push(['set',v,t]); },
    linearRampToValueAtTime(v,t) { this.value=v; this.events.push(['linear',v,t]); },
    exponentialRampToValueAtTime(v,t) { this.value=v; this.events.push(['exp',v,t]); }, cancelScheduledValues() {} });
  function node(kind) { const n = {kind, gain:param(), frequency:param(), playbackRate:param(), connections:[], starts:[], stops:[],
    connect(to) { this.connections.push(to); return to; }, disconnect() { this.disconnected=true; },
    start(at) { this.starts.push(at); }, stop(at) { this.stops.push(at); } }; nodes.push(n); return n; }
  const audio = {currentTime:10,state:'running',destination:{},createGain:()=>node('gain'),createOscillator:()=>node('oscillator'),
    createBufferSource:()=>node('buffer'),decodeAudioData:async()=>({sampleRate:30,getChannelData:()=>new Float32Array(30)}),resume:async()=>{}};
  let now = 10000;
  const sandbox = { console, Math, Map, performance:{now:()=>0}, Date:{now:()=>now},
    document:{hidden:false,getElementById:()=>({getContext:()=>ctx,addEventListener:(n,f)=>canvasListeners[n]=f}),documentElement:{},addEventListener:(n,f)=>documentListeners[n]=f},
    window:{innerWidth:1280,innerHeight:800,addEventListener:(n,f)=>windowListeners[n]=f},
    localStorage:{getItem(k){if(blocked)throw Error('blocked');return storage.get(k);},setItem(k,v){if(blocked)throw Error('blocked');storage.set(k,v);}},
    getComputedStyle:()=>({getPropertyValue:()=> '0'}), navigator:{},requestAnimationFrame(){},setTimeout(){},
    fetch:url=>new Promise(resolve=>requests.push({url,resolve})),mockAudio:audio };
  vm.createContext(sandbox); vm.runInContext(fs.readFileSync('game.js','utf8'),sandbox);
  const run = code => vm.runInContext(code,sandbox);
  run("audio=mockAudio; setMode('silly'); preloadVoice=()=>{};");
  function pointer(type,x,y,id=1,timeStamp=0) { canvasListeners[type]({type,clientX:x,clientY:y,pointerId:id,timeStamp,preventDefault(){}}); }
  function tick(dt=.05) { run(`state.time+=${dt}; updateSilly(${dt});`); }
  function ready() { run("for(const key of ['reaction-whoa','reaction-whee','reaction-giggle'])readyClips.set(key,{key});"); }
  function spin(speed,frames=10) { const x=run('state.sun.x'),y=run('state.sun.y'),r=run('state.sun.r'); pointer('pointerdown',x,y); for(let i=1;i<=frames;i++){pointer('pointermove',x+i*speed*r*.05,y,1,i*50);tick();} }
  return {run,nodes,requests,audio,pointer,tick,ready,spin,storage,windowListeners,documentListeners,sandbox,advanceClock:()=>now+=6000};
}
const buffers = g => g.nodes.filter(n=>n.kind==='buffer');

test('intentional slow and fast spins in either direction select short reactions', () => {
  for(const [speed,key] of [[1.5,'reaction-whoa'],[-1.5,'reaction-whoa'],[8,'reaction-whee'],[-8,'reaction-whee']]) {
    const g=game();g.ready();g.spin(speed);
    assert.equal(buffers(g)[0]?.buffer.key,key,`speed ${speed}`);
    assert.equal(buffers(g).length,1,'one bounded voice while moving');
  }
});

test('fast spin onset at 60 Hz chooses Whee without a premature slow reaction', () => {
  const g=game();g.ready();const x=g.run('state.sun.x'),y=g.run('state.sun.y'),r=g.run('state.sun.r');
  g.pointer('pointerdown',x,y);
  for(let i=1;i<=12;i++){g.pointer('pointermove',x+i*r*8/60,y,1,i*1000/60);g.tick(1/60);}
  assert.equal(buffers(g)[0]?.buffer.key,'reaction-whee');assert.equal(buffers(g).length,1);
});

test('jitter and resting fingers stay quiet; finished reactions respect cooldown and idle coast never chatters', () => {
  const g=game();g.ready();const x=g.run('state.sun.x'),y=g.run('state.sun.y');
  g.pointer('pointerdown',x,y);g.pointer('pointermove',x+4,y);for(let i=0;i<40;i++)g.tick();
  assert.equal(buffers(g).length,0);
  g.pointer('pointerup',x+4,y);g.spin(8,3);
  assert.equal(buffers(g).length,1);buffers(g)[0].onended();
  for(let i=0;i<20;i++)g.tick();assert.equal(buffers(g).length,1,'stationary finger cannot repeat stale velocity');
  g.pointer('pointerup',x,y);for(let i=0;i<100;i++)g.tick();
  assert.equal(buffers(g).length,1,'coast has finite reaction eligibility');
});

test('continuous deliberate spinning waits between completed clips and late onended cannot clear a newer voice', () => {
  const g=game();g.ready();const x=g.run('state.sun.x'),y=g.run('state.sun.y'),r=g.run('state.sun.r')*.7;
  g.pointer('pointerdown',x+r,y);const reactionTimes=[];
  for(let i=1;i<=100;i++) {
    g.pointer('pointermove',x+Math.cos(i*.1)*r,y+Math.sin(i*.1)*r,1,i*50);g.tick();
    const source=buffers(g).at(-1);
    if(source && !source.testEnded) {reactionTimes.push(g.run('state.time'));source.testEnded=true;source.onended();}
  }
  assert.ok(reactionTimes.length>=2,'sustained play can react again');
  for(let i=1;i<reactionTimes.length;i++)assert.ok(reactionTimes[i]-reactionTimes[i-1]>=1.39,'reactions never pile up');
  g.run("playReaction('reaction-whoa')");const old=buffers(g).at(-1);
  g.run("stopReaction();playReaction('reaction-whee')");const fresh=buffers(g).at(-1);old.onended();
  assert.equal(g.run('reactionCurrent'),fresh,'stale completion cannot release newer voice ownership');
});

test('catching, cancellation, navigation, resize, blur and hiding end reactions', () => {
  for(const action of ['catch','cancel','home','resize','blur','hidden']) {
    const g=game();g.ready();g.spin(8,3);const source=buffers(g)[0];assert.ok(source);
    if(action==='catch') {g.pointer('pointerup',0,0);g.pointer('pointerdown',g.run('state.sun.x'),g.run('state.sun.y'));}
    if(action==='cancel')g.pointer('pointercancel',0,0);
    if(action==='home')g.run("setMode('menu')");
    if(action==='resize')g.run('resize()');
    if(action==='blur')g.windowListeners.blur();
    if(action==='hidden'){g.sandbox.document.hidden=true;g.documentListeners.visibilitychange();}
    assert.equal(source.stops.length,1,action);assert.equal(g.run('reactionCurrent'),null,action);
  }
});

test('bubbles are bounded, pop without claiming a drag, and yield to hero and dock', () => {
  const g=game();
  g.run('for(let i=0;i<100;i++)makeBubbles()');assert.equal(g.run('state.silly.bubbles.length'),4);
  const p=g.run('bubblePosition(state.silly.bubbles[0])');g.pointer('pointerdown',p.x,p.y);
  assert.equal(g.run('state.silly.bubbles.length'),3);assert.equal(g.run('state.silly.touches.size'),0);
  g.run('state.silly.bubbles.push({x:state.sun.x,y:state.sun.y,r:40,note:0,phase:0,at:state.time})');
  g.pointer('pointerdown',g.run('state.sun.x'),g.run('state.sun.y'));
  assert.equal(g.run('state.silly.touches.has(1)'),true);assert.equal(g.run('state.silly.bubbles.length'),4);
  const bubble=g.run('bubblePosition(state.silly.bubbles[0])');g.pointer('pointerdown',bubble.x,bubble.y,2);
  assert.equal(g.run('state.silly.dragId'),1,'bubble tap by a second finger keeps the hero owner');assert.equal(g.run('state.silly.touches.has(2)'),false);
  g.run('const dock=sillyFriends()[3];state.silly.bubbles.push({x:dock.x,y:dock.y,r:40,note:0,phase:0,at:state.time})');
  g.pointer('pointerdown',g.run('dock.x'),g.run('dock.y'),2);
  assert.equal(g.run('state.silly.friend===dock.planet'),true);assert.equal(g.run('state.silly.bubbles.length'),0);
});

test('sound control changes running synth and voice together and persists normal/soft/off', () => {
  const g=game();g.ready();g.run("tone(440);playReaction('reaction-whoa')");
  const master=g.run('masterGain');const synth=g.nodes.find(n=>n.kind==='oscillator');
  assert.equal(synth.connections[0].connections[0],master);assert.equal(buffers(g)[0].connections[0],master);
  for(const [mode,gain] of [['soft',.3],['off',0],['normal',1]]) {
    const p=g.run('soundControl()');g.pointer('pointerdown',p.x,p.y);
    assert.equal(g.run('soundMode'),mode);assert.equal(master.gain.events.at(-1)[1],gain);
    assert.equal(game({storage:g.storage}).run('soundMode'),mode);
  }
  g.run("setSoundMode('invalid')");assert.equal(g.run('soundMode'),'normal');
  const blocked=game({blocked:true});blocked.run("setSoundMode('off');tone(440)");assert.equal(blocked.run('soundMode'),'off');assert.equal(blocked.run('masterGain.gain.value'),0);
});

test('failed HTTP clips retry after backoff and late downloads never queue reactions', async () => {
  const g=game();const first=g.run("loadClip('reaction-whoa')");
  g.requests.shift().resolve({ok:false,status:503,arrayBuffer(){throw Error('must not decode HTTP errors');}});
  assert.equal(await first,null);assert.equal(g.run("readyClips.has('reaction-whoa')"),false);
  assert.equal(await g.run("loadClip('reaction-whoa')"),null);assert.equal(g.requests.length,0);
  g.advanceClock();const retry=g.run("loadClip('reaction-whoa')");assert.equal(g.requests.length,1);
  assert.equal(g.run("playReaction('reaction-whoa')"),false);
  g.run('stopReaction()');g.requests.shift().resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)});await retry;
  assert.equal(buffers(g).length,0,'completed download cannot play by itself');
  assert.equal(g.run("playReaction('reaction-whoa')"),true);assert.equal(buffers(g).length,1);
});

test('interrupted AudioContext resumes and both async rejection and sync throw are handled', async () => {
  const g=game();let resumes=0;g.audio.state='interrupted';
  g.audio.resume=()=>{resumes++;return Promise.reject(Error('gesture required'));};
  g.run('unlockAudio()');await new Promise(resolve=>setImmediate(resolve));assert.equal(resumes,1);
  g.audio.resume=()=>{resumes++;throw Error('unavailable');};assert.doesNotThrow(()=>g.run('unlockAudio()'));assert.equal(resumes,2);
});
