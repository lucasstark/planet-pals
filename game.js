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
    base: '#e6a347',
    detail(x, y, r) {
      // Broad cloud swirls remain legible at small tablet sizes.
      for (let i = 0; i < 7; i++) {
        const cx = x + Math.sin(i * 2.4) * r * 0.65;
        const cy = y + Math.cos(i * 1.7) * r * 0.7;
        ctx.strokeStyle = i % 2 ? '#be7429' : '#f5c36a';
        ctx.lineWidth = r * (i % 2 ? 0.09 : 0.045);
        ctx.beginPath();
        for (let j = 0; j <= 32; j++) {
          const a = j / 32 * Math.PI * 3;
          const rr = r * (0.04 + j / 32 * 0.28);
          const px = cx + Math.cos(a) * rr;
          const py = cy + Math.sin(a) * rr * 0.65;
          if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    },
  },
  {
    name: 'Earth', size: 0.62, span: 1, note: 2, glow: '#8fd3ff',
    base: '#3b82d6',
    detail(x, y, r) {
      ctx.fillStyle = '#86b856';
      // Stylized Europe/Africa/Asia silhouette, with islands and Australia.
      const lands = [
        [[-.7,-.3],[-.55,-.48],[-.32,-.5],[-.23,-.7],[-.1,-.78],[0,-.62],[.18,-.72],[.4,-.65],[.65,-.52],[.88,-.34],[.83,-.05],[.64,.02],[.56,.3],[.39,.16],[.32,-.04],[.15,-.13],[.03,-.04],[-.18,-.13],[-.31,-.02],[-.54,-.13]],
        [[-.56,-.06],[-.29,-.13],[-.07,.04],[.04,.26],[-.1,.53],[-.29,.77],[-.4,.57],[-.44,.31],[-.64,.13]],
        [[.47,.56],[.72,.48],[.88,.63],[.76,.78],[.52,.75]],
        [[-.87,-.7],[-.67,-.84],[-.48,-.79],[-.63,-.61]],
      ];
      for (const points of lands) {
        ctx.beginPath();
        points.forEach(([px, py], i) => i ? ctx.lineTo(x + px*r, y + py*r) : ctx.moveTo(x + px*r, y + py*r));
        ctx.closePath(); ctx.fill();
      }
      ellipse(x + .05*r, y + .56*r, .04*r, .1*r, .3);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ellipse(x - .3*r, y - .84*r, .35*r, .035*r, -.1);
      ellipse(x + .18*r, y + .89*r, .32*r, .035*r, 0);
    },
  },
  {
    name: 'Mars', size: 0.5, span: 1, note: 3, glow: '#ff9a6e',
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
    base: '#e9d3b0',
    bands: ['#e9be77', '#b96251', '#f7dda0', '#bd6956', '#f4d593', '#ac564e', '#dfae70'],
    detail(x, y, r) {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = ['#aa473e', '#dc8061', '#edb779', '#a94439'][i];
        ellipse(x - 0.48 * r, y + 0.57 * r, (0.24 - i*0.045)*r, (0.145 - i*0.027)*r, -0.18);
      }
    },
  },
  {
    name: 'Saturn', size: 0.85, span: 1.75, note: 5, glow: '#fff0b8',
    base: '#f0dca5',
    bands: ['#f0dca5', '#d9bd7f', '#efe0b8', '#cfae6c', '#f0dca5'],
    faceY: -0.12,
    ring: { radius: 1.6, flat: 0.28, width: 0.22, tilt: -0.2, color: '#b59ae9' },
  },
  {
    name: 'Uranus', size: 0.7, span: 1.35, note: 6, glow: '#c6f6f8',
    base: '#35cecf',
    faceTilt: -Math.PI / 2,
    detail(x, y, r) {
      ctx.fillStyle = 'rgba(95,180,189,0.35)';
      ctx.fillRect(x - 0.2 * r, y - r, 0.4 * r, 2 * r);
    },
    ring: { radius: 1.35, flat: 0.95, width: 0.06, tilt: 1.4, color: 'rgba(210,245,255,0.7)' },
  },
  {
    name: 'Neptune', size: 0.68, span: 1, note: 7, glow: '#9db4ff',
    base: '#376bce',
    bands: ['#3154ac', '#477ede', '#3666c5', '#568ce0', '#315db9', '#477bd3', '#274c9d'],
    detail(x, y, r) {
      ctx.fillStyle = 'rgba(30,45,130,0.6)';
      ellipse(x - 0.3 * r, y + 0.3 * r, 0.22 * r, 0.12 * r, 0);
      ctx.fillStyle = 'rgba(220,235,255,0.5)';
      ellipse(x + 0.2 * r, y - 0.35 * r, 0.4 * r, 0.05 * r, -0.1);
    },
  },
];

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
  word: null,
  ripples: [],
  homeHold: null,
  talk: true, // Explore: true = say the name and a fact, false = music only
  echo: { notes: [], lastTapAt: -99, playing: null },
  holds: new Map(), // pointerId -> { body, since, sound }
  shakeAt: -99,
  spotlight: null,
  speech: null,
  starFlight: null,
};

const HOME = { x: 46, y: 46, r: 32 };
let safeTop = 0; // iPad home-screen apps draw under the status bar.
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

