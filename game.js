'use strict';

const TAU = Math.PI * 2;
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W = 0;
let H = 0;

// ---------- Planet data ----------
// size: relative display size (clamped so small planets stay tappable)
// span: half-width in radii, including rings (used for layout)
const PLANETS = [
  {
    name: 'Mercury', size: 0.45, span: 1, note: 0, glow: '#d8d2ca',
    fact: 'Mercury is the closest planet to the Sun.',
    base: '#a9a39c',
    detail(x, y, r) {
      ctx.fillStyle = 'rgba(90,84,78,0.55)';
      for (const [dx, dy, cr] of [[-0.35, -0.3, 0.16], [0.3, 0.2, 0.2], [-0.1, 0.45, 0.12], [0.45, -0.35, 0.1], [-0.5, 0.2, 0.09]]) {
        circle(x + dx * r, y + dy * r, cr * r);
      }
    },
  },
  {
    name: 'Venus', size: 0.58, span: 1, note: 1, glow: '#ffe2a0',
    fact: 'Venus is the hottest planet.',
    base: '#e9c77b',
    detail(x, y, r) {
      ctx.fillStyle = 'rgba(255,240,200,0.45)';
      ellipse(x - 0.2 * r, y - 0.35 * r, 0.7 * r, 0.14 * r, -0.2);
      ellipse(x + 0.25 * r, y + 0.25 * r, 0.65 * r, 0.12 * r, -0.2);
      ctx.fillStyle = 'rgba(180,125,50,0.35)';
      ellipse(x, y + 0.02 * r, 0.8 * r, 0.1 * r, -0.2);
    },
  },
  {
    name: 'Earth', size: 0.62, span: 1, note: 2, glow: '#8fd3ff',
    fact: 'Earth is our home!',
    base: '#3b82d6',
    detail(x, y, r) {
      ctx.fillStyle = '#4caf50';
      ellipse(x - 0.35 * r, y - 0.2 * r, 0.3 * r, 0.45 * r, 0.4);
      ellipse(x + 0.35 * r, y + 0.25 * r, 0.35 * r, 0.3 * r, -0.3);
      ellipse(x + 0.2 * r, y - 0.55 * r, 0.25 * r, 0.12 * r, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ellipse(x + 0.1 * r, y - 0.05 * r, 0.45 * r, 0.07 * r, -0.3);
      ellipse(x - 0.3 * r, y + 0.55 * r, 0.35 * r, 0.06 * r, 0.1);
    },
  },
  {
    name: 'Mars', size: 0.5, span: 1, note: 3, glow: '#ff9a6e',
    fact: 'Mars is the red planet.',
    base: '#d4623a',
    detail(x, y, r) {
      ctx.fillStyle = 'rgba(130,45,20,0.5)';
      ellipse(x - 0.3 * r, y + 0.2 * r, 0.35 * r, 0.18 * r, 0.3);
      ellipse(x + 0.35 * r, y - 0.15 * r, 0.25 * r, 0.14 * r, -0.4);
      ctx.fillStyle = '#fff';
      ellipse(x, y - 0.95 * r, 0.4 * r, 0.16 * r, 0);
    },
  },
  {
    name: 'Jupiter', size: 1, span: 1, note: 4, glow: '#ffd9a8',
    fact: 'Jupiter is the biggest planet!',
    base: '#e9d3b0',
    bands: ['#e9d3b0', '#c99a6b', '#f1e2c8', '#b7825a', '#efdcbc', '#c99a6b', '#e6caa3'],
    detail(x, y, r) {
      ctx.fillStyle = '#c0492f';
      ellipse(x + 0.42 * r, y + 0.55 * r, 0.2 * r, 0.11 * r, 0);
    },
  },
  {
    name: 'Saturn', size: 0.85, span: 1.75, note: 5, glow: '#fff0b8',
    fact: 'Saturn has big, beautiful rings.',
    base: '#f0dca5',
    bands: ['#f0dca5', '#d9bd7f', '#efe0b8', '#cfae6c', '#f0dca5'],
    faceY: -0.12,
    ring: { radius: 1.6, flat: 0.28, width: 0.22, tilt: -0.2, color: '#d8c08a' },
  },
  {
    name: 'Uranus', size: 0.7, span: 1.35, note: 6, glow: '#c6f6f8',
    fact: 'Uranus spins on its side.',
    base: '#9fe3e6',
    detail(x, y, r) {
      ctx.fillStyle = 'rgba(95,180,189,0.35)';
      ctx.fillRect(x - 0.2 * r, y - r, 0.4 * r, 2 * r);
    },
    ring: { radius: 1.35, flat: 0.95, width: 0.06, tilt: 1.4, color: 'rgba(210,245,255,0.7)' },
  },
  {
    name: 'Neptune', size: 0.68, span: 1, note: 7, glow: '#9db4ff',
    fact: 'Neptune is very cold and windy.',
    base: '#4f74e8',
    detail(x, y, r) {
      ctx.fillStyle = 'rgba(30,45,130,0.6)';
      ellipse(x - 0.3 * r, y + 0.3 * r, 0.22 * r, 0.12 * r, 0);
      ctx.fillStyle = 'rgba(220,235,255,0.5)';
      ellipse(x + 0.2 * r, y - 0.35 * r, 0.4 * r, 0.05 * r, -0.1);
    },
  },
];

const SUN_FACT = 'The Sun! The Sun is a giant star.';

// ---------- State ----------
const state = {
  mode: 'menu',
  time: 0,
  bodies: [],
  sun: null,
  menuButtons: [],
  particles: [],
  shooting: [],
  stars: [],
  find: null,
  homeHold: null,
};

const HOME = { x: 46, y: 46, r: 32 };
const HOME_HOLD_SECONDS = 1.2;

// ---------- Drawing helpers ----------
function circle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function ellipse(x, y, rx, ry, rot) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fill();
}

