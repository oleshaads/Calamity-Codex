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
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

const settle = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));
const visibleFocusable = (root) => [...root.querySelectorAll(FOCUSABLE)]
  .filter((element) => !element.closest("[hidden]") && element.getAttribute("aria-hidden") !== "true");

(async () => {
  const home = createRuntime("#/");
  const homeDocument = home.window.document;
  await settle();

  const itemIntent = homeDocument.querySelector('#main-nav a[href="#/items"]');
  itemIntent.dispatchEvent(new home.window.MouseEvent("pointerover", { bubbles: true }));
  const prefetch = homeDocument.querySelector('link[data-codex-prefetch]');
  check(prefetch && /codex-data\.min\.js\?v=20260819-core73$/.test(prefetch.href), "Catalog intent did not create the current versioned prefetch hint");
  check(!home.window.CALAMITY_ITEM_INDEX, "Catalog prefetch executed the heavy payload instead of only warming the cache");

  const menuButton = homeDocument.getElementById("menu-btn");
  const rail = homeDocument.getElementById("rail");
  const stage = homeDocument.querySelector(".stage");
  const mobileTabs = homeDocument.querySelector(".mobile-tabs");
  menuButton.focus();
  menuButton.click();
  await settle();
  check(rail.classList.contains("open") && homeDocument.body.classList.contains("menu-open"), "Mobile menu did not enter its open state");
  check(menuButton.getAttribute("aria-expanded") === "true" && menuButton.getAttribute("aria-label") === "Закрыть меню", "Mobile menu button state is not announced");
  check(stage.hasAttribute("inert") && mobileTabs.hasAttribute("inert"), "Mobile menu did not make background controls inert");
  check(rail.contains(homeDocument.activeElement), "Opening the mobile menu did not move focus into navigation");
  const railFocusable = visibleFocusable(rail);
  railFocusable.at(-1).focus();
  railFocusable.at(-1).dispatchEvent(new home.window.KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  check(homeDocument.activeElement === railFocusable[0], "Tab did not wrap inside the mobile menu");
  homeDocument.dispatchEvent(new home.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await settle();
  check(!rail.classList.contains("open") && !homeDocument.body.classList.contains("menu-open"), "Escape did not close the mobile menu");
  check(!stage.hasAttribute("inert") && !mobileTabs.hasAttribute("inert"), "Closing the mobile menu left background controls inert");
  check(homeDocument.activeElement === menuButton, "Closing the mobile menu did not restore focus to its trigger");
  check(home.errors.length === 0, `Mobile-menu accessibility flow emitted errors: ${home.errors.join("\n")}`);
  home.dom.window.close();

  const items = createRuntime("#/items?s=Baguette");
  await settle();
  const request = items.window.document.querySelector("script[data-codex-catalog]");
  items.window.eval(`${catalogBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle();
  const itemDocument = items.window.document;
  const baguetteCard = [...itemDocument.querySelectorAll(".catalog-item-card")].find((card) => card.textContent.includes("Baguette"));
  const baguetteSprite = baguetteCard?.querySelector("img.item-art");
  check(baguetteSprite?.getAttribute("src") === "assets/item-sprites/Baguette.png?v=20260819-core73", "Catalog still renders a stale unversioned Baguette animation sheet URL");
  // Full tree is intentionally a full-page primary link now. Create a focused
  // quick-preview trigger to regression-test the still-supported ingredient
  // modal without adding another competing control to every catalog card.
  const trigger = itemDocument.createElement("button");
  trigger.type = "button";
  trigger.dataset.tree = "catalog:Baguette";
  trigger.textContent = "Quick tree accessibility trigger";
  baguetteCard.appendChild(trigger);
  trigger.focus();
  trigger.click();
  await settle();
  const treeModal = itemDocument.getElementById("tree-modal");
  const treePanel = treeModal.querySelector(".tree-panel");
  const shell = itemDocument.querySelector(".shell");
  const close = itemDocument.getElementById("tree-close");
  check(!treeModal.hidden && itemDocument.body.classList.contains("tree-open"), "Craft tree did not open as a modal");
  check(treePanel.getAttribute("aria-labelledby") === "tree-dialog-title tree-root-name" && treePanel.getAttribute("aria-describedby") === "tree-legend", "Craft tree dialog has no programmatic title/description");
  check(shell.hasAttribute("inert") && itemDocument.querySelector(".mobile-tabs").hasAttribute("inert"), "Craft tree did not make the application background inert");
  check(itemDocument.activeElement === close, "Craft tree did not focus its close control");
  const treeFocusable = visibleFocusable(treePanel);
  treeFocusable.at(-1).focus();
  treeFocusable.at(-1).dispatchEvent(new items.window.KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
  check(itemDocument.activeElement === treeFocusable[0], "Tab did not wrap inside the craft-tree dialog");
  itemDocument.dispatchEvent(new items.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await settle();
  check(treeModal.hidden && !itemDocument.body.classList.contains("tree-open"), "Escape did not close the craft-tree dialog");
  check(!shell.hasAttribute("inert") && !itemDocument.querySelector(".mobile-tabs").hasAttribute("inert"), "Closing the craft tree left the application inert");
  check(itemDocument.activeElement === trigger, "Closing the craft tree did not restore focus to its trigger");
  check(items.errors.length === 0, `Craft-tree accessibility flow emitted errors: ${items.errors.join("\n")}`);
  items.dom.window.close();

  console.log("PASS: catalog intent prefetch, mobile-menu focus trap and modal craft-tree focus restoration work");
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
