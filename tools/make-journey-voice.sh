#!/bin/sh
# Generate only the new adventure prompts; preserve the original planet recordings.
set -eu
root="$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)"
task_voice_tmp="$(mktemp -d /tmp/planet-pals-voice.XXXXXX)"
trap 'rm -rf "$task_voice_tmp"' EXIT HUP INT TERM
while IFS="$(printf '\t')" read -r key words; do
  [ -n "$key" ] || continue
  if [ -n "${VOICE:-}" ]; then
    say -v "$VOICE" -r "${RATE:-155}" -o "$task_voice_tmp/clip.aiff" "$words"
  else
    say -r "${RATE:-155}" -o "$task_voice_tmp/clip.aiff" "$words"
  fi
  afconvert -f m4af -d aac -b 48000 "$task_voice_tmp/clip.aiff" "$root/voice/$key.m4a"
done < "$root/tools/journey-voice.tsv"