function starPath(x, y, outer, inner, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawFace(x, y, r, blink, faceY = 0, happy = false) {
  const ey = y + r * (faceY - 0.08);
  const ex = r * 0.32;
  const er = Math.max(r * 0.09, 2.5);
  const ink = '#1b1530';

  for (const s of [-1, 1]) {
    ctx.fillStyle = ink;
    if (blink) {
      ctx.fillRect(x + s * ex - er, ey - er * 0.2, er * 2, er * 0.4);
    } else {
      ellipse(x + s * ex, ey, er, er * 1.2, 0);
      ctx.fillStyle = '#fff';
      circle(x + s * ex - er * 0.3, ey - er * 0.4, er * 0.35);
    }
    ctx.fillStyle = 'rgba(255,110,150,0.35)';
    circle(x + s * r * 0.5, ey + r * 0.2, r * 0.1);
  }

  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(r * 0.05, 1.5);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (happy) {
    ctx.arc(x, ey + r * 0.14, r * 0.2, 0, Math.PI);
    ctx.fill();
  } else {
    ctx.arc(x, ey + r * 0.1, r * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}

function drawRing(ring, x, y, r, back) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ring.tilt);
  ctx.beginPath();
  const rx = r * ring.radius;
  const ry = rx * ring.flat;
  if (back) ctx.ellipse(0, 0, rx, ry, 0, Math.PI, TAU);
  else ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
  ctx.strokeStyle = ring.color;
  ctx.lineWidth = r * ring.width;
  ctx.stroke();
  ctx.restore();
}

function drawPlanet(p, x, y, r, { blink = false, glow = 0, happy = false } = {}) {
  if (glow > 0) {
    const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.8);
    g.addColorStop(0, `rgba(255,246,160,${0.75 * glow})`);
    g.addColorStop(1, 'rgba(255,246,160,0)');
    ctx.fillStyle = g;
    circle(x, y, r * 1.8);
  }

  if (p.ring) drawRing(p.ring, x, y, r, true);

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.clip();
  ctx.fillStyle = p.base;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  if (p.bands) {
    const h = (2 * r) / p.bands.length;
    p.bands.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(x - r, y - r + i * h, 2 * r, h + 1);
    });
  }
  if (p.detail) p.detail(x, y, r);
  const shade = ctx.createRadialGradient(x - r * 0.4, y - r * 0.45, r * 0.1, x, y, r * 1.05);
  shade.addColorStop(0, 'rgba(255,255,255,0.28)');
  shade.addColorStop(0.5, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(0,0,30,0.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  ctx.restore();

  if (p.ring) drawRing(p.ring, x, y, r, false);
  drawFace(x, y, r, blink, p.faceY || 0, happy);
}

function drawSun(sun) {
  const t = state.time;
  const s = popScale(sun.popAt);
  const r = sun.r * (0.97 + 0.03 * s);
  const pulse = 1 + 0.04 * Math.sin(t * 2);

  const halo = ctx.createRadialGradient(sun.x, sun.y, r * 0.9, sun.x, sun.y, r * 1.35 * pulse);
  halo.addColorStop(0, 'rgba(255,190,60,0.55)');
  halo.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = halo;
  circle(sun.x, sun.y, r * 1.35 * pulse);

  const body = ctx.createRadialGradient(sun.x + r * 0.3, sun.y - r * 0.2, r * 0.1, sun.x, sun.y, r);
  body.addColorStop(0, '#fff6b0');
  body.addColorStop(0.6, '#ffc93c');
  body.addColorStop(1, '#ff8a1f');
  ctx.fillStyle = body;
  circle(sun.x, sun.y, r);

  const fr = r * 0.28;
  drawFace(sun.x + r * 0.8, sun.y - r * 0.05, fr, blinkFor(sun.seed), 0, t - sun.popAt < 1.5);
}

// ---------- Animation helpers ----------
function popScale(popAt) {
  const a = state.time - popAt;
  if (a < 0 || a > 1.5) return 1;
  return 1 + 0.35 * Math.exp(-3.5 * a) * Math.abs(Math.cos(a * 9));
}

function blinkFor(seed) {
  return (state.time + seed * 3.7) % 4 < 0.14;
}

function makeBody(planet, x, y, r) {
  return { planet, x, y, r, seed: Math.random() * 10, popAt: -99, wiggleAt: -99 };
}

function burst(x, y, color, n) {
  for (let i = 0; i < n && state.particles.length < 300; i++) {
    const a = Math.random() * TAU;
    const sp = 120 + Math.random() * 280;
    state.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0,
      max: 0.8 + Math.random() * 0.7,
      size: 6 + Math.random() * 10,
      rot: Math.random() * TAU,
      color,
    });
  }
}

