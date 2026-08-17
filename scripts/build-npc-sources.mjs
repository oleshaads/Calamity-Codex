#!/usr/bin/env node
/*
 * Генератор источников предметов из закреплённого исходника CalamityModPublic.
 * Извлекает:
 *   - лут NPC (кто, шанс, количество, условия) — включая боссов и ванильных NPC;
 *   - инфо спавна NPC (биом, время, требования прогрессии, бестиарий);
 *   - дропы с тайлов (турели, руды…);
 *   - лут сундуков (лаборатории, святилища…).
 *
 * Использование:
 *   node scripts/build-npc-sources.mjs /path/to/CalamityModPublic [out.js]
 * По умолчанию: calamity-codex/js/npc-sources.js
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const REPO_ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.resolve(process.argv[2] || "/tmp/CalamityModPublic");
const OUT = path.resolve(process.argv[3] || path.join(REPO_ROOT, "calamity-codex/js/npc-sources.js"));
const CATALOG_PATH = path.join(REPO_ROOT, "calamity-codex/js/catalog.js");

if (!fs.existsSync(path.join(SRC, "NPCs"))) {
  console.error("Исходники Calamity не найдены:", SRC);
  process.exit(1);
}

/* ---------- 1. Карта item name -> id из каталога ---------- */
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(CATALOG_PATH, "utf8"), ctx);
const index = ctx.window.CALAMITY_ITEM_INDEX;
const ITEM_NAME_TO_ID = new Map();
const ITEM_NORM_TO_ID = new Map();
const normKey = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
for (const [name, , id] of index.items) {
  if (!ITEM_NAME_TO_ID.has(name)) ITEM_NAME_TO_ID.set(name, id);
  const key = normKey(name);
  if (key && !ITEM_NORM_TO_ID.has(key)) ITEM_NORM_TO_ID.set(key, id);
}
const itemId = (name) => {
  const short = String(name).split(".").pop();
  if (ITEM_NAME_TO_ID.has(short)) return ITEM_NAME_TO_ID.get(short);
  if (ITEM_NAME_TO_ID.has(name)) return ITEM_NAME_TO_ID.get(name);
  return ITEM_NORM_TO_ID.get(normKey(short)) || "";
};

/* ---------- 2. Локализация ---------- */
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return ""; } };
const npcLoc = read(path.join(SRC, "Localization/en-US/Mods.CalamityMod.NPCs.hjson"));
const bestiaryLoc = read(path.join(SRC, "Localization/en-US/Mods.CalamityMod.Bestiary.hjson"));
const NPC_NAMES = {};
const NPC_BESTIARY = {};
for (const m of npcLoc.matchAll(/^\s*"?([\w.]+)\.DisplayName"?\s*:\s*"?([^"\r\n]+)"?/gm)) {
  NPC_NAMES[m[1]] = m[2].trim();
  NPC_NAMES[m[1].split(".").pop()] = m[2].trim();
}
for (const m of bestiaryLoc.matchAll(/^\s*"?([\w.]+)"?\s*:\s*"?([^"\r\n]+?)"?\s*$/gm)) {
  NPC_BESTIARY[m[1]] = m[2];
}

