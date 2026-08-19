#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const html = fs.readFileSync(path.join(root, "index.html"), "utf8")
  .replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, {
  url: "http://localhost/#/biomes?danger=high",
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
const settle = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));
const cardNames = () => [...window.document.querySelectorAll(".biome-card h3")].map((node) => node.textContent.trim());

(async () => {
  await settle();
  check(window.document.querySelectorAll(".biome-card").length === 5, "High-danger filter does not return exactly five biomes");
  check([...window.document.querySelectorAll(".biome-card .danger-pill")].every((pill) => pill.classList.contains("high")), "High-danger filter leaked another risk level");
  check(window.document.querySelector('[data-biome-danger="high"]').classList.contains("active"), "Selected biome danger is not visually active");
  check(!window.document.getElementById("biome-s"), "Redundant text search is still rendered for eighteen biomes");
  check(!window.CALAMITY_ITEM_INDEX, "Biome filters unexpectedly loaded the heavy item catalog");

  const trigger = window.document.querySelector("[data-biome-view]");
  const firstName = trigger.dataset.biomeView;
  trigger.focus();
  trigger.click();
  await settle();
  const modal = window.document.getElementById("biome-modal");
  const shell = window.document.querySelector(".shell");
  const close = window.document.getElementById("biome-modal-close");
  check(!modal.hidden && window.document.body.classList.contains("biome-open"), "Biome image did not open in the full-screen gallery");
  check(shell.hasAttribute("inert") && window.document.activeElement === close, "Biome gallery did not isolate the background or focus its close button");
  check(window.document.getElementById("biome-modal-title").textContent === firstName, "Biome gallery opened the wrong image");
  modal.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  check(window.document.getElementById("biome-modal-title").textContent !== firstName, "Right arrow did not advance the biome gallery");
  check(window.document.getElementById("biome-modal-count").textContent === "2 / 5", "Biome gallery counter did not advance");
  window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  await settle();
  check(modal.hidden && !shell.hasAttribute("inert"), "Escape did not close the biome gallery or restore the page");
  check(window.document.activeElement === trigger, "Biome gallery did not return focus to its originating image");

  window.document.querySelector('[data-biome-danger="dead"]').click();
  await settle();
  check(cardNames().length === 1 && cardNames()[0] === "Бездна", "Deadly filter did not resolve to the Abyss");
  check(window.location.hash.includes("danger=dead"), "Biome danger state is not encoded in the URL");
  check(errors.length === 0, `Biome filter/gallery flow emitted errors: ${errors.join("\n")}`);
  console.log("PASS: compact biome danger filters and accessible full-screen gallery work without text search or catalog data");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exitCode = 1;
});
