'use strict';
// A semantic, touch-friendly adventure around the original Canvas playground.
(() => {
  const names = PLANETS.map(p => p.name);
  const root = document.createElement('main');
  root.id = 'adventure';
  document.body.append(root);
  const toolbar = document.createElement('nav');
  toolbar.className = 'global-tools';
  toolbar.setAttribute('aria-label', 'Game controls');
  toolbar.innerHTML = '<button id="journey-home" aria-label="Home">⌂ <span>Home</span></button><button id="mute" aria-pressed="false">♫ Sound on</button>';
  document.body.append(toolbar);
  const pictures = [];
  // Reuse the actual procedural planet portraits, including rings and sideways Uranus.
  const dpr = canvas.width / W;
  for (let i = 0; i < 9; i++) {
    ctx.clearRect(0, 0, W, H);
    if (i < 8) drawPlanet(PLANETS[i], 128, 128, PLANETS[i].ring ? (i===5 ? 66 : 82) : 88, { happy: true });
    else { smallSun(128, 128, 78); drawFace(128, 128, 65, false, 0, true); }
    const portrait = document.createElement('canvas');
    portrait.width = portrait.height = 256;
    portrait.getContext('2d').drawImage(canvas, 0, 0, 256 * dpr, 256 * dpr, 0, 0, 256, 256);
    pictures.push(portrait.toDataURL());
  }
  // Saturn starts the matching puzzle without its missing feature.
  ctx.clearRect(0, 0, W, H);
  drawPlanet({ ...PLANETS[5], ring: null }, 128, 128, 66, { happy: true });
  const bareSaturn = document.createElement('canvas');
  bareSaturn.width = bareSaturn.height = 256;
  bareSaturn.getContext('2d').drawImage(canvas, 0, 0, 256*dpr, 256*dpr, 0, 0, 256, 256);
  const bareSaturnImage = bareSaturn.toDataURL();
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('planet-pals-journey') || '{}') || {}; } catch (_) { /* private browsing still plays */ }
  const collected = new Set(Array.isArray(saved.stickers) ? saved.stickers.filter(n => names.includes(n)) : []);
  let muted = typeof soundMode !== 'undefined' ? soundMode === 'off' : saved.muted === true;
  let screen = 'home', round = 0, solved = false, selected = null, placed = [], letters = [], hat = 0;
  let reactionTimer, voiceTimer, reactionCount = 0, soundNodes = [], lastReaction = 0, drag = null, suppressClickUntil = 0;
  let orderLevel = 0, questionList = [];
  const orderSets = [[0, 1, 2], [0, 1, 2, 3], [0, 1, 2, 3, 4, 5, 6, 7]];
  const facts = [
    ['Closest to the Sun', 'Mercury is the closest planet to the Sun.'],
    ['The hottest planet', 'Thick clouds trap heat on Venus. Venus is hotter than Mercury!'],
    ['Our blue home', 'Earth is our home. Its oceans are full of water.'],
    ['The red planet', 'Rusty dust makes Mars look red.'],
    ['The biggest planet', 'Jupiter is the biggest planet in our solar system.'],
    ['Big, beautiful rings', 'Saturn’s bright rings are made of pieces of ice and rock.'],
    ['A sideways spinner', 'Uranus spins on its side, like a rolling ball.'],
    ['Cold and windy', 'Neptune is the farthest planet from the Sun. It is cold and windy.']
  ];
  const clues = [
    { p: 3, icon: '🔴', q: 'Which planet is red?', hint: 'Look for the little rusty-red friend.', choices: [2, 3], key: 'clue-red' },
    { p: 5, icon: '🪐', q: 'Who has big, bright rings?', hint: 'Look for a wide ring around its middle.', choices: [3, 5], key: 'clue-rings' },
    { p: 4, icon: '↔', q: 'Which planet is the biggest?', hint: 'It has stripes and a big red storm.', choices: [0, 4, 7], key: 'clue-big' },
    { p: 1, icon: '☀', q: 'Which planet is the hottest?', hint: 'Venus traps heat under thick clouds.', choices: [0, 1, 2], key: 'clue-hot' },
    { p: 6, icon: '↻', q: 'Who spins on its side?', hint: 'Look for the pale blue friend with a sideways face.', choices: [5, 6, 7], key: 'clue-side' }
  ];
  const puzzles = [
    { p: 5, q: 'Give Saturn its rings', hint: 'Choose the wide, oval ring.', answer: 'ring', options: ['moon', 'ring', 'cloud'], key: 'puzzle-rings', fact: 'Saturn’s rings are made of ice and rock. Pip wants to try one on!' },
    { p: 2, q: 'Find Earth’s Moon', hint: 'The Moon is a gray, rocky ball.', answer: 'moon', options: ['ring', 'cloud', 'moon'], key: 'puzzle-moon', fact: 'The Moon travels around Earth. It is our nearest neighbor in space.' },
    { p: 4, q: 'Find Jupiter’s big storm', hint: 'Look for the red oval.', answer: 'storm', options: ['storm', 'moon', 'ring'], key: 'puzzle-storm', fact: 'Jupiter’s Great Red Spot is a giant storm.' }
  ];
  function save() {
    try { localStorage.setItem('planet-pals-journey', JSON.stringify({ stickers: [...collected], muted })); } catch (_) { /* no saving required */ }
  }
  function image(i, cls = '') { return `<img class="planet ${cls}" src="${pictures[i]}" alt="" draggable="false">`; }
  function planetButton(i, attr = '') { return `<button class="planet-card" data-planet="${i}" aria-label="${names[i]}" ${attr}>${image(i)}<span>${names[i]}</span></button>`; }
  function buddy(big = false) { return `<div class="buddy ${big ? 'big' : ''}"><div class="buddy-orbit"></div><button class="pip" aria-label="Tickle Pip the space dinosaur"><img src="art/pip.svg" alt="Pip, a mint green dinosaur in a little space suit" draggable="false"><span class="pip-hat" aria-hidden="true"></span><span class="pip-ring" aria-hidden="true"></span><span class="tickle-feather" aria-hidden="true">🪶</span><span class="five-spark" aria-hidden="true">✦</span></button><span class="reaction" aria-live="polite"></span></div>`; }
  function stopPhrase() { soundNodes.forEach(n => { try { n?.stop(); } catch (_) {} }); soundNodes = []; }
  function cleanup() {
    clearTimeout(voiceTimer); clearTimeout(reactionTimer); stopPhrase(); quietGame();
    drag = null; document.querySelector('.drag-ghost')?.remove();
    const el = root.querySelector('.buddy');
    if (el) {
      el.classList.remove('tickle','flip','five','dance','wobble','wear-ring');
      el.querySelector('.reaction').textContent = '';
      el.querySelector('.pip > img').src = 'art/pip.svg';
    }
  }
  function musical(kind = 'tap') {
    unlockAudio(); stopPhrase();
    if (muted) return;
    const seq = kind === 'win' ? [0, 2, 4, 5] : kind === 'giggle' ? [4, 2, 5, 3, 4] : [reactionCount % 6];
    seq.forEach((n, k) => {
      soundNodes.push(tone(SCALE[n], k * .105, .24, .10));
      soundNodes.push(tone(SCALE[n] * 2, k * .105, .17, .025, 'triangle'));
      if (kind === 'giggle') soundNodes.push(tone(360 + n * 55, k * .105, .08, .055, 'triangle', 210 + n * 30));
    });
  }
  function speak(...keys) {
    clearTimeout(voiceTimer); stopSpeaking();
    unlockAudio(); if (!muted) say(...keys);
  }
  function promptVoice(key, delay = 650) {
    clearTimeout(voiceTimer);
    voiceTimer = setTimeout(() => { if (!muted) speak(key); }, delay);
  }
  function react(kind = 'tickle', force = false) {
    const now = performance.now();
    if (!force && now - lastReaction < 170) return;
    lastReaction = now; reactionCount++;
    clearTimeout(voiceTimer); stopSpeaking();
    const el = root.querySelector('.buddy'); if (!el) return;
    clearTimeout(reactionTimer);
    el.classList.remove('tickle', 'flip', 'five', 'dance', 'wobble');
    void el.offsetWidth;
    const responses = kind === 'tickle' ? ['Hee hee! My space tummy!', 'Again, again!', 'You found my giggle button!'] : kind === 'five' ? ['High five, space friend!', 'Boop! A cosmic high five!'] : kind === 'hat' ? ['Does this suit my spacesuit?', 'Ready for a silly spacewalk!'] : kind === 'win' ? ['We did it!', 'A space somersault for you!'] : kind === 'ring' ? ['A ring for me? Whoooa!', 'I’m a wobbly little Saturn!'] : ['Let’s try together!'];
    el.querySelector('.reaction').textContent = responses[reactionCount % responses.length];
    el.querySelector('.pip > img').src = kind === 'curious' ? 'art/pip-curious.svg' : kind === 'five' ? 'art/pip-five.svg' : 'art/pip-laugh.svg';
    el.classList.add(kind === 'win' ? 'flip' : kind === 'five' ? 'five' : kind === 'hat' || kind === 'ring' ? 'wobble' : kind === 'curious' ? 'dance' : 'tickle');
    if (kind === 'hat') { hat = (hat + 1) % 4; el.querySelector('.pip-hat').textContent = ['','🎉','👑','🌈'][hat]; }
    if (kind === 'ring') el.classList.add('wear-ring');
    musical(kind === 'tickle' ? 'giggle' : kind === 'win' ? 'win' : 'tap');
    reactionTimer = setTimeout(() => { el.classList.remove('tickle','flip','five','dance','wobble','wear-ring'); el.querySelector('.reaction').textContent = ''; el.querySelector('.pip > img').src = 'art/pip.svg'; }, 1900);
  }
  function header(title, sub, key) {
    return `<header class="scene-heading"><div class="eyebrow">JETTSON & LANGSTON’S SPACE CLUB</div><h1 tabindex="-1">${title}</h1><p>${sub}</p>${key ? `<button class="listen" data-voice="${key}" aria-label="Hear instructions">◖)) Listen</button>` : ''}</header>`;
  }
  function dots(total, active) { return `<div class="progress" aria-label="${active} of ${total} completed">${Array.from({length:total}, (_,i) => `<span class="${i < active ? 'done' : ''}">${i < active ? '★' : '○'}</span>`).join('')}</div>`; }
  function startOfScene() { root.scrollTop=0; root.querySelector('h1')?.focus({preventScroll:true}); }
  function feedback() { return '<div id="feedback" class="feedback" role="status" aria-live="polite"></div>'; }
  function tell(text, good = false) { const el = root.querySelector('#feedback'); if (el) { el.textContent = (good ? '★ ' : '♡ ') + text; el.classList.toggle('success', good); } }
  function go(next) {
    cleanup(); screen = next; solved = false; selected = null; placed = []; letters = []; round = 0; orderLevel = 0;
    questionList = next === 'detective' ? clues : puzzles;
    canvas.style.visibility = 'hidden';
    root.hidden = false;
    toolbar.classList.remove('on-canvas');
    setMode('menu'); render();
    startOfScene();
    const keys = {play:'play-intro',order:'order-intro',detective:'clue-red',puzzles:'puzzle-rings',letters:'letters-intro',meet:'meet-intro'};
    if (keys[next]) promptVoice(keys[next]);
  }
  function render() {
    if (screen === 'home') {
      root.innerHTML = `<div class="home-wrap">${header('Little friends. <em>Big universe.</em>', 'A space playground for Jettson & Langston', '')}<section class="welcome"><div class="welcome-copy"><span class="tag">MEET YOUR SPACE FRIEND</span><h2>Hi, I’m Pip!</h2><p>My tummy is ticklish.<br>Want to explore together?</p><button class="primary" data-go="play">Let’s play! <span>↗</span></button><button class="text-button" data-action="tickle">Psst… tap Pip!</button></div>${buddy(true)}<div class="welcome-planet">${image(5)}</div></section><div class="activity-heading"><h2>Where shall we go?</h2><button class="text-button" data-go="stickers">★ My stickers · ${collected.size}/8</button></div><section class="activity-grid" aria-label="Choose an activity"><button class="activity mint" data-go="meet">${image(2)}<strong>Meet the planets</strong><span>Tap, look & listen</span></button><button class="activity peach" data-go="order">${image(8)}<strong>Planet parade</strong><span>Put our friends in order</span></button><button class="activity lilac" data-go="detective"><span class="card-symbol">⌕</span><strong>Space detective</strong><span>A little clue. A big discovery.</span></button><button class="activity blue" data-go="puzzles">${image(5)}<strong>Cosmic matches</strong><span>Find the missing piece</span></button><button class="activity pink" data-go="letters"><span class="card-symbol letters-symbol">Aa</span><strong>Letters in space</strong><span>Build a planet’s name</span></button><button class="activity yellow" data-go="legacy"><span class="card-symbol">♫</span><strong>Music & planet play</strong><span>Our original songs & silly friends</span></button></section><p class="parent-note">Made for curious little explorers. Pictures, sizes and distances are simplified for play.</p></div>`;
    } else if (screen === 'legacy') {
      root.innerHTML = `${header('Music & planet play', 'Our familiar friends. All the old favorites.', '')}<div class="legacy-grid"><button class="activity yellow" data-launch="music"><span class="card-symbol">♫</span><strong>Make music</strong><span>Planet instruments & three favorite songs</span></button><button class="activity blue" data-launch="explore">${image(2)}<strong>Explore together</strong><span>Big planet portraits & spoken facts</span></button><button class="activity pink" data-launch="silly">${image(8)}<strong>Silly planet playground</strong><span>Spin, tickle & dress up all nine friends</span></button><button class="activity lilac" data-launch="find">${image(5)}<strong>Find it!</strong><span>Find a planet. Collect a sky full of stars.</span></button></div><p class="parent-note">Music and silly planet play work best on a landscape tablet. Use Home to return to Pip.</p>`;
    } else if (screen === 'play') {
      root.innerHTML = `${header('Pip’s moon playground', 'Tap my tummy. Try a toy. See what happens!', 'play-intro')}<section class="play-stage"><button class="bubble bubble-one" data-action="bubble" aria-label="Pop a musical star">✦</button><button class="bubble bubble-two" data-action="bubble" aria-label="Pop a musical bubble">♪</button><button class="bubble bubble-three" data-action="bubble" aria-label="Pop a floating heart">♡</button>${buddy(true)}<div class="moon-ground"></div></section><div class="toy-tray"><button data-action="tickle"><span>🪶</span>Tickle</button><button data-action="five"><span>✋</span>High five</button><button data-action="hat"><span>🎉</span>Silly hat</button><button data-go="legacy"><span>🪐</span>Planet toys</button></div><button class="text-button next-adventure" data-go="order">Take Pip on a planet parade →</button>`;
    } else if (screen === 'meet') {
      root.innerHTML = `${header('Meet the planets', 'Pick a friend to discover its superpower.', 'meet-intro')}<section class="meet-layout"><div class="meet-cast">${names.map((_,i)=>planetButton(i)).join('')}</div><div class="meet-detail" id="meet-detail">${image(8)}<h2>Eight planet friends</h2><p>The Sun is a star. The eight planets travel around it.</p><p>Tap any planet to meet them!</p></div></section><button class="primary small" data-go="detective">Ready for a space clue? →</button>`;
    } else if (screen === 'order') renderOrder();
    else if (screen === 'detective' || screen === 'puzzles') renderQuestion();
    else if (screen === 'letters') renderLetters();
    else if (screen === 'stickers') {
      root.innerHTML = `${header('Your little universe', `${collected.size} of 8 planet stickers collected. Discover friends and finish games to collect them.`, '')}<div class="sticker-map">${names.map((name,i)=>`<div class="sticker ${collected.has(name)?'earned':''}">${image(i)}<strong>${collected.has(name)?'★ ':''}${name}</strong></div>`).join('')}</div><button class="primary" data-go="meet">Find more friends →</button><p class="parent-note">Stickers are saved on this browser when storage is available. Play again any time.</p><details class="parent-options"><summary>Grown-ups</summary><button class="text-button" data-action="reset-stickers">Start a fresh sticker collection</button><div id="reset-confirm"></div></details>`;
    }
    const pipHat = root.querySelector('.pip-hat'); if (pipHat) pipHat.textContent = ['', '🎉','👑','🌈'][hat];
  }
  function renderOrder() {
    const set = orderSets[orderLevel];
    root.innerHTML = `${header('Planet parade', 'Drag a planet to a space, or tap a planet, then tap its space.', 'order-intro')}<div class="level-tabs" aria-label="Challenge size">${['3 friends','4 friends','All 8'].map((s,i)=>`<button data-level="${i}" aria-pressed="${i===orderLevel}">${s}</button>`).join('')}</div><div class="order-scene"><div class="sun-start">${image(8)}<strong>Sun →</strong></div><div class="orbit-slots ${set.length===8?'eight':''}">${set.map((p,i)=>`<button class="orbit-slot" data-slot="${i}" aria-label="Space ${i+1} from the Sun">${placed[i]!==undefined ? image(placed[i])+'<span>'+names[placed[i]]+'</span>' : `<b>${i+1}</b><span>Tap here</span>`}</button>`).join('')}</div></div><div class="planet-tray">${shuffle(set.filter(i=>!placed.includes(i))).map(i=>planetButton(i,'data-draggable="true" aria-pressed="false"')).join('')}</div>${feedback()}<div class="activity-footer"><button class="text-button" data-action="hint">♡ Help me</button>${buddy()}<button class="primary" data-action="order-next" ${solved?'':'hidden'}>${orderLevel<2?'More planet friends →':'Collect my sticker →'}</button></div><p class="parent-note">From the Sun outward. Planet sizes and gaps are simplified.</p>`;
  }
  function place(slot) {
    if (solved || placed[slot] !== undefined) return;
    if (selected === null) {tell('Tap a planet first, then tap a numbered space.'); return;}
    const expected = orderSets[orderLevel][slot];
    if (selected !== expected) { tell(`Try ${names[expected]} in space ${slot+1}. Look for its picture below.`); react('curious'); highlightPlanet(expected); speak('name-'+names[expected]); return; }
    const p = selected; placed[slot] = p; selected = null;
    solved = placed.filter(i=>i!==undefined).length === orderSets[orderLevel].length;
    renderOrder(); tell(solved ? 'Our planet parade is ready!' : `${names[p]} is in the right place!`, true); react('win'); speak('name-'+names[p]);
    if (solved) { collect(p); promptVoice('parade-done'); }
    root.querySelector(solved ? '[data-action="order-next"]' : '[data-planet]')?.focus({preventScroll:true});
  }
  function highlightPlanet(p) { root.querySelectorAll('[data-planet]').forEach(b => b.classList.toggle('hinted', Number(b.dataset.planet)===p)); }
  function itemArt(id) {
    const art = { ring:'<ellipse cx="80" cy="60" rx="62" ry="23" fill="none" stroke="#b49aee" stroke-width="15" transform="rotate(-15 80 60)"/>', moon:'<circle cx="80" cy="60" r="42" fill="#d8e4ed"/><g fill="#99adbf"><circle cx="65" cy="44" r="10"/><circle cx="96" cy="68" r="13"/><circle cx="66" cy="83" r="6"/></g>', cloud:'<path d="M31 77Q9 53 39 46Q40 13 70 31Q101 9 116 43Q150 43 138 76Z" fill="#fbf0cc"/>', storm:'<ellipse cx="80" cy="60" rx="58" ry="30" fill="#ed856d"/><path d="M42 61q28-35 74-2q-31 28-51 1q17-17 30 0" fill="none" stroke="#ffd0a0" stroke-width="7"/>' };
    return `<svg viewBox="0 0 160 120" aria-hidden="true">${art[id]}</svg>`;
  }
  function renderQuestion() {
    const q = questionList[round];
    const detective = screen==='detective';
    root.innerHTML = `${header(detective?'Space detective':'Cosmic matches', detective?'Look closely. Pip has a clue for you!':'A little piece makes a big discovery.', q.key)}${dots(questionList.length, round)}<section class="question-stage"><div class="question-art">${detective?`<span class="clue-symbol">${q.icon}</span>`:(q.p===5?`<img class="planet puzzle-planet" src="${bareSaturnImage}" alt="Saturn without its rings">`:image(q.p,'puzzle-planet'))}<h2>${q.q}</h2></div>${buddy()}</section><div class="answer-tray">${detective?shuffle(q.choices).map(i=>planetButton(i)).join(''):shuffle(q.options).map(id=>`<button class="piece" data-piece="${id}" aria-label="${id}">${itemArt(id)}<span>${{ring:'Rings',moon:'Moon',cloud:'Cloud',storm:'Red storm'}[id]}</span></button>`).join('')}</div>${feedback()}<div class="question-actions"><button class="text-button" data-action="hint">♡ Give me a hint</button><button class="primary" data-action="next" hidden>${round===questionList.length-1?'Collect my sticker ★':'Next discovery →'}</button></div>`;
    startOfScene();
  }
  function answer(value) {
    if (solved) return;
    const q = questionList[round];
    if (value !== (screen==='detective'?q.p:q.answer)) {
      tell(q.hint); react('curious');
      if (screen==='detective') { highlightPlanet(q.p); speak('hint-'+names[q.p]); }
      else { root.querySelector(`[data-piece="${q.answer}"]`)?.classList.add('hinted'); speak(q.key); }
      return;
    }
    solved = true; collect(q.p);
    root.querySelector('.progress').outerHTML=dots(questionList.length,round+1);
    root.querySelector(screen==='detective'?`[data-planet="${q.p}"]`:`[data-piece="${q.answer}"]`)?.classList.add('answer-correct');
    root.querySelector('[data-voice]').dataset.voice=screen==='detective'?'answer-'+names[q.p]:'answer-'+q.answer;
    root.querySelector('[data-voice]').setAttribute('aria-label','Hear the answer');
    root.querySelectorAll('.answer-tray button').forEach(b=>b.disabled=true);
    root.querySelector('[data-action="next"]').hidden=false;
    root.querySelector('[data-action="next"]').focus({preventScroll:true});
    if (screen==='puzzles') {
      const art = root.querySelector('.question-art'); art.classList.add('matched');
      if (q.answer==='ring') {
        art.querySelector('.puzzle-planet').src=pictures[5];
        art.querySelector('.puzzle-planet').alt='Saturn with its rings';
      } else art.insertAdjacentHTML('afterbegin', `<span class="matched-piece feature-${q.answer}">${itemArt(q.answer)}</span>`);
    }
    tell(screen==='detective'?`${names[q.p]}! ${facts[q.p][1]}`:q.fact, true);
    react(q.p===5?'ring':'win'); promptVoice(screen==='detective'?'answer-'+names[q.p]:'answer-'+q.answer);
  }
  function renderLetters() {
    const p = [3,2,5][round]; const word = names[p].toUpperCase();
    // Each tile has an identity so repeated letters remain separate choices.
    root.innerHTML = `${header('Letters in space', 'Match the letters to build a planet’s name.', 'letters-intro')}${dots(3,round)}<div class="spelling-stage">${image(p)}<div><h2>${names[p]}</h2><div class="letter-slots">${[...word].map((c,i)=>`<span class="letter-slot ${i<letters.length?'filled':''}" aria-label="${i<letters.length?'Placed ':''}${c}">${c}</span>`).join('')}</div></div>${buddy()}</div><div class="letter-tray">${shuffle([...word].map((c,i)=>({c,i}))).map(({c,i})=>`<button data-letter="${c}" data-tile="${i}">${c}</button>`).join('')}</div>${feedback()}<div class="question-actions"><button class="text-button" data-action="hint">♡ Show the next letter</button><button class="primary" data-action="spell-next" hidden>${round===2?'Collect my sticker ★':'Another planet →'}</button></div>`;
    startOfScene();
    speak('name-'+names[p]);
  }
  function spell(button) {
    if (solved || button.disabled) return;
    const p = [3,2,5][round], word = names[p].toUpperCase();
    if (button.dataset.letter!==word[letters.length]) { tell(`Find ${word[letters.length]}. Match the next pale letter above.`); react('curious'); hint(); return; }
    letters.push(button.dataset.letter); button.disabled=true;
    const slot=root.querySelectorAll('.letter-slot')[letters.length-1]; slot.classList.add('filled');
    musical(); tell(`${letters.join(' · ')}${letters.length===word.length?' — '+names[p]+'!':''}`, true);
    if (letters.length===word.length) {
      solved=true; collect(p); root.querySelector('.progress').outerHTML=dots(3,round+1); root.querySelector('[data-action="spell-next"]').hidden=false;
      root.querySelector('[data-action="spell-next"]').focus({preventScroll:true});
      react('win'); promptVoice('name-'+names[p]);
    }
  }
  function collect(p) { collected.add(names[p]); save(); }
  function finish(p) {
    cleanup(); collect(p);
    root.innerHTML = `${header('A new space memory!', 'You and Pip make a wonderful team.', '')}<section class="finish-scene"><div class="reward">${image(p)}<span>★ ${names[p]} sticker ★</span></div>${buddy(true)}</section><div class="finish-actions"><button class="primary" data-go="home">Choose another adventure →</button><button data-go="${screen}">↻ Play again</button><button data-go="stickers">★ My stickers</button></div>`;
    startOfScene();
    react('win',true); promptVoice('journey-done');
  }
  function hint() {
    if (solved) return;
    if (screen==='order') { const slot=orderSets[orderLevel].findIndex((_,i)=>placed[i]===undefined); const p=orderSets[orderLevel][slot]; tell(`${names[p]} goes in space ${slot+1} from the Sun.`); highlightPlanet(p); root.querySelector(`[data-slot="${slot}"]`).classList.add('hinted'); speak('name-'+names[p]); }
    else if (screen==='letters') { const c=names[[3,2,5][round]].toUpperCase()[letters.length]; root.querySelectorAll('[data-letter]').forEach(b=>b.classList.toggle('hinted',!b.disabled&&b.dataset.letter===c)); tell(`Find the letter ${c}. It is outlined for you.`); }
    else { const q=questionList[round]; tell(q.hint); if (screen==='detective') {highlightPlanet(q.p); speak('hint-'+names[q.p]);} else {root.querySelector(`[data-piece="${q.answer}"]`).classList.add('hinted'); speak(q.key);} }
  }
  root.addEventListener('click', e => {
    const b=e.target.closest('button'); if (!b || performance.now()<suppressClickUntil) return;
    unlockAudio();
    if (b.dataset.go) return go(b.dataset.go);
    if (b.dataset.launch) {
      cleanup(); screen='canvas';root.hidden=true;canvas.style.visibility='visible';toolbar.classList.add('on-canvas');
      state.talk=b.dataset.launch!=='music';setMode(['music','explore'].includes(b.dataset.launch)?'explore':b.dataset.launch);
      return;
    }
    if (b.dataset.voice) return speak(b.dataset.voice);
    if (b.classList.contains('pip')) return react('tickle');
    if (b.dataset.level!==undefined) { cleanup(); orderLevel=Number(b.dataset.level); placed=[];selected=null;solved=false;renderOrder();startOfScene();return; }
    if (b.dataset.planet!==undefined) {
      const p=Number(b.dataset.planet);
      if (screen==='meet') {
        collect(p); root.querySelectorAll('[data-planet]').forEach(el=>el.setAttribute('aria-pressed',String(el===b)));
        root.querySelector('#meet-detail').innerHTML=`${image(p)}<h2>${names[p]}</h2><h3>${facts[p][0]}</h3><p>${facts[p][1]}</p><button class="listen" data-voice="fact-${names[p]}">◖)) Hear my fact</button><span class="collected-label">★ Sticker collected!</span>`;
        musical(); speak('name-'+names[p], 'fact-'+names[p]);
      } else if (screen==='order' && !solved) {
        selected=p; root.querySelectorAll('[data-planet]').forEach(el=>el.setAttribute('aria-pressed',String(el===b))); tell(`${names[p]} is ready. Tap its space.`); speak('name-'+names[p]);
      } else if (screen==='detective') answer(p);
      return;
    }
    if (b.dataset.slot!==undefined) return place(Number(b.dataset.slot));
    if (b.dataset.piece) return answer(b.dataset.piece);
    if (b.dataset.letter) return spell(b);
    const action=b.dataset.action;
    if (['tickle','five','hat'].includes(action)) react(action);
    else if (action==='bubble') { b.classList.remove('popped'); void b.offsetWidth; b.classList.add('popped'); react('five'); }
    else if (action==='reset-stickers') root.querySelector('#reset-confirm').innerHTML='<p>Start again with an empty sticker map?</p><button class="text-button" data-action="keep-stickers">Keep my stickers</button><button class="text-button" data-action="confirm-reset">Start fresh</button>';
    else if (action==='keep-stickers') root.querySelector('#reset-confirm').innerHTML='';
    else if (action==='confirm-reset') {collected.clear();save();go('stickers');}
    else if (action==='hint') hint();
    else if (action==='order-next' && solved) { if(orderLevel<2) {orderLevel++;placed=[];selected=null;solved=false;renderOrder();startOfScene();promptVoice('order-intro');} else finish(7); }
    else if (action==='next' && solved) { round++;solved=false; if(round===questionList.length) finish(screen==='detective'?1:5);else {cleanup();renderQuestion();promptVoice(questionList[round].key);} }
    else if (action==='spell-next' && solved) { if(round===2) finish(5);else {cleanup();round++;letters=[];solved=false;renderLetters();} }
  });
  // Pointer dragging and tap selection share exactly the same placement logic.
  root.addEventListener('pointerdown', e => {
    const b=e.target.closest('[data-draggable]'); if(!b || e.button>0 || drag) return;
    drag={id:e.pointerId,p:Number(b.dataset.planet),x:e.clientX,y:e.clientY,moving:false,source:b};
    b.setPointerCapture?.(e.pointerId);
  });
  root.addEventListener('pointermove', e => {
    if(!drag || drag.id!==e.pointerId) return;
    if(!drag.moving && Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<10) return;
    drag.moving=true; selected=drag.p;
    let ghost=document.querySelector('.drag-ghost');
    if(!ghost) { ghost=document.createElement('img');ghost.src=pictures[drag.p];ghost.className='drag-ghost';document.body.append(ghost); }
    ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';
  });
  root.addEventListener('pointerup', e => {
    if(!drag || drag.id!==e.pointerId) return;
    const moving=drag.moving;drag=null;document.querySelector('.drag-ghost')?.remove();
    if(moving) {suppressClickUntil=performance.now()+250;const slot=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-slot]');if(slot)place(Number(slot.dataset.slot));else tell('Drop on a numbered space, or tap a planet and its space.');}
  });
  function cancelDrag(e) {if(drag && (!e || drag.id===e.pointerId)){drag=null;document.querySelector('.drag-ghost')?.remove();}}
  root.addEventListener('pointercancel',cancelDrag);root.addEventListener('lostpointercapture',cancelDrag);
  const homeButton=document.querySelector('#journey-home');
  homeButton.addEventListener('pointerdown',e=>{if(e.button===0)go('home');});
  homeButton.addEventListener('click',()=>{if(screen!=='home')go('home');});
  function updateSoundButton() {const b=document.querySelector('#mute');b.textContent=muted?'♫ Sound off':'♫ Sound on';b.setAttribute('aria-pressed',String(muted));}
  function applyMute() { setGameMuted(muted); updateSoundButton(); }
  window.onPlanetSoundChange = mode => { muted = mode === 'off'; if (muted) { clearTimeout(voiceTimer); stopPhrase(); } updateSoundButton(); save(); };
  document.querySelector('#mute').addEventListener('click',()=>{muted=!muted;cleanup();applyMute();save();});
  window.addEventListener('resize',()=>{cancelDrag();stopPhrase();});
  window.addEventListener('blur',()=>{clearTimeout(voiceTimer);stopPhrase();cancelDrag();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(voiceTimer);stopPhrase();cancelDrag();}});
  applyMute();go('home');
})();
