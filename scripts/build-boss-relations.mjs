#!/usr/bin/env node
/*
 * Build a compact, reproducible index connecting every catalog/craft entry to
 * concrete boss encounters. Direct rewards and summon items are discovered
 * from the pinned catalog/tooltips/NPC source data; recipe dependencies are
 * propagated transitively so an upgrade keeps the boss provenance of its
 * ingredients. Secret Get fixed boi alternatives are represented explicitly.
 *
 * Usage:
 *   node scripts/build-boss-relations.mjs [site-dir] [output]
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const repoRoot = path.resolve(import.meta.dirname, "..");
const siteRoot = path.resolve(process.argv[2] || path.join(repoRoot, "calamity-codex"));
const output = path.resolve(process.argv[3] || path.join(siteRoot, "js/boss-relations.js"));
const jsRoot = path.join(siteRoot, "js");
const context = { window: {}, CODEX: {} };
context.window = context;
vm.createContext(context);
for (const name of [
  "data.js", "extra.js", "lexicon.js", "plain.js", "plain-late.js", "polish.js", "bosses.js",
  "catalog.js", "catalog-tooltips.js", "vanilla-tree.js", "vanilla-ru.js", "npc-sources.js", "ru-names.js"
]) {
  vm.runInContext(fs.readFileSync(path.join(jsRoot, name), "utf8"), context, { filename: name });
}

const catalog = context.CALAMITY_ITEM_INDEX;
const tooltips = context.CALAMITY_CATALOG_TOOLTIPS?.tooltips || [];
const npcSources = context.CALAMITY_NPC_SOURCES || {};
const vanilla = context.CALAMITY_VANILLA_TREE_INDEX;
const vanillaRu = context.CALAMITY_VANILLA_RU?.names || [];
const ruById = context.CALAMITY_RU_NAMES?.byId || {};
const bosses = [...(context.CODEX.bosses || []), ...(context.CODEX.minis || [])];
if (catalog?.items?.length !== 2535 || bosses.length !== 54 || vanilla?.items?.length < 5000) {
  throw new Error("Boss relation inputs are incomplete; rebuild the catalog and boss data first");
}

const compact = (value) => String(value || "")
  .normalize("NFKD")
  .toLocaleLowerCase("en-US")
  .replace(/ё/g, "е")
  .replace(/[^a-zа-я0-9]+/gi, "");
const words = (value) => ` ${String(value || "")
  .normalize("NFKD")
  .toLocaleLowerCase("en-US")
  .replace(/ё/g, "е")
  .replace(/[^a-zа-я0-9]+/gi, " ")
  .trim()} `;
const unique = (values) => [...new Set(values.filter(Boolean))];

// Internal NPC class names and common short forms that differ from display
// names. Ambiguous bare names (for example "Calamitas") are intentionally not
// included, so the clone and final witch never contaminate each other.
const EXTRA_ALIASES = {
  "king-slime": ["KingSlime"],
  "desert-scourge": ["DesertScourgeHead", "DesertScourge"],
  "eye-of-cthulhu": ["EyeofCthulhu"],
  crabulon: ["Crabulon"],
  "eater-of-worlds": ["EaterofWorlds", "EaterofWorldsHead", "EaterofWorldsBody", "EaterofWorldsTail"],
  "brain-of-cthulhu": ["BrainofCthulhu"],
  "hive-mind": ["HiveMind"],
  perforators: ["PerforatorHive", "Perforators"],
  "queen-bee": ["QueenBee"],
  deerclops: ["Deerclops"],
  skeletron: ["SkeletronHead"],
  "slime-god": ["SlimeGodCore", "SlimeGod"],
  "wall-of-flesh": ["WallofFlesh"],
  "queen-slime": ["QueenSlimeBoss"],
  cryogen: ["Cryogen"],
  twins: ["Retinazer", "Spazmatism", "TheTwins"],
  "aquatic-scourge": ["AquaticScourgeHead", "AquaticScourge"],
  destroyer: ["TheDestroyer", "Destroyer"],
  "brimstone-elemental": ["BrimstoneElemental"],
  "skeletron-prime": ["SkeletronPrime"],
  "calamitas-clone": ["CalamitasClone"],
  plantera: ["Plantera"],
  "leviathan-anahita": ["Leviathan", "Anahita", "LeviathanandAnahita"],
  "astrum-aureus": ["AstrumAureus"],
  golem: ["Golem"],
  "duke-fishron": ["DukeFishron"],
  "plaguebringer-goliath": ["PlaguebringerGoliath"],
  ravager: ["RavagerBody", "Ravager"],
  "empress-of-light": ["HallowBoss", "FairyQueen", "EmpressofLight"],
  betsy: ["DD2Betsy"],
  "lunatic-cultist": ["CultistBoss", "AncientCultist", "LunaticCultist"],
  "astrum-deus": ["AstrumDeusHead", "AstrumDeus"],
  "moon-lord": ["MoonLordCore", "MoonLord"],
  "profaned-guardians": ["ProfanedGuardianCommander", "ProfanedGuardians"],
  dragonfolly: ["Bumblebirb", "Dragonfolly"],
  providence: ["Providence"],
  "ceaseless-void": ["CeaselessVoid"],
  "storm-weaver": ["StormWeaverHead", "StormWeaver"],
  signus: ["Signus"],
  polterghast: ["Polterghast"],
  "old-duke": ["OldDuke"],
  "devourer-of-gods": ["DevourerofGodsHead", "DevourerofGods"],
  yharon: ["Yharon"],
  "exo-mechs": ["ExoMechs", "AresBody", "ThanatosHead", "Artemis", "Apollo", "DraedonBag"],
  "supreme-calamitas": ["SupremeCalamitas", "SupremeWitchCalamitas"],
  "primordial-wyrm": ["PrimordialWyrmHead", "PrimordialWyrm"],
  hekate: ["XBHekate", "Hekate", "ExoMechdusa"],
  permafrost: ["SupremePermafrost", "SupremeUltramagePermafrost"],
  "the-lorde": ["THELORDE"],
  "giant-clam": ["GiantClam"],
  "cragmaw-mire": ["CragmawMire"],
  "great-sand-shark": ["GreatSandShark"],
  mauler: ["Mauler"],
  "nuclear-terror": ["NuclearTerror"]
};

const bossById = new Map(bosses.map((boss) => [boss.id, boss]));
const aliasesByBoss = new Map(bosses.map((boss) => {
  const aliases = unique([
    boss.id.replace(/-/g, " "), boss.en, boss.name,
    String(boss.en || "").replace(/^the\s+/i, ""),
    ...(EXTRA_ALIASES[boss.id] || [])
  ]).filter((alias) => compact(alias).length >= 4);
  return [boss.id, aliases];
}));
const textMentionsBoss = (text, bossId) => {
  const sourceCompact = compact(text);
  const sourceWords = words(text);
  return (aliasesByBoss.get(bossId) || []).some((alias) => {
    const aliasCompact = compact(alias);
    const aliasWords = words(alias).trim();
    return aliasCompact.length >= 5 && sourceCompact.includes(aliasCompact)
      || aliasWords.length >= 5 && sourceWords.includes(` ${aliasWords} `);
  });
};
const bossForNpcName = (name) => {
  const key = compact(name);
  if (!key) return "";
  for (const boss of bosses) {
    for (const alias of aliasesByBoss.get(boss.id) || []) {
      const candidate = compact(alias);
      if (key === candidate || (key.startsWith(candidate) && /(?:head|body|tail|commander|core|boss)$/.test(key.slice(candidate.length)))) return boss.id;
    }
  }
  return "";
};

const TYPE_PRIORITY = { S: 0, D: 1, A: 2, G: 3, C: 4, R: 5 };
const itemRelations = new Map();
const addRelation = (target, bossId, type) => {
  if (!bossById.has(bossId) || !TYPE_PRIORITY.hasOwnProperty(type)) return false;
  let relations = itemRelations.get(target);
  if (!relations) itemRelations.set(target, relations = new Map());
  const previous = relations.get(bossId);
  if (previous && TYPE_PRIORITY[previous] <= TYPE_PRIORITY[type]) return false;
  relations.set(bossId, type);
  return true;
};
const forceRelation = (target, bossId, type) => {
  if (!bossById.has(bossId) || !TYPE_PRIORITY.hasOwnProperty(type)) return;
  let relations = itemRelations.get(target);
  if (!relations) itemRelations.set(target, relations = new Map());
  relations.set(bossId, type);
};
const addRelationsFrom = (target, source, type = "C") => {
  let changed = false;
  for (const [bossId, sourceType] of source || []) {
    // A summoning item is not a boss material. Its relation should not infect
    // unrelated upgrades that merely happen to consume that item.
    if (sourceType === "S" || sourceType === "R") continue;
    changed = addRelation(target, bossId, type) || changed;
  }
  return changed;
};

const itemRows = catalog.items;
const itemById = new Map(itemRows.map((row) => [row[2], row]));
const itemKeyToId = new Map();
for (const row of itemRows) {
  for (const value of [row[0], row[2], ruById[row[2]]]) {
    const key = compact(value);
    if (key && !itemKeyToId.has(key)) itemKeyToId.set(key, row[2]);
  }
}

// Direct references from source-backed obtain text, official tooltips and
// trophy/lore names.
itemRows.forEach((row, index) => {
  const [name, groupId, id, obtain] = row;
  const tooltip = tooltips[index] || "";
  for (const boss of bosses) {
    if (textMentionsBoss(obtain, boss.id)) addRelation(id, boss.id, "D");
    if (textMentionsBoss(tooltip, boss.id)) {
      const summon = /\b(?:summons?|spawn(?:s|ing)?)\b/i.test(tooltip);
      addRelation(id, boss.id, summon ? "S" : "R");
    }
    if (/^(?:lore|treasure-bags|placeables|armor-vanity)$/.test(groupId) && textMentionsBoss(`${name} ${id}`, boss.id)) {
      addRelation(id, boss.id, "D");
    }
  }
});

// Exact NPC-source links. A universal drop such as Aquatic Heart is omitted
// when it points at many encounters; those links do not describe one useful
// progression dependency and would flood every card with boss chips.
for (const [itemId, source] of Object.entries(npcSources)) {
  const linked = new Set((source.npcs || []).map((entry) => bossForNpcName(entry.npc)).filter(Boolean));
  if (linked.size > 0 && linked.size <= 6) linked.forEach((bossId) => addRelation(itemId, bossId, "D"));
}

const EXPLICIT_ITEMS = {
  "hive-mind": { S: ["Teratoma"], G: ["AerialiteOre", "AerialiteBar"] },
  perforators: { S: ["BloodyWormFood"], D: ["BloodyVein"], G: ["AerialiteOre", "AerialiteBar"] },
  cryogen: { S: ["CryoKey"] },
  "ceaseless-void": { S: ["MarkofProvidence"], D: ["DarkPlasma"] },
  "storm-weaver": { S: ["MarkofProvidence"], D: ["ArmoredShell"] },
  signus: { S: ["MarkofProvidence"], D: ["TwistingNether"] },
  "duke-fishron": { D: ["DukesDecapitator", "BrinyBaron"] },
  "lunatic-cultist": { S: ["EidolonTablet"], D: ["LorePrelude"] },
  "primordial-wyrm": { D: ["HalibutCannon", "EidolicWail", "GrandDad", "AbyssShellFossil", "Voidstone", "Lumenyl"] },
  hekate: { S: ["BloodyVein"], D: ["LavaChickenBroth"] },
  permafrost: { S: ["DeliciousMeat"], D: ["ColdheartIcicle"] },
  "the-lorde": { S: ["NO"], D: ["SuspiciousLookingNOU"] },
  "cragmaw-mire": { D: ["NuclearFuelRod", "SpentFuelContainer", "CragmawMireTrophy", "CragmawMireRelic"] },
  "great-sand-shark": { S: ["SandstormsCore"], D: ["GrandScale", "GreatSandSharkTrophy", "GreatSandSharkRelic"] },
  mauler: { D: ["SulphuricAcidCannon", "MaulerTrophy", "MaulerRelic"] },
  "nuclear-terror": { D: ["GammaHeart", "PhosphorescentGauntlet", "NuclearTerrorTrophy", "NuclearTerrorRelic"] }
};
for (const [bossId, groups] of Object.entries(EXPLICIT_ITEMS)) {
  for (const [type, ids] of Object.entries(groups)) ids.filter((id) => itemById.has(id)).forEach((id) => forceRelation(id, bossId, type));
}
// The source parser sees the containing SupremeCalamitas class but the drop
// rule itself is conditional on the Permafrost replacement form only.
itemRelations.get("ColdheartIcicle")?.delete("supreme-calamitas");

// Vanilla boss rewards/summons that can appear as ingredients in Calamity
// recipes. Names use the official English ItemName values from the pinned
// Terraria index and are resolved to numeric IDs below.
const VANILLA_SEEDS = {
  "eater-of-worlds": {
    S: ["Worm Food"],
    D: ["Shadow Scale", "Worm Scarf", "Eater's Bone", "Eater of Worlds Mask", "Eater of Worlds Trophy", "Eater of Worlds Relic"]
  },
  "brain-of-cthulhu": {
    S: ["Bloody Spine"],
    D: ["Tissue Sample", "Brain of Confusion", "Bone Rattle", "Brain of Cthulhu Mask", "Brain of Cthulhu Trophy", "Brain of Cthulhu Relic"]
  },
  twins: {
    S: ["Mechanical Eye"],
    D: ["Soul of Sight", "Twin Mask", "Retinazer Trophy", "Spazmatism Trophy", "Twins Relic", "Mechanical Wheel Piece", "Hallowed Bar"]
  },
  destroyer: {
    S: ["Mechanical Worm"],
    D: ["Soul of Might", "Destroyer Mask", "Destroyer Trophy", "Destroyer Relic", "Mechanical Wagon Piece", "Hallowed Bar"]
  },
  "skeletron-prime": {
    S: ["Mechanical Skull"],
    D: ["Soul of Fright", "Skeletron Prime Mask", "Skeletron Prime Trophy", "Skeletron Prime Relic", "Mechanical Battery Piece", "Hallowed Bar"]
  },
  "duke-fishron": {
    S: ["Truffle Worm"],
    D: ["Flairon", "Tsunami", "Bubble Gun", "Razorblade Typhoon", "Tempest Staff", "Fishron Wings", "Shrimpy Truffle", "Duke Fishron Mask", "Duke Fishron Trophy", "Duke Fishron Relic"]
  },
  "empress-of-light": {
    S: ["Prismatic Lacewing"],
    D: ["Nightglow", "Starlight", "Eventide", "Kaleidoscope", "Terraprisma", "Empress Wings", "Soaring Insignia", "Jewel of Light", "Empress of Light Mask", "Empress of Light Trophy", "Empress of Light Relic"]
  },
  betsy: {
    S: ["Eternia Crystal"],
    D: ["Flying Dragon", "Sky Dragon's Fury", "Aerial Bane", "Betsy's Wrath", "Betsy's Wings", "Betsy Mask", "Betsy Trophy", "Betsy Relic", "Dragon Egg"]
  },
  "lunatic-cultist": {
    D: ["Ancient Manipulator", "Lunatic Cultist Mask", "Lunatic Cultist Trophy", "Lunatic Cultist Relic", "Tablet Fragment"]
  },
  "primordial-wyrm": {
    S: ["Rod of Discord", "Rod of Harmony"]
  }
};

const vanillaRows = vanilla.items;
const firstVanillaId = Number(vanilla.firstItemId || 1);
const vanillaNameToId = new Map();
const vanillaIdToName = new Map();
vanillaRows.forEach((row, offset) => {
  const id = firstVanillaId + offset;
  vanillaNameToId.set(compact(row[0]), id);
  vanillaNameToId.set(compact(vanillaRu[id]), id);
  vanillaIdToName.set(id, row[0]);
});
const vanillaRelations = new Map();
const addVanillaRelation = (id, bossId, type) => {
  if (!id || !bossById.has(bossId)) return false;
  let relations = vanillaRelations.get(id);
  if (!relations) vanillaRelations.set(id, relations = new Map());
  const previous = relations.get(bossId);
  if (previous && TYPE_PRIORITY[previous] <= TYPE_PRIORITY[type]) return false;
  relations.set(bossId, type);
  return true;
};
for (const [bossId, groups] of Object.entries(VANILLA_SEEDS)) {
  for (const [type, names] of Object.entries(groups)) {
    names.forEach((name) => addVanillaRelation(vanillaNameToId.get(compact(name)), bossId, type));
  }
}

// Propagate vanilla recipe provenance first. Ancient Manipulator is itself the
// Cultist reward, and its station gate is therefore explicit even when no
// ingredient names the boss.
for (let pass = 0; pass < 12; pass += 1) {
  let changed = false;
  for (const [resultId, stationId, ingredients] of vanilla.recipes || []) {
    for (const [ingredientId] of ingredients || []) {
      const source = vanillaRelations.get(Number(ingredientId));
      for (const [bossId, sourceType] of source || []) {
        if (sourceType !== "S" && sourceType !== "R") changed = addVanillaRelation(Number(resultId), bossId, "C") || changed;
      }
    }
    const station = (vanilla.stations || []).find((entry) => Number(entry[0]) === Number(stationId))?.[1] || "";
    if (/Ancient Manipulator/i.test(station)) changed = addVanillaRelation(Number(resultId), "lunatic-cultist", "G") || changed;
  }
  if (!changed) break;
}

const parseIngredientTokens = (obtain) => {
  const match = String(obtain || "").match(/^Скрафтить(?:\s+из)?:\s*([\s\S]*?)(?:\s+·\s+у\s+|\.$)/i);
  if (!match) return [];
  return match[1].split(/\s+\+\s+/).map((part) => part
    .replace(/^\d+(?:[.,]\d+)?\s*×\s*/i, "")
    .replace(/^ещё\s+\d+$/i, "")
    .trim()).filter(Boolean);
};
const dependencyIds = new Map();
const dependencyVanillaIds = new Map();
for (const row of itemRows) {
  const modIds = new Set();
  const vanillaIds = new Set();
  for (const token of parseIngredientTokens(row[3])) {
    const key = compact(token.replace(/^any\s+/i, ""));
    const modId = itemKeyToId.get(key);
    if (modId && modId !== row[2]) modIds.add(modId);
    const vanillaId = vanillaNameToId.get(key);
    if (vanillaId) vanillaIds.add(vanillaId);
  }
  dependencyIds.set(row[2], modIds);
  dependencyVanillaIds.set(row[2], vanillaIds);
  if (/у древнего манипулятора/i.test(row[3])) addRelation(row[2], "lunatic-cultist", "G");
}