function shootingStar(x, y) {
  const a = Math.PI * (0.15 + Math.random() * 0.2);
  const dir = Math.random() < 0.5 ? 1 : -1;
  state.shooting.push({ x, y, vx: Math.cos(a) * 700 * dir, vy: Math.sin(a) * 700, life: 0, max: 0.7 });
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- Sound ----------
let audio = null;
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98];

function unlockAudio() {
  if (!audio) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audio = new AC();
  }
  if (audio && audio.state === 'suspended') audio.resume();
}

function tone(freq, when = 0, dur = 0.5, vol = 0.2, type = 'sine') {
  if (!audio) return;
  const t0 = audio.currentTime + when;
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(audio.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

const sfx = {
  chime: (i) => { tone(SCALE[i], 0, 0.6, 0.18); tone(SCALE[i] * 2, 0, 0.4, 0.05, 'triangle'); },
  fanfare: () => [0, 2, 4, 5, 7].forEach((n, k) => tone(SCALE[n], k * 0.11, 0.5, 0.16)),
  sparkle: () => tone(SCALE[6 + Math.floor(Math.random() * 3)], 0, 0.25, 0.06, 'triangle'),
  boop: () => tone(300, 0, 0.25, 0.12),
};

// ---------- Voice ----------
let voice = null;
const hasSpeech = 'speechSynthesis' in window;

function pickVoice() {
  const voices = speechSynthesis.getVoices();
  voice = voices.find((v) => /en[-_]US/i.test(v.lang)) || voices.find((v) => /^en/i.test(v.lang)) || null;
}

if (hasSpeech) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

let speechUnlocked = false;
let utterance = null; // Held so Chrome doesn't garbage-collect it mid-sentence.

// iOS only allows speech once speak() has been called directly inside a tap.
function unlockSpeech() {
  if (!hasSpeech || speechUnlocked) return;
  speechUnlocked = true;
  speechSynthesis.speak(new SpeechSynthesisUtterance(' '));
}

function say(text) {
  if (!hasSpeech) return;
  if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  // Chrome and Safari silently drop a speak() that immediately follows cancel().
  setTimeout(() => {
    utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.pitch = 1.2;
    speechSynthesis.speak(utterance);
  }, 80);
}

// ---------- Layout ----------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  state.stars = Array.from({ length: Math.round((W * H) / 4500) }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 0.5 + Math.random() * 1.6,
    phase: Math.random() * TAU,
    speed: 0.5 + Math.random() * 2,
  }));

  if (state.mode === 'explore') layoutExplore();
  else if (state.mode === 'find') layoutFind();
  else layoutMenu();
}

