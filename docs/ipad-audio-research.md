# Responsive voices on iPad Safari

Research checked 2026-10-16. The implementation recommendation is short, bundled,
predecoded voice samples through the game's existing Web Audio context. The game
already uses this path because browser speech synthesis was silent on the
children's devices (see AGENTS.md). Preserve those working voices.

## What “faster” can mean

- **Less delay after touch:** preload and decode reaction clips, trim leading
  silence, use one immediately started AudioBufferSourceNode, and discard stale
  reactions. Network/TTS calls must not sit in the interaction path.
- **Quicker speech:** increase speech generation speed, or pre-render a
  pitch-preserving tempo change (FFmpeg `atempo`). Educational names should remain
  clear; a very small increase is preferable to rushing every instruction.
- **Brighter/cartoon speech:** AudioBufferSourceNode `playbackRate` speeds up AND
  raises pitch. 1.1 is roughly 10% faster and 1.65 semitones higher. It does not
  preserve pitch or manufacture expression. Small character variations can suit
  the new reactions; keep readable facts/personal greetings unchanged by default.
- **More expression:** generate or record short exclamations designed as reactions.
  Increasing the speed of an ordinary sentence is not the same thing.

## Concrete implementation guidance

1. Create/resume the shared AudioContext synchronously from pointerdown. Request
   `latencyHint: 'interactive'` as a hint, not a latency guarantee. Resume both
   `suspended` and `interrupted` states and handle rejected promises. MDN explicitly
   documents iOS Safari entering `interrupted` after a tab switch or screen lock.
   Do not recursively retry forever or recreate a context on each touch.
2. Fetch/decode the tiny reaction assets before longer narration. Reuse decoded
   buffers but create a fresh source for each play. Check response.ok, remove failed
   cache entries so a later gesture can retry, and avoid per-frame retry loops.
3. Keep one reaction voice active, no growing queue. Trigger on intentional spin
   speed with a cooldown and re-arm threshold. Do not start speech from every
   pointermove. If loading finishes after the child stops, skip that stale request.
   Rate-limit across planets and secondary fingers too.
4. Home, blur, hiding, resize and friend changes stop reactions; releasing a spin
   may leave its short current phrase to finish only while the same play continues.
   Respect mute/quiet controls and avoid louder rewards for faster spinning.
5. Give speech the selected planet identity for mouth animation. If playback rate
   changes, amplitude lookup time must advance at that rate. Prefer a constant rate
   within each short clip so speech timing remains simple.
6. Bundle AAC/M4A assets with the service worker and bump the cache. No runtime TTS
   service, model download, token, browser voice selection, or account is needed.

## Produced assets

`reaction-whoa`, `reaction-whee` and `reaction-giggle` now have AAC clips. They were
created with CPU Kokoro offline in the build environment; only about 18 KB total
is shipped. These are synthesized exclamations; the giggle is spoken “Hee hee hee!”
rather than a recorded human laugh. See [provenance](reaction-audio-provenance.md)
for texts, tool versions, checksums, license sources and regeneration.

No microphone or child voice is required. No subjective listening tool was
available during this research: decoder/level/silence checks passed, but perceived
expression and speaker balance still need listening on the family's iPad. Do not
claim device latency or voice preference has been measured. Kokoro is a feasible
no-secret production route, not proof of a professional actor's performance.

## Evidence and sources

The MDN website and Hugging Face returned proxy CONNECT 403 here. MDN's official
source repository and upstream GitHub repositories/releases were readable; those
are the sources actually inspected, without bypassing network controls.

- [MDN AudioContext state source](https://github.com/mdn/content/blob/main/files/en-us/web/api/baseaudiocontext/state/index.md): explicit “Resuming interrupted play states in iOS Safari” section.
- [MDN Web Audio best practices](https://github.com/mdn/content/blob/main/files/en-us/web/api/web_audio_api/best_practices/index.md): decoded buffers for short samples, user-gesture context creation/resume, user sound controls.
- [MDN playbackRate](https://github.com/mdn/content/blob/main/files/en-us/web/api/audiobuffersourcenode/playbackrate/index.md): resampling and rate relationship.
- [MDN speech rate](https://github.com/mdn/content/blob/main/files/en-us/web/api/speechsynthesisutterance/rate/index.md): platform/voice-relative rate; some engines constrain supported range. This API does not repair the project's device-specific silent-speech history.
- [Kokoro author README](https://github.com/hexgrad/kokoro): Apache-licensed weights, offline generation, selectable speed and voices.
- [Kokoro ONNX example](https://github.com/thewh1teagle/kokoro-onnx/blob/main/examples/save.py): CPU-friendly conversion workflow and release asset links.

Physical-device release check: first touch after fresh load, repeated/reversed
spins, two-finger play, switching friends, quiet/mute, screen lock and unlock,
Safari tab return, Home during voice, offline reload, and normal PWA update. Browser
emulation can check code and file decoding, but does not establish iPad audio
hardware latency, mute-switch behavior or the children's preference.
