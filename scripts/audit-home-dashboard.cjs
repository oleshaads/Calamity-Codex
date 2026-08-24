#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "css/modern.css"), "utf8");
check(appSource.includes("function bossProgressSnapshot") && appSource.includes("home-command-grid") && appSource.includes("Что делать дальше") && appSource.includes("craftPlanRuns"), "Home personal dashboard is not connected to quest, boss and craft-plan state");
for (const token of [".home-command-card.quest", ".home-command-card.boss", ".home-command-card.plan", ".home-command-progress", ".home-command-plan-meta"]) {
  check(cssSource.includes(token), `Home personal dashboard styling is incomplete: ${token}`);
}

const html = htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
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
window.localStorage.setItem("calamity-codex", JSON.stringify({
  doneQuests: [1, 2],
  defeatedBosses: ["king-slime"],
  craftPlan: [["vanilla:427", 2]],
  favorites: { item: [], boss: [], craft: [] }
}));
window.HTMLCanvasElement.prototype.getContext = () => ({
  clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillRect() {}, save() {}, translate() {}, rotate() {}, restore() {},
  set fillStyle(value) {}
});
window.scrollTo = () => {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
window.eval(`${runtime}\n//# sourceURL=codex.min.js`);
const settle = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  await settle();
  const document = window.document;
  const cards = [...document.querySelectorAll(".home-command-card")];
  check(cards.length === 3 && document.getElementById("home-command-title")?.textContent === "Что делать дальше", "Home dashboard does not render three personal next-step cards");
  const quest = document.querySelector(".home-command-card.quest");
  const boss = document.querySelector(".home-command-card.boss");
  const plan = document.querySelector(".home-command-card.plan");
  check(quest?.getAttribute("href") === "#/novice?q=3" && quest.textContent.includes("Глава 3") && quest.textContent.includes("2 из 30"), "Home dashboard did not resume the first unfinished quest");
  check(boss?.getAttribute("href")?.includes(encodeURIComponent("Пустынный бич")) && boss.textContent.includes("Пустынный бич") && boss.textContent.includes("1 из 54"), "Home dashboard did not advance to the next undefeated boss");
  check(plan?.getAttribute("href") === "#/crafts?plan=1" && plan.textContent.includes("1 цель") && plan.textContent.includes("2 крафта"), "Home dashboard did not summarize the saved shared craft plan");
  check([...document.querySelectorAll(".home-command-card-head img")].every((image) => /^assets\//.test(image.getAttribute("src") || "")), "Home dashboard uses non-local quest, boss or craft art");
  check(document.querySelector(".hs-stats a[href='#/bosses'] b")?.textContent === "1/54", "Hero summary still shows a static boss total instead of personal victories");
  check(document.querySelector(".hs-stats a[href='#/crafts?plan=1'] b")?.textContent === "1", "Hero summary does not show the current craft-plan target count");
  check(!document.querySelector("script[data-codex-catalog]"), "Personal home dashboard eagerly loaded the heavy item/recipe catalog");
  check(errors.length === 0, `Home personal dashboard emitted runtime errors: ${errors.join("\n")}`);
  console.log("PASS: home dashboard shows the saved next quest, next undefeated boss and craft plan without loading the heavy catalog");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
