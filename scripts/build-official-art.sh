#!/usr/bin/env bash
set -euo pipefail

# Rebuild every large decorative image from official Calamity Mod game assets.
# The output is made only from pinned game backgrounds, UI textures and sprites;
# no generated illustration or substitute item art is used.
SOURCE_REPO="${1:-/tmp/CalamityModPublic}"
OUT="${2:-calamity-codex/assets}"
CALAMITY_REF="1a8cebd27ec5615316b78f71973446b5528d2b78"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ITEMS="$ROOT/calamity-codex/assets/item-sprites"
BOSSES="$ROOT/calamity-codex/assets/boss-sprites"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

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
  MainMenu/ClassicMenuBackground.png MainMenu/ModernMenuBackground.png MainMenu/Logo.png
  Skies/AstralSky.png Skies/CalamitasBackground.png Skies/SulphurSeaSky.png
  Skies/SulphurSeaSkyFront.png Skies/SulphurSeaSurface.png
  Backgrounds/AstralSurfaceHorizon.png Backgrounds/AstralSurfaceFar.png
  Backgrounds/AstralSurfaceMiddle.png Backgrounds/AstralSurfaceMiddleGlow.png
  Backgrounds/AstralSurfaceClose.png Backgrounds/AstralSurfaceCloseGlow.png
  Backgrounds/AstralSurfaceFront.png Backgrounds/AstralSurfaceFrontGlow.png
  Backgrounds/SulphurSeaSurfaceClose.png Backgrounds/BasaltGullyBG.png
  Backgrounds/SunkenSeaShoresBG0.png Backgrounds/SunkenSeaShoresBG1.png
  Backgrounds/SunkenSeaShoresBG2.png Backgrounds/SunkenSeaShoresBG3.png
  Backgrounds/SunkenSeaShoresBG4.png Backgrounds/SunkenSeaBurrowsBG0.png
  Backgrounds/SunkenSeaBurrowsBG1.png Backgrounds/SunkenSeaBurrowsBG2.png
  Backgrounds/SunkenSeaBurrowsBG3.png Backgrounds/SunkenSeaBurrowsBG4.png
  Backgrounds/MapBackgrounds/AbyssBGLayer1.png
)
for file in "${required[@]}"; do
  test -f "$SOURCE_REPO/$file" || { echo "Missing official source asset: $file" >&2; exit 1; }
done

mkdir -p "$OUT/headers" "$OUT/themes"

crop_scene() {
  local input="$1" output="$2" width="$3" height="$4" gravity="${5:-center}"
  convert "$input" -filter Lanczos -resize "${width}x${height}^" \
    -gravity "$gravity" -crop "${width}x${height}+0+0" +repage \
    -background '#080c14' -alpha background -alpha off -quality 91 "$output"
}

# Build the same parallax stacks the mod draws in game, flattened into static
# interface scenes. Layer order follows the official background style classes.
build_astral() {
  local canvas="$TMP/scene-astral.png"
  crop_scene "$SOURCE_REPO/Skies/AstralSky.png" "$canvas" 1920 1080 center
  local layer
  for layer in AstralSurfaceHorizon AstralSurfaceFar AstralSurfaceMiddle AstralSurfaceMiddleGlow \
               AstralSurfaceClose AstralSurfaceCloseGlow AstralSurfaceFront AstralSurfaceFrontGlow; do
    convert "$SOURCE_REPO/Backgrounds/$layer.png" -filter Lanczos -resize 1920x "$TMP/layer.png"
    composite -gravity south "$TMP/layer.png" "$canvas" "$TMP/next.png"
    mv "$TMP/next.png" "$canvas"
  done
}

build_sulphur() {
  local canvas="$TMP/scene-sulphur.png"
  convert "$SOURCE_REPO/Skies/SulphurSeaSky.png" -filter point -resize 1920x1080! "$canvas"
  local path
  for path in Skies/SulphurSeaSkyFront.png Skies/SulphurSeaSurface.png Backgrounds/SulphurSeaSurfaceClose.png; do
    convert "$SOURCE_REPO/$path" -filter Lanczos -resize 1920x "$TMP/layer.png"
    composite -gravity south "$TMP/layer.png" "$canvas" "$TMP/next.png"
    mv "$TMP/next.png" "$canvas"
  done
}

build_sunken() {
  local variant="$1" canvas="$TMP/scene-sunken-${1,,}.png"
  convert "$SOURCE_REPO/Backgrounds/SunkenSea${variant}BG4.png" -filter point -resize 1920x1080! "$canvas"
  local n
  for n in 0 1 2 3; do
    convert "$SOURCE_REPO/Backgrounds/SunkenSea${variant}BG$n.png" -filter Lanczos -resize 1920x "$TMP/layer.png"
    composite -gravity center "$TMP/layer.png" "$canvas" "$TMP/next.png"
    mv "$TMP/next.png" "$canvas"
  done
}

build_astral
build_sulphur
build_sunken Shores
build_sunken Burrows
convert "$SOURCE_REPO/Backgrounds/BasaltGullyBG.png" -filter point -resize 1920x1152! \
  -gravity center -crop 1920x1080+0+0 +repage "$TMP/scene-basalt.png"
convert "$SOURCE_REPO/Backgrounds/MapBackgrounds/AbyssBGLayer1.png" -filter point \
  -resize 1920x1080! "$TMP/scene-abyss.png"
crop_scene "$SOURCE_REPO/MainMenu/ClassicMenuBackground.png" "$TMP/scene-classic.png" 1920 1080 center
convert "$SOURCE_REPO/MainMenu/ModernMenuBackground.png" -filter point -resize 1920x1080! "$TMP/scene-modern.png"