function drawFace(x, y, r, blink, faceY = 0, happy = false, mouth = 0, gaze = 0) {
  const ey = y + r * (faceY - 0.13);
  const ink = '#182139';
  ctx.lineCap = 'round';
  for (const side of [-1, 1]) {
    const ex = x + side * r * 0.3;
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.5, r * 0.045);
    if (blink) {
      ctx.beginPath();
      ctx.arc(ex, ey - r * 0.04, r * 0.17, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fffdf5';
      ellipse(ex, ey, r * 0.235, r * 0.28, 0);
      ctx.fillStyle = '#28b5e5';
      circle(ex + r * (0.035 + gaze), ey + r * 0.015, r * 0.15);
      ctx.fillStyle = ink;
      circle(ex + r * (0.045 + gaze), ey + r * 0.025, r * 0.095);
      ctx.fillStyle = '#fff';
      circle(ex - r * 0.015, ey - r * 0.055, r * 0.057);
      circle(ex + r * 0.09, ey + r * 0.075, r * 0.023);
    }
    // Raised brows keep expressions readable even on the smallest pals.
    ctx.beginPath();
    ctx.moveTo(ex - r * 0.16, ey - r * 0.36);
    ctx.quadraticCurveTo(ex, ey - r * (happy ? 0.53 : 0.47), ex + r * 0.14, ey - r * 0.37);
    ctx.stroke();
  }
  const my = ey + r * 0.37;
  if (mouth > 0.12) {
    ctx.fillStyle = ink;
    ellipse(x, my + r * 0.1, r * (0.13 + mouth * 0.12), r * (0.055 + mouth * 0.19), 0);
    ctx.fillStyle = '#f58d9e';
    ellipse(x + r * 0.025, my + r * (0.12 + mouth * 0.12), r * 0.09, r * 0.035, -0.1);
    ctx.fillStyle = '#fffdf5';
    ellipse(x, my + r * (0.07 - mouth * 0.12), r * (0.1 + mouth * 0.07), r * 0.025, 0);
    return;
  }
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.29, my);
  ctx.quadraticCurveTo(x, my + r * 0.07, x + r * 0.29, my);
  ctx.quadraticCurveTo(x + r * 0.2, my + r * (happy ? 0.4 : 0.29), x, my + r * (happy ? 0.33 : 0.23));
  ctx.quadraticCurveTo(x - r * 0.2, my + r * 0.23, x - r * 0.29, my);
  ctx.fill();
  ctx.fillStyle = '#fffdf5';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.23, my + r * 0.035);
  ctx.quadraticCurveTo(x, my + r * 0.1, x + r * 0.23, my + r * 0.035);
  ctx.quadraticCurveTo(x, my + r * 0.2, x - r * 0.23, my + r * 0.035);
  ctx.fill();
  if (happy) {
    ctx.fillStyle = '#f58298';
    ellipse(x, my + r * 0.25, r * 0.105, r * 0.035, 0);
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
  if (ring.width > 0.1) {
    ctx.strokeStyle = '#e5d7ff';
    ctx.lineWidth = r * 0.035;
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlanet(p, x, y, r, { blink = false, glow = 0, happy = false, mouth = 0, gaze = 0 } = {}) {
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
      ctx.beginPath();
      ctx.moveTo(x - r, y - r + (i + 1) * h + 1);
      for (let j = 0; j <= 24; j++) {
        const xx = -r + j / 12 * r;
        const wave = Math.sin(j * 0.43 + i * 1.7) * r * 0.035;
        ctx.lineTo(x + xx, y - r + i * h + wave);
      }
      ctx.lineTo(x + r, y - r + (i + 1) * h + 1);
      ctx.closePath();
      ctx.fill();
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
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(p.faceTilt || 0);
  drawFace(0, 0, r, blink, p.faceY || 0, happy, mouth, gaze);
  ctx.restore();
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
  drawFace(sun.x + r * 0.8, sun.y - r * 0.05, fr, blinkFor(sun.seed), 0, t - sun.popAt < 1.5, performanceFor(sun).mouth);
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
  thump: () => {
    if (!audio) return;
    const t0 = audio.currentTime;
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.setValueAtTime(170, t0);
    o.frequency.exponentialRampToValueAtTime(45, t0 + 0.35);
    g.gain.setValueAtTime(0.6, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    o.connect(g).connect(audio.destination);
    o.start(t0);
    o.stop(t0 + 0.55);
  },
};

// Held finger: a soft note with slow vibrato that fades in, so a quick tap barely hears it.
function startSustain(freq) {
  if (!audio) return null;
  const t0 = audio.currentTime;
  const o = audio.createOscillator();
  const o2 = audio.createOscillator();
  const g = audio.createGain();
  const lfo = audio.createOscillator();
  const lfoGain = audio.createGain();
  o.frequency.value = freq;
  o2.type = 'triangle';
  o2.frequency.value = freq * 2;
  lfo.frequency.value = 5;
  lfoGain.gain.value = freq * 0.012;
  lfo.connect(lfoGain).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.14, t0 + 0.6);
  const g2 = audio.createGain();
  g2.gain.value = 0.25;
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(audio.destination);
  o.start(t0);
  o2.start(t0);
  lfo.start(t0);
  return {
    stop() {
      const t = audio.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      [o, o2, lfo].forEach((n) => n.stop(t + 0.3));
    },
  };
}

// ---------- Voice ----------
// Pre-rendered clips (see tools/make-voice.sh) played through Web Audio, because
// speechSynthesis is silent on the kids' devices. Keys map to voice/<key>.m4a.
const clips = new Map();

function loadClip(key) {
  if (!clips.has(key)) {
    clips.set(
      key,
      fetch(`voice/${key}.m4a`)
        .then((r) => r.arrayBuffer())
        .then((buf) => audio.decodeAudioData(buf))
        .catch(() => null)
    );
  }
  return clips.get(key);
}

function preloadVoice() {
  ['tap', 'sun', 'expert', 'yay', 'good-job', 'hooray'].forEach(loadClip);
  for (const p of PLANETS) ['name', 'fact', 'find', 'found', 'thats'].forEach((k) => loadClip(`${k}-${p.name}`));
}

let sayGen = 0;
let current = null;

function stopSpeaking() {
  sayGen += 1;
  if (current) current.stop();
  current = null;
  state.speech = null;
}

// Plays the clips one after another; a new say() cuts off the previous one.
async function say(...keys) {
  if (!audio) return;
  stopSpeaking();
  const gen = sayGen;
  for (const key of keys) {
    const buffer = await loadClip(key);
    if (gen !== sayGen) return;
    if (!buffer) continue;
    await new Promise((resolve) => {
      current = audio.createBufferSource();
      current.buffer = buffer;
      current.connect(audio.destination);
      current.onended = resolve;
      // Sample decoded speech at 30 Hz; faces follow actual sound, including pauses.
      const samples = buffer.getChannelData(0);
      const step = Math.max(1, Math.floor(buffer.sampleRate / 30));
      const levels = [];
      for (let i = 0; i < samples.length; i += step) {
        let sum = 0, count = 0;
        for (let j = i; j < Math.min(i + step, samples.length); j += 8) {
          sum += samples[j] * samples[j]; count++;
        }
        levels.push(Math.min(1, Math.sqrt(sum / Math.max(1, count)) * 9));
      }
      const name = /^(?:name|fact|found|thats)-(.+)$/.exec(key)?.[1];
      state.speech = { name: key === 'sun' ? 'Sun' : name, levels, at: audio.currentTime, gen };
      current.start();
    });
    if (gen !== sayGen) return;
  }
  current = null;
  state.speech = null;
}

// ---------- Word banner ----------
// Big friendly text so the game still teaches the names when there is no voice.
function showWord(text, color, sticky = false) {
  state.word = { text, color, at: state.time, sticky };
}

function drawWord() {
  const w = state.word;
  if (!w) return;
  const age = state.time - w.at;
  const alpha = w.sticky ? 1 : Math.max(0, Math.min(1, 3.5 - age));
  if (alpha <= 0) {
    state.word = null;
    return;
  }
  const pop = age < 0.3 ? 1 + 0.25 * (1 - age / 0.3) : 1;
  const size = Math.round(Math.min(H * 0.13, W * 0.09) * pop);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px "Arial Rounded MT Bold", "Nunito", system-ui, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = '#fffdf5';
  ctx.strokeText(w.text, W / 2, safeTop + H * 0.14);
  ctx.fillStyle = w.color === '#ffffff' ? '#526bd6' : w.color;
  ctx.fillText(w.text, W / 2, safeTop + H * 0.14);
  ctx.restore();
}

// ---------- Layout ----------
function resize() {
  releaseAllHolds();
  state.echo = { notes: [], lastTapAt: -99, playing: null };
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0;
  HOME.y = 46 + safeTop;

  state.stars = Array.from({ length: Math.round((W * H) / 4500) }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 0.5 + Math.random() * 1.6,
    phase: Math.random() * TAU,
    speed: 0.5 + Math.random() * 2,
  }));

  if (state.mode === 'explore') {
    const selected = state.spotlight?.body.planet;
    layoutExplore();
    if (state.spotlight) state.spotlight.body = selected ? state.bodies.find(b => b.planet === selected) : state.sun;
  }
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
    // Drift back and forth along an arc around the sun; inner planets move faster.
    const orbitR = dist(body.x, body.y, state.sun.x, state.sun.y);
    body.orbit = {
      time: 0,
      r: orbitR,
      a0: Math.atan2(body.y - state.sun.y, body.x - state.sun.x),
      amp: (H * 0.07) / orbitR,
      speed: 0.22 + 0.5 * (1 - i / (PLANETS.length - 1)),
      phase: i * 1.9,
    };
    return body;
  });
}