// Recipe closure: any crafted upgrade receives all concrete boss materials of
// its dependencies, including vanilla boss drops.
for (let pass = 0; pass < 18; pass += 1) {
  let changed = false;
  for (const row of itemRows) {
    const id = row[2];
    for (const dependency of dependencyIds.get(id) || []) changed = addRelationsFrom(id, itemRelations.get(dependency), "C") || changed;
    for (const dependency of dependencyVanillaIds.get(id) || []) {
      for (const [bossId, sourceType] of vanillaRelations.get(dependency) || []) {
        if (sourceType !== "S" && sourceType !== "R") changed = addRelation(id, bossId, "C") || changed;
      }
    }
  }
  if (!changed) break;
}

// Secret-seed replacements award the normal final-boss pools. Keep the normal
// encounter and add an explicit alternative relation instead of pretending the
// hidden fight is mandatory in ordinary worlds.
for (const [itemId, relations] of itemRelations) {
  if (relations.has("exo-mechs") && relations.get("exo-mechs") !== "S") addRelation(itemId, "hekate", "A");
  if (relations.has("supreme-calamitas") && relations.get("supreme-calamitas") !== "S") addRelation(itemId, "permafrost", "A");
}
for (const [itemId, relations] of vanillaRelations) {
  if (relations.has("exo-mechs") && relations.get("exo-mechs") !== "S") addVanillaRelation(itemId, "hekate", "A");
  if (relations.has("supreme-calamitas") && relations.get("supreme-calamitas") !== "S") addVanillaRelation(itemId, "permafrost", "A");
}

