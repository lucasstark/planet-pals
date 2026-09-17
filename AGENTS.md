# Planet Pals — project guide

## Purpose and handoff

Planet Pals is a toddler-oriented, touch-first planet learning and music game. It
is a static web app / installable PWA, **not a native Android project**, despite
the parent directory name. Target-device context in the code and history includes
landscape iPad and Kids Fire Tablet 10 browser play (confirmed by the user).
Narrow-screen redesign is a lower priority; prioritize these landscape tablets.

The user intends to improve visuals, rendering, and gameplay after the previous
Claude work. This guide records a quick source review on 2026-09-16 at commit
`2f8fa43`; it is not a device-tested visual audit. No gameplay changes were made
during the handoff. Keep this guide current when architecture or workflows change.

## Files and workflow

- `index.html`: full-screen canvas, mobile viewport/meta tags, touch/selection
  suppression, safe-area CSS variable. Loads `game.js` as a classic script.
- `game.js`: entire game, procedural Canvas 2D art, layouts, input, audio, state,
  and animation loop. No imports, framework, dependencies, or build step.
- `manifest.json`: fullscreen, landscape-oriented PWA; relative start URL/scope.
- `sw.js`: network-first GET caching, precaches app files and all 46 voice clips.
  Cache version at review: `planet-pals-v7`. Registers on HTTPS or `localhost`.
- `voice/*.m4a`: bundled speech, decoded and played through Web Audio.
- `tools/make-voice.sh`: macOS `say` + `afconvert` voice generation. Run from root
  with `sh tools/make-voice.sh`; optional `VOICE` and `RATE` environment variables
  (default rate 165). This overwrites the clips; use only when changing speech.
- `icon-192.png`, `icon-512.png`: PWA icons; planets themselves are drawn in code.
- Git remote: `git@github.com:lucasstark/planet-pals.git`. No deployment workflow,
  package manifest or deployment automation was present. Focused Find regression
  tests now live in `tests/find-mode.cjs`; run `node --test tests/find-mode.cjs`.

Serve from the repo root with `python3 -m http.server 8000 --bind 127.0.0.1`, then
open `http://localhost:8000`. HTTP serving is needed for voice fetching; avoid
`file://`. Use an appropriate HTTPS setup for testing installed PWAs on devices.
Do not assume a GitHub Pages deployment is configured from the remote alone.

Fast static checks:

```sh
node --check game.js
node --check sw.js
sh -n tools/make-voice.sh
```

All passed at review; all 44 expected audio files were present. Browser behavior,
audio quality, visual layout, offline behavior, and device performance were not
tested in this initial review.

## Code map (search by symbol; line numbers will change)

- `PLANETS`: eight planets in solar order. Each has relative `size`, horizontal
  ring-inclusive `span`, musical `note`, colors, optional bands/details/rings.
  `detail()` functions draw using the shared `ctx` inside a clipped disk.
- `state`: mode, animation time, bodies, sun, particles, stars, Find state, word
  banner, holds, Talk/Music preference, and musical echo sequence. Memory only.
- `drawPlanet`, `drawRing`, `drawFace`, `drawSun`: procedural character art.
  Planets draw glow, back ring, clipped surface + shading, front ring, then face.
- `resize`, `layoutMenu`, `layoutExplore`, `layoutRow`, `layoutFind`: layout in CSS
  pixels; canvas backing resolution uses device pixel ratio capped at 2.
- `setMode`: resets transient effects/echo/holds/speech and lays out a mode.
- `unlockAudio`, `tone`, `sfx`, `startSustain`: gesture-unlocked Web Audio synth.
- `loadClip`, `preloadVoice`, `say`, `stopSpeaking`: cached decode promises and
  interruptible sequential speech; `sayGen` prevents stale sequences continuing.
- `playBody`, `echoRecord`, `updateEcho`: planet feedback and musical replay.
- `newFindRound`, `findTap`, `askAgain`: quiz selection, scoring, speech, feedback.
- Canvas pointer listeners, `hitBody`, `exploreTap`, `endHold`: touch/mouse input.
- `frame` → `update` → `draw`: requestAnimationFrame loop; dt capped at 0.05 sec.
  Draw order is background, mode content, HUD/word/home, then particles.

## Existing gameplay to preserve unless intentionally redesigned

- Menu has Explore and Find it!; tapping empty space creates shooting stars.
- Explore shows all eight planets with a partially offscreen sun. In Talk mode planets drift
  along short orbital arcs; Music freezes their positions and orbit clocks.
  Explore has no extra idle bobbing, so Music touch targets stay stationary. Taps pop/smile, emit particles, play notes, and show
  names. Talk mode adds the planet name and a fact; the sun has its own clip.
