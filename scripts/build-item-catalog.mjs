#!/usr/bin/env node
/**
 * Build the rich offline item catalog from the official CalamityModPublic source.
 *
 * Usage:
 *   node scripts/build-item-catalog.mjs \
 *     /path/to/CalamityModPublic/Localization/en-US \
 *     [calamity-codex/js/catalog.js] \
 *     [calamity-codex/assets/item-sprites]
 *
 * When the source checkout also contains Items/ and NPCs/, the builder adds
 * official tooltips, crafting/drop hints, progression hints and local sprites.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const sourceDir = path.resolve(process.argv[2] || "../CalamityModPublic/Localization/en-US");
const output = path.resolve(process.argv[3] || "calamity-codex/js/catalog.js");
const sourceRepo = path.resolve(sourceDir, "../..");
const itemSourceDir = path.join(sourceRepo, "Items");
const npcSourceDir = path.join(sourceRepo, "NPCs");
const spriteOutput = path.resolve(process.argv[4] || path.join(path.dirname(output), "../assets/item-sprites"));

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

const STATIONS_RU = {
  Anvils: "у железной или свинцовой наковальни",
  WorkBenches: "у верстака",
  Furnaces: "у печи",
  Hellforge: "у адской печи",
  MythrilAnvil: "у мифриловой или орихалковой наковальни",
  LunarCraftingStation: "у древнего манипулятора",
  Bookcases: "у книжного шкафа",
  TinkerersWorkbench: "у мастерской инженера",
  AlchemyTable: "на алхимическом столе",
  Bottles: "у поставленной бутылки",
  CookingPots: "у котла",
  Loom: "у ткацкого станка",
  DyeVat: "в красильном чане",
  Solidifier: "в затвердевателе",
  HeavyWorkBench: "у тяжёлого верстака",
  Autohammer: "в автокузнице",
  CosmicAnvil: "у космической наковальни",
  DraedonsForge: "в кузнице Дрейдона",
  VoidCondenser: "в конденсаторе пустоты",
  ParticleAccelerator: "в ускорителе частиц"
};
const RECIPE_GROUP_RU = {
  AnyGoldBar: "золотой или платиновый слиток",
  AnyIronBar: "железный или свинцовый слиток",
  AnyEvilBar: "демонитовый или кримтановый слиток",
  AnyQuiver: "любой колчан",
  AnyWings: "любые крылья",
  AnyWood: "любая древесина",
  Birds: "любая птица",
  Butterflies: "любая бабочка",
  Fragment: "любой небесный фрагмент"
};

function walkFiles(dir, accept = () => true) {
  if (!fs.existsSync(dir)) return [];
  const result = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (accept(full)) result.push(full);
    }
  }
  return result;
}

function humanizeId(id) {
  return String(id || "")
    .replace(/Item$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/_/g, " ")
    .trim();
}

function unquote(value) {
  const text = String(value || "").trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1).replace(/\\"/g, '"');
  }
  return text;
}

function cleanDisplayName(value, id) {
  const name = unquote(value);
  if (!name || name === "'''" || /\{\$[^}]+\}/.test(name)) return humanizeId(id);
  return name;
}

function cleanTooltip(value) {
  return unquote(value)
    .replace(/\{\$[^}]+\}/g, "")
    .replace(/\[(?:c)?(?:buff|debuff):(?:[^/\]]+\/)?([^\]]+)\]/gi, (_, id) => humanizeId(id))
    .replace(/\[(?:i|item):[^\]]+\]/gi, "предмет")
    .replace(/\[c\/[0-9a-f]+:([^\]]+)\]/gi, "$1")
    .replace(/<left>/gi, "ЛКМ")
    .replace(/<right>/gi, "ПКМ")
    .replace(/\[[A-Z][A-Z ]+\]/g, "")
    .replace(/\\n/g, " · ")
    .replace(/\s*\n\s*/g, " · ")
    .replace(/\s*·\s*·\s*/g, " · ")
    .replace(/\s+/g, " ")
    .replace(/^\s*·\s*|\s*·\s*$/g, "")
    .trim()
    .slice(0, 520);
}