const relationForText = (text, directType = "R") => {
  const result = new Map();
  for (const boss of bosses) if (textMentionsBoss(text, boss.id)) result.set(boss.id, directType);
  return result;
};
const mergeMap = (target, source, type = "") => {
  for (const [bossId, sourceType] of source || []) {
    const nextType = type || sourceType;
    const previous = target.get(bossId);
    if (!previous || TYPE_PRIORITY[nextType] < TYPE_PRIORITY[previous]) target.set(bossId, nextType);
  }
};
const relationForEntry = (entry, kind) => {
  const result = new Map();
  const name = String(entry.name || entry.t || "");
  const catalogId = itemKeyToId.get(compact(name));
  if (catalogId) mergeMap(result, itemRelations.get(catalogId));
  const vanillaId = vanillaNameToId.get(compact(name));
  if (vanillaId) mergeMap(result, vanillaRelations.get(vanillaId));
  const sourceText = String(entry.get || entry.obtain || entry.r || entry.ings || "");
  const otherText = String(entry.why || entry.w || entry.desc || entry.when || entry.stage || "");
  mergeMap(result, relationForText(sourceText, kind === "craft" ? "C" : "D"));
  mergeMap(result, relationForText(otherText, "G"));
  for (const token of sourceText.split(/\s*(?:\+|\/|,|→)\s*/)) {
    const tokenKey = compact(token.replace(/^\d+(?:[.,]\d+)?\s*×?\s*/i, ""));
    const dependency = itemKeyToId.get(tokenKey);
    if (dependency) mergeMap(result, itemRelations.get(dependency), "C");
    const vanillaDependency = vanillaNameToId.get(tokenKey);
    if (vanillaDependency) mergeMap(result, vanillaRelations.get(vanillaDependency), "C");
  }
  return result;
};

