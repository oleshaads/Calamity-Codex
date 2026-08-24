#!/usr/bin/env bash
set -euo pipefail

# Fetch the small set of genuine game textures used by dictionary cards.
# The sources and immutable revisions are also documented in assets/PROVENANCE.md.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/calamity-codex/assets/lex}"
CALAMITY_REPO="CalamityTeam/CalamityModPublic"
CALAMITY_REF="1a8cebd27ec5615316b78f71973446b5528d2b78"
VANILLA_REPO="Live-yan/terraviewer-images"
VANILLA_REF="d8b7a655e210fe377186a083635733ece85c3594"
TOOLS_REPO="64mb/terraria-web-book"
TOOLS_REF="a825a5d87d18c63c22a461265b2d9188579b204f"
mkdir -p "$OUT/vanilla" "$OUT/calamity"

fetch_asset() {
  local repo="$1" ref="$2" remote="$3" output="$4"
  printf 'Fetching %s/%s\n' "$repo" "$remote"
  gh api "repos/$repo/contents/$remote?ref=$ref" --jq .content \
    | tr -d '\n' | base64 -d > "$output"
  identify "$output" >/dev/null
}

# Vanilla Terraria item and normalized bestiary textures. Item IDs follow the
# game's own Content/Images numbering and filenames remain explicit for audit.
while read -r id name; do
  fetch_asset "$VANILLA_REPO" "$VANILLA_REF" "items/item_${id}.png" "$OUT/vanilla/$name.png"
done <<'ITEMS'
5 mushroom
27 acorn
35 iron-anvil
53 cloud-in-a-bottle
54 hermes-boots
75 fallen-star
98 minishark
109 mana-crystal
134 blue-dungeon-brick
169 sand-block
174 hellstone
221 hellforge
273 nights-edge
275 coral
331 jungle-spores
398 tinkerers-workshop
409 pearlstone-block
502 crystal-shard
525 mythril-anvil
593 snow-block
664 ice-block
947 chlorophyte-ore
1291 life-fruit
2625 seashell
3549 ancient-manipulator
ITEMS

while read -r id name; do
  fetch_asset "$VANILLA_REPO" "$VANILLA_REF" "bestiary/npc_${id}.png" "$OUT/vanilla/$name.png"
done <<'NPCS'
22 guide
124 mechanic
439 lunatic-cultist
668 deerclops
NPCS

# The Demon Altar is a tile rather than an inventory item, so use its exact
# extracted in-game station texture from the pinned Terraria recipe viewer.
fetch_asset "$TOOLS_REPO" "$TOOLS_REF" "assets/terraria/tool/demon_altar.png" "$OUT/vanilla/demon-altar.png"

# Item 75 is an animation strip. A single unmodified game frame is the correct
# compact representation for the dictionary card.
convert "$OUT/vanilla/fallen-star.png" -crop 22x26+0+0 +repage \
  -define png:exclude-chunks=date,time "$OUT/vanilla/fallen-star-frame.png"
mv "$OUT/vanilla/fallen-star-frame.png" "$OUT/vanilla/fallen-star.png"

# Calamity UI/biome/NPC textures are fetched from the official public mod repo.
while IFS=$'\t' read -r remote name; do
  fetch_asset "$CALAMITY_REPO" "$CALAMITY_REF" "$remote" "$OUT/calamity/$name.png"
done <<'CALAMITY'
BiomeManagers/LaboratoryIcon.png	laboratory-icon
Buffs/StatBuffs/AdrenalineMode.png	adrenaline
Buffs/StatBuffs/RageMode.png	rage
NPCs/TownNPCs/Archmage_Head.png	archmage
NPCs/TownNPCs/Bandit_Head.png	bandit
NPCs/TownNPCs/BrimstoneWitch_Head.png	brimstone-witch
NPCs/TownNPCs/SeaKing_Head.png	sea-king
CALAMITY

printf 'Fetched verified lexicon art in %s\n' "$OUT"
