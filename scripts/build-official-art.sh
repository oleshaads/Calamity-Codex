#!/usr/bin/env bash
set -euo pipefail

# Rebuilds the decorative image set of the site:
#   1. Section mastheads (headers/*.webp), the home crest and emblem.webp are
#      crops of the committed user-supplied theme art with genuine local game
#      sprites composited on top (ImageMagick only, fully reproducible).
#   2. When a checkout of the official Calamity repo is provided, the four
#      in-game biome scenes (sunken sea, sulphurous sea, astral surface,
#      planetoid sky) are rebuilt from the pinned official parallax layers.
# The authored biome illustrations (abyss, jungle, hallow, evil-island) are
# static assets; their provenance is documented in assets/PROVENANCE.md.
#
# Usage: ./scripts/build-official-art.sh [/path/to/CalamityModPublic] [out-dir]
SOURCE_REPO="${1:-}"
OUT="${2:-calamity-codex/assets}"
CALAMITY_REF="1a8cebd27ec5615316b78f71973446b5528d2b78"
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

# ---------------------------------------------------------------------------
# Official in-game biome scenes from the pinned Calamity checkout.
# ---------------------------------------------------------------------------
if [ -n "$SOURCE_REPO" ]; then
  if source_ref="$(git -C "$SOURCE_REPO" rev-parse HEAD 2>/dev/null)"; then
    test "$source_ref" = "$CALAMITY_REF" || {
      echo "Official source checkout must be pinned to $CALAMITY_REF (got $source_ref)" >&2
      exit 1
    }
  else
    echo "Cannot verify source revision: $SOURCE_REPO is not a Git checkout" >&2
    exit 1
  fi

  required=(
    Skies/AstralSky.png Skies/SulphurSeaSky.png Skies/SulphurSeaSkyFront.png
    Skies/SulphurSeaSurface.png Backgrounds/SulphurSeaSurfaceClose.png
    Backgrounds/SunkenSeaShoresBG0.png Backgrounds/SunkenSeaShoresBG1.png
    Backgrounds/SunkenSeaShoresBG2.png Backgrounds/SunkenSeaShoresBG3.png
    Backgrounds/SunkenSeaShoresBG4.png Backgrounds/AstralSurfaceHorizon.png
    Backgrounds/AstralSurfaceFar.png Backgrounds/AstralSurfaceMiddle.png
    Backgrounds/AstralSurfaceMiddleGlow.png Backgrounds/AstralSurfaceClose.png
    Backgrounds/AstralSurfaceCloseGlow.png Backgrounds/AstralSurfaceFront.png
    Backgrounds/AstralSurfaceFrontGlow.png
  )
  for file in "${required[@]}"; do
    test -f "$SOURCE_REPO/$file" || { echo "Missing official source asset: $file" >&2; exit 1; }
  done

  stack() { # stack <canvas> <layer...> — Lanczos-resize layers to canvas width, anchor south
    local canvas="$1"; shift
    for layer in "$@"; do
      convert "$SOURCE_REPO/$layer" -filter Lanczos -resize 1376x "$TMP/layer.png"
      composite -gravity south "$TMP/layer.png" "$canvas" "$TMP/next.png"
      mv "$TMP/next.png" "$canvas"
    done
  }

  # Sunken Sea: sky gradient strip + terrain layers.
  convert "$SOURCE_REPO/Backgrounds/SunkenSeaShoresBG4.png" -resize 1376x768! "$TMP/sun.png"
  stack "$TMP/sun.png" Backgrounds/SunkenSeaShoresBG3.png Backgrounds/SunkenSeaShoresBG2.png \
        Backgrounds/SunkenSeaShoresBG1.png Backgrounds/SunkenSeaShoresBG0.png
  convert "$TMP/sun.png" -quality 91 "$OUT/themes/sunken-sea.jpg"

  # Sulphurous Sea: sky + sky front + water surface + close surface.
  convert "$SOURCE_REPO/Skies/SulphurSeaSky.png" -resize 1376x768! "$TMP/sul.png"
  stack "$TMP/sul.png" Skies/SulphurSeaSkyFront.png Skies/SulphurSeaSurface.png \
        Backgrounds/SulphurSeaSurfaceClose.png
  convert "$TMP/sul.png" -quality 91 "$OUT/themes/sulphur.jpg"

  # Astral Infection: astral sky + the official surface layer stack.
  convert "$SOURCE_REPO/Skies/AstralSky.png" -filter Lanczos -resize 1376x768^ \
    -gravity center -crop 1376x768+0+0 +repage "$TMP/ast.png"
  stack "$TMP/ast.png" Backgrounds/AstralSurfaceHorizon.png Backgrounds/AstralSurfaceFar.png \
        Backgrounds/AstralSurfaceMiddle.png Backgrounds/AstralSurfaceMiddleGlow.png \
        Backgrounds/AstralSurfaceClose.png Backgrounds/AstralSurfaceCloseGlow.png \
        Backgrounds/AstralSurfaceFront.png Backgrounds/AstralSurfaceFrontGlow.png
  convert "$TMP/ast.png" -quality 91 "$OUT/themes/astral.jpg"

  # Planetoids: the plain astral star sky.
  convert "$SOURCE_REPO/Skies/AstralSky.png" -filter Lanczos -resize 1376x768^ \
    -gravity center -crop 1376x768+0+0 +repage -quality 91 "$OUT/themes/sky.jpg"
fi

printf 'Rebuilt decorative artwork in %s\n' "$OUT"
