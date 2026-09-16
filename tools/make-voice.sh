#!/bin/sh
# Regenerates voice/*.m4a with macOS text-to-speech. Run from the repo root: sh tools/make-voice.sh
# Uses the Mac's system voice (System Settings > Accessibility > Spoken Content) unless VOICE names one
# from `say -v ?`. Note: `say` silently falls back to the default if the name is not installed.
set -e
VOICE="${VOICE:-}"
RATE="${RATE:-165}"
out="$(dirname "$0")/../voice"
mkdir -p "$out"

clip() { # clip <file> <text>
  say ${VOICE:+-v "$VOICE"} -r "$RATE" -o "/tmp/pp-voice.aiff" "$2"
  afconvert -f m4af -d aac -b 48000 "/tmp/pp-voice.aiff" "$out/$1.m4a"
}

clip tap "Tap a planet!"
clip sun "The Sun! The Sun is a giant star."
clip expert "Ten stars! You are a space expert!"
clip yay "Yay!"

i=0
for name in Mercury Venus Earth Mars Jupiter Saturn Uranus Neptune; do
  clip "name-$name" "$name!"
  clip "find-$name" "Can you find $name?"
  clip "found-$name" "You found $name!"
  clip "thats-$name" "That's $name."
done

clip fact-Mercury "Mercury is the closest planet to the Sun."
clip fact-Venus "Venus is the hottest planet."
clip fact-Earth "Earth is our home!"
clip fact-Mars "Mars is the red planet."
clip fact-Jupiter "Jupiter is the biggest planet!"
clip fact-Saturn "Saturn has big, beautiful rings."
clip fact-Uranus "Uranus spins on its side."
clip fact-Neptune "Neptune is very cold and windy."
rm -f /tmp/pp-voice.aiff
ls "$out" | wc -l
