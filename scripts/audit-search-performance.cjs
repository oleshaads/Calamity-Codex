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
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, {
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
window.HTMLElement.prototype.scrollIntoView = () => {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
window.eval(`${coreBundle}\n//# sourceURL=codex.min.js`);
const settle = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(predicate, timeout = 2000) {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeout) return false;
    await settle(25);
  }
  return true;
}

(async () => {
  const input = window.document.getElementById("global-search");
  input.value = "деревянный меч";
  input.dispatchEvent(new window.Event("input", { bubbles: true }));
  await settle(150);
  const request = window.document.querySelector("script[data-codex-catalog]");
  check(request && /codex-data\.min\.js\?v=20260819-core71$/.test(request.src), "First global search did not request the current lazy data bundle");
  window.eval(`${catalogBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  const htmlElement = window.document.documentElement;
  await waitFor(() => htmlElement.dataset.searchIndex === "ready");

  const vanillaHit = window.document.querySelector('#search-panel a[href*="vanilla%3A"], #search-panel a[href*="vanilla:"]');
  check(vanillaHit, "Global search did not return a vanilla Terraria item");
  check(htmlElement.dataset.vanillaItems === "ready", "Global search did not prepare vanilla item names");
  check(!htmlElement.dataset.vanillaRecipes, "Global search eagerly expanded all 3502 vanilla recipes");
  check(htmlElement.dataset.searchIndex === "ready", "Split search indexes did not finish their background warmup");

  window.location.hash = vanillaHit.getAttribute("href").replace(/^#/, "");
  await settle(80);
  check(htmlElement.dataset.vanillaRecipes === "ready", "Opening a craft tree did not lazily prepare vanilla recipes");
  check(errors.length === 0, `Split search/recipe flow emitted errors: ${errors.join("\n")}`);
  console.log("PASS: global search builds 5087 vanilla names without recipes; craft route expands recipes on demand");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exitCode = 1;
});