- Top-right Explore control switches Talk/Music. Music records up to eight taps,
  caps recorded gaps at 0.8 sec, and starts an echo after 2.5 sec of inactivity
  plus a 0.4-sec lead-in, once all fingers are released. The sun acts as a bass
  drum and emits a local ripple in Music mode.
- Holding a body sustains a note with vibrato and a growing ring. Multiple
  pointers are tracked independently. Sustain is Music-only; Talk taps open a character spotlight.
- Find it! presents four shuffled choices, avoiding consecutive repeat targets.
  Correct answers earn stars toward a five-star challenge. Five triggers colorful
  star fireworks and “Good job!”; every ten total correct answers adds an
  eight-planet orbiting parade and “Hooray!” speech. The five-star row resets
  after each challenge; total correct answers persist until leaving/restarting Find.
  Wrong answers gently identify the tapped planet and repeat the question.
  Repeated taps on that same wrong planet are ignored until its speech sequence
  ends; another planet can interrupt immediately. Correction identity guards
  prevent completion of old speech from unlocking a newer correction.
  Target glow hints begin after six seconds; spoken reminders repeat after 15.
  Round advance uses guarded wall-clock timeouts (2.6 sec normally, 5 sec at five stars, 6.5 sec for the ten-answer parade).
- Home requires a 1.2-sec hold. Find's top-right speaker repeats the prompt.
  Starting Find anew resets score; Talk/Music preference lasts only in memory.

## Important constraints

- Speech synthesis was replaced because it was silent on the children's devices
  (history: `1835c7c`, `dff8976`, `c3d5cc8`). Preserve recorded speech and gesture
  audio unlocking unless an alternative is verified on those devices.
- Speech keys are `tap`, `sun`, `expert`, `yay`, `good-job`, `hooray` and
  `{name,fact,find,found,thats}-{Planet}` with case-sensitive planet names.
  Keep the generation script, callers, assets, and service-worker list in sync.
- Keep interactions forgiving: large targets, friendly feedback, visible names,
  and no punishment for wrong choices. Layout uses deliberately nonphysical
  planet sizes; orbital movement is illustrative, not a solar-system simulation.
- Prefer focused changes within this small vanilla app; add dependencies or a
  renderer migration only when they solve a concrete need.
- Include new offline assets in `sw.js` and update the cache version for releases
  that change the precache. Verify updates and offline reload with the worker
  active; a stale worker/cache can mislead visual debugging.

## Review findings / candidate improvements (not yet fixed)

1. **Responsive layout:** Explore packs every planet into one row and does not
   clamp minimum visual size despite the data comment. Narrow/portrait viewports
   produce tiny planets and overlapping minimum hit regions. Only the top safe
   inset is handled. The manifest orientation does not guarantee browser layout.
2. **Resize state (fixed 2026-09-17):** resizing releases held notes, clears
   echoes and rebinds the selected spotlight to the newly laid out body.
3. **Input/render consistency:** hit testing uses base centers/radii, not rendered
   pop scale, bob/wiggle offsets, or ring geometry. Expanded 44px minimum-radius
   hit areas help touch but can overlap. Home hold has no pointermove boundary
   check, Blur/visibility cleanup now stops speech, holds, and echoes.
4. **Timing/performance:** particle damping multiplies velocity by 0.96 per frame,
   so behavior changes with refresh rate. Animation time is capped while Find
   timeouts use wall time. Background and planet gradients are rebuilt each
   frame; profile on tablets before introducing caching or complexity.
5. **Visual consistency/accessibility:** emoji controls depend on OS rendering;
   named fonts are not bundled. All UI is canvas with no semantic controls or
   keyboard path. There is no mute/volume control or reduced-motion handling.
   Improve hierarchy, control discoverability, lighting, and feedback with a
   coherent visual direction, then inspect actual screenshots on target sizes.
6. **Resilience:** failed clip decoding remains cached as null with no retry.
   Service-worker fetch handling caches responses without checking success and
   has no explicit fallback for uncached offline requests. Activation deletes
   all differently named origin caches, not just Planet Pals caches. Revisit
   before hosting beside other apps on a shared origin.

## Practical validation for future changes

- Inspect menu, Explore Talk, Explore Music, and Find at landscape tablet,
  the target tablets first; secondary phone and portrait checks can follow; check rings, labels, hit regions, and insets.
