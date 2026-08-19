#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const sourceDom = new JSDOM(htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, ""));
const sourceDocument = sourceDom.window.document;
const desktopOrder = [...sourceDocument.querySelectorAll("#main-nav [data-nav]")].map((node) => node.dataset.nav);
const mobileOrder = [...sourceDocument.querySelectorAll(".mobile-tabs [data-nav]")].map((node) => node.dataset.nav);
check(desktopOrder.slice(0, 5).join(",") === "home,novice,crafts,items,bosses", `Full tree is not third in desktop priority: ${desktopOrder.join(",")}`);
check(mobileOrder.slice(0, 5).join(",") === "home,novice,crafts,items,bosses", `Full tree is not third in mobile priority: ${mobileOrder.join(",")}`);
check(sourceDocument.querySelector('[data-nav="crafts"].nav-primary'), "Full tree navigation has no primary identity");
sourceDom.window.close();

const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "css/modern.css"), "utf8");
for (const token of ["function fullTreeLink", "tree-primary-btn", "Полное дерево крафта", "card-facts-shelf", "secondary-shelf craft-plan-shelf", "setPicker(true)"]) {
  check(appSource.includes(token), `Full-tree-first runtime is incomplete: ${token}`);
}
for (const token of ["полное дерево — главный сценарий", ".tree-primary-btn", ".card-facts-shelf", ".secondary-shelf", ".craft-graph-page .craft-tree-branch"]) {
  check(cssSource.includes(token), `Full-tree-first visual hierarchy is incomplete: ${token}`);
}

const html = htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const dataBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, { url: "http://localhost/#/", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillRect() {}, save() {}, translate() {}, rotate() {}, restore() {}, set fillStyle(value) {} });
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
window.eval(`${runtime}\n//# sourceURL=codex.min.js`);
const settle = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  await settle();
  const document = window.document;
  const heroActions = [...document.querySelectorAll(".hero-actions .mode-btn")];
  check(heroActions.length === 2 && heroActions[1].classList.contains("primary-tree") && heroActions[1].getAttribute("href") === "#/crafts", "Home does not present Full tree as its second primary action");
  check(document.querySelector('.jump-grid .jump[href="#/crafts"]')?.textContent.includes("Полное дерево"), "Home quick access does not prioritize Full tree");
  check(document.querySelector(".home-era-shelf") && !document.querySelector(".home-era-shelf").open, "Secondary home era cards are not hidden in a shelf");

  window.location.hash = "#/items?s=Air%20Spinner";
  await settle(60);
  const request = document.querySelector("script[data-codex-catalog]");
  check(request, "Full-tree card audit did not request lazy data");
  window.eval(`${dataBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(120);
  const card = [...document.querySelectorAll(".catalog-item-card")].find((entry) => entry.textContent.includes("Air Spinner"));
  const actions = card?.querySelector(".card-links");
  const treeLink = actions?.querySelector(".tree-primary-btn");
  check(card && treeLink && actions.firstElementChild === treeLink, "Full tree is not the first and widest Air Spinner action");
  check(treeLink.getAttribute("href")?.includes("catalog%3AAirSpinner") && treeLink.textContent.includes("Все ветки до базовых ресурсов"), "Primary tree action does not explain or link to the full-page graph");
  check(card.querySelector(".card-facts-shelf") && !card.querySelector(".card-facts-shelf").open, "Secondary Air Spinner facts are not hidden by default");

  treeLink.click();
  await settle(130);
  const branch = document.getElementById("craft-tree-branch");
  const planShelf = document.querySelector(".craft-plan-shelf");
  const recommendationShelf = document.querySelector(".craft-recommendations-shelf");
  check(window.location.hash.includes("#/crafts?item=catalog%3AAirSpinner"), "Primary action did not open the shareable full-tree route");
  check(branch && branch.textContent.includes("Аир Спиннер") && branch.querySelector("#craft-tree-inline-body > .tnode"), "Full-page tree did not render the selected Air Spinner root");
  check(document.activeElement === branch, "Direct tree route did not focus the primary graph section");
  check(Boolean(branch.compareDocumentPosition(planShelf) & window.Node.DOCUMENT_POSITION_FOLLOWING) && Boolean(branch.compareDocumentPosition(recommendationShelf) & window.Node.DOCUMENT_POSITION_FOLLOWING), "Plan or recommendations are still placed before the full tree");
  check(!planShelf.open && !recommendationShelf.open, "Secondary craft plan or recommendations compete with the selected tree by default");

  document.getElementById("craft-tree-clear").click();
  await settle(100);
  check(!document.getElementById("craft-tree-picker").hidden && document.getElementById("craft-tree-add").getAttribute("aria-expanded") === "true", "Clearing the primary tree did not immediately reopen result selection");
  check(document.querySelector("#craft-tree-choice-grid[data-ready='1']"), "Empty primary tree did not prepare its result shelf automatically");
  check(errors.length === 0, `Full-tree-first flow emitted runtime errors: ${errors.join("\n")}`);
  console.log("PASS: Full tree is the primary navigation/card action/page section; secondary facts, plan, statistics and recommendations stay in shelves");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
