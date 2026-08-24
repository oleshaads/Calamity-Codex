#!/usr/bin/env node
/*
 * Генератор индекса мобов (вкладка «Мобы»): ваниль + Calamity.
 *
 * Источники (закреплённые):
 *  - Ваниль: декомпилированный Terraria 1.4.4.1 (br4dnblehh/terraria-source-code):
 *      NPCID.cs                    — внутренний ключ → NPC ID;
 *      NPC.cs (SetDefaults2)       — базовые ОЗ/урон/защита;
 *      BestiaryDatabaseNPCsPopulator.cs — биомы/события/вторжения/время бестиария;
 *      Terraria.Localization.Content.{ru-RU,en-US}.NPCs.json — имена;
 *      Terraria.Localization.Content.ru-RU.Game.json — описания бестиария и подписи тегов;
 *      natan-dot-com/Terraria-Dataset — типы (враг/зверёк/босс) и спрайты.
 *  - Calamity: CalamityTeam/CalamityModPublic @ 1a8cebd (тот же коммит, что и npc-sources):
 *      NPCs/**\/*.cs — статы, кадры анимации, теги бестиария; PNG рядом с классом;
 *      Localization/en-US/Mods.CalamityMod.NPCs.hjson — имена.
 *    Русские имена: js/npc-ru.js + scripts/mob-ru-names.json (рукописный перевод).
 *
 * Использование:
 *   node scripts/build-mobs.mjs [--src /tmp/src] [--skip-art]
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const REPO = path.resolve(import.meta.dirname, "..");
const SRC = path.resolve(process.argv.includes("--src") ? process.argv[process.argv.indexOf("--src") + 1] : "/tmp/src");
const SKIP_ART = process.argv.includes("--skip-art");
const OUT_JS = path.join(REPO, "calamity-codex/js/mobs.js");
const OUT_ART = path.join(REPO, "calamity-codex/assets/mob-sprites");
const VAN = path.join(SRC, "vanilla");
const CAL = path.join(SRC, "calamity");
const DATASET = path.join(SRC, "dataset");

const read = (p) => fs.readFileSync(p, "utf8");
// Декомпил 1.4.5 использует CRLF, комментарии /*0x..*/, префиксы this. и byte.MaxValue.
const readCs = (p) => read(p)
  .replace(/\r/g, "")
  .replace(/\/\*[^*]*\*\//g, "")
  .replace(/\(int\) byte\.MaxValue|byte\.MaxValue/g, "255")
  .replace(/[ \t]+;/g, ";");
const methodEnd = (source, start) => {
  const candidates = ["\n\t\tpublic ", "\n\t\tprivate ", "\n  public ", "\n  private "]
    .map((needle) => source.indexOf(needle, start + 200)).filter((i) => i > start);
  return candidates.length ? Math.min(...candidates) : source.length;
};
// Локализация Terraria — JSON с висячими запятыми; чистим перед разбором.
const readJson = (p) => JSON.parse(read(p).replace(/^\uFEFF/, "").replace(/,(\s*[}\]])/g, "$1"));
const exists = fs.existsSync;
if (!exists(VAN) || !exists(CAL) || !exists(DATASET)) {
  console.error("Не найдены исходники в", SRC, "— нужны каталоги vanilla/, calamity/, dataset/");
  process.exit(1);
}
fs.mkdirSync(OUT_ART, { recursive: true });

/* ============================== ВАНИЛЬ ============================== */

// 1. Внутренний ключ -> id
const npcIdCs = readCs(path.join(VAN, "NPCID.cs"));
const KEY_TO_ID = new Map();
const ID_TO_KEY = new Map();
for (const m of npcIdCs.matchAll(/public const short (\w+) = (-?\d+);/g)) {
  const key = m[1]; const id = Number(m[2]);
  if (key === "Count" || id === 0) continue;
  KEY_TO_ID.set(key, id);
  if (id > 0 && !ID_TO_KEY.has(id)) ID_TO_KEY.set(id, key);
}