const guideRelations = new Map();
for (const item of context.CODEX.items || []) {
  const relation = relationForEntry(item, "guide");
  if (relation.size) guideRelations.set(String(item.name), relation);
}
const allCrafts = [...(context.CODEX.crafts || []), ...(context.CODEX.quests || []).flatMap((quest) => quest.crafts || [])];
const craftRelations = new Map();
for (const craft of allCrafts) {
  const name = String(craft.name || craft.t || "");
  if (!name) continue;
  const relation = relationForEntry(craft, "craft");
  if (!relation.size) continue;
  const existing = craftRelations.get(name) || new Map();
  mergeMap(existing, relation);
  craftRelations.set(name, existing);
}

const bossOrder = new Map(bosses.map((boss, index) => [boss.id, index]));
const typeOrder = ["S", "D", "A", "G", "C", "R"];
const compactRelations = (relations) => [...relations]
  .sort((a, b) => (bossOrder.get(a[0]) ?? 999) - (bossOrder.get(b[0]) ?? 999) || TYPE_PRIORITY[a[1]] - TYPE_PRIORITY[b[1]])
  .map(([bossId, type]) => [bossOrder.get(bossId), typeOrder.indexOf(type)]);
const itemOutput = [...itemRelations]
  .filter(([, relations]) => relations.size)
  .sort((a, b) => a[0].localeCompare(b[0], "en"))
  .map(([id, relations]) => [id, compactRelations(relations)]);
