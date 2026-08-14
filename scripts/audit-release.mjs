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

check(items.length === 2535, `Expected 2535 verified catalog items, got ${items.length}`);
check(index.coverage?.sprites === items.length, "Sprite coverage does not match public item count");
check(index.coverage?.russianDescriptions === items.length, "Russian description coverage is incomplete");
check(index.coverage?.omittedWithoutSprite === 38, "Unexpected localization-only omission count");
check(items.every((item) => item[4] === 1), "A public catalog record has no verified sprite");
check(items.every((item) => /[А-Яа-яЁё]/.test(item[7] || "")), "A public catalog record has no Russian description");
check(items.every((item) => fs.existsSync(path.join(root, "assets/item-sprites", `${item[2]}.png`))), "A referenced item sprite is missing locally");

const spriteFiles = fs.readdirSync(path.join(root, "assets/item-sprites")).filter((name) => name.endsWith(".png"));
check(spriteFiles.length === items.length, `Expected ${items.length} item sprite files, got ${spriteFiles.length}`);

const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
check(app.includes("esc(item.description || purpose)"), "Catalog cards are not rendering the Russian description field");
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

console.log(`PASS: ${items.length} catalog cards have verified local sprites and Russian descriptions`);
console.log(`PASS: ${officialArt.length} decorative assets have documented official-game provenance`);
console.log(`PASS: ${lexFiles.length} dictionary textures have pinned sources and honest representative labels`);
console.log("PASS: generated item fallback art is absent; missing reference sprites are labeled honestly");
