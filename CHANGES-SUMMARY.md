# Calamity Codex — Changes Summary

## Branch: `arena/01a0330d-calamity-codex`

### 1. Easter Egg on Logo ✅
**Files modified:** `js/app.js`, `css/modern.css`

- **JS:** Added click handler on `.rail-brand` that tracks 10+ clicks within 10 seconds
- On trigger: spawns 28 floating heart emoji animations + shows love message overlay "Катя, я люблю тебя. @Твой муж"
- Auto-cleans after 6 seconds
- **CSS:** Added `.easter-hearts`, `.easter-heart`, `.easter-message` with float-up animation and fade-in message overlay

### 2. Quest Button Fix ✅
**Files modified:** `css/modern.css`

- Changed `.journey-mini` from `border-left: 1px solid` separator to proper rounded button with `border: 1px solid #33404c; border-radius: 9px`
- Added symmetric padding (`6px 14px`)
- Added hover state with gold border glow
- Changed progress bar from HP-red to gold gradient (`#8f6b2b → #e8c46f`)
- Improved bar border-radius to `5px` for modern look
- Removed redundant premier-layer overrides

### 3. Reverse Craft Cover Image ✅
**Files modified:** `js/app.js`, `assets/headers/reverse.webp` (new)

- Generated unique cover image for reverse craft section (dark fantasy mirror portal with golden runes)
- Changed `SECTION_THEMES.reverse.cover` from `"assets/headers/crafts.webp"` to `"assets/headers/reverse.webp"`

### 4. Term Highlighting ✅
**Files modified:** `js/app.js`, `css/modern.css`

- **CSS:** Added `.term-hl` class with gold color, dotted underline, hover highlight
- **JS:** Added `buildTermPattern()` function that builds regex from CODEX items/bosses/biomes Russian names
- **JS:** Added `highlightNoviceTerms(root)` function that walks text nodes in novice path content and wraps matching gaming terms in `<span class="term-hl">` with tooltip showing term type
- Integrated into `renderNovice()` — runs after `bindSprites(app)`

### 5. Novice Path Overhaul ✅
**Files modified:** `js/app.js`

- Enhanced `renderNoviceMap()` introduction text with clearer beginner guidance
- Added bold emphasis on key actions: "куда идти", "что собрать", "что скрафтить", "кого победить"
- Added conditional beginner tip for first-time users (when no quests completed)
- Tip suggests choosing a class first with explanation that it can be changed later

### 6. Build & Verification ✅
- Ran `npm install` and `node scripts/build-runtime.mjs` successfully
- All changes compiled into minified bundles:
  - `css/modern.min.css`: 279.0 KiB raw, 52.4 KiB gzip
  - `js/codex.min.js`: 837.9 KiB raw, 239.3 KiB gzip
- Verified all key features present in compiled output
- Dev server running on port 3000

### Files Changed
| File | Status | Description |
|------|--------|-------------|
| `calamity-codex/js/app.js` | Modified | Easter egg JS, term highlighting, reverse cover ref, novice intro |
| `calamity-codex/css/modern.css` | Modified | Easter egg CSS, term highlight CSS, quest button fix |
| `calamity-codex/assets/headers/reverse.webp` | New | Unique cover for reverse craft section |
| `calamity-codex/css/modern.min.css` | Rebuilt | Compiled CSS |
| `calamity-codex/js/codex.min.js` | Rebuilt | Compiled JS |
| `calamity-codex/assets/sprite-manifest.json` | Auto-updated | Added reverse.webp to manifest |