const vanillaOutput = [...vanillaRelations]
  .filter(([, relations]) => relations.size)
  .sort((a, b) => a[0] - b[0])
  .map(([id, relations]) => [id, compactRelations(relations)]);
const guideOutput = [...guideRelations]
  .sort((a, b) => a[0].localeCompare(b[0], "en"))
  .map(([name, relations]) => [name, compactRelations(relations)]);
const craftOutput = [...craftRelations]
  .sort((a, b) => a[0].localeCompare(b[0], "ru"))
  .map(([name, relations]) => [name, compactRelations(relations)]);
const bossCounts = bosses.map((boss, index) => {
  const countRows = (rows) => rows.filter(([, relations]) => relations.some(([bossIndex]) => bossIndex === index)).length;
  return [boss.id, countRows(itemOutput), countRows(vanillaOutput), countRows(guideOutput), countRows(craftOutput)];
});
const coverage = {
  catalogItems: itemOutput.length,
  directCatalogItems: itemOutput.filter(([, relations]) => relations.some(([, type]) => [0, 1, 2].includes(type))).length,
  recipeLinkedCatalogItems: itemOutput.filter(([, relations]) => relations.some(([, type]) => [3, 4].includes(type))).length,
  vanillaItems: vanillaOutput.length,
  guideItems: guideOutput.length,
  crafts: craftOutput.length,
  maxBossesPerCatalogItem: Math.max(0, ...itemOutput.map(([, relations]) => relations.length)),
  bossCounts
};
const payload = {
  format: 1,
  source: `${catalog.source}@${catalog.commit}`,
  bosses: bosses.map((boss) => boss.id),
  types: typeOrder,
  items: itemOutput,
  vanilla: vanillaOutput,
  guides: guideOutput,
  crafts: craftOutput,
  coverage
};
const banner = `/* Boss/item/craft relation index. Generated by scripts/build-boss-relations.mjs.\n * Source: ${payload.source}\n */\n`;
fs.writeFileSync(output, `${banner}window.CALAMITY_BOSS_RELATIONS=${JSON.stringify(payload)};\n`);
console.log(`Boss relations: ${itemOutput.length} catalog items (${coverage.directCatalogItems} direct, ${coverage.recipeLinkedCatalogItems} recipe-linked), ${vanillaOutput.length} vanilla items, ${guideOutput.length} guide items, ${craftOutput.length} crafts.`);
console.log(`Maximum boss links on one catalog item: ${coverage.maxBossesPerCatalogItem}.`);