function layoutMenu() {
  const r = Math.min(W * 0.17, H * 0.26);
  state.menuButtons = [
    { mode: 'explore', label: 'Explore', x: W * 0.32, y: H * 0.58, r },
    { mode: 'find', label: 'Find it!', x: W * 0.68, y: H * 0.58, r },
  ];
}

function layoutExplore() {
  const sunR = H * 0.55;
  state.sun = { x: -sunR * 0.55, y: H * 0.55, r: sunR, seed: 1.3, popAt: state.sun ? state.sun.popAt : -99 };

  const startX = state.sun.x + sunR + H * 0.03;
  const endX = W - H * 0.03;
  const gap = 0.3;
  const widths = PLANETS.map((p) => 2 * p.size * p.span);
  const totalUnits = widths.reduce((a, b) => a + b, 0) + gap * (PLANETS.length + 1);
  const unit = Math.min((endX - startX) / totalUnits, H * 0.2);

  let x = startX + ((endX - startX) - totalUnits * unit) / 2 + gap * unit;
  state.bodies = PLANETS.map((p, i) => {
    const w = widths[i] * unit;
    const body = makeBody(p, x + w / 2, H * 0.55 + Math.sin(i * 1.1 + 0.5) * H * 0.14, p.size * unit);
    x += w + gap * unit;
    return body;
  });
}

function layoutFind() {
  const choices = state.find.choices;
  const slot = W / choices.length;
  const maxR = Math.min((slot / 2 / 1.75) * 0.95, H * 0.2);
  state.bodies = choices.map((p, i) =>
    makeBody(p, slot * (i + 0.5), H * 0.58 + (i % 2 ? H * 0.07 : -H * 0.07), maxR * (0.72 + 0.28 * p.size))
  );
}

// ---------- Modes ----------
function setMode(mode) {
  state.mode = mode;
  state.particles.length = 0;
  state.homeHold = null;
  if (hasSpeech) speechSynthesis.cancel();

  if (mode === 'explore') {
    layoutExplore();
    say('Tap a planet!');
  } else if (mode === 'find') {
    state.find = null;
    newFindRound();
  } else {
    layoutMenu();
  }
}

function newFindRound() {
  const prev = state.find ? state.find.target : null;
  let target;
  do {
    target = PLANETS[Math.floor(Math.random() * PLANETS.length)];
  } while (target === prev);

  const others = shuffle(PLANETS.filter((p) => p !== target)).slice(0, 3);
  state.find = {
    target,
    choices: shuffle([target, ...others]),
    askedAt: state.time,
    lastAsk: state.time,
    locked: false,
    stars: state.find ? state.find.stars : 0,
  };
  layoutFind();
  say(`Can you find ${target.name}?`);
}

function askAgain() {
  state.find.lastAsk = state.time;
  say(`Can you find ${state.find.target.name}?`);
}

// ---------- Input ----------
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

function hitBody(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const b of state.bodies) {
    const d = dist(x, y, b.x, b.y);
    if (d <= Math.max(b.r * 1.3, 44) && d < bestD) {
      best = b;
      bestD = d;
    }
  }
  return best;
}

