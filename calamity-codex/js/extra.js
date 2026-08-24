/* Темы квестов, маршруты и полный каталог предметов по этапам */
(() => {
  const T = {
    forest:    { fx: "leaves",  accent: "#7ad3a0", bg: "assets/themes/forest.webp",    filter: "none" },
    wulfrum:   { fx: "sparks",  accent: "#b6ff4a", bg: "assets/themes/wulfrum.webp",   filter: "none" },
    stars:     { fx: "stars",   accent: "#e8b84a", bg: "assets/themes/forest.webp",    filter: "saturate(.7) hue-rotate(-10deg) brightness(.85)" },
    sea:       { fx: "bubbles", accent: "#3dcdc0", bg: "assets/themes/sea.webp",       filter: "none" },
    slime:     { fx: "blobs",   accent: "#9b8cff", bg: "assets/themes/mushroom.webp",  filter: "hue-rotate(40deg) saturate(1.2)" },
    desert:    { fx: "sand",    accent: "#e8b84a", bg: "assets/themes/desert.webp",    filter: "none" },
    acid:      { fx: "acid",    accent: "#b6e04a", bg: "assets/themes/sea.webp",       filter: "hue-rotate(70deg) saturate(1.3) contrast(1.1)" },
    mushroom:  { fx: "spores",  accent: "#6ecbff", bg: "assets/themes/mushroom.webp",  filter: "none" },
    evil:      { fx: "drip",    accent: "#c41e6a", bg: "assets/themes/evil.webp",      filter: "none" },
    dungeon:   { fx: "dust",    accent: "#8aa4d4", bg: "assets/themes/dungeon.webp",   filter: "none" },
    hell:      { fx: "embers",  accent: "#ff6b35", bg: "assets/themes/hell.webp",      filter: "none" },
    ice:       { fx: "snow",    accent: "#9be7ff", bg: "assets/themes/ice.webp",       filter: "none" },
    brim:      { fx: "ash",     accent: "#ff3b4a", bg: "assets/themes/brimstone.webp", filter: "none" },
    jungle:    { fx: "pollen",  accent: "#6ee07a", bg: "assets/themes/forest.webp",    filter: "hue-rotate(25deg) saturate(1.4) contrast(1.05)" },
    astral:    { fx: "stars",   accent: "#d07aff", bg: "assets/themes/mushroom.webp",  filter: "hue-rotate(90deg) saturate(1.3) contrast(1.15)" },
    ocean:     { fx: "bubbles", accent: "#4aa8ff", bg: "assets/themes/sea.webp",       filter: "saturate(1.2) brightness(.9)" },
    holy:      { fx: "gold",    accent: "#ffe08a", bg: "assets/themes/desert.webp",    filter: "sepia(.35) saturate(1.4) brightness(1.1)" },
    cosmic:    { fx: "warp",    accent: "#7ae0ff", bg: "assets/themes/ice.webp",       filter: "hue-rotate(200deg) saturate(1.5) contrast(1.2)" },
    dragon:    { fx: "fire",    accent: "#ffb347", bg: "assets/themes/hell.webp",      filter: "saturate(1.3) hue-rotate(-8deg) brightness(1.05)" },
    final:     { fx: "ritual",  accent: "#ff4d6d", bg: "assets/themes/brimstone.webp", filter: "contrast(1.2) saturate(1.25)" }
  };

  const meta = {
    1:  { theme: "forest",   mood: "Рассвет мира. Пахнет хвоей и сырой землёй.",
      objective: "Построй дом с кроватью, открой Стартовый мешок, сделай печь и наковальню, набери хотя бы 200 здоровья кристаллами жизни.",
      steps: [
        { t: "Открой Стартовый мешок", d: "ПКМ по сумке в инвентаре. Внутри оружие всех классов, зелья, инструменты. Выбери класс и положи остальное в сундук — пригодится на альтов или друзей." },
        { t: "Сруби 200+ дерева у спавна", d: "Верстак (10 дерева), платформы, стены. Не уходи далеко ночью без факелов." },
        { t: "Дом 8×12", d: "Стены (фон!), дверь, стол, стул, факел. Гид заселится сам. Кровать: ткацкий станок (12 дерева) → 7 паутины = шёлк, 5 шёлка + 15 дерева." },
        { t: "Пещера за рудой", d: "Ищи медную/оловянную, потом железную/свинцовую. 20 камня → печь. 5 железных/свинцовых слитков → наковальня. Life Crystal светятся розовым — ешь до 400 HP постепенно." }
      ]},
    2:  { theme: "wulfrum",  mood: "Зелёные искры и запах озона. Первый металл Каламити.",
      objective: "Убей зелёных дронов на поверхности, собери 45 вульфрумового лома и 3 энергетических ядра, скрафти броню или оружие своего класса.",
      steps: [
        { t: "Дождись дня", d: "Wulfrum Drone, Rover, Gyrator, Hovercraft ходят по поверхности. Ночью их перекрывают зомби." },
        { t: "Фарм кругами вокруг базы", d: "Не уходи в джунгли. Hovercraft стреляет — прячься за блоками. Режь дронов мечом/луком из мешка." },
        { t: "Считай добычу", d: "На сет: 10+20+15 = 45 Wulfrum Metal Scrap и 3 Energy Core. Ядра падают реже — не продавай." },
        { t: "Крафт на наковальне", d: "Шлем / куртка / штаны. Сет-бонус Wulfrum Bastion: двойной тап вниз тратит 1 обломок и превращает тебя в пушку на 30 сек." }
      ]},
    3:  { theme: "stars",    mood: "Небо ближе, чем кажется. Лаборатории Дрейдона уже ждут.",
      objective: "Найди хотя бы один планетойд и одну био-лабораторию. Принеси на базу завод элементов и зарядную станцию. Не лезь в Бездну.",
      steps: [
        { t: "Зелье гравитации", d: "Пещерные сундуки, алхимик позже, или Trazius/разлив. Пей и лети вверх, зажав ▲ — ищи планетойды (летающие шары земли)." },
        { t: "Центральный планетойд", d: "Большой, с космической лабораторией. Забери кашпо, семена, Cinderplate, сундуки." },
        { t: "Лаборатории", d: "Турели НЕ бьются оружием — ломай киркой, закрой выстрел блоком. Забери Power Cell Factory, Charging Station, Dubious Plating, Mysterious Circuitry, схемы." },
        { t: "Святилища", d: "По одному на биом: уникальный аксессуар или маунт. Обойди лес, пустыню, снега, джунгли, зло." }
      ]},
    4:  { theme: "sea",      mood: "Бирюзовая тишина под пустыней. Призмы поют.",
      objective: "Найди затонувшее море под пустыней, набери морские призмы, найди лабораторию моря. Гигантского моллюска не трогай.",
      steps: [
        { t: "Найди пустыню", d: "Один из краёв мира. Спустись в подземную пустыню (песок + окаменелости)." },
        { t: "Копай ещё ниже", d: "Под пустыней — светлая вода и Navystone. Это Затонувшее море, не Сернистое." },
        { t: "Собирай, не зли", d: "Большинство мобов спокойны. Ломай светящиеся Sea Prism и осколки. Сундуки у дна." },
        { t: "Лаборатория моря", d: "Ищи прямоугольные стены и турели. Schematic (Sunken Sea) — первая схема Дрейдона. Гигантский моллюск не трогай до бича." }
      ]},
    5:  { theme: "slime",    mood: "Синяя корона на студне. Разминка арены.",
      objective: "Построй арену, скрафти слизневую корону, убей короля слизней и надень крюк, если его ещё нет.",
      steps: [
        { t: "Арена 80–120 блоков", d: "2–3 ряда деревянных платформ, костёр, банка с сердцем, факела, стол с едой." },
        { t: "Slime Crown", d: "8 золотых/платиновых слитков + рубин = корона. + 20 геля @ алтарь зла (в порче/кримзоне)." },
        { t: "Бой", d: "Не стой под ним. Телепорт за спину — крюк. На Revengeance прыгает чаще." }
      ]},
    6:  { theme: "desert",   mood: "Песок помнит голод. Червь уже слышит шаги.",
      steps: [
        { t: "Фарм челюстей", d: "Пустыня днём: Antlion, Antlion Charger — Antlion Mandible. Stormlion (с молнией) — Stormlion Mandible. Нужно 4 + 2." },
        { t: "Медальон", d: "Алтарь зла: 40 любого песка + 4 Antlion Mandible + 2 Stormlion Mandible. Не расходуется. Иногда лежит в Sandstone Chest (20%)." },
        { t: "Арена в пустыне", d: "Длинная плоская насыпь НАД песком, 2–3 платформы. Вне пустыни босс энрейджится." },
        { t: "После боя", d: "Pearl Shard с бича. Sea Remains НЕ дропаются — их крафтят в печи: 2 Pearl Shard + 2 коралла + 2 морские звёзды + 2 ракушки." }
      ]},
    7:  { theme: "sea",      mood: "Панцирь и жемчуг. Море принимает тебя.",
      objective: "Испеки морские останки, надень полный виктайд своего класса, убей гигантского моллюска и посели Морского короля.",
      steps: [
        { t: "Напеки Sea Remains", d: "Океан (чистый): кораллы, звёзды, ракушки на дне. Pearl Shard — с Desert Scourge. Печь: 2+2+2+2 = 1 Sea Remains. На сет 12, на оружие ещё 2–5." },
        { t: "Сет и инструмент", d: "Наковальня. Шлем строго своего класса. Greatbay Pickaxe (3) лучше золота. Reefclaw Hamaxe (2)." },
        { t: "Гигантский моллюск", d: "Большая раковина в Затонувшем море. После бича агрессивна. Бей в гроте, крюк на потолок." },
        { t: "Sea King", d: "Появится NPC. Посели у океана. Amidias' Blessing — бесконечный воздух, пока тебя не ударили." }
      ]},
    8:  { theme: "acid",     mood: "Красный глаз на небе, зелёная вода у данжа.",
      objective: "Убей Глаз Ктулху, надень щит Ктулху, найди сернистое море и переживи первый кислотный дождь. В Бездну не спускайся.",
      steps: [
        { t: "Глаз Ктулху", d: "Ночь, арена как у короля. Suspicious Looking Eye @ алтарь (6 линз). Expert: Щит Ктулху — рывок, носи до конца прехардмода." },
        { t: "Найди Сернистое море", d: "Океан СО СТОРОНЫ ДАНЖА. Вода зелёная и жжёт. Это не Левиафан." },
        { t: "Acid Rain I", d: "После Глаза может начаться сам. Платформы НАД водой. Sulphuric Scale — на сернистый сет." },
        { t: "Rusty Chest", d: "Пещеры под берегом. Как только вода станет чёрной — РАЗВОРАЧИВАЙСЯ. Это Бездна." }
      ]},
    9:  { theme: "mushroom", mood: "Споры липнут к панцирю. Краб голоден.",
      objective: "Найди грибной биом, скрафти росток декаподиты, убей Крабулона и надень грибной сгусток.",
      steps: [
        { t: "Грибной биом", d: "Глубокие пещеры, синие грибы. Или грибной планетойд в небе." },
        { t: "50 Glowing Mushroom", d: "Срезай, не взрывай биом. Decapodita Sprout @ алтарь." },
        { t: "Арена", d: "Высокий потолок, 2 платформы. Краб прыгает и ставит грибные столбы. Rev: Mushroom Plasma Root — съешь, +1 сек Rage навсегда." }
      ]},
    10: { theme: "evil",     mood: "Мир выбрал порчу или кровь. Потом придёт Улей.",
      objective: "Сначала ванильный босс зла, потом Разум улья или Перфораторы. Накопай аэролит на островах и скрафти аэроспек.",
      steps: [
        { t: "Ванильный босс зла", d: "Порча: теневые сферы (бомба/молот) или Worm Food. Кримзон: багровые сердца или Bloody Spine. Сначала его." },
        { t: "Нарост Calamity", d: "Hive Tumor (порча) / Perforator Cyst (кримзон) — пульсирует. Ломай или используй призыв." },
        { t: "Aerialite", d: "После босса лети на парящие острова (зелье гравитации / верёвки). Голубая руда. Также Aero Slime. Плавка → Aerospec сет." }
      ]},
    11: { theme: "dungeon",  mood: "Кости помнят имя. Бандит уже считает твои реролы.",
      steps: [
        { t: "Скелетрон ночью", d: "Поговори со стариком у данжа. Сначала руки, потом голова. Не уходи далеко." },
        { t: "Данж", d: "Ключ теней из золотых сундуков. Alchemy Table — Blood Orb в зелья. Спаси Механика. Книги мага, Muramasa, Cobalt Shield." },
        { t: "Бандит", d: "NPC плута после Скелетрона. Возврат части денег за перековку у гоблина." },
        { t: "Бездна слой 1", d: "Под сернистым морем, ещё не чёрная бездна. Древние сундуки открываются после Скелетрона. Жабы, свет, кровать у берега." }
      ]},
    12: { theme: "slime",    mood: "Два бога студня и ядро между ними.",
      objective: "Нафарми порченый гель, убей бога слизней, надень статиджель. Это твой сет к Стене плоти.",
      steps: [
        { t: "Blighted Gel", d: "Слизни в порче/кримзоне (Ebonian / Crimulan). 40 штук + 40 эбонита/кримкаменя." },
        { t: "Overloaded Sludge @ алтарь", d: "Не расходуется. Арена очень длинная, 3 яруса." },
        { t: "Бой", d: "Два больших слизня + ядро. Не дай ядру прижаться. Rev: Electrolyte Gel Pack — съешь." },
        { t: "Statigel", d: "Purified Gel с босса. Лучший прехардмод-сет ко Стене." }
      ]},
    13: { theme: "hell",     mood: "Мост через огонь. Стена идёт.",
      objective: "Построй адский мост, собери зелья, убей Стену плоти, надень эмблему класса. Хардмод открыт.",
      steps: [
        { t: "Мост", d: "Ровная линия через весь ад, 3–4 блока толщиной, без дыр. Пепельные блоки / обсидиан." },
        { t: "Кукла", d: "Voodoo Demon над лавой. Не урони куклу случайно. Calamity добавляет рецепт на всякий." },
        { t: "Зелья", d: "Alchemy Table + Blood Orb: Ironskin, Regen, Swiftness, Wrath, Endurance, Lifeforce." },
        { t: "Бой", d: "Беги в одну сторону. Бей глаза и голод. Щит Ктулху сквозь голод. Сумка: эмблема класса + Rogue Emblem." }
      ]},
    14: { theme: "astral",   mood: "Небо треснуло. Фиолетовая инфекция села на мир.",
      objective: "Добудь первую хардмод-руду и крылья. Найди астральную инфекцию, собери три эссенции. Метеорит не копай.",
      steps: [
        { t: "Кобальт/палладий", d: "Первая хардмод-руда (или по реворку сразу после WoF). Кирка, сет, крылья — приоритет №1." },
        { t: "Три эссенции", d: "Sunlight — гарпии/космос. Eleum — снега. Havoc — Brimstone Crag. Стопка каждой." },
        { t: "Astral Infection", d: "Новый фиолетовый биом + метеорит. Starblight Soot. Руду метеорита НЕ КОПАЙ до Astrum Deus." },
        { t: "Моллюск 2.0", d: "Затонувшее море, Гигантский моллюск усилен. Mollusk Husk → танк-сет." }
      ]},
    15: { theme: "ice",      mood: "Сфера во льду. Архимаг откроет дверь.",
      objective: "Скрафти крио-ключ, убей Криогена в снегах, посели Архимага. Крионит копай после двух мехов.",
      steps: [
        { t: "Cryo Key", d: "Essence of Eleum с ледяных хардмод-врагов + лёд @ наковальня. Только в снегах." },
        { t: "Арена", d: "Открытое небо снежного биома, 2–3 яруса. Крылья обязательны." },
        { t: "После боя", d: "Посели Archmage. Cryonic Ore появится во льду — копать адам/титан киркой (после 2 мехов)." }
      ]},
    16: { theme: "hell",     mood: "Сталь, лазеры и второй червь моря.",
      objective: "Убей трёх мехов и водного бича. Съешь алую мандарину. Расшифруй схему джунглей.",
      steps: [
        { t: "Первый мех", d: "Разрушитель проще с пронзанием. Потом Близнецы / Прайм." },
        { t: "Aquatic Scourge", d: "Сернистое море, призыв Seafood. Платформы над водой. Открывает Acid Rain II." },
        { t: "Все трое", d: "Sanguine Tangerine — съешь, +25 HP. Если реворк руд — сумки мехов открывай после третьего." }
      ]},
    17: { theme: "brim",     mood: "Кратер дышит серой. Она смотрит из пепла.",
      steps: [
        { t: "Найди кратер", d: "Ад → ниже/в сторону. Красный пепел, руины, лава. Поставь точку на карте." },
        { t: "Charred Idol", d: "Адская кузня: 5 Unholy Core (Infernal Suevite + адский камень) + 7 Essence of Havoc + 5 Soul of Night." },
        { t: "Арена в кратере", d: "Длинная платформа БЕЗ лавы под ногами. Зелье огнестойкости. Вне кратера энрейдж." }
      ]},
    18: { theme: "brim",     mood: "Не она. Её тень. Пепел береги до финала.",
      objective: "Убей клон Каламитас. Пепел бедствия сложи в сундук и не продавай — он нужен до самого конца.",
      steps: [
        { t: "Eye of Desolation", d: "Наковальня: 10 Hellstone Bar + 5 Essence of Havoc." },
        { t: "Арена", d: "Очень широкая, ночь, крылья. Братья Catastrophe и Cataclysm — убей, когда выйдут." },
        { t: "Пепел", d: "Ashes of Calamity в отдельный сундук. НЕ продавать. После Плантеры — Core of Calamity. В финале — алтарь ведьмы." }
      ]},
    19: { theme: "jungle",   mood: "Лампочка в лианах. Лето становится вечным.",
      objective: "Убей Плантеру, накопай многолетнюю руду, скрафти ядро бедствия, по желанию великую песчаную акулу.",
      steps: [
        { t: "Плантера", d: "Подземные джунгли, большая сфера-арена. Portabulb если не хочешь искать лампочку. Не выходи из джунглей." },
        { t: "Perennial Ore", d: "Розово-зелёные жилы в пещерах после боя." },
        { t: "Core of Calamity", d: "Если клон уже убит: пепел + три эссенции + эктоплазма @ мифриловая наковальня." },
        { t: "Great Sand Shark", d: "Песчаная буря после Плантеры или Sandstorm's Core. Grand Scale." }
      ]},
    20: { theme: "ocean",    mood: "Песня сначала. Потом кит.",
      objective: "Построй океанскую арену, убей Анахиту и Левиафана, спустись во 2 слой Бездны за клетками и люменилом.",
      steps: [
        { t: "Чистый океан", d: "Противоположный сернистому. Построй острова и платформы над водой." },
        { t: "Anahita", d: "Плавай, пока не встретишь ??? / Anahita. При ~50% HP всплывает Левиафан." },
        { t: "Бездна слой 2", d: "После победы. Depth Cells, Lumenyl, Planty Mush. Abyssal Diving Gear почти обязателен. Свет + кровать у берега." }
      ]},
    21: { theme: "astral",   mood: "Золотой голем ночи. Маяк уже горит.",
      objective: "Расшифруй схему планетойда, убей Аструм Ауреуса ночью, открой астральный сундук в данже.",
      steps: [
        { t: "Схема планетойда", d: "Должна быть расшифрована (Decryption Computer + провода после Скелетрона)." },
        { t: "Astral Chunk", d: "Рецепт схемы + Starblight Soot. Ночь, поверхность Astral Infection." },
        { t: "После боя", d: "Астральные враги усиливаются и капают оружие. Биом-сундук в Данже: Heavenfallen Stardisk (плут)." }
      ]},
    22: { theme: "jungle",   mood: "Храм ящщеров. Потом жар Бездны.",
      objective: "Убей Голема, накопай скорию, скрафти гидротерм и сплав жизни, съешь чудо-фрукт.",
      steps: [
        { t: "Голем", d: "Power Cell в алтарь храма. Многие выносят кусок храма под арену — в Calamity он злой." },
        { t: "Scoria", d: "Горящие жилы в Бездне. Hydrothermic сет." },
        { t: "Life Alloy", d: "1 Cryonic + 1 Perennial + 1 Scoria @ мифриловая. Miracle Fruit — съешь, +25 HP." },
        { t: "Чума", d: "В джунглях появляются чумные враги. Plague Cell Canister копи." }
      ]},
    23: { theme: "jungle",   mood: "Чума, кости, герцог и свет императрицы.",
      steps: [
        { t: "PBG", d: "Джунгли, открытое небо. Infected Armor Plating — чумный сет и турели." },
        { t: "Ravager", d: "Поверхность. Сначала конечности. Fleshy Geode. Rev: Infernal Blood — съешь." },
        { t: "Duke / Empress", d: "Трюфельный червь в океане. Кружево в халлоу ночью. Дневная императрица = Terraprisma только с ноухитом." }
      ]},
    24: { theme: "cosmic",   mood: "Червь звёзд, потом глаз луны. Ваниль кончается.",
      objective: "Убей Аструм Деуса, накопай астральную руду, съешь эфирное ядро, убей Лунного лорда. Сразу люминитовая кирка.",
      steps: [
        { t: "Titan Heart", d: "Астральные титаны. Неси на Astral Beacon в заражении → Astrum Deus." },
        { t: "Astral Ore", d: "После Deus копай метеорит. Ethereal Core — съешь, +50 маны." },
        { t: "Культист → столбы → Moon Lord", d: "Celestial Onion (не Master) — +1 слот. Сразу люминитовая кирка и Exodium с новых планетойдов." }
      ]},
    25: { theme: "holy",     mood: "Святой огонь. Богиня ещё не простила мир.",
      objective: "Нафарми нечестивую эссенцию, убей стражей и Провиденс, надень таррагон. Ярона не зови.",
      steps: [
        { t: "Unholy Essence", d: "Профанные враги в халлоу и аду после ML." },
        { t: "Стражи → Core → Providence", d: "Выбери биом: халлоу днём или ад. Огромная арена. Учи паттерны, бой длинный." },
        { t: "Uelibloom", d: "Джунгли после Провиденс. Tarragon сет. Tainted Cloudberry — +25 HP." },
        { t: "Равагер ещё раз", d: "Теперь капает Bloodstone. Brimrose — маунт с бесконечным полётом." }
      ]},
    26: { theme: "cosmic",   mood: "Трое знамений. Потом призрак данжа.",
      objective: "Убей трёх часовых и Полтергаста. Надень кровавую вспышку или омега-синий. Съешь фантомное сердце.",
      steps: [
        { t: "Storm Weaver — космос", d: "Червь, сначала броня." },
        { t: "Ceaseless Void — данж", d: "Расчисти огромный зал." },
        { t: "Signus — ад", d: "Телепорты и косы." },
        { t: "Polterghast", d: "Не фарми 30 духов без арены — он сам придёт. Ruinous Soul → Bloodflare / Omega Blue. Phantom Heart — съешь." }
      ]},
    27: { theme: "cosmic",   mood: "Он ест богов. Арена размером с мир.",
      objective: "Построй гигантскую арену, убей Пожирателя богов, скрафти космическую наковальню и сет богоубийцы или сильвы.",
      steps: [
        { t: "Cosmic Worm", d: "Armored Shell + Dark Plasma + Twisting Nether с часовых." },
        { t: "Арена 400+ блоков", d: "Несколько ярусов, без столбов в центре. Учи восьмёрку." },
        { t: "После DoG", d: "Cosmic Anvil. Ивенты: Nightmare Fuel / Endothermic Energy / Darksun Fragment. God Slayer или Silva." }
      ]},
    28: { theme: "dragon",   mood: "Джунгли горят золотом. Дракон помнит Ярима.",
      objective: "Убей Ярона в джунглях, накопай аурик, собери аурик тесла, съешь священную землянику.",
      steps: [
        { t: "Яйцо", d: "Effulgent Feather с Dragonfolly. Не звать до DoG." },
        { t: "Арена в небе джунглей", d: "Вне джунглей энрейдж. Фаза 2 — почти новый босс." },
        { t: "Auric Ore", d: "После первого убийства в пещерах. Auric Tesla ест куски старых сетов — читай рецепт. Sacred Strawberry — последнее +25 HP." }
      ]},
    29: { theme: "final",    mood: "Дрейдон на линии. Ведьма у алтаря. Два финала.",
      objective: "Убей экзо-мехов и Верховную ведьму Каламитас (любой порядок). Собери кузню Дрейдона и тенеспек.",
      steps: [
        { t: "Exo Mechs", d: "Auric Quantum Cooling Cell в Codebreaker. Арена 300+. Часто фокус: Thanatos → Artemis/Apollo → Ares." },
        { t: "Supreme Calamitas", d: "Altar of the Accursed + Ashes of Calamity. Буллет-хелл, братья, Sepulcher. Десятки попыток — норма." },
        { t: "После обоих", d: "Draedon's Forge, Miracle Matter, Shadowspec, Demonshade. Ведьма-NPC чарует оружие." }
      ]},
    30: { theme: "final",    mood: "Тишина после бури. Terminus на дне.",
      steps: [
        { t: "Terminus", d: "Дно Бездны. Boss Rush — все боссы подряд, только после обоих финалов." },
        { t: "Первозданный змей", d: "Скрытый змей глубочайшей Бездны. Добровольно." },
        { t: "Коллекция", d: "Реликвии, маски, шкатулки, ноухиты, вторая катка другим классом." }
      ]}
  };

  /* Каталог предметов: оружие, броня, аксессуары, инструменты */
  const items = [
    /* Q1 */
    { q:1, name:"Стартовый мешок", cls:"all", kind:"tool", get:"В инвентаре нового персонажа. Открой правой кнопкой.", why:"Оружие всех классов, зелья, крюк" },
    { q:1, name:"Wooden Sword / Bow / Staff из мешка", cls:"all", kind:"weapon", get:"Стартовый мешок", why:"Первые 10 минут, пока нет вульфрума" },
    { q:1, name:"Верстак", cls:"all", kind:"tool", rec:"10 дерева в инвентаре", get:"Руби дерево у спавна", why:"Первый стол крафта" },
    { q:1, name:"Печь", cls:"all", kind:"tool", rec:"20 камня на верстаке", get:"Камень в первой пещере", why:"Плавка руды, потом морские останки" },
    { q:1, name:"Железная / свинцовая наковальня", cls:"all", kind:"tool", rec:"5 слитков на верстаке", get:"Железная или свинцовая руда в пещерах", why:"Броня и оружие почти до хардмода" },
    { q:1, name:"Кровать", cls:"all", kind:"tool", rec:"5 шёлка + 15 дерева на верстаке", get:"Паутина в пещерах, ткацкий станок из 12 дерева", why:"Точка возрождения" },
    { q:1, name:"Life Crystal", cls:"all", kind:"potion", get:"Розовые сердца на стенах пещер", why:"+20 здоровья, ешь до 400" },
    { q:1, name:"Hermes / Flurry / Sailfish / Dunerider Boots", cls:"all", kind:"acc", get:"Золотые сундуки в пещерах, пустыне, снегах или океане", why:"Бег. Ищи в первый час" },
    { q:1, name:"Cloud / Blizzard / Sandstorm in a Bottle", cls:"all", kind:"acc", get:"Золотые сундуки, пирамиды, ледяные сундуки", why:"Второй прыжок — жизнь на боссах" },
    { q:1, name:"Grappling Hook", cls:"all", kind:"acc", get:"3 крюка с скелетов на наковальне, или дроп позже", why:"Цепляйся за блоки" },

    /* Q2 */
    { q:2, name:"Wulfrum Metal Scrap", cls:"all", kind:"mat", get:"Wulfrum Drone, Rover, Gyrator, Hovercraft, Wulfrum Slime — поверхность, день", why:"45 на сет, ещё на оружие и Bastion" },
    { q:2, name:"Energy Core", cls:"all", kind:"mat", get:"Те же вульфрум-враги, реже", why:"3 на сет, по 1 на часть" },
    { q:2, name:"Wulfrum Hat & Goggles", cls:"summoner", kind:"armor", rec:"10 × Wulfrum Metal Scrap + Energy Core", get:"Крафт", why:"Шлем сета, +5% summon" },
    { q:2, name:"Wulfrum Jacket", cls:"summoner", kind:"armor", rec:"20 × Wulfrum Metal Scrap + Energy Core", get:"Крафт", why:"+1 миньон" },
    { q:2, name:"Wulfrum Overalls", cls:"summoner", kind:"armor", rec:"15 × Wulfrum Metal Scrap + Energy Core", get:"Крафт", why:"+5% summon. Полный сет: Bastion (тап вниз)" },
    { q:2, name:"Wulfrum Controller", cls:"summoner", kind:"weapon", rec:"Scrap + Core @ наковальня", get:"Крафт. Есть оборонительный режим", why:"Первый нормальный миньон" },
    { q:2, name:"Wulfrum Blade / Screwdriver", cls:"melee", kind:"weapon", rec:"Scrap @ наковальня", get:"Крафт из обломков", why:"Ранний мили до моря" },
    { q:2, name:"Wulfrum Bow / Blunderbuss", cls:"ranged", kind:"weapon", rec:"Scrap @ наковальня", get:"Крафт", why:"Лучше деревянного лука" },
    { q:2, name:"Wulfrum Prosthesis / Staff", cls:"mage", kind:"weapon", rec:"Scrap + Core @ наковальня", get:"Крафт", why:"Дальше Жезла искр" },
    { q:2, name:"Wulfrum Knife", cls:"rogue", kind:"weapon", rec:"Scrap @ наковальня", get:"Крафт", why:"Учи стелс: стой, копи, кидай" },
    { q:2, name:"Rover Drive", cls:"all", kind:"acc", get:"Редкий дроп с Wulfrum Rover", why:"Щит на старте" },

    /* Q3 */
    { q:3, name:"Power Cell Factory", cls:"all", kind:"tool", get:"Сломай и забери из любой био-лаборатории, поставь у базы", why:"Копит Draedon Power Cells на весь мод" },
    { q:3, name:"Charging Station", cls:"all", kind:"tool", get:"Лаборатории Дрейдона", why:"Основа Codebreaker" },
    { q:3, name:"Dubious Plating / Mysterious Circuitry", cls:"all", kind:"mat", get:"Ящики и враги лабораторий, турели после поломки", why:"Части Codebreaker, дроны, турели" },
    { q:3, name:"Lab Seeking Mechanism", cls:"all", kind:"tool", rec:"4 Circuitry + 4 Plating + 10 любого железа @ наковальня", get:"Крафт, потом красится в цвета лабораторий", why:"Ищет лаборатории на карте" },
    { q:3, name:"Enchanted Sword / Terragrim", cls:"melee", kind:"weapon", get:"Мечевое святилище на планетоиде или в пещере. Terragrim — шиммер Enchanted Sword", why:"Лучший ранний мили" },
    { q:3, name:"Starfury", cls:"melee", kind:"weapon", get:"Сундуки парящих островов / планетойдов", why:"Бьёт с неба, удобно по червям" },
    { q:3, name:"Аксессуар святилища", cls:"all", kind:"acc", get:"По одному Shrine в лесу, пустыне, снегах, джунглях, зле, море", why:"Уникальные эффекты, не пропускай" },

    /* Q4 */
    { q:4, name:"Sea Prism", cls:"all", kind:"mat", get:"Светящиеся кристаллы на стенах Затонувшего моря (под подземной пустыней)", why:"Оружие моря, Enchanted Pearl, схемы" },
    { q:4, name:"Prism Shard", cls:"all", kind:"mat", get:"Там же, мелкие осколки", why:"Крафт призм и раннего оружия" },
    { q:4, name:"Schematic (Sunken Sea)", cls:"all", kind:"tool", get:"Лаборатория в Затонувшем море", why:"Первая схема, рецепты после Aerialite" },

    /* Q5 */
    { q:5, name:"Slime Crown", cls:"all", kind:"summon", rec:"Gold Crown + 20 × Gel", get:"Крафт", why:"Призыв Короля слизней" },
    { q:5, name:"Slimy Saddle / Hook", cls:"all", kind:"acc", get:"Дроп Короля", why:"Крюк почти обязателен, если ещё нет" },

    /* Q6 */
    { q:6, name:"Stormlion Mandible", cls:"all", kind:"mat", get:"Stormlion в пустыне и подземной пустыне (муравьиный лев с молнией)", why:"2 шт. на Desert Medallion" },
    { q:6, name:"Antlion Mandible", cls:"all", kind:"mat", get:"Обычные муравьиные львы, наездники, алкопы", why:"4 шт. на медальон" },
    { q:6, name:"Desert Medallion", cls:"all", kind:"summon", rec:"40 любого песка + 4 Antlion Mandible + 2 Stormlion Mandible @ алтарь зла", get:"Крафт или 20% в Sandstone Chest", why:"Нерасходуемый призыв бича. Только в пустыне" },
    { q:6, name:"Pearl Shard", cls:"all", kind:"mat", get:"Дроп Desert Scourge", why:"Основа Sea Remains (не путать: Remains крафтятся)" },

    /* Q7 */
    { q:7, name:"Sea Remains", cls:"all", kind:"mat", rec:"2 Pearl Shard + 2 Coral + 2 Starfish + 2 Seashell @ печь", get:"Кораллы/звёзды/ракушки — дно ОБЫЧНОГО океана (не сернистого)", why:"Victide, оружие моря, кирка, щит" },
    { q:7, name:"Victide Breastplate", cls:"all", kind:"armor", rec:"5 Sea Remains @ наковальня", get:"Крафт", why:"Общий нагрудник" },
    { q:7, name:"Victide Greaves", cls:"all", kind:"armor", rec:"4 Sea Remains @ наковальня", get:"Крафт", why:"Общие поножи" },
    { q:7, name:"Victide Shellmet", cls:"melee", kind:"armor", rec:"3 Sea Remains", get:"Крафт", why:"Шлем воина, агро + бонус в воде" },
    { q:7, name:"Victide Coral Turban", cls:"ranged", kind:"armor", rec:"3 Sea Remains", get:"Крафт", why:"Шлем стрелка" },
    { q:7, name:"Victide Hermit Helmet", cls:"mage", kind:"armor", rec:"3 Sea Remains", get:"Крафт", why:"Шлем мага" },
    { q:7, name:"Victide Mask", cls:"summoner", kind:"armor", rec:"3 Sea Remains", get:"Крафт", why:"+1 миньон, морская улитка" },
    { q:7, name:"Victide Headcrab", cls:"rogue", kind:"armor", rec:"3 Sea Remains", get:"Крафт", why:"+60 макс. стелса" },
    { q:7, name:"Urchin Mace", cls:"melee", kind:"weapon", rec:"3 Sea Remains @ наковальня", get:"Крафт", why:"Цеп в воде" },
    { q:7, name:"Reed Blowgun", cls:"ranged", kind:"weapon", rec:"2 Sea Remains @ наковальня", get:"Крафт", why:"Ранний ranged моря" },
    { q:7, name:"Coral Spout", cls:"mage", kind:"weapon", rec:"2 Sea Remains + 5 Coral @ книжный шкаф", get:"Крафт", why:"Магия моря" },
    { q:7, name:"Cnidarian", cls:"summoner", kind:"weapon", rec:"2 Sea Remains @ наковальня", get:"Крафт", why:"Медуза-миньон" },
    { q:7, name:"Fishbone Boomerang", cls:"rogue", kind:"weapon", rec:"2 Sea Remains @ наковальня", get:"Крафт", why:"Возвратный бумеранг плута" },
    { q:7, name:"Greatbay Pickaxe", cls:"all", kind:"tool", rec:"3 Sea Remains @ наковальня", get:"Крафт", why:"Лучше золота, копает то, что нужно до ада" },
    { q:7, name:"Reefclaw Hamaxe", cls:"all", kind:"tool", rec:"2 Sea Remains @ наковальня", get:"Крафт", why:"Топор+молот" },
    { q:7, name:"Shield of the Ocean", cls:"all", kind:"acc", rec:"5 Sea Remains + 5 Starfish @ наковальня", get:"Крафт", why:"Защита, особенно в воде" },
    { q:7, name:"Amidias' Blessing", cls:"all", kind:"acc", get:"Бафф Морского короля после победы над Гигантским моллюском", why:"Бесконечный воздух, пока не ударили" },
    { q:7, name:"Amidias' Pendant / Spark", cls:"all", kind:"acc", get:"Sea King продаёт / дроп моллюска", why:"Шипы и подводный урон" },

    /* Q8 */
    { q:8, name:"Suspicious Looking Eye", cls:"all", kind:"summon", rec:"6 линз @ алтарь", get:"Линзы с демоглазов ночью", why:"Призыв Глаза" },
    { q:8, name:"Shield of Cthulhu", cls:"all", kind:"acc", get:"Сумка Глаза в Expert/Rev", why:"Рывок. Носи очень долго" },
    { q:8, name:"Sulphuric Scale", cls:"all", kind:"mat", get:"Враги Acid Rain I на Сернистом море (океан стороны данжа, после Глаза)", why:"Sulphurous armor и оружие" },
    { q:8, name:"Sulphurous armor", cls:"all", kind:"armor", rec:"Sulphuric Scale @ наковальня", get:"Крафт", why:"Жить в кислоте проще" },
    { q:8, name:"Acid Gun / Toxibow", cls:"ranged", kind:"weapon", rec:"Сернистые материалы @ наковальня", get:"Крафт из чешуи / сундуки", why:"Сильный ranged до зла" },
    { q:8, name:"Blood Orb", cls:"all", kind:"mat", get:"Любой враг Кровавой луны", why:"Почти все зелья @ Alchemy Table без трав" },

    /* Q9 */
    { q:9, name:"Decapodita Sprout", cls:"all", kind:"summon", rec:"50 Glowing Mushroom @ алтарь", get:"Грибной биом или планетойд", why:"Призыв Крабулона, не расходуется" },
    { q:9, name:"Fungal Clump", cls:"all", kind:"acc", get:"Дроп / сумка Крабулона", why:"Липкий сгусток лечит и бьёт. Носят почти все классы" },
    { q:9, name:"Mycoroot / Hyphae Rod / Fungicide", cls:"all", kind:"weapon", get:"Дроп Крабулона (меч / маг / пушка)", why:"Отличное оружие этапа" },
    { q:9, name:"Mushroom Plasma Root", cls:"all", kind:"potion", get:"Revengeance, сумка Крабулона. Съесть один раз", why:"+1 сек. Rage навсегда" },

    /* Q10 */
    { q:10, name:"Worm Food", cls:"all", kind:"summon", rec:"Rotten Chunk + Vile Powder", get:"Крафт в мире с Порчей", why:"Отдельно вызывает Пожирателя миров" },
    { q:10, name:"Bloody Spine", cls:"all", kind:"summon", rec:"Vertebra + Vicious Powder", get:"Крафт в мире с Багрянцем", why:"Отдельно вызывает Мозг Ктулху" },
    { q:10, name:"Teratoma", cls:"all", kind:"summon", rec:"7 × Aerialite Bar + 3 × Demonite Bar + 13 × Rotten Chunk", get:"Крафт в ветке Порчи", why:"Отдельно вызывает Разум улья" },
    { q:10, name:"Bloody Worm Food", cls:"all", kind:"summon", rec:"7 × Aerialite Bar + 3 × Crimtane Bar + 13 × Vertebra", get:"Крафт в ветке Багрянца", why:"Отдельно вызывает Перфораторов" },
    { q:10, name:"Bloody Vein", cls:"all", kind:"summon", get:"Дроп Перфораторов или их сумки", why:"Питомец; в Get fixed boi вставляется во Взломостойку для вызова XB-∞ Гекаты" },
    { q:10, name:"Musket / The Undertaker", cls:"ranged", kind:"weapon", get:"Первая теневая сфера / багровое сердце", why:"Плюс плотник заселяется" },
    { q:10, name:"Vilethorn / Crimson Rod", cls:"mage", kind:"weapon", get:"Сферы / сердца", why:"Лучшая магия по червю / мозгу" },
    { q:10, name:"Ball O' Hurt / The Meatball", cls:"melee", kind:"weapon", get:"Сферы / крафт кримзона", why:"Флаил по сегментам" },
    { q:10, name:"Aerialite Ore", cls:"all", kind:"mat", get:"Парящие острова и Aero Slime после Разума улья либо Перфораторов", why:"Aerospec и схема моря" },
    { q:10, name:"Aerospec armor", cls:"all", kind:"armor", rec:"Aerialite Bar, шлем под класс @ наковальня", get:"Крафт", why:"Следующий сет после Victide" },
    { q:10, name:"Harpy Ring", cls:"all", kind:"acc", get:"Гарпии в космосе / крафт перьев", why:"Полёт и урон в воздухе" },
    { q:10, name:"Feather Crown", cls:"rogue", kind:"acc", get:"Перья гарпий @ наковальня", why:"Плут в воздухе" },

    /* Q11 */
    { q:11, name:"Abeemination", cls:"all", kind:"summon", rec:"5 мёда + жало + 12 улейных блоков @ нет стола / верстак", get:"Улей в джунглях или крафт", why:"Королева пчёл" },
    { q:11, name:"Bee Gun / Bee's Knees / Hive-Five", cls:"all", kind:"weapon", get:"Дроп Королевы", why:"Пчёлы сильны до Слизня-бога" },
    { q:11, name:"Cobalt Shield", cls:"all", kind:"acc", get:"Золотой сундук Данжа", why:"Иммунитет к отбрасыванию" },
    { q:11, name:"Shadow Key", cls:"all", kind:"tool", get:"Золотой сундук Данжа", why:"Все теневые сундуки + бездонные позже" },
    { q:11, name:"Alchemy Table", cls:"all", kind:"tool", get:"Данж, стоит как мебель — подними", why:"Blood Orb → зелья" },
    { q:11, name:"Muramasa / Aqua Scepter / Magic Missile / Handgun", cls:"all", kind:"weapon", get:"Золотые сундуки Данжа", why:"Скачок силы своего класса" },
    { q:11, name:"Water Bolt", cls:"mage", kind:"weapon", get:"Книга на полке Данжа (ломай полки)", why:"До сих пор топ прехардмода" },
    { q:11, name:"Decryption Computer", cls:"all", kind:"tool", rec:"18 × Mysterious Circuitry + 10 × Dubious Plating + 100 × Wire + 15 × Glass + 10 × Any Copper Bar", get:"Крафт после спасения Механика", why:"Схема планетойда" },
    { q:11, name:"Оружие 1 слоя Бездны", cls:"all", kind:"weapon", get:"Ancient Treasure Chest под сернистым морем после Скелетрона", why:"Сильные прехардмод пушки. Не глубже слоя 1" },
    { q:11, name:"Arctic Diving Gear", cls:"all", kind:"acc", rec:"Diving Gear + Warmth / ледяные аксессуары @ мастерская", get:"Крафт перед Бездной", why:"Воздух и свет в воде" },

    /* Q12 */
    { q:12, name:"Blighted Gel", cls:"all", kind:"mat", get:"Ebonian/Crimulan slimes в зле", why:"40 на Overloaded Sludge" },
    { q:12, name:"Overloaded Sludge", cls:"all", kind:"summon", rec:"40 Blighted Gel + 40 эбонита/кримкаменя @ алтарь", get:"Крафт", why:"Призыв Slime God" },
    { q:12, name:"Purified Gel", cls:"all", kind:"mat", get:"Дроп Slime God", why:"Statigel и оружие" },
    { q:12, name:"Statigel armor", cls:"all", kind:"armor", rec:"Purified Gel + Hellstone/слитки, шлем под класс", get:"Крафт", why:"Топ к WoF, рывок/прыжок" },
    { q:12, name:"Gelitive / Overloaded weapons", cls:"all", kind:"weapon", get:"Крафт из Purified Gel и дроп босса", why:"Арсенал ко Стене" },
    { q:12, name:"Electrolyte Gel Pack", cls:"all", kind:"potion", get:"Revengeance, сумка Slime God. Съесть", why:"Апгрейд Adrenaline" },

    /* Q13 */
    { q:13, name:"Guide Voodoo Doll", cls:"all", kind:"summon", get:"Voodoo Demon в аду над лавой. Есть рецепт Calamity", why:"Брось в лаву" },
    { q:13, name:"Emblem класса / Rogue Emblem", cls:"all", kind:"acc", get:"Сумка Стены плоти", why:"Ядро аксессуаров хардмода" },
    { q:13, name:"Pwnhammer", cls:"all", kind:"tool", get:"Стена плоти", why:"Алтари. При реворке руд алтари дают души ночи" },
    { q:13, name:"Warrior / Ranger / Sorcerer / Summoner / Rogue Emblem", cls:"all", kind:"acc", get:"Сумка WoF — выбери свою", why:"Потом ковать в классные эмблемы" },

    /* Q14 */
    { q:14, name:"Cobalt / Palladium armor", cls:"all", kind:"armor", rec:"Соответствующие слитки @ наковальня", get:"Первая хардмод-руда", why:"Мост до Криогена" },
    { q:14, name:"Essence of Sunlight", cls:"all", kind:"mat", get:"Космос, гарпии, Cloud Elemental во время дождя", why:"Криоген/ядра/оружие" },
    { q:14, name:"Essence of Eleum", cls:"all", kind:"mat", get:"Снежный хардмод, ледяные враги, големы", why:"Cryo Key, Daedalus" },
    { q:14, name:"Essence of Havoc", cls:"all", kind:"mat", get:"Brimstone Crag, адские хардмод-враги", why:"Элементаль, клон, ядра" },
    { q:14, name:"Starblight Soot", cls:"all", kind:"mat", get:"Враги Astral Infection (новый биом хардмода)", why:"Comet Shard, Astral Chunk позже" },
    { q:14, name:"Comet Shard", cls:"mage", kind:"potion", rec:"Starblight Soot @ наковальня", get:"Крафт, съесть", why:"+60 макс. маны" },
    { q:14, name:"Mollusk Husk", cls:"all", kind:"mat", get:"Дроп Гигантского моллюска в хардмодном Затонувшем море", why:"Mollusk armor — танк" },
    { q:14, name:"Crystal Assassin armor", cls:"rogue", kind:"armor", get:"Queen Slime / связанные рецепты. В Calamity даёт стелс", why:"Мост плута" },
    { q:14, name:"Frostspark / Lightning / Terraspark Boots", cls:"all", kind:"acc", rec:"Мастерская гоблина, цепочка ванильных ботинок", get:"Собери как можно раньше", why:"Мобильность важнее урона" },
    { q:14, name:"Крылья (любые первые)", cls:"all", kind:"acc", get:"Harpy / Essence + души / Queen Slime / золотые сундуки хардмода", why:"Приоритет №1 хардмода" },

    /* Q15 */
    { q:15, name:"Cryo Key", cls:"all", kind:"summon", rec:"Essence of Eleum + лёд @ наковальня", get:"Крафт, только снега", why:"Призыв Cryogen" },
    { q:15, name:"Cryonic Ore / Bar", cls:"all", kind:"mat", get:"Жилы во льду после Cryogen. Кирка адам/титан (2 меха)", why:"Daedalus" },
    { q:15, name:"Daedalus armor", cls:"all", kind:"armor", rec:"Cryonic Bar, шлем под класс @ хардмод-наковальня", get:"Крафт", why:"Основной сет середины HM" },
    { q:15, name:"Ледяное оружие Криогена", cls:"all", kind:"weapon", get:"Сумка Cryogen / Archmage продаёт", why:"Сильно помогает на мехах" },

    /* Q16 */
    { q:16, name:"Seafood", cls:"all", kind:"summon", rec:"Сернистые/морские материалы", get:"Крафт, использовать в Сернистом море", why:"Aquatic Scourge" },
    { q:16, name:"Hallowed Bar / Hallowed armor", cls:"all", kind:"armor", rec:"Слитки мехов", get:"После мехов (при реворке стабильно после 3-го)", why:"Ванильный скачок" },
    { q:16, name:"Sanguine Tangerine", cls:"all", kind:"potion", rec:"После 3 мехов", get:"Крафт, съесть", why:"+25 HP навсегда" },
    { q:16, name:"Long Ranged Sensor Array", cls:"all", kind:"tool", rec:"Мифрил/орихалк + детали Дрейдона", get:"Крафт", why:"Схема джунглей" },
    { q:16, name:"Soul of Sight", cls:"all", kind:"mat", get:"Отдельный дроп Близнецов", why:"Оптические и дальнобойные рецепты" },
    { q:16, name:"Soul of Might", cls:"all", kind:"mat", get:"Отдельный дроп Уничтожителя", why:"Тяжёлое оружие и инструменты" },
    { q:16, name:"Soul of Fright", cls:"all", kind:"mat", get:"Отдельный дроп Скелетрона Прайма", why:"Оружие и предметы призыва" },
    { q:16, name:"Nuclear Fuel Rod", cls:"all", kind:"acc", get:"Гарантированный дроп Трясинной пасти на втором кислотном дожде", why:"Аксессуар кислотной ветки" },
    { q:16, name:"Spent Fuel Container", cls:"rogue", kind:"weapon", get:"Гарантированный дроп Трясинной пасти на втором кислотном дожде", why:"Оружие плута" },

    /* Q17 */
    { q:17, name:"Unholy Core", cls:"all", kind:"mat", rec:"3 Infernal Suevite + 2 Hellstone @ адская кузня", get:"После 1 меха, руда кратера", why:"Charred Idol и серное оружие" },
    { q:17, name:"Charred Idol", cls:"all", kind:"summon", rec:"5 Unholy Core + 7 Essence of Havoc + 5 Soul of Night @ адская кузня", get:"Крафт", why:"Brimstone Elemental, только в кратере" },
    { q:17, name:"Серное оружие элементаля", cls:"all", kind:"weapon", get:"Сумка Brimstone Elemental", why:"Огонь и лазеры своего класса" },

    /* Q18 */
    { q:18, name:"Eye of Desolation", cls:"all", kind:"summon", rec:"10 Hellstone Bar + 5 Essence of Havoc @ наковальня", get:"Крафт", why:"Calamitas Clone" },
    { q:18, name:"Ashes of Calamity", cls:"all", kind:"mat", get:"Дроп клона. Прячь в сундук", why:"Core of Calamity и алтарь SCal в финале" },
    { q:18, name:"Solar Veil", cls:"rogue", kind:"mat", get:"Солнечное затмение ПОСЛЕ клона", why:"Плутовские рецепты" },
    { q:18, name:"Оружие клона", cls:"all", kind:"weapon", get:"Сумка Calamitas Clone", why:"Серные пушки до Плантеры" },

    /* Q19 */
    { q:19, name:"Portabulb", cls:"all", kind:"summon", rec:"Джунглевые материалы", get:"Крафт Calamity", why:"Плантера без поиска лампочки" },
    { q:19, name:"Perennial Ore / Bar", cls:"all", kind:"mat", get:"Пещеры после Плантеры", why:"Сет, Life Alloy" },
    { q:19, name:"Core of Calamity", cls:"all", kind:"mat", rec:"Essence of Sunlight + Eleum + Havoc + Ashes of Calamity + Ectoplasm @ мифриловая", get:"После клона И Плантеры", why:"Сердце позднего HM" },
    { q:19, name:"Chlorophyte armor / оружие", cls:"all", kind:"armor", rec:"Хлорифит джунглей", get:"Копай после Плантеры", why:"Всё ещё силён" },
    { q:19, name:"Sandstorm's Core", cls:"all", kind:"summon", rec:"Core of Calamity + 3 × Ancient Battle Armor Material", get:"Крафт после Плантеры", why:"Отдельно вызывает Великую песчаную акулу в песчаную бурю" },
    { q:19, name:"Grand Scale", cls:"all", kind:"mat", get:"Гарантированный дроп Великой песчаной акулы", why:"Пустынное оружие и улучшения" },
    { q:19, name:"Seedler / Pygmy Staff / Venus Magnum / Leaf Blower", cls:"all", kind:"weapon", get:"Плантера / джунгли", why:"Классовый скачок" },

    /* Q20 */
    { q:20, name:"Abyssal Diving Gear", cls:"all", kind:"acc", rec:"Arctic Diving Gear + бездонные материалы @ мастерская", get:"Крафт перед слоем 2", why:"Дышать и видеть" },
    { q:20, name:"Aquatic Emblem", cls:"all", kind:"acc", get:"Океан / Левиафан ветка", why:"Подводный бой" },
    { q:20, name:"Оружие Левиафана и Анахиты", cls:"all", kind:"weapon", get:"Сумка дуэта", why:"Топ океана" },
    { q:20, name:"Depth Cells", cls:"all", kind:"mat", get:"Враги 2 слоя Бездны после Левиафана", why:"Гидротерм, бездонные рецепты" },
    { q:20, name:"Lumenyl", cls:"all", kind:"mat", get:"Светящиеся кристаллы/враги средней Бездны", why:"Свет и крафт" },
    { q:20, name:"Planty Mush", cls:"all", kind:"mat", get:"Растительность средней Бездны, копать", why:"Fathom Swarmer и прочее" },

    /* Q21 */
    { q:21, name:"Astral Chunk", cls:"all", kind:"summon", rec:"По схеме планетойда + Starblight Soot", get:"Нужна расшифровка", why:"Astrum Aureus, ночь, астрал" },
    { q:21, name:"Heavenfallen Stardisk", cls:"rogue", kind:"weapon", get:"Астральный биом-сундук в Данже после Ауреуса", why:"Уникальный плут" },
    { q:21, name:"Starlight Fuel Cell", cls:"all", kind:"potion", get:"Revengeance, сумка Ауреуса. Съесть", why:"Апгрейд Adrenaline" },
    { q:21, name:"Астральное оружие врагов", cls:"all", kind:"weapon", get:"Враги Astral Infection после Ауреуса капают чаще/сильнее", why:"Фарм ночью в биоме" },

    /* Q22 */
    { q:22, name:"Lihzahrd Power Cell", cls:"all", kind:"summon", get:"Ящики храма / крафт Calamity", why:"Голем" },
    { q:22, name:"Scoria Ore / Bar", cls:"all", kind:"mat", get:"Горящие жилы Бездны после Голема", why:"Hydrothermic, Life Alloy" },
    { q:22, name:"Hydrothermic armor", cls:"all", kind:"armor", rec:"Scoria Bar, шлем под класс", get:"Крафт", why:"Огненный сет до лунных" },
    { q:22, name:"Life Alloy", cls:"all", kind:"mat", rec:"Cryonic Bar + Perennial Bar + Scoria Bar @ мифриловая", get:"Крафт / Fleshy Geode", why:"Куча рецептов" },
    { q:22, name:"Miracle Fruit", cls:"all", kind:"potion", rec:"Позднехардмодные материалы", get:"Крафт, съесть", why:"+25 HP" },
    { q:22, name:"Plague Cell Canister", cls:"all", kind:"mat", get:"Чумные враги джунглей после Голема, мини-босс Plaguebringer", why:"Призыв PBG и чумное оружие" },
    { q:22, name:"Advanced Display", cls:"all", kind:"tool", rec:"Детали Дрейдона после Голема", get:"Крафт на Codebreaker", why:"Схема ада" },
    { q:22, name:"Rift Reeler", cls:"all", kind:"tool", get:"После Голема, крафт/покупка", why:"Лучшая удочка ингредиентов" },

    /* Q23 */
    { q:23, name:"Призыв PBG", cls:"all", kind:"summon", rec:"Plague Cell Canister + джунгли", get:"Крафт, использовать в джунглях", why:"Plaguebringer Goliath" },
    { q:23, name:"Infected Armor Plating", cls:"all", kind:"mat", get:"Дроп PBG", why:"Чумный сет, турели, схема джунглей" },
    { q:23, name:"Plaguebringer / Plague Reaper armor", cls:"all", kind:"armor", rec:"Plating + Canister", get:"Крафт", why:"Топ пре-ML" },
    { q:23, name:"Чумные пушки / клинки / посохи", cls:"all", kind:"weapon", get:"Крафт из plating и дроп PBG", why:"Короли пре-ML" },
    { q:23, name:"Fleshy Geode", cls:"all", kind:"mat", get:"Ravager", why:"Сплавы и ядра пачкой" },
    { q:23, name:"Infernal Blood", cls:"all", kind:"potion", get:"Revengeance Ravager. Съесть", why:"+1 сек Rage" },
    { q:23, name:"Tsunami / Razorblade Typhoon / Tempest Staff / Flairon", cls:"all", kind:"weapon", get:"Duke Fishron (трюфельный червь, океан)", why:"Ванильный топ" },
    { q:23, name:"Empress оружия / Terraprisma", cls:"all", kind:"weapon", get:"Empress of Light. Terraprisma — только дневной ноухит", why:"Призыватель особенно" },
    { q:23, name:"Soaring Insignia / Wings Empress", cls:"all", kind:"acc", get:"Отдельные награды Императрицы света", why:"Мобильность и длительный полёт" },
    { q:23, name:"Flying Dragon", cls:"melee", kind:"weapon", get:"Награда Бетси на седьмой волне Армии Древних III", why:"Дальнобойные волны ближнего урона" },
    { q:23, name:"Sky Dragon's Fury", cls:"melee", kind:"weapon", get:"Награда Бетси", why:"Посох монаха с двумя режимами" },
    { q:23, name:"Aerial Bane", cls:"ranged", kind:"weapon", get:"Награда Бетси", why:"Лук особенно силён против воздушных целей" },
    { q:23, name:"Betsy's Wrath", cls:"mage", kind:"weapon", get:"Награда Бетси", why:"Снижает защиту и усиливает последующий урон" },

    /* Q24 */
    { q:24, name:"Eidolon Tablet", cls:"all", kind:"summon", get:"Дроп Эйдолиста в Данже", why:"Отдельно вызывает Лунатика-культиста" },
    { q:24, name:"Ancient Manipulator", cls:"all", kind:"tool", get:"Гарантированная награда Лунатика-культиста", why:"Станция лунных и многих Calamity-рецептов" },
    { q:24, name:"Prelude", cls:"all", kind:"misc", get:"Первая победа над Лунатиком-культистом или крафт из его трофея", why:"Предмет истории мира" },
    { q:24, name:"Titan Heart", cls:"all", kind:"summon", get:"Астральные титаны в заражении", why:"Положи на Астральный маяк для боя с Аструм Деусом" },
    { q:24, name:"Astral Ore / Bar", cls:"all", kind:"mat", get:"Метеорит Astral ПОСЛЕ Deus", why:"Сет и оружие" },
    { q:24, name:"Ethereal Core", cls:"all", kind:"potion", rec:"Astral материалы", get:"Крафт, съесть", why:"+50 маны" },
    { q:24, name:"Astral armor", cls:"all", kind:"armor", rec:"Astral Bar", get:"Крафт", why:"Пре-ML / ранний пост-ML" },
    { q:24, name:"Celestial Sigil / столбы", cls:"all", kind:"summon", get:"Культист у данжа после Голема", why:"Лунный лорд" },
    { q:24, name:"Luminite / Lunar Fragments", cls:"all", kind:"mat", get:"Столбы и Moon Lord", why:"Лунные сеты, Empyrean" },
    { q:24, name:"Celestial Onion", cls:"all", kind:"potion", get:"Moon Lord вне Master. Съесть", why:"+1 слот аксессуара" },
    { q:24, name:"Exodium Cluster", cls:"all", kind:"mat", get:"Новые планетойды после ML. Люминитовая кирка", why:"Космическая наковальня позже" },
    { q:24, name:"Solar / Vortex / Nebula / Stardust / Empyrean armor", cls:"all", kind:"armor", rec:"Люминит + фрагменты", get:"Крафт. Empyrean — плут", why:"Первый пост-ML сет" },

    /* Q25 */
    { q:25, name:"Unholy Essence", cls:"all", kind:"mat", get:"Impious Immolator, Profaned Energy, Scorn Eater в халлоу и аду после ML", why:"Стражи, Провиденс, оружие" },
    { q:25, name:"Profaned Core", cls:"all", kind:"summon", get:"Дроп Profaned Guardians", why:"Призыв Providence" },
    { q:25, name:"Divine Geode", cls:"all", kind:"mat", get:"Providence 25–40", why:"Tarragon ветка" },
    { q:25, name:"Uelibloom Ore / Bar", cls:"all", kind:"mat", get:"Джунгли после Providence", why:"Tarragon armor" },
    { q:25, name:"Tarragon armor", cls:"all", kind:"armor", rec:"Uelibloom Bar, шлем под класс @ манипулятор", get:"Крафт", why:"Первый великий пост-ML сет" },
    { q:25, name:"Tainted Cloudberry", cls:"all", kind:"potion", rec:"Пост-Провиденс", get:"Крафт, съесть", why:"+25 HP" },
    { q:25, name:"Bloodstone", cls:"all", kind:"mat", get:"Усиленный Ravager и враги кратера после Providence", why:"Bloodflare, Brimrose" },
    { q:25, name:"Brimrose", cls:"all", kind:"acc", rec:"Bloodstone + Unholy Core", get:"Крафт", why:"Маунт, бесконечный полёт" },
    { q:25, name:"Effulgent Feather", cls:"all", kind:"mat", get:"Dragonfolly и Draconic Swarmer", why:"Яйцо Ярона. НЕ ЗВАТЬ Ярона сейчас" },
    { q:25, name:"Red Lightning Container", cls:"all", kind:"potion", get:"Revengeance Dragonfolly. Съесть", why:"Последний апгрейд Rage" },
    { q:25, name:"Профанное оружие", cls:"all", kind:"weapon", get:"Стражи / Providence / крафт из эссенций", why:"Мост к Tarragon-пушкам" },

    /* Q26 */
    { q:26, name:"Mark of Providence", cls:"all", kind:"summon", rec:"40 × Unholy Essence + 3 × Lunar Bar + 5 × Fragment Solar", get:"Крафт после Провиденс", why:"В космосе вызывает Ткача бурь, в Данже — Неугасимую пустоту, в Преисподней — Сигнуса" },
    { q:26, name:"Armored Shell", cls:"all", kind:"mat", get:"Отдельная награда Ткача бурь", why:"Космический червь и поздние рецепты" },
    { q:26, name:"Dark Plasma", cls:"all", kind:"mat", get:"Отдельная награда Неугасимой пустоты", why:"Космический червь и поздние рецепты" },
    { q:26, name:"Twisting Nether", cls:"all", kind:"mat", get:"Отдельная награда Сигнуса", why:"Космический червь и поздние рецепты" },
    { q:26, name:"Ruinous Soul", cls:"all", kind:"mat", get:"Polterghast 7–20", why:"Bloodflare, Omega Blue, Phantom Heart" },
    { q:26, name:"Bloodflare armor", cls:"all", kind:"armor", rec:"Bloodstone + Ruinous Soul", get:"Крафт", why:"Кровавый сет" },
    { q:26, name:"Omega Blue armor", cls:"all", kind:"armor", rec:"Бездонные зубы/души + Ruinous Soul", get:"Reaper Shark после Полтергаста капает Reaper Tooth", why:"Сет Бездны" },
    { q:26, name:"Phantom Heart", cls:"all", kind:"potion", rec:"Ruinous Soul ветка", get:"Крафт, съесть", why:"Финал маны" },
    { q:26, name:"Ectoheart", cls:"all", kind:"potion", get:"Revengeance Polterghast. Съесть", why:"Финал Adrenaline" },
    { q:26, name:"Reaper Tooth", cls:"all", kind:"mat", get:"Reaper Shark в Бездне после Полтергаста", why:"Omega Blue и бездонные пушки" },
    { q:26, name:"Sulphuric Acid Cannon", cls:"ranged", kind:"weapon", get:"Дроп Изверга на третьем кислотном дожде", why:"Позднее кислотное оружие стрелка" },
    { q:26, name:"Phosphorescent Gauntlet", cls:"melee", kind:"weapon", get:"Дроп Ядерного ужаса", why:"Позднее оружие воина кислотной ветки" },
    { q:26, name:"Gamma Heart", cls:"summoner", kind:"weapon", get:"Дроп Ядерного ужаса", why:"Позднее оружие призывателя кислотной ветки" },

    /* Q27 */
    { q:27, name:"Cosmic Worm", cls:"all", kind:"summon", rec:"Armored Shell + Dark Plasma + Twisting Nether (+прочее)", get:"Крафт после часовых", why:"Devourer of Gods" },
    { q:27, name:"Cosmilite Bar", cls:"all", kind:"mat", get:"DoG", why:"Космическая наковальня, сеты" },
    { q:27, name:"Cosmic Anvil", cls:"all", kind:"tool", rec:"Cosmilite + Luminite + Galactica Singularity + Exodium + хардмод-наковальня", get:"Крафт сразу после DoG", why:"Стол эндгейма" },
    { q:27, name:"Nightmare Fuel", cls:"all", kind:"mat", get:"Тыквенная луна после DoG (усиленная)", why:"God Slayer / эссенции" },
    { q:27, name:"Endothermic Energy", cls:"all", kind:"mat", get:"Морозная луна после DoG", why:"Silva / эссенции" },
    { q:27, name:"Darksun Fragment", cls:"all", kind:"mat", get:"Солнечное затмение после DoG", why:"Оружие и эссенции" },
    { q:27, name:"Ascendant Spirit Essence", cls:"all", kind:"mat", rec:"Necroplasm + Nightmare + Endothermic + Darksun @ мифриловая/космическая", get:"Крафт", why:"Omega хилки и куча рецептов" },
    { q:27, name:"God Slayer armor", cls:"all", kind:"armor", rec:"Cosmilite + ивент-материалы", get:"Крафт", why:"Убийца богов" },
    { q:27, name:"Silva armor", cls:"all", kind:"armor", rec:"Cosmilite + природа/ивенты", get:"Крафт", why:"Живучий сет, часто маг/призыватель" },
    { q:27, name:"Murasama", cls:"melee", kind:"weapon", get:"Адская лаборатория. Взмахнуть можно только после DoG", why:"Легендарный true melee" },
    { q:27, name:"Omega Healing Potion", cls:"all", kind:"potion", rec:"Ascendant Spirit Essence ветка", get:"Крафт", why:"Лучшие хилки" },

    /* Q28 */
    { q:28, name:"Blessed Phoenix Egg", cls:"all", kind:"summon", rec:"Effulgent Feather + материалы", get:"Крафт. Не до DoG", why:"Yharon, только джунгли" },
    { q:28, name:"Yharon Soul Fragment", cls:"all", kind:"mat", get:"Yharon 25–35", why:"Драконье оружие" },
    { q:28, name:"Wings of Rebirth", cls:"all", kind:"acc", get:"Yharon", why:"Лучшие чистые крылья" },
    { q:28, name:"Seraph Tracers", cls:"all", kind:"acc", rec:"Эндгейм-ботинки + крылья", get:"Крафт если хочешь бег+полёт", why:"Альтернатива крыльям" },
    { q:28, name:"Auric Ore / Bar", cls:"all", kind:"mat", get:"Пещеры после первого Ярона", why:"Auric Tesla" },
    { q:28, name:"Auric Tesla armor", cls:"all", kind:"armor", rec:"Auric Bar + куски Tarragon/Bloodflare/God Slayer/Silva", get:"Крафт. Не разбирай последний сет вслепую", why:"Лучшая броня до финала" },
    { q:28, name:"Sacred Strawberry", cls:"all", kind:"potion", rec:"Auric ветка", get:"Крафт, съесть", why:"Последний +25 HP" },
    { q:28, name:"Auric Quantum Cooling Cell", cls:"all", kind:"tool", rec:"Auric + Codebreaker", get:"Крафт", why:"Звонок Дрейдону" },
    { q:28, name:"Altar of the Accursed", cls:"all", kind:"tool", rec:"Эндгейм-блоки / пепел", get:"Крафт, поставь на арену", why:"Пепел бедствия вызывает Верховную ведьму; Вкусное мясо в Get fixed boi заменяет её Пермафростом" },
    { q:28, name:"Драконье оружие Ярона", cls:"all", kind:"weapon", get:"Сумка Ярона / крафт из фрагментов души", why:"Пре-экзо арсенал" },

    /* Q29 */
    { q:29, name:"Exo Prism", cls:"all", kind:"mat", get:"Экзо-мехи; в Get fixed boi тот же материал даёт XB-∞ Геката", why:"Кузня Дрейдона, экзо-оружие и тенеспек" },
    { q:29, name:"Ashes of Annihilation", cls:"all", kind:"mat", get:"Верховная ведьма; в Get fixed boi тот же материал даёт Пермафрост", why:"Тенеспек и финальные рецепты" },
    { q:29, name:"Draedon's Forge", cls:"all", kind:"tool", rec:"Манипулятор + Cosmic Anvil + хардмод-кузня + мастерская + Exo Prism", get:"Сборка после мехов", why:"Финальный стол" },
    { q:29, name:"Miracle Matter", cls:"all", kind:"mat", rec:"Auric + Exo Prism + Life Alloy + эссенция + фрагменты + Core of Calamity @ кузня Дрейдона", get:"Крафт", why:"Превращает лучшее оружие ветки в экзо" },
    { q:29, name:"Exo-оружие (Exoblade и др.)", cls:"all", kind:"weapon", rec:"Miracle Matter + легендарное оружие ветки", get:"Кузня Дрейдона", why:"Пик каждой ветки" },
    { q:29, name:"Shadowspec Bar", cls:"all", kind:"mat", rec:"Exo Prism + Ashes of Annihilation @ кузня", get:"Крафт после ОБОИХ финалов", why:"Demonshade и финал" },
    { q:29, name:"Demonshade armor", cls:"all", kind:"armor", rec:"Shadowspec Bar", get:"Крафт", why:"Абсолютный сет, высокий риск/сила" },
    { q:29, name:"Зачарование ведьмы", cls:"all", kind:"acc", get:"Городская Каламитас после обычной победы над Верховной ведьмой", why:"Новые эффекты на любимом оружии" },
    { q:29, name:"Lava Chicken Broth", cls:"all", kind:"potion", get:"Гарантированная награда XB-∞ Гекаты", why:"Уникальный предмет скрытой экзо-ветки" },
    { q:29, name:"Delicious Meat", cls:"all", kind:"summon", get:"Держи при взаимодействии с Алтарём проклятых в Get fixed boi", why:"Заменяет Верховную ведьму на Верховного ультрамага Пермафроста" },
    { q:29, name:"Coldheart Icicle", cls:"all", kind:"weapon", get:"Гарантированная награда Верховного ультрамага Пермафроста", why:"Наносит процентный урон при касании" },

    /* Q30 */
    { q:30, name:"Terminus", cls:"all", kind:"summon", get:"Сундук/пьедестал на ДНЕ Бездны", why:"Boss Rush" },
    { q:30, name:"Rock", cls:"all", kind:"acc", get:"Награда за прохождение Boss Rush", why:"Мемный трофей" },
    { q:30, name:"Halibut Cannon", cls:"ranged", kind:"weapon", get:"Гарантированная награда Первозданного змея", why:"Главное дальнобойное оружие скрытой бездонной ветки" },
    { q:30, name:"Eidolic Wail", cls:"mage", kind:"weapon", get:"Гарантированная награда Первозданного змея", why:"Магическое оружие скрытой бездонной ветки" },
    { q:30, name:"Grand Dad", cls:"melee", kind:"weapon", get:"Гарантированная награда Первозданного змея", why:"Оружие воина скрытой бездонной ветки" },
    { q:30, name:"Abyss Shell Fossil", cls:"all", kind:"summon", get:"Награда Первозданного змея или Эйдолонского змея", why:"Питомец Бездны" },
    { q:30, name:"NO", cls:"all", kind:"summon", get:"Болдоры после двух финальных веток в Get fixed boi", why:"Отдельно вызывает THE LORDE" },
    { q:30, name:"Suspicious Looking NO U", cls:"all", kind:"summon", get:"Гарантированная награда THE LORDE", why:"Световой питомец скрытого босса" },
    { q:30, name:"Добыча Первозданного змея", cls:"all", kind:"weapon", get:"Отдельный скрытый босс четвёртого слоя Бездны", why:"Полный набор оружия и материалов Бездны" }
  ];

  const moreCrafts = [
    { stage: "Море", name: "Морские останки", station: "Печь", ings: "2 жемчужных осколка + 2 коралла + 2 морские звезды + 2 ракушки", why: "Не дроп червя. Пеки пачками: на сет 12 штук, на оружие ещё 2–5." },
    { stage: "Море", name: "Булава ежа", station: "Наковальня", ings: "3 морских останка", why: "Цеп воина-виктайда. В воде сильнее." },
    { stage: "Море", name: "Тростниковое ружьё", station: "Наковальня", ings: "2 морских останка", why: "Оружие стрелка-виктайда." },
    { stage: "Море", name: "Коралловый поток", station: "Книжный шкаф", ings: "2 морских останка + 5 кораллов", why: "Магия виктайда." },
    { stage: "Море", name: "Стрекающее", station: "Наковальня", ings: "2 морских останка", why: "Медуза-миньон призывателя." },
    { stage: "Море", name: "Рыбокостный бумеранг", station: "Наковальня", ings: "2 морских останка", why: "Бумеранг плута. Возвращается." },
    { stage: "Море", name: "Кирка великой бухты", station: "Наковальня", ings: "3 морских останка", why: "Кирка этапа. Лучше золотой — сделай сразу." },
    { stage: "Море", name: "Щит океана", station: "Наковальня", ings: "5 морских останков + 5 морских звёзд", why: "Щит. Особенно полезен в воде." },
    { stage: "Старт", name: "Механизм поиска лаборатории", station: "Наковальня", ings: "4 загадочные схемы + 4 сомнительные обшивки + 10 любого железа", why: "На карте показывает ближайшую лабораторию Дрейдона." },
    { stage: "Кратер", name: "Нечестивое ядро", station: "Адская кузня", ings: "3 инфернальных суевита + 2 адских камня", why: "После первого меха. Нужно на обугленный идол." }
  ];

  CODEX.themes = T;
  CODEX.items = items;
  CODEX.crafts = (CODEX.crafts || []).concat(moreCrafts);
  CODEX.quests.forEach((q) => {
    const m = meta[q.id];
    if (!m) return;
    const th = T[m.theme] || T.forest;
    Object.assign(q, { theme: m.theme, mood: m.mood, objective: m.objective }, th);
    q.gear = items.filter((i) => i.q === q.id);
  });

  /* поправка: Sea Remains не дроп бича */
  const sg = CODEX.quests.find((q) => q.id === 6);
  if (sg) {
    sg.collect = [
      { t: "Stormlion Mandible ×2", d: "Stormlion в пустыне — муравьиный лев, бьющий молнией. Фармь днём по дюнам и в подземной пустыне." },
      { t: "Antlion Mandible ×4", d: "Обычные муравьиные львы, зарядчики, алкопы. Копай муравейники." },
      { t: "Любой песок ×40", d: "Под ногами. Подойдёт обычный, эбонный, багровый, жемчужный." },
      { t: "Pearl Shard", d: "Дроп самого бича. Это ЕЩЁ НЕ Sea Remains — остатки пекутся в печи на следующем квесте." }
    ];
  }
  const v = CODEX.quests.find((q) => q.id === 7);
  if (v) {
    v.collect = [
      { t: "Pearl Shard", d: "Уже с бича. Если мало — бей ещё раз, медальон не расходуется." },
      { t: "Coral, Starfish, Seashell", d: "Дно ЧИСТОГО океана (не зелёного). Ныряй у берега, ломай кораллы, собирай звёзды и ракушки." },
      { t: "Sea Remains ×12+ на сет", d: "Печь: 2 шарда + 2 коралла + 2 звезды + 2 ракушки = 1 остаток. Нагрудник 5, поножи 4, шлем 3. Оружие ещё 2–5." }
    ];
    v.crafts = [
      { t: "Sea Remains", r: "Печь: 2 Pearl Shard + 2 Coral + 2 Starfish + 2 Seashell", w: "Пеки пачками, не по одному." },
      { t: "Victide сет", r: "Наковальня: 5 + 4 + 3 Sea Remains (шлем своего класса)", w: "В воде: реген, броня, урон. 10% шанс ракушки-снаряда." },
      { t: "Оружие класса", r: "Mace 3 / Blowgun 2 / Spout 2+5 коралла @ шкаф / Cnidarian 2 / Boomerang 2", w: "Смотри вкладку предметов квеста." },
      { t: "Greatbay Pickaxe + Hamaxe", r: "3 и 2 Sea Remains", w: "Инструменты этапа, не пропускай." }
    ];
  }
})();
