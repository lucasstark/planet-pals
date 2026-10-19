# Spin-and-play enhancement plan

## Goal

Build on the boys' demonstrated enjoyment of planet spinning. Keep every planet
and the Sun recognizable, all existing activities available, and the child in
control. Offer sound choices without assuming either child's sensory preferences.

## Reviewed release scope

1. **Expressive spinning.** Short bundled “Whoa!” and “Whee!” clips respond to
   deliberate slow/fast rotation, with a responsive face and restrained local
   trails. Smooth speed estimates and cooldowns prevent speech piling up. Catching
   or leaving a character ends its reaction; idle coasting cannot chatter forever.
2. **One additional toy: bubbles.** A pictorial wand creates a small set of large,
   slow bubbles. Taps pop them with soft musical notes; the child can make another
   set. Keep hero manipulation and friend selection unambiguous. No timer, score,
   punishment, or forced switch of activity.
3. **Audio that suits the moment.** A visible normal/soft/off control affects all
   audio and remembers its state safely. Short clips are preloaded and decoded,
   support interruption, and are available offline. Existing names/facts remain
   bundled; modest tempo adjustment must retain intelligibility and matching faces.
4. **Reliable delivery.** Preserve prior working changes, recorded greetings,
   Explore/Music/Find/song behavior and all nine friends. Update the service-worker
   asset list and version. Validate lifecycle, multi-touch, offline audio, and
   representative tablet layouts.

## Review decisions

The independent design review recommended spin/audio first, existing toy polish
second, and bubbles only after the core is stable. Adopted: one bounded voice
channel, no speech queue, no unsolicited chatter, no camera shaking for new effects,
local effects rather than fullscreen rewards, and stable large touch targets.
A bubble toy is included as a small reversible source of variety; it will not add
another menu mode or framework. Tracing and solar ordering stay on the roadmap.

“Faster voices” is addressed primarily as response latency: predecode short clips
and avoid queueing. Playback-rate changes also change pitch and are kept modest.
New voices are generated ahead of time, not by downloading a voice model to iPad.

## Ownership

- Research agent: reference-app evidence and limitations.
- Voice agent: iPad audio research, new rendered reaction clips, generator/provenance.
- Integration agent: sole owner of `game.js` during implementation.
- Release agent: worker/assets consistency and worker regression coverage.
- Lead: plan review, gameplay regression additions, browser validation, screenshots,
  final integration review and delivery. No concurrent edits to `game.js`.

## Acceptance

- Deliberate spins in either direction produce appropriate short reactions; tiny
  touch jitter, resting fingers and idle time do not cause speech spam.
- Center swipes, center crossing, circular drags, transfer/cancel/lost capture,
  toys, Home, resize and backgrounding preserve gesture/audio ownership.
- Bubbles cannot steal a starting hero drag or block dock/toy/navigation controls;
  a bounded set disappears on switching or cleanup.
- Sound settings immediately affect running synth and voices, survive reload,
  and work when storage is unavailable. Off does not stop visual play.
- Existing regression suite plus new behavioral cases pass. Inspect real browser
  screenshots at 1024×768 and 1280×800 and test all cached reaction clips offline.
- Physical iPad listening/touch and installed-PWA behavior remain an explicitly
  separate validation step; browser emulation is not device verification.
