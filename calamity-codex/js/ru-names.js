/* Русские отображаемые имена полного каталога.
 *
 * В официальном checkout Calamity нет полного русского localization-файла,
 * поэтому каталог получает локальный reader-facing слой: известные игровые
 * термины переводятся словарём, имена персонажей и уникальные названия
 * аккуратно транслитерируются. Оригинальное имя остаётся доступно в поиске и
 * в подписи «оригинал», но пользовательский интерфейс не оставляет карточки
 * без русской подписи.
 */
(() => {
  const INDEX = window.CALAMITY_ITEM_INDEX || { items: [] };
  const WORDS = {
    abandoned: "заброшенный", abomination: "мерзость", abyss: "бездна", accessory: "аксессуар", accessories: "аксессуары",
    acid: "кислотный", aerialite: "аэролитовый", after: "после", altar: "алтарь", ancient: "древний", angel: "ангел",
    annihilation: "уничтожение", anvil: "наковальня", apple: "яблоко", aquatic: "водный", arc: "дуга", armor: "броня",
    ashes: "пепел", astral: "астральный", astrum: "аструм", auric: "ауриковый", auto: "авто", avalanche: "лавина",
    axe: "топор", bag: "сумка", ball: "шар", band: "браслет", bar: "слиток", bath: "ванна", bathtub: "ванна",
    beam: "луч", bee: "пчела", bell: "колокол", belt: "пояс", blade: "клинок", blaster: "бластер", blessing: "благословение",
    block: "блок", blood: "кровь", bomb: "бомба", book: "книга", boots: "сапоги", bow: "лук", brain: "мозг",
    brimstone: "серный", bubble: "пузырь", buff: "бафф", bullet: "пуля", burner: "жаровня", burst: "вспышка",
    cannon: "пушка", carapace: "панцирь", cell: "ячейка", chain: "цепь", chaos: "хаос", charm: "талисман",
    charger: "зарядник", charging: "зарядный", chest: "сундук", claw: "коготь", clam: "моллюск", cloud: "облако", cluster: "скопление",
    cog: "шестерня", coil: "катушка", collider: "коллайдер", condenser: "конденсатор", core: "ядро", cosmic: "космический",
    cosmilite: "космилитовый", counter: "счётчик", crawler: "ползун", crate: "ящик", crystal: "кристалл", crystalline: "кристальный",
    curse: "проклятие", dagger: "кинжал", dark: "тёмный", dawn: "рассвет", death: "смерть", defense: "защита",
    demon: "демон", depth: "глубина", detector: "детектор", diamond: "алмазный", disc: "диск", display: "экран",
    dive: "ныряние", diving: "ныряльный", dragon: "дракон", draedon: "дрейдон", drill: "бур", dye: "краситель",
    eldritch: "потусторонний", electric: "электрический", elemental: "элементаль", electrolyte: "электролитный", emblem: "эмблема",
    endothermic: "эндотермический", energy: "энергия", essence: "эссенция", exo: "экзо", explosion: "взрыв", eye: "глаз",
    fallen: "упавший", flame: "пламя", flare: "вспышка", fragment: "фрагмент", frost: "морозный", fuel: "топливо",
    gauntlet: "перчатка", gel: "гель", gem: "самоцвет", giant: "гигантский", glaive: "глефа", glow: "свечение",
    god: "бог", gold: "золотой", grapple: "крюк", great: "великий", gun: "пистолет", hammer: "молот", harp: "арфа",
    hallowed: "святой", halibut: "палтус", heart: "сердце", hell: "адский", helmet: "шлем", holy: "святой", hook: "крюк",
    hive: "улей", holy: "святой", hover: "парящий", ice: "ледяной", idol: "идол", infected: "заражённый", inferno: "инферно",
    instrument: "инструмент", iron: "железный", jungle: "джунглевый", lance: "копьё", laser: "лазерный", leaf: "лист",
    life: "жизнь", light: "свет", lightning: "молния", lion: "лев", lore: "история", lunar: "лунный", magic: "магический",
    magnet: "магнит", mana: "мана", marrow: "костный мозг", mask: "маска", material: "материал", mechanical: "механический",
    mechanism: "механизм", melee: "ближний", metal: "металл", meteor: "метеоритный", mine: "мина", mirror: "зеркало", missile: "ракета",
    molten: "расплавленный", moon: "луна", mysterious: "таинственный", mystic: "мистический", nightmare: "кошмарный", night: "ночь",
    orb: "сфера", ore: "руда", overdrive: "перегрузка", pack: "набор", pearl: "жемчуг", pestilence: "чума", pickaxe: "кирка",
    plague: "чумной", plating: "обшивка", plasma: "плазма", pulse: "импульсный", pylon: "пилон", quantum: "квантовый",
    ranged: "дальний", reaper: "жнец", rifle: "винтовка", ring: "кольцо", rocket: "ракета", rogue: "плут", rune: "руна",
    sand: "песок", sapphire: "сапфировый", scale: "чешуя", scrap: "лом", seeking: "поисковый", shell: "панцирь", shield: "щит",
    shock: "шоковый", shark: "акула", shotgun: "дробовик", signal: "сигнал", slime: "слизень", snow: "снежный", soul: "душа", spear: "копьё",
    spectre: "спектральный", staff: "посох", star: "звезда", starlight: "звёздный", storm: "штормовой", summon: "призыв",
    summoning: "призывной", sword: "меч", talisman: "талисман", tesla: "тесла", tome: "том", torch: "факел", toxic: "токсичный",
    treasure: "сокровище", trident: "трезубец", turret: "турель", venom: "яд", vortex: "вихрь", void: "пустота", water: "вода",
    weapon: "оружие", wings: "крылья", wulfrum: "вульфрум", yharim: "ярим", yharon: "ярон", zero: "ноль", zerg: "зерг"
  };
  Object.assign(WORDS, {
    absolute: "абсолютный", abyssal: "бездна", aether: "эфир", aerial: "воздушный", alpha: "альфа", anarchy: "анархия", apex: "вершина", array: "массив",
    armored: "бронированный", armoured: "бронированный", architect: "архитектор", backpack: "рюкзак", banner: "знамя", basin: "бассейн", battery: "батарея",
    bookcase: "книжный шкаф", breastplate: "нагрудник", cap: "шапка", candelabra: "канделябр", chandelier: "люстра", chestplate: "нагрудник", circuitry: "схема",
    chlorophyte: "хлорифитовый", celestial: "небесный", corroded: "корродированный", cryonic: "крионический", divine: "божественный", dresser: "комод",
    experimental: "экспериментальный", fossil: "ископаемое", fountain: "фонтан", frozen: "замороженный", geode: "жеода", greaves: "поножи", headgear: "головной убор",
    helm: "шлем", hood: "капюшон", leggings: "поножи", mail: "кольчуга", marnite: "марнитовый", pants: "штаны", pike: "пика", powder: "порошок",
    remains: "останки", ruffian: "разбойничий", saxophone: "саксофон", scythe: "коса", sensor: "датчик", shirt: "рубаха", sink: "раковина", sofa: "диван",
    spores: "споры", statigel: "статигелевый", sulphurous: "сернистый", synth: "синтезатор", table: "стол", tesla: "тесла", toga: "тога", trident: "трезубец",
    wulfrum: "вульфрум", wall: "стена", water: "вода", of: "из", the: "этот", and: "и", or: "или", any: "любой", all: "весь", final: "финальный",
    first: "первый", zero: "ноль", dust: "пыль", seed: "семя", shard: "осколок", shell: "панцирь", scale: "чешуя", ore: "руда", bar: "слиток",
    calamity: "Каламити", terminus: "Терминус", hp: "ОЗ", npc: "НИП", dps: "УВС", ui: "интерфейс"
  });
  const EXTRA_PHRASES = { 
    "of the": "из",
    "abyss bathtubs": "ванны Бездны",
    "abyss bathtub": "ванна Бездны",
    "abyss beds": "кровати Бездны",
    "abyss bed": "кровать Бездны",
    "abyss blade": "клинок Бездны",
    "abyss bookcase": "книжный шкаф Бездны",
    "abyss candle": "свеча Бездны",
    "abyss chair": "стул Бездны",
    "abyss chest": "сундук Бездны",
    "abyss door": "дверь Бездны",
    "abyss lamp": "лампа Бездны",
    "abyss lantern": "фонарь Бездны",
    "abyss sink": "раковина Бездны",
    "abyss sofa": "диван Бездны",
    "abyss table": "стол Бездны",
    "abyss water fountain": "фонтан Бездны",
    "acidwood sword": "кислотнодревесный меч",
    "acidwood bow": "кислотнодревесный лук",
    "aerialite bar": "аэролитовый слиток",
    "absolute zero": "Абсолютный ноль",
    "abandoned slime staff": "заброшенный посох слизня",
    "abandoned wulfrum helmet": "заброшенный шлем вульфрума",
    "aegis blade": "клинок Эгиды",
    "astral pike": "астральная пика",
    "astral scythe": "астральная коса",
    "aerospec breastplate": "аэроспековый нагрудник",
    "aerospec helmet": "аэроспековый шлем",
    "statigel armor": "статигелевая броня",
    "snow ruffian chestplate": "нагрудник снежного разбойника",
    "snow ruffian greaves": "поножи снежного разбойника",
    "snow ruffian mask": "маска снежного разбойника",
    "core of calamity": "ядро Каламити",
    "blood orb": "кровавая сфера",
    "dark plasma": "тёмная плазма",
    "depth cells": "глубинные клетки",
    "divine geode": "божественная жеода",
    "ancient bone dust": "пыль древних костей",
    "anodized wulfrum metal": "анодированный вульфрумовый металл",
    "armored shell": "бронированный панцирь",
    "ascendant spirit essence": "эссенция возвышенного духа",
    "blighted gel": "порченный гель",
    "bloodstone": "кровавый камень",
    "corroded fossil": "корродированное ископаемое",
    "cryonic bar": "крионический слиток",
    "zenith": "Зенит",
    "copper shortsword": "медный короткий меч",
    "enchanted sword": "зачарованный меч",
    "starfury": "Звёздная ярость",
    "bee keeper": "Пчеловод",
    "seedler": "Сеятель",
    "terra blade": "Терра-клинок",
    "meowmere": "Мяумур",
    "star wrath": "Звёздный гнев"
  };
  const PHRASES = Object.assign({}, EXTRA_PHRASES, {
    "a-pls": "А-ПЛС", "abyssal diving": "бездна · ныряние", "auric tesla": "аурик-тесла", "cosmic anvil": "космическая наковальня",
    "draedon forge": "кузня Дрейдона", "draedons forge": "кузня Дрейдона", "exo mechs": "экзо-мехи", "god slayer": "богоубийца",
    "supreme calamitas": "Верховная ведьма Каламитас", "calamitas clone": "клон Каламитас", "devourer of gods": "Пожиратель богов",
    "desert scourge": "Пустынный бич", "aquatic scourge": "Водный бич", "brimstone elemental": "Серный элементаль",
    "plaguebringer goliath": "Чумной голиаф", "astrum deus": "Аструм Деус", "astrum aureus": "Аструм Ауреус",
    "old duke": "Старый герцог", "storm weaver": "Ткач бурь", "ceaseless void": "Неугасимая пустота", "polterghast": "Полтергаст",
    "the slime god": "Бог слизней", "king slime": "Король слизней", "moon lord": "Лунный лорд", "wall of flesh": "Стена плоти",
    "brain of cthulhu": "Мозг Ктулху", "eater of worlds": "Пожиратель миров", "eye of cthulhu": "Глаз Ктулху",
    "guide voodoo doll": "кукла вуду гида", "life crystal": "кристалл жизни", "mana crystal": "кристалл маны",
    "fallen star": "упавшая звезда", "demon altar": "алтарь зла", "iron anvil": "железная наковальня", "work bench": "верстак",
    "mythril anvil": "мифриловая наковальня", "ancient manipulator": "древний манипулятор", "tinkerers workshop": "мастерская инженера",
    "wulfrum metal scrap": "вульфрумовый лом", "energy core": "энергетическое ядро", "sea remains": "морские останки",
    "sulphuric scale": "сернистая чешуя", "darksun fragment": "осколок тёмного солнца", "nightmare fuel": "топливо кошмаров",
    "endothermic energy": "эндотермическая энергия", "necromantic geode": "некромантическая жеода", "ash of calamity": "пепел бедствия",
    "ashes of calamity": "пепел бедствия", "ashes of annihilation": "пепел уничтожения", "shadowspec bar": "тенеспек",
    "auric ore": "ауриковая руда", "auric bar": "ауриковый слиток", "cosmilite bar": "космилитовый слиток",
    "mysterious circuitry": "таинственная схема", "dubious plating": "сомнительная обшивка", "wulfrum controller": "вульфрумовый контроллер"
  });
  const RU_LETTERS = { a: "а", b: "б", c: "к", d: "д", e: "е", f: "ф", g: "г", h: "х", i: "и", j: "дж", k: "к", l: "л", m: "м", n: "н", o: "о", p: "п", q: "к", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "кс", y: "й", z: "з" };

  function humanize(value) {
    return String(value || "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function transliterate(word) {
    return String(word || "").split("").map((ch) => RU_LETTERS[ch.toLowerCase()] ?? ch).join("");
  }
  function cased(value, source) {
    if (!value) return value;
    if (source === source.toUpperCase() && /[A-Z]/.test(source)) return value.toUpperCase();
    if (/^[A-Z]/.test(source)) return value.charAt(0).toUpperCase() + value.slice(1);
    return value;
  }
  function translateToken(token) {
    const key = token.toLowerCase().replace(/[’']/g, "");
    if (WORDS[key]) return cased(WORDS[key], token);
    return cased(transliterate(token), token);
  }
  // Раньше translateName на каждом из 2535 предметов заново сортировал все
  // фразы и компилировал по RegExp на каждую фразу. Один предварительно
  // собранный matcher выполняет ту же longest-first замену за один проход.
  const phraseNameMap = new Map(Object.entries(PHRASES).map(([en, ru]) => [en.toLocaleLowerCase("en"), ru]));
  const phraseAlternatives = [...phraseNameMap.keys()]
    .sort((a, b) => b.length - a.length)
    .map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const phraseMatcher = phraseAlternatives.length
    ? new RegExp(`(?<![A-Za-z])(?:${phraseAlternatives.join("|")})(?![A-Za-z])`, "gi")
    : /$^/g;

  function translateName(value) {
    const original = String(value || "").trim();
    if (!original || /[А-Яа-яЁё]/.test(original) && !/[A-Za-z]/.test(original)) return original;
    const exact = phraseNameMap.get(original.toLocaleLowerCase("en"));
    if (exact) return exact;
    const text = humanize(original).replace(phraseMatcher, (match) => phraseNameMap.get(match.toLocaleLowerCase("en")) || match);
    return text.replace(/[A-Za-z][A-Za-z0-9'’-]*/g, translateToken).replace(/\s+/g, " ").trim();
  }
  let nameMatcher = null;
  let localizedNameMap = null;
  function prepareNameMatcher() {
    if (nameMatcher) return;
    const names = Object.entries(byName).sort((a, b) => b[0].length - a[0].length).slice(0, 420);
    localizedNameMap = new Map(names.map(([en, ru]) => [en.toLocaleLowerCase("en"), ru]));
    const alternatives = names.map(([en]) => en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    nameMatcher = alternatives.length
      ? new RegExp(`(?<![A-Za-z0-9])(?:${alternatives.join("|")})(?![A-Za-z0-9])`, "gi")
      : /$^/g;
  }
  function localizeText(value) {
    prepareNameMatcher();
    const text = String(value || "").replace(nameMatcher, (match) => localizedNameMap.get(match.toLocaleLowerCase("en")) || match);
    return text.replace(/[A-Za-z][A-Za-z0-9'’-]*/g, translateToken).replace(/\s+/g, " ").trim();
  }

  const byId = Object.create(null);
  const byName = Object.create(null);
  (INDEX.items || []).forEach(([name, groupId, id]) => {
    const ru = translateName(name);
    byId[id] = ru;
    byName[name] = ru;
  });
  window.CALAMITY_RU_NAMES = { byId, byName, translate: translateName, text: localizeText };
})();
