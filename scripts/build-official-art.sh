#!/usr/bin/env bash
set -euo pipefail

# Rebuilds the decorative interface compositions of the site:
#   - section mastheads (headers/*.webp): one distinct theme per route with
#     genuine local game sprites composited on top;
#   - the home crest (crest.jpg): portrait crop of the sunken-sea scene;
#   - emblem.webp: webp copy of the committed logo image.
# All biome scenes (themes/*.jpg) are static authored illustrations whose
# provenance is documented in assets/PROVENANCE.md; this script does not
# overwrite them.
#
# Usage: ./scripts/build-official-art.sh [out-dir]
OUT="${1:-calamity-codex/assets}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for tool in convert composite identify; do
  command -v "$tool" >/dev/null || { echo "Missing ImageMagick tool: $tool" >&2; exit 1; }
done

mkdir -p "$OUT/headers" "$OUT/themes"

# ---------------------------------------------------------------------------
# Section mastheads: one distinct restored theme per route, 1800x600, with a
# real in-game sprite composited for flavor. The biomes masthead stays a
# single clean scene (no multi-scene collage).
# ---------------------------------------------------------------------------
header() {
  local theme="$1" name="$2"
  convert "$OUT/themes/$theme.jpg" -filter Lanczos -resize 1800x600^ \
    -gravity center -crop 1800x600+0+0 +repage -quality 91 "$OUT/headers/$name.webp"
}
header mushroom wiki
header brimstone bosses
header desert items
header dungeon favorites
header sea lex
header hell crafts
header forest biomes

place_sprite() {
  local canvas="$1" sprite="$2" size="$3" x="$4" y="$5"
  test -f "$sprite" || { echo "Missing local official sprite: $sprite" >&2; exit 1; }
  convert "$sprite" -filter point -resize "$size" "$TMP/sprite-raw.png"
  convert "$TMP/sprite-raw.png" \( +clone -background '#02040a' -shadow 72x9+11+14 \) \
    +swap -background none -layers merge +repage "$TMP/sprite.png"
  composite -geometry "+${x}+${y}" "$TMP/sprite.png" "$canvas" "$TMP/canvas.webp"
  mv "$TMP/canvas.webp" "$canvas"
}
place_sprite "$OUT/headers/items.webp" "$OUT/item-sprites/ArkoftheCosmos.png" 390x390 1280 72
place_sprite "$OUT/headers/bosses.webp" "$OUT/boss-sprites/supreme-calamitas.png" 380x380 1325 76
place_sprite "$OUT/headers/bosses.webp" "$OUT/boss-sprites/exo-mechs.png" 245x245 1110 230
place_sprite "$OUT/headers/wiki.webp" "$OUT/item-sprites/LoreCalamitas.png" 330x330 1370 155
place_sprite "$OUT/headers/favorites.webp" "$OUT/item-sprites/CoreofCalamity.png" 280x280 1380 165
place_sprite "$OUT/headers/lex.webp" "$OUT/sprites/EncryptedSchematicSunkenSea.png" 340x340 1340 150
place_sprite "$OUT/headers/crafts.webp" "$OUT/item-sprites/DraedonsForge.png" 500x310 1200 185

# Home crest: portrait crop of the official sunken-sea scene.
convert "$OUT/themes/sunken-sea.jpg" -filter Lanczos -resize 900x1100^ \
  -gravity center -crop 900x1100+0+0 +repage -quality 91 "$OUT/crest.jpg"

# WebP copy of the committed logo image.
convert "$OUT/emblem.png" -quality 94 "$OUT/emblem.webp"

printf 'Rebuilt decorative artwork in %s\n' "$OUT"
