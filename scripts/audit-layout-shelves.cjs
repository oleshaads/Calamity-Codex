#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "css/modern.css"), "utf8");
for (const token of ["catalog-filter-shelf", "catalog-about-shelf", "activeFilterCount", "activeBossFilterCount"]) {
  check(appSource.includes(token), `Quiet shelf layout is missing runtime structure: ${token}`);
}
for (const token of [
  "спокойная система «по полочкам»", ".panel::after { display: none; }", ".page-head-sigil { display: none; }",
  ".catalog-filter-shelf > summary", ".card-links, .card-actions, .useful-card-actions",
  ".fact { min-width: 0; padding: 11px 0;", ".hero-bg { opacity: .34; animation: none;"
]) check(cssSource.includes(token), `Quiet shelf visual system is incomplete: ${token}`);
check(cssSource.includes("grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr))"), "Cards are still packed into narrow overloaded columns");

const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const html = htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const dataBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, {
  url: "http://localhost/#/items",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole
});
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillRect() {}, save() {}, translate() {}, rotate() {}, restore() {}, set fillStyle(value) {} });
window.scrollTo = () => {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
window.eval(`${runtime}\n//# sourceURL=codex.min.js`);
const settle = (ms = 55) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  await settle();
  const request = window.document.querySelector("script[data-codex-catalog]");
  check(request, "Catalog shelf route did not request lazy data");
  window.eval(`${dataBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(120);
  const document = window.document;
  const about = document.querySelector(".catalog-about-shelf");
  let filters = document.querySelector(".catalog-filter-shelf");
  check(about && !about.open && about.querySelector(".catalog-source") && about.querySelector(".catalog-stat-strip"), "Catalog provenance is not stored in a closed information shelf");
  check(filters && !filters.open && filters.querySelectorAll(".catalog-filter-row").length === 3, "Default catalog filters are not grouped into one closed shelf");
  check(filters.querySelector("summary")?.textContent.includes("Все предметы"), "Closed filter shelf does not explain its current state");
  check(document.querySelectorAll(".catalog-item-card").length === 96 && [...document.querySelectorAll(".catalog-item-card")].every((card) => card.classList.contains("collapsed")), "Catalog no longer starts as a calm compact card shelf");

  filters.open = true;
  filters.querySelector('[data-p="kind"][data-v="weapon"]').click();
  await settle(90);
  filters = document.querySelector(".catalog-filter-shelf");
  check(filters?.open && filters.querySelector("summary")?.textContent.includes("1 активно"), "Active catalog filter did not keep its shelf open with a clear summary");
  check(window.location.hash.includes("kind=weapon"), "Shelf filter is not shareable through the URL");

  window.location.hash = "#/bosses";
  await settle(100);
  let bossFilters = document.querySelector(".boss-filter-shelf");
  check(bossFilters && !bossFilters.open && bossFilters.querySelectorAll(".boss-filter-row").length === 3, "Default boss controls are not grouped into one closed shelf");
  check(document.querySelector(".boss-roadmap") && document.querySelector(".boss-search"), "Collapsing boss filters hid progression or search controls");
  bossFilters.open = true;
  bossFilters.querySelector('[data-boss-status="remaining"]').click();
  await settle(80);
  bossFilters = document.querySelector(".boss-filter-shelf");
  check(bossFilters?.open && bossFilters.querySelector("summary")?.textContent.includes("1 активно") && window.location.hash.includes("status=remaining"), "Active boss filter did not keep its shelf open and URL state");
  check(errors.length === 0, `Quiet shelf layout emitted runtime errors: ${errors.join("\n")}`);
  console.log("PASS: provenance and advanced filters are calm native shelves; cards, facts and actions keep a clear three-level hierarchy");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
