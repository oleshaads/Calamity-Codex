/* Рукописный русский путеводитель вкладки «Мобы»: как начинаются события,
 * что делать и как сгруппированы биомы. Дополняет сгенерированный js/mobs.js. */
window.CALAMITY_MOB_GUIDE = {
  tagRu: {
    "cb:Abyss": "Бездна", "cb:Astral": "Астральное заражение", "cb:Crags": "Серный кратер",
    "cb:Plague": "Чумные джунгли", "cb:SulphurousSea": "Сернистое море", "cb:SunkenSea": "Затонувшее море",
    "ce:AcidRain": "Кислотный дождь"
  },
  events: [
    { id: "blood-moon", icon: "assets/vanilla-sprites/4271.png", title: "Кровавая луна", tags: ["e:BloodMoon"], summon: "Случайной ночью (шанс ~1 из 9 при 120+ ОЗ) либо вручную Кровавой слезой.", tip: "Зомби открывают двери — поставь дверь на платформу или закройся блоками. Рыбалка в кровавую луну даёт особых врагов с ценным дропом." },
    { id: "slime-rain", title: "Слизневый дождь", tags: ["e:SlimeRain"], summon: "Начинается сам; после 150 убитых слизней падает Король слизней.", tip: "Простой способ призвать Короля слизней без Слизневой короны." },
    { id: "goblins", icon: "assets/vanilla-sprites/361.png", title: "Гоблинская армия", tags: ["i:Goblins"], summon: "Шанс с рассвета после разбитой теневой сферы или багряного сердца; вручную — Гоблинское боевое знамя.", tip: "Гоблин-волшебник телепортируется, воины идут толпой. После победы в пещерах появляется Связанный гоблин-изобретатель." },
    { id: "rain", title: "Дождь и метель", tags: ["e:Rain", "e:Blizzard"], summon: "Погодное событие, начинается само.", tip: "В снегах дождь идёт метелью; в хардмоде появляются Ледяной голем и другие особые враги." },
    { id: "sandstorm", title: "Песчаная буря", tags: ["e:Sandstorm"], summon: "Погодное событие в пустыне.", tip: "В хардмоде песчаные элементали приносят Запретные фрагменты для брони мага/призывателя." },
    { id: "windy", title: "Ветреный день", tags: ["e:WindyDay"], summon: "Погодное событие: сильный ветер.", tip: "Злобные одуванчики опасны в начале игры; воздушные змеи летают сами." },
    { id: "eclipse", icon: "assets/vanilla-sprites/2767.png", title: "Солнечное затмение", tags: ["e:Eclipse"], summon: "Утром с шансом 1 из 20 после победы над любым механическим боссом; вручную — Солнечная табличка из Храма джунглей.", tip: "После Плантеры появляется Мотрон с Осколками светозара. Дерись у дома: враги ломятся к тебе весь день." },
    { id: "frost-legion", icon: "assets/vanilla-sprites/602.png", title: "Морозный легион", tags: ["i:FrostLegion"], summon: "Используй Снежный шар (находится в Подарках, выпадающих в декабре/на Рождество).", tip: "Простое событие со снеговиками; после победы Санта-Клаус может заселиться." },
    { id: "pirates", icon: "assets/vanilla-sprites/1315.png", title: "Пиратское вторжение", tags: ["i:Pirates"], summon: "Случайно в хардмоде после разрушенного алтаря; вручную — Пиратская карта (дроп врагов океана в хардмоде).", tip: "Летучий голландец и капитаны приносят аксессуары денег и Симпатичный розовый кулон." },
    { id: "old-ones", icon: "assets/vanilla-sprites/3828.png", title: "Армия Старика", tags: ["i:OldOnesArmy"], summon: "Купи у Трактирщика Подставку Этернии и Кристалл Этернии, установи и активируй кристалл.", tip: "Защищай кристалл башнями Этернии. Три уровня сложности открываются по прогрессии (до механических, после них и после Голема)." },
    { id: "martian", title: "Марсианское безумие", tags: ["i:Martian"], summon: "После Голема найди Марсианский зонд высоко в космосе и позволь ему улететь.", tip: "Тарелка — местный мини-босс: спрячься под крышей от её лазера. Дроп: Марсианская тарелочка, Лазерный пулемёт и Ранец с вертушкой." },
    { id: "pumpkin-moon", icon: "assets/vanilla-sprites/1844.png", title: "Тыквенная луна", tags: ["i:PumpkinMoon"], summon: "Используй Тыквенный медальон ночью (тыквы + эктоплазма + святые слитки).", tip: "15 волн до рассвета. Строй арену с ловушками и хилками: на поздних волнах идут Тыквенный король и Мрачный жнец." },
    { id: "frost-moon", icon: "assets/vanilla-sprites/1958.png", title: "Морозная луна", tags: ["i:FrostMoon"], summon: "Используй Гадкий подарок ночью (шёлк + эктоплазма).", tip: "20 волн; Ледяная королева и Санта-танк на поздних. Одно из лучших испытаний DPS в игре." },
    { id: "pillars", icon: "assets/vanilla-sprites/3601.png", title: "Лунные столпы", tags: ["b:SolarPillar", "b:NebulaPillar", "b:VortexPillar", "b:StardustPillar"], summon: "Появляются автоматически после победы над Лунатиком-культистом — четыре столпа в разных частях мира.", tip: "Убей ~100 врагов у столпа, чтобы снять щит. После четырёх столпов через минуту приходит Лунный лорд." },
    { id: "acid-rain", icon: "assets/item-sprites/CausticTear.png", title: "Кислотный дождь · Calamity", tags: ["ce:AcidRain"], summon: "Начинается случайно после Глаза Ктулху; вторая стадия — после Водного бича, третья — после Полтергаста. Вручную — Каустическая слеза.", tip: "Идёт в Сернистом море. В финале третьей стадии появляется Старый герцог. Дроп: осколки серы и радиоактивные материалы." }
  ],
  biomes: [
    { id: "surface", title: "Поверхность и лес", tags: ["b:Surface"] },
    { id: "night", title: "Ночь на поверхности", tags: ["t:NightTime"], sub: "Выходят после заката: зомби, демонические глаза, а в хардмоде — оборотни и призраки." },
  { id: "underground", title: "Подземелье и пещеры", tags: ["b:TheUnderground", "b:Underground", "b:Caverns"] },
    { id: "snow", title: "Снега", tags: ["b:Snow", "b:UndergroundSnow"] },
    { id: "desert", title: "Пустыня", tags: ["b:Desert", "b:UndergroundDesert"] },
    { id: "jungle", title: "Джунгли", tags: ["b:Jungle", "b:UndergroundJungle"] },
    { id: "ocean", title: "Океан", tags: ["b:Ocean"] },
    { id: "sky", title: "Небо и космос", tags: ["b:Sky"] },
    { id: "corruption", title: "Порча", tags: ["b:TheCorruption", "b:UndergroundCorruption", "b:CorruptDesert", "b:CorruptIce", "b:CorruptUndergroundDesert"] },
    { id: "crimson", title: "Багрянец", tags: ["b:TheCrimson", "b:UndergroundCrimson", "b:CrimsonDesert", "b:CrimsonUndergroundDesert"] },
    { id: "hallow", title: "Святые земли", tags: ["b:TheHallow", "b:UndergroundHallow", "b:HallowDesert", "b:HallowUndergroundDesert"] },
    { id: "mushroom", title: "Грибные биомы", tags: ["b:SurfaceMushroom", "b:UndergroundMushroom"] },
    { id: "dungeon", title: "Данж", tags: ["b:TheDungeon"] },
    { id: "temple", title: "Храм джунглей", tags: ["b:TheTemple"] },
    { id: "underworld", title: "Преисподняя", tags: ["b:TheUnderworld"] },
    { id: "spider", title: "Паучье гнездо", tags: ["b:SpiderNest"] },
    { id: "granite", title: "Гранитная пещера", tags: ["b:Granite"] },
    { id: "marble", title: "Мраморная пещера", tags: ["b:Marble"] },
    { id: "meteor", title: "Метеорит", tags: ["b:Meteor"] },
    { id: "graveyard", title: "Кладбище", tags: ["b:Graveyard"] },
    { id: "sunken-sea", title: "Затонувшее море · Calamity", tags: ["cb:SunkenSea"] },
    { id: "sulphur-sea", title: "Сернистое море · Calamity", tags: ["cb:SulphurousSea"] },
    { id: "abyss", title: "Бездна · Calamity", tags: ["cb:Abyss"] },
    { id: "crags", title: "Серный кратер · Calamity", tags: ["cb:Crags"] },
    { id: "astral", title: "Астральное заражение · Calamity", tags: ["cb:Astral"] },
    { id: "plague", title: "Чумные джунгли · Calamity", tags: ["cb:Plague"] }
  ]
};