// 2. Локализация имён
const ruNpcNames = readJson((path.join(VAN, "Terraria.Localization.Content.ru-RU.NPCs.json"))).NPCName || {};
const enNpcNames = readJson((path.join(VAN, "Terraria.Localization.Content.en-US.NPCs.json"))).NPCName || {};
const ruGame = readJson((path.join(VAN, "Terraria.Localization.Content.ru-RU.Game.json")));
const FLAVOR = ruGame.Bestiary_FlavorText || {};
const COMMON_FLAVOR = ruGame.CommonBestiaryFlavor || {};
const TAG_LABELS = {};
for (const [group, prefix] of [["Bestiary_Biomes", "b"], ["Bestiary_Events", "e"], ["Bestiary_Invasions", "i"], ["Bestiary_Times", "t"]]) {
  for (const [k, v] of Object.entries(ruGame[group] || {})) TAG_LABELS[`${prefix}:${k}`] = v;
}
const flavorFor = (key) => {
  let text = FLAVOR[`npc_${key}`] || "";
  const ref = text.match(/^\{\$CommonBestiaryFlavor\.(\w+)\}$/);
  if (ref) text = COMMON_FLAVOR[ref[1]] || "";
  return text.replace(/\{\$[^}]+\}/g, "").trim();
};

// EN display name -> ключ (голова червя = наименьший id)
const EN_NAME_TO_KEY = new Map();
for (const [key, name] of Object.entries(enNpcNames)) {
  const id = KEY_TO_ID.get(key);
  if (id === undefined) continue;
  const prev = EN_NAME_TO_KEY.get(name);
  // предпочитаем положительный и наименьший id (голова червя)
  if (!prev) { EN_NAME_TO_KEY.set(name, key); continue; }
  const prevId = KEY_TO_ID.get(prev);
  if ((prevId < 0 && id > 0) || (prevId > 0 && id > 0 && id < prevId)) EN_NAME_TO_KEY.set(name, key);
}
// Соответствия для имён из датасета, отличающихся от локализации
const NAME_ALIASES = {
  "Ghost (enemy)": "Ghost", "Enchanted Sword (NPC)": "Enchanted Sword",
  "Blue Cultist Archer": "Cultist Archer", "Lunatic Devote": "Lunatic Devotee",
  "White Cultist Archer": "Cultist Archer"
};

// 3. Теги бестиария по id
const pop = readCs(path.join(VAN, "BestiaryPopulator.cs"));
const TAGS_BY_ID = new Map();
{
  const rx = /FindEntryByNPCID\((\d+)\)[\s\S]*?(?=FindEntryByNPCID|\n[ \t]+(?:private|public) )/g;
  for (const m of pop.matchAll(rx)) {
    const id = Number(m[1]);
    const body = m[0];
    const tags = TAGS_BY_ID.get(id) || new Set();
    for (const t of body.matchAll(/CommonTags\.SpawnConditions\.(Biomes|Events|Invasions|Times)\.(\w+)/g)) {
      const prefix = { Biomes: "b", Events: "e", Invasions: "i", Times: "t" }[t[1]];
      tags.add(`${prefix}:${t[2]}`);
    }
    if (tags.size) TAGS_BY_ID.set(id, tags);
  }
}