// Planets in a zig-zag row under the word banner, sized to fit their rings.
function layoutRow(planets, gap, minSize) {
  const margin = H * 0.04;
  const widths = planets.map((p) => 2 * Math.max(p.size, minSize) * p.span);
  const totalUnits = widths.reduce((a, b) => a + b, 0) + gap * (planets.length + 1);
  const unit = Math.min((W - 2 * margin) / totalUnits, H * 0.22);
  let x = margin + ((W - 2 * margin) - totalUnits * unit) / 2 + gap * unit;
  state.bodies = planets.map((p, i) => {
    const w = widths[i] * unit;
    const y = safeTop + H * 0.62 + (i % 2 ? H * 0.09 : -H * 0.09);
    const body = makeBody(p, x + w / 2, y, Math.max(p.size, minSize) * unit);
    x += w + gap * unit;
    return body;
  });
}

function layoutFind() {
  layoutRow(state.find.choices, 0.4, 0.75);
}

// ---------- Modes ----------
function setMode(mode) {
  state.mode = mode;
  state.spotlight = null;
  state.starFlight = null;
  state.particles.length = 0;
  state.ripples.length = 0;
  state.homeHold = null;
  state.word = null;
  state.echo = { notes: [], lastTapAt: -99, playing: null };
  releaseAllHolds();
  stopSpeaking();

  if (mode === 'explore') {
    layoutExplore();
    if (state.talk) say('tap');
  } else if (mode === 'find') {
    state.find = null;
    newFindRound();
  } else {
    layoutMenu();
  }
}