function speakerButton() {
  return { x: W - HOME.x, y: HOME.y, r: HOME.r };
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  unlockAudio();
  unlockSpeech();
  const { clientX: x, clientY: y } = e;

  if (state.mode === 'menu') {
    const btn = state.menuButtons.find((b) => dist(x, y, b.x, b.y) <= b.r);
    if (btn) {
      sfx.fanfare();
      setMode(btn.mode);
    } else {
      sfx.sparkle();
      shootingStar(x, y);
    }
    return;
  }

  if (dist(x, y, HOME.x, HOME.y) <= HOME.r + 10) {
    state.homeHold = { id: e.pointerId, start: state.time };
    return;
  }

  if (state.mode === 'explore') exploreTap(x, y);
  else findTap(x, y);
});

function endHold(e) {
  if (state.homeHold && state.homeHold.id === e.pointerId) state.homeHold = null;
}
canvas.addEventListener('pointerup', endHold);
canvas.addEventListener('pointercancel', endHold);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function exploreTap(x, y) {
  const b = hitBody(x, y);
  if (b) {
    b.popAt = state.time;
    sfx.chime(b.planet.note);
    burst(b.x, b.y, b.planet.glow, 16);
    say(`${b.planet.name}! ${b.planet.fact}`);
  } else if (dist(x, y, state.sun.x, state.sun.y) <= state.sun.r) {
    state.sun.popAt = state.time;
    sfx.chime(8);
    burst(x, y, '#ffd24a', 20);
    say(SUN_FACT);
  } else {
    sfx.sparkle();
    burst(x, y, '#ffffff', 5);
    shootingStar(x, y);
  }
}

function findTap(x, y) {
  const f = state.find;
  const sp = speakerButton();
  if (dist(x, y, sp.x, sp.y) <= sp.r + 10) {
    askAgain();
    return;
  }
  if (f.locked) return;

  const b = hitBody(x, y);
  if (!b) {
    sfx.sparkle();
    burst(x, y, '#ffffff', 5);
    return;
  }

  if (b.planet === f.target) {
    f.locked = true;
    f.stars += 1;
    b.popAt = state.time;
    sfx.fanfare();
    burst(b.x, b.y, '#ffe36e', 30);

    const bigWin = f.stars >= 10;
    if (bigWin) {
      for (let i = 0; i < 6; i++) burst(Math.random() * W, Math.random() * H, b.planet.glow, 20);
      say(`You found ${f.target.name}! Ten stars! You are a space expert!`);
    } else {
      say(`Yay! You found ${f.target.name}!`);
    }

    setTimeout(() => {
      if (state.mode !== 'find' || state.find !== f) return;
      if (bigWin) f.stars = 0;
      newFindRound();
    }, bigWin ? 4500 : 2600);
  } else {
    b.wiggleAt = state.time;
    sfx.boop();
    f.lastAsk = state.time;
    say(`That's ${b.planet.name}. Can you find ${f.target.name}?`);
  }
}

// ---------- Update ----------
function update(dt) {
  for (const p of state.particles) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy = p.vy * 0.96 + 60 * dt;
    p.rot += dt * 3;
  }
  state.particles = state.particles.filter((p) => p.life < p.max);

  for (const s of state.shooting) {
    s.life += dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
  }
  state.shooting = state.shooting.filter((s) => s.life < s.max);

  if (state.homeHold && state.time - state.homeHold.start >= HOME_HOLD_SECONDS) {
    setMode('menu');
  }

  // Gentle nudge for toddlers who wander off mid-question.
  if (state.mode === 'find' && !state.find.locked && state.time - state.find.lastAsk > 15) {
    askAgain();
  }
}