// 4. Статы из NPC.cs SetDefaults2 (базовые значения ветки)
const npcCs = readCs(path.join(VAN, "NPC.cs"));
const STATS_BY_ID = new Map();
const TINT_BY_TYPE = new Map();   // положительный type -> [r,g,b] из color = new Color(...)
const NETID_INFO = new Map();     // отрицательный netID -> статы и тинт варианта
const BODY_BY_ID = new Map();     // тело ветки SetDefaults (для флагов townNPC/friendly)
{
  const start = npcCs.indexOf("public void SetDefaults(int Type, NPCSpawnParams");
  const seg = npcCs.slice(start, methodEnd(npcCs, start));
  const condRx = /(?:else )?if \(((?:[^()]|\([^()]*\))*(?:Type|type)(?:[^()]|\([^()]*\))*)\)\s*\n[ \t]*\{/g;
  let m;
  while ((m = condRx.exec(seg))) {
    const cond = m[1];
    // собрать id из условия
    const ids = new Set();
    for (const eq of cond.matchAll(/[Tt]ype == (\d+)/g)) ids.add(Number(eq[1]));
    const range = cond.match(/[Tt]ype >= (\d+) && [Tt]ype <= (\d+)/);
    if (range) for (let i = Number(range[1]); i <= Number(range[2]); i++) ids.add(i);
    if (!ids.size) continue;
    // тело блока до балансировки скобок
    let depth = 1; let i = condRx.lastIndex; const bodyStart = i;
    while (depth > 0 && i < seg.length) { const ch = seg[i]; if (ch === "{") depth++; else if (ch === "}") depth--; i++; }
    const body = seg.slice(bodyStart, i);
    const grab = (name) => { const g = body.match(new RegExp(`(?:^|\\n)[ \\t]*(?:this\\.)?${name} = (\\d+);`)); return g ? Number(g[1]) : null; };
    const stats = { hp: grab("lifeMax"), dmg: grab("damage"), def: grab("defense") };
    const tintMatch = body.match(/(?:this\.)?color = new Color\((\d+), (\d+), (\d+)/);
    if (tintMatch) for (const id of ids) if (!TINT_BY_TYPE.has(id)) TINT_BY_TYPE.set(id, [Number(tintMatch[1]), Number(tintMatch[2]), Number(tintMatch[3])]);
    for (const id of ids) if (!BODY_BY_ID.has(id)) BODY_BY_ID.set(id, body);
    if (stats.hp === null && stats.dmg === null) continue;
    for (const id of ids) if (!STATS_BY_ID.has(id)) STATS_BY_ID.set(id, stats);
  }
  // Декомпил 1.4.5 часть групп оформляет как switch/case по this.type.
  for (const c of seg.matchAll(/((?:[ \t]*case \d+:\n)+)([\s\S]*?)(?=\n[ \t]*case |\n[ \t]*default:|\n[ \t]*\})/g)) {
    const ids = [...c[1].matchAll(/case (\d+):/g)].map((x) => Number(x[1]));
    const body = c[2];
    const grab = (name) => { const g = body.match(new RegExp(`(?:^|\\n)[ \\t]*(?:this\\.)?${name} = (\\d+);`)); return g ? Number(g[1]) : null; };
    const stats = { hp: grab("lifeMax"), dmg: grab("damage"), def: grab("defense") };
    if (stats.hp === null) continue;
    for (const id of ids) {
      if (!STATS_BY_ID.has(id)) STATS_BY_ID.set(id, stats);
      if (!BODY_BY_ID.has(id)) BODY_BY_ID.set(id, body);
    }
  }
  // Отрицательные netID (цветные слизни и другие варианты): статы и игровой тинт.
  const netStart = npcCs.indexOf("void SetDefaultsFromNetId");
  const netSeg = npcCs.slice(netStart, methodEnd(npcCs, netStart));
  for (const c of netSeg.matchAll(/case (-\d+):([\s\S]*?)break;/g)) {
    const id = Number(c[1]);
    const body = c[2];
    const num = (rx) => { const g = body.match(rx); return g ? Number(g[1]) : null; };
    const tint = body.match(/(?:this\.)?color = new Color\((\d+), (\d+), (\d+)/);
    NETID_INFO.set(id, {
      hp: num(/\n[ \t]+(?:this\.)?life = (\d+);/), dmg: num(/\n[ \t]+(?:this\.)?damage = (\d+);/), def: num(/\n[ \t]+(?:this\.)?defense = (\d+);/),
      tint: tint ? [Number(tint[1]), Number(tint[2]), Number(tint[3])] : null
    });
  }
}

// 5. Датасет: тип + спрайт
const dataset = readJson((path.join(DATASET, "json/npc_data/npc.json")));
const SPRITES = path.join(DATASET, "json/items_data/npc_sprites");
const slugify = (name) => name.toLowerCase().replace(/['’.]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const artSlug = (name) => name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// 5.5 Кадры анимации ванильных NPC: Main.cs => npcFrameCount = new int[688] { ... }
const VANILLA_FRAMES = [];
{
  const mainCs = readCs(path.join(VAN, "Main.cs"));
  const arr = mainCs.match(/npcFrameCount = new int\[\d+\]\s*\{([\s\S]*?)\};/);
  if (arr) arr[1].split(",").forEach((v, i) => { VANILLA_FRAMES[i] = Number(v.trim()) || 1; });
}
const cropSprite = (source, target, frames, tint = null) => {
  const [w, h] = execFileSync("identify", ["-format", "%w %h", source], { encoding: "utf8" }).trim().split(/\s+/).map(Number);
  const args = [source];
  if (frames > 1 && h % frames === 0 && h / frames >= 8) args.push("-crop", `${w}x${h / frames}+0+0`, "+repage");
  if (tint) {
    // Игра умножает серую текстуру на цвет NPC; повторяем множительный тинт.
    // Слишком тёмные тинты (чёрный слизень) поднимаем до видимого минимума.
    const [r, g, b] = tint.every((c) => c < 46) ? [70, 70, 70] : tint.map((c) => Math.max(c, 24));
    args.push("(", "+clone", "-alpha", "off", "-fill", `rgb(${r},${g},${b})`, "-colorize", "100", ")", "-channel", "RGB", "-compose", "multiply", "-composite");
  }
  if (args.length === 1) { fs.copyFileSync(source, target); return; }
  args.push("-define", "png:exclude-chunks=date,time", target);
  execFileSync("convert", args);
};

const vanillaMobs = [];
const missingVanilla = [];
for (const row of dataset) {
  const en = row.Name.trim();
  const type = row.Type;
  if (type === "Town NPC") continue;
  const lookup = NAME_ALIASES[en] || en.replace(/\s*\((?:enemy|NPC)\)$/i, "");
  const key = EN_NAME_TO_KEY.get(lookup) || EN_NAME_TO_KEY.get(en);
  if (!key) { missingVanilla.push(en); continue; }
  const id = KEY_TO_ID.get(key);
  const ru = ruNpcNames[key] || en;
  const netInfo = id < 0 ? (NETID_INFO.get(id) || {}) : {};
  const stats = id < 0
    ? { hp: netInfo.hp ?? null, dmg: netInfo.dmg ?? null, def: netInfo.def ?? null }
    : (STATS_BY_ID.get(id) || {});
  const EXTRA_TAGS = {
    "Green Slime": ["b:Surface", "t:DayTime"], "Baby Slime": ["b:Surface"], "Black Slime": ["b:TheUnderground"],
    "Pinky": ["b:Surface", "t:DayTime"], "Purple Slime": ["b:Surface", "t:DayTime"], "Red Slime": ["b:TheUnderground"],
    "Yellow Slime": ["b:TheUnderground"], "Jungle Slime": ["b:Jungle", "t:DayTime"]
  };
  const tags = [...(TAGS_BY_ID.get(id) || [])];
  if (!tags.length && EXTRA_TAGS[en]) tags.push(...EXTRA_TAGS[en]);
  const flavor = flavorFor(key);
  const spriteFile = path.join(SPRITES, `${slugify(en)}.png`);
  const NPCTEX = path.join(SRC, "npctex/Art/Terraria/images");
  const texId = id > 0 ? id : 1; // цветные слизни — варианты текстуры синего слизня
  const texFile = path.join(NPCTEX, `NPC_${texId}.png`);
  const tint = id < 0 ? (netInfo.tint || TINT_BY_TYPE.get(texId) || null) : (TINT_BY_TYPE.get(id) || null);
  let art = "";
  if (exists(texFile)) {
    art = `assets/mob-sprites/v-${artSlug(en)}.png`;
    if (!SKIP_ART) cropSprite(texFile, path.join(REPO, "calamity-codex", art), VANILLA_FRAMES[texId] || 1, tint);
  } else if (exists(spriteFile)) {
    art = `assets/mob-sprites/v-${artSlug(en)}.png`;
    if (!SKIP_ART) cropSprite(spriteFile, path.join(REPO, "calamity-codex", art), id > 0 ? (VANILLA_FRAMES[id] || 1) : 1, tint);
  }
  // Terraria 1.4.5: Марсианская тарелка больше не числится боссом бестиария.
  const KIND_OVERRIDES = { "Martian Saucer": "enemy" };
  const kindResolved = KIND_OVERRIDES[en] || (type === "Boss" ? "boss" : type === "Critter" ? "critter" : "enemy");
  // Ловимые зверьки в коде игры используют общий дефолт: 5 ОЗ, без урона и защиты.
  const critterDefaults = kindResolved === "critter" && stats.hp == null ? { hp: 5, dmg: 0, def: 0 } : {};
  vanillaMobs.push({
    src: "v", id: `v${id}`, en, ru, kind: kindResolved,
    hp: stats.hp ?? critterDefaults.hp ?? null, dmg: stats.dmg ?? critterDefaults.dmg ?? null, def: stats.def ?? critterDefaults.def ?? null,
    tags, desc: flavor, art
  });
}

// Дедупликация по игровому id (варианты вроде уток/бабочек) + важные NPC без строки локализации
{
  const seen = new Set();
  const dedup = [];
  for (const mob of vanillaMobs) { if (seen.has(mob.id)) continue; seen.add(mob.id); dedup.push(mob); }
  vanillaMobs.length = 0; vanillaMobs.push(...dedup);
  if (!seen.has("v471")) {
    const stats = STATS_BY_ID.get(471) || {};
    const sprite = path.join(SRC, "npctex/Art/Terraria/images/NPC_471.png");
    let art = "";
    if (exists(sprite)) { art = "assets/mob-sprites/v-goblin-summoner.png"; if (!SKIP_ART) cropSprite(sprite, path.join(REPO, "calamity-codex", art), VANILLA_FRAMES[471] || 1); }
    vanillaMobs.push({ src: "v", id: "v471", en: "Goblin Summoner", ru: "Гоблин-призыватель", kind: "enemy", hp: stats.hp ?? null, dmg: stats.dmg ?? null, def: stats.def ?? null, tags: [...(TAGS_BY_ID.get(471) || ["i:Goblins"])], desc: flavorFor("GoblinSummoner"), art });
  }
}

// Новые NPC Terraria 1.4.5 (отсутствуют в датасете 1.4.4). Текстур 1.4.5 в
// закреплённых дампах пока нет — такие записи честно выходят без спрайта.
{
  const seen = new Set(vanillaMobs.map((m) => Number(m.id.slice(1))));
  // Имена-ссылки на предметы ({$ItemName.X}) и намеренно «замаскированные» мимики.
  const itemNamesEn = (readJson(path.join(VAN, "en-Items.json")).ItemName) || {};
  const itemNamesRu = (readJson(path.join(VAN, "ru-Items.json")).ItemName) || {};
  const resolveName = (value, table) => String(value || "").replace(/^\{\$ItemName\.(\w+)\}$/, (_, k) => table[k] || "");
  const NEW_NPC_OVERRIDES = {
    OwlMimic: { en: "Owl Mimic", ru: "Сова-мимик", kind: "enemy" },
    StatueMimic: { en: "Statue Mimic", ru: "Статуя-мимик", kind: "enemy" }
  };
  for (const [key, id] of KEY_TO_ID) {
    if (id < 688 || seen.has(id)) continue;
    const override = NEW_NPC_OVERRIDES[key] || {};
    const en = override.en || resolveName(enNpcNames[key], itemNamesEn);
    if (!en) continue;
    const body = BODY_BY_ID.get(id) || "";
    if (/(?:this\.)?townNPC = true/.test(body)) continue;
    const stats = STATS_BY_ID.get(id) || {};
    const kind = override.kind || (/(?:this\.)?friendly = true/.test(body) || ((stats.dmg ?? 0) === 0 && (stats.hp ?? 99) <= 6) ? "critter" : "enemy");
    const texFile = path.join(SRC, `npctex/Art/Terraria/images/NPC_${id}.png`);
    let art = "";
    if (exists(texFile)) {
      art = `assets/mob-sprites/v-${artSlug(en)}.png`;
      if (!SKIP_ART) cropSprite(texFile, path.join(REPO, "calamity-codex", art), VANILLA_FRAMES[id] || 1, TINT_BY_TYPE.get(id) || null);
    }
    vanillaMobs.push({
      src: "v", id: `v${id}`, en, ru: override.ru || resolveName(ruNpcNames[key], itemNamesRu) || en, kind,
      hp: stats.hp ?? null, dmg: stats.dmg ?? null, def: stats.def ?? null,
      tags: [...(TAGS_BY_ID.get(id) || [])], desc: flavorFor(key), art
    });
    seen.add(id);
  }
}

/* ============================== CALAMITY ============================== */

// Имена из hjson
const calNames = {};
for (const m of read(path.join(CAL, "Localization/en-US/Mods.CalamityMod.NPCs.hjson"))
  .matchAll(/^\s*"?([\w.]+)\.DisplayName"?\s*:\s*"?([^"\r\n]+?)"?\s*$/gm)) {
  calNames[m[1].split(".").pop()] = m[2].trim();
}
// Короткая форма записи имени: `TinySquid: Tiny Squid`
for (const m of read(path.join(CAL, "Localization/en-US/Mods.CalamityMod.NPCs.hjson"))
  .matchAll(/^\s{0,4}(\w+):\s+([A-Z][^\r\n{]*?)\s*$/gm)) {
  if (!calNames[m[1]] && !/DisplayName|Bestiary|Chat|Census/.test(m[1])) calNames[m[1]] = m[2].trim();
}
// Русские имена: npc-ru.js + рукописный словарь
const ruCtx = { window: {} }; vm.createContext(ruCtx);
vm.runInContext(read(path.join(REPO, "calamity-codex/js/npc-ru.js")), ruCtx);
const NPC_RU = ruCtx.window.CALAMITY_NPC_RU || {};
const manualRuPath = path.join(import.meta.dirname, "mob-ru-names.json");
const MANUAL_RU = exists(manualRuPath) ? JSON.parse(read(manualRuPath)) : {};
// Имена боссов и мини-боссов берём из уже переведённого бестиария кодекса.
const BOSS_RU = {};
const BOSS_EN_SET = new Set();
for (const m of read(path.join(REPO, "calamity-codex/js/bosses.js")).matchAll(/name:"([^"]+)", en:"([^"]+)"/g)) {
  if (!BOSS_RU[m[2]]) BOSS_RU[m[2]] = m[1];
  BOSS_EN_SET.add(m[2]);
}
// Соответствия имён кодекса и внутренних имён Calamity
BOSS_RU["The Perforator"] = BOSS_RU["The Perforators"] || "Перфоратор";
BOSS_RU["Anahita"] = BOSS_RU["Anahita"] || "Анахита";

// Папка -> контекст (биом/событие Calamity)
const FOLDER_TAG = {
  Abyss: "cb:Abyss", AcidRain: "ce:AcidRain", Astral: "cb:Astral", Crags: "cb:Crags",
  SulphurousSea: "cb:SulphurousSea", SunkenSea: "cb:SunkenSea", PlagueEnemies: "cb:Plague",
  NormalNPCs: "", Other: "", TownNPCs: "", VanillaNPCAIOverrides: ""
};

const isSegment = (cls) => /(Body|Tail|BodyAlt|TailAlt|Body\d|Tail\d|Segment|Arm\b|ArmLeft|ArmRight|Leg\b)/.test(cls);
const calFiles = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!/TownNPCs|VanillaNPCAIOverrides/.test(entry.name)) walk(p); }
    else if (entry.name.endsWith(".cs")) calFiles.push(p);
  }
})(path.join(CAL, "NPCs"));

