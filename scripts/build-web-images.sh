#!/usr/bin/env bash
set -euo pipefail

# Build the browser-facing WebP copies while preserving author JPG masters.
# Usage: ./scripts/build-web-images.sh [asset-directory]
ROOT="${1:-calamity-codex/assets}"
command -v convert >/dev/null 2>&1 || { echo "ImageMagick convert is required" >&2; exit 1; }

convert "$ROOT/favicon.png" +repage -filter point -resize 192x192 -strip "$ROOT/icon-192.png"
convert "$ROOT/favicon.png" +repage -filter point -resize 512x512 -strip "$ROOT/icon-512.png"
convert "$ROOT/hero.jpg" -quality 82 "$ROOT/hero.webp"
for source in "$ROOT"/themes/*.jpg; do
  convert "$source" -quality 82 "${source%.jpg}.webp"
done

printf 'Built PWA icons, hero.webp and %s optimized theme WebP files in %s\n' "$(find "$ROOT/themes" -maxdepth 1 -name '*.webp' | wc -l)" "$ROOT"
