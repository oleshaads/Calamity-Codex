#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const html = fs.readFileSync(path.join(root, "index.html"), "utf8")
  .replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const coreBundle = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const catalogBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");

function createRuntime(hash) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error));
  virtualConsole.on("error", (error) => errors.push(error));
  const dom = new JSDOM(html, {
    url: `http://localhost/${hash}`,
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
  window.eval(`${coreBundle}\n//# sourceURL=codex.min.js`);
  return { dom, window, errors };
}

const settle = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  const home = createRuntime("#/");
  await settle();
  const homeText = home.window.document.getElementById("app")?.textContent || "";
  check(home.window.document.querySelector(".hero h1"), "Core-only home route did not render");
  check(/2[\s\u00a0]?535/.test(homeText), "Core-only home route lost the catalog summary count");
  check(!home.window.CALAMITY_ITEM_INDEX, "Heavy catalog data executed during initial home startup");
  check(!home.window.document.querySelector("script[data-codex-catalog]"), "Home route requested the lazy catalog bundle eagerly");
  check(home.errors.length === 0, `Core-only home route emitted runtime errors: ${home.errors.join("\n")}`);
  home.dom.window.close();

  const items = createRuntime("#/items");
  await settle();
  const request = items.window.document.querySelector("script[data-codex-catalog]");
  check(items.window.document.querySelector(".catalog-boot"), "Direct catalog route has no non-blocking loading state");
  check(request && /codex-data\.min\.js\?v=20260819-core78$/.test(request.src), "Direct catalog route did not request the versioned lazy bundle");

  // jsdom does not fetch dynamically appended scripts. Execute the exact
  // production artifact and fire its load callback to exercise hydration.
  items.window.eval(`${catalogBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(20);
  check(items.window.document.querySelector(".items-page"), "Catalog route did not render after lazy hydration");
  check(items.window.document.body.style.getPropertyValue("--theme-image").includes("assets/headers/items.webp"), "Items route did not apply the armory background");
  check(items.window.document.body.style.getPropertyValue("--theme-filter").includes("saturate(.78)"), "Items armory background is not visually subdued");
  check(items.window.document.querySelectorAll(".full-catalog-grid .card").length === 96, "Catalog hydration did not render the first 96-card page");
  check(items.window.CALAMITY_ITEM_INDEX?.items?.length === 2535, "Calamity catalog payload is incomplete after hydration");
  check(items.window.CALAMITY_VANILLA_TREE_INDEX?.items?.length >= 5000, "Vanilla catalog payload is incomplete after hydration");
  check(items.window.document.getElementById("app")?.getAttribute("aria-busy") === null, "Catalog remains marked busy after hydration");
  check(items.window.document.getElementById("item-sort")?.value === "stage", "Catalog does not default to progression sorting");
  const defaultCards = [...items.window.document.querySelectorAll(".full-catalog-grid .card")];
  check(defaultCards.every((card) => card.dataset.stage === "pre"), "Unbound items still appear before Pre-Hardmode in progression sorting");
  check(defaultCards.every((card) => card.querySelector(".stage-pill")?.textContent === "Прехардмод"), "Catalog cards do not expose their progression stage");
  check(items.window.document.querySelector('[data-p="era"][data-v="any"] em')?.textContent === "433", "Unbound-stage filter count is incorrect");
  check(items.window.document.querySelector('[data-p="era"][data-v="pre"] em')?.textContent === "598", "Pre-Hardmode filter count is incorrect");
  const endChip = items.window.document.querySelector('[data-p="era"][data-v="end"]');
  check(endChip?.querySelector("em")?.textContent === "83", "Final-stage filter count is incorrect");
  endChip.click();
  await settle(40);
  check(items.window.document.querySelectorAll('.full-catalog-grid .card[data-stage="end"]').length === 83, "Final-stage filter did not isolate 83 final items");
  check(items.window.location.hash.includes("era=end"), "Catalog progression filter is not encoded in the URL");

  let sortSelect = items.window.document.getElementById("item-sort");
  sortSelect.value = "name";
  sortSelect.dispatchEvent(new items.window.Event("change", { bubbles: true }));
  await settle(40);
  const titleNodes = [...items.window.document.querySelectorAll(".full-catalog-grid .card-title")]
    .sort((left, right) => Number(left.closest(".card")?.dataset.masonryIndex || 0) - Number(right.closest(".card")?.dataset.masonryIndex || 0));
  const titles = titleNodes.map((node) => node.childNodes[0]?.textContent.trim() || "");
  check(titles.every((title, index) => index === 0 || titles[index - 1].localeCompare(title, "ru") <= 0), "Russian-name catalog sorting is not ordered");
  check(items.window.location.hash.includes("sort=name"), "Catalog sorting is not encoded in the URL");

  sortSelect = items.window.document.getElementById("item-sort");
  sortSelect.value = "type";
  sortSelect.dispatchEvent(new items.window.Event("change", { bubbles: true }));
  await settle(40);
  const kinds = [...items.window.document.querySelectorAll(".full-catalog-grid .kind-pill")]
    .sort((left, right) => Number(left.closest(".card")?.dataset.masonryIndex || 0) - Number(right.closest(".card")?.dataset.masonryIndex || 0))
    .map((node) => node.textContent.trim());
  check(kinds.every((kind, index) => index === 0 || kinds[index - 1].localeCompare(kind, "ru") <= 0), "Catalog type sorting is not grouped");
  items.window.document.getElementById("item-random").click();
  await settle(40);
  check(items.window.location.hash.includes("era=end") && items.window.location.hash.includes("s="), "Random item discarded active progression filters");
  check([...items.window.document.querySelectorAll(".full-catalog-grid .card")].every((card) => card.dataset.stage === "end"), "Random item escaped the active final-stage pool");
  check(items.errors.length === 0, `Lazy catalog/sorting flow emitted runtime errors: ${items.errors.join("\n")}`);
  items.dom.window.close();

  console.log("PASS: staged catalog cards, five availability filters, three sorts and filter-aware random choice work");
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
