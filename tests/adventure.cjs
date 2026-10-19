// Exercise the real adventure event handlers in a small view harness. Browser checks
// cover actual DOM layout/pointers; these protect scoring, retries and navigation.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function journey(stored) {
  const classes=new Set(), nodes=new Map(), events={}, timers=new Map();
  let uid=0, now=1000, speech=[], notes=0, activeNotes=0, saves=[], root;
  function element(id='') {
    if(nodes.has(id))return nodes.get(id);
    const el={dataset:{},style:{},innerHTML:'',textContent:'',hidden:false,offsetWidth:1,scrollTop:0,
      classList:{contains(c){return classes.has(c);},add(...v){v.forEach(c=>classes.add(c));},remove(...v){v.forEach(c=>classes.delete(c));},toggle(){}},
      focus(){},setAttribute(){},insertAdjacentHTML(){},remove(){},append(){},
      addEventListener(name,fn){events[id+':'+name]=fn;},
      querySelector(selector){return element(selector);},querySelectorAll(selector){return selector==='.letter-slot'?Array.from({length:8},(_,i)=>element('letter'+i)):[];},
      getContext(){return {drawImage(){}};},toDataURL(){return 'data:image/png;base64,x';}
    };
    nodes.set(id,el);return el;
  }
  const sandbox={console,Map,Set,Math,Array,JSON,performance:{now:()=>now},
    localStorage:{getItem:()=>stored||null,setItem:(_,value)=>saves.push(JSON.parse(value))},
    document:{createElement(tag){if(tag==='main'){root=element('root');return root;}return element('created-'+(++uid));},body:element('body'),querySelector:selector=>element(selector),addEventListener(){}},
    window:{addEventListener(){}},setTimeout(fn){const id=++uid;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),
    PLANETS:['Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune'].map(name=>({name})),canvas:{width:1024,style:{}},W:1024,H:768,
    ctx:{clearRect(){}},drawPlanet(){},smallSun(){},drawFace(){},SCALE:[1,2,3,4,5,6],
    state:{talk:true},setMode(){},quietGame(){},setGameMuted(){},unlockAudio(){},stopSpeaking(){speech=[];},say(...keys){speech.push(...keys);},tone(){notes++;activeNotes++;let stopped=false;return {stop(){if(!stopped)activeNotes--;stopped=true;}};},shuffle:a=>a};
  vm.runInNewContext(fs.readFileSync('adventure.js','utf8'),sandbox);
  function click(dataset={},extra={}) {
    const b={dataset,disabled:false,classList:element('button-class').classList,closest(){return b;},...extra};
    events['root:click']({target:b});return b;
  }
  return {click,nodes,saves,timers,html:()=>root.innerHTML,feedback:()=>element('#feedback').textContent,speech:()=>speech,notes:()=>notes,activeNotes:()=>activeNotes,advance:ms=>now+=ms,
    go:screen=>click({go:screen}),muted:()=>events['#mute:click'](),home:()=>events['#journey-home:pointerdown']({button:0})};
}
test('parade retries incorrect placements, completes three levels and replays cleanly',()=>{
  const j=journey();j.go('order');
  j.click({planet:'2'});j.click({slot:'0'});assert.match(j.feedback(),/Try Mercury/);
  for(const count of [3,4,8]){
    for(let i=0;i<count;i++){j.click({planet:String(i)});j.click({slot:String(i)});}
    assert.match(j.feedback(),/parade is ready/);j.click({action:'order-next'});
  }
  assert.match(j.html(),/Neptune sticker/);assert.ok(j.saves.at(-1).stickers.includes('Neptune'));
  j.go('order');assert.match(j.html(),/data-slot="0"[^>]*><b>1/);
});
test('all detective clues support wrong answers, hints and a single correct reward',()=>{
  const j=journey();j.go('detective');
  for(const p of [3,5,4,1,6]){
    j.click({planet:'7'});assert.match(j.feedback(),/^♡/);
    j.click({action:'hint'});j.click({planet:String(p)});assert.match(j.feedback(),/^★/);
    const saved=j.saves.length;j.click({planet:String(p)});assert.equal(j.saves.length,saved,'duplicate answer must not reward again');
    j.nodes.get('root').scrollTop=150;j.click({action:'next'});assert.equal(j.nodes.get('root').scrollTop,0);
  }
  assert.match(j.html(),/Venus sticker/);assert.match(j.html(),/Play again/);
});
test('feature matches reveal a useful hint and finish all three puzzles',()=>{
  const j=journey();j.go('puzzles');
  for(const answer of ['ring','moon','storm']){
    j.click({piece:'cloud'});assert.match(j.feedback(),/^♡/);
    j.click({piece:answer});assert.match(j.feedback(),/^★/);j.click({action:'next'});
  }
  assert.match(j.html(),/Saturn sticker/);
});
test('letters reject an incorrect tile, match each name and finish',()=>{
  const j=journey();j.go('letters');j.click({letter:'Z'});assert.match(j.feedback(),/letter M/);
  for(const name of ['MARS','EARTH','SATURN']){
    for(const letter of name)j.click({letter});
    assert.match(j.feedback(),new RegExp(name.split('').join(' · ')));j.click({action:'spell-next'});
  }
  assert.match(j.html(),/Saturn sticker/);
});
test('Home cancels pending prompts, sticker storage survives visits, corrupt storage is safe',()=>{
  const j=journey('{broken');j.go('detective');assert.ok(j.timers.size>0);j.home();assert.equal(j.timers.size,0);assert.match(j.html(),/Hi, I’m Pip/);
  const saved=journey(JSON.stringify({muted:true,stickers:['Earth','not-a-planet']}));assert.match(saved.html(),/1\/8/);
  saved.go('meet');saved.click({planet:'0'});assert.deepEqual(saved.saves.at(-1).stickers,['Earth','Mercury']);
  saved.muted();assert.equal(saved.saves.at(-1).muted,false);
});


test('Pip reactions respond immediately, vary, stay bounded under mashing and respect mute',()=>{
  const j=journey();j.go('play');
  j.click({action:'tickle'});assert.equal(j.nodes.get('.pip > img').src,'art/pip-laugh.svg');
  assert.ok(j.activeNotes()>0);
  for(let i=0;i<20;i++){j.advance(180);j.click({action:'tickle'});assert.ok(j.activeNotes()<=15);}
  j.advance(200);j.click({action:'five'});assert.equal(j.nodes.get('.pip > img').src,'art/pip-five.svg');
  for(const hat of ['🎉','👑','🌈','']){j.advance(200);j.click({action:'hat'});assert.equal(j.nodes.get('.pip-hat').textContent,hat);}
  j.muted();assert.equal(j.activeNotes(),0);
  const notes=j.notes();j.advance(200);j.click({action:'tickle'});assert.equal(j.notes(),notes);
  j.home();assert.equal(j.activeNotes(),0);assert.equal(j.timers.size,0);
});

test('a grown-up can cancel or confirm a fresh sticker collection',()=>{
  const j=journey(JSON.stringify({stickers:['Earth','Saturn']}));j.go('stickers');
  j.click({action:'reset-stickers'});assert.equal(j.saves.length,0);
  j.click({action:'keep-stickers'});assert.equal(j.saves.length,0);
  j.click({action:'reset-stickers'});j.click({action:'confirm-reset'});
  assert.equal(j.saves.at(-1).stickers.length,0);assert.match(j.html(),/0 of 8/);
});
