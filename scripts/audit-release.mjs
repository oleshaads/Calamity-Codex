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
  "hero.jpg", "novice.jpg", "veteran.jpg", "emblem.png", "emblem.webp", "favicon.png",
  ...["wiki", "bosses", "items", "favorites", "lex", "crafts", "biomes"].map((name) => `headers/${name}.webp`),
  ...["forest", "wulfrum", "sea", "brimstone", "hell", "desert", "ice", "evil", "mushroom", "dungeon"].map((name) => `themes/${name}.jpg`)
];
for (const relative of officialArt) {
  const file = path.join(root, "assets", relative);
  check(fs.existsSync(file) && fs.statSync(file).size > 250, `Missing decorative game asset: ${relative}`);
}
check(fs.existsSync(path.join(root, "assets/PROVENANCE.md")), "Image provenance document is missing");
check(fs.existsSync(path.resolve("scripts/build-official-art.sh")), "Official artwork rebuild script is missing");

console.log(`PASS: ${items.length} catalog cards have verified local sprites and Russian descriptions`);
console.log(`PASS: ${officialArt.length} decorative assets have documented official-game provenance`);
console.log("PASS: generated item fallback art is absent; missing reference sprites are labeled honestly");