function ripple(x, y, color) {
  state.ripples.push({ x, y, color, life: 0, max: 0.9 });
}

// ---------- Echo (music mode) ----------
// After a pause, the planets replay the last few notes the kid tapped, with the same rhythm.
const ECHO_MAX_NOTES = 8;
const ECHO_MAX_GAP = 0.8;
const ECHO_AFTER = 2.5;

function echoRecord(body) {
  const e = state.echo;
  e.playing = null;
  const gap = e.notes.length ? Math.min(state.time - e.lastTapAt, ECHO_MAX_GAP) : 0;
  e.notes.push({ body, gap });
  if (e.notes.length > ECHO_MAX_NOTES) e.notes.shift();
  e.lastTapAt = state.time;
}

function updateEcho() {
  const e = state.echo;
  if (state.mode !== 'explore' || state.talk) return;
  if (!e.playing) {
    if (e.notes.length >= 2 && state.holds.size === 0 && state.time - e.lastTapAt > ECHO_AFTER) {
      e.playing = { index: 0, nextAt: state.time + 0.4 };
    }
    return;
  }
  const p = e.playing;
  if (state.time < p.nextAt) return;
  const { body } = e.notes[p.index];
  playBody(body, false);
  ripple(body.x, body.y, '#ffffff');
  p.index += 1;
  if (p.index >= e.notes.length) {
    e.notes = [];
    e.playing = null;
  } else {
    p.nextAt = state.time + e.notes[p.index].gap;
  }
}

// Sounds and animates a planet or the sun; `live` means a real finger did it.
function playBody(body, live) {
  body.popAt = state.time;
  body.noteAt = state.time;
  if (live && state.talk) state.spotlight = { body, at: state.time };
  if (body === state.sun) {
    if (state.talk) sfx.chime(8);
    else {
      sfx.thump();
      ripple(body.x + body.r * 0.8, body.y, '#ffd24a');
    }
    burst(body.x + body.r * 0.8, body.y, '#ffd24a', 20);
    showWord('Sun', '#ffd24a');
    if (live && state.talk) say('sun');
  } else {
    sfx.chime(body.planet.note);
    burst(body.x, body.y, body.planet.glow, live ? 16 : 8);
    showWord(body.planet.name, body.planet.glow);
    if (live && state.talk) say(`name-${body.planet.name}`, `fact-${body.planet.name}`);
  }
}

// ---------- Hold to sustain ----------
function releaseHold(pointerId) {
  const h = state.holds.get(pointerId);
  if (!h) return;
  if (h.sound) h.sound.stop();
  state.holds.delete(pointerId);
}

function releaseAllHolds() {
  for (const id of [...state.holds.keys()]) releaseHold(id);
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
    total: state.find ? state.find.total : 0,
    correction: null,
    celebration: null,
  };
  state.starFlight = null;
  layoutFind();
  showWord(target.name, target.glow, true);
  say(`find-${target.name}`);
}

function askAgain() {
  if (state.find.locked || state.find.correction) return;
  state.find.lastAsk = state.time;
  say(`find-${state.find.target.name}`);
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
  preloadVoice();
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

  if (state.mode === 'explore') exploreTap(x, y, e.pointerId);
  else findTap(x, y);
});

function endHold(e) {
  if (state.homeHold && state.homeHold.id === e.pointerId) state.homeHold = null;
  releaseHold(e.pointerId);
}
canvas.addEventListener('pointerup', endHold);
canvas.addEventListener('pointercancel', endHold);
canvas.addEventListener('pointerleave', endHold);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

function exploreTap(x, y, pointerId) {
  const tb = talkButton();
  if (dist(x, y, tb.x, tb.y) <= tb.r + 10) {
    state.talk = !state.talk;
    state.spotlight = null;
    releaseAllHolds();
    state.echo = { notes: [], lastTapAt: -99, playing: null };
    stopSpeaking();
    sfx.fanfare();
    showWord(state.talk ? 'Talk' : 'Music', '#ffffff');
    return;
  }

  if (state.spotlight) {
    const close = spotlightClose();
    if (dist(x, y, close.x, close.y) <= close.r + 10) {
      state.spotlight = null; stopSpeaking(); return;
    }
    const dock = dockBodies().find(d => dist(x, y, d.x, d.y) <= d.hit);
    const hero = spotlightHero();
    const chosen = dock?.body || (dist(x, y, hero.x, hero.y) < hero.r * 1.4 ? state.spotlight.body : null);
    if (chosen) playBody(chosen, true);
    return;
  }
  const body = hitBody(x, y) || (dist(x, y, state.sun.x, state.sun.y) <= state.sun.r ? state.sun : null);
  if (!body) {
    sfx.sparkle();
    burst(x, y, '#ffffff', 5);
    shootingStar(x, y);
    return;
  }
  playBody(body, true);
  if (!state.talk) echoRecord(body);
  if (state.talk) return;
  const freq = body === state.sun ? 65.41 : SCALE[body.planet.note];
  state.holds.set(pointerId, { body, since: state.time, sound: startSustain(freq) });
}

