#!/usr/bin/env bash
set -euo pipefail

# Rebuild every large decorative image from official Calamity Mod game assets.
# No generated illustration is used. The source checkout should be pinned to the
# SHA documented in README.md before this script is run.
SOURCE_REPO="${1:-/tmp/CalamityModPublic}"
OUT="${2:-calamity-codex/assets}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ITEMS="$ROOT/calamity-codex/assets/item-sprites"
BOSSES="$ROOT/calamity-codex/assets/boss-sprites"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for file in \
  MainMenu/ClassicMenuBackground.png MainMenu/ModernMenuBackground.png MainMenu/Logo.png \
  Skies/AstralSky.png Skies/CalamitasBackground.png Skies/SulphurSeaSkyFront.png \
  Backgrounds/SunkenSeaShoresBG0.png Backgrounds/SunkenSeaShoresBG1.png Backgrounds/SunkenSeaShoresBG2.png; do
  test -f "$SOURCE_REPO/$file" || { echo "Missing official source asset: $file" >&2; exit 1; }
done

mkdir -p "$OUT/headers" "$OUT/themes"

crop_scene() {
  local input="$1" output="$2" width="$3" height="$4" gravity="${5:-center}"
  convert "$input" -filter Lanczos -resize "${width}x${height}^" \
    -gravity "$gravity" -crop "${width}x${height}+0+0" +repage -quality 90 "$output"
}

# Official menu/sky crops used as page backgrounds.
crop_scene "$SOURCE_REPO/MainMenu/ClassicMenuBackground.png" "$OUT/hero.jpg" 1920 1080 center
crop_scene "$SOURCE_REPO/MainMenu/ClassicMenuBackground.png" "$OUT/novice.jpg" 1400 800 west
crop_scene "$SOURCE_REPO/Skies/AstralSky.png" "$OUT/veteran.jpg" 1400 800 center

crop_scene "$SOURCE_REPO/MainMenu/ClassicMenuBackground.png" "$OUT/themes/forest.jpg" 1600 900 west
crop_scene "$SOURCE_REPO/MainMenu/ClassicMenuBackground.png" "$OUT/themes/wulfrum.jpg" 1600 900 east
crop_scene "$SOURCE_REPO/Skies/SulphurSeaSkyFront.png" "$OUT/themes/sea.jpg" 1600 900 center
crop_scene "$SOURCE_REPO/Skies/CalamitasBackground.png" "$OUT/themes/brimstone.jpg" 1600 900 center
crop_scene "$SOURCE_REPO/Skies/CalamitasBackground.png" "$OUT/themes/hell.jpg" 1600 900 south
crop_scene "$SOURCE_REPO/Skies/AstralSky.png" "$OUT/themes/desert.jpg" 1600 900 west
crop_scene "$SOURCE_REPO/Skies/AstralSky.png" "$OUT/themes/ice.jpg" 1600 900 east
crop_scene "$SOURCE_REPO/MainMenu/ModernMenuBackground.png" "$OUT/themes/evil.jpg" 1600 900 center

# Compose the three official Sunken Sea parallax layers over their own BG0
# base. This is a faithful static composition of in-game layers, not synthetic art.
crop_scene "$SOURCE_REPO/Backgrounds/SunkenSeaShoresBG0.png" "$TMP/sunken-base.png" 1600 900 center
for layer in SunkenSeaShoresBG1 SunkenSeaShoresBG2; do
  crop_scene "$SOURCE_REPO/Backgrounds/${layer}.png" "$TMP/${layer}.png" 1600 900 center
  composite -gravity center "$TMP/${layer}.png" "$TMP/sunken-base.png" "$TMP/sunken-next.png"
  mv "$TMP/sunken-next.png" "$TMP/sunken-base.png"
done
convert "$TMP/sunken-base.png" -background '#090d18' -alpha background -alpha off -quality 90 "$OUT/themes/mushroom.jpg"
cp "$OUT/themes/mushroom.jpg" "$OUT/themes/dungeon.jpg"

# The official logo is retained as a transparent source image. The favicon is
# the logo's own crest, cropped rather than redrawn.
convert "$SOURCE_REPO/MainMenu/Logo.png" -filter point -resize 680x238 \
  -gravity center -background none -extent 704x384 \
  -define png:exclude-chunks=date,time "$OUT/emblem.png"
convert "$OUT/emblem.png" -quality 94 "$OUT/emblem.webp"
convert "$SOURCE_REPO/MainMenu/Logo.png" -crop 155x186+0+0 +repage -trim \
  -filter point -resize 116x116 -gravity center -background none -extent 128x128 \
  -define png:exclude-chunks=date,time "$OUT/favicon.png"

# Section mastheads start as direct crops from official scene art.
crop_scene "$SOURCE_REPO/MainMenu/ClassicMenuBackground.png" "$OUT/headers/items.webp" 1800 600 center
crop_scene "$SOURCE_REPO/Skies/CalamitasBackground.png" "$OUT/headers/bosses.webp" 1800 600 center
crop_scene "$SOURCE_REPO/MainMenu/ClassicMenuBackground.png" "$OUT/headers/wiki.webp" 1800 600 east
crop_scene "$SOURCE_REPO/Skies/AstralSky.png" "$OUT/headers/favorites.webp" 1800 600 center
crop_scene "$TMP/sunken-base.png" "$OUT/headers/lex.webp" 1800 600 center
crop_scene "$SOURCE_REPO/MainMenu/ClassicMenuBackground.png" "$OUT/headers/crafts.webp" 1800 600 west
crop_scene "$SOURCE_REPO/Skies/AstralSky.png" "$OUT/headers/biomes.webp" 1800 600 west

# Add only genuine local game sprites to a few mastheads. Enlarging with point
# sampling preserves the original Terraria pixel grid.
place_sprite() {
  local canvas="$1" sprite="$2" size="$3" x="$4" y="$5"
  test -f "$sprite" || return 0
  convert "$sprite" -filter point -resize "$size" "$TMP/sprite.png"
  composite -geometry "+${x}+${y}" "$TMP/sprite.png" "$canvas" "$TMP/canvas.webp"
  mv "$TMP/canvas.webp" "$canvas"
}
place_sprite "$OUT/headers/items.webp" "$ITEMS/ArkoftheCosmos.png" 330x330 1320 110
place_sprite "$OUT/headers/bosses.webp" "$BOSSES/supreme-calamitas.png" 260x260 1380 170
place_sprite "$OUT/headers/bosses.webp" "$BOSSES/exo-mechs.png" 190x190 1160 245
place_sprite "$OUT/headers/wiki.webp" "$ITEMS/LoreCalamitas.png" 240x240 1390 185
place_sprite "$OUT/headers/crafts.webp" "$ITEMS/DraedonsForge.png" 430x250 1240 210

printf 'Rebuilt official artwork in %s\n' "$OUT"