function parseTooltip(blockLines) {
  const index = blockLines.findIndex((line) => /^\tTooltip:\s*/.test(line));
  if (index < 0) return "";
  const inline = blockLines[index].replace(/^\tTooltip:\s*/, "").trim();
  if (inline && inline !== "'''") return cleanTooltip(inline);
  if (inline === "'''") {
    const collected = [];
    for (let i = index + 1; i < blockLines.length; i += 1) {
      if (blockLines[i].trim() === "'''") break;
      collected.push(blockLines[i].replace(/^\t+/, ""));
    }
    return cleanTooltip(collected.join("\n"));
  }
  if (blockLines[index + 1]?.trim() === "'''") {
    const collected = [];
    for (let i = index + 2; i < blockLines.length; i += 1) {
      if (blockLines[i].trim() === "'''") break;
      collected.push(blockLines[i].replace(/^\t+/, ""));
    }
    return cleanTooltip(collected.join("\n"));
  }
  return "";
}

function readItems(file, groupId) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  const result = [];
  let currentId = "";
  let block = [];
  const flush = () => {
    if (!currentId) return;
    const displayLine = block.find((line) => /^\tDisplayName:\s*/.test(line));
    if (displayLine) {
      const name = cleanDisplayName(displayLine.replace(/^\tDisplayName:\s*/, ""), currentId);
      if (name) result.push({ name, groupId, id: currentId, tooltip: parseTooltip(block) });
    }
  };
  for (const line of lines) {
    const top = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*\{\s*$/);
    if (top) {
      flush();
      currentId = top[1];
      block = [];
    } else if (currentId) {
      block.push(line);
    }
  }
  flush();
  return result;
}

function classSegment(source, id) {
  const match = new RegExp(`\\bclass\\s+${id}\\b`).exec(source);
  if (!match) return source;
  const open = source.indexOf("{", match.index);
  if (open < 0) return source.slice(match.index);
  let depth = 0;
  let string = "";
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    const prev = source[i - 1];
    if (string) {
      if (char === string && prev !== "\\") string = "";
      continue;
    }
    if (char === '"' || char === "'") {
      string = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}" && --depth === 0) return source.slice(match.index, i + 1);
  }
  return source.slice(match.index);
}

function sourceIndex() {
  const files = walkFiles(itemSourceDir, (file) => file.endsWith(".cs"));
  const byBase = new Map();
  const byClass = new Map();
  const sourceCache = new Map();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    sourceCache.set(file, source);
    const base = path.basename(file, ".cs").toLocaleLowerCase("en-US");
    if (!byBase.has(base)) byBase.set(base, file);
    for (const match of source.matchAll(/\bclass\s+([A-Za-z_][A-Za-z0-9_]*)\b/g)) {
      const key = match[1].toLocaleLowerCase("en-US");
      if (!byClass.has(key)) byClass.set(key, file);
    }
  }
  return { files, byBase, byClass, sourceCache };
}

function findSourceFile(index, id) {
  const key = id.toLocaleLowerCase("en-US");
  return index.byBase.get(key) || index.byClass.get(key) || "";
}

function ingredientLabel(id, displayById) {
  return displayById.get(String(id).toLocaleLowerCase("en-US")) || humanizeId(id);
}

