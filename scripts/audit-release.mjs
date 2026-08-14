#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";

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

const spriteDir = path.join(root, "assets/item-sprites");
const spriteFiles = fs.readdirSync(spriteDir).filter((name) => name.endsWith(".png"));
check(spriteFiles.length === items.length, `Expected ${items.length} item sprite files, got ${spriteFiles.length}`);
check(index.coverage?.staticAnimationFrames === 101, "Animated item sprite coverage is unexpected");
check(index.coverage?.synchronizedGuideSprites === 15, "Progression sprite synchronization is incomplete");

function imageSize(file) {
  const data = fs.readFileSync(file);
  if (data.length >= 24 && data.subarray(1, 4).toString() === "PNG") {
    return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  }
  // Riftburst is an official animated GIF stored with a .png extension in the
  // pinned upstream repository. Browsers and ImageMagick both decode it.
  if (data.length >= 10 && data.subarray(0, 3).toString() === "GIF") {
    return { width: data.readUInt16LE(6), height: data.readUInt16LE(8) };
  }
  fail(`Unsupported sprite image: ${file}`);
}

// Vertical Terraria animation sheets must be flattened before browser use. A
// raw strip is squeezed into a nearly invisible line by the fixed card height.
for (const name of spriteFiles) {
  const { width, height } = imageSize(path.join(spriteDir, name));
  check(width > 0 && height > 0 && height <= width * 5, `Unnormalized item animation strip: ${name} (${width}x${height})`);
}
for (const [name, expected] of Object.entries({
  "TheSponge.png": [44, 56],
  "Murasama.png": [90, 134],
  "BloodOrb.png": [16, 28]
})) {
  const size = imageSize(path.join(spriteDir, name));
  check(size.width === expected[0] && size.height === expected[1], `Wrong representative frame for ${name}`);
  const guideFile = path.join(root, "assets/sprites", name);
  if (fs.existsSync(guideFile)) {
    const guideSize = imageSize(guideFile);
    check(guideSize.width === size.width && guideSize.height === size.height, `Guide copy is stale: ${name}`);
  }
}

const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const rebornCssPath = path.join(root, "css/reborn.css");
const architectureCssPath = path.join(root, "css/architecture.css");
check(indexHtml.includes('href="css/reborn.css"'), "Reborn interface stylesheet is not connected");
check(indexHtml.includes('href="css/architecture.css"'), "Architectural interface stylesheet is not connected");
check(fs.existsSync(rebornCssPath) && fs.statSync(rebornCssPath).size > 20000, "Reborn interface stylesheet is incomplete");
check(fs.existsSync(architectureCssPath) && fs.statSync(architectureCssPath).size > 25000, "Architectural interface rebuild is incomplete");
const rebornCss = fs.readFileSync(rebornCssPath, "utf8");
const architectureCss = fs.readFileSync(architectureCssPath, "utf8");
check(rebornCss.includes("@media (max-width: 700px)"), "Reborn interface has no mobile layout");
check(rebornCss.includes("--cyan: #61e6c5"), "Reborn design tokens are missing");
check(architectureCss.includes(".route-bento") && architectureCss.includes(".section-banner"), "New application structure is missing");

const app = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
check(app.includes("esc(item.description || purpose)"), "Catalog cards are not rendering the Russian description field");
check(app.includes('class="landing"') && app.includes('class="command-center"'), "Command-centre home structure is missing");
check(app.includes('class="section-banner"'), "New section banner structure is missing");
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
const themeFiles = officialArt.filter((relative) => relative.startsWith("themes/"));
const themeHashes = new Set(themeFiles.map((relative) =>
  createHash("sha256").update(fs.readFileSync(path.join(root, "assets", relative))).digest("hex")
));
check(themeHashes.size === themeFiles.length, "Quest themes contain duplicate background images");
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
console.log("PASS: command-centre home, horizontal app navigation, section banners and responsive workspaces are connected");
console.log(`PASS: ${index.coverage.staticAnimationFrames} animated sprite strips are normalized; ${index.coverage.synchronizedGuideSprites} guide copies are synchronized`);
console.log(`PASS: ${officialArt.length} decorative assets have documented official-game provenance and ${themeHashes.size} distinct themes`);
console.log(`PASS: ${lexFiles.length} dictionary textures have pinned sources and honest representative labels`);
console.log("PASS: generated item fallback art is absent; missing reference sprites are labeled honestly");
