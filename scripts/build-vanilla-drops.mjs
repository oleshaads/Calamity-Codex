#!/usr/bin/env node
/*
 * Генератор ванильных лут-таблиц: кто из NPC роняет какой предмет.
 * Источник: Terraria.GameContent.ItemDropRules/ItemDropDatabase.cs из
 * декомпилированного Terraria 1.4.5.0 (JonataOliveiraa/Terraria1.4.5).
 *
 * Использование: node scripts/build-vanilla-drops.mjs [--src /tmp/src]
 * Выход: calamity-codex/js/vanilla-drops.js
 * Формат: { format: 1, npc: { "<netId>": [[itemId, den, min, max, flags], ...] } }
 * flags: 1 = мастер-режим, 2 = мешок босса/эксперт, 4 = особое условие, 8 = один из набора.
 */
import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dirname, "..");
const SRC = path.resolve(process.argv.includes("--src") ? process.argv[process.argv.indexOf("--src") + 1] : "/tmp/src");
const normalizeCs = (raw) => raw.replace(/\r/g, "").replace(/\/\*[^*]*\*\//g, "").replace(/[ \t]+;/g, ";");
const source = normalizeCs(fs.readFileSync(path.join(SRC, "vanilla/ItemDropDatabase.cs"), "utf8"));
const OUT = path.join(REPO, "calamity-codex/js/vanilla-drops.js");

const F_MASTER = 1, F_EXPERT = 2, F_COND = 4, F_ONEOF = 8;

/* --- вырезать вызов с балансировкой скобок --- */
function callAt(text, index) {
  const open = text.indexOf("(", index);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "(") depth++;
    else if (text[i] === ")") { depth--; if (!depth) return text.slice(open + 1, i); }
  }
  return "";
}
/* --- деление аргументов по верхнему уровню --- */
function splitArgs(argText) {
  const args = [];
  let depth = 0, cur = "";
  for (const ch of argText) {
    if (ch === "(" || ch === "[") depth++;
    if (ch === ")" || ch === "]") depth--;
    if (ch === "," && !depth) { args.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) args.push(cur.trim());
  return args;
}

/* --- разбор правил дропа внутри выражения --- */
function rulesFromExpression(expr) {
  const found = [];
  const baseFlags = /Condition|OnSuccess/.test(expr) ? F_COND : 0;
  const simple = {
    Common: 0, NotScalingWithLuck: 0, Food: 0, StatusImmunityItem: 0,
    WithRerolls: -1, ExpertGetsRerolls: 0, NormalvsExpert: 0,
    MasterModeCommonDrop: F_MASTER, MasterModeDropOnAllPlayers: F_MASTER,
    BossBag: F_EXPERT, BossBagByCondition: F_EXPERT | F_COND, ByCondition: F_COND
  };
  const ruleRx = /ItemDropRule\.(\w+)\(/g;
  let m;
  while ((m = ruleRx.exec(expr))) {
    const kind = m[1];
    const rawArgs = splitArgs(callAt(expr, m.index + m[0].length - 1));
    const nums = rawArgs.map((a) => (/^\d+$/.test(a) ? Number(a) : null));
    if (kind in simple) {
      // Условие в ByCondition-стиле стоит первым аргументом — пропускаем нечисловые.
      const numeric = nums.filter((n) => n !== null);
      const shift = nums[0] === null ? 1 : 0;
      const item = nums[shift];
      if (!item) continue;
      let den = 1, min = 1, max = 1;
      if (kind === "NormalvsExpert") { den = nums[shift + 1] || 1; }
      else if (kind === "ExpertGetsRerolls") { den = nums[shift + 1] || 1; }
      else if (kind === "WithRerolls") { den = nums[shift + 2] || 1; }
      else if (kind === "MasterModeCommonDrop" || kind === "MasterModeDropOnAllPlayers") { den = 4; }
      else if (kind === "BossBag" || kind === "BossBagByCondition") { den = 1; }
      else {
        den = nums[shift + 1] ?? 1;
        min = nums[shift + 2] ?? 1;
        max = nums[shift + 3] ?? min;
      }
      found.push([item, den || 1, min || 1, max || min || 1, baseFlags | (simple[kind] > 0 ? simple[kind] : 0)]);
      continue;
    }
    if (/OneFromOptions/.test(kind)) {
      const isNormalVs = /NormalvsExpert/.test(kind);
      const items = nums.slice(isNormalVs ? 2 : 1).filter((n) => n !== null);
      const den = nums[0] || 1;
      items.forEach((item) => found.push([item, den, 1, 1, baseFlags | F_ONEOF]));
    }
  }
  // new CommonDrop(item, den, min, max) в DropBasedOnExpertMode и т. п.
  const cdRx = /new CommonDrop(?:NotScalingWithLuck|WithRerolls)?\((\d+), (\d+)(?:, (\d+))?(?:, (\d+))?/g;
  while ((m = cdRx.exec(expr))) {
    found.push([Number(m[1]), Number(m[2]) || 1, Number(m[3] || 1), Number(m[4] || m[3] || 1), baseFlags]);
  }
  return found;
}

/* --- проход по файлу с отслеживанием числовых переменных (short type = N;) --- */
const varRx = /(?:short|int)\s+(\w+)\s*=\s*(\d+);|(?<![.\w])(\w+)\s*=\s*(\d+);/g;
const vars = [];
let vm;
while ((vm = varRx.exec(source))) {
  const name = vm[1] || vm[3];
  const value = Number(vm[2] || vm[4]);
  if (name && /^(type|num\d*|npcNetId\d*)$/.test(name)) vars.push([vm.index, name, value]);
}
// Массивы NPC: int[] npcNetIds5 = new int[3] { 3, 132, 186 };
const arrayRx = /int\[\]\s+(\w+)\s*=\s*new int\[\d*\]\s*\{([^}]*)\}/g;
const arrays = [];
let am;
while ((am = arrayRx.exec(source))) {
  const values = am[2].split(",").map((v) => Number(v.trim())).filter((v) => Number.isFinite(v));
  arrays.push([am.index, am[1], values]);
}
const arrayValueAt = (name, position) => {
  let value = null;
  for (const [index, arrName, arrValues] of arrays) {
    if (index > position) break;
    if (arrName === name) value = arrValues;
  }
  return value;
};
const varValueAt = (name, position) => {
  let value = null;
  for (const [index, varName, varValue] of vars) {
    if (index > position) break;
    if (varName === name) value = varValue;
  }
  return value;
};
const resolveNpcList = (token, position) => {
  if (/^-?\d+$/.test(token)) return [Number(token)];
  if (/^\w+$/.test(token)) {
    const arr = arrayValueAt(token, position);
    if (arr) return arr;
    const scalar = varValueAt(token, position);
    return scalar === null ? [] : [scalar];
  }
  return [];
};

const drops = new Map(); // npcId -> Map(key -> row)
const add = (npcId, rows) => {
  if (!npcId || npcId <= 0 || !rows.length) return;
  const bucket = drops.get(npcId) || new Map();
  rows.forEach((row) => {
    const key = row.join(":");
    if (!bucket.has(key)) bucket.set(key, row);
  });
  drops.set(npcId, bucket);
};

const registerRx = /Register(ToNPC|ToMultipleNPCs(?:NotRemixSeed|RemixSeed)?)\(/g;
let statements = 0;
let rm;
while ((rm = registerRx.exec(source))) {
  const argsText = callAt(source, rm.index + rm[0].length - 1);
  if (!argsText) continue;
  const args = splitArgs(argsText);
  statements++;
  // Вся инструкция до «;» — так не теряются цепочки .OnSuccess/.OnFailedRoll.
  const statement = source.slice(rm.index, source.indexOf(";", rm.index));
  const rows = rulesFromExpression(statement);
  if (rm[1] === "ToNPC") {
    resolveNpcList(args[0], rm.index).forEach((npcId) => add(npcId, rows));
  } else {
    args.slice(1).forEach((token) => resolveNpcList(token, rm.index).forEach((npcId) => add(npcId, rows)));
  }
}

const output = {};
let pairs = 0;
const usedItems = new Set();
[...drops.keys()].sort((a, b) => a - b).forEach((npcId) => {
  const rows = [...drops.get(npcId).values()];
  output[npcId] = rows;
  rows.forEach((row) => usedItems.add(row[0]));
  pairs += rows.length;
});

// Русские имена предметов из официальной локализации 1.4.5 + наличие локального спрайта.
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "").replace(/,(\s*[}\]])/g, "$1"));
const itemIdCs = normalizeCs(fs.readFileSync(path.join(SRC, "vanilla/ItemID.cs"), "utf8"));
const ITEM_KEY_BY_ID = new Map();
for (const m of itemIdCs.matchAll(/public const (?:short|int) (\w+) = (\d+);/g)) {
  if (m[1] !== "Count" && !ITEM_KEY_BY_ID.has(Number(m[2]))) ITEM_KEY_BY_ID.set(Number(m[2]), m[1]);
}
const ruItems = readJson(path.join(SRC, "vanilla/ru-Items.json")).ItemName || {};
const enItems = readJson(path.join(SRC, "vanilla/en-Items.json")).ItemName || {};
const names = {};
let named = 0;
usedItems.forEach((itemId) => {
  const key = ITEM_KEY_BY_ID.get(itemId);
  const ru = (key && (ruItems[key] || enItems[key])) || "";
  if (!ru || /^\{\$/.test(ru)) return;
  const art = fs.existsSync(path.join(REPO, "calamity-codex/assets/vanilla-sprites", `${itemId}.png`)) ? 1 : 0;
  names[itemId] = [ru, art];
  named++;
});

fs.writeFileSync(OUT, `/* Generated by scripts/build-vanilla-drops.mjs. Do not edit by hand.
 * Source: Terraria 1.4.5.0 decompiled ItemDropDatabase.cs (JonataOliveiraa/Terraria1.4.5);
 * item display names from the official 1.4.5 ru-RU localization.
 * npc: { "<npcId>": [[itemId, chanceDenominator, min, max, flags], ...] }
 * flags: 1 master, 2 boss bag / expert, 4 conditional, 8 one-of-options
 */
window.CALAMITY_VANILLA_DROPS = { format: 2, npc: ${JSON.stringify(output)}, names: ${JSON.stringify(names)} };
`);
console.log(`Обработано регистраций: ${statements}; NPC с дропом: ${drops.size}; пар NPC→предмет: ${pairs}; имён предметов: ${named}`);
console.log("OK ->", path.relative(REPO, OUT));