- Exercise rapid taps, multi-touch holds/releases/cancels, Home hold, mode
  changes, and rotation during both holds and pending echoes.
- Verify name/fact speech interruption, audio after first gesture, Music echo
  rhythm, and sound cleanup when leaving/backgrounding the game.
- Verify correct/wrong quiz answers, hint, repeat button, idle reminder, five-star fireworks, ten-answer
  celebration, and exiting while a round-advance timeout is pending.
- Check console/network errors, offline reload after installation, and a new
  version arriving with an existing service worker. Browser emulation does not
  replace Android/iPad checks for audio and installed-app behavior.

## Find update validation (2026-09-16)

Focused Node VM tests cover milestone progression, duplicate scoring, leaving
before delayed round advance, same-wrong-planet suppression, different-choice
interruptions, and stale speech completion. Both celebration scenes were visually
checked in a 1280×800 browser preview. New clips were generated with macOS speech
and AAC conversion. Actual tablet audio/PWA testing remains outstanding.

## Visual direction and Music update (2026-09-17)

User supplied KLT planet screenshots and video reference:
https://www.youtube.com/watch?v=xcnTH2hv4V4 (about 12–30 seconds).
Browser playback encountered a pre-roll ad; supplied screenshots informed this pass.
Favor expressive large white eyes with blue irises, eyebrows and toothy smiles,
recognizable colorful surfaces, lavender Saturn rings, a sideways Uranus face,
and a dark starfield with occasional gold stars. Art remains procedural Canvas.
Do not import video assets or audio as part of this direction.

Orbit phase now lives in each body's `orbit.time`, advancing only in Talk mode;
Music pauses positions without rebuilding bodies, preserving holds/echo references.
Tap pops, held-note feedback and musical echo remain animated. Regression coverage
in `tests/find-mode.cjs` includes Music freezing and Talk resuming orbit phase.
Menu and Explore art checked in a 1280×720 browser preview; device testing remains.
Additional close-ups informed Venus's procedural amber cloud swirls, Earth's
stylized continent polygons, and Jupiter's wavy bands and layered red storm.
These were also visually checked in the landscape Explore preview.

## Video analysis reference (2026-09-17)

See `docs/visual-reference.md` for the direct Chrome review of KLT's opening
sequence (sampled 10–45 seconds), visual hooks, layout beats, and proposed gameplay
adaptations. This supersedes the earlier screenshot-only reference limitation.
Key direction: cast → spotlight → one pictorial fact → reaction → return; animate
faces with speech/notes and reserve large staging changes for Talk and rewards.
Music centers/hit areas stay fixed. Proposed timings are design suggestions, not
measurements of the reference video. No gameplay edits were made during analysis.

## Character performance and spotlight implementation (2026-09-17)

- Talk taps open a persistent character stage: large selected friend, outlined
  name, and a matching pictorial fact. All eight planets and Sun remain selectable
  in a bottom dock; tap the hero to replay, another dock friend to interrupt, or
  All planets (×) to return. Switching to Music closes the stage immediately.
- `drawSpotlight`, `dockBodies`, `spotlightHero`, `drawFactPicture`, `FACTS` own the
  stage. Fact wording matches existing recorded clips; no new media dependencies.
  Stage geometry is shared by drawing and touch handling. Orbit clocks pause
  while the stage is open. Spotlight persists after speech so children can look.
- `say()` samples decoded clip amplitude at 30 Hz. `state.speech` identifies the
  speaking planet and playback time; `performanceFor()` drives mouth opening and
  gaze. This is amplitude-reactive animation, not phoneme lip sync. `sayGen` guards
  interrupted completion; Find prompts intentionally do not animate the answer.
- Music mouths react to taps, held notes and echo playback. Centers remain fixed;
  the Sun drum uses a local ripple instead of shaking the whole screen.
- Find awards a flying star before filling the new score slot. Five-star faces
  cheer; the ten-answer parade surrounds a smiling Sun. Existing scoring and
  wrong-tap correction guards are preserved.
- `quietGame()` releases audio/echoes on blur or document hiding. Mode switching
  releases holds. Resize rebinds the spotlight, releases holds and clears echoes.
- Browser checks: 1024×768 and 1280×800 landscape, Talk selection, Saturn rings,
  Venus/Earth fact scenes, Music switching, ten-answer parade; no console errors.
  Six Node regression tests cover Find, fixed Music targets, stage navigation,
  resize, audio interruption ownership, multi-note holds, echo and cleanup.
  Actual iPad/Fire audio, performance, and installed-PWA updates remain to verify.
