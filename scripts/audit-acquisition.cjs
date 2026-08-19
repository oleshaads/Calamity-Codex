#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
check(appSource.includes("GENERIC_OBTAIN_RE") && appSource.includes("isGenericObtainText"), "Generic acquisition placeholders are not identified honestly");
check(appSource.includes("function officialWikiProfile") && appSource.includes("terraria.wiki.gg/ru/api.php") && appSource.includes("calamitymod.wiki.gg/api.php"), "Universal official-wiki acquisition lookup is incomplete");
check(appSource.includes('WIKI_SOURCE_CACHE_KEY = "calamity-codex-wiki-sources-v4"') && appSource.includes("slice(0, 300)"), "Verified acquisition results are not cached for offline reuse");
check(!/catch\s*\{[\s\S]{0,250}?box\.hidden\s*=\s*true/.test(appSource), "Wiki lookup still hides its failure instead of offering an official source link");
const css = fs.readFileSync(path.join(root, "css/modern.css"), "utf8");
check(css.includes("Универсальный проверяемый источник предмета") && css.includes(".acquisition-wiki") && css.includes(".wiki-source-live.failed"), "Acquisition verification states lack readable styling");

const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const html = htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const catalogBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");
const errors = [];
const requests = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, {
  url: "http://localhost/#/useful?type=craft",
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
window.fetch = async (url) => {
  requests.push(String(url));
  const isCalamity = String(url).includes("calamitymod.wiki.gg");
  const extract = isCalamity
    ? "The Celestial Onion is a permanent power-up item dropped by the Moon Lord. It permanently increases the number of accessory slots and does nothing after the maximum slot has already been granted."
    : "Алхимический стол встречается как размещённая мебель в случайных комнатах Данжа. После победы над Скелетроном его можно сломать киркой и перенести на базу.";
  return { ok: true, status: 200, async json() { return { query: { pages: { 1: { pageid: 1, extract } } } }; } };
};
window.eval(`${runtime}\n//# sourceURL=codex.min.js`);
const settle = (ms = 70) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  await settle();
  const request = window.document.querySelector("script[data-codex-catalog]");
  check(request, "Useful acquisition route did not request lazy catalog data");
  window.eval(`${catalogBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(100);
  const document = window.document;
  const alchemyCard = [...document.querySelectorAll(".useful-card")].find((card) => card.querySelector("h3")?.textContent === "Алхимический стол");
  check(alchemyCard, "Alchemy Table useful card did not render");
  const localSource = alchemyCard.querySelector(".useful-obtain p")?.textContent || "";
  check(localSource.includes("Данж") && localSource.includes("кирк") && !/без рецепта|покупается у НИП либо/i.test(localSource), "Alchemy Table still uses a generic acquisition guess");
  const acquisitionButton = alchemyCard.querySelector("[data-item-details]");
  check(acquisitionButton, "Alchemy Table has no universal obtaining button");
  acquisitionButton.click();
  await settle(100);
  const tip = document.getElementById("tip-card");
  let wiki = tip.querySelector(".acquisition-wiki");
  check(!tip.hidden && wiki?.classList.contains("loaded"), "Terraria acquisition lookup did not open and resolve");
  check(wiki.querySelector("p")?.textContent.includes("случайных комнатах Данжа"), "Official Terraria acquisition text was not displayed");
  check(requests.some((url) => url.includes("terraria.wiki.gg/ru/api.php")), "Alchemy Table did not query the official Russian Terraria Wiki API");
  const cache = JSON.parse(window.localStorage.getItem("calamity-codex-wiki-sources-v4") || "{}");
  check(Object.values(cache).some((entry) => entry.text?.includes("случайных комнатах Данжа")), "Verified acquisition was not cached for offline use");
  tip.querySelector("[data-tip-close]").click();
  await settle(30);
  window.fetch = async () => { throw new Error("offline"); };
  acquisitionButton.click();
  await settle(60);
  wiki = tip.querySelector(".acquisition-wiki");
  check(wiki.querySelector("small")?.textContent.includes("сохранённая копия") && wiki.querySelector("p")?.textContent.includes("Данжа"), "Cached acquisition was not reused offline");
  tip.querySelector("[data-tip-close]").click();

  window.fetch = async (url) => {
    requests.push(String(url));
    return { ok: true, status: 200, async json() { return { query: { pages: { 1: { pageid: 1, extract: "The Celestial Onion is a permanent power-up item dropped by the Moon Lord." } } } }; } };
  };
  window.location.hash = "#/useful?type=permanent";
  await settle(100);
  const onion = [...document.querySelectorAll(".useful-card")].find((card) => card.querySelector("h3")?.textContent === "Небесный лук");
  check(onion?.querySelector(".useful-obtain p")?.textContent.includes("Лунного лорда"), "Celestial Onion has no exact offline acquisition note");
  onion.querySelector("[data-item-details]").click();
  await settle(90);
  wiki = tip.querySelector(".acquisition-wiki");
  check(requests.some((url) => url.includes("calamitymod.wiki.gg/api.php")), "Calamity item did not query the official Calamity Wiki API");
  check(wiki?.classList.contains("loaded") && wiki.querySelector("small")?.textContent.includes("EN"), "Official Calamity acquisition result is not labeled honestly as English");
  check(errors.length === 0, `Universal acquisition flow emitted errors: ${errors.join("\n")}`);
  console.log("PASS: useful items have exact offline sources and every non-craft item can verify acquisition through the official wiki with cached offline reuse");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
