# Planet Pals learning roadmap

The next release should build on the friendly nine-character playground. Keep
the static Canvas app, recorded speech, and gesture-unlocked Web Audio. Tracing
and planet ordering are follow-up activities, not part of the playground release.

## 1. Arrange the planets

Start with three large planets and three stationary slots, then introduce longer
sequences toward all eight. Keep the Sun visible as the starting reference;
it is a character, but not one of the eight planets being ordered. Use familiar
faces, spoken names, and pictorial hints so reading is not required.

Allow forgiving drops, swapping, and unlimited retries. Keep placed planets
selectable and celebrate completion without a timer or penalty. Store answers
by planet identity, separately from temporary drag coordinates.

Validate occupied-slot swaps, interrupted drags, pointer cancellation, additional
fingers, resize, navigation, and completion. Check that all eight slots remain
large enough on landscape iPad and Fire Tablet before increasing difficulty.

## 2. Trace planet names

Begin with one selected planet and one uppercase letter at a time. Show a clear
starting point and wide guided strokes; introduce the whole name only after the
individual-letter experience works. Replay the existing planet-name recording
when selecting the character.

Describe paths in normalized coordinates and derive screen geometry from the
current layout. Measure progress along each intended stroke with forgiving
distance tolerance. Let a child lift and resume without punishment. Keep one
pointer responsible for tracing and ignore incidental additional touches.

Validate interrupted strokes, wandering outside the guide, repeated paths,
multi-stroke letters, cancellation, resizing, and leaving the activity. Physical
tablet testing should determine stroke width and tolerance.

## Modest boundaries to preserve

- **Identity:** reuse `PLANETS` in solar order. Keep the Sun distinct; do not
  duplicate planet definitions or use display positions as answer identity.
- **Rendering:** reuse `drawPlanet`, `drawFace`, and character performance inputs.
  Keep drawing and hit testing based on the same geometry helpers.
- **Activity state:** give ordering and tracing their own state only when built.
  Avoid adding their gestures to Silly state or creating a generic framework.
- **Cleanup:** extend `setMode`, `quietGame`, and resize handling for each new
  activity's pointers, sounds, and pending callbacks. Preserve the existing
  interruption guards for speech and Find rounds.
- **Audio:** make ownership explicit so a completed or cancelled reaction cannot
  stop a newer one. Reuse recorded names and existing gesture unlocking.

Extract small shared files only when implemented activities make that useful.
Any extraction must retain the simple serving workflow and update service-worker
precache entries. Do not introduce dependencies or renderer changes without a
concrete demonstrated need.
