#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "js/catalog.js"), "utf8"), context);
const index = context.window.CALAMITY_ITEM_INDEX;
const items = index?.items || [];
const compactCatalog = index?.format === 2;
const catalogDescription = (item) => compactCatalog ? item[5] : item[7];
const ruNamesPath = path.join(root, "js/ru-names.js");
check(fs.existsSync(ruNamesPath), "Russian catalog name layer is missing");
const ruNamesSource = fs.readFileSync(ruNamesPath, "utf8");
check(ruNamesSource.includes('calamity: "Каламити"') && ruNamesSource.includes('terminus: "Терминус"') && ruNamesSource.includes('hp: "ОЗ"'), "Common English description terms are missing Russian mappings");
check(ruNamesSource.includes("phraseMatcher") && !ruNamesSource.includes("const phraseKeys = Object.keys(PHRASES)"), "Catalog name translation still recompiles phrase expressions per item");
vm.runInContext(ruNamesSource, context, { filename: "js/ru-names.js" });
const russianNames = context.window.CALAMITY_RU_NAMES?.byId || {};

check(items.length === 2535, `Expected 2535 verified catalog items, got ${items.length}`);
check(items.every((item) => /[А-Яа-яЁё]/.test(russianNames[item[2]] || "")), "A public catalog record has no Russian display name");
check(index.coverage?.sprites === items.length, "Sprite coverage does not match public item count");
check(index.coverage?.russianDescriptions === items.length, "Russian description coverage is incomplete");
check(index.coverage?.omittedWithoutSprite === 38, "Unexpected localization-only omission count");
check(compactCatalog, "Calamity catalog is not using the compact v2 encoding");
check(items.every((item) => compactCatalog || item[4] === 1), "A public catalog record has no verified sprite");
check(items.every((item) => /[А-Яа-яЁё]/.test(catalogDescription(item) || "")), "A public catalog record has no Russian description");
check(items.every((item) => fs.existsSync(path.join(root, "assets/item-sprites", `${item[2]}.png`))), "A referenced item sprite is missing locally");

const spriteFiles = fs.readdirSync(path.join(root, "assets/item-sprites")).filter((name) => name.endsWith(".png"));
check(spriteFiles.length === items.length, `Expected ${items.length} item sprite files, got ${spriteFiles.length}`);

