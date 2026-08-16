#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "js/catalog.js"), "utf8"), context);
const index = context.window.CALAMITY_ITEM_INDEX;
const items = index?.items || [];
const ruNamesPath = path.join(root, "js/ru-names.js");
check(fs.existsSync(ruNamesPath), "Russian catalog name layer is missing");
vm.runInContext(fs.readFileSync(ruNamesPath, "utf8"), context, { filename: "js/ru-names.js" });
const russianNames = context.window.CALAMITY_RU_NAMES?.byId || {};

check(items.length === 2535, `Expected 2535 verified catalog items, got ${items.length}`);
check(items.every((item) => /[А-Яа-яЁё]/.test(russianNames[item[2]] || "")), "A public catalog record has no Russian display name");
check(index.coverage?.sprites === items.length, "Sprite coverage does not match public item count");
check(index.coverage?.russianDescriptions === items.length, "Russian description coverage is incomplete");
check(index.coverage?.omittedWithoutSprite === 38, "Unexpected localization-only omission count");
check(items.every((item) => item[4] === 1), "A public catalog record has no verified sprite");
check(items.every((item) => /[А-Яа-яЁё]/.test(item[7] || "")), "A public catalog record has no Russian description");
check(items.every((item) => fs.existsSync(path.join(root, "assets/item-sprites", `${item[2]}.png`))), "A referenced item sprite is missing locally");

const spriteFiles = fs.readdirSync(path.join(root, "assets/item-sprites")).filter((name) => name.endsWith(".png"));
check(spriteFiles.length === items.length, `Expected ${items.length} item sprite files, got ${spriteFiles.length}`);

const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
check(indexHtml.includes("js/ru-names.js"), "Russian catalog name layer is not loaded by index.html");
check(indexHtml.includes("js/npc-art.js"), "NPC art layer is not loaded by index.html");
check(app.includes("ruItemName"), "Catalog cards are not using the Russian display-name layer");
check(app.includes("npcSourceArt"), "Craft source rows are not rendering enemy art");
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
  "a825a5d87d18c63c22a461265b2d9188579b204f"
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

console.log(`PASS: ${items.length} catalog cards have verified local sprites and Russian descriptions`);
console.log(`PASS: ${officialArt.length} decorative assets are present with documented provenance`);
console.log(`PASS: ${lexFiles.length} dictionary textures have pinned sources and honest representative labels`);
console.log("PASS: generated item fallback art is absent; missing reference sprites are labeled honestly");
console.log(`PASS: all ${Object.keys(WIKI_ART).length} wiki reference cards resolve verified local art`);
console.log(`PASS: all ${biomeImages.length} biome cards have their own local image`);
