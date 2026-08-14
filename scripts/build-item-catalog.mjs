#!/usr/bin/env node
/**
 * Build the offline item index from CalamityModPublic's English localization.
 *
 * Usage:
 *   node scripts/build-item-catalog.mjs /path/to/CalamityModPublic/Localization/en-US [output]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const sourceDir = path.resolve(process.argv[2] || "../CalamityModPublic/Localization/en-US");
const output = path.resolve(process.argv[3] || "calamity-codex/js/catalog.js");
const sourceRepo = path.resolve(sourceDir, "../..");

const FILE_PREFIX = "Mods.CalamityMod.Items.";
const FILE_SUFFIX = ".hjson";
const GROUPS = {
  "Accessories.Wings": ["wings", "Крылья", "acc", "all"],
  Accessories: ["accessories", "Аксессуары", "acc", "all"],
  Ammo: ["ammo", "Боеприпасы", "ammo", "all"],
  "Armor.Hardmode": ["armor-hardmode", "Броня · хардмод", "armor", "all"],
  "Armor.PostMoonLord": ["armor-post-ml", "Броня · после Луны", "armor", "all"],
  "Armor.PreHardmode": ["armor-pre-hardmode", "Броня · прехардмод", "armor", "all"],
  "Armor.Vanity": ["armor-vanity", "Декоративная броня", "armor", "all"],
  DraedonItems: ["draedon-items", "Предметы Дрейдона", "misc", "all"],
  Dyes: ["dyes", "Красители", "misc", "all"],
  Fishing: ["fishing", "Рыбалка", "tool", "all"],
  Lore: ["lore", "История мира", "misc", "all"],
  Materials: ["materials", "Материалы", "mat", "all"],
  Misc: ["misc", "Прочее", "misc", "all"],
  Mounts: ["mounts", "Маунты", "summon", "all"],
  Pets: ["pets", "Питомцы", "summon", "all"],
  Placeables: ["placeables", "Размещаемые предметы", "misc", "all"],
  Potions: ["potions", "Зелья и расходники", "potion", "all"],
  SummonItems: ["summon-items", "Предметы призыва", "summon", "all"],
  Tools: ["tools", "Инструменты", "tool", "all"],
  TreasureBags: ["treasure-bags", "Сумки с сокровищами", "misc", "all"],
  "Weapons.DraedonsArsenal": ["weapons-draedon", "Арсенал Дрейдона", "weapon", "ranged"],
  "Weapons.Magic": ["weapons-magic", "Магическое оружие", "weapon", "mage"],
  "Weapons.Melee": ["weapons-melee", "Оружие воина", "weapon", "melee"],
  "Weapons.Ranged": ["weapons-ranged", "Оружие стрелка", "weapon", "ranged"],
  "Weapons.Rogue": ["weapons-rogue", "Оружие плута", "weapon", "rogue"],
  "Weapons.Summon": ["weapons-summon", "Оружие призывателя", "weapon", "summoner"],
  "Weapons.Typeless": ["weapons-classless", "Бесклассовое оружие", "weapon", "all"]
};

function humanizeId(id) {
  return id
    .replace(/Item$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .trim();
}

function cleanDisplayName(value, id) {
  let name = value.trim();
  if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
    name = name.slice(1, -1);
  }
  if (!name || name === "'''" || /\{\$[^}]+\}/.test(name)) return humanizeId(id);
  return name.replace(/\\"/g, '"');
}

function readItems(file, groupId) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const result = [];
  let currentId = "";
  for (const line of lines) {
    const top = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*\{\s*$/);
    if (top) {
      currentId = top[1];
      continue;
    }
    if (!currentId) continue;
    const display = line.match(/^\tDisplayName:\s*(.*)$/);
    if (display) {
      const name = cleanDisplayName(display[1], currentId);
      if (name) result.push([name, groupId, currentId]);
      currentId = "";
    } else if (/^\S/.test(line) && line.trim()) {
      currentId = "";
    }
  }
  return result;
}

if (!fs.existsSync(sourceDir)) {
  console.error(`Localization directory not found: ${sourceDir}`);
  process.exit(1);
}

const groupRecords = [];
const items = [];
for (const [sourceName, [id, label, kind, cls]] of Object.entries(GROUPS)) {
  const file = path.join(sourceDir, `${FILE_PREFIX}${sourceName}${FILE_SUFFIX}`);
  if (!fs.existsSync(file)) throw new Error(`Missing localization file: ${file}`);
  const groupItems = readItems(file, id);
  groupRecords.push([id, label, kind, cls, groupItems.length]);
  items.push(...groupItems);
}

// A display name can occur more than once for legacy/internal variants. The index
// is for readers, so keep one visible record per official English name.
const seen = new Set();
const uniqueItems = items
  .filter(([name]) => {
    const key = name.toLocaleLowerCase("en-US");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .sort((a, b) => a[0].localeCompare(b[0], "en", { sensitivity: "base" }));
const groupCounts = uniqueItems.reduce((counts, [, group]) => {
  counts.set(group, (counts.get(group) || 0) + 1);
  return counts;
}, new Map());
groupRecords.forEach((group) => { group[4] = groupCounts.get(group[0]) || 0; });

let commit = "unknown";
let sourceDate = "unknown";
try {
  commit = execFileSync("git", ["-C", sourceRepo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  sourceDate = execFileSync("git", ["-C", sourceRepo, "log", "-1", "--format=%cI"], { encoding: "utf8" }).trim();
} catch {
  // Generation still works from an exported localization directory.
}

const payload = {
  modVersion: "2.2.2",
  source: "CalamityTeam/CalamityModPublic",
  commit,
  sourceDate,
  generatedAt: "2026-08-15",
  groups: groupRecords,
  items: uniqueItems
};
const banner = `/* Offline Calamity Mod item index. Generated; do not edit by hand.\n * Source: ${payload.source}@${commit}\n * Build: node scripts/build-item-catalog.mjs <Localization/en-US>\n */\n`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${banner}window.CALAMITY_ITEM_INDEX=${JSON.stringify(payload)};\n`);
console.log(`Wrote ${uniqueItems.length} unique items across ${groupRecords.length} groups to ${output}`);