function parseRecipes(segment, displayById) {
  const recipes = [];
  for (const match of segment.matchAll(/CreateRecipe(?:\([^;]{0,120}?\))?[\s\S]{0,4200}?Register\(\);/g)) {
    const chain = match[0];
    const ingredients = [];
    const ingredientIds = [];
    let item;
    const typed = /AddIngredient<([A-Za-z_][A-Za-z0-9_]*)>\s*\(\s*(\d+)?\s*\)/g;
    while ((item = typed.exec(chain))) {
      const amount = Number(item[2] || 1);
      ingredientIds.push(item[1]);
      ingredients.push(`${amount > 1 ? `${amount} × ` : ""}${ingredientLabel(item[1], displayById)}`);
    }
    const vanilla = /AddIngredient\(\s*ItemID\.([A-Za-z_][A-Za-z0-9_]*)\s*(?:,\s*(\d+))?\s*\)/g;
    while ((item = vanilla.exec(chain))) {
      const amount = Number(item[2] || 1);
      ingredients.push(`${amount > 1 ? `${amount} × ` : ""}${humanizeId(item[1])}`);
    }
    const modContent = /AddIngredient\(\s*(?:ModContent\.)?ItemType<([A-Za-z_][A-Za-z0-9_]*)>\(\)\s*(?:,\s*(\d+))?\s*\)/g;
    while ((item = modContent.exec(chain))) {
      const amount = Number(item[2] || 1);
      ingredientIds.push(item[1]);
      ingredients.push(`${amount > 1 ? `${amount} × ` : ""}${ingredientLabel(item[1], displayById)}`);
    }
    const groups = /AddRecipeGroup\(\s*(?:RecipeGroupID\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?\s*(?:,\s*(\d+))?/g;
    while ((item = groups.exec(chain))) {
      const amount = Number(item[2] || 1);
      const label = RECIPE_GROUP_RU[item[1]] || humanizeId(item[1]);
      ingredients.push(`${amount > 1 ? `${amount} × ` : ""}${label}`);
    }
    const tile = chain.match(/AddTile<([A-Za-z_][A-Za-z0-9_]*)>\s*\(\s*\)/)
      || chain.match(/AddTile\(\s*TileID\.([A-Za-z_][A-Za-z0-9_]*)\s*\)/);
    const stationId = tile?.[1] || "";
    if (ingredients.length || stationId) recipes.push({ ingredients, ingredientIds, stationId });
  }
  return recipes;
}

function rarityStage(segment, groupId) {
  if (groupId === "armor-pre-hardmode") return 1;
  if (groupId === "armor-hardmode") return 2;
  if (groupId === "armor-post-ml") return 4;
  const vanilla = segment.match(/Item\.rare\s*=\s*ItemRarityID\.([A-Za-z_][A-Za-z0-9_]*)/);
  const custom = segment.match(/Item\.rare\s*=\s*(?:ModContent\.)?RarityType<([A-Za-z_][A-Za-z0-9_]*)>/);
  const numeric = segment.match(/Item\.rare\s*=\s*(\d+)/);
  const rarity = custom?.[1] || vanilla?.[1] || (numeric ? Number(numeric[1]) : "");
  if (typeof rarity === "number") {
    if (rarity <= 4) return 1;
    if (rarity <= 9) return 2;
    return 3;
  }
  if (["Gray", "White", "Blue", "Green", "Orange"].includes(rarity)) return 1;
  if (["LightRed", "Pink", "LightPurple", "Lime", "Yellow"].includes(rarity)) return 2;
  if (["Cyan", "Red", "Purple"].includes(rarity)) return 3;
  if (["Turquoise", "PureGreen"].includes(rarity)) return 4;
  if (["CosmicPurple", "BurnishedAuric"].includes(rarity)) return 5;
  if (["HotPink", "CalamityRed"].includes(rarity)) return 6;
  return 0;
}

function recipeText(recipe) {
  if (!recipe) return "";
  const visible = recipe.ingredients.slice(0, 5);
  const rest = recipe.ingredients.length - visible.length;
  const parts = visible.join(" + ") + (rest > 0 ? ` + ещё ${rest}` : "");
  const station = STATIONS_RU[recipe.stationId] || (recipe.stationId ? `у станции «${humanizeId(recipe.stationId)}»` : "");
  if (parts && station) return `Скрафтить: ${parts} · ${station}.`;
  if (parts) return `Скрафтить из: ${parts}.`;
  return station ? `Создаётся ${station}.` : "";
}

function npcNames() {
  const file = path.join(sourceDir, "Mods.CalamityMod.NPCs.hjson");
  const names = new Map();
  if (!fs.existsSync(file)) return names;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  let id = "";
  for (const line of lines) {
    const top = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*\{\s*$/);
    if (top) id = top[1];
    const display = line.match(/^\tDisplayName:\s*(.*)$/);
    if (id && display) names.set(id.toLocaleLowerCase("en-US"), cleanDisplayName(display[1], id));
  }
  return names;
}

function dropSources(idSet, displayById) {
  const result = new Map();
  const add = (id, label, type) => {
    if (!label || /Global|DropHelper|Loot/i.test(label)) return;
    const key = id.toLocaleLowerCase("en-US");
    if (!result.has(key)) result.set(key, []);
    const entries = result.get(key);
    if (!entries.some((entry) => entry.label === label) && entries.length < 3) entries.push({ label, type });
  };
  const npcDisplay = npcNames();
  for (const file of walkFiles(npcSourceDir, (entry) => entry.endsWith(".cs"))) {
    const source = fs.readFileSync(file, "utf8");
    const base = path.basename(file, ".cs");
    const fileLabel = npcDisplay.get(base.toLocaleLowerCase("en-US")) || humanizeId(base);
    for (const match of source.matchAll(/(?:ModContent\.)?ItemType<([A-Za-z_][A-Za-z0-9_]*)>/g)) {
      if (!idSet.has(match[1].toLocaleLowerCase("en-US"))) continue;
      const context = source.slice(Math.max(0, match.index - 260), match.index + 220);
      if (!/loot|drop|Common|NotScalingWithLuck|LeadingConditionRule/i.test(context)) continue;
      let label = fileLabel;
      if (/Global|DropHelper|Loot/i.test(label)) {
        const before = source.slice(Math.max(0, match.index - 1400), match.index);
        const cases = [...before.matchAll(/case\s+(?:NPCID\.)?([A-Za-z_][A-Za-z0-9_]*):/g)];
        const modNpcs = [...before.matchAll(/NPCType<([A-Za-z_][A-Za-z0-9_]*)>/g)];
        const npcId = modNpcs.at(-1)?.[1] || cases.at(-1)?.[1] || "";
        label = npcDisplay.get(npcId.toLocaleLowerCase("en-US")) || humanizeId(npcId);
      }
      add(match[1], label, "drop");
    }
  }
  const bags = path.join(itemSourceDir, "TreasureBags");
  for (const file of walkFiles(bags, (entry) => entry.endsWith(".cs"))) {
    const source = fs.readFileSync(file, "utf8");
    const base = path.basename(file, ".cs");
    const label = displayById.get(base.toLocaleLowerCase("en-US")) || humanizeId(base);
    for (const match of source.matchAll(/(?:ModContent\.)?ItemType<([A-Za-z_][A-Za-z0-9_]*)>/g)) {
      if (idSet.has(match[1].toLocaleLowerCase("en-US")) && match[1] !== base) add(match[1], label, "bag");
    }
  }
  return result;
}

function fallbackObtain(item, sources) {
  if (sources?.length) {
    const bags = sources.filter((entry) => entry.type === "bag").map((entry) => entry.label);
    const drops = sources.filter((entry) => entry.type === "drop").map((entry) => entry.label);
    if (bags.length) return `Открыть ${bags.slice(0, 2).join(" или ")}; шанс указан на официальной wiki.`;
    if (drops.length) return `Добывается с ${drops.slice(0, 2).join(" или ")}; точный шанс указан на официальной wiki.`;
  }
  const byGroup = {
    fishing: "Получается во время рыбалки; нужный биом и силу удочки уточни на официальной wiki.",
    lore: "Выдаётся за исследование мира или победу над связанным боссом; точное условие есть на официальной wiki.",
    materials: "Добывается с противников, в мире или через крафт; точный источник зависит от материала.",
    placeables: "Добывается в соответствующем биоме либо создаётся как декоративный предмет.",
    potions: "Создаётся алхимией, покупается или находится как расходник; точный рецепт есть на официальной wiki.",
    "summon-items": "Создаётся или добывается перед соответствующим боссом или событием.",
    "treasure-bags": "Выпадает с соответствующего босса в экспертном режиме и выше.",
    dyes: "Покупается, создаётся или сдаётся Красильщику за необычное растение.",
    pets: "Получается как редкая награда, покупка или предмет из сумки босса.",
    mounts: "Получается как награда, дроп или покупка; точный источник есть на официальной wiki."
  };
  return byGroup[item.groupId] || "Точный источник и шанс смотри на официальной wiki по ссылке в карточке.";
}

/**
 * Build an original Russian reader-facing summary from structured catalog facts.
 * The English tooltip remains source/search metadata only and is never rendered.
 * Keyword checks merely select truthful mechanic sentences; no third-party
 * translation is copied into the distributable catalog.
 */
function russianDescription(item) {
  const tooltip = String(item.tooltip || "").toLocaleLowerCase("en-US");
  const id = item.id.toLocaleLowerCase("en-US");
  const sentences = [];
  const add = (condition, text) => {
    if (condition && !sentences.includes(text) && sentences.length < 3) sentences.push(text);
  };

  if (item.groupId === "weapons-magic") sentences.push("Магическое оружие: расходует ману и наносит магический урон.");
  else if (item.groupId === "weapons-summon") sentences.push("Оружие призывателя: создаёт миньона или турель, которые сражаются за персонажа.");
  else if (item.groupId === "weapons-rogue") sentences.push("Оружие плута: использует механику скрытности и наносит разбойничий урон.");
  else if (["weapons-ranged", "weapons-draedon"].includes(item.groupId)) sentences.push("Дальнобойное оружие стрелка, рассчитанное на бой с дистанции.");
  else if (item.groupId === "weapons-melee") sentences.push("Оружие воина для ближнего боя или атак ближнего класса на расстоянии.");
  else if (item.groupId === "weapons-classless") sentences.push("Бесклассовое оружие: его эффект не привязан к одному основному классу урона.");
  else if (item.groupId === "Accessories.Wings" || item.groupId === "wings") sentences.push("Крылья: дают полёт, замедляют падение и повышают мобильность.");
  else if (item.groupId === "accessories") sentences.push("Аксессуар: даёт пассивный эффект, пока находится в соответствующем слоте.");
  else if (item.groupId.startsWith("armor-vanity")) sentences.push("Декоративный элемент экипировки: меняет внешний вид персонажа без боевых характеристик.");
  else if (item.groupId.startsWith("armor-")) sentences.push("Часть комплекта брони: даёт защиту и характеристики, а полный набор может открыть отдельный бонус.");
  else if (item.groupId === "ammo") sentences.push("Боеприпас для подходящего оружия; влияет на урон или поведение выстрела.");
  else if (item.groupId === "materials") sentences.push("Материал для крафта: сохраняй его для оружия, брони, аксессуаров или дальнейших компонентов.");
  else if (item.groupId === "summon-items") sentences.push("Предмет для запуска связанного боя, события или особого условия прогрессии.");
  else if (item.groupId === "treasure-bags") sentences.push("Сумка с наградами босса: открывается ради материалов, экипировки и экспертных предметов.");
  else if (item.groupId === "pets") sentences.push("Предмет питомца: призывает декоративного спутника и подходит для коллекции.");
  else if (item.groupId === "mounts") sentences.push("Предмет маунта: призывает средство передвижения с собственной механикой мобильности.");
  else if (item.groupId === "lore") sentences.push("Предмет истории мира: фиксирует важную находку или победу и раскрывает сведения о Calamity.");
  else if (item.groupId === "dyes") sentences.push("Краситель: меняет цвет экипировки, питомца или маунта.");
  else if (item.groupId === "potions") sentences.push("Расходуемый предмет: применяется ради лечения, временного эффекта или постоянного усиления.");
  else if (item.groupId === "fishing") {
    if (/rod|pole/.test(id)) sentences.push("Рыболовный инструмент: используется для ловли в подходящем биоме.");
    else if (/crate/.test(id)) sentences.push("Рыболовный ящик: открой его, чтобы получить материалы и тематические награды.");
    else if (/bait|worm|butterfly/.test(id)) sentences.push("Наживка для рыбалки; сила влияет на шанс успешного улова.");
    else sentences.push("Рыболовный предмет: связан с уловом, наживкой или наградами определённого биома.");
  } else if (item.groupId === "tools") sentences.push("Инструмент для добычи, строительства, перемещения или исследования мира.");
  else if (item.groupId === "placeables") {
    if (/wall/.test(id)) sentences.push("Строительная стена: размещается на заднем плане для оформления построек.");
    else if (/platform/.test(id)) sentences.push("Размещаемая платформа: служит полом, через который можно проходить по вертикали.");
    else if (/chest|dresser|cabinet/.test(id)) sentences.push("Размещаемое хранилище или мебель для базы.");
    else if (/torch|candle|lamp|lantern|chandelier/.test(id)) sentences.push("Размещаемый источник света для базы или декоративной постройки.");
    else if (/chair|table|bed|bookcase|piano|sofa|toilet|sink|bathtub|clock/.test(id)) sentences.push("Размещаемый предмет мебели для строительства и оформления базы.");
    else if (/workbench|anvil|forge|station|fabricator|accelerator|condenser/.test(id)) sentences.push("Размещаемая рабочая станция, открывающая связанные рецепты крафта.");
    else if (/trophy|relic|banner/.test(id)) sentences.push("Размещаемый трофей, отмечающий победу или коллекционное достижение.");
    else sentences.push("Размещаемый игровой объект для строительства, декора или работы базы.");
  } else if (item.groupId === "draedon-items") sentences.push("Технологический предмет Дрейдона для исследования лабораторий, механизмов или высокоуровневого крафта.");
  else sentences.push("Специализированный предмет Calamity; точное применение и ограничения указаны на официальной wiki.");

  add(/right.?click|пкм/.test(tooltip), "Имеет альтернативное действие или атаку по ПКМ.");
  add(/homing|homes in|seek(?:s|ing)? (?:out |nearby )?(?:enemies|targets)|tracks (?:enemies|targets)/.test(tooltip), "Снаряды способны самостоятельно наводиться на цель.");
  add(/pierc/.test(tooltip), "Атака может пронзать несколько целей.");
  add(/ricochet|bounce/.test(tooltip), "Снаряды могут отскакивать или рикошетить.");
  add(/explod|explos/.test(tooltip), "Атака или снаряд создаёт взрывной эффект.");
  add(/stealth strike/.test(tooltip), "Усиленный удар из скрытности получает особый эффект.");
  add(/dash/.test(tooltip) && item.groupId === "accessories", "Открывает или улучшает боевой рывок.");
  add(/flight time|flying|fly/.test(tooltip) && item.groupId === "accessories", "Повышает возможности полёта или воздушного перемещения.");
  add(/movement speed/.test(tooltip) && item.groupId === "accessories", "Повышает скорость и общую мобильность персонажа.");
  add(/immun/.test(tooltip) && item.groupId === "accessories", "Даёт защиту от связанных отрицательных эффектов.");
  add(/permanent|permanently/.test(tooltip) && item.groupId === "potions", "После использования даёт постоянное улучшение текущему персонажу.");
  add(/heals?|health|life regeneration/.test(tooltip) && item.groupId === "potions", "Восстанавливает здоровье или поддерживает его регенерацию.");
  add(/mana/.test(tooltip) && item.groupId === "potions", "Восстанавливает ману или временно меняет её расход.");

  return sentences.join(" ");
}

function imageCandidates(item, file, segment, pngByBase, relatedPngByBase) {
  const candidates = [];
  const key = item.id.toLocaleLowerCase("en-US");
  const shortKey = item.id.replace(/Item$/, "").toLocaleLowerCase("en-US");
  const exact = pngByBase.get(key);
  if (exact) candidates.push(exact);
  for (const match of segment.matchAll(/"CalamityMod\/([^"\r\n]+)"/g)) {
    const candidate = path.join(sourceRepo, `${match[1]}.png`);
    if (fs.existsSync(candidate)) candidates.push(candidate);
  }
  if (file) {
    const beside = path.join(path.dirname(file), `${path.basename(file, ".cs")}.png`);
    if (fs.existsSync(beside)) candidates.push(beside);
  }
  const withoutItem = pngByBase.get(shortKey);
  if (withoutItem) candidates.push(withoutItem);
  // Catchable critters expose an Item localization entry but reuse their NPC
  // sprite rather than shipping a separate inventory PNG.
  const related = relatedPngByBase.get(key) || relatedPngByBase.get(shortKey);
  if (related) candidates.push(related);
  return candidates;
}

if (!fs.existsSync(sourceDir)) {
  console.error(`Localization directory not found: ${sourceDir}`);
  process.exit(1);
}

const groupRecords = [];
const rawItems = [];
for (const [sourceName, [id, label, kind, cls]] of Object.entries(GROUPS)) {
  const file = path.join(sourceDir, `${FILE_PREFIX}${sourceName}${FILE_SUFFIX}`);
  if (!fs.existsSync(file)) throw new Error(`Missing localization file: ${file}`);
  const groupItems = readItems(file, id);
  groupRecords.push([id, label, kind, cls, groupItems.length]);
  rawItems.push(...groupItems);
}

// A display name can occur more than once for legacy/internal variants. The
// reader-facing catalog keeps one record per official visible English name.
const seen = new Set();
const items = rawItems
  .filter((item) => {
    const key = item.name.toLocaleLowerCase("en-US");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
const groupCounts = items.reduce((counts, item) => {
  counts.set(item.groupId, (counts.get(item.groupId) || 0) + 1);
  return counts;
}, new Map());
groupRecords.forEach((group) => { group[4] = groupCounts.get(group[0]) || 0; });

const displayById = new Map(items.map((item) => [item.id.toLocaleLowerCase("en-US"), item.name]));
const idSet = new Set(displayById.keys());
const sources = sourceIndex();
const drops = dropSources(idSet, displayById);
const pngByBase = new Map();
for (const file of walkFiles(itemSourceDir, (entry) => entry.endsWith(".png"))) {
  const key = path.basename(file, ".png").toLocaleLowerCase("en-US");
  if (!pngByBase.has(key)) pngByBase.set(key, file);
}
const relatedPngByBase = new Map();
for (const directory of [npcSourceDir, path.join(sourceRepo, "Projectiles")]) {
  for (const file of walkFiles(directory, (entry) => entry.endsWith(".png"))) {
    const key = path.basename(file, ".png").toLocaleLowerCase("en-US");
    if (!relatedPngByBase.has(key)) relatedPngByBase.set(key, file);
  }
}

if (fs.existsSync(spriteOutput)) fs.rmSync(spriteOutput, { recursive: true, force: true });
fs.mkdirSync(spriteOutput, { recursive: true });

const meta = new Map();
for (const item of items) {
  const file = findSourceFile(sources, item.id);
  const source = file ? sources.sourceCache.get(file) : "";
  const segment = source ? classSegment(source, item.id) : "";
  const recipes = parseRecipes(segment, displayById);
  const ownStage = rarityStage(segment, item.groupId);
  const image = imageCandidates(item, file, segment, pngByBase, relatedPngByBase)[0] || "";
  if (image) fs.copyFileSync(image, path.join(spriteOutput, `${item.id}.png`));
  meta.set(item.id.toLocaleLowerCase("en-US"), { file, segment, recipes, stage: ownStage, image: Boolean(image) });
}

// Recipes built from later materials inherit the latest known progression tier.
for (let pass = 0; pass < 5; pass += 1) {
  for (const item of items) {
    const record = meta.get(item.id.toLocaleLowerCase("en-US"));
    for (const recipe of record.recipes) {
      for (const ingredient of recipe.ingredientIds) {
        record.stage = Math.max(record.stage, meta.get(ingredient.toLocaleLowerCase("en-US"))?.stage || 0);
      }
      if (recipe.stationId === "MythrilAnvil") record.stage = Math.max(record.stage, 2);
      if (recipe.stationId === "LunarCraftingStation") record.stage = Math.max(record.stage, 3);
      if (["CosmicAnvil", "VoidCondenser"].includes(recipe.stationId)) record.stage = Math.max(record.stage, 4);
      if (["DraedonsForge", "ParticleAccelerator"].includes(recipe.stationId)) record.stage = Math.max(record.stage, 5);
    }
  }
}

// Localization-only/internal records without a verified game sprite are not
// reader-facing items. Omitting them is more honest than inventing category art.
const publicItems = items.filter((item) => meta.get(item.id.toLocaleLowerCase("en-US")).image);
const publicGroupCounts = publicItems.reduce((counts, item) => {
  counts.set(item.groupId, (counts.get(item.groupId) || 0) + 1);
  return counts;
}, new Map());
groupRecords.forEach((group) => { group[4] = publicGroupCounts.get(group[0]) || 0; });

const itemRecords = publicItems.map((item) => {
  const record = meta.get(item.id.toLocaleLowerCase("en-US"));
  const recipe = record.recipes[0];
  const obtain = recipeText(recipe) || fallbackObtain(item, drops.get(item.id.toLocaleLowerCase("en-US")));
  return [item.name, item.groupId, item.id, item.tooltip, 1, obtain, record.stage, russianDescription(item)];
});

let commit = "unknown";
let sourceDate = "unknown";
try {
  commit = execFileSync("git", ["-C", sourceRepo, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  sourceDate = execFileSync("git", ["-C", sourceRepo, "log", "-1", "--format=%cI"], { encoding: "utf8" }).trim();
} catch {
  // Generation still works from an exported source directory.
}

const coverage = {
  tooltips: itemRecords.filter((item) => item[3]).length,
  russianDescriptions: itemRecords.filter((item) => item[7]).length,
  sprites: itemRecords.length,
  recipes: publicItems.filter((item) => meta.get(item.id.toLocaleLowerCase("en-US")).recipes.length).length,
  sourceFiles: publicItems.filter((item) => meta.get(item.id.toLocaleLowerCase("en-US")).file).length,
  omittedWithoutSprite: items.length - publicItems.length
};
const payload = {
  modVersion: "2.2.2",
  source: "CalamityTeam/CalamityModPublic",
  commit,
  sourceDate,
  generatedAt: "2026-08-15",
  coverage,
  groups: groupRecords,
  items: itemRecords
};
const banner = `/* Rich offline Calamity Mod item catalog. Generated; do not edit by hand.\n * Source: ${payload.source}@${commit}\n * Build: node scripts/build-item-catalog.mjs <Localization/en-US>\n */\n`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${banner}window.CALAMITY_ITEM_INDEX=${JSON.stringify(payload)};\n`);
console.log(`Wrote ${itemRecords.length} unique items across ${groupRecords.length} groups to ${output}`);
console.log(`Coverage: ${coverage.sprites} verified sprites, ${coverage.russianDescriptions} Russian descriptions, ${coverage.recipes} recipes, ${coverage.sourceFiles} source files; ${coverage.omittedWithoutSprite} sprite-less records omitted`);
