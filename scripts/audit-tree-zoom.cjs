#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
check(htmlSource.includes("data-modal-tree-zoom=\"in\"") && htmlSource.includes("data-modal-tree-zoom-label"), "Modal craft tree has no zoom controls");
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
check(appSource.includes("function applyTreeGraphZoom") && appSource.includes("function adjustModalTreeZoom") && appSource.includes("function adjustCraftTreeZoom"), "Shared inline/modal graph zoom engine is missing");
check(appSource.includes('surface.style.removeProperty("zoom")') && appSource.includes("graph.style.zoom = String(normalized)"), "Zoom is not isolated to the generated graph");
check(!/body\.style\.zoom\s*=/.test(appSource), "Inline zoom still scales the whole craft viewport");
check(appSource.includes('saveTreeScale("inline"') && appSource.includes('saveTreeScale("modal"'), "Tree zoom preferences are not persisted separately");
check(appSource.includes("event.ctrlKey") && appSource.includes('addEventListener("wheel"'), "Craft graph lacks Ctrl+wheel zoom");
const css = fs.readFileSync(path.join(root, "css/modern.css"), "utf8");
check(css.includes("Масштабируется только граф") && css.includes(".tree-body > .tnode") && css.includes(".craft-tree-inline-body > .tnode") && css.includes(".modal-tree-zoom-controls"), "Graph-only zoom styling is incomplete");

const html = htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const catalogBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, {
  url: "http://localhost/#/crafts?item=Desert%20Medallion",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  virtualConsole
});
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
  check(request, "Direct craft route did not request lazy catalog data");
  window.eval(`${catalogBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(110);
  const document = window.document;
  const section = document.getElementById("craft-tree-branch");
  const inlineBody = document.getElementById("craft-tree-inline-body");
  let inlineGraph = inlineBody?.querySelector(":scope > .tnode");
  check(section && inlineBody && inlineGraph, "Inline craft graph did not render");
  check(!inlineBody.style.zoom && inlineGraph.style.zoom === "1", "Initial inline zoom affects the viewport instead of only the graph");
  section.querySelector('[data-tree-zoom="in"]').click();
  await settle(40);
  inlineGraph = inlineBody.querySelector(":scope > .tnode");
  check(inlineGraph.style.zoom === "1.1" && !inlineBody.style.zoom, "Inline zoom-in did not scale only the graph");
  check(section.querySelector("[data-tree-zoom-label]")?.textContent === "110%", "Inline zoom label is stale");
  inlineBody.dispatchEvent(new window.WheelEvent("wheel", { deltaY: 100, ctrlKey: true, bubbles: true, cancelable: true }));
  await settle(40);
  check(inlineGraph.style.zoom === "1" && !inlineBody.style.zoom, "Ctrl+wheel did not zoom only the inline graph");
  const storedInline = JSON.parse(window.localStorage.getItem("calamity-codex") || "{}").treeZoom?.inline;
  check(storedInline === 1, "Inline graph zoom was not saved");

  // Справочник рекомендаций удалён со страницы дерева: быстрый модальный
  // граф теперь проверяется на карточках крафта внутри квеста маршрута.
  window.location.hash = "#/novice?q=1";
  await settle(90);
  const modalTrigger = document.querySelector(".craft-card .ing[data-ing]");
  check(modalTrigger, "Craft page has no ingredient trigger for the quick modal tree");
  modalTrigger.click();
  await settle(60);
  const modal = document.getElementById("tree-modal");
  const panel = modal.querySelector(".tree-panel");
  const modalBody = document.getElementById("tree-body");
  let modalGraph = modalBody.querySelector(":scope > .tnode");
  check(!modal.hidden && modalGraph, "Modal craft graph did not open");
  check(!panel.style.zoom && !modalBody.style.zoom && modalGraph.style.zoom === "1", "Initial modal graph scale leaks onto the window or viewport");
  modal.querySelector('[data-modal-tree-zoom="in"]').click();
  await settle(40);
  modalGraph = modalBody.querySelector(":scope > .tnode");
  check(modalGraph.style.zoom === "1.1" && !panel.style.zoom && !modalBody.style.zoom, "Modal zoom-in scaled more than the graph");
  check(modal.querySelector("[data-modal-tree-zoom-label]")?.textContent === "110%", "Modal zoom label is stale");
  modal.dispatchEvent(new window.KeyboardEvent("keydown", { key: "+", ctrlKey: true, bubbles: true, cancelable: true }));
  await settle(40);
  check(modalGraph.style.zoom === "1.2", "Modal keyboard zoom did not update the graph");
  modalBody.dispatchEvent(new window.WheelEvent("wheel", { deltaY: 100, ctrlKey: true, bubbles: true, cancelable: true }));
  await settle(40);
  check(modalGraph.style.zoom === "1.1", "Modal Ctrl+wheel zoom did not update the graph");
  const storedModal = JSON.parse(window.localStorage.getItem("calamity-codex") || "{}").treeZoom?.modal;
  check(storedModal === 1.1, "Modal graph zoom was not saved");
  modal.querySelector('[data-modal-tree-zoom="reset"]').click();
  await settle(40);
  check(modalGraph.style.zoom === "1" && modal.querySelector("[data-modal-tree-zoom-label]")?.textContent === "100%", "Modal reset did not restore 100% graph scale");
  check(errors.length === 0, `Tree zoom flow emitted runtime errors: ${errors.join("\n")}`);
  console.log("PASS: inline and modal craft trees zoom from 50% to 160% by buttons, keyboard or Ctrl+wheel without scaling their windows");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