function talkButton() {
  return { x: W - HOME.x, y: HOME.y, r: HOME.r };
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
    f.total += 1;
    state.starFlight = { x: b.x, y: b.y, at: state.time, index: f.stars - 1 };
    f.correction = null;
    b.popAt = state.time;
    sfx.fanfare();
    burst(b.x, b.y, '#ffe36e', 30);

    const milestone = f.stars === 5;
    const bigWin = milestone && f.total % 10 === 0;
    if (milestone) {
      f.celebration = { at: state.time, big: bigWin, nextFirework: 0 };
      showWord(bigWin ? 'Hooray!' : 'Good job!', '#ffe36e', true);
      say('yay', `found-${f.target.name}`, bigWin ? 'hooray' : 'good-job');
    } else {
      say('yay', `found-${f.target.name}`);
    }

    setTimeout(() => {
      if (state.mode !== 'find' || state.find !== f) return;
      if (milestone) f.stars = 0;
      newFindRound();
    }, milestone ? (bigWin ? 6500 : 5000) : 2600);
  } else {
    // Only the same planet is blocked; a different choice may interrupt immediately.
    if (f.correction && f.correction.planet === b.planet) return;
    const correction = { planet: b.planet };
    f.correction = correction;
    b.wiggleAt = state.time;
    sfx.boop();
    f.lastAsk = state.time;
    say(`thats-${b.planet.name}`, `find-${f.target.name}`).finally(() => {
      // An interrupted older response must not unlock a newer correction.
      if (state.find === f && f.correction === correction) f.correction = null;
    });
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

  if (state.mode === 'find' && state.find.celebration) {
    const c = state.find.celebration;
    const age = state.time - c.at;
    if (age >= c.nextFirework && age < (c.big ? 5.8 : 4.3)) {
      const x = W * (0.15 + Math.random() * 0.7);
      const y = H * (0.25 + Math.random() * 0.4);
      const color = ['#ffe36e', '#ff99cb', '#8feaff', '#b6ffa0'][Math.floor(Math.random() * 4)];
      burst(x, y, color, 36);
      ripple(x, y, color);
      sfx.sparkle();
      c.nextFirework = age + 0.45;
    }
  }

  // Gentle nudge for toddlers who wander off mid-question.
  if (state.mode === 'find' && !state.find.locked && !state.find.correction && state.time - state.find.lastAsk > 15) {
    askAgain();
  }

  for (const r of state.ripples) r.life += dt;
  state.ripples = state.ripples.filter((r) => r.life < r.max);

  if (state.mode === 'explore') {
    for (const b of state.bodies) {
      const o = b.orbit;
      if (!state.talk || state.spotlight) continue; // Freeze targets while children play music.
      o.time += dt;
      const a = o.a0 + o.amp * Math.sin(o.time * o.speed + o.phase);
      b.x = state.sun.x + o.r * Math.cos(a);
      b.y = state.sun.y + o.r * Math.sin(a);
    }
    updateEcho();
  }
}