# Home scenes are deliberately different: an astral vista for the landing page,
# a forest expedition for the first route and Calamitas for the veteran route.
crop_scene "$TMP/scene-astral.png" "$OUT/hero.jpg" 1920 1080 center
# A separate blue grotto keeps the crest visually distinct from both route cards.
crop_scene "$TMP/scene-sunken-burrows.png" "$OUT/crest.jpg" 900 1100 center
crop_scene "$TMP/scene-modern.png" "$OUT/novice.jpg" 1400 800 center
crop_scene "$TMP/scene-classic.png" "$OUT/veteran.jpg" 1400 800 center

# Route washes. They remain subtle behind content, but each now has a readable
# landmark instead of reusing an empty gradient across unrelated sections.
crop_scene "$TMP/scene-modern.png" "$OUT/themes/forest.jpg" 1600 900 center
crop_scene "$TMP/scene-basalt.png" "$OUT/themes/wulfrum.jpg" 1600 900 center
crop_scene "$TMP/scene-sulphur.png" "$OUT/themes/sea.jpg" 1600 900 center
crop_scene "$SOURCE_REPO/Skies/CalamitasBackground.png" "$OUT/themes/brimstone.jpg" 1600 900 center
crop_scene "$TMP/scene-basalt.png" "$OUT/themes/hell.jpg" 1600 900 center
crop_scene "$TMP/scene-astral.png" "$OUT/themes/desert.jpg" 1600 900 center
crop_scene "$SOURCE_REPO/Skies/AstralSky.png" "$OUT/themes/ice.jpg" 1600 900 center
crop_scene "$TMP/scene-modern.png" "$OUT/themes/evil.jpg" 1600 900 center
crop_scene "$TMP/scene-sunken-burrows.png" "$OUT/themes/mushroom.jpg" 1600 900 center
crop_scene "$TMP/scene-abyss.png" "$OUT/themes/dungeon.jpg" 1600 900 center

# Keep the official logo intact. The home crest displays this transparent image
# above its own scene; the favicon is a direct crop of the logo's genuine crest.
convert "$SOURCE_REPO/MainMenu/Logo.png" -filter point -resize 680x238 \
  -gravity center -background none -extent 704x384 \
  -define png:exclude-chunks=date,time "$OUT/emblem.png"
convert "$OUT/emblem.png" -quality 94 "$OUT/emblem.webp"
convert "$SOURCE_REPO/MainMenu/Logo.png" -crop 155x186+0+0 +repage -trim \
  -filter point -resize 116x116 -gravity center -background none -extent 128x128 \
  -define png:exclude-chunks=date,time "$OUT/favicon.png"

# Every main route receives a different official game scene.
crop_scene "$TMP/scene-astral.png" "$OUT/headers/items.webp" 1800 600 center
crop_scene "$TMP/scene-classic.png" "$OUT/headers/bosses.webp" 1800 600 center
crop_scene "$TMP/scene-sunken-burrows.png" "$OUT/headers/wiki.webp" 1800 600 center
crop_scene "$TMP/scene-abyss.png" "$OUT/headers/favorites.webp" 1800 600 center
crop_scene "$TMP/scene-sunken-shores.png" "$OUT/headers/lex.webp" 1800 600 center
crop_scene "$TMP/scene-basalt.png" "$OUT/headers/crafts.webp" 1800 600 center

# The atlas masthead is a compact panorama of four real in-game environments.
for spec in "astral:$TMP/scene-astral.png" "sunken:$TMP/scene-sunken-burrows.png" \
            "basalt:$TMP/scene-basalt.png" "abyss:$TMP/scene-abyss.png"; do
  name="${spec%%:*}"; path="${spec#*:}"
  crop_scene "$path" "$TMP/atlas-$name.png" 450 600 center
done
convert "$TMP/atlas-astral.png" "$TMP/atlas-sunken.png" "$TMP/atlas-basalt.png" "$TMP/atlas-abyss.png" \
  +append -quality 91 "$OUT/headers/biomes.webp"

# Add only genuine local game textures. Point sampling keeps the Terraria pixel
# grid; the soft shadow is interface treatment and never changes the sprite.
place_sprite() {
  local canvas="$1" sprite="$2" size="$3" x="$4" y="$5"
  test -f "$sprite" || { echo "Missing local official sprite: $sprite" >&2; exit 1; }
  convert "$sprite" -filter point -resize "$size" "$TMP/sprite-raw.png"
  convert "$TMP/sprite-raw.png" \( +clone -background '#02040a' -shadow 72x9+11+14 \) \
    +swap -background none -layers merge +repage "$TMP/sprite.png"
  composite -geometry "+${x}+${y}" "$TMP/sprite.png" "$canvas" "$TMP/canvas.webp"
  mv "$TMP/canvas.webp" "$canvas"
}
place_sprite "$OUT/headers/items.webp" "$ITEMS/ArkoftheCosmos.png" 390x390 1280 72
place_sprite "$OUT/headers/bosses.webp" "$BOSSES/supreme-calamitas.png" 380x380 1325 76
place_sprite "$OUT/headers/bosses.webp" "$BOSSES/exo-mechs.png" 245x245 1110 230
place_sprite "$OUT/headers/wiki.webp" "$ITEMS/LoreCalamitas.png" 330x330 1370 155
place_sprite "$OUT/headers/favorites.webp" "$ITEMS/CoreofCalamity.png" 280x280 1380 165
place_sprite "$OUT/headers/lex.webp" "$ITEMS/EncryptedSchematicSunkenSea.png" 340x340 1340 150
place_sprite "$OUT/headers/crafts.webp" "$ITEMS/DraedonsForge.png" 500x310 1200 185

printf 'Rebuilt distinct official artwork in %s\n' "$OUT"