/* ---------- 3. Словари ---------- */
const BIOME_RU = {
  Caverns: "пещеры", Underground: "подземелья", Surface: "поверхность",
  Sky: "небо", Ocean: "океан", Jungle: "джунгли", Desert: "пустыня",
  Snow: "снега", Hallow: "святые земли", Corruption: "порча", Crimson: "багрянец",
  Dungeon: "данж", Underworld: "ад", GlowingMushroom: "грибной биом",
  AstralInfection: "астральная инфекция", SulphurousSea: "сернистое море",
  SunkenSea: "затонувшее море", BrimstoneCrag: "серный кратер",
  Abyss: "бездна", Meteor: "метеорит", Granite: "гранит", Marble: "мрамор",
  SpiderCave: "паучий биом", Ice: "льды", AcidRain: "кислотный дождь",
  Astral: "астрал"
};
const TIME_RU = {
  DayTime: "днём", NightTime: "ночью", Dusk: "на закате", Dawn: "на рассвете",
  Rain: "в дождь", Windy: "в ветер", Sandstorm: "в песчаную бурю",
  Blizzard: "в метель", BloodMoon: "в кровавую луну", SolarEclipse: "в затмение",
  SlimeRain: "в слизневый дождь", AcidRain: "в кислотный дождь"
};
const COND_RU = {
  PostPlant: "после Плантеры", PostProv: "после Провиденс", PostLevi: "после Левиафана",
  PostPolter: "после Полтергаста", PostEoC: "после Глаза Ктулху", PostDS: "после Пустынного бича",
  PostCal: "после Клона Каламитас", PostDoG: "после Пожирателя богов",
  PostMoonLord: "после Лунного лорда", PostCultist: "после культиста",
  PostAstrumDeus: "после Аструм Деуса", PostGolem: "после Голема",
  PostPlantera: "после Плантеры", PostMech: "после мех-боссов",
  PostWoF: "после Стены плоти", PostYharon: "после Ярона",
  PostDraedon: "после экзо-мехов", PostSentinels: "после вестников",
  PostDesertScourge: "после Пустынного бича", PostCrabulon: "после Крабулона",
  PostHiveMind: "после Разума улья", PostPerforator: "после Перфораторов",
  PostSlimeGod: "после Бога слизней", PostCryogen: "после Криогена",
  PostAquaticScourge: "после Водного бича", PostBrimstoneElemental: "после Серного элементаля",
  PostClone: "после Клона Каламитас", PostRavager: "после Разорителя",
  PostPlaguebringer: "после Чумного голиафа", PostLeviathan: "после Левиафана",
  PostAureus: "после Аструм Ауреуса", PostExoMechs: "после экзо-мехов",
  PostCeaselessVoid: "после Бесконечной пустоты", PostStormWeaver: "после Штормового ткача",
  PostSignus: "после Сигнуса", PostOldDuke: "после Старого герцога",
  PostDukeFishron: "после Герцога Рыброна", PostEmpress: "после Императрицы света",
  PostMoonLord: "после Лунного лорда",
  Hardmode: "хардмод", NormalOnly: "обычный режим", GFB: "режим Get fixed boi",
  RevAndMaster: "Revengeance и выше", RevNoMaster: "Revengeance без мастера",
  Expert: "эксперт и выше", Master: "мастер и выше", Remix: "режим Remix"
};
const DOWNED_RU = {
  KingSlime: "Король слизней", DesertScourge: "Пустынный бич", EyeOfCthulhu: "Глаз Ктулху",
  Crabulon: "Крабулон", EaterOfWorlds: "Пожиратель миров", BrainOfCthulhu: "Мозг Ктулху",
  HiveMind: "Разум улья", Perforators: "Перфораторы", QueenBee: "Королева пчёл",
  Skeletron: "Скелетрон", Deerclops: "Дерклос", SlimeGod: "Бог слизней",
  WallOfFlesh: "Стена плоти", QueenSlime: "Королева слизней", Cryogen: "Криоген",
  Twins: "Близнецы", Destroyer: "Разрушитель", SkeletronPrime: "Скелетрон Прайм",
  BrimstoneElemental: "Серный элементаль", AquaticScourge: "Водный бич",
  CalamitasClone: "Клон Каламитас", Clone: "Клон Каламитас", Plantera: "Плантера",
  Leviathan: "Левиафан и Анахита", Anahita: "Левиафан и Анахита",
  AstrumAureus: "Аструм Ауреус", Aureus: "Аструм Ауреус", Golem: "Голем",
  PlaguebringerGoliath: "Чумной голиаф", Ravager: "Разоритель",
  DukeFishron: "Герцог Рыброн", EmpressOfLight: "Императрица света",
  AstrumDeus: "Аструм Деус", LunaticCultist: "Лунатик-культист", MoonLord: "Лунный лорд",
  ProfanedGuardians: "Стражи Провиденс", Providence: "Провиденс", Dragonfolly: "Драконье безумие",
  StormWeaver: "Штормовой ткач", CeaselessVoid: "Бесконечная пустота", Signus: "Сигнус",
  Polterghast: "Полтергаст", OldDuke: "Старый герцог", DevourerOfGods: "Пожиратель богов",
  Yharon: "Ярон", ExoMechs: "Экзо-мехи", SupremeCalamitas: "Верховная ведьма",
  GSS: "Великая песчаная акула", GiantClam: "Гигантский моллюск", Cragmaw: "Крагмо",
  Mauler: "Малер", NuclearTerror: "Ядерный ужас", ColossalSquid: "Колоссальный кальмар",
  ReaperShark: "Акула-жнец", EidolonWyrm: "Эйдолон-змей", PrimordialWyrm: "Первозданный змей"
};

