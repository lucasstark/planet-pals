# KLT reference breakdown — Planet Pals

Reviewed 2026-09-17 in the user's Chrome YouTube tab.
Source: https://www.youtube.com/watch?v=xcnTH2hv4V4
Focus: opening roughly 10–30 seconds, with comparison samples at 35 and 45 seconds.
Method: browser playback and paused frame inspection, plus user-supplied Earth,
Venus and Jupiter close-ups. No installed video-breakdown skill was available.
This is a visual analysis, not an audio/BPM or frame-accurate edit analysis.
Times below are sampled positions, not measured cut boundaries.

## Overall concept

A friendly cast performs on a simple space stage. The recognizable planet surface
is the costume; oversized eyes, eyebrows and changing mouth shapes supply the
personality. A few strong compositions repeat: ensemble, central star, solo planet
plus fact. Scale and arrangement establish attention before text has to be read.
The educational graphic is part of the performance, not a caption below it.

## Observed layout beats

| Sample | Visible composition | Attention mechanism |
| --- | --- | --- |
| 0:10 | All eight planets scattered across the stage; Jupiter upper-left, Saturn right, smaller rocky planets below | Distinct sizes and silhouettes let the viewer recognize a whole cast. Large black gaps keep them separate. |
| 0:15 | Huge smiling Sun wearing red sunglasses dominates the center; planets surround/overlap its perimeter | A dramatic scale change creates a new focal point while preserving familiar characters. |
| 0:20 | Same Sun-centered ensemble; faces and gaze differ from earlier samples | Character performance sustains interest without continually changing the composition. |
| 0:25 | Mercury on the right, name above, large glowing yellow/orange temperature graphic on the left | Clear solo spotlight; the concept has its own illustrated treatment, including flames. Text is visibly entering/building between samples. |
| 0:30 | Mercury remains right; the left graphic changes to a proximity fact with a Sun illustration | Reuse the layout, replace the one idea being taught. |
| 0:35 | Mercury now left, large numeric fact on the right | Alternating sides refreshes the composition while preserving the same visual grammar. |
| 0:45 | Venus left, name at top, giant ordinal and small Sun on the right | A repeatable planet-introduction template: character + identity + one visual fact. |

The supplied Jupiter close-up adds a useful variant: isolate and enlarge the red
storm alongside the planet so the child can connect the detail to the whole.
The supplied Earth close-up pairs recognizable continents with a large ordinal.

## Visual hooks worth adopting

- Faces dominate: large white eyes, blue irises, bold dark brows, several mouth
  shapes, teeth/tongue accents. Gaze changes and blinking make the cast feel aware.
- Silhouettes do educational work: Saturn's broad rings, sideways Uranus, Jupiter's
  size and bands, Earth's land/ocean contrast. Planets stay identifiable at a glance.
- Strong flat color regions with a darker side give rounded volume without noisy
  photorealism. Surface detail supports identity without overpowering the face.
- The Sun's sunglasses are a character prop: an instantly legible personality cue.
  Planet Pals can develop its own recurring playful Sun gesture/prop.
- Sparse small gold stars against near-black create a consistent stage. The
  background has much less contrast and visual weight than the characters.
- Rounded heavy lettering with thick white outlines reads like a sticker.
  Names use planet-related colors; orange is a recurring fact emphasis color.
- Numbers are often the biggest graphic. Small illustrations replace some words.
  For our pre-reading audience, spoken cues and images must still carry meaning.

## Editing grammar to translate into interaction

The useful sequence is: establish the cast → select a performer → reveal one
idea → let the expression react → return to the cast. Build anticipation through
scale/entrance, then leave a stable reading/recognition interval. Changing facial
poses can sustain that interval without moving every target around.

The following durations are proposed game timings, NOT measurements of the video:

| Game event | Proposed visual beat | Constraint |
| --- | --- | --- |
| Explore Talk tap | 150–250 ms acknowledgment; 300–450 ms spotlight entrance; show the name, then one fact illustration during recorded speech | Another planet must remain easy to select; avoid a forced movie after each tap. |
| Find correct | Enlarge the selected friend, smile, pop its name; send one star into the progress row | Trigger after answer acceptance, so the child never chases a moving answer. |
| Find wrong | Brief friendly expression and correction; keep all choices in place | Preserve duplicate wrong-tap suppression and immediate different-planet interruption. |
| Five stars | Count/reveal five large stars, then a short ensemble cheer | Keep the existing Good job/fireworks milestone recognizable. |
| Ten correct | Expand into a full-cast stage/parade, then settle back | Use big composition changes at this earned milestone. |
| Music tap/hold | Mouth opens with the note, brows lift, subtle squash/stretch and a local pulse | Fixed body centers and hit areas; no orbit, camera pan, automatic re-layout or idle bobbing. |
| Music echo | Previously played pals react in sequence, like a call-and-response ensemble | Preserve note timing and multi-touch. |

## Highest-value next implementation

1. Add speech/note-driven mouth states and expressive eye/brow poses. This is the
   largest remaining gap between our static smiles and the reference performance.
2. Add a Talk spotlight composition with a large character and one pictorial fact.
   Prototype without replacing the currently accessible planet selectors.
3. Give name/fact text a consistent outlined, rounded treatment and a short entrance.
4. Choreograph success: selected planet reacts → earned star travels → full-cast
   celebration only at milestones. Avoid competing animation focal points.
5. Improve surface shading and Saturn's layered ring structure after the behavior
   and compositions work at landscape iPad / Fire HD 10 sizes.

## Implementation notes for future work

Keep the current vanilla Canvas renderer. Extend drawFace with expression/mouth
parameters and drawPlanet with performance state; keep art reusable across modes.
Use the actual decoded clip playback interval in say() for speaking state, guarded
by sayGen so interrupted clips cannot reset a newer expression. An audio-envelope
mouth animation is an option; it should be described as amplitude-reactive rather
than phoneme lip sync. Sustain and echo already expose note-start/release events.

Use a separate presentation state for spotlight/celebration. Keep input identity
stable and derive hit geometry from the same presentation transform whenever a
selectable body moves. Clear transitions on mode changes. Preserve the fixed
Music positions introduced in this task and existing Find speech guards.

Cache static planet surface artwork only if device profiling warrants it; animate
faces and transforms separately. Honor recorded speech on the target tablets.
Use original game art and audio while adopting the reference's staging principles.

Validation should include rapid interruptions, held notes, returning from a
spotlight, changes of mode during speech, and milestone-to-round transitions.
Check both landscape tablet sizes with real device audio before declaring finished.
