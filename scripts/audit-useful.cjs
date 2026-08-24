#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM, VirtualConsole } = require("jsdom");

const repoRoot = path.resolve(__dirname, "..");
const root = path.join(repoRoot, "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };

const context = { window: {}, CODEX: {} };
context.window = context;
vm.createContext(context);
for (const name of ["data.js", "extra.js", "lexicon.js", "plain.js", "plain-late.js", "polish.js", "bosses.js", "sprites.js", "catalog.js", "vanilla-tree.js", "useful.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, "js", name), "utf8"), context, { filename: name });
}
const useful = context.CALAMITY_USEFUL_ITEMS || {};
const catalog = context.CALAMITY_ITEM_INDEX;
const vanilla = context.CALAMITY_VANILLA_TREE_INDEX;
check(useful.format === 1, "Useful-item data has an unsupported format");
check(useful.groups?.length === 6, `Expected 6 useful categories, got ${useful.groups?.length || 0}`);
check(useful.items?.length === 71, `Expected 71 curated useful items, got ${useful.items?.length || 0}`);
check(Object.keys(useful.sources || {}).length === 27, `Expected 27 exact offline sources for non-craft utility items, got ${Object.keys(useful.sources || {}).length}`);
check(Object.entries(useful.sources || {}).every(([ref, source]) => useful.items.some((item) => item[0] === ref) && String(source).length >= 55 && !/без рецепта|находится, покупается|точный источник/i.test(source)), "Useful acquisition note is generic, too short or references an unknown item");
check(String(useful.sources?.["vanilla:3000"] || "").includes("Данж") && String(useful.sources?.["vanilla:3000"] || "").includes("кирк"), "Alchemy Table does not explain its exact Dungeon acquisition");
check(new Set(useful.items.map((item) => item[0])).size === useful.items.length, "Useful section contains duplicate item references");
const groupIds = new Set(useful.groups.map((group) => group[0]));
check(useful.items.every((item) => groupIds.has(item[1])), "Useful item references an unknown category");
check(useful.items.every((item) => ["start", "pre", "hard", "post", "end"].includes(item[2])), "Useful item has an invalid progression tier");
check(useful.items.every((item) => ["must", "high", "situational"].includes(item[3])), "Useful item has an invalid priority");
check(useful.items.every((item) => String(item[4]).trim() && String(item[5]).length >= 35 && String(item[6]).length >= 35), "Useful card lacks a practical title, reason or usage tip");
check(useful.items.filter((item) => item[3] === "must").length >= 20, "Useful section does not clearly prioritize the essentials");

const catalogById = new Map(catalog.items.map((item) => [item[2], item]));
const vanillaFirst = Number(vanilla.firstItemId || 1);
const vanillaMissing = new Set(vanilla.coverage?.missingSpriteIds || []);
const guideNames = new Set((context.CODEX.items || []).map((item) => item.name));
for (const [ref] of useful.items) {
  if (ref.startsWith("catalog:")) {
    const id = ref.slice(8);
    check(catalogById.has(id), `Useful section references missing Calamity item: ${id}`);
    check(fs.existsSync(path.join(root, `assets/item-sprites/${id}.png`)), `Useful Calamity item has no local sprite: ${id}`);
  } else if (ref.startsWith("vanilla:")) {
    const id = Number(ref.slice(8));
    check(Number.isInteger(id) && vanilla.items[id - vanillaFirst], `Useful section references missing Terraria item: ${ref}`);
    check(!vanillaMissing.has(id) && fs.existsSync(path.join(root, `assets/vanilla-sprites/${id}.png`)), `Useful Terraria item has no local sprite: ${id}`);
  } else {
    check(guideNames.has(ref), `Useful section references missing guide item: ${ref}`);
    const art = context.CODEX.sprites?.[ref];
    check(art && fs.existsSync(path.join(root, art)), `Useful guide item has no verified local art: ${ref}`);
  }
}

const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
check(appSource.includes("function renderUseful") && appSource.includes("function usefulCard") && appSource.includes("USEFUL_TIER_ADVICE"), "Useful route renderer or detailed timing guidance is missing");
const modernCss = fs.readFileSync(path.join(root, "css/modern.css"), "utf8");
check(modernCss.includes("крупная типографика и читаемость") && modernCss.includes("body { font-size: 17px; line-height: 1.7; }") && modernCss.includes(".card-title { font-size: 15px;") && modernCss.includes(".fact p { font-size: 14px;") && modernCss.includes(".useful-detail p { font-size: 14px;"), "Global or useful-section readability sizing is missing");
check(appSource.includes('a[href^="#/useful"]'), "Useful route is missing catalog intent prefetch");
const indexHtmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
check((indexHtmlSource.match(/data-nav="useful"/g) || []).length === 2, "Useful route is not exposed in both desktop and mobile navigation");

const html = indexHtmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const catalogBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, {
  url: "http://localhost/#/useful",
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
window.eval(`${runtime}\n//# sourceURL=codex.min.js`);
const settle = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  await settle();
  const request = window.document.querySelector("script[data-codex-catalog]");
  check(request, "Direct useful route did not request lazy catalog data");
  window.eval(`${catalogBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(100);
  const document = window.document;
  check(document.querySelector(".useful-page"), "Useful page did not render after hydration");
  check(document.querySelectorAll(".useful-group").length === 6, "Useful all-view does not render six category sections");
  check(document.querySelectorAll(".useful-card").length === 71, "Useful all-view does not render all curated cards");
  check(!document.querySelector('.useful-page input[type="search"]'), "Small curated useful section has an unnecessary text search");
  const incompleteCards = [...document.querySelectorAll(".useful-card")].filter((card) => !(card.querySelector(".useful-card-art img") && card.querySelector(".useful-card-description")?.textContent.length >= 45 && card.querySelectorAll(".useful-detail").length === 4 && card.querySelector(".useful-reason p")?.textContent.length >= 35 && card.querySelector(".useful-timing p")?.textContent.length >= 80 && card.querySelector(".useful-obtain p")?.textContent.length >= 30 && card.querySelector(".useful-advice p")?.textContent.length >= 35));
  check(!incompleteCards.length, `Useful cards are incomplete, too terse or lack local art: ${incompleteCards.map((card) => card.querySelector("h3")?.textContent).join(", ")}`);
  check(document.querySelectorAll(".useful-category-nav a").length === 7, "Useful category navigation is incomplete");
  const alchemyCard = [...document.querySelectorAll(".useful-card")].find((card) => card.querySelector("h3")?.textContent === "Алхимический стол");
  check(alchemyCard?.querySelector(".useful-obtain p")?.textContent.includes("Данж") && !alchemyCard?.querySelector(".useful-obtain p")?.textContent.includes("без рецепта"), "Alchemy Table still shows a generic non-recipe placeholder");

  document.querySelector('.useful-category-nav a[href="#/useful?type=resources"]').click();
  await settle(80);
  check(window.location.hash.includes("type=resources"), "Useful category filter is not encoded in the URL");
  check(document.querySelectorAll(".useful-group").length === 1 && document.querySelector(".useful-group")?.id === "useful-resources", "Useful category filter did not isolate resource helpers");
  check(document.querySelectorAll(".useful-card").length === 12, "Resource helper category has an unexpected item count");
  check(errors.length === 0, `Useful route emitted runtime errors: ${errors.join("\n")}`);
  console.log("PASS: 71 practical items have four detailed guidance blocks, local art and readable large typography");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
