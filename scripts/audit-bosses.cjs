#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };
const context = { window: {}, CODEX: {} };
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "js/bosses.js"), "utf8"), context, { filename: "js/bosses.js" });
const bosses = context.CODEX.bosses || [];
const minis = context.CODEX.minis || [];
const entries = [...bosses, ...minis];
const vanilla = bosses.filter((boss) => String(boss.type).startsWith("Ваниль"));
const calamity = bosses.filter((boss) => boss.type === "Каламити");
const hidden = bosses.filter((boss) => boss.kind === "hidden");

check(bosses.length === 49, `Expected 49 full boss cards, got ${bosses.length}`);
check(minis.length === 5, `Expected 5 Calamity mini-boss cards, got ${minis.length}`);
check(entries.length === 54, `Expected 54 total boss encounters, got ${entries.length}`);
check(vanilla.length === 19 && calamity.length === 26 && hidden.length === 4, `Wrong category totals: vanilla ${vanilla.length}, Calamity ${calamity.length}, hidden ${hidden.length}`);
check(new Set(entries.map((boss) => boss.id)).size === entries.length, "Boss IDs are not unique");
check(entries.every((boss) => ["id", "name", "en", "era", "type", "where", "when", "summon", "drops", "tip", "art"].every((key) => String(boss[key] || "").trim())), "A boss card is missing a required detail field");
check(entries.every((boss) => fs.existsSync(path.join(root, boss.art))), "A boss card references missing local art");
check(vanilla.every((boss) => boss.art.startsWith("assets/boss-sprites/vanilla/")), "A vanilla boss still uses a lore, mask, summon-item or trophy replacement");
check(!entries.some((boss) => /^assets\/(?:item-sprites|sprites|vanilla-sprites)\//.test(boss.art)), "A boss card still substitutes an inventory item for the actual boss image");
const vanillaBossArtDir = path.join(root, "assets/boss-sprites/vanilla");
const vanillaBossArt = fs.readdirSync(vanillaBossArtDir).filter((name) => name.endsWith(".png"));
check(vanillaBossArt.length === 19, `Expected 19 genuine vanilla boss images, got ${vanillaBossArt.length}`);
for (const file of vanillaBossArt) {
  const png = fs.readFileSync(path.join(vanillaBossArtDir, file));
  check(png.subarray(1, 4).toString() === "PNG" && png.readUInt32BE(16) > 0 && png.readUInt32BE(20) > 0, `Invalid vanilla boss PNG: ${file}`);
}
check(fs.existsSync(path.resolve("scripts/fetch-boss-art.sh")) && fs.readFileSync(path.resolve("scripts/fetch-boss-art.sh"), "utf8").includes("bestiary/npc_${id}.png"), "Vanilla boss art is not reproducibly fetched by NPC ID");
check(!entries.some((boss) => /\s\/\s/.test(boss.name) || /\s\/\s/.test(boss.en)), "Multiple bosses are still merged into one card");
for (const id of ["eater-of-worlds", "brain-of-cthulhu", "hive-mind", "perforators", "twins", "destroyer", "skeletron-prime", "duke-fishron", "empress-of-light", "betsy", "lunatic-cultist", "ceaseless-void", "storm-weaver", "signus", "primordial-wyrm", "hekate", "permafrost", "the-lorde"]) {
  check(entries.some((boss) => boss.id === id), `Missing individual boss entry: ${id}`);
}
const appSource = fs.readFileSync(path.join(root, "js/app.js"), "utf8");
const cssSource = fs.readFileSync(path.join(root, "css/modern.css"), "utf8");
check(appSource.includes("function bossRoadmapHTML") && appSource.includes("boss-era-progress-card") && appSource.includes("ближайший этап") && appSource.includes("основной список"), "Personal boss roadmap is not generated from the victory journal");
check(cssSource.includes("Персональный маршрут по журналу побед") && cssSource.includes(".boss-next-card") && cssSource.includes(".boss-era-progress"), "Personal boss roadmap has no responsive visual hierarchy");

const html = fs.readFileSync(path.join(root, "index.html"), "utf8").replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
virtualConsole.on("error", (error) => errors.push(error));
const dom = new JSDOM(html, { url: "http://localhost/#/bosses", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = () => ({ clearRect() {}, beginPath() {}, arc() {}, fill() {}, fillRect() {}, save() {}, translate() {}, rotate() {}, restore() {}, set fillStyle(value) {} });
window.scrollTo = () => {};
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
window.eval(`${runtime}\n//# sourceURL=codex.min.js`);
const settle = (ms = 35) => new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  await settle();
  const document = window.document;
  check(document.querySelectorAll("#boss-grid .boss-card").length === 54, "All-bosses route does not render 54 cards");
  check(document.querySelectorAll("#boss-grid [data-boss-defeated]").length === 54, "Boss cards do not expose a victory tracker");
  check(document.querySelector(".boss-progress output b")?.textContent === "0", "Fresh boss journal does not start at 0/54");
  check(document.querySelector('[data-boss-status="remaining"] em')?.textContent === "54" && document.querySelector('[data-boss-status="defeated"] em')?.textContent === "0", "Fresh victory-filter counts are incorrect");
  check(document.querySelector(".boss-roadmap") && document.querySelectorAll(".boss-era-progress-card").length === 4, "Default bestiary does not render the personal roadmap and four era summaries");
  check(document.querySelectorAll(".boss-next-card").length === 1 && document.querySelector(".boss-next-card .boss-next-copy > b")?.textContent === "Король слизней", "Fresh roadmap does not identify the earliest uncompleted encounter");
  check(/^assets\/boss-sprites\//.test(document.querySelector(".boss-next-art img")?.getAttribute("src") || ""), "Roadmap target does not use genuine local boss art");

  const firstVictoryButton = document.querySelector("#boss-grid [data-boss-defeated]");
  const firstBossId = firstVictoryButton?.dataset.bossDefeated;
  firstVictoryButton.click();
  await settle(50);
  const savedVictories = JSON.parse(window.localStorage.getItem("calamity-codex") || "{}").defeatedBosses || [];
  check(savedVictories.includes(firstBossId), "Victory mark was not persisted in the hero profile");
  check(document.querySelector(`[data-boss-id="${firstBossId}"]`)?.classList.contains("is-defeated"), "Defeated boss card did not receive its completed state");
  check(document.querySelector(`[data-boss-defeated="${firstBossId}"]`)?.getAttribute("aria-pressed") === "true", "Victory control does not announce its pressed state");
  check(document.querySelector(".boss-progress output b")?.textContent === "1", "Boss journal did not advance to 1/54");
  check(document.querySelector(".boss-next-card .boss-next-copy > b")?.textContent === "Пустынный бич", "Roadmap did not advance after recording the first victory");
  check(document.querySelector('[data-roadmap-era="pre"] small')?.textContent.startsWith("1 из"), "Era roadmap progress did not advance with the journal");

  document.querySelector('[data-boss-status="remaining"]').click();
  await settle(50);
  check(document.querySelectorAll("#boss-grid .boss-card").length === 53, "Remaining-boss filter did not hide the completed encounter");
  check(window.location.hash.includes("status=remaining"), "Victory filter is not encoded in the URL");
  check(!document.querySelector(".boss-roadmap"), "Roadmap should yield space to an active result filter");
  document.querySelector('[data-boss-status="all"]').click();
  await settle(50);
  check(document.querySelectorAll("#boss-grid .boss-card").length === 54, "All-status filter did not restore the complete bestiary");
  check(document.querySelector(".boss-roadmap"), "Clearing filters did not restore the personal roadmap");

  const expectedCounts = { vanilla: "19", calamity: "26", hidden: "4", mini: "5" };
  for (const [kind, count] of Object.entries(expectedCounts)) {
    check(document.querySelector(`[data-boss-kind="${kind}"] em`)?.textContent === count, `Category chip ${kind} does not show ${count}`);
  }
  document.querySelector('[data-boss-kind="hidden"]').click();
  await settle();
  check(document.querySelectorAll("#boss-grid .hidden-boss-card").length === 4, "Hidden-boss filter does not show four cards");
  check([...document.querySelectorAll("#boss-grid .boss-card")].every((card) => card.querySelectorAll(".facts .fact").length === 4), "Hidden bosses do not use the same four-fact card as regular bosses");

  document.querySelector('[data-boss-kind="mini"]').click();
  await settle();
  check(document.querySelectorAll("#boss-grid .mini-boss-card").length === 5, "Mini-boss filter does not show five cards");
  check([...document.querySelectorAll("#boss-grid .mini-boss-card")].every((card) => card.querySelectorAll(".facts .fact").length === 4), "Mini-bosses do not use the regular complete card component");

  document.querySelector('[data-boss-kind="all"]').click();
  await settle();
  const search = document.getElementById("boss-s");
  search.value = "Геката";
  search.dispatchEvent(new window.Event("input", { bubbles: true }));
  await settle(220);
  check(document.querySelectorAll("#boss-grid .boss-card").length === 1 && document.querySelector("#boss-grid .card-title")?.textContent.includes("Геката"), "Boss search does not find the new Hekate card");
  check(errors.length === 0, `Complete boss-card flow emitted errors: ${errors.join("\n")}`);
  console.log("PASS: all 54 complete boss cards use genuine art, searchable filters, a persistent victory journal and an advancing personal roadmap");
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
