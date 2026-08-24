#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const repoRoot = path.resolve(root, "..");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };

const dataContext = { window: {} };
vm.createContext(dataContext);
for (const file of ["vanilla-tree.js", "vanilla-meta.js", "vanilla-ru.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", file), "utf8"), dataContext, { filename: file });
}
const tree = dataContext.window.CALAMITY_VANILLA_TREE_INDEX;
const meta = dataContext.window.CALAMITY_VANILLA_META;
const ru = dataContext.window.CALAMITY_VANILLA_RU;
check(tree.items.length === 5087, `Expected 5087 vanilla items, got ${tree.items.length}`);
check(meta.rows.length === 4504 && meta.coverage?.fishingPoles === 11 && meta.coverage?.records === 4504, "Vanilla semantic metadata coverage changed unexpectedly");
check(meta.fields.includes("Fishing Power") && meta.fields.includes("Pickaxe power") && meta.fields.includes("Tooltip"), "Vanilla semantic metadata lacks key gameplay fields");
check(ru.officialCount === 5073 && ru.tooltipCount === 1766 && ru.tooltips.length === ru.names.length, "Official vanilla RU name/tooltip coverage is incomplete");
check(ru.names[4325] === "«Завлекатель приманки»" && /Кровавой луны/i.test(ru.tooltips[4325]), "Chum Caster still has a broken name or no exact Blood Moon tooltip");
check(!ru.tooltips.some((value) => value && /\{\$[^}]+\}/.test(value)), "An unresolved localization placeholder remains in vanilla tooltips");
const metaIds = new Set(meta.rows.map((row) => Number(row[0])));
const metaRowById = new Map(meta.rows.map((row) => [Number(row[0]), row]));
check(metaIds.size === meta.rows.length && [...metaIds].every((id) => id >= 1 && id <= tree.items.length), "Vanilla semantic metadata has duplicate or invalid item IDs");
const metaBuilder = fs.readFileSync(path.join(repoRoot, "scripts/build-vanilla-meta.mjs"), "utf8");
const ruBuilder = fs.readFileSync(path.join(repoRoot, "scripts/build-vanilla-ru.mjs"), "utf8");
check(metaBuilder.includes("Terraria-Dataset@51d0b5f1e83c971d16d76e7cbb1364cb3f07d19e") && metaBuilder.includes("Fishing Power"), "Vanilla semantic metadata is not reproducibly pinned");
check(ruBuilder.includes("ItemTooltip") && ruBuilder.includes("resolveLocalization") && ruBuilder.includes('4325: "«Завлекатель приманки»"'), "Vanilla RU rebuild would lose exact tooltips or the verified Chum Caster correction");

