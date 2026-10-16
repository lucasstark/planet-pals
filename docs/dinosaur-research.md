# Dinosaur reference and Planet Pals interaction direction

Research attempted October 16, 2026. This document separates inspected evidence
from design proposals; it is not a review of a downloaded dinosaur app.

## Reference and access limits

The project request names **Dinosaur Games for Kids: Dino!** as a reference.
Amaya is a candidate developer, but the exact listing/developer could not be
verified in this environment. Do not attribute specific mechanics, accessibility
support, pricing, or age suitability to that app on the basis of this document.

Authoritative destinations attempted:

- Developer website: <https://www.amayakids.com/> (also tried the bare domain).
- Apple software lookup: <https://itunes.apple.com/search?term=Dinosaur%20Games%20for%20Kids%20Dino%20Amaya&entity=software&limit=10>.
- Apple App Store domain: <https://apps.apple.com/>.

All requests failed at the network proxy with `CONNECT 403 Forbidden`, including
an escalated retry of the developer site. No page content, screenshots, video,
store reviews, or installed-app interactions were inspected. These are research
destinations, not successfully retrieved sources supporting game-feature claims.
The exact App Store link from the parent would help resolve identity, but is not
required to implement the original Planet Pals improvements below.

## Evidence available now

- The parent says both boys enjoy the current game but lose interest quickly;
  the three-year-old particularly enjoys spinning planets. This is the strongest
  available evidence for prioritizing repeated physical cause and effect.
- Inspected `AGENTS.md`, `docs/visual-reference.md`, and the existing playground
  input/update/render functions in `game.js`. The game already offers nine
  selectable friends, direct rotation with decaying inertia, feather tickling,
  and a gift that cycles accessories. Existing drag rotation has no spoken
  “whoa”/“whee” performance; a rapid-tap reaction displays “Wheee!” with tones.
- The local KLT reference document describes character staging and expressive
  faces. That is a previous author's recorded visual review, not a dinosaur-app
  observation made during this research.

## Three original features to implement

### 1. Make spinning a conversation

Keep the planet attached to the finger. When meaningful rotation starts, play
one short “Whoa!”; use a brighter “Wheee!” for a faster turn. Keep voices short,
with a cooldown and no queue, so another swipe never generates a backlog.
Tie mouth/expression changes to the actual reaction. Give every selected friend
the same discoverable action while allowing a modest tonal personality change.
Retain immediate grabbing/stopping and smooth coasting after release.

Use recorded clips through the existing gesture-unlocked Web Audio path. Do not
replace working iPad speech with unverified browser speech synthesis. Clear the
reaction when changing friend, leaving, or backgrounding the app. A quiet option
must not disable the child's physical control of the planet.

Why first: it directly expands the action the child independently chooses.
The proposed timing and performance are design recommendations, not measured
behavior from the dinosaur app or a clinical intervention.

### 2. Add a predictable bubble toy

Offer one illustrated bubble wand that produces a small, bounded cluster around
the selected planet. Large bubbles pop directly under the finger with a soft
note and a local sparkle; the friend smiles. Another press creates the same
kind of opportunity in slightly different positions. Keep selectors and Home
clear, and let the child immediately return to spinning.

This offers an easy second action for the two-year-old without reading, scoring,
timers, or a new navigation layer. Show only a few simultaneous bubbles and
avoid loud bursts. Use original art and sound; no dinosaur assets are needed.

### 3. Deepen familiar toys with bounded variation

Keep feather → tickle → laugh → settle and gift → accessory as simple, repeatable
sequences. Rotate through a small known set of short reactions/accessories;
avoid unprompted events, locked rewards, automatic mode changes, or a busy
screen of new activities. Let a drag interrupt a performance immediately.

Variation should enrich the selected action while preserving its outcome.
If a reaction starts to feel repetitive, add one alternate performance before
adding a new mode. Preserve the existing songs, learning activities, and cast.

## Review and validation criteria

- First meaningful gesture produces immediate visual feedback and at most one
  short voice; rapid gestures and multiple fingers do not stack speech.
- The child can repeat an action indefinitely without a score, failure state,
  or forced next activity. All interactive controls remain in stable locations.
- Every friend supports the same spin/toy actions; expression and sound clearly
  belong to the selected friend. Sound stops on Home and app backgrounding.
- Check landscape iPad sizes, offline voice availability, and actual iPad Safari
  audio onset/speaker balance. Desktop browser automation cannot establish the
  children's enjoyment, sensory comfort, or physical-device performance.

The parent's observations guide the work. Autism alone does not establish one
sensory preference: make sound optional and retain control/predictability, then
use the boys' responses to choose subsequent additions.
