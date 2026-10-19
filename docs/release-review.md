# Spin-and-play release v14

The release builds on the boys' enjoyment of spinning. It preserves all nine
friends, Explore Talk/Music, Find, songs, and personalized greetings.

## Implemented decisions

- Short **Whoa! / Whee!** voices follow deliberate spin speed. Speed smoothing,
  a brief onset check, hysteresis and cooldown prevent accidental or piled-up
  speech. Motion still follows the finger; idle coasting cannot chatter forever.
- Character faces and restrained local arcs respond to spinning. Full rotating
  silhouettes stay clear of headings and captions, with generous stable targets.
- A pictorial **bubble wand** makes four large bubbles to pop for soft notes.
  Another set requires another deliberate tap; no score, timer or forced switch.
- Feather contact plays a short synthesized “Hee hee hee!”; gifts remain familiar
  accessories. Toys, character selection and direct manipulation interrupt cleanly.
- **Sound / Soft / Off** remembers preference and controls all voices and synth,
  including sounds already playing. Visual play continues with sound off.
- New reaction voices are bundled AAC (~18 KB total), predecoded and immediately
  played or skipped; no online TTS call or voice-model download on iPad. Original
  narration and greetings retain their existing recordings and tempo.
- Worker v14 caches 57 assets, preserves other apps' caches and avoids replacing
  healthy offline resources with server failures.

## Verified

- JavaScript/shell/Python syntax checks passed. **37 Node regressions passed**
  across gameplay, reaction timing/ownership, sound settings and worker behavior.
- Chromium at **1024×768 and 1280×800** passed real-pointer gentle/fast spins,
  both reaction types, idle silence after the coast window, four bubble pops,
  sound-setting persistence, all nine selectors, recorded feather reaction and
  Home cleanup. All 57 resources cached; reaction clips decoded/played offline.
- Additional browser smoke checks covered Talk, Music/song startup and Find,
  existing greeting fetches offline, and all nine selectors at both sizes.
  Neither browser smoke suite reported console errors.
- Screenshots were inspected for menu, new controls, spinning captions, bubbles,
  Saturn feather/gift states, Uranus, Talk, Music and Find.
- A baseline v12 worker was installed and explicitly replaced with v14 using a
  versioned registration; restoring normal registration and reloading offline
  showed the updated game. Ordinary browser update timing is still not measured.
- Browser scripts, screenshots and sample clips are in `/workspace/artifacts`.
  The game still needs only a static HTTP server; no installation/build step.

## Device acceptance still needed

Desktop automation cannot measure the boys' enjoyment or verify iPad speakers,
Safari audio hardware latency, screen-lock recovery, touch/palm behavior, sustained
frame rate, or installed-PWA updates. On the family's iPad and Fire tablet:

1. Try gentle turns, quick flicks, reverse turns, catching, and two fingers.
2. Listen to Whoa/Whee and feather reactions; try Soft and Off and check balance
   against the familiar voices. The giggle is generated spoken syllables, not a
   recorded human laugh. No subjective listening assessment is claimed here.
3. Switch tabs/lock/unlock, return and tap, then reload offline after a full load.
4. Confirm the new bubble wand and Sound control appear after the normal update.

The dinosaur app storefront was blocked by this environment's network policy;
its features were not independently observed. See [reference research](dinosaur-research.md),
[iPad audio research](ipad-audio-research.md), [voice provenance](reaction-audio-provenance.md),
[reviewed plan](enhancement-plan.md), and [future learning roadmap](learning-roadmap.md).