// ---------- Draw ----------
function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#050812');
  g.addColorStop(1, '#101529');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  for (const s of state.stars) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.65 * Math.abs(Math.sin(state.time * s.speed + s.phase))})`;
    if (s.r > 1.6) {
      ctx.fillStyle = '#ebd58e';
      starPath(s.x, s.y, s.r * 2.3, s.r * 0.65, 0);
      ctx.fill();
    } else circle(s.x, s.y, s.r);
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
    const dy = state.mode === 'explore' ? 0 : Math.sin(state.time * 1.2 + b.seed) * b.r * 0.06;

    let glow = 0;
    if (f && b.planet === f.target) {
      if (f.locked) glow = 1;
      else if (state.time - f.askedAt > 6) glow = 0.5 + 0.5 * Math.sin(state.time * 5);
    }

    const held = heldFor(b);
    if (held > 0) drawHoldRing(b.x + dx, b.y + dy, b.r * s, held, b.planet.glow);
    drawPlanet(b.planet, b.x + dx, b.y + dy, b.r * s, {
      blink: blinkFor(b.seed),
      glow,
      happy: held > 0 || state.time - b.popAt < 1.5,
      ...performanceFor(b),
    });
  }
}

// All eight pals take a joyful lap at every second five-star challenge.
function drawPlanetParade() {
  const age = state.time - state.find.celebration.at;
  const radius = Math.min(H * 0.075, W * 0.045);
  smallSun(W / 2, H * 0.55, H * 0.12);
  drawFace(W / 2, H * 0.55, H * 0.09, blinkFor(1), 0, true, 0.3 + 0.2 * Math.sin(age * 8));
  const friends = PLANETS.map((planet, i) => {
    const a = i * TAU / PLANETS.length + age * 1.15;
    return { planet, a, x: W / 2 + Math.cos(a) * W * 0.32,
      y: H * 0.55 + Math.sin(a) * H * 0.22 };
  }).sort((a, b) => a.y - b.y);
  for (const p of friends) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(Math.sin(age * 3 + p.a) * 0.25);
    drawPlanet(p.planet, 0, 0, radius * (0.85 + p.planet.size * 0.25),
      { happy: true, blink: blinkFor(p.a) });
    ctx.restore();
  }
}

function heldFor(body) {
  let best = 0;
  for (const h of state.holds.values()) {
    if (h.body === body) best = Math.max(best, state.time - h.since);
  }
  return best;
}

// Pulsing ring that grows the longer the finger stays down.
function drawHoldRing(x, y, r, held, color) {
  const grow = Math.min(held / 2, 1);
  const pulse = 1 + 0.05 * Math.sin(state.time * 31);
  ctx.save();
  ctx.globalAlpha = 0.25 + 0.6 * grow;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4 + 6 * grow;
  ctx.beginPath();
  ctx.arc(x, y, r * (1.35 + 0.6 * grow) * pulse, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawEmojiButton(btn, emoji) {
  ctx.fillStyle = 'rgba(10,14,40,0.75)';
  circle(btn.x, btn.y, btn.r);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  circle(btn.x, btn.y, btn.r);
  ctx.font = `${Math.round(btn.r * 0.95)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fffdf5';
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
  const n = 5;
  const gap = Math.min(56, (W - 220) / n);
  const x0 = W / 2 - (gap * (n - 1)) / 2;
  const y = H - Math.max(28, H * 0.06);
  for (let i = 0; i < n; i++) {
    starPath(x0 + i * gap, y, gap * 0.42, gap * 0.19, 0);
    const pending = state.starFlight && state.time - state.starFlight.at < 0.9 && i === state.starFlight.index;
    if (i < state.find.stars && !pending) {
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
  ctx.fillText('Planet Pals', W / 2, safeTop + H * 0.17);

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

function drawRipples() {
  ctx.lineWidth = 4;
  for (const r of state.ripples) {
    const k = r.life / r.max;
    ctx.globalAlpha = 1 - k;
    ctx.strokeStyle = r.color;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 30 + k * H * 0.45, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
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
  const shake = state.time - state.shakeAt;
  if (shake < 0.35) {
    const k = (1 - shake / 0.35) * 8;
    ctx.save();
    ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
  }
  drawBackground();
  if (state.mode === 'menu') {
    drawMenu();
  } else {
    if (state.mode === 'explore' && !state.spotlight) {
      drawSun(state.sun);
      const held = heldFor(state.sun);
      if (held > 0) drawHoldRing(state.sun.x, state.sun.y, state.sun.r * 0.75, held, '#ffd24a');
    }
    drawRipples();
    if (state.spotlight) drawSpotlight();
    else if (state.mode === 'find' && state.find.celebration?.big) drawPlanetParade();
    else drawBodies();
    if (state.mode === 'find') drawFindHud();
    if (state.mode === 'explore') drawModeControl();
    if (!state.spotlight) drawWord();
    drawStarFlight();
    drawHome();
  }
  drawParticles();
  if (shake < 0.35) ctx.restore();
}

// ---------- Character performance and Talk stage ----------
function performanceFor(body) {
  const name = body.planet?.name || 'Sun';
  if (state.mode === 'find' && state.find?.celebration) return { happy: true, mouth: 0.3 + 0.2 * Math.sin(state.time * 7 + body.seed) };
  const speech = state.speech;
  if (speech?.name === name && audio) {
    const index = Math.floor((audio.currentTime - speech.at) * 30);
    return { mouth: speech.levels[index] || 0, gaze: 0.02 * Math.sin(state.time * 2), happy: true };
  }
  const held = heldFor(body) > 0;
  const age = state.time - (body.noteAt ?? -99);
  const singing = state.mode === 'explore' && !state.talk && (held || age < 0.65);
  return { mouth: singing ? (0.45 + 0.35 * Math.sin(state.time * 16 + body.seed)) : 0,
    gaze: singing ? -0.035 : 0, happy: singing || state.time - body.popAt < 1.5 };
}

function sticker(text, x, y, size, color, maxWidth = W * 0.8) {
  ctx.save();
  ctx.font = `900 ${Math.round(size)}px "Arial Rounded MT Bold", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#fffdf5'; ctx.lineWidth = Math.max(3, size * 0.12);
  ctx.strokeText(text, x, y, maxWidth);
  ctx.fillStyle = color; ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
}

function dockBodies() {
  const items = [state.sun, ...state.bodies];
  const slot = W / items.length;
  return items.map((body, i) => ({ body, x: slot * (i + 0.5), y: H * 0.865,
    r: Math.min(H * 0.048, slot * 0.27), hit: Math.min(slot * 0.49, H * 0.105) }));
}
function spotlightHero() {
  const p = state.spotlight.body.planet;
  return { x: W * 0.28, y: H * 0.43, r: Math.min(H * 0.205, W * 0.205 / (p?.span || 1)) };
}
function spotlightClose() { return { x: W - 46, y: safeTop + H * 0.19, r: 26 }; }

const TITLE_COLORS = ['#677589','#da8527','#328cc9','#ce563d','#b77447','#bd8a36','#239ca8','#456acb'];
const FACTS = {
  Mercury: ['Closest to', 'the Sun'], Venus: ['The hottest', 'planet!'],
  Earth: ['Our home!'], Mars: ['The red', 'planet!'],
  Jupiter: ['The biggest', 'planet!'], Saturn: ['Beautiful', 'rings!'],
  Uranus: ['Spins on', 'its side!'], Neptune: ['Cold and', 'windy!'],
  Sun: ['A giant', 'star!'],
};

function smallSun(x, y, r) {
  ctx.strokeStyle = '#ffca50'; ctx.lineWidth = r * 0.12;
  for (let i = 0; i < 12; i++) {
    const a = i * TAU / 12 + state.time * 0.08;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a)*r*1.1, y + Math.sin(a)*r*1.1);
    ctx.lineTo(x + Math.cos(a)*r*1.3, y + Math.sin(a)*r*1.3); ctx.stroke();
  }
  ctx.fillStyle = '#ffcd4b'; circle(x,y,r);
  ctx.fillStyle = '#fff19c'; circle(x-r*.18,y-r*.18,r*.65);
}

function drawFactPicture(name, x, y, r) {
  const t = state.time;
  ctx.save(); ctx.lineCap = 'round';
  if (name === 'Mercury') {
    smallSun(x-r*.6,y,r*.55);
    ctx.strokeStyle = '#ffdc84'; ctx.lineWidth = 3;
    ctx.setLineDash([4,8]); ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+r*.85,y); ctx.stroke(); ctx.setLineDash([]);
    drawPlanet(PLANETS[0],x+r*.9,y,r*.25);
  } else if (name === 'Venus') {
    // A cheerful thermometer: bulb and rising warm column, with little heat waves.
    ctx.strokeStyle = '#fff4d4'; ctx.lineWidth = r*.34;
    ctx.beginPath(); ctx.moveTo(x,y-r*.6); ctx.lineTo(x,y+r*.5); ctx.stroke();
    ctx.strokeStyle = '#f57936'; ctx.lineWidth = r*.18; ctx.stroke();
    ctx.fillStyle = '#ff773e'; circle(x,y+r*.5,r*.3);
    for (const side of [-1,1]) {
      ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 5; ctx.beginPath();
      ctx.moveTo(x+side*r*.55,y+r*.35);
      ctx.bezierCurveTo(x+side*r*.85,y,x+side*r*.3,y-r*.1,x+side*r*.6,y-r*.5);
      ctx.stroke();
    }
  } else if (name === 'Earth') {
    ctx.fillStyle = '#f998b8';
    ctx.beginPath(); ctx.moveTo(x,y+r*.75);
    ctx.bezierCurveTo(x-r*1.35,y-r*.1,x-r*.65,y-r*1.1,x,y-r*.4);
    ctx.bezierCurveTo(x+r*.65,y-r*1.1,x+r*1.35,y-r*.1,x,y+r*.75); ctx.fill();
    ctx.fillStyle = '#fff3df'; ctx.fillRect(x-r*.25,y-r*.07,r*.5,r*.48);
    ctx.beginPath(); ctx.moveTo(x-r*.38,y-r*.07); ctx.lineTo(x,y-r*.4); ctx.lineTo(x+r*.38,y-r*.07); ctx.fill();
    ctx.fillStyle = '#ca6d99'; ctx.fillRect(x-r*.07,y+r*.15,r*.14,r*.26);
  } else if (name === 'Mars') {
    ctx.fillStyle = '#ef704c'; circle(x,y,r*.75);
    ctx.fillStyle = '#ba4834'; ellipse(x-r*.22,y+r*.15,r*.26,r*.14,-.3);
    ctx.fillStyle = '#ffd3a8'; ellipse(x+r*.2,y-r*.28,r*.16,r*.08,.2);
    sticker('RED',x,y+r*1.08,r*.32,'#ec6c48');
  } else if (name === 'Jupiter') {
    drawPlanet(PLANETS[4],x-r*.25,y,r*.78,{happy:true});
    drawPlanet(PLANETS[2],x+r*.85,y+r*.4,r*.22);
  } else if (name === 'Saturn') {
    ctx.translate(x,y); ctx.rotate(-.18 + Math.sin(t)*.06);
    for (let i=0;i<3;i++) {
      ctx.strokeStyle=['#9570dc','#d9c3ff','#a685e6'][i]; ctx.lineWidth=r*.13;
      ctx.beginPath(); ctx.ellipse(0,0,r*(1-i*.18),r*(.4-i*.06),0,0,TAU); ctx.stroke();
    }
  } else if (name === 'Uranus') {
    ctx.translate(x,y); ctx.rotate(Math.sin(t*.8)*.22);
    drawPlanet(PLANETS[6],0,0,r*.6,{happy:true});
    ctx.strokeStyle='#baf8ee'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(0,0,r*.95,-1,1.1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r*.43,r*.85); ctx.lineTo(r*.72,r*.7); ctx.lineTo(r*.68,r*1.02); ctx.stroke();
  } else if (name === 'Neptune') {
    ctx.strokeStyle='#a9e7ff'; ctx.lineWidth=5;
    for(let i=0;i<3;i++) {
      const yy=y+(i-1)*r*.45, dx=Math.sin(t*2+i)*r*.1;
      ctx.beginPath(); ctx.moveTo(x-r+dx,yy); ctx.lineTo(x+r*.3+dx,yy);
      ctx.bezierCurveTo(x+r*.85,yy,x+r*.85,yy-r*.35,x+r*.48,yy-r*.27); ctx.stroke();
    }
    ctx.fillStyle='#fff'; starPath(x-r*.6,y-r*.7,r*.15,r*.045,t*.2); ctx.fill();
  } else {
    ctx.fillStyle='#ffd855'; starPath(x,y,r,r*.48,-.1); ctx.fill();
    drawFace(x,y,r*.65,false,0,true);
  }
  ctx.restore();
}

function drawSpotlight() {
  const sp = state.spotlight, body = sp.body, p = body.planet;
  const name = p?.name || 'Sun', color = p?.glow || '#ffcf4d';
  const age = state.time-sp.at, hero = spotlightHero();
  const enter = Math.min(1,age/.35);
  const scale = 0.82 + 0.18*(1-Math.pow(1-enter,3));
  const glow = ctx.createRadialGradient(hero.x,hero.y,0,hero.x,hero.y,hero.r*1.9);
  glow.addColorStop(0,'rgba(117,125,221,0.23)'); glow.addColorStop(1,'rgba(117,125,221,0)');
  ctx.fillStyle=glow; circle(hero.x,hero.y,hero.r*1.9);
  sticker(name,hero.x,H*.135,Math.min(H*.079,W*.053),p ? TITLE_COLORS[PLANETS.indexOf(p)] : '#eaa325',W*.43);
  if (p) drawPlanet(p,hero.x,hero.y,hero.r*scale,{blink:blinkFor(body.seed),...performanceFor(body)});
  else { smallSun(hero.x,hero.y,hero.r*scale); drawFace(hero.x,hero.y,hero.r*.72,blinkFor(1),0,true,performanceFor(body).mouth); }
  // One idea at a time; picture and words enter just after the character.
  ctx.save(); ctx.globalAlpha=Math.min(1,Math.max(0,(age-.18)/.3));
  drawFactPicture(name,W*.71,H*.355,H*.13);
  FACTS[name].forEach((line,i)=>sticker(line,W*.71,H*(.56+i*.071),H*.052,'#ef9747',W*.4));
  ctx.restore();
  const close=spotlightClose(); drawEmojiButton(close,'×');
  ctx.fillStyle='#dce6ff'; ctx.font='600 12px system-ui'; ctx.textAlign='center';
  ctx.fillText('All planets',close.x,close.y+43);
  ctx.fillStyle='rgba(17,24,48,0.95)'; ctx.fillRect(0,H*.755,W,H*.245);
  ctx.fillStyle='rgba(204,218,255,0.15)'; ctx.fillRect(0,H*.755,W,2);
  for(const d of dockBodies()) {
    const selected=d.body===body;
    if(selected) { ctx.fillStyle='rgba(255,224,131,0.16)'; circle(d.x,d.y,d.r*1.65); }
    if(d.body.planet) drawPlanet(d.body.planet,d.x,d.y,d.r,{...performanceFor(d.body),blink:blinkFor(d.body.seed)});
    else smallSun(d.x,d.y,d.r*.85);
    ctx.fillStyle=selected ? '#ffe497' : '#d7dff4';
    ctx.font=`700 ${Math.min(18,W*.014)}px system-ui`; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(d.body.planet?.name || 'Sun',d.x,H*.955);
  }
}

function drawModeControl() {
  const btn=talkButton(); drawEmojiButton(btn,state.talk ? '🗣️' : '🎵');
  ctx.font='700 15px system-ui'; ctx.textAlign='center'; ctx.fillStyle='#e6edff';
  ctx.fillText(state.talk ? 'Talk' : 'Music',btn.x,btn.y+btn.r+18);
}

function drawStarFlight() {
  const f=state.starFlight;
  if(!f || state.mode!=='find') return;
  const age=state.time-f.at, k=Math.min(1,age/.9), eased=1-Math.pow(1-k,3);
  const gap=Math.min(56,(W-220)/5);
  const tx=W/2+gap*(f.index-2), ty=H-Math.max(28,H*.06);
  if(age>1.3) return;
  const x=f.x+(tx-f.x)*eased, y=f.y+(ty-f.y)*eased-Math.sin(k*Math.PI)*H*.15;
  ctx.save(); ctx.globalAlpha=age<.9 ? 1 : Math.max(0,1-(age-.9)/.4);
  ctx.fillStyle='#fff0a3'; starPath(x,y,24+Math.sin(k*Math.PI)*18,12,k*TAU); ctx.fill(); ctx.restore();
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

function quietGame() {
  releaseAllHolds();
  state.homeHold = null;
  state.echo = { notes: [], lastTapAt: -99, playing: null };
  stopSpeaking();
}
window.addEventListener('blur', quietGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) quietGame(); });
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js');
}
