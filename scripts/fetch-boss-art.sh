#!/usr/bin/env bash
set -euo pipefail

# Fetch genuine normalized Terraria bestiary/NPC images for every vanilla boss
# represented by Calamity Codex. The immutable mirror revision matches the
# source already used by scripts/fetch-lexicon-art.sh.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/calamity-codex/assets/boss-sprites/vanilla}"
REPO="Live-yan/terraviewer-images"
REF="d8b7a655e210fe377186a083635733ece85c3594"
mkdir -p "$OUT"
command -v gh >/dev/null 2>&1 || { echo "gh is required" >&2; exit 1; }
command -v identify >/dev/null 2>&1 || { echo "ImageMagick identify is required" >&2; exit 1; }
command -v convert >/dev/null 2>&1 || { echo "ImageMagick convert is required" >&2; exit 1; }

fetch_npc() {
  local id="$1" name="$2"
  printf 'Fetching Terraria NPC %s -> %s.png\n' "$id" "$name"
  gh api "repos/$REPO/contents/bestiary/npc_${id}.png?ref=$REF" --jq .content \
    | tr -d '\n' | base64 -d > "$OUT/$name.png"
  identify "$OUT/$name.png" >/dev/null
}

while read -r id name; do
  fetch_npc "$id" "$name"
done <<'NPCS'
50 king-slime
4 eye-of-cthulhu
13 eater-of-worlds
266 brain-of-cthulhu
222 queen-bee
35 skeletron
113 wall-of-flesh
657 queen-slime
125 retinazer
126 spazmatism
134 destroyer
127 skeletron-prime
262 plantera
245 golem
370 duke-fishron
636 empress-of-light
551 betsy
439 lunatic-cultist
398 moon-lord
668 deerclops
NPCS

# The Twins are one encounter. Join their two genuine bestiary sprites without
# redrawing or altering either source image.
convert -background none -gravity center "$OUT/retinazer.png" "$OUT/spazmatism.png" \
  +append +repage -define png:exclude-chunks=date,time "$OUT/twins.png"
rm "$OUT/retinazer.png" "$OUT/spazmatism.png"

printf 'Fetched %s genuine vanilla boss images in %s\n' \
  "$(find "$OUT" -maxdepth 1 -name '*.png' | wc -l)" "$OUT"