/* ---------- 4. Утилиты ---------- */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}
function splitArgs(inner) {
  const args = [];
  let depth = 0, cur = "";
  for (const ch of inner) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { args.push(cur.trim()); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}
const isNum = (s) => /^\d+$/.test(String(s).trim());
function chanceText(rate) {
  const r = String(rate || "").trim();
  if (!r) return "";
  if (isNum(r)) {
    const n = Number(r);
    if (n === 1) return "всегда";
    return `1 из ${n}`;
  }
  const f = r.match(/^new Fraction\((\d+),\s*(\d+)\)$/);
  if (f) {
    const [num, den] = [Number(f[1]), Number(f[2])];
    return den === 100 ? `${num}%` : `${num}/${den}`;
  }
  if (/Weapon|DropRate|DropInt|DropFraction/i.test(r)) return "шанс оружия";
  return "шанс в игре";
}
function qtyText(minQ, maxQ) {
  const mn = isNum(minQ) ? minQ : "";
  const mx = isNum(maxQ) ? maxQ : "";
  if (!mn && !mx) return "";
  if (mn && mx && mn === mx) return mn === "1" ? "" : `×${mn}`;
  if (mn && mx) return `×${mn}–${mx}`;
  return `×${mn || mx}`;
}
function innerCall(expr, name) {
  const m = String(expr).match(new RegExp(`^${name}\\((.*)\\)$`));
  return m ? m[1] : null;
}

/* ---------- 5. Лут NPC ---------- */
const npcDrops = new Map(); // npcName -> { drops: [{id, chance, qty, cond}], file }
const npcInfo = new Map();
const GLOBAL_FILE = "CalamityGlobalNPCLoot.cs";

function addDrop(npcName, itemName, chance, qty, cond, file) {
  const id = itemId(itemName);
  if (!id) return;
  if (!npcDrops.has(npcName)) npcDrops.set(npcName, { drops: [], file });
  const list = npcDrops.get(npcName).drops;
  if (!list.some((d) => d.id === id && d.cond === cond && d.chance === chance)) {
    list.push({ id, chance: chance || "", qty: qty || "", cond: cond || "" });
  }
}

function condLabelOf(setMap, target, extraExpr) {
  const parts = [];
  if (setMap.has(target)) {
    const v = setMap.get(target);
    if (COND_RU[v]) parts.push(COND_RU[v]);
    else {
      const m = v.match(/DropHelper\.(\w+)/);
      parts.push(m && COND_RU[m[1]] ? COND_RU[m[1]] : v.startsWith("DropHelper.") ? `условие: ${v.replace("DropHelper.", "")}` : v);
    }
  }
  if (extraExpr) {
    const e = String(extraExpr).trim();
    const dh = e.match(/DropHelper\.(\w+)/);
    if (dh && COND_RU[dh[1]]) parts.push(COND_RU[dh[1]]);
    else {
      const downed = e.match(/(?:downed|Downed)([A-Z][A-Za-z0-9_]*)/);
      if (downed && DOWNED_RU[downed[1]]) parts.push(`после: ${DOWNED_RU[downed[1]]}`);
      else if (!dh) parts.push("особое условие");
    }
  }
  return [...new Set(parts)].join(" · ");
}

/** Разбирает одно выражение-предмет (ItemType/PerPlayer/NVEQ/BossBag) на компоненты. */
function parseItemExpr(expr) {
  const clean = String(expr).trim();
  let m = clean.match(/^ModContent\.ItemType<([\w.]+)>\(\)$/);
  if (m) return { item: m[1], rate: "", min: "", max: "" };
  m = clean.match(/^ItemDropRule\.BossBag\(ModContent\.ItemType<([\w.]+)>\(\)\)$/);
  if (m) return { item: m[1], rate: "эксперт+", min: "", max: "" };
  const pp = innerCall(clean, "DropHelper.PerPlayer");
  if (pp) {
    const a = splitArgs(pp).filter((x) => !/^\w+\s*:/.test(x));
    return { item: (a[0] || "").replace(/^ModContent\.ItemType<([\w.]+)>\(\)$/, "$1"), rate: a[1] || "", min: a[2] || "", max: a[3] || "" };
  }
  const nv = innerCall(clean, "DropHelper.NormalVsExpertQuantity");
  if (nv) {
    const a = splitArgs(nv).filter((x) => !/^\w+\s*:/.test(x));
    return { item: (a[0] || "").replace(/^ModContent\.ItemType<([\w.]+)>\(\)$/, "$1"), rate: a[1] || "", min: a[2] || "", max: a[5] || "" };
  }
  const cd = innerCall(clean, "new CommonDrop");
  if (cd) {
    const a = splitArgs(cd).filter((x) => !/^\w+\s*:/.test(x));
    // CommonDrop(item, den, min, max, num) — шанс num/den
    const item = (a[0] || "").replace(/^ModContent\.ItemType<([\w.]+)>\(\)$/, "$1");
    const den = isNum(a[1]) ? a[1] : "";
    const num = isNum(a[4]) ? a[4] : "";
    const rate = den ? (num && num !== "1" ? `${num}/${den}` : `1 из ${den}`) : "";
    return { item, rate, min: a[2] || "", max: a[3] || "" };
  }
  const cdr = innerCall(clean, "ItemDropRule.Common");
  if (cdr) {
    const a = splitArgs(cdr).filter((x) => !/^\w+\s*:/.test(x));
    const item = (a[0] || "").replace(/^ModContent\.ItemType<([\w.]+)>\(\)$/, "$1");
    return { item, rate: a[1] || "", min: a[2] || "", max: a[3] || "" };
  }
  return null;
}

function walkDir(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkDir(p, cb);
    else if (entry.name.endsWith(".cs")) cb(p);
  }
}