const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const runtimeSources = [
  "data.js", "extra.js", "lexicon.js", "plain.js", "plain-late.js", "polish.js", "sprites.js", "catalog.js",
  "vanilla-tree.js", "vanilla-ru.js", "npc-sources.js", "npc-ru.js", "npc-art.js", "ru-names.js", "app.js"
];
const runtimePath = path.join(root, "js/codex.min.js");
const minCssPath = path.join(root, "css/modern.min.css");
check(fs.existsSync(runtimePath) && fs.existsSync(minCssPath), "Minified runtime bundle or stylesheet is missing; run npm run build:runtime");
const runtimeBundle = fs.readFileSync(runtimePath, "utf8");
const minCss = fs.readFileSync(minCssPath, "utf8");
const runtimeSource = runtimeSources.map((name) => fs.readFileSync(path.join(root, "js", name), "utf8")).join(";\n");
const digest = (value) => crypto.createHash("sha256").update(value).digest("hex");
check(runtimeBundle.includes(`source-sha256:${digest(runtimeSource)}`), "Runtime bundle is stale; run npm run build:runtime");
check(minCss.includes(`source-sha256:${digest(fs.readFileSync(path.join(root, "css/modern.css"), "utf8"))}`), "Minified stylesheet is stale; run npm run build:runtime");
const scriptTags = [...indexHtml.matchAll(/<script\b[^>]*src="js\/[^"]+"[^>]*>/g)].map((match) => match[0]);
check(scriptTags.length === 1 && /\bdefer\b/.test(scriptTags[0]) && scriptTags[0].includes("js/codex.min.js?v=20260817-core24"), "Index must load one versioned deferred runtime bundle");
check(indexHtml.includes('rel="preload" href="js/codex.min.js?v=20260817-core24" as="script"'), "Runtime bundle is not preloaded from the document head");
check(indexHtml.includes("css/modern.min.css?v=20260817-core24"), "Index does not load the current minified stylesheet");
check(zlib.gzipSync(runtimeBundle, { level: 9 }).length < zlib.gzipSync(runtimeSource, { level: 9 }).length, "Runtime bundle does not reduce compressed transfer size");
check(indexHtml.includes("manifest.webmanifest?v=20260817-core24"), "PWA manifest is not linked with the current core version");
const manifestPath = path.join(root, "manifest.webmanifest");
const serviceWorkerPath = path.join(root, "sw.js");
check(fs.existsSync(manifestPath) && fs.existsSync(serviceWorkerPath), "PWA manifest or service worker is missing");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
check(manifest.display === "standalone" && manifest.start_url === "./#/", "PWA manifest launch settings are invalid");
check((manifest.icons || []).some((icon) => icon.sizes === "192x192") && (manifest.icons || []).some((icon) => icon.sizes === "512x512"), "PWA install icons are incomplete");
for (const icon of manifest.icons || []) check(fs.existsSync(path.join(root, icon.src)), `PWA icon is missing: ${icon.src}`);
const serviceWorker = fs.readFileSync(serviceWorkerPath, "utf8");
check(serviceWorker.includes('VERSION = "20260817-core24"') && serviceWorker.includes("networkFirstNavigation") && serviceWorker.includes("trimRuntimeCache"), "Service worker version/cache strategies are incomplete");
check(app.includes('serviceWorker.register("sw.js?v=20260817-core24"') && app.includes("syncConnectionStatus"), "App does not register the current service worker or expose connection state");
check(indexHtml.includes('id="install-app"') && app.includes("beforeinstallprompt") && app.includes("appinstalled"), "PWA install prompt UI is missing");
check(indexHtml.includes("app-boot") && indexHtml.includes('aria-busy="true"'), "Initial loading state is missing");
check(/class="mobile-tabs"[\s\S]*?data-nav="crafts"/.test(indexHtml), "Mobile navigation does not expose the craft tree");
check(!indexHtml.includes("catalog-tooltips.js"), "Tooltip search metadata must remain lazy and must not block initial page load");
const tooltipPath = path.join(root, "js/catalog-tooltips.js");
check(fs.existsSync(tooltipPath), "Lazy catalog tooltip search metadata is missing");
const tooltipContext = { window: {} };
vm.createContext(tooltipContext);
vm.runInContext(fs.readFileSync(tooltipPath, "utf8"), tooltipContext, { filename: "js/catalog-tooltips.js" });
const tooltipIndex = tooltipContext.window.CALAMITY_CATALOG_TOOLTIPS || {};
const tooltipCount = Array.isArray(tooltipIndex.tooltips) ? tooltipIndex.tooltips.filter(Boolean).length : (tooltipIndex.rows || []).length;
check(tooltipIndex.format === 2 && Array.isArray(tooltipIndex.tooltips), "Lazy tooltips are not using the compact array encoding");
check(tooltipCount === index.coverage?.tooltips, `Lazy tooltip coverage mismatch: ${tooltipCount}/${index.coverage?.tooltips || 0}`);
check(tooltipIndex.commit === index.commit, "Lazy tooltip metadata and main catalog use different source commits");
check(app.includes("ruItemName"), "Catalog cards are not using the Russian display-name layer");
check(app.includes("VANILLA_TREE_INDEX") && app.includes("VANILLA_BY_ID"), "Vanilla Terraria records are not connected to the tree");
const vanillaContext = { window: {} };
vm.createContext(vanillaContext);
vm.runInContext(fs.readFileSync(path.join(root, "js/vanilla-tree.js"), "utf8"), vanillaContext);
const vanillaIndex = vanillaContext.window.CALAMITY_VANILLA_TREE_INDEX || {};
const vanillaMissingSprites = new Set(vanillaIndex.coverage?.missingSpriteIds || []);
const vanillaItems = (vanillaIndex.items || []).map((row, index) => {
  if (vanillaIndex.format === 2) {
    const id = Number(vanillaIndex.firstItemId || 1) + index;
    return { id, name: row[0], type: vanillaIndex.types?.[row[1]] || "Item", sprite: vanillaMissingSprites.has(id) ? "" : `assets/vanilla-sprites/${id}.png` };
  }
  return { id: Number(row[0]), name: row[1], type: row[2], sprite: row[3] || "" };
});
check(vanillaItems.length >= 5000, `Expected at least 5000 vanilla Terraria items, got ${vanillaItems.length}`);
check(vanillaIndex.format === 2 && Array.isArray(vanillaIndex.types), "Vanilla tree index is not using the compact v2 encoding");
check((vanillaIndex.recipes || []).length >= 3000, `Expected at least 3000 vanilla Terraria recipes, got ${(vanillaIndex.recipes || []).length}`);
check((vanillaIndex.coverage?.sprites || 0) >= 5000, `Expected at least 5000 vanilla item sprites, got ${vanillaIndex.coverage?.sprites || 0}`);
check(fs.existsSync(path.resolve("scripts/build-vanilla-tree.mjs")), "Vanilla tree rebuild script is missing");
check(fs.existsSync(path.resolve("scripts/build-vanilla-ru.mjs")), "Vanilla Russian-name rebuild script is missing");
const vanillaRuContext = { window: {} };
vm.createContext(vanillaRuContext);
vm.runInContext(fs.readFileSync(path.join(root, "js/vanilla-ru.js"), "utf8"), vanillaRuContext, { filename: "js/vanilla-ru.js" });
const vanillaRu = vanillaRuContext.window.CALAMITY_VANILLA_RU || {};
const vanillaRuById = vanillaRu.names || vanillaRu.byId || [];
check(vanillaRu.format === 2 && Array.isArray(vanillaRu.names), "Vanilla Russian names are not using the compact array encoding");
check(vanillaRu.officialCount >= 5070, `Expected at least 5070 official vanilla Russian names, got ${vanillaRu.officialCount || 0}`);
const vanillaId = (name) => String(vanillaItems.find((item) => item.name === name)?.id || "");
check(vanillaRuById[vanillaId("Adamantite Bar")] === "Адамантитовый слиток", "Adamantite Bar is not using the official Russian name");
check(vanillaRuById[vanillaId("Adamantite Ore")] === "Адамантитовая руда", "Adamantite Ore is not using the official Russian name");
check(vanillaRuById[vanillaId("Wooden Sword")] === "Деревянный меч", "Wooden Sword is not using the official Russian name");
const namedVanillaItems = vanillaItems.filter((item) => item.name && !/^n\/a\s*\(/i.test(item.name));
const localizedVanillaItems = namedVanillaItems.filter((item) => vanillaRuById[String(item.id)]);
check(localizedVanillaItems.length === namedVanillaItems.length, `Official vanilla Russian-name coverage is incomplete: ${localizedVanillaItems.length}/${namedVanillaItems.length}`);
for (const phrase of [
  "По мере открытия соответствующей ветки Terraria / Calamity.",
  "Используется как часть прогрессии, экипировки или следующего рецепта.",
  "Подробное описание для этого предмета ещё не добавлено.",
  "Ванильный предмет Terraria; источник зависит от предмета и мира.",
  "источник — смотри в полном каталоге",
  "Скрафтить у ${vanillaRecipe.station}",
  "В локальном индексе рецепта нет",
  "рецепт для этого предмета отсутствует",
  "предмет не крафтится: добывается или находится в мире"
]) check(!app.includes(phrase), `Generic craft-tree placeholder is still rendered: ${phrase}`);
check(app.includes("let exactLexIndex = null") && app.includes("item.search.includes(q)"), "Craft/search lookup caches are missing");
check(app.includes("function ensureVanillaIndexes()") && app.includes("let vanillaIndexesReady = false") && app.includes("const itemCount = (ITEM_INDEX.items || []).length"), "Large catalog/vanilla indexes are still expanded eagerly on the home route");
check(app.includes("showSearchStart") && app.includes("rememberSearchHit") && app.includes("searchRecent"), "Global search has no recent results or quick-start actions");
check(app.includes("routeScrollPositions") && app.includes('history.scrollRestoration = "manual"') && app.includes("restoreScrollOnNextRoute"), "Back/forward navigation does not restore the previous reading position");
check((app.match(/applySectionTheme\(view\)/g) || []).length >= 7, "Section-specific background themes are not applied consistently");
check(app.includes('class="jump" data-dest=') && app.includes('class="era-no"'), "Home navigation and progression eras lack visual identities");
check(!app.includes("�"), "Application source contains a broken replacement character");
const polishSource = fs.readFileSync(path.join(root, "js/polish.js"), "utf8");
check(polishSource.includes("pairMatcher") && !polishSource.includes("pairs.forEach(([en, ru]) => {\n      const escRe"), "Russian text normalization still recompiles hundreds of expressions per field");
check(app.includes("loadCatalogTooltips") && app.includes('new URL("js/catalog-tooltips.js?'), "English tooltip metadata is not loaded lazily on search");
check(app.includes("vanillaSearchRows") && app.includes("#/crafts?item="), "Global search does not link vanilla items directly to craft trees");
check(app.includes("copyCraftTreeLink") && app.includes("data-copy-tree-link"), "Shareable craft-tree links are missing");
check(app.includes("hero-export") && app.includes("hero-import") && app.includes("store.replace"), "Hero profile backup controls are missing");
check(app.includes("bindDragPan") && app.includes('addEventListener("mousemove"') && app.includes('addEventListener("touchmove"'), "Craft trees do not support mouse/touch drag panning");
check(app.includes("pruneRecipeCycles") && app.includes("findRecipeCycles") && app.includes("VANILLA_RECIPE_CUT_IDS"), "Craft recipe cycle sanitization is missing");
check(app.includes("Получение без крафта") && app.includes("noncraft-source") && app.includes("vanillaObtain"), "Non-craftable items do not have explicit acquisition cards");
check(app.includes("catalogResource") && app.includes("forcedCatalog") && app.includes("catalog:${cat.id}"), "Not every catalog item has a unique recipe/acquisition tree entry");
check(app.includes("purposeByKind") && app.includes("completeSentence") && app.includes("desc.length < 60") && app.includes("when.length < 70"), "Short item what/where/how/when descriptions are not expanded");
check(app.includes("terraria.wiki.gg/ru/api.php") && !app.includes("terraria.wiki.gg/api.php") && app.includes("enrichWikiSource") && app.includes("WIKI_SOURCE_CACHE_KEY"), "Vanilla acquisition cards must use/cache Russian official wiki text only");
check(app.includes("STATION_DISPLAY_RU") && app.includes("stationDisplayName") && app.includes("ruText(q.mood"), "Station, item or chapter descriptions can still bypass the Russian display layer");
check(app.includes("BOSS_FACT_OVERRIDES") && app.includes("bossFactText") && app.includes("30 Фантомных духов"), "Boss cards still rely on terse unexplained progression text");
check(app.includes("npc-source-copy") && app.includes("fact source-fact"), "NPC source rows are not using the full-width wrapped layout");
check(app.includes("WORLD_SOURCE_ART") && app.includes("worldSourceChip") && app.includes("world-source-grid"), "Tile and chest sources are still text-only");
check(app.includes("INGREDIENT_NAME_ALIASES") && app.includes("VANILLA_ART_ALIASES") && app.includes("VANILLA_EXTRA_ART") && app.includes("russianAmount"), "Craft ingredient art aliases or Russian quantity parsing are incomplete");
check(app.includes("isInternalVanillaName") && app.includes("format\\s*:\\s*[a-z]"), "Broken internal vanilla records can still appear in the craft picker");
check(!app.includes("setTimeout(hideTipCard") && app.includes("function hideTipCardSoon()") && app.includes("hideTipCard();"), "Hover cards still use a delayed hide timer");
check(app.includes("tipCard.contains(e.relatedTarget)") && app.includes("let y = r.bottom;") && app.includes("y = r.top - h;"), "Cursor cannot move from an item onto its hover card without closing it");
check(app.includes("else if (cat) recipe = recipes.get(normalizeArtName(cat.name))"), "Catalog recipes can still borrow a different item's recipe through a dictionary alias");
check(indexHtml.includes("зажми ЛКМ"), "Craft-tree drag guidance is missing from the modal");
check(app.includes("IntersectionObserver") && app.includes("bindLazyBackgrounds(app)"), "Biome backgrounds are not lazy-loaded");
check(app.includes("GUIDE_PAGE_SIZE = 48") && app.includes("visible.length + pageSize"), "Guide recommendation cards are not paginated");
check(app.includes("now - lastFrameAt >= 33") && app.includes('document.addEventListener("visibilitychange", startAnimation)') && app.includes("navigator.connection?.saveData"), "Background particles are not capped, pausable and data-saver aware");
check(app.includes("Calamity Codex route failed") && app.includes("route-reload"), "Route-level error boundary is missing");
const modernCss = fs.readFileSync(path.join(root, "css/modern.css"), "utf8");
check(modernCss.includes("content-visibility: auto") && modernCss.includes("contain-intrinsic-size"), "Off-screen biome layout containment is missing");
check(modernCss.includes(".drag-pan") && modernCss.includes("cursor: grab") && modernCss.includes("touch-action: none"), "Craft-tree drag-pan styling is missing");
check(modernCss.includes(".app-boot") && modernCss.includes("repeat(5, minmax(0, 1fr))"), "Loading feedback or five-item mobile navigation styling is missing");
check(modernCss.includes("body::after") && modernCss.includes(".stage-bar::after") && modernCss.includes("@keyframes sigil-turn"), "Section atmosphere, accent line or header sigil styling is missing");
check(modernCss.includes(".hero::after") && modernCss.includes("--jump-accent") && modernCss.includes(".era-no"), "Home hero, section shortcuts or era timeline styling is missing");
check(modernCss.includes(".rail::before") && modernCss.includes(".catalog-mode.active") && modernCss.includes('.card[data-era="end"]'), "Sidebar, catalog modes or boss-era visual identities are missing");
check(modernCss.includes(".class-note.melee") && app.includes('class-note ${escAttr(cls)}'), "Class advice does not use the selected class color");
check(modernCss.includes("@keyframes quest-pan") && modernCss.includes(".step:not(:last-child)::before") && modernCss.includes(".shelf[open]"), "Quest scenes, step timeline or expanded sections lack visual hierarchy");
check(modernCss.includes(".search-hit::before") && modernCss.includes(".tree-backdrop") && modernCss.includes(".tip-card"), "Search and overlay surfaces lack visual focus treatment");
check(modernCss.includes("--card-accent") && modernCss.includes('.card:has(.card-shot[data-kind="weapon"])') && modernCss.includes(".fact > span::before"), "Item cards do not expose visual type hierarchy");
check(modernCss.includes("scroll-snap-type: x proximity") && modernCss.includes(".items-page .filter-bar") && modernCss.includes("position: sticky"), "Mobile filter rows or sticky search controls are not usable on long lists");
check(modernCss.includes(".fact.source-fact { grid-column: 1 / -1; }") && modernCss.includes(".npc-source-copy") && modernCss.includes("grid-template-columns: 28px minmax(0, 1fr)"), "Source rows can collapse into one-letter columns");
check(modernCss.includes(".world-source-chip") && modernCss.includes(".world-source-art") && modernCss.includes(".world-source-group"), "Tile/chest source imagery has no layout styling");
check(/\.tip-card\s*\{[\s\S]*?z-index:\s*150/.test(modernCss) && /\.tree-modal\s*\{[\s\S]*?z-index:\s*100/.test(modernCss), "Hover detail cards are not stacked above the craft-tree modal");
for (const relative of [
  "assets/source-sprites/abyssal-pot.png", "assets/source-sprites/sulphurous-pot.png",
  "assets/vanilla-extra/ash-wood.png", "assets/vanilla-extra/wand-of-frosting.png"
]) check(fs.existsSync(path.join(root, relative)), `Missing local craft/source sprite: ${relative}`);
const craftArtAuditPath = path.resolve("scripts/audit-craft-art.cjs");
check(fs.existsSync(craftArtAuditPath), "Full craft imagery regression audit is missing");
const packageJson = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
check(packageJson.scripts?.audit?.includes("audit-craft-art.cjs") && packageJson.devDependencies?.jsdom, "npm audit does not run the craft imagery coverage check");
const npcBuilderSource = fs.readFileSync(path.resolve("scripts/build-npc-sources.mjs"), "utf8");
check(npcBuilderSource.includes("TILE_ART") && npcBuilderSource.includes("CHEST_ART") && npcBuilderSource.includes("tileSource"), "NPC source rebuild would lose tile/chest imagery");
const serverSource = fs.readFileSync(path.resolve("scripts/serve.py"), "utf8");
check(serverSource.includes("_gzip_cache") && serverSource.includes("If-None-Match") && serverSource.includes("must-revalidate") && serverSource.includes("max-age=31536000, immutable"), "Static server gzip/ETag/immutable-cache optimization is missing");
for (const item of vanillaItems) if (item.sprite) check(fs.existsSync(path.join(root, item.sprite)), `Missing vanilla item sprite: ${item.sprite}`);
check(app.includes("npcSourceArt"), "Craft source rows are not rendering enemy art");
check(app.includes("EXTRA_RECIPE_DEFS") && app.includes("Copper Shortsword") && app.includes("Zenith"), "Vanilla Zenith recipe override is missing");
check(app.includes("item.description || purpose") && app.includes("ruText(item.description || purpose)"), "Catalog cards are not rendering the Russian description field");
const npcArtContext = { window: {} };
vm.createContext(npcArtContext);
vm.runInContext(fs.readFileSync(path.join(root, "js/npc-art.js"), "utf8"), npcArtContext);
const npcArt = npcArtContext.window.CALAMITY_NPC_ART || {};
check(Object.keys(npcArt).length >= 80, `Expected at least 80 official NPC textures, got ${Object.keys(npcArt).length}`);
for (const [name, relative] of Object.entries(npcArt)) check(fs.existsSync(path.join(root, relative)), `Missing NPC texture for "${name}": ${relative}`);
check(!app.includes("KIND_SVG"), "Generated category SVG fallbacks are still present");
check(app.includes("нет спрайта"), "Honest missing-sprite state is absent for non-catalog references");

const officialArt = [
  "hero.jpg", "crest.jpg", "novice.jpg", "veteran.jpg", "emblem.png", "emblem.webp", "favicon.png",
  ...["wiki", "bosses", "items", "favorites", "lex", "crafts", "biomes"].map((name) => `headers/${name}.webp`),
  ...["forest", "wulfrum", "sea", "brimstone", "hell", "desert", "ice", "evil", "mushroom", "dungeon"].map((name) => `themes/${name}.jpg`)
];
for (const relative of officialArt) {
  const file = path.join(root, "assets", relative);
  check(fs.existsSync(file) && fs.statSync(file).size > 250, `Missing decorative game asset: ${relative}`);
}
const provenancePath = path.join(root, "assets/PROVENANCE.md");
check(fs.existsSync(provenancePath), "Image provenance document is missing");
const provenance = fs.readFileSync(provenancePath, "utf8");
for (const revision of [
  "1a8cebd27ec5615316b78f71973446b5528d2b78",
  "d8b7a655e210fe377186a083635733ece85c3594",
  "a825a5d87d18c63c22a461265b2d9188579b204f",
  "c95e85de00dd7e5a02478a2ffa82cc3a5131042c"
]) check(provenance.includes(revision), `Provenance is missing pinned revision ${revision}`);

const lexRoot = path.join(root, "assets/lex");
const lexFiles = ["vanilla", "calamity"].flatMap((folder) =>
  fs.readdirSync(path.join(lexRoot, folder)).filter((name) => name.endsWith(".png"))
);
check(lexFiles.length === 37, `Expected 37 verified dictionary textures, got ${lexFiles.length}`);
for (const relative of app.match(/assets\/lex\/[A-Za-z0-9_./-]+\.png/g) || []) {
  check(fs.existsSync(path.join(root, relative)), `Missing dictionary texture: ${relative}`);
}
check(app.includes("Награда святилища"), "Shrine representative art is not labeled honestly");
check(fs.existsSync(path.resolve("scripts/build-official-art.sh")), "Official artwork rebuild script is missing");
check(fs.existsSync(path.resolve("scripts/fetch-lexicon-art.sh")), "Dictionary artwork fetch script is missing");

// --- Wiki reference cards (armor/materials/hp/mechanics) must resolve real local art ---
// The UI tables live inside the app IIFE, so they are extracted from source.
const tableOf = (name) => {
  const match = app.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n  \\};`));
  check(match, `Art table ${name} was not found in app.js`);
  const entries = {};
  for (const m of match[1].matchAll(/("(?:[^"\\]|\\.)*"|[A-Za-z][\w]*):\s*"((?:[^"\\]|\\.)*)"/g)) {
    const key = m[1].startsWith("\"") ? JSON.parse(m[1]) : m[1];
    entries[key] = JSON.parse(`"${m[2]}"`);
  }
  return entries;
};
const dataContext = { window: {} };
dataContext.window = dataContext;
vm.createContext(dataContext);
for (const script of ["js/data.js", "js/extra.js", "js/lexicon.js", "js/plain.js", "js/plain-late.js", "js/polish.js", "js/sprites.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, script), "utf8"), dataContext, { filename: script });
}
const CODEX = dataContext.CODEX;
check(Object.keys(CODEX.lex || {}).length === 242, `Expected 242 dictionary records, got ${Object.keys(CODEX.lex || {}).length}`);
check(new Set(Object.values(CODEX.lex || {}).map((entry) => entry.type)).size === 23, "Unexpected dictionary type count");
const LEX_ART = tableOf("LEX_ART");
const REFERENCE_ART = tableOf("REFERENCE_ART");
const WIKI_ART = tableOf("WIKI_ART");
check(Object.keys(WIKI_ART).length === 23, `Expected 23 explicit wiki art entries, got ${Object.keys(WIKI_ART).length}`);
for (const [name, relative] of Object.entries(WIKI_ART)) {
  check(fs.existsSync(path.join(root, relative)), `Wiki art for "${name}" is missing locally: ${relative}`);
}
const normalizeArt = (s) => String(s || "").toLocaleLowerCase("ru").replace(/[^a-zа-яё0-9]+/gi, " ").trim();
const spriteIndex = new Map();
for (const [name, relative] of Object.entries(CODEX.sprites || {})) {
  for (const part of [name, ...String(name).split(/\s*\/\s*/)]) {
    const key = normalizeArt(part);
    if (key && !spriteIndex.has(key)) spriteIndex.set(key, relative);
  }
}
for (const item of items) {
  const key = normalizeArt(item[0]);
  if (key && !spriteIndex.has(key)) spriteIndex.set(key, `assets/item-sprites/${encodeURIComponent(item[2])}.png`);
}
const wikiResolves = (name) => {
  // Mirrors app.js resolveArt(): exact-name table hits only, then the
  // sprite-name index over the exact name and the dictionary en/ru names.
  if (LEX_ART[name] || REFERENCE_ART[name] || WIKI_ART[name]) return true;
  const lex = CODEX.lookup ? CODEX.lookup(name) : null;
  for (const candidate of [name, lex && lex.en, lex && lex.ru].filter(Boolean)) {
    if (spriteIndex.get(normalizeArt(candidate))) return true;
    for (const part of String(candidate).split(/\s*\/\s*/)) {
      if (spriteIndex.get(normalizeArt(part))) return true;
    }
  }
  return false;
};
const unresolved = [...CODEX.armors, ...CODEX.materials, ...CODEX.hpUps, ...CODEX.mechanics]
  .map((entry) => entry.name)
  .filter((name) => !wikiResolves(name));
check(unresolved.length === 0, `Wiki reference cards without local art: ${unresolved.join(", ")}`);

// Every biome card must reference its own local image: no missing files,
// no two biomes sharing one scene.
const biomeImages = (CODEX.biomes || []).map((biome) => String(biome.img || ""));
check(biomeImages.length >= 18, `Expected at least 18 biome cards, got ${biomeImages.length}`);
for (const img of biomeImages) {
  check(img.startsWith("assets/"), `Biome image path is not local: ${img}`);
  check(fs.existsSync(path.join(root, img)), `Biome image is missing locally: ${img}`);
}
check(new Set(biomeImages).size === biomeImages.length, `Biome cards share one image: ${biomeImages.join(", ")}`);
check(biomeImages.every((img) => img.endsWith(".webp")), "Biome cards must use optimized WebP scenes");
const themeDir = path.join(root, "assets/themes");
const themeWebp = fs.readdirSync(themeDir).filter((name) => name.endsWith(".webp"));
check(themeWebp.length === 18, `Expected 18 optimized theme WebP files, got ${themeWebp.length}`);
check(fs.existsSync(path.join(root, "assets/hero.webp")), "Optimized hero.webp is missing");
check(fs.existsSync(path.resolve("scripts/build-web-images.sh")), "Web image rebuild script is missing");
check(!app.includes("assets/themes/forest.jpg") && modernCss.includes("assets/hero.webp"), "Runtime still references unoptimized JPG scene assets");

console.log(`PASS: ${items.length} catalog cards have verified local sprites and Russian descriptions`);
console.log(`PASS: all ${localizedVanillaItems.length} named vanilla records use official Russian names without generic inspector placeholders`);
console.log("PASS: versioned bundled runtime, compact pagination, lazy indexes/assets, bounded particles, PWA offline cache and gzip/ETag delivery are enabled");
console.log("PASS: global search, shareable/acyclic trees, fully Russian guidance/wiki sources, drag maps and profile backup are wired");
console.log(`PASS: ${officialArt.length} decorative assets are present with documented provenance`);
console.log(`PASS: ${lexFiles.length} dictionary textures have pinned sources and honest representative labels`);
console.log("PASS: craft ingredients and world/chest source imagery have local mappings plus a full DOM regression audit");
console.log("PASS: generated item fallback art is absent; missing reference sprites are labeled honestly");
console.log(`PASS: all ${Object.keys(WIKI_ART).length} wiki reference cards resolve verified local art`);
console.log(`PASS: all ${biomeImages.length} biome cards have their own local image`);
