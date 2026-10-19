# Phone play and audio recovery — v15

The children already enjoy Planet Pals. This release preserves their planets,
spinning, recorded reactions, musical notes, familiar songs and forgiving Find
activity. It addresses cramped phone play rather than introducing more modes.

## Changes

- Portrait menu gives Playground the largest invitation; Explore and Find remain.
- Playground uses a two-row friend shelf and three clear toys on portrait phones.
  Static curved arrows introduce turning without spinning the toy for the child.
  Gifts remain until another toy, friend, spin celebration or lifecycle cleanup replaces them.
- Explore uses stationary compact targets, including a centered Sun face, with a
  3×3 portrait arrangement and readable song rows. Talk spotlights and Find adapt
  to portrait. Short landscape layouts retain space above controls and rewards.
- Canvas dimensions come from its actual CSS bounds. Safe-area insets apply to
  navigation and compact shelves. The PWA allows either orientation.
- Gesture audio preparation requests an interactive AudioContext and, where
  supported, a playback audio session. These are compatibility improvements, not
  proof that the reported physical iPad silence is resolved.
- Grown-ups opens explicit Normal/Soft/Off settings, an independent recorded voice
  check and a music check. Diagnostics describe browser state without claiming
  that a started playback promise means audible sound. Tests stop on dismissal,
  blur and backgrounding; no autoplay or polling was added.
- Worker v15 includes device-audio.js, for 58 precached assets.

## Design review

The parent's dinosaur screenshots show a large central friend, a small pictorial
prop shelf and immediate reactions. Planet Pals uses that clear relationship with
its existing original planets; no dinosaur art or sound is imported. Quiet spin
cues disappear after interaction. There are no timers, penalties, forced activity
changes or new reward requirements. Parents retain direct sound control.

## Verification

Run `node --test tests/*.cjs` and syntax checks for game.js, device-audio.js and
sw.js. The 37 regressions cover existing gameplay/audio ownership and worker
lifecycle, with the new helper included in precache assertions.

Browser validation covers portrait 390×844 and 375×667, landscape 844×390 and
1024×768, plus simulated phone safe-area insets. The external development script
is `/workspace/artifacts/phone-v15.cjs`; its screenshots and JSON results live
alongside it. All 60 browser check groups and 126 randomized Find rounds passed,
with no page or console errors. This is Chromium coverage, not physical Safari
certification.

On the actual iPad, open Grown-ups, choose Normal, then try voice and music.
Report which one is heard if either stays silent; the independent media and
Web Audio paths help narrow the cause. Verify ordinary site update behavior,
speaker volume, touch comfort and the children's reactions on their devices.

Forced v14→v15 worker replacement also passed in Chromium: activation and controller
replacement, old-cache cleanup, preservation of an unrelated cache, offline reload,
all 58 assets, the helper, five decoded greeting/reaction clips and both parent
sound checks. The harness restored the canonical worker URL before offline reload.
Normal `registration.update()` remained pending after ten seconds in a separate
trial; automatic update timing is not established by the forced-update result.