/** Сканирует тело метода: находит все `.Add(...)` / `.AddIf(...)` и извлекает предметы. */
function scanLootBody(body, setMap, npcName, file) {
  const callRe = /(\w+)\.(AddIf|Add)\(/g;
  let m;
  while ((m = callRe.exec(body))) {
    const target = m[1];
    const isIf = m[2] === "AddIf";
    const openParen = m.index + m[0].length - 1;
    // сбалансированные скобки
    let depth = 0, end = -1;
    for (let i = openParen; i < body.length; i++) {
      if (body[i] === "(") depth++;
      else if (body[i] === ")") { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end < 0) continue;
    const inner = body.slice(openParen + 1, end);
    const args = splitArgs(inner);
    if (!args.length) continue;
    let condExpr = "";
    let rest = args;
    if (isIf) { condExpr = args[0]; rest = args.slice(1); }
    const positional = rest.filter((a) => !/^\w+\s*:/.test(a));
    const expr0 = positional[0] || "";
    // массив оружия через CalamityStyle
    const cs = expr0.match(/^DropHelper\.CalamityStyle\([^)]*,\s*(\w+)\)$/);
    if (cs && setMap._arrays && setMap._arrays.has(cs[1])) {
      for (const iname of setMap._arrays.get(cs[1])) {
        addDrop(npcName, iname, "шанс оружия", "", condLabelOf(setMap, target, condExpr), file);
      }
      continue;
    }
    const parsed = parseItemExpr(expr0);
    if (!parsed || !parsed.item) continue;
    addDrop(
      npcName, parsed.item,
      chanceText(parsed.rate || positional[1]),
      qtyText(parsed.min || positional[2], parsed.max || positional[3]),
      condLabelOf(setMap, target, condExpr), file
    );
  }
}

const lootBodies = [];
walkDir(path.join(SRC, "NPCs"), (file) => {
  if (path.basename(file) === GLOBAL_FILE) return;
  const text = stripComments(read(file));
  const idx = text.indexOf("ModifyNPCLoot(");
  if (idx < 0) return;
  const body = (() => {
    let depth = 0, start = text.indexOf("{", idx);
    if (start < 0) return null;
    for (let i = start; i < text.length; i++) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
    }
    return null;
  })();
  if (!body) return;
  // класс — последний перед методом
  const classesBefore = [...text.slice(0, idx).matchAll(/class\s+(\w+)/g)];
  const cls = classesBefore.length ? classesBefore[classesBefore.length - 1][1] : path.basename(file, ".cs");
  lootBodies.push({ cls, body, file });
});

