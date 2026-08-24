#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM, VirtualConsole } = require("jsdom");

const repoRoot = path.resolve(__dirname, "..");
const root = path.join(repoRoot, "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const relationContext = { window: {} };
vm.createContext(relationContext);
vm.runInContext(fs.readFileSync(path.join(root, "js/boss-relations.js"), "utf8"), relationContext, { filename: "js/boss-relations.js" });
const relations = relationContext.window.CALAMITY_BOSS_RELATIONS || {};

check(relations.format === 1, "Boss relation index has an unsupported format");
check(String(relations.source).includes("1a8cebd27ec5615316b78f71973446b5528d2b78"), "Boss relation index is not pinned to the catalog source");
check(relations.bosses?.length === 54 && new Set(relations.bosses).size === 54, "Boss relation index does not contain 54 unique encounters");
check(relations.items?.length >= 1300, `Expected at least 1300 boss-linked Calamity items, got ${relations.items?.length || 0}`);
check(relations.vanilla?.length >= 280, `Expected at least 280 boss-linked vanilla items, got ${relations.vanilla?.length || 0}`);
check(relations.guides?.length >= 135, `Expected at least 135 boss-linked guide descriptions, got ${relations.guides?.length || 0}`);
check(relations.crafts?.length >= 18, `Expected at least 18 boss-linked craft descriptions, got ${relations.crafts?.length || 0}`);
check(relations.coverage?.maxBossesPerCatalogItem <= 16, "One item accumulated an implausible number of boss links");

const bossIndex = new Map(relations.bosses.map((id, index) => [id, index]));
const typeIndex = new Map(relations.types.map((type, index) => [type, index]));
const itemMap = new Map(relations.items);
const relationHas = (itemId, bossId, type) => (itemMap.get(itemId) || []).some(([boss, relationType]) => boss === bossIndex.get(bossId) && relationType === typeIndex.get(type));
for (const [item, boss, type] of [
  ["BloodyVein", "perforators", "D"],
  ["BloodyVein", "hekate", "S"],
  ["LavaChickenBroth", "hekate", "D"],
  ["DeliciousMeat", "permafrost", "S"],
  ["ColdheartIcicle", "permafrost", "D"],
  ["NO", "the-lorde", "S"],
  ["SuspiciousLookingNOU", "the-lorde", "D"],
  ["ArmoredShell", "storm-weaver", "D"],
  ["DarkPlasma", "ceaseless-void", "D"],
  ["TwistingNether", "signus", "D"],
  ["NuclearFuelRod", "cragmaw-mire", "D"],
  ["SulphuricAcidCannon", "mauler", "D"],
  ["GammaHeart", "nuclear-terror", "D"]
]) check(relationHas(item, boss, type), `${item} is missing its ${type} relation to ${boss}`);
check(!relationHas("ColdheartIcicle", "supreme-calamitas", "D"), "Permafrost's unique Coldheart Icicle is still mislabeled as a normal Supreme Calamitas drop");

const trackedNewBosses = [
  "eater-of-worlds", "brain-of-cthulhu", "hive-mind", "perforators",
  "twins", "destroyer", "skeletron-prime", "duke-fishron", "empress-of-light", "betsy", "lunatic-cultist",
  "ceaseless-void", "storm-weaver", "signus", "primordial-wyrm", "hekate", "permafrost", "the-lorde",
  "cragmaw-mire", "mauler", "nuclear-terror"
];
for (const bossId of trackedNewBosses) {
  const counts = relations.coverage.bossCounts.find((entry) => entry[0] === bossId);
  check(counts && counts.slice(1).reduce((sum, value) => sum + value, 0) > 0, `New encounter has no item/craft relations: ${bossId}`);
}

const staleCombined = /Eater of Worlds \/ Brain|Hive Mind \/ Perfor|The Twins \/ Destroyer|Duke Fishron \/ Empress|Storm Weaver \/ Ceaseless|Cragmaw(?: Mire)? \/ Mauler|Worm Food \/ Bloody Spine|Soul of Sight \/ Might \/ Fright/;
for (const name of ["data.js", "extra.js", "plain.js", "plain-late.js", "polish.js"]) {
  check(!staleCombined.test(fs.readFileSync(path.join(root, "js", name), "utf8")), `Obsolete combined boss/item description remains in ${name}`);
}
const generator = fs.readFileSync(path.join(repoRoot, "scripts/build-boss-relations.mjs"), "utf8");
check(generator.includes("Secret-seed replacements") && generator.includes("VANILLA_SEEDS") && generator.includes("Recipe closure"), "Boss relation generator does not preserve direct, vanilla and transitive recipe links");
const catalogBuilder = fs.readFileSync(path.join(repoRoot, "scripts/build-item-catalog.mjs"), "utf8");
check(catalogBuilder.includes("build-boss-relations.mjs"), "Rebuilding the item catalog would leave boss descriptions stale");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8").replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const catalogBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, {
  url: "http://localhost/#/items?s=Bloody%20Vein",
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
const settle = (ms = 45) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  await settle();
  const request = window.document.querySelector("script[data-codex-catalog]");
  check(request, "Boss-linked catalog route did not request lazy data");
  window.eval(`${catalogBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(70);

  let card = [...window.document.querySelectorAll(".catalog-item-card")].find((entry) => entry.textContent.includes("Bloody Vein"));
  check(card, "Bloody Vein card did not render");
  check(card.querySelector(".desc")?.textContent.includes("XB-∞ Геката") && card.querySelector(".desc")?.textContent.includes("Перфоратор"), "Item description does not explain both the normal and hidden boss routes");
  check(card.querySelectorAll(".boss-ref").length === 2, "Bloody Vein does not expose two concrete boss links");
  check([...card.querySelectorAll(".boss-ref small")].some((node) => node.textContent === "призыв боя"), "Hekate relation is not labeled as a summon route");

  window.location.hash = "#/items?s=%D0%93%D0%B5%D0%BA%D0%B0%D1%82%D0%B0";
  await settle(80);
  check(window.document.querySelectorAll(".catalog-item-card").length > 10, "Searching the new boss name does not find its related items and recipes");
  check([...window.document.querySelectorAll(".catalog-item-card")].every((entry) => entry.textContent.includes("Геката")), "Boss-name search returned a card without the matching relation description");

  // Справочник рекомендаций удалён со страницы дерева: карточка рекомендации
  // с раздельными боссами проверяется через избранные крафты профиля.
  const savedProfile = JSON.parse(window.localStorage.getItem("calamity-codex") || "{}");
  window.localStorage.setItem("calamity-codex", JSON.stringify({ ...savedProfile, favorites: { ...(savedProfile.favorites || {}), craft: ["Метка Провиденс"] } }));
  window.dispatchEvent(new window.StorageEvent("storage", { key: "calamity-codex" }));
  window.location.hash = "#/favorites";
  await settle(150);
  const markCard = [...window.document.querySelectorAll(".craft-card")].find((entry) => entry.textContent.includes("Метка Провиденс"));
  check(markCard, "Mark of Providence craft card did not render");
  const linkedBosses = [...markCard.querySelectorAll(".boss-ref b")].map((node) => node.textContent);
  for (const name of ["Ткач бурь", "Неугасимая пустота", "Сигнус"]) check(linkedBosses.includes(name), `Craft description is missing separate boss: ${name}`);
  check(errors.length === 0, `Boss relation DOM flow emitted errors: ${errors.join("\n")}`);
  console.log(`PASS: ${relations.items.length} catalog items, ${relations.vanilla.length} vanilla items and ${relations.crafts.length} crafts expose complete per-boss descriptions`);
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
