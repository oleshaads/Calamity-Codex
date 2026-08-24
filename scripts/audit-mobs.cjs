#!/usr/bin/env node
// Аудит вкладки «Мобы»: целостность данных, локальные спрайты, русские имена,
// группировка по событиям/биомам и рабочий ленивый рендер страницы.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(process.argv[2] || "calamity-codex");
const fail = (message) => { throw new Error(message); };
const check = (condition, message) => { if (!condition) fail(message); };

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "js/mobs.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(root, "js/mob-guide.js"), "utf8"), ctx);
const index = ctx.window.CALAMITY_MOB_INDEX;
const guide = ctx.window.CALAMITY_MOB_GUIDE;
check(index && Array.isArray(index.mobs) && index.mobs.length >= 600, `Expected at least 600 mobs, got ${index?.mobs?.length || 0}`);
const mobs = index.mobs.map((r) => ({ id: r[0], src: r[1], en: r[2], ru: r[3], kind: r[4], hp: r[5], tags: String(r[8] || "").split(",").filter(Boolean), desc: r[9], art: r[10] }));
const vanilla = mobs.filter((m) => m.src === "v");
const calamity = mobs.filter((m) => m.src === "c");
check(vanilla.length >= 400 && calamity.length >= 200, `Unexpected split: ${vanilla.length} vanilla / ${calamity.length} calamity`);
check(mobs.every((m) => !m.art || fs.existsSync(path.join(root, m.art))), "A mob references a missing local sprite");
const withArt = mobs.filter((m) => m.art).length;
check(withArt / mobs.length > 0.95, `Mob sprite coverage is too low: ${withArt}/${mobs.length}`);
const cyr = (s) => /[А-Яа-яЁё]/.test(s);
check(calamity.every((m) => cyr(m.ru)), "A Calamity mob lacks a Russian display name");
check(vanilla.filter((m) => cyr(m.ru)).length / vanilla.length > 0.97, "Vanilla mobs are missing official Russian names");
check(vanilla.filter((m) => cyr(m.desc || "")).length >= 380, "Official Russian bestiary flavor coverage dropped");
check(mobs.filter((m) => m.hp >= 0).length >= 550, "Mob HP stats coverage dropped");
check(Object.keys(index.tagLabels || {}).length >= 50, "Bestiary tag labels are missing");
check(Object.values(index.tagLabels).every((v) => typeof v === "string" && v.length), "Empty bestiary tag label");
check(Array.isArray(guide.events) && guide.events.length >= 14, "Event guide is incomplete");
check(guide.events.every((e) => e.summon && e.tip && /[А-Яа-яЁё]/.test(e.summon + e.tip)), "An event lacks Russian summon/tip guidance");
check(Array.isArray(guide.biomes) && guide.biomes.length >= 24, "Biome grouping is incomplete");
const tagSet = new Set();
mobs.forEach((m) => m.tags.forEach((t) => tagSet.add(t)));
for (const g of [...guide.events, ...guide.biomes]) {
  check(g.tags.every((t) => tagSet.has(t) || t.startsWith("e:SlimeRain")), `Guide group ${g.id} references unknown tags: ${g.tags.join(",")}`);
}

// Цветные слизни — не одинаковые серые копии: игровые тинты применены к кадрам.
const spriteBytes = (name) => fs.readFileSync(path.join(root, "assets/mob-sprites", name));
check(!spriteBytes("v-green-slime.png").equals(spriteBytes("v-blue-slime.png")), "Green Slime sprite is not tinted (identical to Blue Slime)");
check(!spriteBytes("v-pinky.png").equals(spriteBytes("v-blue-slime.png")), "Pinky sprite is not tinted");

// Ванильные лут-таблицы из ItemDropDatabase.cs
vm.runInContext(fs.readFileSync(path.join(root, "js/vanilla-drops.js"), "utf8"), ctx);
const dropsIndex = ctx.window.CALAMITY_VANILLA_DROPS;
check(dropsIndex && dropsIndex.npc && Object.keys(dropsIndex.npc).length >= 300, "Vanilla drop tables are missing or too small");
const dropPairs = Object.values(dropsIndex.npc).reduce((sum, rows) => sum + rows.length, 0);
check(dropPairs >= 1200, `Expected at least 1200 vanilla NPC→item drops, got ${dropPairs}`);
check((dropsIndex.npc["243"] || []).some((row) => row[0] === 1519), "Ice Golem is missing its Frost Core drop");
check((dropsIndex.npc["3"] || []).some((row) => row[0] === 216 && row[1] === 50), "Zombie is missing its 1/50 Shackle drop");

const htmlSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
check(/data-nav="mobs"/.test(htmlSource), "Mobs section is missing from navigation");
const html = htmlSource.replace(/<script\b[^>]*src=[^>]*><\/script>/g, "");
const runtime = fs.readFileSync(path.join(root, "js/codex.min.js"), "utf8");
const dataBundle = fs.readFileSync(path.join(root, "js/codex-data.min.js"), "utf8");
const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", (error) => errors.push(error));
const dom = new JSDOM(html, { url: "http://localhost/#/mobs", runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
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
  const request = document.querySelector("script[data-codex-catalog]");
  check(request, "Mobs route did not request the lazy catalog bundle");
  window.eval(`${dataBundle}\n//# sourceURL=codex-data.min.js`);
  request.onload();
  await settle(150);
  check(document.querySelector(".page-head h1")?.textContent === "Мобы и события", "Mobs page did not render its header");
  const groups = [...document.querySelectorAll(".mob-group")];
  check(groups.length >= 35, `Mobs page rendered too few groups: ${groups.length}`);
  const bloodMoon = document.getElementById("mob-group-blood-moon");
  check(bloodMoon, "Blood Moon event group is missing");
  bloodMoon.open = true;
  bloodMoon.dispatchEvent(new window.Event("toggle"));
  await settle(80);
  check(bloodMoon.querySelectorAll(".mob-card").length >= 10, "Blood Moon group did not lazily render its mob cards");
  check(bloodMoon.querySelector(".mob-event-info")?.textContent.includes("Как начинается"), "Event group lacks Russian summon guidance");
  check([...bloodMoon.querySelectorAll(".mob-card img")].every((img) => /assets\/mob-sprites\//.test(img.getAttribute("src") || "")), "Blood Moon cards use non-local art");
  window.location.hash = "#/mobs?q=зомби";
  await settle(150);
  check(document.querySelectorAll(".mob-results .mob-card").length >= 5, "Russian mob search returned no results");
  window.location.hash = "#/mobs?src=c&kind=boss";
  await settle(150);
  const note = document.querySelector(".mob-controls-note");
  check(note && /по фильтру/.test(note.textContent), "Source/kind filters are not applied");
  // Интеграция с крафтами: упоминания мобов кликабельны и открывают карточку существа
  window.location.hash = "#/crafts?item=catalog%3AWulfrumBattery";
  await settle(250);
  const mentions = [...document.querySelectorAll(".npc-tip")];
  // Справочник рекомендаций удалён со страницы дерева, поэтому проверяем
  // кликабельные упоминания существ в источниках самого графа.
  check(mentions.length >= 5, "Craft tree does not auto-link mob mentions");
  const wulfrum = mentions.find((tip) => /^Wulfrum/.test(tip.dataset.npc || ""));
  check(wulfrum, "Craft sources lost their clickable mob names");
  wulfrum.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await settle(150);
  const tip = document.getElementById("tip-card");
  check(tip && !tip.hidden, "Clicking a mob mention did not open the creature card");
  check(/Противник · Каламити/.test(tip.querySelector(".tip-card-title small")?.textContent || ""), "Creature card lacks its kind/source label");
  check(tip.querySelector(".mob-detail-overview"), "Creature card lacks HP/damage/defense stats from the mob index");
  check([...tip.querySelectorAll(".fact span")].some((s) => s.textContent === "Биомы и время"), "Creature card lacks biome/time tags");
  check(tip.querySelector('a[href^="#/mobs?q="]'), "Creature card does not link back to the mob bestiary");
  // Ванильный моб: карточка существа показывает локальные лут-таблицы игры
  window.location.hash = "#/mobs?g=night";
  await settle(200);
  const night = document.getElementById("mob-group-night");
  const zombieCard = [...night.querySelectorAll(".mob-card")].find((card) => card.querySelector(".mob-card-name")?.dataset.npc === "Zombie");
  check(zombieCard && zombieCard.querySelector(".mob-drop-link"), "Vanilla mob card lacks its local drop counter");
  zombieCard.querySelector(".mob-card-name").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  await settle(150);
  const zombieTip = document.getElementById("tip-card");
  const zombieChips = [...zombieTip.querySelectorAll(".npc-drop-chip")];
  check(zombieChips.length >= 3 && zombieChips.every((chip) => /[А-Яа-яЁё]/.test(chip.textContent)), "Vanilla creature card does not list its game drop table in Russian");
  check(zombieTip.querySelector('.npc-drop-chip[href^="#/crafts?item=vanilla%3A"]'), "Known vanilla drops do not link to the full craft tree");
  // Новинки 1.4.5 без карточки в каталоге помечаются честной биркой, а не битой ссылкой
  check([...zombieTip.querySelectorAll(".npc-drop-chip.is-new .new-mark")].length >= 1, "New 1.4.5 drops are not labeled honestly");
  check(errors.length === 0, `Mobs page emitted runtime errors: ${errors.join("\n")}`);
  console.log(`PASS: ${mobs.length} mobs (${vanilla.length} vanilla + ${calamity.length} Calamity) render with local sprites, Russian names, event summon guides, biome groups and clickable craft mentions`);
  dom.window.close();
})().catch((error) => {
  console.error(error.stack || error);
  dom.window.close();
  process.exit(1);
});