// Exhaustively run every named vanilla record through the same public card
// resolver used by tree nodes, search results and acquisition cards.
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sourceHtml = htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const sourceDom = new JSDOM(sourceHtml, { url: "http://localhost/#/", runScripts: "outside-only", pretendToBeVisual: true });
const sourceWindow = sourceDom.window;
sourceWindow.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillRect() {}, save() {}, translate() {}, rotate() {}, restore() {}, set fillStyle(value) {} });
sourceWindow.scrollTo = () => {};
sourceWindow.HTMLElement.prototype.scrollIntoView = () => {};
sourceWindow.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
for (const name of [
  "data.js", "extra.js", "lexicon.js", "plain.js", "plain-late.js", "polish.js", "bosses.js", "sprites.js",
  "catalog.js", "boss-relations.js", "useful.js", "vanilla-tree.js", "vanilla-meta.js", "vanilla-ru.js", "npc-sources.js", "npc-ru.js", "npc-art.js", "ru-names.js"
]) sourceWindow.eval(`${fs.readFileSync(path.join(root, "js", name), "utf8")}\n//# sourceURL=${name}`);
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const instrumented = appSource.replace(/\}\)\(\);\s*$/, "window.__ITEM_ACCURACY={ingredientInfo,vanillaMetaFor};})();");
check(instrumented !== appSource, "Could not instrument item accuracy resolver");
sourceWindow.eval(`${instrumented}\n//# sourceURL=app.js`);
const api = sourceWindow.__ITEM_ACCURACY;
const fieldIndex = new Map(meta.fields.map((field, index) => [field, index]));
let named = 0;
let translatedTooltipCards = 0;
let fishingCards = 0;
let poweredToolCards = 0;
for (let index = 0; index < tree.items.length; index += 1) {
  const id = index + Number(tree.firstItemId || 1);
  const name = tree.items[index][0];
  if (!ru.names[id] || /^n\/a\s*\(/i.test(name)) continue;
  named += 1;
  const info = api.ingredientInfo(`vanilla:${id}`);
  check(String(info.ru || "").trim().length >= 2, `Vanilla #${id} ${name} has no display name`);
  check(/[А-Яа-яЁё]/.test(info.desc || "") && info.desc.length >= 55, `Vanilla #${id} ${name} has an empty/generic description`);
  check(/[А-Яа-яЁё]/.test(info.used || "") && info.used.length >= 45, `Vanilla #${id} ${name} has no usable purpose`);
  check(/[А-Яа-яЁё]/.test(info.when || "") && info.when.length >= 55, `Vanilla #${id} ${name} has no timing guidance`);
  if (ru.tooltips[id]) {
    translatedTooltipCards += 1;
    check(info.desc.includes(ru.tooltips[id]), `Vanilla #${id} ${name} lost its official Russian tooltip`);
  }
  const row = metaRowById.get(id);
  if (!row) continue;
  const values = row[2] || [];
  const fishingPower = values[fieldIndex.get("Fishing Power")];
  const powers = ["Pickaxe power", "Axe power", "Hammer power"].map((field) => values[fieldIndex.get(field)]).filter((value) => value && value !== "0%");
  if (fishingPower) {
    fishingCards += 1;
    check(info.typeLabel === "удочка" && info.desc.includes(`сила рыбалки ${fishingPower}`) && /^Удочка:/.test(info.used), `Vanilla fishing pole #${id} ${name} is still described as a generic tool`);
  }
  if (powers.length) {
    poweredToolCards += 1;
    check(info.semanticStats.some((stat) => powers.some((power) => stat.includes(power))), `Powered tool #${id} ${name} has no exact power stat`);
  }
}
check(named === 5073 && translatedTooltipCards === 1766 && fishingCards === 11 && poweredToolCards === meta.coverage.poweredTools, `Exhaustive semantic counts mismatch: ${named}/${translatedTooltipCards}/${fishingCards}/${poweredToolCards}`);
const chum = api.ingredientInfo("vanilla:4325");
check(chum.ru === "«Завлекатель приманки»" && chum.typeLabel === "удочка", "Chum Caster identity/role is still wrong");
check(chum.desc.includes("сила рыбалки 25%") && chum.desc.includes("Кровавой луны"), "Chum Caster description lacks exact power or official effect");
check(chum.obtain.includes("1/8 (12,5%)") && chum.obtain.includes("Блуждающего рыбоглаза") && chum.obtain.includes("Зомби-тритона"), "Chum Caster lacks exact offline acquisition");
check(chum.when.includes("Кровавой луны") && chum.used.includes("наживка"), "Chum Caster timing/use guidance is incorrect");
sourceDom.window.close();

// Public DOM regression for the exact screenshot case.
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const dataBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(sourceHtml, { url: "http://localhost/#/crafts?item=vanilla%3A4325", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillRect() {}, save() {}, translate() {}, rotate() {}, restore() {}, set fillStyle(value) {} });
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
window.eval(`${runtime}\n//# sourceURL=codex.min.js`);
const settle = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));
(async () => {
  await settle();
  const request = window.document.querySelector("script[data-codex-catalog]");
  window.eval(`${dataBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(150);
  const inspector = window.document.getElementById("craft-tree-inspector-content");
  const text = inspector.textContent.replace(/\s+/g, " ");
  check(text.includes("удочка «Завлекатель приманки»") && text.includes("сила рыбалки 25%"), "Public Chum Caster card still looks like a generic tool");
  check(text.includes("Увеличенный шанс выловить из воды врагов во время Кровавой луны"), "Public Chum Caster card does not show its official RU effect");
  check(text.includes("1/8 (12,5%)") && text.includes("Блуждающего рыбоглаза") && text.includes("Зомби-тритона"), "Public Chum Caster card does not show exact offline acquisition");
  check(inspector.querySelectorAll(".vanilla-semantic-stats span").length >= 1 && inspector.querySelector(".craft-tree-inspector-art")?.getAttribute("src")?.startsWith("assets/vanilla-sprites/4325.png"), "Public Chum Caster card lacks exact stats or genuine local art");
  check(errors.length === 0, `Public item accuracy flow emitted runtime errors: ${errors.join("\n")}`);
  console.log(`PASS: all ${named} named vanilla items resolve semantic roles; ${meta.rows.length} have structured metadata and ${translatedTooltipCards} show official RU effects`);
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