for (const { cls, body, file } of lootBodies) {
  const npcName = NPC_NAMES[cls] || cls;
  const setMap = new Map();
  setMap._arrays = new Map();
  // наборы с условиями
  for (const mm of body.matchAll(/(\w+)\s*=\s*npcLoot\.DefineConditionalDropSet\(\s*(DropHelper\.\w+\(\)|new\s+[\w.]+\([^)]*\)|\(\)\s*=>\s*[^)]+)\)/g)) {
    setMap.set(mm[1], mm[2].trim());
  }
  for (const mm of body.matchAll(/(\w+)\s*=\s*npcLoot\.DefineNormalOnlyDropSet\(/g)) {
    setMap.set(mm[1], "NormalOnly");
  }
  for (const mm of body.matchAll(/(\w+)\s*=\s*npcLoot\.DefineConditionalDropSet\(\s*new\s+LeadingConditionRule\(new\s+([\w.]+)\(/g)) {
    setMap.set(mm[1], `условие: ${mm[2]}`);
  }
  // массивы оружия
  for (const mm of body.matchAll(/int\[\]\s+(\w+)\s*=\s*new int\[\]\s*\{([\s\S]*?)\};/g)) {
    const items = [...mm[2].matchAll(/ModContent\.ItemType<([\w.]+)>\(\)/g)].map((x) => x[1]);
    setMap._arrays.set(mm[1], items);
  }
  scanLootBody(body, setMap, npcName, file);
}

/* ---------- 6. Ванильные NPC: глобальный лут ---------- */
const globalText = stripComments(read(path.join(SRC, "NPCs", GLOBAL_FILE)));
const globalCases = [...globalText.matchAll(/case NPCID\.(\w+):/g)].map((m) => ({
  name: m[1],
  body: globalText.slice(m.index, globalText.indexOf("\n            #endregion", m.index) > 0 ? globalText.indexOf("\n            #endregion", m.index) : m.index + 4000)
}));
for (const { name, body } of globalCases) {
  const section = body.split(/case NPCID\./)[0];
  const setMap = new Map();
  setMap._arrays = new Map();
  for (const mm of section.matchAll(/(\w+)\s*=\s*npcLoot\.DefineConditionalDropSet\(\s*(DropHelper\.\w+\(\)|new\s+[\w.]+\([^)]*\))\)/g)) {
    setMap.set(mm[1], mm[2].trim());
  }
  scanLootBody(section, setMap, name, GLOBAL_FILE);
}

/* ---------- 7. Спавн-инфо ---------- */
const seenNpc = new Set();
function spawnInfoFor(file, npcName) {
  const text = stripComments(read(file));
  const biomes = [...text.matchAll(/SpawnConditions\.Biomes\.(\w+)/g)].map((m) => BIOME_RU[m[1]] || m[1]);
  const times = [...text.matchAll(/SpawnConditions\.Times\.(\w+)/g)].map((m) => TIME_RU[m[1]] || m[1]);
  const day = /Main\.dayTime/.test(text) ? "днём" : "";
  const night = /Main\.night/.test(text) ? "ночью" : "";
  const time = [...new Set([...times, day && night ? "днём и ночью" : (day || night)])].filter(Boolean).join(", ");
  const reqSet = new Set();
  for (const m of text.matchAll(/(?:CalamityWorld\.downed|NPC\.downed|Downed)([A-Z][A-Za-z0-9_]*)/g)) {
    const key = m[1].replace(/^Downed/, "");
    if (DOWNED_RU[key]) reqSet.add(DOWNED_RU[key]);
  }
  let source = "";
  const full = read(file);
  if (/TrustyOldRodEnemySystem/.test(full)) source = "вылавливается на удочку";
  const desc = NPC_BESTIARY[npcName] || "";
  return { biome: [...new Set(biomes)].join(", "), time, req: [...reqSet].join(", "), desc, source };
}

for (const { cls, file } of lootBodies) {
  const npcName = NPC_NAMES[cls] || cls;
  if (seenNpc.has(npcName)) continue;
  seenNpc.add(npcName);
  npcInfo.set(npcName, spawnInfoFor(file, npcName));
}
for (const { name } of globalCases) {
  if (!npcInfo.has(name)) npcInfo.set(name, { biome: "", time: "", req: "", desc: "", source: "" });
}

/* ---------- 8. Тайлы ---------- */
const tileDrops = new Map();
walkDir(path.join(SRC, "Tiles"), (file) => {
  const text = stripComments(read(file));
  const label = path.basename(file, ".cs").replace(/Tile$/, "").trim();
  for (const m of text.matchAll(/yield return new Item\(\s*ModContent\.ItemType<([\w.]+)>\(\)/g)) {
    const id = itemId(m[1]);
    if (!id) continue;
    if (!tileDrops.has(id)) tileDrops.set(id, []);
    if (!tileDrops.get(id).includes(label)) tileDrops.get(id).push(label);
  }
});
const TILE_RU = {
  DraedonLabTurret: "турель лаборатории Дрейдона", HostileFireTurret: "огненная турель",
  HostileIceTurret: "ледяная турель", HostileLaserTurret: "лазерная турель",
  HostileOnyxTurret: "ониксовая турель", HostilePlagueTurret: "чумная турель",
  HostileWaterTurret: "водяная турель", AerialiteOre: "аэролитовая руда",
  UelibloomOre: "руда улиблюма", AuricOre: "ауриковая руда", CryonicOre: "крионитовая руда",
  PerennialOre: "многолетняя руда", ScoriaOre: "скориевая руда", ExodiumCluster: "кластер экзодиума",
  CharredOre: "обугленная руда", AstralOre: "астральная руда", SeaPrism: "морская призма",
  LabTurret: "лабораторная турель", DraedonForge: "кузня Дрейдона",
  HellOre: "адская руда", BrimstoneSlag: "серный шлак"
};
const tileLabel = (l) => TILE_RU[l] || l;
const TILE_ART = {
  DraedonLabTurret: "assets/item-sprites/HostileLabTurret.png",
  HostileFireTurret: "assets/item-sprites/HostileFireTurret.png",
  HostileIceTurret: "assets/item-sprites/HostileIceTurret.png",
  HostileLaserTurret: "assets/item-sprites/HostileLaserTurret.png",
  HostileOnyxTurret: "assets/item-sprites/HostileOnyxTurret.png",
  HostilePlagueTurret: "assets/item-sprites/HostilePlagueTurret.png",
  HostileWaterTurret: "assets/item-sprites/HostileWaterTurret.png",
  AbyssalPots: "assets/source-sprites/abyssal-pot.png",
  SulphurousPots: "assets/source-sprites/sulphurous-pot.png",
  SpineTree: "assets/item-sprites/SpineSapling.png",
  AerialiteOre: "assets/item-sprites/AerialiteOre.png",
  UelibloomOre: "assets/item-sprites/UelibloomOre.png",
  AuricOre: "assets/item-sprites/AuricOre.png",
  CryonicOre: "assets/item-sprites/CryonicOre.png",
  PerennialOre: "assets/item-sprites/PerennialOre.png",
  ScoriaOre: "assets/item-sprites/ScoriaOre.png",
  ExodiumCluster: "assets/item-sprites/ExodiumCluster.png",
  CharredOre: "assets/item-sprites/BrimstoneSlag.png",
  AstralOre: "assets/item-sprites/AstralOre.png",
  SeaPrism: "assets/item-sprites/SeaPrism.png",
  LabTurret: "assets/item-sprites/LabTurret.png",
  DraedonForge: "assets/item-sprites/DraedonsForge.png",
  HellOre: "assets/item-sprites/BrimstoneSlag.png",
  BrimstoneSlag: "assets/item-sprites/BrimstoneSlag.png"
};
const tileSource = (label) => ({ name: tileLabel(label), art: TILE_ART[label] || "" });

/* ---------- 9. Сундуки ---------- */
const chestDrops = new Map();
const CHEST_SRC_RU = {
  DraedonStructures: "сундуки лабораторий Дрейдона",
  BrimstoneCrag: "сундуки серного кратера",
  DungeonArchive: "архив данжа",
  MechanicShed: "мастерская механика",
  ShimmerShrine: "святилище шиммера",
  UndergroundShrines: "подземные святилища",
  VernalPass: "весенний перевал",
  SunkenSea: "Затонувшее море",
  Abyss: "Бездна",
  EvilIsland: "остров зла"
};
const CHEST_ART = {
  DraedonStructures: "assets/item-sprites/SecurityChest.png",
  BrimstoneCrag: "assets/item-sprites/AshenChest.png",
  VernalPass: "assets/item-sprites/BotanicChest.png",
  SunkenSea: "assets/item-sprites/EutrophicCrate.png",
  Abyss: "assets/item-sprites/AbyssTreasureChest.png",
  DungeonArchive: "assets/vanilla-sprites/48.png",
  MechanicShed: "assets/vanilla-sprites/48.png",
  ShimmerShrine: "assets/vanilla-sprites/48.png",
  UndergroundShrines: "assets/vanilla-sprites/48.png",
  EvilIsland: "assets/vanilla-sprites/48.png"
};
const chestSource = (id) => ({ name: CHEST_SRC_RU[id] || id, art: CHEST_ART[id] || "assets/vanilla-sprites/48.png" });
walkDir(path.join(SRC, "World"), (file) => {
  const text = stripComments(read(file));
  const base = path.basename(file, ".cs");
  const src = base;
  for (const m of text.matchAll(/new ChestItem\(\s*ModContent\.ItemType<([\w.]+)>\(\)/g)) {
    const id = itemId(m[1]);
    if (!id) continue;
    if (!chestDrops.has(id)) chestDrops.set(id, []);
    if (!chestDrops.get(id).includes(src)) chestDrops.get(id).push(src);
  }
});

/* ---------- 10. Сборка ---------- */
const outSources = {};
for (const [npcName, { drops }] of npcDrops) {
  for (const d of drops) {
    if (!outSources[d.id]) outSources[d.id] = { npcs: [], tiles: [], chests: [] };
    outSources[d.id].npcs.push({ npc: npcName, chance: d.chance, qty: d.qty, cond: d.cond });
  }
}
for (const [id, tiles] of tileDrops) {
  if (!outSources[id]) outSources[id] = { npcs: [], tiles: [], chests: [] };
  outSources[id].tiles = tiles.map(tileSource);
}
for (const [id, chests] of chestDrops) {
  if (!outSources[id]) outSources[id] = { npcs: [], tiles: [], chests: [] };
  outSources[id].chests = chests.map(chestSource);
}
const chanceRank = (c) => {
  if (c === "всегда" || c === "эксперт+") return 0;
  const m = String(c).match(/^1 из (\d+)$/);
  return m ? Number(m[1]) : 999;
};
for (const s of Object.values(outSources)) {
  s.npcs.sort((a, b) => chanceRank(a.chance) - chanceRank(b.chance));
  s.npcs = s.npcs.slice(0, 8);
}

const npcOut = {};
for (const [name, info] of npcInfo) {
  npcOut[name] = { biome: info.biome, time: info.time, req: info.req, desc: info.desc, source: info.source };
}

const header = `/* Generated by scripts/build-npc-sources.mjs. Do not edit by hand.
 * Source: CalamityTeam/CalamityModPublic @ 1a8cebd27ec5615316b78f71973446b5528d2b78
 * NPC drop tables, spawn info, tile drops and chest loot for every Calamity item.
 */`;
const js = `${header}
window.CALAMITY_NPC_SOURCES = ${JSON.stringify(outSources)};
window.CALAMITY_NPCS = ${JSON.stringify(npcOut)};
`;
fs.writeFileSync(OUT, js);
const itemsWithSources = Object.keys(outSources).length;
const npcCount = Object.keys(npcOut).length;
const totalDrops = Object.values(outSources).reduce((n, s) => n + s.npcs.length, 0);
console.log(`Сгенерировано: ${npcCount} NPC, ${itemsWithSources} предметов с источниками, ${totalDrops} дроп-записей, тайлов: ${tileDrops.size}, сундуков: ${chestDrops.size}.`);
console.log("Записано:", OUT, `(${Math.round(js.length / 1024)} КБ)`);
