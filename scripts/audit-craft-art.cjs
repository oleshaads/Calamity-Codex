#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const scripts = [
  "data.js", "extra.js", "lexicon.js", "plain.js", "plain-late.js", "polish.js", "bosses.js", "sprites.js", "catalog.js", "boss-relations.js",
  "vanilla-tree.js", "vanilla-meta.js", "vanilla-ru.js", "npc-sources.js", "npc-ru.js", "npc-art.js", "ru-names.js"
];
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8").replace(/<script[^>]+><\/script>/g, "");
const virtualConsole = new VirtualConsole();
const runtimeErrors = [];
virtualConsole.on("jsdomError", (error) => runtimeErrors.push(error.message));
virtualConsole.on("error", (error) => runtimeErrors.push(String(error)));
const dom = new JSDOM(indexHtml, {
  url: "http://localhost/#/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole
});
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = () => ({
  clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillRect() {}, save() {}, translate() {}, rotate() {}, restore() {},
  set fillStyle(value) {}
});
window.scrollTo = () => {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
for (const name of scripts) window.eval(`${fs.readFileSync(path.join(root, "js", name), "utf8")}\n//# sourceURL=${name}`);
let appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const instrumented = appSource.replace(/\}\)\(\);\s*$/, "window.__CRAFT_ART_AUDIT={getRecipeIndex,ingredientInfo,craftTreeChoices,worldSourceRecord,npcSourceLines};})();");
if (instrumented === appSource) fail("Could not instrument app.js for craft-art audit");
window.eval(`${instrumented}\n//# sourceURL=app.js`);
const api = window.__CRAFT_ART_AUDIT;
if (!api) fail("Craft-art audit hooks are unavailable");

const recipes = api.getRecipeIndex();
const ingredientKeys = new Set();
for (const recipe of recipes.values()) for (const ingredient of recipe.ings || []) ingredientKeys.add(ingredient.key || ingredient.name);
const missingIngredients = [];
const remoteIngredients = [];
for (const key of ingredientKeys) {
  const info = api.ingredientInfo(key);
  if (!info.art && !info.remoteArt) missingIngredients.push(`${key} (${info.ru})`);
  if (!info.art && info.remoteArt) remoteIngredients.push(`${key} -> ${info.remoteArt}`);
  if (info.art && !fs.existsSync(path.join(root, info.art))) missingIngredients.push(`${key} -> missing file ${info.art}`);
}
if (missingIngredients.length) fail(`Craft ingredients without local art (${missingIngredients.length}):\n${missingIngredients.join("\n")}`);
if (remoteIngredients.length) fail(`Craft ingredients still depend on remote art (${remoteIngredients.length}):\n${remoteIngredients.join("\n")}`);

const choices = api.craftTreeChoices();
const missingChoices = choices.filter((item) => !item.art || /^https?:/i.test(item.art) || !fs.existsSync(path.join(root, item.art)));
if (missingChoices.length) fail(`Craft picker entries without local art (${missingChoices.length}): ${missingChoices.slice(0, 20).map((item) => `${item.ru} -> ${item.art || "none"}`).join(", ")}`);

const sourceValues = [...new Set(Object.values(window.CALAMITY_NPC_SOURCES || {}).flatMap((source) => [
  ...(source.tiles || []), ...(source.chests || [])
]).map((value) => typeof value === "object" && value ? value.name : value))];
const missingSources = sourceValues.filter((value) => {
  const source = api.worldSourceRecord(value);
  return !source.art || /^https?:/i.test(source.art) || !fs.existsSync(path.join(root, source.art));
});
if (missingSources.length) fail(`World/chest sources without local art: ${missingSources.join(", ")}`);
const circuitrySources = window.CALAMITY_NPC_SOURCES?.MysteriousCircuitry;
const preview = window.document.createElement("div");
preview.innerHTML = api.npcSourceLines(circuitrySources);
const expectedSourceImages = (circuitrySources?.tiles?.length || 0) + (circuitrySources?.chests?.length || 0);
if (preview.querySelectorAll(".world-source-chip img").length !== expectedSourceImages) {
  fail(`Mysterious Circuitry source preview has incomplete imagery: ${preview.querySelectorAll(".world-source-chip img").length}/${expectedSourceImages}`);
}
if (runtimeErrors.length) fail(`Runtime errors during craft-art audit:\n${runtimeErrors.join("\n")}`);

console.log(`PASS: ${recipes.size} recipes, ${ingredientKeys.size} unique ingredients, ${choices.length} craft entries and ${sourceValues.length} world/chest sources have local imagery`);
dom.window.close();
