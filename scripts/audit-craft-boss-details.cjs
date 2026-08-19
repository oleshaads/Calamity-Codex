#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "css/modern.css"), "utf8");
for (const token of ["data-boss-detail=", "boss-detail-overview", "boss-detail-danger", "Полная карточка босса", "showNpcCard(bossLink.dataset.bossDetail"]) {
  check(appSource.includes(token) || cssSource.includes(token), `Complete craft boss details are missing: ${token}`);
}
for (const token of [".tip-card.boss-detail-card", ".boss-detail-state", ".boss-detail-overview", ".boss-detail-actions"]) {
  check(cssSource.includes(token), `Complete boss-card styling is missing: ${token}`);
}

const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const html = htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const dataBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, {
  url: "http://localhost/#/crafts?item=catalog%3AAirSpinner",
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
  check(request, "Direct Air Spinner craft route did not request lazy data");
  window.eval(`${dataBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(140);
  const document = window.document;
  const branch = document.getElementById("craft-tree-branch");
  const bossLinks = [...branch.querySelectorAll("#craft-tree-inspector [data-boss-detail]")];
  check(bossLinks.length === 2 && bossLinks.some((link) => link.textContent.includes("Разум улья")) && bossLinks.some((link) => link.textContent.includes("Перфоратор")), "Air Spinner tree inspector does not expose both related bosses as detail controls");
  const hiveMind = bossLinks.find((link) => link.textContent.includes("Разум улья"));
  const beforeHash = window.location.hash;
  hiveMind.click();
  await settle(80);

  const tip = document.getElementById("tip-card");
  check(!tip.hidden && tip.classList.contains("boss-detail-card"), "Clicking a craft boss did not open a pinned complete boss card");
  check(window.location.hash === beforeHash, "Craft boss click navigated away instead of explaining the boss in place");
  check(tip.querySelector(".tip-card-title b")?.textContent === "Разум улья" && tip.querySelector(".tip-card-title i")?.textContent.includes("The Hive Mind"), "Complete card has wrong RU/EN boss identity");
  const art = tip.querySelector(".npc-slot img");
  check(/^assets\/boss-sprites\/hive-mind\.png/.test(art?.getAttribute("src") || ""), "Complete craft boss card does not use genuine local boss art");
  check(tip.querySelectorAll(".boss-detail-overview > span").length === 3 && tip.querySelector(".boss-detail-danger i")?.style.width, "Complete boss card has no era, chapter and danger summary");
  const factLabels = [...tip.querySelectorAll(".tip-card-facts > .fact > span")].map((node) => node.textContent);
  for (const label of ["Где бой", "Когда идти", "Как призвать", "Что даст победа"]) check(factLabels.includes(label), `Complete craft boss card is missing: ${label}`);
  check(tip.querySelector("[data-boss-defeated]") && tip.querySelector('a[href^="#/bosses?q="]') && tip.querySelector('a[href^="#/novice?q="]') && tip.querySelector('a[href^="https://calamitymod.wiki.gg/"]'), "Complete boss card lacks victory, full card, guide or official wiki actions");
  check(document.activeElement === tip.querySelector("[data-tip-close]"), "Pinned complete boss card did not focus its close control");
  tip.querySelector("[data-tip-close]").click();
  await settle(35);
  check(tip.hidden && document.activeElement === hiveMind, "Closing complete boss information did not restore focus to the clicked craft boss");
  check(errors.length === 0, `Complete craft boss details emitted runtime errors: ${errors.join("\n")}`);
  console.log("PASS: clicking a boss in crafting opens all local art, progression, summon, reward, drop and journal details without leaving the tree");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