// ---------- Draw ----------
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#060a1f');
  g.addColorStop(1, '#141046');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const s of state.stars) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.65 * Math.abs(Math.sin(state.time * s.speed + s.phase))})`;
    circle(s.x, s.y, s.r);
  }

  for (const s of state.shooting) {
    const k = 1 - s.life / s.max;
    const tail = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.15, s.y - s.vy * 0.15);
    tail.addColorStop(0, `rgba(255,255,255,${k})`);
    tail.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = tail;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 0.15, s.y - s.vy * 0.15);
    ctx.stroke();
  }
}

function drawBodies() {
  const f = state.mode === 'find' ? state.find : null;
  for (const b of state.bodies) {
    const s = popScale(b.popAt);
    const wa = state.time - b.wiggleAt;
    const dx = wa < 0.8 ? Math.sin(wa * 35) * 12 * Math.exp(-4 * wa) : 0;
    const dy = Math.sin(state.time * 1.2 + b.seed) * b.r * 0.06;

    let glow = 0;
    if (f && b.planet === f.target) {
      if (f.locked) glow = 1;
      else if (state.time - f.askedAt > 6) glow = 0.5 + 0.5 * Math.sin(state.time * 5);
    }

    drawPlanet(b.planet, b.x + dx, b.y + dy, b.r * s, {
      blink: blinkFor(b.seed),
      glow,
      happy: state.time - b.popAt < 1.5,
    });
  }
}

function drawEmojiButton(btn, emoji) {
  ctx.fillStyle = 'rgba(10,14,40,0.75)';
  circle(btn.x, btn.y, btn.r);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  circle(btn.x, btn.y, btn.r);
  ctx.font = `${Math.round(btn.r * 0.95)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, btn.x, btn.y + 2);
}

function drawHome() {
  drawEmojiButton(HOME, '🏠');
  if (state.homeHold) {
    const k = Math.min((state.time - state.homeHold.start) / HOME_HOLD_SECONDS, 1);
    ctx.strokeStyle = '#ffe36e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(HOME.x, HOME.y, HOME.r + 4, -Math.PI / 2, -Math.PI / 2 + k * TAU);
    ctx.stroke();
  }
}

function drawFindHud() {
  drawEmojiButton(speakerButton(), '🔊');
  const n = 10;
  const gap = Math.min(40, (W - 220) / n);
  const x0 = W / 2 - (gap * (n - 1)) / 2;
  for (let i = 0; i < n; i++) {
    starPath(x0 + i * gap, HOME.y, gap * 0.42, gap * 0.19, 0);
    if (i < state.find.stars) {
      ctx.fillStyle = '#ffd84a';
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

function drawMenu() {
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.round(H * 0.1)}px system-ui, sans-serif`;
  ctx.fillText('Planet Pals', W / 2, H * 0.17);

  // Open with ?speech to check whether the device has a text-to-speech voice at all.
  if (location.search.includes('speech')) {
    const count = hasSpeech ? speechSynthesis.getVoices().length : 0;
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(`speech supported: ${hasSpeech ? 'yes' : 'no'} · voices: ${count}`, W / 2, H - 24);
  }

  const [explore, find] = state.menuButtons;
  for (const btn of state.menuButtons) {
    const pulse = 1 + 0.03 * Math.sin(state.time * 3 + btn.x);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    circle(btn.x, btn.y, btn.r * pulse);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${Math.round(btn.r * 0.2)}px system-ui, sans-serif`;
    ctx.fillText(btn.label, btn.x, btn.y + btn.r + btn.r * 0.22);
  }

  drawPlanet(PLANETS[5], explore.x, explore.y, explore.r * 0.42, { blink: blinkFor(2) });
  drawPlanet(PLANETS[2], find.x - find.r * 0.1, find.y + find.r * 0.05, find.r * 0.5, { blink: blinkFor(5) });
  ctx.font = `${Math.round(find.r * 0.55)}px system-ui, sans-serif`;
  ctx.fillText('🔍', find.x + find.r * 0.38, find.y - find.r * 0.3);
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
    ctx.fillStyle = p.color;
    starPath(p.x, p.y, p.size, p.size * 0.45, p.rot);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function draw() {
  drawBackground();
  if (state.mode === 'menu') {
    drawMenu();
  } else {
    if (state.mode === 'explore') drawSun(state.sun);
    drawBodies();
    if (state.mode === 'find') drawFindHud();
    drawHome();
  }
  drawParticles();
}

// ---------- Loop ----------
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  state.time += dt;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js');
}