const calMobs = [];
const skipped = [];
const missingRu = [];
for (const file of calFiles) {
  const src = read(file);
  const clsMatch = src.match(/public class (\w+)\s*:\s*ModNPC/);
  if (!clsMatch) continue;
  const cls = clsMatch[1];
  if (isSegment(cls)) continue;
  let en = calNames[cls];
  if (!en || en === "???" || /^\{\$/.test(en)) { skipped.push(cls); continue; }
  const folder = path.relative(path.join(CAL, "NPCs"), path.dirname(file)).split(path.sep)[0] || "";
  const grab = (name) => { const g = src.match(new RegExp(`NPC\\.${name}\\s*=\\s*(\\d+)`)); return g ? Number(g[1]) : null; };
  const frames = Number((src.match(/Main\.npcFrameCount\[(?:NPC\.type|Type)\]\s*=\s*(\d+)/) || [])[1] || 1);
  const boss = /NPC\.boss\s*=\s*true/.test(src);
  const tags = new Set();
  for (const t of src.matchAll(/CommonTags\.SpawnConditions\.(Biomes|Events|Invasions|Times)\.(\w+)/g)) {
    tags.add(`${{ Biomes: "b", Events: "e", Invasions: "i", Times: "t" }[t[1]]}:${t[2]}`);
  }
  const folderTag = FOLDER_TAG[folder] ?? "";
  if (folderTag) tags.add(folderTag);
  if (folder === "PlagueEnemies") tags.add("cb:Plague");
  // Текстура: рядом с классом либо переопределение
  let texture = path.join(path.dirname(file), `${cls}.png`);
  const texOverride = src.match(/string Texture\s*=>\s*"([^"]+)"/);
  if (texOverride) {
    const rel = texOverride[1].replace(/^CalamityMod\//, "");
    texture = path.join(CAL, `${rel}.png`);
  }
  let art = "";
  if (exists(texture)) {
    art = `assets/mob-sprites/c-${artSlug(en)}.png`;
    if (!SKIP_ART) {
      const target = path.join(REPO, "calamity-codex", art);
      const [w, h] = execFileSync("identify", ["-format", "%w %h", texture], { encoding: "utf8" }).trim().split(/\s+/).map(Number);
      const frameH = Math.floor(h / Math.max(1, frames));
      if (frames > 1 && frameH > 0) {
        execFileSync("convert", [texture, "-crop", `${w}x${frameH}+0+0`, "+repage", "-define", "png:exclude-chunks=date,time", target]);
      } else {
        fs.copyFileSync(texture, target);
      }
    }
  }
  const ru = MANUAL_RU[en] || NPC_RU[en] || BOSS_RU[en] || "";
  if (!ru) missingRu.push(en);
  calMobs.push({
    src: "c", id: `c-${artSlug(en)}`, en, ru: ru || en,
    kind: boss || BOSS_EN_SET.has(en) ? "boss" : "enemy",
    hp: grab("lifeMax"), dmg: grab("damage"), def: grab("defense"),
    tags: [...tags], folder, desc: "", art
  });
}

// дедупликация Calamity по имени (альтернативные классы) — оставляем запись с артом/статами
const byName = new Map();
for (const mob of calMobs) {
  const prev = byName.get(mob.en);
  if (!prev) { byName.set(mob.en, mob); continue; }
  const score = (x) => (x.art ? 2 : 0) + (x.hp ? 1 : 0);
  if (score(mob) > score(prev)) byName.set(mob.en, mob);
}
const calFinal = [...byName.values()];

/* ============================== ВЫВОД ============================== */

const mobs = [...vanillaMobs, ...calFinal];
const compact = mobs.map((m) => [m.id, m.src, m.en, m.ru, m.kind, m.hp ?? -1, m.dmg ?? -1, m.def ?? -1, m.tags.join(","), m.desc, m.art, m.folder || ""]);
const output = `/* Generated by scripts/build-mobs.mjs. Do not edit by hand.
 * Vanilla: Terraria 1.4.5.0 decompiled source + official ru-RU localization; sprites from the 1.4.4 texture dump (new 1.4.5 NPCs are honestly rendered without art until a pinned dump exists).
 * Calamity: CalamityTeam/CalamityModPublic @ 1a8cebd27ec5615316b78f71973446b5528d2b78.
 * Fields: [id, src(v|c), en, ru, kind, hp, dmg, def, tags, desc, art, folder]
 */
window.CALAMITY_MOB_INDEX = {
  format: 1,
  tagLabels: ${JSON.stringify(TAG_LABELS)},
  mobs: ${JSON.stringify(compact)}
};
`;
fs.writeFileSync(OUT_JS, output);

console.log(`Ваниль: ${vanillaMobs.length} записей (${vanillaMobs.filter((m) => m.art).length} со спрайтами, ${vanillaMobs.filter((m) => m.desc).length} с описаниями, ${vanillaMobs.filter((m) => m.hp !== null).length} со статами, ${vanillaMobs.filter((m) => m.tags.length).length} с тегами)`);
console.log(`Calamity: ${calFinal.length} записей (${calFinal.filter((m) => m.art).length} со спрайтами, ${calFinal.filter((m) => m.hp !== null).length} со статами, ${calFinal.filter((m) => m.ru !== m.en).length} с русскими именами)`);
if (missingVanilla.length) console.log("Ваниль без соответствия локализации:", missingVanilla.length, missingVanilla.slice(0, 12).join(", "));
if (missingRu.length) console.log("Calamity без русского имени:", missingRu.length);
fs.writeFileSync(path.join(import.meta.dirname, "mob-missing-ru.txt"), missingRu.sort().join("\n"));
console.log("OK ->", path.relative(REPO, OUT_JS));
