(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("body") && $("#app");
  const searchInput = $("body") && $("#global-search");
  const searchPanel = $("body") && $("#search-panel");
  const routeTitle = $("body") && $("#route-title");
  const liveRegion = $("body") && $("#live-region");
  const menuButton = $("body") && $("#menu-btn");
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function focusableWithin(root) {
    if (!root) return [];
    return [...root.querySelectorAll(FOCUSABLE)].filter((element) => {
      if (element.closest("[hidden]") || element.getAttribute("aria-hidden") === "true") return false;
      const style = typeof getComputedStyle === "function" ? getComputedStyle(element) : null;
      return !style || (style.display !== "none" && style.visibility !== "hidden");
    });
  }
  function trapFocus(event, root) {
    if (event.key !== "Tab" || !root) return false;
    const focusable = focusableWithin(root);
    if (!focusable.length) {
      event.preventDefault();
      root.focus?.();
      return true;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !root.contains(active))) {
      event.preventDefault();
      last.focus();
      return true;
    }
    if (!event.shiftKey && (active === last || !root.contains(active))) {
      event.preventDefault();
      first.focus();
      return true;
    }
    return false;
  }
  function setElementInert(element, inert) {
    if (!element) return;
    if (inert) element.setAttribute("inert", "");
    else element.removeAttribute("inert");
  }
  if (searchPanel && searchInput && typeof MutationObserver !== "undefined") {
    const searchA11y = new MutationObserver(() => {
      searchInput.setAttribute("aria-expanded", String(!searchPanel.classList.contains("hidden")));
    });
    searchA11y.observe(searchPanel, { attributes: true, attributeFilter: ["class"] });
  }
  const ROUTE_RU = {
    home: "Главная",
    novice: "Путь новичка",
    wiki: "Справочник",
    bosses: "Боссы",
    items: "Предметы",
    useful: "Полезное",
    favorites: "Избранное",
    lex: "Словарь",
    crafts: "Полное дерево",
    biomes: "Биомы",
    mobs: "Мобы"
  };
  let lastView = "";
  let lastScrollKey = "";
  let routeAnimation = null;
  const routeScrollPositions = new Map();
  let restoreScrollOnNextRoute = false;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  // Ключ «содержания» страницы: если он изменился, возвращаемся наверх.
  // Параметры поиска и limit не трогают позицию прокрутки.
  function scrollKey(view, params) {
    if (view === "novice") return `novice:${params.q || 1}`;
    if (view === "wiki") return `wiki:${params.tab || "progress"}`;
    if (view === "bosses") return `bosses:${params.era || "all"}:${params.kind || "all"}:${params.status || "all"}`;
    if (view === "items") return `items:${params.mode || "catalog"}:${params.cls || "all"}:${params.kind || "all"}:${params.q || "all"}:${params.fav || ""}:${params.era || "all"}:${params.sort || "stage"}`;
    if (view === "useful") return `useful:${params.type || "all"}`;
    if (view === "lex") return `lex:${params.type || "all"}`;
    if (view === "crafts") return `crafts:${params.q || "all"}:${params.item || ""}:${params.plan || ""}`;
    if (view === "biomes") return `biomes:${params.danger || "all"}`;
    return view;
  }
  const SECTION_THEMES = {
    wiki:      { eyebrow: "Архив исследователя", mark: "✦", no: "I",   cover: "assets/headers/wiki.webp",      bg: "assets/themes/mushroom.webp",  accent: "#8ebbe0", fx: "dust" },
    bosses:    { eyebrow: "Бестиарий Каламити", mark: "☠", no: "II",  cover: "assets/headers/bosses.webp",    bg: "assets/themes/brimstone.webp", accent: "#f06c73", fx: "fire" },
    items:     { eyebrow: "Арсенал героя",      mark: "◆", no: "III",  cover: "assets/headers/items.webp",     bg: "assets/headers/items.webp",   accent: "#68d8c9", fx: "sparks", filter: "saturate(.78) contrast(1.05) brightness(.76)" },
    useful:    { eyebrow: "Набор исследователя", mark: "✚", no: "IV",   cover: "assets/headers/useful.webp",    bg: "assets/themes/forest.webp",   accent: "#7ed6a0", fx: "leaves" },
    favorites: { eyebrow: "Личная коллекция",    mark: "★", no: "V",    cover: "assets/headers/favorites.webp", bg: "assets/themes/dungeon.webp",  accent: "#efc66e", fx: "stars" },
    lex:       { eyebrow: "Язык этого мира",     mark: "A", no: "VI",   cover: "assets/headers/lex.webp",       bg: "assets/themes/sea.webp",      accent: "#c997e8", fx: "spores" },
    crafts:    { eyebrow: "Кузница и алхимия",   mark: "⚒", no: "VII",  cover: "assets/headers/crafts.webp",    bg: "assets/themes/hell.webp",     accent: "#eea85b", fx: "embers" },
    biomes:    { eyebrow: "Атлас мира",           mark: "⌖", no: "VIII", cover: "assets/headers/biomes.webp",    bg: "assets/themes/forest.webp",   accent: "#91d47f", fx: "leaves" },
    mobs:      { eyebrow: "Бестиарий мира",       mark: "⚔", no: "IX",   cover: "assets/headers/mobs.webp",    bg: "assets/themes/evil.webp",     accent: "#e0977a", fx: "dust" }
  };
  const KIND_RU = {
    weapon: "Оружие", armor: "Броня", acc: "Аксессуары", ammo: "Боеприпасы",
    tool: "Инструменты", mat: "Материалы", summon: "Призываемое", potion: "Расходники", misc: "Прочее"
  };
  const CLS_RU = { melee: "Воин", ranged: "Стрелок", mage: "Маг", summoner: "Призыватель", rogue: "Плут", all: "Все классы" };
  const ASSET_VERSION = "20260819-core100";
  const LOCAL_ASSET_RE = /^(?:\.\/)?assets\//;
  function releaseAsset(source) {
    const value = String(source || "");
    if (!LOCAL_ASSET_RE.test(value)) return value;
    const [withoutHash, hash = ""] = value.split("#", 2);
    const versioned = /(?:^|[?&])v=/.test(withoutHash)
      ? withoutHash.replace(/([?&])v=[^&]*/, `$1v=${ASSET_VERSION}`)
      : `${withoutHash}${withoutHash.includes("?") ? "&" : "?"}v=${ASSET_VERSION}`;
    return hash ? `${versioned}#${hash}` : versioned;
  }
  function versionLocalImages(root = document) {
    if (!root) return;
    const images = root.matches?.("img[src]") ? [root] : root.querySelectorAll?.("img[src]") || [];
    images.forEach((image) => {
      const source = image.getAttribute("src") || "";
      const versioned = releaseAsset(source);
      if (source !== versioned) image.setAttribute("src", versioned);
    });
  }
  // Every local image receives the release key, including content created by
  // tooltips and dialogs after the initial route render. Without this guard an
  // older cache-first service worker can keep serving a full animation sheet
  // even after the PNG on disk has been cropped to one genuine frame.
  if (typeof MutationObserver !== "undefined") {
    const localImageObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "attributes") versionLocalImages(record.target);
        else record.addedNodes.forEach((node) => {
          if (node.nodeType === 1) versionLocalImages(node);
        });
      });
    });
    localImageObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
    versionLocalImages(document);
  }
  const CATALOG_ITEM_TOTAL = 2535;
  const EMPTY_ITEM_INDEX = { modVersion: CODEX.version, groups: [], items: [], coverage: { items: CATALOG_ITEM_TOTAL } };
  let ITEM_INDEX = window.CALAMITY_ITEM_INDEX || EMPTY_ITEM_INDEX;
  let ITEM_GROUPS = new Map((ITEM_INDEX.groups || []).map(([id, label, kind, cls, count]) => [id, { id, label, kind, cls, count }]));
  let ITEM_RECIPE_YIELDS = new Map((ITEM_INDEX.recipeYields || []).map(([id, quantity]) => [String(id), Math.max(1, Number(quantity || 1))]));
  let BOSS_RELATION_DATA = window.CALAMITY_BOSS_RELATIONS || { bosses: [], types: [], items: [], vanilla: [], guides: [], crafts: [], coverage: {} };
  let USEFUL_DATA = window.CALAMITY_USEFUL_ITEMS || { groups: [], items: [] };
  let VANILLA_META_DATA = window.CALAMITY_VANILLA_META || { fields: [], categories: [], rows: [], coverage: {} };
  let vanillaMetaById = null;
  let bossRelationIndexes = null;
  const ITEM_KIND_MARK = { weapon: "⚔", armor: "◈", acc: "◇", ammo: "➶", tool: "⚒", mat: "◆", summon: "✦", potion: "⚗", misc: "▦" };
  const CATALOG_PAGE_SIZE = 96;
  const GUIDE_PAGE_SIZE = 48;
  let indexedItemsCache = null;
  let detailedNameCache = null;
  let catalogDataPromise = null;
  let searchWarmupScheduled = false;

  const catalogDataReady = () => Boolean(
    window.CALAMITY_ITEM_INDEX?.items?.length
    && window.CALAMITY_BOSS_RELATIONS?.items?.length
    && window.CALAMITY_USEFUL_ITEMS?.items?.length
    && window.CALAMITY_VANILLA_TREE_INDEX?.items?.length
    && window.CALAMITY_VANILLA_META?.rows?.length
    && window.CALAMITY_VANILLA_RU?.names?.length
    && window.CALAMITY_NPC_SOURCES
    && window.CALAMITY_RU_NAMES
  );
  const catalogItemCount = () => Number(
    ITEM_INDEX.items?.length || ITEM_INDEX.coverage?.items || CATALOG_ITEM_TOTAL
  );

  function hydrateCatalogData() {
    if (!catalogDataReady()) return false;
    ITEM_INDEX = window.CALAMITY_ITEM_INDEX;
    ITEM_GROUPS = new Map((ITEM_INDEX.groups || []).map(([id, label, kind, cls, count]) => [id, { id, label, kind, cls, count }]));
    ITEM_RECIPE_YIELDS = new Map((ITEM_INDEX.recipeYields || []).map(([id, quantity]) => [String(id), Math.max(1, Number(quantity || 1))]));
    BOSS_RELATION_DATA = window.CALAMITY_BOSS_RELATIONS;
    USEFUL_DATA = window.CALAMITY_USEFUL_ITEMS;
    bossRelationIndexes = null;
    RU_NAMES = window.CALAMITY_RU_NAMES;
    VANILLA_RU_BY_ID = window.CALAMITY_VANILLA_RU.names || window.CALAMITY_VANILLA_RU.byId || [];
    VANILLA_RU_TOOLTIPS_BY_ID = window.CALAMITY_VANILLA_RU.tooltips || [];
    VANILLA_META_DATA = window.CALAMITY_VANILLA_META;
    vanillaMetaById = null;
    VANILLA_TREE_INDEX = window.CALAMITY_VANILLA_TREE_INDEX;
    VANILLA_COMPACT = VANILLA_TREE_INDEX.format === 2;
    VANILLA_MISSING_SPRITES = new Set(VANILLA_TREE_INDEX.coverage?.missingSpriteIds || []);
    NPC_SOURCES = window.CALAMITY_NPC_SOURCES || {};
    VANILLA_DROPS = window.CALAMITY_VANILLA_DROPS || { npc: {} };
    NPC_DATA = window.CALAMITY_NPCS || {};
    NPC_RU_EXTRA = window.CALAMITY_NPC_RU || {};
    NPC_BESTIARY_RU = window.CALAMITY_NPC_BESTIARY_RU || {};

    indexedItemsCache = null;
    detailedNameCache = null;
    catalogArtCache = null;
    artNameIndex = null;
    mobIndexCache = null;
    mobDropsCache = null;
    mobByNameCache = null;
    mobMentionPatternCache = null;
    mobByGameIdCache = null;
    vanillaItemSourcesCache = null;
    itemByIdCache = null;
    recipeIndex = null;
    visualRecipeIndex = null;
    recipeUseCounts = null;
    craftTreeChoicesCache = null;
    craftTreeChoiceLookupCache = null;
    globalCatalogSearchRows = null;
    globalVanillaSearchRows = null;
    catalogTooltipsApplied = false;
    recipeCycleCuts.clear();
    NPC_RU.clear();
    [CATALOG_BY_NORM, CATALOG_BY_ID, GUIDE_BY_NORM, CATALOG_LEX,
      VANILLA_BY_ID, VANILLA_BY_NAME, VANILLA_RU_BY_NAME,
      VANILLA_RECIPE_OPTIONS_BY_ID, VANILLA_RECIPE_EDGES,
      VANILLA_RECIPE_BY_ID, VANILLA_RECIPE_CUT_IDS, VANILLA_STATIONS]
      .forEach((index) => index.clear());
    vanillaItemsReady = false;
    vanillaRecipesReady = false;
    delete document.documentElement.dataset.vanillaItems;
    delete document.documentElement.dataset.vanillaRecipes;
    searchWarmupScheduled = false;
    scheduleGlobalSearchWarmup();
    return true;
  }

  function ensureCatalogData() {
    if (catalogDataReady()) {
      if (ITEM_INDEX !== window.CALAMITY_ITEM_INDEX) hydrateCatalogData();
      return Promise.resolve(true);
    }
    if (catalogDataPromise) return catalogDataPromise;
    catalogDataPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = new URL(`js/codex-data.min.js?v=${ASSET_VERSION}`, document.baseURI).href;
      script.async = true;
      script.dataset.codexCatalog = "";
      script.onload = () => {
        const ready = hydrateCatalogData();
        if (!ready) catalogDataPromise = null;
        resolve(ready);
      };
      script.onerror = () => {
        script.remove();
        catalogDataPromise = null;
        resolve(false);
      };
      document.head.appendChild(script);
    });
    return catalogDataPromise;
  }

  let catalogPrefetchLink = null;
  function prefetchCatalogData() {
    if (catalogDataReady() || catalogPrefetchLink || navigator.onLine === false) return false;
    const connection = navigator.connection;
    if (connection?.saveData || /(?:^|-)2g$/i.test(connection?.effectiveType || "")) return false;
    if (document.body.classList.contains("lite")) return false;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.as = "script";
    link.href = new URL(`js/codex-data.min.js?v=${ASSET_VERSION}`, document.baseURI).href;
    link.dataset.codexPrefetch = "";
    document.head.appendChild(link);
    catalogPrefetchLink = link;
    return true;
  }

  function indexedItems() {
    if (indexedItemsCache) return indexedItemsCache;
    const compact = ITEM_INDEX.format === 2;
    indexedItemsCache = (ITEM_INDEX.items || []).map((row) => {
      const [name, groupId, id, tooltip, image, obtain, stage, description] = compact
        ? [row[0], row[1], row[2], "", 1, row[3], row[4], row[5]]
        : row;
      const group = ITEM_GROUPS.get(groupId) || { label: "Предмет", kind: "misc", cls: "all" };
      return {
        name, id, groupId, group: group.label, kind: group.kind, cls: group.cls,
        tooltip: tooltip || "", description: description || "", image: Boolean(image),
        obtain: obtain || "", stage: Number(stage || 0), recipeYield: ITEM_RECIPE_YIELDS.get(String(id)) || 1, searchBlob: ""
      };
    });
    applyCatalogTooltips();
    return indexedItemsCache;
  }

  let catalogTooltipPromise = null;
  let catalogTooltipsApplied = false;
  function applyCatalogTooltips() {
    const payload = window.CALAMITY_CATALOG_TOOLTIPS;
    if (!payload || catalogTooltipsApplied || !indexedItemsCache) return false;
    if (Array.isArray(payload.tooltips)) {
      payload.tooltips.forEach((tooltip, index) => {
        if (tooltip && indexedItemsCache[index]) indexedItemsCache[index].tooltip = tooltip;
      });
    } else {
      (payload.rows || []).forEach(([index, tooltip]) => {
        if (indexedItemsCache[index]) indexedItemsCache[index].tooltip = tooltip || "";
      });
    }
    indexedItemsCache.forEach((item) => { item.searchBlob = ""; });
    catalogTooltipsApplied = true;
    globalCatalogSearchRows = null;
    return true;
  }
  function loadCatalogTooltips() {
    if (catalogTooltipsApplied || applyCatalogTooltips()) return Promise.resolve(false);
    if (catalogTooltipPromise) return catalogTooltipPromise;
    catalogTooltipPromise = new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = new URL(`js/catalog-tooltips.js?v=${ASSET_VERSION}`, document.baseURI).href;
      script.async = true;
      script.onload = () => resolve(applyCatalogTooltips());
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
    return catalogTooltipPromise;
  }

  function detailedNameMap() {
    if (detailedNameCache) return detailedNameCache;
    detailedNameCache = new Map();
    (CODEX.items || []).forEach((item) => {
      const lex = exactLexLookup(item.name);
      [item.name, item.nameRu, lex && lex.en, lex && lex.ru].filter(Boolean).forEach((name) => {
        const key = String(name).trim().toLocaleLowerCase("ru");
        if (key && !detailedNameCache.has(key)) detailedNameCache.set(key, item);
      });
    });
    return detailedNameCache;
  }

  const T = (s) => (CODEX.linkify ? CODEX.linkify(s) : s);
  const RU = (s) => (CODEX.ru ? CODEX.ru(s) : s);
  const loc = (s) => {
    if (s == null) return "";
    let t = String(s);
    if (CODEX._linkers) {
      CODEX._linkers.forEach(({ re, id }) => {
        const info = CODEX.lex && CODEX.lex[id];
        if (!info) return;
        t = t.replace(re, info.ru);
      });
    }
    return CODEX.linkify ? CODEX.linkify(t) : t;
  };
  function sectionFacts(view) {
    if (view === "wiki") return [[CODEX.quests.length, "глав пути"], [5, "разделов"]];
    if (view === "bosses") return [[CODEX.bosses.length, "основных"], [CODEX.minis.length, "мини-боссов"]];
    if (view === "items") return [[indexedItems().length || CODEX.items.length, "в полном индексе"], [CODEX.items.length, "с советами"]];
    if (view === "useful") return [[USEFUL_DATA.items.length, "практичных предметов"], [USEFUL_DATA.groups.length, "категорий"]];
    if (view === "favorites") {
      const saved = getFavorites();
      return [[saved.item.size + saved.boss.size + saved.craft.size, "в рюкзаке"], [3, "коллекции"]];
    }
    if (view === "lex") return [[Object.keys(CODEX.lex || {}).length, "терминов"], ["RU / EN", "названия"]];
    if (view === "crafts") return [[getRecipeIndex().size, "рецептов в дереве"], [VANILLA_TREE_INDEX.items.length, "ванильных предметов"]];
    if (view === "biomes") return [[CODEX.biomes.length, "биомов"], [4, "уровня риска"]];
    if (view === "mobs") {
      const idx = mobIndex();
      return [[idx.mobs.length, "существ"], [idx.mobs.filter((m) => m.src === "c").length, "из Calamity"]];
    }
    return [];
  }
  const mast = (title, lead) => {
    const view = document.body.dataset.view || "wiki";
    const theme = SECTION_THEMES[view] || SECTION_THEMES.wiki;
    const cover = new URL(theme.cover, document.baseURI).href;
    const facts = sectionFacts(view);
    return `
      <header class="page-head panel" style="--page-cover:url('${cover}');--page-accent:${theme.accent}">
        <div class="ph-screen" aria-hidden="true"><div class="art"></div></div>
        <div class="ph-copy">
          <span class="ph-eyebrow">${theme.eyebrow}</span>
          <h1>${esc(title)}</h1>
          <p>${esc(lead)}</p>
          <div class="page-head-facts" aria-label="Краткая сводка">
            ${facts.map(([value, label]) => `<span><b>${esc(value)}</b><em>${esc(label)}</em></span>`).join("")}
          </div>
        </div>
        <div class="page-head-sigil" aria-hidden="true"><span>${theme.mark}</span><i>${theme.no}</i></div>
      </header>`;
  };
  const shelf = (title, count, inner, open = false) => `
    <details class="shelf"${open ? " open" : ""}>
      <summary>
        <span class="shelf-plus" aria-hidden="true"></span>
        <span class="shelf-t">${title}</span>
        ${count != null && count !== "" ? `<span class="shelf-n">${count}</span>` : ""}
      </summary>
      <div class="shelf-body">${inner}</div>
    </details>`;

  const tt = document.getElementById("tt");
  const fillIngTT = (info) => {
    if (!tt || !info) return;
    const ingIcons = (info.recipe ? info.recipe.ings : []).map((ing) => {
      const ingredientKey = ing.key || ing.name;
      const child = ingredientInfo(ingredientKey);
      const hit = child.art || child.remoteArt || resolveArt(ing.name);
      const remote = child.remoteArt && !child.art ? " remote" : "";
      return hit
        ? `<img class="${remote.trim()}" src="${escAttr(hit)}" alt="" loading="lazy" decoding="async" />`
        : `<i aria-hidden="true">${esc(ing.count || "?")}</i>`;
    }).join("");
    const craftLine = info.recipe
      ? `${info.recipe.ings.map((i) => (i.count ? `${esc(i.count)} × ${esc(ingredientInfo(i.key || i.name).ru)}` : esc(ingredientInfo(i.key || i.name).ru))).join(" + ")}${info.recipe.station ? ` · ${esc(craftStationInline(info.recipe.station))}` : ""}`
      : "";
    const obtainLine = (info.recipe && !/^Скрафтить/i.test(info.obtain || "")) ? info.obtain : "";
    tt.innerHTML = `
      <div class="tt-type">Ингредиент · ${esc(KIND_RU[info.kind] || "Предмет")}</div>
      <div class="tt-ru">${esc(info.ru)}</div>
      ${info.en ? `<div class="tt-en">в игре: ${esc(info.en)}</div>` : ""}
      ${info.desc ? `<p>${esc(ruText(info.desc))}</p>` : ""}
      ${obtainLine ? `<p><b>Где взять</b> — ${esc(ruText(obtainLine))}</p>` : ""}
      ${craftLine
        ? `<p><b>Рецепт</b> — ${craftLine}</p><div class="tt-ings">${ingIcons}</div>`
        : `<p><b>Получение</b> — ${esc(ruText(info.obtain))}</p>`}
      <p class="tt-hint">Клик по ингредиенту — дерево крафта</p>
    `;
  };
  const fillTT = (info) => {
    if (!tt || !info) return;
    tt.innerHTML = `
      <div class="tt-type">${info.type}</div>
      <div class="tt-ru">${info.ru}</div>
      <div class="tt-en">${info.en}</div>
      <p>${ruText(info.desc)}</p>
      ${info.where ? `<p><b>Где взять / где это</b> — ${ruText(info.where)}</p>` : ""}
      ${info.craft ? `<p><b>Крафт</b> — ${ruText(info.craft)}</p>` : ""}
      ${info.used ? `<p><b>Зачем</b> — ${ruText(info.used)}</p>` : ""}
    `;
  };
  const placeTT = (el) => {
    const r = el.getBoundingClientRect();
    const tw = tt.offsetWidth || 360;
    const th = tt.offsetHeight || 180;
    let x = r.left;
    let y = r.bottom + 8;
    if (x + tw > innerWidth - 8) x = innerWidth - tw - 8;
    if (x < 8) x = 8;
    if (y + th > innerHeight - 8) y = r.top - th - 8;
    if (y < 8) y = 8;
    tt.style.left = x + "px";
    tt.style.top = y + "px";
  };
  /* ---------- богатая карточка-подсказка поверх страницы ---------- */
  const tipCard = document.getElementById("tip-card");
  let tipCardAnchor = null;
  let tipCardHideTimer = 0;
  let tipCardPinned = false;

  function hideTipCard(options = {}) {
    if (!tipCard) return;
    const { restoreFocus = false } = options;
    const restore = restoreFocus && tipCardPinned ? tipCardAnchor : null;
    clearTimeout(tipCardHideTimer);
    tipCard.hidden = true;
    tipCard.classList.remove("boss-detail-card");
    delete tipCard.dataset.encounterKind;
    delete tipCard.dataset.encounterEra;
    tipCard.setAttribute("aria-modal", "false");
    tipCardAnchor = null;
    tipCardPinned = false;
    if (restore) requestAnimationFrame(() => restore.focus?.({ preventScroll: true }));
  }
  function pinTipCard() {
    if (!tipCard || tipCard.hidden) return;
    tipCardPinned = true;
    tipCard.querySelector("[data-tip-close]")?.focus();
  }
  function hideTipCardSoon() {
    if (!tipCard || tipCardPinned) return;
    clearTimeout(tipCardHideTimer);
    hideTipCard();
  }
  function placeTipCard(el) {
    if (!tipCard || !el) return;
    const r = el.getBoundingClientRect();
    const bossDetail = tipCard.classList.contains("boss-detail-card");
    const w = Math.min(bossDetail ? 780 : 640, innerWidth - 16);
    tipCard.style.width = w + "px";
    const maxH = Math.min(bossDetail ? 760 : 640, innerHeight - 16);
    tipCard.style.maxHeight = maxH + "px";
    const h = Math.min(tipCard.offsetHeight || 480, maxH);
    let x = Math.min(r.left, innerWidth - w - 8);
    if (x < 8) x = 8;
    // Карточка касается элемента-якоря без мёртвого зазора: курсор может
    // перейти с предмета прямо на карточку, не закрывая её между пикселями.
    let y = r.bottom;
    if (y + h > innerHeight - 8) {
      y = r.top - h;
      if (y < 8) y = 8;
    }
    tipCard.style.left = x + "px";
    tipCard.style.top = y + "px";
  }
  function renderTipCard(name) {
    if (!tipCard) return;
    tipCard.classList.remove("boss-detail-card");
    delete tipCard.dataset.encounterKind;
    delete tipCard.dataset.encounterEra;
    tipCard.setAttribute("aria-modal", "false");
    tipCard.setAttribute("aria-label", "Сведения об объекте");
    const info = ingredientInfo(name);
    const lex = exactLexLookup(name);
    const lexKey = lex ? (lex.en || lex.ru) : "";
    const art = BOSS_ART_BY_ID[(lex && lex.id) || ""] || LEX_ART[lexKey] || info.art;
    const artNote = LEX_ART_NOTE[lexKey] || "";
    const recipe = visualRecipeFor(name);
    const obtainRaw = (info.obtain || (lex && lex.where) || "").replace(/\s*[·•].*$/, "").trim();
    const genericObtain = isGenericObtainText(obtainRaw);
    const obtain = recipe && /^Скрафтить/i.test(obtainRaw)
      ? ""
      : genericObtain
        ? "Локальный индекс не содержит подтверждённого конкретного источника. Кодекс проверяет официальную wiki ниже вместо того, чтобы угадывать способ получения."
        : obtainRaw;
    const used = info.used || (lex && lex.used) || "";
    const when = info.when || "";
    const type = info.typeLabel || (lex && lex.type) || KIND_RU[info.kind] || "Предмет";
    const desc = ruText(info.desc || (lex && lex.desc) || "");
    const catItem = catalogByName(name);
    const tipSources = npcSourceForItem({ id: catItem ? catItem.id : "" });
    const hasLocalVanillaDrops = Boolean(info.vanilla && vanillaItemSources(info.vanilla.id).length);
    const wikiProfile = !recipe && !hasLocalVanillaDrops ? officialWikiProfile(info) : null;
    tipCard.innerHTML = `
      <div class="tip-card-head">
        <span class="slot tip-card-slot">${art ? `<img class="item-art" src="${escAttr(art)}" alt="" loading="lazy" decoding="async" data-kind="${escAttr(info.kind || "mat")}">` : unavailableArt(info.kind)}</span>
        <span class="tip-card-title">
          <small>${esc(type)}</small>
          <b>${esc(info.ru)}</b>
          ${info.en ? `<i>в игре: ${esc(info.en)}</i>` : ""}
          ${artNote ? `<em>показано: ${esc(artNote)}</em>` : ""}
        </span>
        <button class="tip-card-close" type="button" data-tip-close aria-label="Закрыть карточку">✕</button>
      </div>
      <div class="tip-card-body">
        ${desc ? `<p class="tip-card-desc">${esc(desc)}</p>` : ""}
        ${info.semanticStats?.length ? `<div class="vanilla-semantic-stats">${info.semanticStats.map((stat) => `<span>${esc(stat)}</span>`).join("")}</div>` : ""}
        <div class="tip-card-facts">
          ${(obtain || tipSources) ? `<div class="fact source-fact"><span>Где взять</span>${npcSourceLines(tipSources) ? `<div class="src-list">${npcSourceLines(tipSources)}</div>` : `<p>${esc(obtain)}</p>`}</div>` : ""}
          ${used ? `<div class="fact"><span>Зачем</span><p>${esc(used)}</p></div>` : ""}
          ${when ? `<div class="fact"><span>Когда</span><p>${esc(when)}</p></div>` : ""}
          ${bossRelationsHTML(info.bossLinks)}
        </div>
        ${wikiProfile ? `<section class="wiki-source-live acquisition-wiki" data-wiki-live><small>${esc(wikiProfile.label)} · проверяем источник…</small><p>Ищем конкретный способ получения, противника, структуру, магазин или условие появления.</p><a href="${escAttr(wikiProfile.url)}" target="_blank" rel="noopener noreferrer">Открыть официальную страницу ↗</a></section>` : ""}
        <div class="tip-card-actions">
          ${recipe ? `${info.recipe ? fullTreeLink(name) : ""}<button class="recipe-btn" type="button" data-recipe="${escAttr(name)}"><span aria-hidden="true">⚒</span> Рецепт</button>${craftPlanActionButton(name)}` : ""}
          ${info.catName ? `<a class="craft-catalog-link" href="#/items?s=${encodeURIComponent(info.catName)}">В каталоге ↗</a>` : ""}
          ${lex ? `<a class="craft-catalog-link" href="#/lex?q=${encodeURIComponent(lex.ru)}">В словаре ↗</a>` : ""}
        </div>
      </div>`;
    bindSprites(tipCard);
    linkifyMobMentions(tipCard);
    if (wikiProfile) enrichWikiSource(tipCard, info);
  }
  function routeBossArt(boss) {
    if (!boss) return "";
    if (boss.art) return boss.art;
    const raw = String(boss.en || boss.name || "").toLocaleLowerCase("en");
    const key = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return BOSS_ART_BY_ID[key]
      || BOSS_ART_BY_ID[key.replace(/^the-/, "")]
      || BOSS_ART[boss.n]
      || resolveArt(boss.en || boss.name)
      || resolveArt(boss.name || boss.en)
      || "";
  }
  function renderNpcCard(npcName) {
    if (!tipCard) return;
    const info = NPC_DATA[npcName] || {};
    const mob = mobByName(npcName);
    const lex = exactLexLookup(npcName);
    const boss = bossRecordForName(npcName);
    const mini = boss ? null : miniRecordForName(npcName);
    const encounter = boss || mini;
    const genericRu = npcRuName(npcName);
    const ru = boss ? boss.name : mini ? mini.name : (mob?.ru && /[А-Яа-яЁё]/.test(mob.ru) ? mob.ru : (genericRu !== npcName ? genericRu : (mob?.ru || genericRu)));
    const type = boss ? (boss.kind === "hidden" ? "Скрытый босс" : `Босс · ${boss.type || "Каламити"}`) : mini ? "Мини-босс · Каламити" : mob ? `${mob.kind === "critter" ? "Мирный зверёк" : mob.kind === "boss" ? "Босс" : "Противник"} · ${mob.src === "c" ? "Каламити" : "Terraria"}` : "Противник";
    const eraLabel = encounter ? ({ pre: "Прехардмод", hard: "Хардмод", post: "После Луны", end: "Финал" })[encounter.era] || encounter.era : "";
    const encounterId = encounter ? String(encounter.id || encounter.n) : "";
    const defeated = encounterId ? getDefeatedBosses().has(encounterId) : false;
    const danger = encounter ? (encounter.kind === "mini" ? ({ pre: 30, hard: 55, post: 76, end: 90 }[encounter.era] || 45) : ({ pre: 22, hard: 46, post: 72, end: 100 }[encounter.era] || 30)) : 0;
    // Boss/mini-boss cards must prefer the explicit audited encounter art.
    // Generic NPC lookup may point to another animation frame or ordinary clam.
    const localArt = routeBossArt(boss)
      || (mini && (mini.art || BOSS_ART_BY_ID[mini.id]))
      || npcArtForName(npcName)
      || (lex && (LEX_ART[lex.en] || BOSS_ART_BY_ID[lex.id]))
      || "";
    const artHTML = localArt
      ? `<img class="item-art" src="${escAttr(releaseAsset(localArt))}" alt="" loading="lazy" decoding="async" data-kind="boss" />`
      : `<b class="npc-mono" aria-hidden="true">${escAttr(String(ru || npcName).trim().charAt(0).toUpperCase())}</b>`;
    const desc = ruText((encounter && encounter.tip) || NPC_BESTIARY_RU[npcName] || (mob && mob.desc) || ((lex && lex.desc) || ""));
    const descFooter = encounter ? "совет кодекса" : (mob && mob.src === "v" && mob.desc && !NPC_BESTIARY_RU[npcName]) ? "бестиарий игры · официальная локализация" : "бестиарий игры · перевод кодекса";
    const mobStats = mob && (mob.hp !== null || mob.dmg !== null || mob.def !== null)
      ? `<section class="mob-detail-overview" aria-label="Характеристики существа">${mob.hp !== null ? `<span><small>Здоровье</small><b>${mob.hp.toLocaleString("ru-RU")}</b></span>` : ""}${mob.dmg !== null ? `<span><small>Урон</small><b>${mob.dmg}</b></span>` : ""}${mob.def !== null ? `<span><small>Защита</small><b>${mob.def}</b></span>` : ""}</section>`
      : "";
    const facts = [];
    if (boss) {
      if (boss.where) facts.push(`<div class="fact"><span>Где бой</span><p>${esc(bossFactText(boss, "where"))}</p></div>`);
      if (boss.when) facts.push(`<div class="fact"><span>Когда идти</span><p>${esc(bossFactText(boss, "when"))}</p></div>`);
      if (boss.summon) facts.push(`<div class="fact"><span>Как призвать</span><p>${esc(bossFactText(boss, "summon"))}</p></div>`);
      if (boss.drops) facts.push(`<div class="fact"><span>Что даст победа</span><p>${esc(bossFactText(boss, "drops"))}</p></div>`);
    } else if (mini) {
      if (mini.where) facts.push(`<div class="fact"><span>Где бой</span><p>${esc(miniBossFactText(mini, "where"))}</p></div>`);
      if (mini.when) facts.push(`<div class="fact"><span>Когда идти</span><p>${esc(miniBossFactText(mini, "when"))}</p></div>`);
      if (mini.summon) facts.push(`<div class="fact"><span>Как встретить</span><p>${esc(factSentence(ruText(mini.summon)))}</p></div>`);
      if (mini.drops) facts.push(`<div class="fact"><span>Что даст победа</span><p>${esc(miniBossFactText(mini, "drops"))}</p></div>`);
    } else {
      const npcWhere = npcWhereForName(npcName);
      if (npcWhere) facts.push(`<div class="fact"><span>Где</span><p>${esc(npcWhere)}</p></div>`);
      if (mob && mob.tags.length) facts.push(`<div class="fact"><span>Биомы и время</span><p>${esc(mob.tags.map(mobTagLabel).join(" · "))}</p></div>`);
      if (info.time) facts.push(`<div class="fact"><span>Когда</span><p>${esc(ruText(info.time))}</p></div>`);
      if (info.req) facts.push(`<div class="fact"><span>Требования</span><p>${esc(ruText(info.req))}</p></div>`);
      if (info.source) facts.push(`<div class="fact"><span>Как встретить</span><p>${esc(ruText(info.source))}</p></div>`);
    }
    const drops = [];
    Object.keys(NPC_SOURCES).forEach((itemKey) => {
      const src = NPC_SOURCES[itemKey];
      (src.npcs || []).forEach((d) => {
        if (d.npc === npcName && !drops.some((x) => x.id === itemKey)) {
          drops.push({ id: itemKey, name: itemById(itemKey) ? itemById(itemKey).name : itemKey, chance: d.chance, qty: d.qty });
        }
      });
    });
    // Ванильные лут-таблицы: предметы, падающие с этого существа
    const mobGameId = mob && mob.src === "v" ? Number(mob.id.slice(1)) : null;
    const vanillaDropRows = mobGameId !== null
      ? (VANILLA_DROPS.npc[String(mobGameId)] || (mobGameId < 0 ? VANILLA_DROPS.npc["1"] : null) || [])
      : [];
    const vanillaDropChips = vanillaDropRows.map(([itemId, den, min, max, flags]) => {
      const nameEntry = (VANILLA_DROPS.names || {})[String(itemId)] || (VANILLA_DROPS.names || {})[itemId];
      const ruName = (nameEntry && nameEntry[0]) || VANILLA_RU_BY_ID[String(itemId)] || `Предмет №${itemId}`;
      const label = vanillaDropChanceLabel({ den, min, max, flags });
      const artOk = nameEntry ? Boolean(nameEntry[1]) : !VANILLA_MISSING_SPRITES.has(Number(itemId));
      const known = Boolean(VANILLA_RU_BY_ID[String(itemId)]);
      const inner = `${artOk ? `<img class="ings-icon" src="assets/vanilla-sprites/${itemId}.png" alt="" loading="lazy" decoding="async" />` : ""}<em>${esc(label)}</em><b>${esc(ruName)}</b>`;
      return known
        ? `<a class="craft-chip npc-drop-chip" href="#/crafts?item=vanilla%3A${itemId}" aria-label="Открыть предмет: ${escAttr(ruName)}" title="Открыть в полном дереве">${inner}</a>`
        : `<span class="craft-chip npc-drop-chip is-new" title="Новинка Terraria 1.4.5 — полная карточка появится после обновления каталога предметов">${inner}<i class="new-mark">1.4.5</i></span>`;
    }).join("");
    const dropsHTML = drops.length
      ? `<div class="fact npc-drops-fact"><span>Что дропает</span><div class="craft-chips">${drops.map((d) => `<span class="craft-chip npc-drop-chip" data-ing="${escAttr(d.name)}" role="button" tabindex="0" aria-label="Открыть предмет: ${escAttr(itemRuById(d.id))}" title="Открыть предмет"><img class="ings-icon" src="assets/item-sprites/${encodeURIComponent(d.id)}.png" alt="" loading="lazy" decoding="async" /><em>${esc(d.chance || "")}${d.qty ? ` · ${esc(d.qty)}` : ""}</em><b>${esc(itemRuById(d.id))}</b></span>`).join("")}</div></div>`
      : vanillaDropChips
        ? `<div class="fact npc-drops-fact"><span>Что дропает</span><div class="craft-chips">${vanillaDropChips}</div></div>`
        : "";
    tipCard.classList.toggle("boss-detail-card", Boolean(encounter));
    tipCard.dataset.encounterKind = encounter?.kind || "";
    tipCard.dataset.encounterEra = encounter?.era || "";
    tipCard.setAttribute("aria-modal", String(Boolean(encounter)));
    tipCard.setAttribute("aria-label", encounter ? `Полные сведения о боссе: ${ru}` : `Сведения о противнике: ${ru}`);
    tipCard.innerHTML = `
      <div class="tip-card-head">
        <span class="slot tip-card-slot npc-slot"${localArt ? "" : ` title="Спрайт — на официальной wiki"`}>${artHTML}</span>
        <span class="tip-card-title">
          <small>${esc(type)}${eraLabel ? ` · ${esc(eraLabel)}` : ""}</small>
          <b>${esc(ru)}</b>
          <i>в игре: ${esc(encounter?.en || npcName)}</i>
          ${encounter ? `<em class="boss-detail-state ${defeated ? "done" : ""}">${defeated ? "✓ Победа записана" : "○ Ещё не побеждён"}</em>` : ""}
        </span>
        <button class="tip-card-close" type="button" data-tip-close aria-label="Закрыть карточку">✕</button>
      </div>
      <div class="tip-card-body">
        ${encounter ? `<section class="boss-detail-overview" aria-label="Сводка босса"><span><small>Этап</small><b>${esc(eraLabel)}</b></span><span><small>Глава пути</small><b>${encounter.q || "—"}</b></span><span><small>Опасность</small><b>${danger}%</b></span></section><div class="boss-detail-danger"><i style="width:${danger}%"></i></div>` : ""}
        ${mobStats}
        ${desc ? `<blockquote class="npc-lore">${esc(desc)}<footer>${descFooter}</footer></blockquote>` : ""}
        <div class="tip-card-facts">${facts.join("")}${dropsHTML}</div>
        <div class="tip-card-actions boss-detail-actions">
          ${encounter ? `<button class="boss-defeat-btn ${defeated ? "done" : ""}" type="button" data-boss-defeated="${escAttr(encounterId)}" aria-pressed="${defeated}"><span aria-hidden="true">${defeated ? "✓" : "○"}</span>${defeated ? "Победа записана" : "Отметить победу"}</button><a class="craft-catalog-link" href="#/bosses?q=${encodeURIComponent(encounter.name)}">Полная карточка босса →</a>` : ""}
          ${encounter?.q ? `<a class="craft-catalog-link" href="#/novice?q=${encounter.q}">Открыть главу ${encounter.q} →</a>` : ""}
          ${!encounter && mob ? `<a class="craft-catalog-link" href="#/mobs?q=${encodeURIComponent(mob.ru)}">Открыть в бестиарии мобов →</a>` : ""}
          <a class="craft-catalog-link" href="${!encounter && mob && mob.src === "v" ? `https://terraria.wiki.gg/ru/wiki/Special:Search?search=${encodeURIComponent(npcName)}` : `https://calamitymod.wiki.gg/wiki/Special:Search?search=${encodeURIComponent(encounter?.en || npcName)}`}" target="_blank" rel="noopener noreferrer">Официальная wiki ↗</a>
        </div>
      </div>`;
    bindSprites(tipCard);
    linkifyMobMentions(tipCard);
  }
  function showCatalogTipLoading(anchorEl, pin, label) {
    if (!tipCard) return;
    clearTimeout(tipCardHideTimer);
    tipCardPinned = !!pin;
    tipCardAnchor = anchorEl;
    tipCard.innerHTML = `<div class="tip-card-loading"><b>◆</b><span><strong>${esc(label)}</strong><small>Подключаем рецепты и источники…</small></span></div>`;
    tipCard.hidden = false;
    requestAnimationFrame(() => placeTipCard(anchorEl));
  }
  function finishCatalogTipLoad(anchorEl, render) {
    ensureCatalogData().then((ready) => {
      if (!tipCard || tipCardAnchor !== anchorEl || tipCard.hidden) return;
      if (!ready) {
        tipCard.innerHTML = '<div class="tip-card-loading failed"><b>!</b><span><strong>Данные недоступны</strong><small>Проверь соединение и попробуй снова.</small></span></div>';
        placeTipCard(anchorEl);
        return;
      }
      render();
      placeTipCard(anchorEl);
      if (tipCardPinned) tipCard.querySelector("[data-tip-close]")?.focus();
      SND.play("blip");
    });
  }
  function showNpcCard(npcName, anchorEl, pin = false) {
    if (!tipCard) return;
    if (!catalogDataReady()) {
      showCatalogTipLoading(anchorEl, pin, "Загружаем карточку противника");
      finishCatalogTipLoad(anchorEl, () => renderNpcCard(npcName));
      return;
    }
    clearTimeout(tipCardHideTimer);
    tipCardPinned = !!pin;
    renderNpcCard(npcName);
    tipCardAnchor = anchorEl;
    tipCard.hidden = false;
    requestAnimationFrame(() => {
      placeTipCard(anchorEl);
      if (pin) tipCard.querySelector("[data-tip-close]")?.focus();
    });
    SND.play("blip");
  }
  function showTipCard(name, anchorEl, pin = false) {
    if (!tipCard) return;
    if (!catalogDataReady()) {
      showCatalogTipLoading(anchorEl, pin, "Загружаем карточку предмета");
      finishCatalogTipLoad(anchorEl, () => renderTipCard(name));
      return;
    }
    clearTimeout(tipCardHideTimer);
    tipCardPinned = !!pin;
    renderTipCard(name);
    tipCardAnchor = anchorEl;
    tipCard.hidden = false;
    requestAnimationFrame(() => {
      placeTipCard(anchorEl);
      if (pin) tipCard.querySelector("[data-tip-close]")?.focus();
    });
    SND.play("blip");
  }
  if (tipCard) {
    tipCard.addEventListener("mouseenter", () => clearTimeout(tipCardHideTimer));
    tipCard.addEventListener("mouseleave", hideTipCardSoon);
    tipCard.addEventListener("click", (e) => {
      if (e.target.closest("[data-tip-close]")) { hideTipCard({ restoreFocus: true }); return; }
      const t = e.target.closest("[data-toggle]");
      if (t) {
        const kids = t.closest(".tnode")?.querySelector(":scope > .tkids");
        if (!kids) return;
        const open = kids.hidden;
        kids.hidden = !open;
        t.textContent = open ? "▾" : "▸";
        t.setAttribute("aria-expanded", String(open));
        SND.play(open ? "open" : "close");
        return;
      }
      const ing = e.target.closest("[data-ing]");
      if (ing) {
        if (e.target.closest("a")) return;
        if (e.target.closest(".npc-tip")) return;
        const rootCard = tipCard.querySelector(".tip-card-tree > .tnode > .tnode-card");
        const rootName = rootCard ? rootCard.dataset.ing : "";
        if (rootName && normalizeArtName(ing.dataset.ing || "") === normalizeArtName(rootName)) {
          const rootNode = tipCard.querySelector(".tip-card-tree > .tnode");
          const kids = rootNode ? rootNode.querySelector(":scope > .tkids") : null;
          const toggle = rootNode ? rootNode.querySelector(":scope > .tnode-card > .ttoggle[data-toggle]") : null;
          if (kids && toggle) {
            const open = kids.hidden;
            kids.hidden = !open;
            toggle.textContent = open ? "▾" : "▸";
            toggle.setAttribute("aria-expanded", String(open));
            SND.play(open ? "open" : "close");
          }
          return;
        }
        renderTipCard(ing.dataset.ing || "");
        if (tipCardAnchor) placeTipCard(tipCardAnchor);
        SND.play("select");
        return;
      }
      const tm = e.target.closest("[data-tree-modal]");
      if (tm) {
        hideTipCard();
        openCraftTree(tm.dataset.treeModal || "");
      }
    });
  }

  document.addEventListener("mouseover", (e) => {
    const npc = e.target.closest && e.target.closest(".npc-tip");
    if (npc) {
      if (!tipCard) return;
      if (tt) tt.hidden = true;
      if (!tipCard.hidden && tipCardAnchor === npc) return;
      showNpcCard(npc.dataset.npc || "", npc);
      return;
    }
    const el = e.target.closest && e.target.closest(".tip");
    if (!el || !tipCard) return;
    const info = CODEX.lex && CODEX.lex[el.dataset.id];
    if (!info) return;
    if (tt) tt.hidden = true;
    if (!tipCard.hidden && tipCardAnchor === el) return;
    showTipCard(info.en || info.ru, el);
  });
  document.addEventListener("mouseout", (e) => {
    const el = e.target.closest && e.target.closest(".tip, .npc-tip");
    if (!el || !tipCard) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    if (e.relatedTarget && tipCard.contains(e.relatedTarget)) return;
    hideTipCardSoon();
  });
  /* Remote-спрайты (wiki): при недоступности сети картинка заменяется
     аккуратной заглушкой, а не исчезает бесследно. */
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!img || img.tagName !== "IMG" || !img.classList.contains("remote")) return;
    const holder = img.parentElement;
    const fallback = document.createElement("i");
    fallback.className = "art-fallback";
    fallback.textContent = "◆";
    fallback.title = "Спрайт недоступен офлайн";
    fallback.setAttribute("aria-label", "Спрайт недоступен офлайн");
    img.remove();
    if (holder) holder.appendChild(fallback);
  }, true);

  document.addEventListener("click", (e) => {
    const bossLink = e.target.closest && e.target.closest("[data-boss-detail]");
    if (!bossLink) return;
    e.preventDefault();
    const anchor = tipCard?.contains(bossLink) ? (tipCardAnchor || bossLink) : bossLink;
    showNpcCard(bossLink.dataset.bossDetail || bossLink.textContent || "", anchor, true);
  });
  document.addEventListener("click", (e) => {
    const npc = e.target.closest && e.target.closest(".npc-tip");
    if (npc) {
      if (!tipCard) return;
      if (!tipCard.hidden && tipCardAnchor === npc) {
        if (tipCardPinned) hideTipCard();
        else pinTipCard();
        return;
      }
      showNpcCard(npc.dataset.npc || "", npc, true);
      e.preventDefault();
      return;
    }
    const el = e.target.closest && e.target.closest(".tip");
    if (!el || !tipCard) return;
    const info = CODEX.lex && CODEX.lex[el.dataset.id];
    if (!info) return;
    if (!tipCard.hidden && tipCardAnchor === el) {
      if (tipCardPinned) hideTipCard();
      else pinTipCard();
      return;
    }
    showTipCard(info.en || info.ru, el, true);
    e.preventDefault();
  });

  /* ---------- ховер и клик по ингредиентам крафта ---------- */
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest && e.target.closest(".ing");
    if (!el || !tipCard) return;
    if (tt) tt.hidden = true;
    if (!tipCard.hidden && tipCardAnchor === el) return;
    showTipCard(el.dataset.ing || "", el);
  });
  document.addEventListener("mouseout", (e) => {
    const el = e.target.closest && e.target.closest(".ing");
    if (!el || !tipCard) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    if (e.relatedTarget && tipCard.contains(e.relatedTarget)) return;
    hideTipCardSoon();
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest(".ing");
    if (!el) return;
    hideTipCard();
    openCraftTree(el.dataset.ing || "");
    e.preventDefault();
  });
  document.addEventListener("click", (e) => {
    if (!tipCard || tipCard.hidden) return;
    if (tipCard.contains(e.target)) return;
    if (e.target.closest && (e.target.closest(".tip") || e.target.closest(".npc-tip") || e.target.closest(".ing") || e.target.closest("[data-boss-detail]"))) return;
    hideTipCard();
  });

  const store = {
    get() { try { return JSON.parse(localStorage.getItem("calamity-codex") || "{}"); } catch { return {}; } },
    set(p) {
      try { localStorage.setItem("calamity-codex", JSON.stringify({ ...store.get(), ...p })); }
      catch { /* The guide still works when private storage is unavailable. */ }
    },
    replace(value) {
      try { localStorage.setItem("calamity-codex", JSON.stringify(value && typeof value === "object" ? value : {})); }
      catch { /* The guide still works when private storage is unavailable. */ }
    }
  };

  /* ---------- звуковой движок (WebAudio-синтез, без аудиофайлов) ---------- */
  const SND = (() => {
    let ctx = null;
    let master = null;
    let enabled = store.get().sound !== false;
    const ensure = () => {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.14;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    };
    const tone = (f0, f1, dur, type, vol, delay) => {
      const c = ensure();
      if (!c || !enabled) return;
      const t = c.currentTime + (delay || 0);
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(Math.max(f0, 1), t);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.03);
    };
    const noise = (dur, vol, cutoff) => {
      const c = ensure();
      if (!c || !enabled) return;
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = cutoff || 800;
      const g = c.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(master);
      src.start();
    };
    return {
      get enabled() { return enabled; },
      setEnabled(value) { enabled = !!value; store.set({ sound: enabled }); },
      unlock() { ensure(); },
      play(name) {
        if (!enabled) return;
        switch (name) {
          case "tick": tone(880, 660, 0.05, "square", 0.4); break;
          case "select": tone(520, 760, 0.07, "square", 0.35); break;
          case "open": tone(300, 540, 0.09, "triangle", 0.4); break;
          case "close": tone(540, 300, 0.09, "triangle", 0.4); break;
          case "pop": tone(660, 990, 0.12, "square", 0.45); tone(1320, 1320, 0.08, "sine", 0.25, 0.05); break;
          case "snap": tone(520, 300, 0.1, "square", 0.3); break;
          case "check": tone(392, 392, 0.08, "square", 0.3); tone(523, 523, 0.08, "square", 0.3, 0.09); tone(784, 784, 0.16, "square", 0.3, 0.18); break;
          case "chime": [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.14, "square", 0.3, i * 0.09)); break;
          case "roar": noise(0.7, 0.3, 150); tone(110, 42, 0.8, "sawtooth", 0.22); break;
          case "blip": tone(1000, 1000, 0.03, "sine", 0.2); break;
          case "power": tone(220, 880, 0.28, "sawtooth", 0.3); noise(0.3, 0.35, 1200); break;
          default: break;
        }
      }
    };
  })();

  /* ---------- тосты, вспышки, звёзды, тряска ---------- */
  let toastTimer = 0;
  function toast(message, mark) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.innerHTML = `<span class="toast-mark">${mark || "✓"}</span><span>${esc(message)}</span>`;
    el.hidden = false;
    el.classList.remove("go");
    void el.offsetWidth;
    el.classList.add("go");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
  }
  function flashScreen() {
    const el = document.getElementById("flash");
    if (!el) return;
    el.classList.remove("go");
    void el.offsetWidth;
    el.classList.add("go");
  }
  function starPop(x, y, cls) {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const s = document.createElement("span");
    s.className = "star-pop" + (cls ? " " + cls : "");
    s.textContent = "★";
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.setProperty("--dx", Math.round(Math.random() * 48 - 24) + "px");
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 950);
  }
  function shakeStage() {
    const st = document.querySelector(".stage-bar");
    if (!st) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    st.classList.remove("shake");
    void st.offsetWidth;
    st.classList.add("shake");
    setTimeout(() => st.classList.remove("shake"), 500);
  }
  function syncRevengeanceUI(on) {
    document.body.dataset.revengeance = on ? "1" : "";
    const rev = document.getElementById("rail-rev");
    if (rev) rev.hidden = !on;
  }
  function toggleRevengeance() {
    const on = document.body.dataset.revengeance !== "1";
    syncRevengeanceUI(on);
    store.set({ revengeance: on });
    if (on) {
      SND.play("power");
      flashScreen();
      toast("Месть активирована — режим REVENGEANCE", "☠");
      FX.set("fire");
    } else {
      SND.play("snap");
      toast("Месть отменена — спокойный режим", "✕");
    }
  }

  const FAVORITE_TYPES = { item: "Предмет", boss: "Босс", craft: "Рецепт" };
  const favoriteValues = (value) => Array.isArray(value) ? value : [];
  let favoriteCache = null;
  function getFavorites() {
    if (favoriteCache) return favoriteCache;
    const raw = store.get().favorites || {};
    const storedBosses = favoriteValues(raw.boss).map(String);
    const migratedBosses = new Set();
    let bossMigrationChanged = false;
    storedBosses.forEach((value) => {
      const replacements = CODEX.bossFavoriteMigration?.[value];
      if (replacements?.length) {
        replacements.forEach((id) => migratedBosses.add(id));
        bossMigrationChanged = true;
      } else {
        migratedBosses.add(value);
      }
    });
    if (bossMigrationChanged) store.set({ favorites: { ...raw, boss: [...migratedBosses] } });
    favoriteCache = {
      item: new Set(favoriteValues(raw.item).map(String)),
      boss: migratedBosses,
      craft: new Set(favoriteValues(raw.craft).map(String))
    };
    return favoriteCache;
  }
  function updateFavoritesBadge() {
    const favorites = getFavorites();
    const total = favorites.item.size + favorites.boss.size + favorites.craft.size;
    document.querySelectorAll("[data-favorites-count]").forEach((el) => { el.textContent = total; });
    return total;
  }
  function toggleFavorite(type, key) {
    if (!FAVORITE_TYPES[type]) return;
    const raw = store.get().favorites || {};
    const values = new Set(favoriteValues(raw[type]).map(String));
    const normalized = String(key);
    const removing = values.has(normalized);
    if (removing) values.delete(normalized);
    else values.add(normalized);
    store.set({ favorites: { ...raw, [type]: [...values] } });
    favoriteCache = null;
    updateFavoritesBadge();
    SND.play(removing ? "snap" : "pop");
    announce(`${FAVORITE_TYPES[type]} ${removing ? "удалён из избранного" : "добавлен в избранное"}`);
  }
  function favoriteButton(type, key, label) {
    const saved = getFavorites()[type]?.has(String(key));
    const action = saved ? "Удалить из избранного" : "Добавить в избранное";
    return `<button class="favorite-btn ${saved ? "saved" : ""}" type="button" data-favorite-type="${type}" data-favorite-key="${escAttr(key)}" aria-pressed="${saved}" aria-label="${action}: ${escAttr(label)}" title="${action}"><span aria-hidden="true">${saved ? "★" : "☆"}</span></button>`;
  }

  let defeatedBossCache = null;
  function getDefeatedBosses() {
    if (defeatedBossCache) return defeatedBossCache;
    const entries = [...(CODEX.bosses || []), ...(CODEX.minis || [])];
    const validIds = new Set(entries.map((boss) => String(boss.id || boss.n)));
    const saved = favoriteValues(store.get().defeatedBosses).map(String);
    const migrated = new Set();
    let changed = false;
    saved.forEach((value) => {
      const replacements = CODEX.bossFavoriteMigration?.[value];
      if (replacements?.length) {
        replacements.filter((id) => validIds.has(String(id))).forEach((id) => migrated.add(String(id)));
        changed = true;
      } else if (validIds.has(value)) {
        migrated.add(value);
      } else {
        changed = true;
      }
    });
    if (changed) store.set({ defeatedBosses: [...migrated] });
    defeatedBossCache = migrated;
    return defeatedBossCache;
  }
  function toggleBossDefeated(key) {
    const id = String(key || "");
    const defeated = new Set(getDefeatedBosses());
    const wasDefeated = defeated.has(id);
    if (wasDefeated) defeated.delete(id);
    else defeated.add(id);
    store.set({ defeatedBosses: [...defeated] });
    defeatedBossCache = defeated;
    const boss = [...(CODEX.bosses || []), ...(CODEX.minis || [])].find((entry) => String(entry.id || entry.n) === id);
    const label = boss?.name || "Босс";
    SND.play(wasDefeated ? "snap" : "check");
    toast(wasDefeated ? `${label}: отметка о победе снята` : `${label}: победа записана`, wasDefeated ? "○" : "✓");
    announce(wasDefeated ? `Отметка о победе над «${label}» снята` : `Победа над «${label}» отмечена`);
    return !wasDefeated;
  }

  /* ---------- сворачивание/разворачивание карточек + masonry-раскладка ---------- */
  const MASONRY_VIEWS = ["items", "favorites"];
  function isMasonryView() { return MASONRY_VIEWS.includes(document.body.dataset.view || ""); }
  function cardStateMap() { return store.get().cardCollapsed || {}; }
  function isCardCollapsed(key) {
    const m = cardStateMap();
    if (m[key] !== undefined) return !!m[key];
    // по классике: на страницах предметов всё свёрнуто по умолчанию
    return isMasonryView();
  }
  function setCardCollapsed(key, collapsed) {
    const next = { ...cardStateMap() };
    next[key] = collapsed ? 1 : 0;
    store.set({ cardCollapsed: next });
  }
  function cardKeyFor(card) {
    const fav = card.querySelector("[data-favorite-type]");
    if (fav && fav.dataset.favoriteKey) return `${fav.dataset.favoriteType}::${fav.dataset.favoriteKey}`;
    const title = (card.querySelector(".card-title") || card.querySelector("h3"))?.textContent.trim() || "";
    return `${document.body.dataset.view || "?"}::${title}`;
  }
  function applyCardState(card, collapsed) {
    card.classList.toggle("collapsed", collapsed);
    const btn = card.querySelector(".card-toggle");
    if (btn) {
      btn.setAttribute("aria-expanded", String(!collapsed));
      btn.setAttribute("aria-label", collapsed ? "Развернуть карточку" : "Свернуть карточку");
      btn.textContent = collapsed ? "▸" : "▾";
    }
  }
  function toggleCardState(card, force) {
    const collapsed = force !== undefined ? force : !card.classList.contains("collapsed");
    applyCardState(card, collapsed);
    setCardCollapsed(cardKeyFor(card), collapsed);
    SND.play(collapsed ? "close" : "open");
  }

  /* Masonry: карточки жадно раскладываются по колонкам в самую короткую;
     при разворачивании одной карточки следующие «присасываются» к верху
     в освободившееся место соседних колонок. */
  const MASONRY_GAP = 12;
  // Две колонки на десктопе: три давали слишком узкие карточки и текст.
  function masonryColCount() { return innerWidth < 760 ? 1 : 2; }
  function layoutMasonry(container, pinned) {
    if (!container || !isMasonryView()) return;
    const colCount = masonryColCount();
    // 1) собрать ссылки на карточки, пока они ещё в DOM
    const cards = [];
    container.querySelectorAll(":scope > .masonry-col").forEach((col) => {
      [...col.children].forEach((card) => cards.push(card));
    });
    [...container.children].forEach((el) => {
      if (!el.classList || !el.classList.contains("masonry-col")) cards.push(el);
    });
    if (!cards.length) return;
    // 2) стабильный исходный порядок: индекс присваивается один раз (при первом
    //    рендере DOM плоский — порядок рендера) и переживает пере-раскладки,
    //    чтобы карточки не прыгали и чтение оставалось по порядку
    if (!container.dataset.masonryReady) {
      container.dataset.masonryReady = "1";
      cards.forEach((c, i) => { c.dataset.masonryIndex = String(i); });
    }
    cards.sort((a, b) => Number(a.dataset.masonryIndex || 0) - Number(b.dataset.masonryIndex || 0));
    // 3) замерить высоты пачкой (карточки ещё в DOM — один reflow)
    const heights = cards.map((c) => c.offsetHeight || 0);
    // 4) разобрать старую раскладку
    container.querySelectorAll(":scope > .masonry-col").forEach((col) => col.remove());
    // 5) собрать колонки заново
    container.classList.add("masonry");
    const colEls = [];
    const colH = [];
    for (let i = 0; i < colCount; i++) {
      const col = document.createElement("div");
      col.className = "masonry-col";
      container.appendChild(col);
      colEls.push(col);
      colH.push(0);
    }
    // 6) жадная раскладка в исходном порядке: каждую карточку — в самую
    //    короткую колонку; закреплённая карточка удерживает СВОЮ колонку,
    //    оставаясь на месте при разворачивании/сворачивании
    const pinIdx = pinned && pinned.pinnedIdx >= 0 && pinned.pinnedIdx < colCount ? pinned.pinnedIdx : -1;
    cards.forEach((card, i) => {
      let target = -1;
      if (pinIdx >= 0 && pinned.card === card) target = pinIdx;
      else {
        let min = 0;
        for (let j = 1; j < colCount; j++) if (colH[j] < colH[min]) min = j;
        target = min;
      }
      colEls[target].appendChild(card);
      colH[target] += heights[i] + MASONRY_GAP;
    });
  }
  let masonryResizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(masonryResizeTimer);
    masonryResizeTimer = setTimeout(() => {
      document.querySelectorAll(".masonry").forEach((grid) => layoutMasonry(grid));
    }, 180);
  });
  function relayoutAfterToggle(card) {
    const grid = card.closest(".masonry");
    if (!grid) return;
    const col = card.closest(".masonry-col");
    const pinnedIdx = col ? [...grid.children].indexOf(col) : -1;
    layoutMasonry(grid, { card, pinnedIdx });
    invalidateScrollMetrics();
  }
  function enhanceCards(root) {
    if (!root) return;
    root.querySelectorAll("button.chip").forEach((button) => button.setAttribute("aria-pressed", String(button.classList.contains("active"))));
    root.querySelectorAll(".catalog-mode").forEach((link) => {
      if (link.classList.contains("active")) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (innerWidth <= 760) requestAnimationFrame(() => {
      root.querySelectorAll(".chips").forEach((row) => {
        const active = row.querySelector(".chip.active");
        if (active && row.scrollWidth > row.clientWidth) row.scrollLeft = Math.max(0, active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2);
      });
    });
    linkifyMobMentions(root);
    root.querySelectorAll(".item-grid .card, .craft-grid .card").forEach((card) => {
      // ВАЖНО: маркер карточки НЕ должен совпадать с атрибутом кнопки —
      // иначе e.target.closest() найдёт карточку и сворачивание сработает
      // на любой клик внутри (чип, звезда, ссылка).
      if (card.dataset.cardEnhanced) return;
      card.dataset.cardEnhanced = "1";
      const btn = document.createElement("button");
      btn.className = "card-toggle";
      btn.type = "button";
      btn.setAttribute("aria-expanded", "true");
      btn.setAttribute("aria-label", "Свернуть карточку");
      btn.textContent = "▾";
      card.appendChild(btn);
      if (isCardCollapsed(cardKeyFor(card))) applyCardState(card, true);
    });
    if (isMasonryView()) {
      root.querySelectorAll(".item-grid, .full-catalog-grid").forEach((grid) => layoutMasonry(grid));
    }
  }
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest(".card-toggle");
    if (btn) {
      const card = btn.closest(".card");
      if (card) {
        e.preventDefault();
        toggleCardState(card);
        relayoutAfterToggle(card);
      }
      return;
    }
    const collapsedCard = e.target.closest && e.target.closest(".card.collapsed");
    if (collapsedCard) {
      if (e.target.closest("a, button, .ing, [data-favorite-type]")) return;
      e.preventDefault();
      toggleCardState(collapsedCard, false);
      relayoutAfterToggle(collapsedCard);
    }
  });

  function announce(message) {
    toast(message, "✓");
    if (!liveRegion) return;
    liveRegion.textContent = "";
    requestAnimationFrame(() => { liveRegion.textContent = message; });
  }

  function updateJourneyProgress() {
    const saved = store.get();
    const validQuestIds = new Set(CODEX.quests.map((quest) => quest.id));
    const done = new Set((saved.doneQuests || []).map(Number).filter((id) => validQuestIds.has(id)));
    const total = CODEX.quests.length;
    const percent = total ? Math.round((done.size / total) * 100) : 0;
    const current = CODEX.quests.find((q) => !done.has(q.id))
      || CODEX.quests.find((q) => q.id === Number(saved.quest))
      || CODEX.quests[0];
    const count = document.getElementById("journey-count");
    const railLabel = document.getElementById("rail-progress-label");
    const railFill = document.getElementById("rail-progress-fill");
    const journeyFill = document.getElementById("journey-fill");
    const journey = document.querySelector(".journey-mini");
    if (count) count.textContent = `${percent}%`;
    if (railLabel) railLabel.textContent = `${done.size} / ${total}`;
    if (railFill) railFill.style.width = `${percent}%`;
    if (journeyFill) journeyFill.style.width = `${percent}%`;
    if (journey && current) journey.href = `#/novice?q=${current.id}`;
    return { done, total, percent, current };
  }

  /* ---------- themed particles: native 60–240 Hz animation loop ---------- */
  const FX = (() => {
    const c = $("body") && $("#embers");
    if (!c) return { set() {} };
    const ctx = c.getContext("2d", { alpha: true, desynchronized: true }) || c.getContext("2d");
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const saveData = navigator.connection?.saveData === true;
    if (!ctx || reduceMotion || saveData) return { set() {} };
    const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
      || (navigator.deviceMemory && navigator.deviceMemory <= 4);
    let w = 1;
    let h = 1;
    let dots = [];
    let mode = "embers";
    let desiredCount = 30;
    const pal = {
      embers:  ["232,120,60", "255,80,40"],
      leaves:  ["122,180,80", "200,160,60"],
      sparks:  ["182,255,74", "220,255,160"],
      stars:   ["232,184,74", "255,255,220"],
      bubbles: ["61,205,192", "160,240,255"],
      blobs:   ["155,140,255", "200,120,200"],
      sand:    ["232,184,74", "200,140,60"],
      acid:    ["182,224,74", "120,200,40"],
      spores:  ["110,200,255", "180,230,255"],
      drip:    ["196,30,90", "120,10,40"],
      dust:    ["160,176,200", "100,110,130"],
      snow:    ["200,235,255", "255,255,255"],
      ash:     ["255,60,70", "80,20,20"],
      pollen:  ["140,224,90", "220,200,80"],
      gold:    ["255,224,138", "255,180,60"],
      warp:    ["122,224,255", "208,122,255"],
      fire:    ["255,140,40", "255,60,20"],
      ritual:  ["255,77,109", "180,40,255"]
    };
    const tint = () => (pal[mode] || pal.embers)[Math.random() < 0.6 ? 0 : 1];
    const spawn = () => {
      const color = tint();
      const alpha = Math.random() * 0.5 + 0.12;
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 2.2 + 0.4,
        s: Math.random() * 0.7 + 0.12,
        a: alpha,
        vx: (Math.random() - 0.5) * 0.6,
        t: Math.random() * 100,
        c: color,
        fill: `rgba(${color},${alpha})`
      };
    };
    const resize = () => {
      w = c.width = Math.max(1, innerWidth);
      h = c.height = Math.max(1, innerHeight);
      const areaCount = Math.round((w * h) / 52000);
      desiredCount = Math.max(lowPower ? 18 : 24, Math.min(lowPower ? 28 : 40, areaCount));
      dots = Array.from({ length: desiredCount }, spawn);
    };
    let resizeFrame = 0;
    const scheduleResize = () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        resize();
      });
    };
    resize();
    addEventListener("resize", scheduleResize, { passive: true });

    let animationFrame = 0;
    let lastFrameAt = 0;
    let averageWork = 0;
    let qualityFrame = 0;
    let bestFrameInterval = Infinity;
    let missedFrames = 0;
    const refreshSamples = [];
    const knownRates = [60, 75, 90, 100, 120, 144, 165, 180, 240];
    const classifyRefreshRate = (elapsed) => {
      if (refreshSamples.length >= 36 || elapsed < 2 || elapsed > 40) return;
      refreshSamples.push(elapsed);
      if (refreshSamples.length !== 36) return;
      // Lower quartile ignores occasional missed callbacks during startup.
      const sample = [...refreshSamples].sort((a, b) => a - b)[9];
      const measured = 1000 / sample;
      const hz = knownRates.reduce((best, rate) => Math.abs(rate - measured) < Math.abs(best - measured) ? rate : best, 60);
      document.documentElement.dataset.refreshRate = String(hz);
      document.documentElement.style.setProperty("--refresh-rate", String(hz));
    };
    const tick = (now) => {
      if (document.hidden || document.body.classList.contains("lite")) {
        animationFrame = 0;
        lastFrameAt = 0;
        ctx.clearRect(0, 0, w, h);
        return;
      }
      const elapsed = lastFrameAt ? Math.min(66.667, Math.max(1, now - lastFrameAt)) : 16.667;
      if (lastFrameAt) {
        classifyRefreshRate(elapsed);
        if (elapsed < 40) {
          bestFrameInterval = Math.min(bestFrameInterval, elapsed);
          if (elapsed > bestFrameInterval * 1.65) missedFrames += 1;
        }
      }
      lastFrameAt = now;
      // Movement used to be expressed per 30 Hz frame. Time normalization
      // preserves its speed while rAF draws every native 60/120/144/180 Hz frame.
      const frameScale = elapsed / 33.333;
      const workStarted = performance.now();
      ctx.clearRect(0, 0, w, h);
      const falling = mode === "snow" || mode === "spores" || mode === "pollen" || mode === "leaves";
      for (let index = 0; index < dots.length; index += 1) {
        const d = dots[index];
        d.t += 0.02 * frameScale;
        if (mode === "bubbles") {
          d.y -= d.s * frameScale;
          d.x += Math.sin(d.t) * 0.4 * frameScale;
        } else if (falling) {
          d.y += d.s * 0.55 * frameScale;
          d.x += (Math.sin(d.t) * 0.8 + d.vx) * frameScale;
        } else if (mode === "sand") {
          d.y += d.s * 0.3 * frameScale;
          d.x += d.s * 1.4 * frameScale;
        } else if (mode === "drip" || mode === "acid") {
          d.y += d.s * 1.4 * frameScale;
        } else if (mode === "warp") {
          d.x += d.vx * 4 * frameScale;
          d.y += Math.sin(d.t) * 0.4 * frameScale;
        } else {
          d.y -= d.s * frameScale;
          d.x += Math.sin(d.y * 0.01) * 0.25 * frameScale;
        }
        if (d.y < -8) d.y = h + 8;
        if (d.y > h + 8) d.y = -8;
        if (d.x < -8) d.x = w + 8;
        if (d.x > w + 8) d.x = -8;
        ctx.fillStyle = d.fill;
        if (mode === "warp") {
          ctx.fillRect(d.x, d.y, 10 + d.s * 8, 1);
        } else if (mode === "leaves") {
          ctx.save();
          ctx.translate(d.x, d.y);
          ctx.rotate(d.t);
          ctx.fillRect(-d.r, -d.r / 2, d.r * 2, d.r);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      const work = performance.now() - workStarted;
      averageWork = averageWork ? averageWork * 0.96 + work * 0.04 : work;
      qualityFrame += 1;
      // Keep ambient work well below the 5.56 ms budget of a 180 Hz frame.
      if (qualityFrame >= 120) {
        qualityFrame = 0;
        const overloaded = averageWork > 2 || missedFrames > 10;
        if (overloaded && dots.length > 16) {
          dots.length = Math.max(16, Math.floor(dots.length * 0.75));
          document.documentElement.dataset.fxQuality = "reduced";
        } else if (averageWork < 0.8 && missedFrames < 3 && dots.length < desiredCount) {
          dots.push(...Array.from({ length: Math.min(2, desiredCount - dots.length) }, spawn));
          if (dots.length >= desiredCount) delete document.documentElement.dataset.fxQuality;
        }
        missedFrames = 0;
      }
      animationFrame = requestAnimationFrame(tick);
    };
    const startAnimation = () => {
      if (!animationFrame && !document.hidden && !document.body.classList.contains("lite")) animationFrame = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", startAnimation);
    startAnimation();
    return {
      sync: startAnimation,
      set(name) {
        mode = name || "embers";
        dots.forEach((d) => {
          d.c = tint();
          d.fill = `rgba(${d.c},${d.a})`;
        });
      }
    };
  })();

  function fillRail(html) {
    const extra = document.getElementById("rail-extra");
    if (extra) extra.innerHTML = html || "";
  }

  function mixHexDark(hex, base = [10, 14, 20], share = 0.2) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || "").trim());
    if (!m) return "#0a0e14";
    const c = [0, 1, 2].map((i) => parseInt(m[1].slice(i * 2, i * 2 + 2), 16));
    return `#${c.map((v, i) => Math.round(v * share + base[i] * (1 - share)).toString(16).padStart(2, "0")).join("")}`;
  }
  function applyTheme(q) {
    const accent = (q && q.accent) || "#ffd97a";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", mixHexDark(accent));
    const fx = (q && q.fx) || "embers";
    document.body.style.setProperty("--accent", accent);
    const themeImage = q && q.bg ? new URL(q.bg, document.baseURI).href : "";
    document.body.style.setProperty("--theme-image", themeImage ? `url("${themeImage}")` : "none");
    document.body.style.setProperty("--theme-filter", (q && q.filter) || "none");
    const revenge = document.body.dataset.revengeance === "1";
    if (!revenge) document.body.dataset.fx = fx;
    FX.set(revenge ? "fire" : fx);
  }
  function applySectionTheme(view) {
    applyTheme(SECTION_THEMES[view] || null);
  }

  const ICO = {
    steps: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 4h6v2H9zm-4 4h14v2H5zm2 4h10v2H7zm3 4h4v6h-4z"/></svg>`,
    map: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>`,
    bag: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7 7V6a5 5 0 0 1 10 0v1h3v14H4V7h3zm2 0h6V6a3 3 0 0 0-6 0z"/></svg>`,
    craft: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M2 19h20v2H2zm3-3 5-5 2 2 7-7 2 2-9 9-2-2-3 3z"/></svg>`,
    sword: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M21 3 11 13l-1.5 4.5L14 16 21 3zM8 15l-5 5 1 1 5-5-1-1z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>`,
    tip: `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M9 21h6v-1H9zm3-19a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>`
  };
  const h3 = (ico, text) => `<h3><span class="h3-ico">${ico}</span>${text}</h3>`;

  function eraBadge(era) {
    const map = { pre: ["pre", "Прехардмод"], hard: ["hard", "Хардмод"], post: ["post", "Пост-ML"], end: ["end", "Финал"] };
    const [cls, label] = map[era] || ["pre", era];
    const pretty = { pre: "Прехардмод", hard: "Хардмод", post: "После Луны", end: "Финал" };
    return `<span class="badge ${cls}">${pretty[era] || label}</span>`;
  }

  const CATALOG_VIEWS = new Set(["items", "crafts", "useful", "favorites", "mobs"]);
  function renderCatalogLoading(view, failed = false) {
    if (!app) return;
    app.setAttribute("aria-busy", String(!failed));
    const label = view === "crafts" ? "рецепты Terraria" : view === "useful" ? "практический набор" : view === "favorites" ? "рюкзак героя" : view === "mobs" ? "бестиарий существ" : "полный каталог";
    app.innerHTML = `
      <section class="app-boot catalog-boot" aria-live="polite">
        <span class="app-boot-mark" aria-hidden="true">${failed ? "!" : "◆"}</span>
        <div>
          <b>${failed ? "Каталог не загрузился" : `Загружаем ${label}`}</b>
          <small>${failed ? "Проверь соединение и повтори попытку. Основной путеводитель продолжает работать." : "Тяжёлые индексы загружаются отдельно, чтобы главная открывалась быстрее."}</small>
          ${failed ? '<button class="btn catalog-retry" type="button">Повторить</button>' : ""}
        </div>
        ${failed ? "" : '<i aria-hidden="true"></i>'}
      </section>`;
    app.querySelector(".catalog-retry")?.addEventListener("click", () => {
      renderCatalogLoading(view);
      ensureCatalogData().then((ready) => {
        if (ready) route();
        else renderCatalogLoading(view, true);
      });
    });
  }

  function route() {
    app?.removeAttribute("aria-busy");
    const focusedId = document.activeElement && document.activeElement.id;
    const hash = location.hash.replace(/^#/, "") || "/";
    const [path, q] = hash.split("?");
    const params = Object.fromEntries(new URLSearchParams(q || ""));
    const parts = path.split("/").filter(Boolean);
    const requested = parts[0] || "home";
    const view = ROUTE_RU[requested] ? requested : "home";
    const viewChanged = lastView !== view;
    lastView = view;

    document.querySelectorAll("[data-nav]").forEach((a) => {
      const on = a.dataset.nav === view;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (routeTitle) routeTitle.textContent = ROUTE_RU[view];
    document.title = `${ROUTE_RU[view]} — Каламити Кодекс`;
    document.body.dataset.view = view;
    updateJourneyProgress();
    updateFavoritesBadge();
    updateCraftPlanCount();

    setMobileMenu(false, { restoreFocus: false, playSound: false });
    searchPanel.classList.add("hidden");
    hideTipCard();
    if (view !== "biomes" && lazyBackgroundObserver) {
      lazyBackgroundObserver.disconnect();
      lazyBackgroundObserver = null;
    }
    closeRecipeModal({ restoreFocus: false, playSound: false });
    closeCraftTree({ restoreFocus: false, playSound: false });
    closeBiomeViewer({ restoreFocus: false });

    if (CATALOG_VIEWS.has(view) && !catalogDataReady()) {
      applySectionTheme(view);
      renderCatalogLoading(view);
      ensureCatalogData().then((ready) => {
        const currentView = (location.hash.replace(/^#\//, "").split(/[/?]/)[0] || "home");
        if (currentView !== view) return;
        if (ready) route();
        else renderCatalogLoading(view, true);
      });
      return;
    }

    try {
      if (view === "home") { applyTheme(null); renderHome(); }
      else if (view === "novice") {
        if (params.q !== undefined) renderNovice(Number(params.q) || 1);
        else renderNoviceMap();
      }
      else if (view === "wiki") { applySectionTheme(view); renderWiki(params); }
      else if (view === "bosses") { applySectionTheme(view); renderBosses(params); }
      else if (view === "crafts") { applySectionTheme(view); renderCrafts(params.q || "", params.item || "", params.plan === "1"); }
      else if (view === "items") { applySectionTheme(view); renderItems(params); }
      else if (view === "useful") { applySectionTheme(view); renderUseful(params); }
      else if (view === "favorites") { applySectionTheme(view); renderFavorites(); }
      else if (view === "lex") { applySectionTheme(view); renderLex(params); }
      else if (view === "biomes") { applySectionTheme(view); renderBiomes(params); }
      else if (view === "mobs") { applySectionTheme(view); renderMobs(params); }
      versionLocalImages(app);
      enhanceCards(app);
      invalidateScrollMetrics();
    } catch (error) {
      console.error("Calamity Codex route failed", error);
      fillRail("");
      app.innerHTML = `<div class="page"><div class="empty-state route-error"><span>!</span><b>Раздел не удалось открыть</b><p>${esc(error?.message || "Неизвестная ошибка интерфейса")}</p><div><a class="btn" href="#/">На главную</a><button class="btn ghost" type="button" id="route-reload">Перезагрузить</button></div></div></div>`;
      document.getElementById("route-reload")?.addEventListener("click", () => location.reload());
      return;
    }

    if (view === "bosses" && viewChanged) { SND.play("roar"); shakeStage(); }

    const contentKey = scrollKey(view, params);
    const contentChanged = contentKey !== lastScrollKey;
    const shouldRestoreScroll = restoreScrollOnNextRoute && routeScrollPositions.has(contentKey);
    const restoredScrollY = shouldRestoreScroll ? routeScrollPositions.get(contentKey) : 0;
    restoreScrollOnNextRoute = false;
    lastScrollKey = contentKey;

    if (viewChanged) {
      requestAnimationFrame(() => {
        if (!app) return;
        routeAnimation?.cancel?.();
        if (typeof app.animate === "function") {
          const animation = app.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
          routeAnimation = animation;
          animation.finished.catch(() => {}).then(() => {
            if (routeAnimation === animation) routeAnimation = null;
          });
        } else {
          app.classList.remove("enter");
          requestAnimationFrame(() => {
            app.classList.add("enter");
            app.addEventListener("animationend", () => app.classList.remove("enter"), { once: true });
          });
        }
        window.scrollTo({ top: restoredScrollY, behavior: "auto" });
      });
    } else if (contentChanged || shouldRestoreScroll) {
      requestAnimationFrame(() => window.scrollTo({ top: restoredScrollY, behavior: "auto" }));
    }

    if (!viewChanged && focusedId) {
      requestAnimationFrame(() => {
        const next = document.getElementById(focusedId);
        if (!next) return;
        next.focus({ preventScroll: true });
        if (typeof next.setSelectionRange === "function") next.setSelectionRange(next.value.length, next.value.length);
      });
    }
  }

  function renderHome() {
    applyTheme(null);
    fillRail("");
    document.body.style.setProperty("--theme-image", "none");
    const { done, total, percent, current } = updateJourneyProgress();
    const favorites = getFavorites();
    const favTotal = favorites.item.size + favorites.boss.size + favorites.craft.size;
    const planRows = craftPlanRows();
    const craftPlanTotal = planRows.length;
    const craftPlanRuns = planRows.reduce((sum, [, quantity]) => sum + quantity, 0);
    const bossEntries = [...CODEX.bosses, ...CODEX.minis];
    const defeatedBosses = getDefeatedBosses();
    const bossSnapshot = bossProgressSnapshot(bossEntries, defeatedBosses);
    const nextBoss = bossSnapshot.targets[0] || null;
    const currentQuest = current || CODEX.quests[CODEX.quests.length - 1];
    const currentQuestArt = GUIDE_ART[currentQuest?.id] || "assets/sprites/Wooden_Sword.png";
    const nextBossArt = nextBoss ? (nextBoss.art || BOSS_ART_BY_ID[nextBoss.id] || BOSS_ART[nextBoss.n] || "assets/sprites/Suspicious_Looking_Eye.png") : "assets/favicon.png";
    const bossPercent = Math.round((bossSnapshot.defeatedCount / Math.max(1, bossSnapshot.total)) * 100);
    // На главной нужен только счётчик: не разворачиваем 2535 компактных строк
    // каталога в объекты до первого открытия каталога или поиска.
    const itemCount = catalogItemCount().toLocaleString("ru-RU");
    const jumpGroups = [
      {
        title: "Прохождение",
        desc: "Маршрут, противники и мир — иди по порядку глав.",
        links: [
          [`#/novice`, "assets/sprites/Wooden_Sword.png", "Путь новичка", `${done.size} из ${CODEX.quests.length} пройдено`],
          ["#/bosses", "assets/sprites/Suspicious_Looking_Eye.png", "Боссы", `${bossSnapshot.defeatedCount} из ${bossSnapshot.total} побед`],
          ["#/mobs", "assets/mob-sprites/v-zombie.png", "Мобы", "635 существ и события"],
          ["#/biomes", "assets/sprites/Rock.png", "Биомы", `${CODEX.biomes.length} локаций`]
        ]
      },
      {
        title: "Крафт и предметы",
        desc: "Что собрать, из чего и где взять ингредиенты.",
        links: [
          ["#/crafts", "assets/sprites/Iron_Anvil.png", "Полное дерево", craftPlanTotal ? `${craftPlanTotal} целей рядом в плане` : "главный инструмент кодекса"],
          ["#/items", "assets/sprites/StarterBag.png", "Предметы", `${itemCount} карточек`],
          ["#/useful", "assets/vanilla-sprites/1923.png", "Полезное", `${USEFUL_DATA.items?.length || 71} предмет`]
        ]
      },
      {
        title: "Справка и личное",
        desc: "Механики, термины и твой сохранённый прогресс.",
        links: [
          ["#/wiki", "assets/sprites/AdvancedDisplay.png", "Справочник", "5 разделов"],
          ["#/lex", "assets/sprites/DecryptionComputer.png", "Словарь", `${Object.keys(CODEX.lex || {}).length} терминов`],
          ["#/favorites", "assets/sprites/HeavenfallenStardisk.png", "Избранное", `${favTotal} в рюкзаке`]
        ]
      }
    ];
    app.innerHTML = `
      <section class="hero">
        <div class="hero-bg"></div>
        <div class="hero-inner">
          <div class="kicker">Terraria 1.4.5 · Каламити ${CODEX.version} · офлайн-справочник</div>
          <h1>Каламити<span>Кодекс</span></h1>
          <p class="lede">Личный маршрут по Terraria + Calamity: кодекс сам подсказывает следующий квест, ближайшего босса и нужный крафт. Начни с «Пути новичка» — остальное подстроится под твой прогресс.</p>
          <div class="hero-actions">
            <a class="mode-btn" href="#/novice?q=${currentQuest?.id || 1}">
              <span class="slot mode-slot"><img src="assets/sprites/Wooden_Sword.png" alt="" loading="lazy" decoding="async" /></span>
              <span class="mode-copy"><b>${done.size ? "Продолжить путь" : "Путь новичка"}</b><small>${done.size} из ${total} · ${esc(currentQuest?.title || "от дома до ведьмы")}</small></span>
              <span class="mode-arrow">▶</span>
            </a>
            <a class="mode-btn primary-tree" href="#/crafts">
              <span class="slot mode-slot"><img src="assets/sprites/Iron_Anvil.png" alt="" loading="lazy" decoding="async" /></span>
              <span class="mode-copy"><b>Полное дерево</b><small>любой предмет · все ветки · базовые ресурсы</small></span>
              <span class="mode-arrow">▶</span>
            </a>
          </div>
        </div>
        <aside class="hero-status panel" aria-label="Сводка прогресса">
          <div class="hs-head"><span>Прогресс героя</span><b>${done.size} / ${total}</b></div>
          <div class="hpbar"><i style="width:${percent}%"></i></div>
          <div class="hs-stats">
            <a href="#/bosses"><span class="slot hs-slot"><img src="assets/sprites/Suspicious_Looking_Eye.png" alt="" loading="lazy" decoding="async" /></span><span><b>${bossSnapshot.defeatedCount}/${bossSnapshot.total}</b><small>победы</small></span></a>
            <a href="#/items"><span class="slot hs-slot"><img src="assets/sprites/StarterBag.png" alt="" loading="lazy" decoding="async" /></span><span><b>${itemCount}</b><small>предметов</small></span></a>
            <a href="#/favorites"><span class="slot hs-slot"><img src="assets/sprites/HeavenfallenStardisk.png" alt="" loading="lazy" decoding="async" /></span><span><b>${favTotal}</b><small>в рюкзаке</small></span></a>
            <a href="${craftPlanTotal ? "#/crafts?plan=1" : "#/crafts"}"><span class="slot hs-slot"><img src="assets/sprites/Iron_Anvil.png" alt="" loading="lazy" decoding="async" /></span><span><b>${craftPlanTotal}</b><small>в плане</small></span></a>
          </div>
          <a class="hs-continue" href="#/novice?q=${currentQuest?.id || 1}"><span>${done.size === total ? "✓ маршрут пройден" : "▶ продолжить"}</span><b>Квест ${currentQuest?.id || 1} · ${esc(currentQuest?.title || "Начало пути")}</b></a>
        </aside>
      </section>
      <section class="home-command" aria-labelledby="home-command-title">
        <header class="home-command-head"><div><small>личный терминал</small><h2 id="home-command-title">Что делать дальше</h2></div><p>Кодекс собрал текущий квест, ближайший непобеждённый бой и сохранённый план крафта в одном месте.</p></header>
        <div class="home-command-grid">
          <a class="home-command-card quest" href="#/novice?q=${currentQuest?.id || 1}">
            <div class="home-command-card-head"><span class="slot"><img src="${escAttr(releaseAsset(currentQuestArt))}" alt="" loading="lazy" decoding="async" /></span><span><small>${done.size === total ? "маршрут завершён" : "текущий квест"}</small><b>${esc(currentQuest?.title || "Путь героя")}</b><i>Глава ${currentQuest?.id || 1}</i></span><em aria-hidden="true">→</em></div>
            <p>${esc(ruText(currentQuest?.objective || currentQuest?.subtitle || "Открой маршрут и продолжай прохождение по сохранённому этапу."))}</p>
            <div class="home-command-progress"><span><b>${done.size}</b> из ${total} квестов</span><output>${percent}%</output><i><u style="width:${percent}%"></u></i></div>
          </a>
          <a class="home-command-card boss" href="${nextBoss ? `#/bosses?q=${encodeURIComponent(nextBoss.name)}` : "#/bosses"}">
            <div class="home-command-card-head"><span class="slot"><img src="${escAttr(releaseAsset(nextBossArt))}" alt="" loading="lazy" decoding="async" /></span><span><small>${nextBoss ? (bossSnapshot.extrasMode ? "дополнительное испытание" : "следующий босс") : "бестиарий завершён"}</small><b>${esc(nextBoss?.name || "Все боссы побеждены")}</b><i>${nextBoss ? `Глава ${nextBoss.q}${bossSnapshot.targets.length > 1 ? ` · ещё ${bossSnapshot.targets.length - 1} на этапе` : ""}` : `${bossSnapshot.total} побед`}</i></span><em aria-hidden="true">→</em></div>
            <p>${nextBoss ? `<span>⌖ ${esc(ruText(nextBoss.where))}</span><span>✦ ${esc(ruText(nextBoss.summon))}</span>` : "Основные, скрытые и мини-боссы отмечены побеждёнными. Можно перейти к повторному фарму наград."}</p>
            <div class="home-command-progress"><span><b>${bossSnapshot.defeatedCount}</b> из ${bossSnapshot.total} побед</span><output>${bossPercent}%</output><i><u style="width:${bossPercent}%"></u></i></div>
          </a>
          <a class="home-command-card plan" href="#/crafts?plan=1">
            <div class="home-command-card-head"><span class="slot"><img src="${escAttr(releaseAsset("assets/sprites/Iron_Anvil.png"))}" alt="" loading="lazy" decoding="async" /></span><span><small>общий план крафта</small><b>${craftPlanTotal ? `${craftPlanTotal} ${craftPlanTotal === 1 ? "цель" : craftPlanTotal < 5 ? "цели" : "целей"}` : "План пока пуст"}</b><i>${craftPlanTotal ? `${recipeCraftCountLabel(craftPlanRuns)} суммарно` : "До 24 результатов"}</i></span><em aria-hidden="true">→</em></div>
            <p>${craftPlanTotal ? "Продолжи сбор общих базовых ресурсов, проверь станции или добавь ещё один результат из визуального рецепта." : "Добавляй предметы из визуальных рецептов — кодекс объединит одинаковые материалы и рассчитает реальные партии."}</p>
            <div class="home-command-plan-meta"><span><b>${craftPlanTotal}</b><small>целей</small></span><span><b>${craftPlanRuns}</b><small>крафтов</small></span><strong>${craftPlanTotal ? "Открыть смету" : "Создать план"}</strong></div>
          </a>
        </div>
      </section>
      <section class="home-strip">
        <div class="home-section-head">
          <div><small>Быстрый доступ</small><h2>Разделы кодекса</h2></div>
          <p>Три полки вместо общей свалки: прохождение, крафт и справка. Все данные работают без сети.</p>
        </div>
        <div class="jump-groups">
          ${jumpGroups.map((group) => `
            <section class="jump-group" aria-label="${escAttr(group.title)}">
              <header class="jump-group-head"><b>${esc(group.title)}</b><small>${esc(group.desc)}</small></header>
              <div class="jump-grid">
                ${group.links.map(([href, img, label, sub]) => `<a class="jump" data-dest="${escAttr(href.match(/^#\/([^?]+)/)?.[1] || "home")}" href="${href}"><span class="jump-icon slot"><img src="${img}" alt="" loading="lazy" decoding="async" /></span><span><small>${sub}</small><b>${label}</b></span></a>`).join("")}
              </div>
            </section>`).join("")}
        </div>
        <details class="secondary-shelf home-145-shelf">
          <summary><span><i aria-hidden="true">1.4.5</i><b>Что нового в Terraria 1.4.5 «Bigger &amp; Boulder»</b><small>Крупное обновление января 2026 · сейчас 1.4.5.7</small></span><em>обзор</em></summary>
          <div class="secondary-shelf-body">
            <div class="home-145-grid">
              <section><h4>Крафт и инвентарь</h4><ul>
                <li>Крафт берёт материалы из соседних сундуков; ПКМ по станции открывает её рецепты.</li>
                <li>Почти все предметы складываются до 9999 — включая оружие с префиксами.</li>
                <li>Массовая покупка и крафт партиями по 10 с зажатым Shift.</li>
              </ul></section>
              <section><h4>Бои и события</h4><ul>
                <li>Пилоны работают во время боссов и вторжений; мешки боссов видны на миникарте.</li>
                <li>Король и Королева слизней телепортируются на платформы; шиммер-неуязвимость не спасает от боссов.</li>
                <li>Команда /bossdamage показывает урон каждого игрока за бой; новая музыка у 8 боссов.</li>
              </ul></section>
              <section><h4>Новое содержимое</h4><ul>
                <li>Кроссовер Dead Cells: оружие всех классов, костюм Обезглавленного и Фонтан здоровья.</li>
                <li>Новые кнуты и префиксы призывателя, трансформации-маунты (мышь, крыса…), RC-машинка.</li>
                <li>Новые существа — Мох-зомби, Косатка, Рыба фугу, скелет-библиотекарь и мимики — уже в бестиарии кодекса.</li>
              </ul></section>
              <section><h4>Мир и удобство</h4><ul>
                <li>Дом больше не требует цельного блока; миньоны восстанавливаются после смерти.</li>
                <li>Грозы с молниями, новые фоны биомов, северное сияние и видимая рыба при рыбалке.</li>
                <li>Марсианская тарелка больше не числится боссом бестиария.</li>
              </ul></section>
            </div>
            <p class="home-145-note">Бестиарий мобов и лут-таблицы кодекса пересобраны по коду Terraria 1.4.5.0; каталог предметов и рецептов пока сверен с 1.4.4.9 — Calamity ${CODEX.version} остаётся модом для 1.4.4 и обновится вместе с tModLoader.</p>
          </div>
        </details>
        <details class="secondary-shelf home-help-shelf">
          <summary><span><i aria-hidden="true">?</i><b>Как пользоваться кодексом</b><small>Три шага: маршрут → босс → крафт</small></span><em>3 шага</em></summary>
          <div class="secondary-shelf-body">
            <ol class="home-help-steps">
              <li><b>Иди по «Пути новичка»</b><p>30 квестов ведут от первого дома до финала. Отмечай задачи — прогресс сохраняется, и главная всегда показывает, где ты остановился.</p></li>
              <li><b>Готовься к следующему боссу</b><p>Бестиарий сам подсказывает ближайшую непобеждённую цель, место боя и предмет призыва. После победы отметь её — появится следующая.</p></li>
              <li><b>Собирай снаряжение через «Полное дерево»</b><p>Выбери любой предмет — кодекс развернёт все ингредиенты до базовых ресурсов и соберёт общий план крафта со сметой материалов.</p></li>
            </ol>
          </div>
        </details>
        <details class="secondary-shelf home-era-shelf">
          <summary><span><i aria-hidden="true">IV</i><b>Эпохи прохождения</b><small>Краткий порядок противников и снаряжения</small></span><em>4 этапа</em></summary>
          <div class="secondary-shelf-body"><div class="era-grid">${CODEX.eras.map((e, index) => `<article class="era-card panel" data-era="${escAttr(e.id)}"><span class="era-no" aria-hidden="true">0${index + 1}</span><h3>${e.title}</h3><ol>${e.items.map((i) => `<li>${i}</li>`).join("")}</ol><a class="era-link" href="#/bosses?era=${escAttr(e.id)}">Боссы эпохи →</a></article>`).join("")}</div></div>
        </details>
      </section>
    `;
  }

  function questProgress() {
    const s = store.get();
    return { done: new Set((s.doneQuests || []).map(Number)), tasks: s.tasks || {}, cls: s.cls || "melee", itemFilter: s.itemFilter || "mine" };
  }

  const esc = (s) => String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escAttr = (s) => esc(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  /* Транслитерация: русский запрос находит и английские названия. */
  const RU_LAT = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya" };
  const ruToLat = (s) => String(s || "").toLocaleLowerCase("ru").split("").map((ch) => (RU_LAT[ch] !== undefined ? RU_LAT[ch] : ch)).join("");
  function matchesSearch(blob, q) {
    if (!q) return true;
    const lower = blob.toLocaleLowerCase("ru");
    if (lower.includes(q)) return true;
    // Транслитерация только для осмысленных кириллических запросов (>= 3 букв):
    // иначе «а» → «a» и подсвечивает почти каждый предмет.
    if (/[а-яё]/.test(q) && q.length >= 3) {
      const qLat = ruToLat(q);
      if (qLat && qLat !== q) {
        return lower.includes(qLat) || ruToLat(lower).includes(qLat);
      }
    }
    return false;
  }
  let RU_NAMES = window.CALAMITY_RU_NAMES || { byId: {}, byName: {}, translate: (name) => name, text: (text) => text };
  let VANILLA_RU_BY_ID = (window.CALAMITY_VANILLA_RU && (window.CALAMITY_VANILLA_RU.names || window.CALAMITY_VANILLA_RU.byId)) || [];
  let VANILLA_RU_TOOLTIPS_BY_ID = (window.CALAMITY_VANILLA_RU && window.CALAMITY_VANILLA_RU.tooltips) || [];
  const EXACT_RU_NAMES = new Map();
  Object.values(CODEX.lex || {}).forEach((entry) => {
    [entry.en, entry.ru, ...(entry.aliases || [])].filter(Boolean).forEach((name) => EXACT_RU_NAMES.set(String(name).toLocaleLowerCase("ru"), entry.ru));
  });
  function ruItemName(value, record) {
    const raw = typeof value === "object" ? (value.name || "") : String(value || "");
    const item = typeof value === "object" ? value : record;
    if (item && item.nameRu) return item.nameRu;
    if (item && item.vanilla && VANILLA_RU_BY_ID[String(item.id)]) return VANILLA_RU_BY_ID[String(item.id)];
    const exact = EXACT_RU_NAMES.get(raw.toLocaleLowerCase("ru"));
    if (exact && /[А-Яа-яЁё]/.test(exact)) return exact;
    if (item && item.id && RU_NAMES.byId[item.id]) return RU_NAMES.byId[item.id];
    ensureVanillaItems();
    const vanillaName = VANILLA_RU_BY_NAME.get(normalizeArtName(raw));
    if (vanillaName) return vanillaName;
    if (RU_NAMES.byName[raw]) return RU_NAMES.byName[raw];
    return RU_NAMES.translate(raw);
  }
  const ruText = (value) => RU_NAMES.text(value);
  const plainName = (name) => {
    const ru = ruItemName(name);
    const en = /[A-Za-z]/.test(String(name)) && String(name) !== ru ? String(name) : "";
    return { ru, en };
  };
  function catalogItemSearchBlob(item) {
    if (item.searchBlob) return item.searchBlob;
    const npcNames = (NPC_SOURCES[item.id]?.npcs || []).map((drop) => `${drop.npc} ${npcRuName(drop.npc)}`).join(" ");
    const bossNames = bossRelationsFor(item).map(({ boss, type }) => `${boss.name} ${boss.en || ""} ${boss.id} ${BOSS_RELATION_LABELS[type] || ""}`).join(" ");
    item.searchBlob = `${item.name} ${ruItemName(item)} ${item.id} ${item.group} ${item.description} ${item.tooltip} ${item.obtain || ""} ${KIND_RU[item.kind] || ""} ${CLS_RU[item.cls] || ""} ${CATALOG_LEX.get(normalizeArtName(item.name)) || ""} ${npcNames} ${bossNames}`.toLocaleLowerCase("ru");
    return item.searchBlob;
  }
  function ruRecipePart(value) {
    const raw = String(value || "").trim();
    const match = raw.match(/^(\d+(?:[.,]\d+)?\s*[×x]?\s*)(.+)$/);
    const amount = match ? match[1].trim() : "";
    const item = match ? match[2].trim() : raw;
    const translated = ruItemName(item);
    const label = translated && translated !== item ? translated : ruText(item);
    return amount ? `${amount} ${label}` : label;
  }
  const splitIngs = (s) => {
    if (Array.isArray(s)) return s.map((x) => String(x).trim()).filter(Boolean);
    const raw = String(s || "").replace(/\s*@\s*.+$/, "").trim();
    if (!raw) return [];
    const parts = raw.split(/\s+\+\s+/).map((x) => x.trim()).filter(Boolean);
    if (parts.length >= 2 && parts.every((p) => p.length < 72)) return parts;
    return [raw];
  };
  const pullStation = (c) => {
    let station = String(c.station || "").trim();
    let ings = String(c.ings || c.r || "").trim();
    const at = ings.match(/\s*@\s*(.+)$/);
    if (at) {
      if (!station) station = at[1].trim();
      ings = ings.replace(/\s*@\s*.+$/, "").trim();
    }
    const pref = ings.match(/^(Печь|Верстак|Наковальня|Железная наковальня|Свинцовая наковальня|Алтарь зла|Алтарь|Адская кузня|Хардмод-наковальня|Мифриловая наковальня|Книжный шкаф|Манипулятор|Древний манипулятор|Космическая наковальня|Кузня Дрейдона|Взломостойка|Мастерская|Мастерская гоблина|Алхимия \/ наковальня|Алтарь \/ наковальня)[:：]\s*(.+)$/i);
    if (pref) {
      if (!station) station = pref[1];
      ings = pref[2];
    }
    return { station, ings };
  };
  let catalogArtCache;
  function catalogArtIndex() {
    if (catalogArtCache) return catalogArtCache;
    catalogArtCache = new Map();
    indexedItems().forEach((item) => {
      const key = normalizeArtName(item.name);
      if (item.image && key && !catalogArtCache.has(key)) catalogArtCache.set(key, `assets/item-sprites/${encodeURIComponent(item.id)}.png`);
    });
    return catalogArtCache;
  }
  // Generic craft entries that describe a family of items rather than one
  // item; they get a representative genuine sprite instead of the anvil.
  const CRAFT_ART = {
    "Wulfrum оружие": "assets/sprites/WulfrumScrewdriver.png",
    "Emblem своего класса + Rogue Emblem": "assets/sprites/RogueEmblem.png",
    "Наковальня": "assets/sprites/Iron_Anvil.png",
    "Оружие вульфрума своего класса": "assets/sprites/WulfrumScrewdriver.png",
    "Взломостойка": "assets/sprites/CodebreakerBase.png",
    "Оружие из призм своего класса": "assets/sprites/SeaPrism.png",
    "Виктайд — нагрудник и штаны": "assets/sprites/VictideBreastplate.png",
    "Шлем СВОЕГО класса": "assets/sprites/VictideHeadMelee.png",
    "Еда червя или кровавый позвоночник": "assets/sprites/Worm_Food.png",
    "Зелья на бой": "assets/sprites/BloodOrb.png",
    "Святая броня": "assets/sprites/Hallowed_Bar.png",
    "Бездонный костюм": "assets/sprites/AbyssalDivingGear.png",
    "Чумная броня": "assets/sprites/PlaguebringerCarapace.png",
    "Приманка голиафа": "assets/sprites/Abombination.png",
    "Люминитовая кирка": "assets/sprites/Luminite_Bar.png",
    "Богоубийца или сильва": "assets/sprites/GodSlayerChestplate.png",
    "Охлаждающая ячейка": "assets/sprites/AuricQuantumCoolingCell.png",
    "Материя чуда → экзо-оружие": "assets/sprites/Exoblade.png",
    "Остатки рецептов тенеспека": "assets/sprites/ShadowspecBar.png"
  };
  const STATION_DISPLAY_RU = {
    "Sawmill": "лесопилка",
    "Demon Altar": "алтарь зла",
    "Crimson Altar": "багряный алтарь",
    "Work Bench": "верстак",
    "Furnace": "печь",
    "Hellforge": "адская печь",
    "Iron Anvil": "железная наковальня",
    "Lead Anvil": "свинцовая наковальня",
    "Mythril Anvil": "мифриловая наковальня",
    "Orichalcum Anvil": "орихалковая наковальня",
    "Adamantite Forge": "адамантитовая кузня",
    "Titanium Forge": "титановая кузня",
    "Alchemy Table": "алхимический стол",
    "Placed Bottle": "поставленная бутылка",
    "Tinkerer's Workshop": "мастерская изобретателя",
    "Ancient Manipulator": "древний манипулятор",
    "Crystal Ball": "хрустальный шар",
    "Imbuing Station": "станция наполнения",
    "Sky Mill": "небесная мельница",
    "Living Loom": "живой ткацкий станок",
    "Glass Kiln": "стеклоплавильная печь",
    "Ashen Altar": "пепельный алтарь",
    "S Cal Altar": "алтарь проклятых",
    "Kegs": "бочонок",
    "Plague Infuser": "чумной инфузор",
    "Profaned Crucible": "осквернённый тигель"
  };
  function stationDisplayName(station) {
    const raw = String(station || "").trim();
    return STATION_DISPLAY_RU[raw] || ruText(raw);
  }
  function craftStationSprite(station) {
    const s = String(station || "").toLocaleLowerCase("ru");
    if (s.includes("дрейдон") && s.includes("кузн") || s.includes("draedon") && s.includes("forge")) return "assets/item-sprites/DraedonsForge.png";
    if (s.includes("конденсатор") || s.includes("void condenser")) return "assets/item-sprites/VoidCondenser.png";
    if (s.includes("космическ") || s.includes("cosmic")) return "assets/sprites/CosmicAnvilItem.png";
    if (s.includes("манипулятор") || s.includes("manipulator")) return "assets/lex/vanilla/ancient-manipulator.png";
    if (s.includes("мастерск") || s.includes("tinkerer")) return "assets/lex/vanilla/tinkerers-workshop.png";
    if (s.includes("тяжёл") || s.includes("heavy work")) return "assets/vanilla-sprites/2172.png";
    if (s.includes("адск") && s.includes("печ") || s.includes("hellforge")) return "assets/lex/vanilla/hellforge.png";
    if (s.includes("адамант") || s.includes("adamantite")) return "assets/vanilla-sprites/524.png";
    if (s.includes("титан") || s.includes("titanium")) return "assets/vanilla-sprites/1221.png";
    if (s.includes("алхим") || s.includes("alchemy")) return "assets/sprites/Alchemy_Table.png";
    if (s.includes("поставлен") || s.includes("placed bottle")) return "assets/vanilla-sprites/31.png";
    if (s.includes("лесопил") || s.includes("sawmill")) return "assets/vanilla-sprites/363.png";
    if (s.includes("живой ткац") || s.includes("living loom")) return "assets/vanilla-sprites/2196.png";
    if (s.includes("ткац") || s === "loom" || s.includes(" loom")) return "assets/vanilla-sprites/332.png";
    if (s.includes("книжн") || s.includes("bookcase")) return "assets/vanilla-sprites/354.png";
    if (s.includes("хрустальн") || s.includes("crystal ball")) return "assets/vanilla-sprites/487.png";
    if (s.includes("наполнен") || s.includes("imbuing")) return "assets/vanilla-sprites/1430.png";
    if (s.includes("красиль") || s.includes("dye vat")) return "assets/vanilla-sprites/1120.png";
    if (s.includes("cauldron")) return "assets/vanilla-sprites/1791.png";
    if (s.includes("кот") || s.includes("cooking pot")) return "assets/vanilla-sprites/345.png";
    if (s.includes("бочон") || s.includes("keg")) return "assets/vanilla-sprites/352.png";
    if (s.includes("чайник") || s.includes("teapot")) return "assets/vanilla-sprites/5008.png";
    if (s.includes("автокуз") || s.includes("autohammer")) return "assets/vanilla-sprites/1551.png";
    if (s.includes("blend-o-matic")) return "assets/vanilla-sprites/995.png";
    if (s.includes("meat grinder")) return "assets/vanilla-sprites/996.png";
    if (s.includes("bone welder")) return "assets/vanilla-sprites/2192.png";
    if (s.includes("glass kiln")) return "assets/vanilla-sprites/2194.png";
    if (s.includes("honey dispenser")) return "assets/vanilla-sprites/2204.png";
    if (s.includes("ice machine")) return "assets/vanilla-sprites/2198.png";
    if (s.includes("sky mill")) return "assets/vanilla-sprites/2197.png";
    if (s.includes("solidifier")) return "assets/vanilla-sprites/998.png";
    if (s.includes("decay chamber")) return "assets/vanilla-sprites/4142.png";
    if (s.includes("flesh cloning vat")) return "assets/vanilla-sprites/2193.png";
    if (s.includes("steampunk boiler")) return "assets/vanilla-sprites/2203.png";
    if (s.includes("lihzahrd furnace")) return "assets/vanilla-sprites/2195.png";
    if (s.includes("water") || s.includes("вод")) return "assets/vanilla-sprites/206.png";
    if (s.includes("lava") || s.includes("лав")) return "assets/vanilla-sprites/207.png";
    if (s.includes("honey") || s.includes("мёд")) return "assets/vanilla-sprites/1128.png";
    if (s.includes("стол") && s.includes("стул") || s.includes("table and chair")) return "assets/vanilla-sprites/32.png";
    if (s.includes("алтарь") || s.includes("altar")) return "assets/lex/vanilla/demon-altar.png";
    if (s.includes("мифрил") || s.includes("mythril") || s.includes("орихалк") || s.includes("orichalcum")) return "assets/lex/vanilla/mythril-anvil.png";
    if (s.includes("наковальн") || s.includes("anvil")) return "assets/lex/vanilla/iron-anvil.png";
    if (s.includes("печ") || s.includes("furnace")) return "assets/sprites/Furnace.png";
    if (s.includes("верстак") || s.includes("workbench") || s.includes("work bench")) return "assets/sprites/Work_Bench.png";
    return "assets/sprites/Work_Bench.png";
  }
  function craftCard(c) {
    const src = c.t ? { name: c.t, ings: c.r, why: c.w, station: c.station } : c;
    const { ru, en } = plainName(src.name);
    const pulled = pullStation(src);
    const ings = splitIngs(pulled.ings);
    const why = String(src.why || "").trim();
    const station = pulled.station;
    const cleanName = String(src.name).replace(/\s*\([^)]*\)\s*$/, "").trim();
    const bossLinks = bossRelationsFor({ name: cleanName });
    const whyWithBosses = withBossRelationDescription(ruText(why), bossLinks);
    const nameKey = normalizeArtName(cleanName.split(/\s*\/\s*/)[0]);
    const detail = detailedNameMap().get(cleanName.toLocaleLowerCase("ru"));
    const art = catalogArtIndex().get(nameKey)
      || CRAFT_ART[cleanName]
      || (detail ? spriteOfFixed(detail) : "")
      || resolveArt(cleanName)
      || craftStationSprite(station);
    // Русские имена ингредиентов в квестах: точные EN-оригиналы по позиции.
    // В первую очередь берём рецепт из полного каталога (точные имена), иначе rec маршрута.
    getRecipeIndex();
    const catRecipe = catalogByName(cleanName);
    const visualRecipe = visualRecipeFor(catRecipe ? `catalog:${catRecipe.id}` : cleanName);
    const catIngNames = visualRecipe ? visualRecipe.ings.map((i) => i.name) : [];
    const recIngNames = detail && detail.rec ? splitIngs(String(detail.rec)
      .replace(/\s*@\s*.+$/, "")
      .replace(/\s+(?:у|на)\s+(?:железной|свинцовой|мифриловой|орихалковой|космической|адской|алхимическом|ткацком|тяжёлом|книжном)?\s*(?:наковальне|верстаке|печи|кузне|алтаре|столе|манипуляторе|конденсаторе|шкафу|мастерской|станции|взломостойке)\s*\.?$/, "")) : [];
    const enIngs = catIngNames.length ? catIngNames : recIngNames;
    const cleanIng = (x) => String(x)
      .replace(/^\d+(?:[.,]\d+)?\s*(?:[×x]\s*)?/, "")
      .replace(/\s+и\s+/g, " / ")
      .replace(/[.,;:]$/, "")
      .trim();
    const icons = ings.map((x, i) => {
      const enName = enIngs[i] ? cleanIng(enIngs[i]) : "";
      const clean = enName || cleanIng(x);
      const hit = resolveArt(clean) || (enName ? resolveArt(cleanIng(x)) : "");
      return hit
        ? `<img class="ings-icon" src="${escAttr(hit)}" alt="" loading="lazy" decoding="async" />`
        : `<span class="ings-bullet" aria-hidden="true">+</span>`;
    });
    return `<article class="card craft-card">
      <div class="card-shot slot craft-shot" data-kind="tool">
        ${art ? `<span class="shot-window"><img src="${escAttr(art)}" alt="" loading="lazy" decoding="async" /></span>` : unavailableArt("tool")}
        ${favoriteButton("craft", src.name, ru)}
      </div>
      <div class="card-body">
        ${station ? `<span class="station-tag"><img src="${escAttr(craftStationSprite(station))}" alt="" loading="lazy" decoding="async" /><span>${esc(stationDisplayName(station))}</span></span>` : ""}
        <div class="card-title">${esc(ru)}${en ? `<span class="en-sub">оригинал: ${esc(en)}</span>` : ""}</div>
        <details class="card-facts-shelf craft-facts-shelf">
          <summary><span><b>Ингредиенты и назначение</b><small>${ings.length} позиций · ${station ? esc(stationDisplayName(station)) : "без станции"}</small></span><i aria-hidden="true">⌄</i></summary>
          ${ings.length ? `<ul class="ings-list">${ings.map((x, i) => {
      const enName = enIngs[i] ? cleanIng(enIngs[i]) : "";
      const ingKey = enName || cleanIng(x);
      return `<li class="ing" data-ing="${escAttr(ingKey)}" tabindex="0" role="button" aria-label="Подробнее об ингредиенте: ${escAttr(ruItemName(ingKey))}">${icons[i]}<span>${esc(ruRecipePart(x))}</span></li>`;
    }).join("")}</ul>` : ""}
          ${whyWithBosses || bossLinks.length ? `<div class="facts">${whyWithBosses ? `<div class="fact"><span>Зачем</span><p>${esc(whyWithBosses)}</p></div>` : ""}${bossRelationsHTML(bossLinks)}</div>` : ""}
        </details>
        <div class="card-actions">
          ${fullTreeLink(catRecipe ? `catalog:${catRecipe.id}` : cleanName)}
          ${visualRecipe ? `<button class="recipe-btn" type="button" data-recipe="${escAttr(cleanName)}"><span aria-hidden="true">⚒</span> Визуальный рецепт</button>${craftPlanActionButton(catRecipe ? `catalog:${catRecipe.id}` : cleanName)}` : ""}
          ${catRecipe ? `<a class="craft-catalog-link" href="#/items?s=${encodeURIComponent(catRecipe.name)}" title="Открыть полную карточку в каталоге">в каталоге ↗</a>` : ""}
        </div>
      </div>
    </article>`;
  }
  function biomeCard(b) {
    const title = b.name;
    const en = b.en || "";
    const loot = Array.isArray(b.loot) ? b.loot : String(b.loot || "").split(/,\s*/).filter(Boolean);
    const d = String(b.danger || "");
    const lvl = b.dangerLvl || (/смерт/i.test(d) ? "dead" : /высок/i.test(d) ? "high" : /средн/i.test(d) ? "mid" : "low");
    const MOB_GROUP_BY_BIOME = {
      "Затонувшее море": "sunken-sea", "Сернистое море": "sulphur-sea", "Бездна": "abyss",
      "Серный кратер": "crags", "Астральная инфекция": "astral", "Пустыня": "desert",
      "Чистый океан": "ocean", "Данж": "dungeon", "Ад": "underworld", "Джунгли": "jungle",
      "Снега": "snow", "Порча и багрянец": "corruption", "Святые земли": "hallow", "Грибной биом": "mushroom"
    };
    const mobGroupId = MOB_GROUP_BY_BIOME[b.name] || "";
    return `<article class="card biome-card">
      <button class="biome-shot lazy-bg" type="button" data-bg="${escAttr(b.img || "assets/hero.webp")}" data-biome-view="${escAttr(b.name)}" style="filter:${b.filter || "none"}" aria-label="Открыть изображение биома: ${escAttr(b.name)}">
        <span class="danger-pill ${lvl}">${esc(d)}</span>
        <span class="biome-zoom" aria-hidden="true">⛶</span>
      </button>
      <div class="body">
        <h3>${esc(title)}</h3>
        ${en ? `<span class="en-sub">в игре: ${esc(en)}</span>` : ""}
        ${b.desc ? `<p class="desc">${esc(ruText(b.desc))}</p>` : ""}
        <div class="facts">
          ${b.where ? `<div class="fact"><span>Где</span><p>${esc(ruText(b.where))}</p></div>` : ""}
          ${b.when ? `<div class="fact"><span>Когда</span><p>${esc(ruText(b.when))}</p></div>` : ""}
          ${loot.length ? `<div class="fact"><span>Лут</span><div class="loot-chips">${loot.map((x) => `<em>${esc(ruText(x))}</em>`).join("")}</div></div>` : ""}
          ${b.need ? `<div class="fact"><span>Бери</span><p>${esc(ruText(b.need))}</p></div>` : ""}
          ${b.tip ? `<div class="fact"><span>Совет</span><p>${esc(ruText(b.tip))}</p></div>` : ""}
        </div>
        ${mobGroupId ? `<div class="card-links"><a href="#/mobs?g=${escAttr(mobGroupId)}">Жители биома в бестиарии →</a></div>` : ""}
      </div>
    </article>`;
  }

  let lazyBackgroundObserver = null;
  function bindLazyBackgrounds(root) {
    if (lazyBackgroundObserver) lazyBackgroundObserver.disconnect();
    const nodes = [...(root || document).querySelectorAll(".lazy-bg[data-bg]")];
    const reveal = (node) => {
      if (!node || !node.dataset.bg) return;
      node.style.backgroundImage = `url("${node.dataset.bg.replace(/"/g, "%22")}")`;
      node.classList.add("loaded");
      delete node.dataset.bg;
    };
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(reveal);
      return;
    }
    lazyBackgroundObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "500px 0px" });
    nodes.forEach((node) => lazyBackgroundObserver.observe(node));
  }

  const SPRITE_FIX = {
    "Wooden Sword / Bow / Staff из мешка": "Wooden_Sword",
    "Hermes / Flurry / Sailfish / Dunerider Boots": "Hermes_Boots",
    "Cloud / Blizzard / Sandstorm in a Bottle": "Cloud_in_a_Bottle",
    "Wulfrum Hat & Goggles": "WulfrumHat",
    "Wulfrum Jacket": "Wulfrum_Jacket",
    "Wulfrum Overalls": "Wulfrum_Overalls",
    "Wulfrum Blade / Screwdriver": "WulfrumScrewdriver",
    "Wulfrum Bow / Blunderbuss": "WulfrumBlunderbuss",
    "Wulfrum Prosthesis / Staff": "WulfrumProsthesis",
    "Железная / свинцовая наковальня": "Iron_Anvil",
    "Кровать": "Bed",
    "Dubious Plating / Mysterious Circuitry": "Dubious_Plating",
    "Enchanted Sword / Terragrim": "Enchanted_Sword",
    "Worm Food": "Worm_Food",
    "Musket / The Undertaker": "Musket",
    "Vilethorn / Crimson Rod": "Vilethorn",
    "Ball O' Hurt / The Meatball": "Ball_O'_Hurt",
    "Bee Gun / Bee's Knees / Hive-Five": "Bee_Gun",
    "Muramasa / Aqua Scepter / Magic Missile / Handgun": "Muramasa",
    "Warrior / Ranger / Sorcerer / Summoner / Rogue Emblem": "Warrior_Emblem",
    "Cobalt / Palladium armor": "Cobalt_Breastplate",
    "Frostspark / Lightning / Terraspark Boots": "Terraspark_Boots",
    "Soul of Sight": "Soul_of_Sight",
    "Seedler / Pygmy Staff / Venus Magnum / Leaf Blower": "Seedler",
    "Tsunami / Razorblade Typhoon / Tempest Staff / Flairon": "Tsunami",
    "Empress оружия / Terraprisma": "Terraprisma",
    "Soaring Insignia / Wings Empress": "Soaring_Insignia",
    "Celestial Sigil / столбы": "Celestial_Sigil",
    "Solar / Vortex / Nebula / Stardust / Empyrean armor": "Solar_Flare_Breastplate",
    "Mycoroot / Hyphae Rod / Fungicide": "Mycoroot",
    "Acid Gun / Toxibow": "Toxibow",
    "Slimy Saddle / Hook": "Slimy_Saddle",
    "Chlorophyte armor / оружие": "Chlorophyte_Plate_Mail",
    "Plaguebringer / Plague Reaper armor": "PlaguebringerCarapace",
    "God Slayer / Silva armor": "GodSlayerChestplate"
  };
  function unavailableArt(kind = "misc") {
    const mark = ITEM_KIND_MARK[kind] || "·";
    return `<span class="sprite-unavailable" aria-label="Официальный спрайт не найден"><b aria-hidden="true">${esc(mark)}</b><small>нет спрайта</small></span>`;
  }


  // Точечные исправления: эти карточки раньше показывали чужой спрайт
  // (например, Ashes of Calamity выводил логотип мода). Теперь — точные
  // официальные текстуры из полного каталога.
  const GUIDE_ART_FIX = {
    "Ashes of Calamity": "assets/item-sprites/AshesofCalamity.png",
    "Core of Calamity": "assets/item-sprites/CoreofCalamity.png",
    "Prism Shard": "assets/item-sprites/PrismShard.png"
  };
  const spriteOfFixed = (it) => {
    if (it && GUIDE_ART_FIX[it.name]) return GUIDE_ART_FIX[it.name];
    return CODEX.spriteOf ? CODEX.spriteOf(it) : "";
  };

  /* ---------- граф рецептов: дерево крафта и подсказки ингредиентов ---------- */
  const CATALOG_BY_NORM = new Map();
  const CATALOG_BY_ID = new Map();
  const GUIDE_BY_NORM = new Map();
  const CATALOG_LEX = new Map();
  function buildNameIndexes() {
    if (CATALOG_BY_NORM.size) return;
    indexedItems().forEach((it) => {
      const k = normalizeArtName(it.name);
      if (k && !CATALOG_BY_NORM.has(k)) CATALOG_BY_NORM.set(k, it);
      CATALOG_BY_ID.set(String(it.id), it);
    });
    (CODEX.items || []).forEach((it) => {
      [it.name, it.nameRu].forEach((n) => {
        const k = normalizeArtName(n);
        if (k && !GUIDE_BY_NORM.has(k)) GUIDE_BY_NORM.set(k, it);
      });
    });
    // Русские имена/алиасы словаря для поиска по каталогу («кровать» → Bed)
    CATALOG_BY_NORM.forEach((it, k) => {
      const lex = exactLexLookup(it.name);
      if (lex) CATALOG_LEX.set(k, `${lex.ru} ${lex.en} ${(lex.aliases || []).join(" ")} ${ruItemName(it)}`);
      else CATALOG_LEX.set(k, ruItemName(it));
    });
  }

  const STATION_RX = /^(Печь|Верстак|Наковальня|Железная наковальня|Свинцовая наковальня|Алтарь зла|Алтарь|Адская кузня|Хардмод-наковальня|Мифриловая наковальня|Орихалковая наковальня|Книжный шкаф|Манипулятор|Древний манипулятор|Космическая наковальня|Кузня Дрейдона|Взломостойка|Мастерская|Мастерская гоблина|Алхимический стол|Алхимия|Ткацкий станок|Тяжёлый верстак|Конденсатор пустоты|Стационарный конденсатор|Алтарь \/ наковальня)[:：]\s*(.+)$/i;

  function parseIngredientList(rest) {
    const out = [];
    String(rest || "").split(/\s+\+\s+/).forEach((p) => {
      const em = p.match(/^ещё\s+(\d+(?:[.,]\d+)?)$/i);
      if (em) {
        // «X + ещё N» — добавить к количеству предыдущего ингредиента
        if (out.length) {
          const prev = out[out.length - 1];
          prev.count = String((parseFloat(prev.count || "1") + parseFloat(em[1].replace(",", "."))));
        }
        return;
      }
      const pm = p.match(/^(\d+(?:[.,]\d+)?)\s*[×x]\s*(.+)$/);
      const russianAmount = p.match(/^(\d+(?:[.,]\d+)?)\s+([А-Яа-яЁё].+)$/);
      if (pm) out.push({ count: pm[1].replace(",", "."), name: pm[2].replace(/[.,;:]$/, "").trim() });
      else if (russianAmount) out.push({ count: russianAmount[1].replace(",", "."), name: russianAmount[2].replace(/[.,;:]$/, "").trim() });
      else out.push({ count: null, name: p.replace(/[.,;:]$/, "").trim() });
    });
    return out.filter((i) => i.name && normalizeArtName(i.name) !== "recipe system");
  }

  function parseRecipeText(text, station) {
    const raw = String(text || "").trim();
    if (!raw) return null;
    let m = raw.match(/^Скрафтить из:\s*(.+?)\s*\.?\s*$/i);
    if (m) return { ings: parseIngredientList(m[1]), station: station || "" };
    m = raw.match(/^Скрафтить:\s*(.+)$/i);
    if (m) {
      let rest = m[1].trim();
      let st = station || "";
      const at = rest.match(/^(.*?)\s*[·•]\s*(?:у|на|в)\s+(.+?)\.?\s*$/);
      if (at) { rest = at[1].trim(); st = st || at[2].trim(); }
      const ings = parseIngredientList(rest);
      if (ings.length) return { ings, station: st };
      return null;
    }
    // «Станция: ингредиенты» — формат квестовых рецептов
    const stm = raw.match(STATION_RX);
    if (stm) return { ings: parseIngredientList(stm[2]), station: stm[1].trim() };
    // В локальном списке рекомендаций часть рецептов хранится без слова
    // «Скрафтить». Если есть явное «+», это всё равно надёжный рецепт;
    // расплывчатые строки «по рецепту в игре» намеренно не превращаем в
    // выдуманные ингредиенты.
    const loose = raw.replace(/\s*@\s*(.+)$/, "").trim();
    if (/[+×x]/.test(loose) && !/по рецепту|зависит от|материалы .* игре/i.test(loose)) {
      const ings = parseIngredientList(loose);
      if (ings.length > 1) return { ings, station: station || "" };
    }
    return null;
  }

  let recipeCycleCuts = new Set();
  function recipeDependencyKey(ingredient) {
    const forced = String(ingredient?.key || "").match(/^vanilla:(\d+)$/i);
    if (forced) return normalizeArtName(VANILLA_BY_ID.get(String(forced[1]))?.name || ingredient.name);
    return normalizeArtName(ingredient?.name || ingredient?.key || "");
  }
  function recipeDerivedScore(name) {
    const low = normalizeArtName(name);
    if (/\bplatform\b|\bплатформ/.test(low)) return 140;
    if (/\bwall\b|\bстен/.test(low)) return 125;
    if (/^(wet|lava|honey) (bomb|rocket)/.test(low)) return 110;
    if (/^dry (bomb|rocket)/.test(low)) return 10;
    if (/platinum coin|платинов.*монет/.test(low)) return 80;
    if (/gold coin|золот.*монет/.test(low)) return 60;
    if (/silver coin|серебр.*монет/.test(low)) return 40;
    if (/copper coin|медн.*монет/.test(low)) return 20;
    return 50;
  }
  function findRecipeCycles(index) {
    let cursor = 0;
    const stack = [];
    const onStack = new Set();
    const positions = new Map();
    const lows = new Map();
    const cycles = [];
    const visit = (node) => {
      positions.set(node, cursor);
      lows.set(node, cursor);
      cursor += 1;
      stack.push(node);
      onStack.add(node);
      (index.get(node)?.ings || []).forEach((ingredient) => {
        const next = recipeDependencyKey(ingredient);
        if (!index.has(next)) return;
        if (!positions.has(next)) {
          visit(next);
          lows.set(node, Math.min(lows.get(node), lows.get(next)));
        } else if (onStack.has(next)) {
          lows.set(node, Math.min(lows.get(node), positions.get(next)));
        }
      });
      if (lows.get(node) !== positions.get(node)) return;
      const component = [];
      let current;
      do {
        current = stack.pop();
        onStack.delete(current);
        component.push(current);
      } while (current !== node);
      const selfCycle = component.length === 1 && (index.get(node)?.ings || []).some((ingredient) => recipeDependencyKey(ingredient) === node);
      if (component.length > 1 || selfCycle) cycles.push(component);
    };
    index.forEach((_, node) => { if (!positions.has(node)) visit(node); });
    return cycles;
  }
  function pruneRecipeCycles(index) {
    recipeCycleCuts.clear();
    const snapshot = new Map(index);
    snapshot.forEach((recipe, result) => {
      const resultScore = recipeDerivedScore(result);
      const shouldCut = (recipe.ings || []).some((ingredient) => {
        const dependency = recipeDependencyKey(ingredient);
        const reverse = snapshot.get(dependency);
        if (!reverse) return false;
        const reciprocal = (reverse.ings || []).some((part) => recipeDependencyKey(part) === result);
        return reciprocal && resultScore <= recipeDerivedScore(dependency);
      });
      if (shouldCut) recipeCycleCuts.add(result);
    });
    recipeCycleCuts.forEach((key) => index.delete(key));
    // Защита от циклов длиннее двух узлов: каждый проход превращает самый
    // базовый узел компоненты в лист. Повторяем, пока граф не станет DAG.
    let cycles = findRecipeCycles(index);
    while (cycles.length) {
      cycles.forEach((component) => {
        const cut = [...component].sort((a, b) => recipeDerivedScore(a) - recipeDerivedScore(b) || a.localeCompare(b, "en"))[0];
        recipeCycleCuts.add(cut);
        index.delete(cut);
      });
      cycles = findRecipeCycles(index);
    }
  }

  let recipeIndex = null;
  let visualRecipeIndex = null;
  function getRecipeIndex() {
    if (recipeIndex) return recipeIndex;
    ensureVanillaRecipes();
    buildNameIndexes();
    recipeIndex = new Map();
    const add = (name, text, station, resultYield = 1) => {
      const parsed = parseRecipeText(text, station);
      if (!parsed) return;
      parsed.yield = Math.max(1, Number(resultYield || 1));
      const key = normalizeArtName(name);
      if (key && !recipeIndex.has(key)) recipeIndex.set(key, parsed);
    };
    indexedItems().forEach((it) => {
      if (/^Скрафтить/i.test(it.obtain || "")) add(it.name, it.obtain, "", it.recipeYield);
    });
    (CODEX.crafts || []).forEach((c) => add(c.name || c.t, c.ings || c.r || "", c.station || ""));
    CODEX.quests.forEach((q) => (q.crafts || []).forEach((c) => {
      const t = c.t || c.name || "";
      const detail = detailedNameMap().get(String(t).replace(/\s*\([^)]*\)\s*$/, "").trim().toLocaleLowerCase("ru"));
      // Русский текст квеста не парсится по именам предметов — берём EN-двойник из маршрута.
      const enText = detail && detail.rec ? detail.rec : (c.r || c.ings || "");
      add(t, enText, c.station || "");
    }));
    VANILLA_RECIPE_BY_ID.forEach((recipe, resultId) => {
      const item = VANILLA_BY_ID.get(String(resultId));
      const key = item && normalizeArtName(item.name);
      if (key && !recipeIndex.has(key)) recipeIndex.set(key, { ings: recipe.ings, station: vanillaStationName(recipe.station), yield: Math.max(1, Number(recipe.yield || 1)) });
    });
    Object.entries(EXTRA_RECIPE_DEFS).forEach(([name, recipe]) => {
      const key = normalizeArtName(name);
      if (key && !recipeIndex.has(key)) recipeIndex.set(key, recipe);
    });
    // The tree must be acyclic, but the standalone visual recipe must still
    // show every real reversible wall/platform recipe. Preserve the complete
    // direct index before pruning graph cycles.
    visualRecipeIndex = new Map(recipeIndex);
    pruneRecipeCycles(recipeIndex);
    return recipeIndex;
  }
  function visualRecipeFor(name) {
    getRecipeIndex();
    const raw = String(name || "").trim();
    if (!raw || !visualRecipeIndex) return null;
    const candidates = [];
    const forcedCatalog = raw.match(/^catalog:(.+)$/i);
    if (forcedCatalog) {
      const item = CATALOG_BY_ID.get(String(forcedCatalog[1]));
      if (item) candidates.push(item.name);
    }
    const forcedVanilla = raw.match(/^vanilla:(\d+)$/i);
    if (forcedVanilla) {
      const item = VANILLA_BY_ID.get(String(forcedVanilla[1]));
      if (item) candidates.push(item.name);
    }
    if (!forcedCatalog && !forcedVanilla) {
      candidates.push(raw);
      const catalog = catalogByName(raw);
      if (catalog) candidates.push(catalog.name);
      const vanilla = vanillaItemForName(raw);
      if (vanilla) candidates.push(vanilla.name);
      const lex = exactLexLookup(raw);
      if (lex) candidates.push(lex.en, lex.ru);
      const guide = GUIDE_BY_NORM.get(normalizeArtName(raw));
      if (guide) candidates.push(guide.name);
    }
    for (const candidate of candidates.filter(Boolean)) {
      const recipe = visualRecipeIndex.get(normalizeArtName(candidate));
      if (recipe?.ings?.length) return recipe;
    }
    return null;
  }

  let exactLexIndex = null;
  function exactLexLookup(name) {
    if (!CODEX.lex) return null;
    if (!exactLexIndex) {
      exactLexIndex = new Map();
      Object.values(CODEX.lex).forEach((entry) => {
        [entry.ru, entry.en, ...(entry.aliases || [])].filter(Boolean).forEach((value) => {
          const key = String(value).toLocaleLowerCase("ru");
          if (key && !exactLexIndex.has(key)) exactLexIndex.set(key, entry);
        });
      });
    }
    // Не используем нечёткий lookup: «Guide Voodoo Doll» не должен
    // превращаться в карточку обычного «Guide».
    return exactLexIndex.get(String(name || "").toLocaleLowerCase("ru")) || null;
  }
  function catalogByName(name) {
    buildNameIndexes();
    const forced = String(name || "").match(/^catalog:(.+)$/i);
    if (forced) return CATALOG_BY_ID.get(String(forced[1])) || null;
    const k = normalizeArtName(name);
    let hit = CATALOG_BY_NORM.get(k);
    if (hit) return hit;
    const lex = exactLexLookup(name);
    hit = lex && CATALOG_BY_NORM.get(normalizeArtName(lex.en));
    if (hit) return hit;
    const guide = GUIDE_BY_NORM.get(k);
    if (guide) {
      hit = CATALOG_BY_NORM.get(normalizeArtName(guide.name));
      if (hit) return hit;
      const gLex = exactLexLookup(guide.name);
      hit = gLex && CATALOG_BY_NORM.get(normalizeArtName(gLex.en));
      if (hit) return hit;
    }
    return null;
  }
  const EXTRA_RECIPE_DEFS = {
    Zenith: {
      ings: [
        { name: "Copper Shortsword", count: "1" },
        { name: "Enchanted Sword", count: "1" },
        { name: "Starfury", count: "1" },
        { name: "Bee Keeper", count: "1" },
        { name: "Seedler", count: "1" },
        { name: "Terra Blade", count: "1" },
        { name: "The Horseman's Blade", count: "1" },
        { name: "Influx Waver", count: "1" },
        { name: "Meowmere", count: "1" },
        { name: "Star Wrath", count: "1" }
      ],
      station: "Мифриловая или орихалковая наковальня"
    }
  };
  const EXTRA_ITEM_INFO = {
    Zenith: {
      ru: "Зенит",
      en: "Zenith",
      kind: "weapon",
      desc: "Финальный меч ванильной Terraria. Выпускает клинки из собранного оружия и закрывает главную ванильную ветку крафта.",
      obtain: "Скрафтить из: Copper Shortsword + Enchanted Sword + Starfury + Bee Keeper + Seedler + Terra Blade + The Horseman's Blade + Influx Waver + Meowmere + Star Wrath · у мифриловой или орихалковой наковальни.",
      used: "Главное оружие финала ванильной Terraria; особенно полезен после победы над Лунным лордом.",
      when: "После Лунного лорда, когда собраны все восемь мечей."
    },
    "Any Hallowed Helmet": { ru: "Любой святой шлем", art: "assets/vanilla-sprites/553.png", artNote: "Показан: Святой шлем", kind: "armor" },
    "Any Hallowed Platemail": { ru: "Любой святой нагрудник", art: "assets/vanilla-sprites/551.png", artNote: "Показан: Святой нагрудник", kind: "armor" },
    "Any Hallowed Greaves": { ru: "Любые святые поножи", art: "assets/vanilla-sprites/552.png", artNote: "Показаны: Святые ботинки", kind: "armor" },
    "Any Mythril Bar": { ru: "Любой мифриловый или орихалковый слиток", art: "assets/vanilla-sprites/382.png", artNote: "Показан: Мифриловый слиток", kind: "mat" },
    "Any Stone Block": { ru: "Любой каменный блок", art: "assets/vanilla-sprites/3.png", artNote: "Показан: Каменный блок", kind: "mat" },
    "Any Food": { ru: "Любая еда", art: "assets/vanilla-sprites/2425.png", artNote: "Показана: Приготовленная рыба", kind: "potion" },
    "Hardmode Forge": { ru: "Адамантитовая или титановая кузня", art: "assets/vanilla-sprites/524.png", artNote: "Показана: Адамантитовая кузня", kind: "tool" },
    "Lunar Crafting Station": { ru: "Древний манипулятор", en: "Ancient Manipulator", art: "assets/lex/vanilla/ancient-manipulator.png", kind: "tool" }
  };
  // Exact reader-facing names for the long recipes that were previously hidden
  // behind “+ ещё N”. These override rough token transliteration only; original
  // in-game names remain visible on the next line of every recipe card.
  const EXACT_RECIPE_RU = Object.freeze({
    "Abyss Chair": "Стул Бездны",
    "Abyss Gravel": "Гравий Бездны",
    "Abyssal Tome": "Фолиант Бездны",
    "Acidwood Chair": "Стул из кислотной древесины",
    "Amalgamated Brain": "Амальгамированный мозг",
    Apathanull: "Апатанулл",
    "Ancient Chair": "Древний стул",
    "Ashen Chair": "Пепельный стул",
    "Auric Bar": "Ауриковый слиток",
    "Ball O' Fugu": "Шар фугу",
    "Botanic Chair": "Ботанический стул",
    "Broken Biome Blade": "Сломанный клинок биомов",
    "Cosmic Discharge": "Космический разряд",
    "Cosmic Rainbow": "Космическая радуга",
    "Cosmilite Bar": "Космилитовый слиток",
    "Cosmilite Chair": "Космилитовый стул",
    "Elemental in a Bottle": "Элементаль в бутылке",
    "Exo Chair": "Экзо-стул",
    "Exodium Cluster": "Кластер экзодиума",
    "Eye of the Storm": "Глаз бури",
    "Flare Bolt": "Вспышечный разряд",
    "Ghoulish Gouger": "Призрачный потрошитель",
    "Hoarfrost Bow": "Лук изморози",
    "Ice Star": "Ледяная звезда",
    Icebreaker: "Ледокол",
    "Marnite Chair": "Марнитовый стул",
    "Maw of Infinity": "Пасть бесконечности",
    "Meld Blob": "Сгусток слияния",
    "Molten Amputator": "Расплавленный ампутатор",
    "Monolith Chair": "Монолитный стул",
    Mourningstar: "Скорбящая звезда",
    "Navystone Chair": "Навикаменный стул",
    "Nuclear Fury": "Ядерная ярость",
    "Oasis Elemental in a Bottle": "Элементаль оазиса в бутылке",
    "Otherworldly Chair": "Потусторонний стул",
    "Pearl of Enthrallment": "Жемчужина очарования",
    "Plagued Chair": "Чумной стул",
    "Profaned Chair": "Осквернённый стул",
    "Prototype Plasma Drive": "Прототип плазменного привода",
    "Pyre Mantle": "Пламенная мантия",
    "Rose Stone": "Камень розы",
    "Sacrilegious Chair": "Кощунственный стул",
    "Scoria Bar": "Скориевый слиток",
    "Sea Spirit Amulet": "Амулет морского духа",
    "Shadecrystal Barrage": "Залп тенекристалла",
    "Shadowspec Bar": "Тенеспековый слиток",
    "Silva Chair": "Сильвовый стул",
    "Snowstorm Staff": "Посох снежной бури",
    "Statigel Chair": "Статигелевый стул",
    "Stratus Chair": "Стратусовый стул",
    "Suspicious Scrap": "Подозрительный лом",
    "The Storm": "Буря",
    Tradewinds: "Пассаты",
    Tumbleweed: "Перекати-поле",
    "Uelibloom Bar": "Юэлиблумовый слиток",
    "Void Chair": "Стул пустоты",
    "Void Eater Marionette": "Марионетка пожирателя пустоты",
    Voidstone: "Камень пустоты",
    "Wulfrum Chair": "Вульфрумовый стул"
  });
  let VANILLA_TREE_INDEX = window.CALAMITY_VANILLA_TREE_INDEX || { items: [], recipes: [], stations: [] };
  let VANILLA_COMPACT = VANILLA_TREE_INDEX.format === 2;
  let VANILLA_MISSING_SPRITES = new Set(VANILLA_TREE_INDEX.coverage?.missingSpriteIds || []);
  // Пятитысячный ванильный индекс и 3502 рецепта не нужны на главной.
  // Имена разворачиваются отдельно для поиска; граф рецептов строится только
  // при открытии дерева и больше не блокирует первый поисковый запрос.
  const VANILLA_BY_ID = new Map();
  const VANILLA_BY_NAME = new Map();
  const VANILLA_RU_BY_NAME = new Map();
  const VANILLA_RECIPE_OPTIONS_BY_ID = new Map();
  const VANILLA_RECIPE_EDGES = new Map();
  const VANILLA_RECIPE_BY_ID = new Map();
  const VANILLA_RECIPE_CUT_IDS = new Set();
  const VANILLA_STATIONS = new Map();
  let vanillaItemsReady = false;
  let vanillaRecipesReady = false;

  function vanillaDerivedScore(item) {
    if (!item) return 0;
    const name = String(item.name || "");
    if (/platform/i.test(name)) return 140;
    if (/wall/i.test(name)) return 125;
    if (/coin$/i.test(name)) return ({ "Copper Coin": 20, "Silver Coin": 40, "Gold Coin": 60, "Platinum Coin": 80 })[name] || 30;
    if (/^(Wet|Lava|Honey) (Bomb|Rocket)/i.test(name)) return 110;
    if (/^Dry (Bomb|Rocket)/i.test(name)) return 10;
    const byType = { Background: 115, Furniture: 90, Mechanism: 80, Accessory: 70, Weapon: 65, Armor: 65, Ammunition: 50, Consumable: 50, "Crafting material": 40, Brick: 30, Block: 25, Ore: 20 };
    return byType[item.type] || 45;
  }

  function ensureVanillaItems() {
    if (vanillaItemsReady) return;
    vanillaItemsReady = true;
    (VANILLA_TREE_INDEX.items || []).forEach((row, index) => {
      const id = VANILLA_COMPACT ? Number(VANILLA_TREE_INDEX.firstItemId || 1) + index : Number(row[0]);
      const name = VANILLA_COMPACT ? row[0] : row[1];
      const type = VANILLA_COMPACT ? VANILLA_TREE_INDEX.types?.[row[1]] || "Item" : row[2];
      const sprite = VANILLA_COMPACT
        ? (VANILLA_MISSING_SPRITES.has(id) ? "" : `assets/vanilla-sprites/${id}.png`)
        : (row[3] || "");
      VANILLA_BY_ID.set(String(id), { id, name, type, sprite, vanilla: true });
    });
    VANILLA_BY_ID.forEach((item) => {
      const key = normalizeArtName(item.name);
      if (key && !VANILLA_BY_NAME.has(key)) VANILLA_BY_NAME.set(key, item);
      const noSuffix = normalizeArtName(String(item.name).replace(/\s*\(item\)$/i, ""));
      if (noSuffix && !VANILLA_BY_NAME.has(noSuffix)) VANILLA_BY_NAME.set(noSuffix, item);
      const officialRu = VANILLA_RU_BY_ID[String(item.id)];
      if (officialRu && key && !VANILLA_RU_BY_NAME.has(key)) VANILLA_RU_BY_NAME.set(key, officialRu);
      if (officialRu && noSuffix && !VANILLA_RU_BY_NAME.has(noSuffix)) VANILLA_RU_BY_NAME.set(noSuffix, officialRu);
    });
    document.documentElement.dataset.vanillaItems = "ready";
  }

  function ensureVanillaRecipes() {
    if (vanillaRecipesReady) return;
    ensureVanillaItems();
    vanillaRecipesReady = true;
    (VANILLA_TREE_INDEX.recipes || []).forEach((row) => {
      const [resultId, tableId, ings, resultQuantity] = VANILLA_COMPACT ? row : [row[0], row[2], row[3], 1];
      const resultKey = String(resultId);
      const ingredientIds = (ings || []).map(([id]) => String(id));
      if (!VANILLA_RECIPE_OPTIONS_BY_ID.has(resultKey)) VANILLA_RECIPE_OPTIONS_BY_ID.set(resultKey, []);
      VANILLA_RECIPE_OPTIONS_BY_ID.get(resultKey).push({
        ingredientIds,
        ings: (ings || []).map(([id, count]) => ({
          name: VANILLA_BY_ID.get(String(id))?.name || `Предмет Terraria #${id}`,
          key: VANILLA_BY_ID.has(String(id)) ? `vanilla:${id}` : "",
          count: String(count)
        })),
        station: String(tableId),
        yield: Math.max(1, Number(resultQuantity || 1))
      });
      if (!VANILLA_RECIPE_EDGES.has(resultKey)) VANILLA_RECIPE_EDGES.set(resultKey, new Set());
      ingredientIds.forEach((id) => VANILLA_RECIPE_EDGES.get(resultKey).add(id));
    });
    VANILLA_RECIPE_OPTIONS_BY_ID.forEach((options, resultId) => {
      const resultScore = vanillaDerivedScore(VANILLA_BY_ID.get(resultId));
      const selected = options.find((recipe) => {
        if (recipe.ingredientIds.includes(resultId)) return false;
        return !recipe.ingredientIds.some((ingredientId) => {
          const reciprocal = VANILLA_RECIPE_EDGES.get(ingredientId)?.has(resultId);
          return reciprocal && resultScore <= vanillaDerivedScore(VANILLA_BY_ID.get(ingredientId));
        });
      });
      // Если все варианты являются обратными преобразованиями равного или
      // более производного предмета, результат остаётся базовым ресурсом.
      if (selected) VANILLA_RECIPE_BY_ID.set(resultId, selected);
      else VANILLA_RECIPE_CUT_IDS.add(resultId);
    });
    (VANILLA_TREE_INDEX.stations || []).forEach(([id, name]) => VANILLA_STATIONS.set(String(id), name));
    document.documentElement.dataset.vanillaRecipes = "ready";
  }
  const VANILLA_STATION_RU = {
    "by hand": "в инвентаре",
    "work bench": "у верстака",
    furnace: "у печи",
    hellforge: "у адской печи",
    "iron anvil": "у железной наковальни",
    "lead anvil": "у свинцовой наковальни",
    "placed bottle": "у поставленной бутылки",
    "alchemy table": "на алхимическом столе",
    sink: "у раковины / источника воды",
    sawmill: "у лесопилки",
    loom: "у ткацкого станка",
    "table and chair": "у стола и стула",
    "work bench and chair": "у верстака и стула",
    "cooking pot": "у котла",
    cauldron: "у котла",
    "tinkerer's workshop": "у мастерской инженера",
    "imbuing station": "у станции наполнения",
    "dye vat": "у красильного чана",
    "heavy work bench": "у тяжёлого верстака",
    "demon/crimson altar": "у алтаря зла",
    "mythril anvil": "у мифриловой наковальни",
    "orichalcum anvil": "у орихалковой наковальни",
    "mythril/orichalcum anvil": "у мифриловой или орихалковой наковальни",
    "adamantite forge": "у адамантитовой кузни",
    "titanium forge": "у титановой кузни",
    "adamantite/titanium forge": "у адамантитовой или титановой кузни",
    bookcase: "у книжного шкафа",
    "crystal ball": "у хрустального шара",
    autohammer: "в автокузнице",
    "ancient manipulator": "у древнего манипулятора",
    honey: "в мёде",
    "draedon's forge": "в кузнице Дрейдона",
    "sky mill": "у небесной мельницы",
    "ice machine": "у ледяной машины",
    keg: "у бочонка",
    "lihzahrd furnace": "у печи ящеров"
  };
  function vanillaItemForName(name) {
    ensureVanillaItems();
    const forced = String(name || "").match(/^vanilla:(\d+)$/i);
    if (forced) return VANILLA_BY_ID.get(String(forced[1])) || null;
    return VANILLA_BY_NAME.get(normalizeArtName(name)) || null;
  }
  function vanillaRecipeForName(name) {
    ensureVanillaRecipes();
    const item = vanillaItemForName(name);
    return item ? (VANILLA_RECIPE_BY_ID.get(String(item.id)) || null) : null;
  }
  function vanillaStationName(id) {
    ensureVanillaRecipes();
    const name = VANILLA_STATIONS.get(String(id)) || String(id || "");
    return VANILLA_STATION_RU[name.toLocaleLowerCase("ru")] || ruText(name);
  }
  function vanillaKind(type) {
    const low = String(type || "").toLocaleLowerCase("en");
    if (low.includes("weapon")) return "weapon";
    if (low.includes("armor") || low.includes("vanity")) return "armor";
    if (low.includes("accessory") || low.includes("shield") || low.includes("hook")) return "acc";
    if (low.includes("potion") || low.includes("consumable") || low.includes("food")) return "potion";
    if (low.includes("tool") || low.includes("fishing") || low.includes("bait")) return "tool";
    if (low.includes("material") || low.includes("ore") || low.includes("gem") || low.includes("ammunition")) return "mat";
    return "misc";
  }

  const BOSS_OBTAIN_OVERRIDES = {
    LavaChickenBroth: "Гарантированно выпадает с XB-∞ Гекаты в мире Get fixed boi; обычные Экзо-мехи этот уникальный предмет не дают.",
    ColdheartIcicle: "Гарантированно выпадает с Верховного ультрамага Пермафроста в мире Get fixed boi; это его уникальная награда.",
    NO: "В мире Get fixed boi выпадает с Болдоров после победы над Верховной ведьмой и Экзо-мехами; также существует редкое раннее получение с Болдора.",
    SuspiciousLookingNOU: "Гарантированно выпадает с THE LORDE."
  };
  const bossObtainOverride = (item) => BOSS_OBTAIN_OVERRIDES[String(item?.id || item || "")] || "";
  const BOSS_RELATION_LABELS = {
    S: "призыв боя",
    D: "награда босса",
    A: "секретная альтернатива",
    G: "открывает этап",
    C: "материал в рецепте",
    R: "особая связь"
  };
  function buildBossRelationIndexes() {
    if (bossRelationIndexes) return bossRelationIndexes;
    const data = BOSS_RELATION_DATA || {};
    const bossEntries = [...(CODEX.bosses || []), ...(CODEX.minis || [])];
    const bossById = new Map(bossEntries.map((boss) => [String(boss.id), boss]));
    const decode = (rows, normalizeKeys = false) => new Map((rows || []).map(([key, links]) => [
      normalizeKeys ? normalizeArtName(key) : String(key),
      (links || []).map(([bossIndex, typeIndex]) => {
        const id = data.bosses?.[bossIndex];
        const boss = bossById.get(String(id));
        const type = data.types?.[typeIndex] || "R";
        return boss ? { boss, type } : null;
      }).filter(Boolean)
    ]));
    bossRelationIndexes = {
      items: decode(data.items),
      vanilla: decode(data.vanilla),
      guides: decode(data.guides, true),
      crafts: decode(data.crafts, true),
      order: new Map((data.bosses || []).map((id, index) => [String(id), index]))
    };
    return bossRelationIndexes;
  }
  function mergeBossRelations(target, links) {
    const typeRank = new Map((BOSS_RELATION_DATA.types || []).map((type, index) => [type, index]));
    (links || []).forEach((link) => {
      const id = String(link.boss.id);
      const previous = target.get(id);
      if (!previous || (typeRank.get(link.type) ?? 99) < (typeRank.get(previous.type) ?? 99)) target.set(id, link);
    });
  }
  function bossRelationsFor(value, options = {}) {
    if (!BOSS_RELATION_DATA?.items?.length) return [];
    const indexes = buildBossRelationIndexes();
    const result = new Map();
    const record = value && typeof value === "object" ? value : { name: value };
    const id = options.id || record.id || record.catId || "";
    const name = options.name || record.name || record.catName || record.en || String(value || "");
    const vanilla = options.vanilla || record.vanilla || (/^vanilla:(\d+)$/i.exec(String(name || "")) ? vanillaItemForName(name) : null);
    if (id) mergeBossRelations(result, indexes.items.get(String(id)));
    if (vanilla?.id != null) mergeBossRelations(result, indexes.vanilla.get(String(vanilla.id)));
    const key = normalizeArtName(name);
    if (key) {
      mergeBossRelations(result, indexes.guides.get(key));
      mergeBossRelations(result, indexes.crafts.get(key));
      const catalog = id ? null : catalogByName(name);
      if (catalog) mergeBossRelations(result, indexes.items.get(String(catalog.id)));
      const vanillaItem = vanilla || (!id ? vanillaItemForName(name) : null);
      if (vanillaItem?.id != null) mergeBossRelations(result, indexes.vanilla.get(String(vanillaItem.id)));
    }
    return [...result.values()].sort((left, right) => (indexes.order.get(String(left.boss.id)) ?? 999) - (indexes.order.get(String(right.boss.id)) ?? 999));
  }
  function shortBossNames(links, limit = 3) {
    const names = links.map((link) => link.boss.name);
    if (names.length <= limit) return names.join(", ");
    return `${names.slice(0, limit).join(", ")} и ещё ${names.length - limit}`;
  }
  function bossRelationSentence(links) {
    if (!links?.length) return "";
    const summons = links.filter((link) => link.type === "S");
    const drops = links.filter((link) => link.type === "D");
    const alternatives = links.filter((link) => link.type === "A");
    const progression = links.filter((link) => ["G", "C"].includes(link.type));
    const related = links.filter((link) => link.type === "R");
    const sentences = [];
    if (summons.length) sentences.push(`Запускает или участвует в призыве: ${shortBossNames(summons)}.`);
    if (drops.length) sentences.push(`Прямой источник или награда: ${shortBossNames(drops)}.`);
    if (alternatives.length) sentences.push(`В мире Get fixed boi тот же путь наград связан с: ${shortBossNames(alternatives)}.`);
    if (progression.length) sentences.push(`Для получения или рецепта нужны этапы и материалы боссов: ${shortBossNames(progression)}.`);
    if (!sentences.length && related.length) sentences.push(`Особая механика связана с: ${shortBossNames(related)}.`);
    return sentences.join(" ");
  }
  function withBossRelationDescription(description, links) {
    const base = String(description || "").trim();
    const context = bossRelationSentence(links);
    if (!context) return base;
    return `${base}${base && !/[.!?]$/.test(base) ? "." : ""}${base ? " " : ""}${context}`;
  }
  function bossRelationsHTML(links) {
    if (!links?.length) return "";
    return `<div class="fact boss-relations-fact"><span>Связанные боссы</span><div class="boss-ref-list">${links.map(({ boss, type }) => `
      <a class="boss-ref boss-ref-${escAttr(type.toLocaleLowerCase("en"))}" href="#/bosses?q=${encodeURIComponent(boss.name)}" data-boss-detail="${escAttr(boss.en || boss.name)}" title="Показать все сведения: ${escAttr(boss.name)}">
        <i aria-hidden="true">${type === "S" ? "✦" : type === "D" ? "◆" : type === "A" ? "?" : type === "G" ? "⌁" : type === "C" ? "+" : "☠"}</i>
        <b>${esc(boss.name)}</b>
        <small>${esc(BOSS_RELATION_LABELS[type] || BOSS_RELATION_LABELS.R)}</small>
      </a>`).join("")}</div></div>`;
  }

  function craftStationSentence(recipe) {
    if (!recipe || !recipe.ings || !recipe.ings.length) return "";
    const station = stationDisplayName(recipe.station || "").trim().replace(/[.;]+$/, "");
    if (!station) return "Скрафтить из ингредиентов, перечисленных в рецепте.";
    if (/^(?:у|на|в|возле|около)\s/i.test(station)) return `Скрафтить ${station}.`;
    return `Скрафтить; станция — ${station}.`;
  }

  function craftStationInline(station) {
    const value = stationDisplayName(station || "").trim().replace(/[.;]+$/, "");
    if (!value) return "";
    return /^(?:у|на|в|возле|около)\s/i.test(value) ? value : `станция: ${value}`;
  }

  function vanillaStationTiming(station) {
    const low = normalizeArtName(station);
    if (!low) return "Как только собраны ингредиенты: отдельная станция для рецепта не указана.";
    if (/ancient manipulator|древн.*манипулятор/.test(low)) return "После победы над Лунатиком-культистом, когда получен Древний манипулятор.";
    if (/adamantite forge|titanium forge|адамантит|титан.*кузн/.test(low)) return "Хардмод: после открытия адамантитовой или титановой руды и создания улучшенной кузни.";
    if (/mythril anvil|orichalcum anvil|мифрил|орихалк/.test(low)) return "Хардмод: после добычи мифрила или орихалка и создания хардмодной наковальни.";
    if (/autohammer|автокузн/.test(low)) return "После Плантеры: Автокузницу продаёт Трюфель, когда он живёт в подходящем грибном биоме.";
    if (/lihzahrd furnace|печ.*ящер/.test(low)) return "Поздний хардмод: после доступа в храм ящеров и получения Печи ящеров.";
    if (/steampunk boiler|blend o matic|стимпанк|смешивател/.test(low)) return "Хардмод после механического босса: станцию продаёт Стимпанкер.";
    if (/crystal ball|хрустальн.*шар/.test(low)) return "Хардмод: после спасения Волшебника и покупки у него Хрустального шара.";
    if (/tinkerer|мастерск.*инженер|мастерск.*гоблин/.test(low)) return "После спасения Гоблина-инженера в пещерах и покупки у него Мастерской инженера.";
    if (/alchemy table|алхимическ.*стол/.test(low)) return "После Скелетрона: Алхимический стол находится в Данже.";
    if (/hellforge|адск.*печ|адск.*кузн/.test(low)) return "Поздний прехардмод: после спуска в Преисподнюю и получения Адской кузни.";
    if (/demon altar|crimson altar|алтар.*зла|демонич.*алтар|кримзон.*алтар/.test(low)) return "Прехардмод: после добычи материалов Порчи или Багрянца; крафт выполняется у алтаря зла.";
    if (/bookcase|книжн.*шкаф/.test(low)) return "После доступа к книгам и книжному шкафу; обычно — после открытия Данжа.";
    if (/solidifier|отвердител/.test(low)) return "После получения Отвердителя с Короля слизней либо покупки у Стимпанкера в хардмоде.";
    if (/flesh cloning|decay chamber|meat grinder|клонирован|разложен|мясоруб/.test(low)) return "Хардмод: после получения тематической станции Багрянца, Порчи или Кладбища.";
    if (/imbuing station|станц.*наполнен/.test(low)) return "После заселения Знахаря и покупки у него Станции наполнения.";
    if (/dye vat|красильн.*чан/.test(low)) return "После заселения Красильщика и покупки у него Красильного чана.";
    if (/hell|lava|лав/.test(low)) return "После безопасного доступа к лаве или Преисподней; победа над Стеной плоти не требуется.";
    if (/work bench|furnace|iron anvil|lead anvil|placed bottle|sink|sawmill|loom|table and chair|cooking pot|cauldron|heavy work bench|keg|teapot|living wood|bone welder|glass kiln|honey dispenser|ice machine|living loom|sky mill|water|honey|верстак|печ|наковаль|бутыл|раковин|лесопил|ткац|кот[её]л|боч|чайник|стекл|м[её]д|небесн.*мельниц|вод/.test(low)) return "Прехардмод: как только собраны ингредиенты и получена указанная станция; обязательный босс не требуется.";
    return `После получения станции «${stationDisplayName(station)}» и всех перечисленных ингредиентов.`;
  }

  let recipeUseCounts = null;
  function recipeUseCount(name) {
    if (!recipeUseCounts) {
      recipeUseCounts = new Map();
      getRecipeIndex().forEach((recipe) => (recipe.ings || []).forEach((ingredient) => {
        const key = normalizeArtName(ingredient.name);
        if (key) recipeUseCounts.set(key, (recipeUseCounts.get(key) || 0) + 1);
      }));
    }
    return recipeUseCounts.get(normalizeArtName(name)) || 0;
  }

  function recipeCountText(count) {
    const mod10 = count % 10;
    const mod100 = count % 100;
    const word = mod10 === 1 && mod100 !== 11 ? "рецепте" : "рецептах";
    return `${count} ${word}`;
  }

  const VANILLA_TYPE_RU = {
    "Furniture": "предмет мебели", "Weapon": "оружие", "Accessory": "аксессуар", "Vanity": "декоративная экипировка",
    "Enemy banner": "знамя врага", "Light source": "источник света", "Armor": "броня", "Background": "фоновая стена",
    "Tool": "инструмент", "Block": "строительный блок", "Dye": "краситель", "Crafting material": "материал для крафта",
    "Potion": "зелье", "Painting": "картина", "Storage": "хранилище", "Mechanism": "механизм", "Ammunition": "боеприпас",
    "Miscellaneous": "особый предмет", "Pet summon": "предмет призыва питомца", "Grab bag": "контейнер с добычей",
    "Consumable": "расходуемый предмет", "Mount summon": "предмет призыва маунта", "Bait": "наживка", "Brick": "строительный кирпич",
    "Critter": "животное", "Quest fish": "квестовая рыба", "Seeds": "семена", "Food": "еда", "Fishing catches": "рыболовная добыча",
    "Hook": "крюк", "Ore": "руда", "Boss summon": "предмет призыва босса", "Key": "ключ", "Light pet": "светящийся питомец",
    "Pylon": "пилон", "Shield": "щит", "Event summon": "предмет запуска события", "Gem": "самоцвет", "n/a": "предмет"
  };
  const vanillaTypeName = (type) => VANILLA_TYPE_RU[String(type || "")] || "предмет";
  const isInternalVanillaName = (name) => /^n\/a\s*\(/i.test(String(name || "")) || /^format\s*:\s*[a-z]$/i.test(String(name || "").trim());

  function vanillaMetaIndex() {
    if (vanillaMetaById) return vanillaMetaById;
    const fields = VANILLA_META_DATA.fields || [];
    vanillaMetaById = new Map((VANILLA_META_DATA.rows || []).map(([id, categoryId, values]) => {
      const meta = { category: VANILLA_META_DATA.categories?.[categoryId] || "" };
      (values || []).forEach((value, index) => { if (value != null && value !== "") meta[fields[index]] = value; });
      return [String(id), meta];
    }));
    return vanillaMetaById;
  }
  function vanillaMetaFor(item) {
    return item?.id != null ? vanillaMetaIndex().get(String(item.id)) || null : null;
  }
  function vanillaTooltipRu(item) {
    return String(VANILLA_RU_TOOLTIPS_BY_ID[String(item?.id)] || "").trim();
  }
  function vanillaRole(item, meta = vanillaMetaFor(item)) {
    if (meta?.["Fishing Power"]) return "удочка";
    if (meta?.["Pickaxe power"] && meta["Pickaxe power"] !== "0%") return "кирка";
    if (meta?.["Axe power"] && meta["Axe power"] !== "0%" && meta?.["Hammer power"] && meta["Hammer power"] !== "0%") return "молотопор";
    if (meta?.["Axe power"] && meta["Axe power"] !== "0%") return "топор";
    if (meta?.["Hammer power"] && meta["Hammer power"] !== "0%") return "молот";
    return vanillaTypeName(item?.type || "n/a").toLocaleLowerCase("ru");
  }
  function vanillaMetaStats(item, meta = vanillaMetaFor(item)) {
    if (!meta) return [];
    const stats = [];
    if (meta["Fishing Power"]) stats.push(`сила рыбалки ${meta["Fishing Power"]}`);
    if (meta["Bait Power"]) stats.push(`сила наживки ${meta["Bait Power"]}`);
    if (meta["Pickaxe power"] && meta["Pickaxe power"] !== "0%") stats.push(`мощность кирки ${meta["Pickaxe power"]}`);
    if (meta["Axe power"] && meta["Axe power"] !== "0%") stats.push(`мощность топора ${meta["Axe power"]}`);
    if (meta["Hammer power"] && meta["Hammer power"] !== "0%") stats.push(`мощность молота ${meta["Hammer power"]}`);
    if (meta.Damage) stats.push(`базовый урон ${meta.Damage}`);
    if (meta.Defense) stats.push(`защита ${meta.Defense}`);
    if (meta.Mana) stats.push(`расход маны ${meta.Mana}`);
    if (meta.Reach) stats.push(`дальность крюка ${meta.Reach}`);
    return stats;
  }
  function vanillaPurpose(item) {
    if (!item) return "";
    const meta = vanillaMetaFor(item);
    const role = vanillaRole(item, meta);
    if (meta?.["Fishing Power"]) return `Удочка: возьми в руку и забрось поплавок в подходящий водоём; в инвентаре должна лежать наживка. Сила рыбалки — ${meta["Fishing Power"]}.`;
    if (meta?.["Pickaxe power"] && meta["Pickaxe power"] !== "0%") return `Кирка с мощностью ${meta["Pickaxe power"]}: используй для добычи блоков и руд, требующих не больше этого значения.`;
    if (meta?.["Axe power"] && meta["Axe power"] !== "0%") return `${role.charAt(0).toUpperCase() + role.slice(1)}: рубит деревья и связанные деревянные объекты; мощность топора — ${meta["Axe power"]}.${meta["Hammer power"] && meta["Hammer power"] !== "0%" ? ` Мощность молота — ${meta["Hammer power"]}.` : ""}`;
    if (meta?.["Hammer power"] && meta["Hammer power"] !== "0%") return `Молот с мощностью ${meta["Hammer power"]}: разрушает фоновые стены и изменяет форму блоков.`;
    const type = String(item.type || "n/a");
    const low = normalizeArtName(item.name);
    const uses = recipeUseCount(item.name);
    if (/\bkite\b/.test(low)) return "Воздушный змей: возьми в руку во время сильного ветра и запусти как декоративный объект; для боевой прогрессии не требуется.";
    if (/binocular/.test(low)) return "Бинокль: держи в руке, чтобы отдалить камеру и осматривать пространство впереди персонажа.";
    if (/water gun|slime gun|confetti gun/.test(low)) return "Игрушечное оружие без боевого урона: используй ради визуального эффекта, окрашивания или развлечения.";
    if (/golf club/.test(low)) return "Клюшка для гольфа: используй на поле вместе с мячом; тип клюшки определяет дальность и траекторию удара.";
    const usedIn = uses ? ` В локальном дереве участвует в ${recipeCountText(uses)}.` : "";
    const byType = {
      "Weapon": "Оружие: держи в панели быстрого доступа и используй для нанесения урона.",
      "Accessory": "Аксессуар: экипируй в свободный слот ради его пассивного эффекта.",
      "Shield": "Щит или защитный аксессуар: экипируй ради защиты и дополнительной механики.",
      "Armor": "Броня: экипируй в соответствующий слот; полный комплект может давать отдельный бонус.",
      "Vanity": "Декоративная экипировка: меняет внешний вид и не даёт боевых характеристик.",
      "Tool": "Инструмент для добычи, строительства, перемещения или исследования мира.",
      "Hook": "Крюк: экипируй и используй для быстрого перемещения и страховки в пещерах.",
      "Crafting material": "Материал для крафта: сохраняй для оружия, брони, инструментов и следующих компонентов.",
      "Ore": "Руда: переплавляй в слитки или используй напрямую в рецептах.",
      "Gem": "Самоцвет: нужен для крюков, посохов, витражей и других рецептов.",
      "Ammunition": "Боеприпас: расходуется подходящим стрелковым оружием.",
      "Potion": "Зелье: выпей для лечения, восстановления маны или временного эффекта.",
      "Consumable": "Расходуемый предмет: применяется один раз и тратится при использовании.",
      "Food": "Еда: даёт персонажу временный бонус сытости.",
      "Furniture": "Мебель: размещается в мире и используется для базы, жилья NPC или оформления.",
      "Storage": "Хранилище: размещается на базе и позволяет складывать предметы.",
      "Light source": "Источник света: размещается для освещения базы, арены или маршрута исследования.",
      "Mechanism": "Механизм: подключается проводами либо используется в автоматических постройках.",
      "Background": "Фоновая стена: размещается за блоками для жилья и оформления помещений.",
      "Block": "Строительный блок: используется для платформ, стен, арен и декоративных построек.",
      "Brick": "Строительный кирпич: нужен для прочных и декоративных построек.",
      "Painting": "Картина: размещается на стене как декоративный объект.",
      "Dye": "Краситель: помещается в слот красителя и меняет внешний вид экипировки.",
      "Enemy banner": "Знамя врага: размести рядом, чтобы получить бонус против этого типа противников.",
      "Boss summon": "Предмет призыва босса: используй только после подготовки арены и зелий.",
      "Event summon": "Предмет запуска события: активируй после подготовки площадки для боя и фарма.",
      "Pet summon": "Призывает декоративного питомца; на боевые характеристики не влияет.",
      "Light pet": "Призывает светящегося питомца, который помогает освещать путь.",
      "Mount summon": "Призывает маунта с собственной скоростью и способом передвижения.",
      "Grab bag": "Контейнер с добычей: открой в инвентаре, чтобы получить его содержимое.",
      "Bait": "Наживка: положи в инвентарь вместе с удочкой для рыбалки.",
      "Fishing catches": "Рыболовная добыча: используется как материал, еда или коллекционный предмет.",
      "Quest fish": "Квестовая рыба: отдай Рыбаку, когда он просит именно этот вид.",
      "Critter": "Животное: поймай сачком; можно использовать как наживку, питомца или декор.",
      "Seeds": "Семена: посади на подходящий блок, чтобы вырастить растение или распространить биом.",
      "Key": "Ключ: открывает соответствующий сундук, дверь или контейнер.",
      "Pylon": "Пилон: размещается в подходящем биоме для телепортации между поселениями NPC.",
      "Miscellaneous": "Особый предмет: используй или размести его, чтобы активировать указанную в описании вспомогательную, декоративную либо исследовательскую механику.",
      "n/a": "Служебный или особый предмет без стандартной категории; практическое действие указано в описании и способе получения."
    };
    const purpose = byType[type] || "Особый предмет: назначение определяется его описанием, способом использования и связанным игровым событием.";
    return `${purpose}${usedIn}`.trim();
  }
  const completeSentence = (value) => {
    const text = String(value || "").trim();
    return text && !/[.!?]$/.test(text) ? `${text}.` : text;
  };
  function purposeByKind(kind) {
    const purposes = {
      weapon: "Оружие: используй как источник урона, если его класс и характеристики подходят текущей сборке.",
      armor: "Броня: экипируй соответствующие части; полный комплект обычно раскрывает основной бонус набора.",
      acc: "Аксессуар: помести в свободный слот ради пассивного эффекта или используй как ступень дальнейшего улучшения.",
      ammo: "Боеприпас: положи в инвентарь вместе с подходящим стрелковым оружием; он расходуется при выстреле.",
      tool: "Инструмент: используй для добычи, строительства, рыбалки, перемещения или исследования мира.",
      mat: "Материал: сохраняй для следующих рецептов оружия, брони, аксессуаров и прогрессионных компонентов.",
      summon: "Предмет призыва: активирует босса, событие, питомца или маунта при выполнении условий использования.",
      potion: "Расходник: применяй перед боем или исследованием ради лечения, усиления либо полезного временного эффекта.",
      misc: "Специализированный предмет: назначение раскрывается через связанный источник, событие, размещение или дальнейший рецепт."
    };
    return purposes[kind] || purposes.misc;
  }

  function vanillaDescription(item) {
    if (!item) return "";
    const ru = ruItemName(item.name, item);
    const uses = recipeUseCount(item.name);
    const meta = vanillaMetaFor(item);
    const role = vanillaRole(item, meta);
    const stats = vanillaMetaStats(item, meta);
    const tooltip = vanillaTooltipRu(item);
    const statText = stats.length ? ` Основные характеристики: ${stats.join(", ")}.` : "";
    const tooltipText = tooltip ? ` Игровая подсказка: ${completeSentence(tooltip)}` : "";
    return `${ru} — ${role} из ванильной Террарии.${statText}${tooltipText}${uses ? ` Используется в ${recipeCountText(uses)}.` : ""}`;
  }

  function vanillaObtain(item, recipe) {
    if (recipe && recipe.ings && recipe.ings.length) return craftStationSentence(recipe);
    if (!item) return "";
    const low = normalizeArtName(item.name);
    if (String(item.id) === "4325") return "С шансом 1/8 (12,5%) выпадает из Блуждающего рыбоглаза и Зомби-тритона, которых можно выловить во время Кровавой луны.";
    if (low === "hellstone") return "Добывается киркой в Преисподней; руда обжигает персонажа и после разрушения оставляет лаву.";
    if (low === "obsidian") return "Образуется при соприкосновении воды с лавой и затем добывается киркой.";
    if (/^(solar|vortex|nebula|stardust) fragment$/.test(low)) return "Выпадает с соответствующей небесной башни перед Лунным лордом.";
    const type = String(item.type || "");
    if (type === "Enemy banner") return "Автоматически выдаётся после каждых 50 убийств соответствующего врага.";
    if (type === "Quest fish") return "Ловится в указанном для рыбы биоме, когда Рыбак выдаёт соответствующее задание.";
    if (type === "Critter" || type === "Bait") return "Ловится сачком в подходящем биоме; после поимки хранится в инвентаре.";
    if (type === "Ore") return "Добывается киркой из залежей этой руды в мире Террарии.";
    if (type === "Gem") return "Добывается в подземных слоях либо извлекается из подходящих блоков и самоцветных деревьев.";
    if (type === "Pylon") return "Покупается у довольных NPC в соответствующем биоме и размещается в поселении.";
    const dropText = vanillaDropObtainText(item.id);
    if (dropText) return dropText;
    const byType = {
      "Weapon": "Получается без крафта: выпадает с противника, находится в сундуке либо выдаётся за событие или задание.",
      "Accessory": "Получается без крафта: ищи в сундуках, дропе противников, наградах заданий или ассортименте NPC.",
      "Shield": "Получается без крафта как добыча, находка или покупка у NPC.",
      "Armor": "Получается без крафта: выпадает, покупается либо находится в специальном контейнере или структуре.",
      "Vanity": "Декоративный предмет без рецепта: выпадает, покупается или находится в мире и подарочных контейнерах.",
      "Tool": "Инструмент без рецепта: получается из сундука, дропа, задания, рыбалки или магазина NPC.",
      "Hook": "Крюк без рецепта: выпадает с противников, находится в контейнерах или выдаётся как награда.",
      "Crafting material": "Материал без рецепта: добывается в мире, выпадает с противников, вылавливается или открывается из контейнеров.",
      "Ammunition": "Боеприпас без рецепта: покупается, выпадает или находится в контейнерах и наградах событий.",
      "Potion": "Зелье без рецепта: находится в сундуках, горшках, ящиках либо покупается у NPC.",
      "Consumable": "Расходник без рецепта: находится, покупается, вылавливается или выпадает с противников.",
      "Food": "Еда без рецепта: собирается, покупается, вылавливается или выпадает в подходящем биоме.",
      "Furniture": "Предмет мебели без рецепта: находится в структурах, покупается у NPC либо выпадает как награда.",
      "Storage": "Хранилище без рецепта: находится в мире или структурах либо покупается у NPC.",
      "Light source": "Источник света без рецепта: находится, покупается или выпадает в соответствующем событии.",
      "Mechanism": "Механизм без рецепта: покупается у механических NPC или находится в ловушках и структурах мира.",
      "Background": "Фоновая стена без основного рецепта: добывается в мире или получается обратным преобразованием, скрытым для защиты дерева от цикла.",
      "Block": "Базовый блок: добывается киркой, собирается в мире или создаётся окружением; обратный декоративный рецепт не считается источником.",
      "Brick": "Строительный материал без основного рецепта: добывается в структуре или получается как базовый блок мира.",
      "Painting": "Картина без рецепта: находится в подземных домах, структурах или выдаётся за особую активность.",
      "Dye": "Краситель без рецепта: выдаётся Красильщиком, покупается либо получается из необычного растения или противника.",
      "Boss summon": "Предмет призыва без рецепта: находится, покупается или повторно получается после связанного события.",
      "Event summon": "Предмет запуска события без рецепта: выпадает, находится или покупается после нужного этапа прогрессии.",
      "Pet summon": "Предмет питомца без рецепта: выпадает, находится, покупается или выдаётся за достижение.",
      "Light pet": "Светящийся питомец без рецепта: находится, покупается или выпадает из особого источника.",
      "Mount summon": "Предмет маунта без рецепта: выпадает, покупается, вылавливается или открывается из контейнера.",
      "Grab bag": "Контейнер без рецепта: выпадает с босса или события либо выдаётся как награда.",
      "Fishing catches": "Получается рыбалкой в подходящем биоме и при нужных условиях.",
      "Seeds": "Собирается с растений, травы или объектов соответствующего биома.",
      "Key": "Ключ без рецепта: выпадает, находится или создаётся автоматически после выполнения условия мира.",
      "Miscellaneous": "Получается без крафта: как находка, дроп, покупка, рыболовная добыча или награда события."
    };
    return byType[type] || `${vanillaTypeName(type)}: получается без крафта из игрового источника, указанного на официальной странице предмета.`;
  }

  function vanillaWhen(item, recipe) {
    if (recipe && recipe.ings && recipe.ings.length) return vanillaStationTiming(recipe.station);
    if (!item) return "";
    const low = normalizeArtName(item.name);
    const type = String(item.type || "");
    const meta = vanillaMetaFor(item);
    if (String(item.id) === "4325") return "Прехардмод: после начала рыбалки во время Кровавой луны; особенно полезна для повторного вызова её рыболовных противников.";
    if (meta?.["Fishing Power"]) return "Используй после получения при рыбалке: сравни силу удочки с текущей и подготовь подходящую наживку.";
    if (/luminite|solar fragment|vortex fragment|nebula fragment|stardust fragment/.test(low)) return "Финал ванильной прогрессии: после небесных башен или победы над Лунным лордом.";
    if (/shroomite|spectre|ectoplasm|beetle husk/.test(low)) return "Поздний хардмод: после Плантеры и открытия соответствующего источника материала.";
    if (/chlorophyte|life fruit/.test(low)) return "Хардмод после победы над всеми тремя механическими боссами: источник появляется в подземных джунглях.";
    if (/hallowed|soul of|crystal shard|ichor|cursed flame|adamantite|titanium|mythril|orichalcum|palladium|cobalt/.test(low)) return "Хардмод: после Стены плоти и открытия соответствующего ресурса или противника.";
    if (/hellstone|obsidian/.test(low)) return "Поздний прехардмод: после безопасного доступа к лаве и Преисподней.";
    if (type === "Enemy banner") return "После 50 убийств соответствующего врага; ставь перед его дальнейшим фармом.";
    if (type === "Boss summon") return "Перед соответствующим боссом, когда построена арена и подготовлены зелья.";
    if (type === "Event summon") return "Когда готова площадка для события и персонаж способен пережить его волну врагов.";
    if (type === "Quest fish") return "Только в день, когда Рыбак просит эту рыбу; на следующий день задание сменится.";
    if (["Furniture", "Storage", "Light source", "Background", "Block", "Brick", "Painting", "Dye", "Vanity"].includes(type)) return "После получения: это строительный или декоративный предмет, не ограничивающий боевую прогрессию.";
    if (["Pet summon", "Light pet", "Mount summon"].includes(type)) return "После получения; предмет необязателен для победы над боссами.";
    if (["Weapon", "Armor", "Accessory", "Shield", "Tool", "Hook"].includes(type)) return "Сразу после получения, если характеристики улучшают текущую экипировку; перед следующим боссом сравни урон, защиту и мобильность с уже надетыми предметами.";
    if (["Potion", "Consumable", "Food"].includes(type)) return "Перед подходящим боем или исследованием: положи в быстрый доступ и используй до начала опасного этапа либо по необходимости.";
    if (["Crafting material", "Ore", "Gem", "Ammunition"].includes(type)) return "Сохраняй после получения и используй, когда предмет появится в ингредиентах нужного оружия, брони, инструмента или боеприпаса.";
    if (["Bait", "Fishing catches", "Quest fish"].includes(type)) return "Во время рыбалки в нужном биоме; для квестовой рыбы — только в день соответствующего задания Рыбака.";
    if (["Critter", "Seeds"].includes(type)) return "После нахождения подходящего биома: поймай сачком или посади на совместимый блок, в зависимости от типа предмета.";
    return "После получения: отдельная обязательная точка прогрессии не подтверждена, поэтому ориентируйся на назначение и источник предмета.";
  }

  const VANILLA_LOCAL_ART = {
    "fallen star": "assets/lex/vanilla/fallen-star.png",
    acorn: "assets/lex/vanilla/acorn.png",
    coral: "assets/lex/vanilla/coral.png",
    seashell: "assets/lex/vanilla/seashell.png",
    "sand block": "assets/lex/vanilla/sand-block.png",
    "ice block": "assets/lex/vanilla/ice-block.png",
    "snow block": "assets/lex/vanilla/snow-block.png",
    hellstone: "assets/lex/vanilla/hellstone.png",
    "jungle spores": "assets/lex/vanilla/jungle-spores.png",
    "glowing mushroom": "assets/lex/vanilla/mushroom.png",
    "mana crystal": "assets/lex/vanilla/mana-crystal.png",
    "life fruit": "assets/lex/vanilla/life-fruit.png",
    "crystal shard": "assets/lex/vanilla/crystal-shard.png",
    "chlorophyte ore": "assets/lex/vanilla/chlorophyte-ore.png",
    "hermes boots": "assets/lex/vanilla/hermes-boots.png",
    "cloud in a bottle": "assets/lex/vanilla/cloud-in-a-bottle.png",
    "ancient manipulator": "assets/lex/vanilla/ancient-manipulator.png",
    "demon altar": "assets/lex/vanilla/demon-altar.png",
    "iron anvil": "assets/lex/vanilla/iron-anvil.png",
    hellforge: "assets/lex/vanilla/hellforge.png",
    "mythril anvil": "assets/lex/vanilla/mythril-anvil.png",
    "tinkerers workshop": "assets/lex/vanilla/tinkerers-workshop.png",
    guide: "assets/lex/vanilla/guide.png",
    minishark: "assets/lex/vanilla/minishark.png",
    deerclops: "assets/lex/vanilla/deerclops.png",
    "lunatic cultist": "assets/lex/vanilla/lunatic-cultist.png",
    mechanic: "assets/lex/vanilla/mechanic.png",
    "blue dungeon brick": "assets/lex/vanilla/blue-dungeon-brick.png",
    "nights edge": "assets/lex/vanilla/nights-edge.png",
    "pearlstone block": "assets/lex/vanilla/pearlstone-block.png",
    "любой песок": "assets/lex/vanilla/sand-block.png"
  };
  const VANILLA_ART_ALIASES = {
    "lunar bar": "Luminite Bar",
    sand: "Sand Block",
    "empress flight booster": "Soaring Insignia",
    "shadow flame bow": "Shadowflame Bow",
    "shadow flame hex doll": "Shadowflame Hex Doll",
    granite: "Granite Block",
    "boss2 material": "Bone",
    "blood moon starter": "Bloody Tear",
    vertebrae: "Vertebra",
    "cursed flame ichor": "Cursed Flame",
    "hardmode anvil": "Mythril Anvil",
    sundial: "Enchanted Sundial",
    "lunar pickaxe": "Solar Flare Pickaxe",
    "fossil ore": "Desert Fossil",
    "lunar tablet fragment": "Solar Tablet Fragment",
    "any evil water": "Unholy Water",
    "evil water": "Unholy Water",
    "aerial tracker": "Fledgling Wings",
    "fairy queen trophy": "Empress of Light Trophy",
    "sparkle guitar": "Stellar Tune",
    "wings vortex": "Vortex Booster",
    "ancient battle armor material": "Forbidden Fragment",
    "dd2 pet dragon": "Dragon Egg",
    "moonlord bullet": "Luminite Bullet",
    "lunar hamaxe": "Solar Flare Hamaxe",
    "food platter": "Seafood Dinner",
    smolstar: "Blade Staff",
    "piercing starlight": "Starlight",
    marble: "Marble Block",
    "horseshoe bundle": "Bundle of Balloons",
    "recipe system": "Work Bench",
    "trapsight potion": "Dangersense Potion",
    "ancient cultist trophy": "Lunatic Cultist Trophy",
    celeb2: "Celebration Mk2",
    "antlion claw": "Antlion Mandible",
    sdmg: "S.D.M.G.",
    "eo c shield": "Shield of Cthulhu",
    "painter paintball gun": "Paintball Gun",
    "portable stool": "Step Stool",
    starfruit: "Star Fruit",
    "super star cannon": "Super Star Shooter",
    "thunder staff": "Thunder Zapper",
    "lunar flare book": "Lunar Flare"
  };
  const VANILLA_EXTRA_ART = {
    "ash wood": "assets/vanilla-extra/ash-wood.png",
    "wand of frosting": "assets/vanilla-extra/wand-of-frosting.png",
    "fishing bobber": "assets/vanilla-sprites/2374.png",
    "shimmer block": "assets/vanilla-sprites/3234.png",
    "spicy pepper": "assets/vanilla-sprites/4297.png"
  };
  const VANILLA_EN_MAP = {
    "золотой или платиновый слиток": "Gold Bar",
    "демонитовый или кримтановый слиток": "Demonite Bar",
    "любой колчан": "Magic Quiver",
    "любой песок": "Sand Block",
    "любой камень": "Stone Block",
    "любое дерево": "Wood",
    "любой снег": "Snow Block",
    "любой лёд": "Ice Block",
    "any evil block": "Ebonstone Block"
  };
  function fixVanillaName(en) {
    // Internal ItemID tokens omit spaces in names such as “Soulof Light”. A
    // broad “…of” expression also broke the valid word “Lavaproof”, so only
    // the actual Terraria token prefixes are normalized here.
    return String(en)
      .replace(/^(Brain|Dao|Eater|Eye|Rod|Soul|Vial|Wall|Wand)of\s+(?=[A-Z])/, "$1 of ")
      .replace(/^(Brain|Dao|Eater|Eye|Rod|Soul|Vial|Wall|Wand)of([A-Z][a-z]*)/, "$1 of $2")
      .replace(/^(Eye|Scourge|Staff)ofthe\s+/, "$1 of the ")
      .replace(/^Fragment (Solar|Vortex|Nebula|Stardust)$/i, "$1 Fragment")
      .trim();
  }
  function vanillaIngredientArt(name) {
    const key = normalizeArtName(name);
    if (VANILLA_LOCAL_ART[key]) return { local: VANILLA_LOCAL_ART[key] };
    const mapped = VANILLA_EN_MAP[key];
    let en = mapped || name;
    if (!mapped) {
      // «Any X» → X; «X или Y» → X
      en = String(en).replace(/^any\s+/i, "").replace(/^любой\s+|^любого\s+|^любая\s+|^любое\s+|^любые\s+/i, "").split(/\s+или\s+/)[0].trim();
      if (!/[A-Za-z]/.test(en)) return null;
    }
    en = fixVanillaName(en);
    const normalized = normalizeArtName(en);
    const extra = VANILLA_EXTRA_ART[normalized];
    if (extra) return { local: extra, representative: !["ash wood", "wand of frosting"].includes(normalized) };
    const canonical = VANILLA_ART_ALIASES[normalized] || en;
    const vanilla = vanillaItemForName(canonical);
    if (vanilla && vanilla.sprite) return { local: vanilla.sprite, representative: canonical !== en };
    return { remote: `https://terraria.wiki.gg/wiki/Special:FilePath/${encodeURIComponent(canonical)}.png` };
  }

  const INGREDIENT_NAME_ALIASES = [
    [/вульфрум.*лом/i, "Wulfrum Metal Scrap"],
    [/люб.*пес/i, "Sand Block"],
    [/челюст.*муравьин/i, "Antlion Mandible"],
    [/челюст.*шторм/i, "Stormlion Mandible"],
    [/остан(к|ок|ка|ков)|морск.*остан/i, "Sea Remains"],
    [/порчен.*гел/i, "Blighted Gel"],
    [/эбонит|кримкамен/i, "Ebonstone Block"],
    [/адск.*кам/i, "Hellstone"],
    [/^л[её]д$/i, "Ice Block"],
    [/нечестив.*ядер/i, "Unholy Core"],
    [/эссенц.*хаос/i, "Essence of Havoc"],
    [/душ.*ноч/i, "Soul of Night"],
    [/адск.*слит/i, "Hellstone Bar"],
    [/эктоплазм/i, "Ectoplasm"],
    [/крионит.*слит/i, "Cryonic Bar"],
    [/многолет.*слит/i, "Perennial Bar"],
    [/скори.*слит/i, "Scoria Bar"],
    [/чумн.*банк/i, "Plague Cell Canister"],
    [/лунн.*фрагмент/i, "Solar Fragment"],
    [/гибельн.*душ/i, "Ruinous Soul"],
    [/зуб.*жнец/i, "Reaper Tooth"],
    [/галактическ.*сингуляр/i, "Solar Fragment"],
    [/осколк.*т[её]мн.*солн/i, "Darksun Fragment"],
    [/эндотерм/i, "Endothermic Energy"],
    [/ауриков.*слит/i, "Auric Bar"],
    [/куск.*таррагон/i, "Tarragon Breastplate"],
    [/кровав.*вспыш/i, "Bloodflare Body Armor"],
    [/богоубийц/i, "God Slayer Chestplate"],
    [/сильв/i, "Silva Armor"],
    [/хардмод.*кузн/i, "Adamantite Forge"],
    [/^фрагменты$/i, "Solar Fragment"],
    [/жемчужн.*оскол/i, "Pearl Shard"],
    [/корал/i, "Coral"],
    [/морск.*зв[её]зд/i, "Starfish"],
    [/ракуш/i, "Seashell"],
    [/сомнительн.*обшив/i, "Dubious Plating"],
    [/загадочн.*схем/i, "Mysterious Circuitry"],
    [/люб.*желез/i, "Iron Bar"],
    [/инфернальн.*суевит/i, "Infernal Suevite"],
    [/ш[её]лк/i, "Silk"],
    [/дерев.*верстак|^дерев[ао]$/i, "Wood"],
    [/ядро.*наковальн/i, "Energy Core"],
    [/новые детали/i, "Dubious Plating"],
    [/золот.*платинов.*корон/i, "Gold Crown"],
    [/гел.*алтар/i, "Gel"],
    [/провод/i, "Wire"],
    [/обшивка.*схем/i, "Dubious Plating"],
    [/кровав.*сфер/i, "Blood Orb"],
    [/мифрил.*орихалк/i, "Mythril Bar"],
    [/детал.*дрейдон/i, "Mysterious Circuitry"],
    [/арктическ.*костюм.*ныр/i, "Arctic Diving Gear"],
    [/материал.*бездн/i, "Depth Cells"],
    [/схем.*плането[ий]д/i, "Starblight Soot"],
    [/^банки$/i, "Plague Cell Canister"],
    [/крутящ.*эфир/i, "Twisting Nether"],
    [/материал.*событ/i, "Nightmare Fuel"],
    [/^материалы$/i, "Life Alloy"],
    [/^компьютер$/i, "Codebreaker Base"],
    [/лучш.*оружие.*ветк/i, "Exoblade"],
    [/^материя$/i, "Miracle Matter"]
  ];
  function ingredientAliasName(value) {
    const raw = String(value || "").trim();
    const alias = INGREDIENT_NAME_ALIASES.find(([pattern]) => pattern.test(raw));
    return alias ? alias[1] : raw;
  }

  function ingredientInfo(name) {
    buildNameIndexes();
    const requestedName = String(name || "");
    const aliasedName = ingredientAliasName(requestedName);
    const forcedVanilla = /^vanilla:\d+$/i.test(requestedName);
    const forcedCatalog = /^catalog:.+$/i.test(requestedName);
    const directExtra = EXTRA_ITEM_INFO[aliasedName] || null;
    const fixedVanillaName = fixVanillaName(aliasedName);
    const canonicalVanillaName = VANILLA_ART_ALIASES[normalizeArtName(fixedVanillaName)] || fixedVanillaName;
    // Explicit recipe-group records must win over fuzzy vanilla lookup: “Any
    // Food” is not one particular Food item, even though its honest local art
    // uses one valid member as a visibly labeled example. Internal ItemID names
    // such as SoulofFright/Celeb2 are canonicalized before the official RU map.
    const directVanilla = directExtra?.art && !forcedVanilla ? null : vanillaItemForName(canonicalVanillaName);
    const directCatalog = forcedCatalog ? catalogByName(requestedName) : null;
    const lookupName = directCatalog ? directCatalog.name : directVanilla ? directVanilla.name : aliasedName;
    const key = normalizeArtName(lookupName);
    const cat = directCatalog || (forcedVanilla ? null : catalogByName(lookupName));
    const lex = exactLexLookup(lookupName);
    const guide = GUIDE_BY_NORM.get(key)
      || (lex && (GUIDE_BY_NORM.get(normalizeArtName(lex.en)) || GUIDE_BY_NORM.get(normalizeArtName(lex.ru))))
      || null;
    const extra = directExtra
      || EXTRA_ITEM_INFO[lookupName]
      || (lex && EXTRA_ITEM_INFO[lex.en])
      || null;
    const vanilla = directVanilla || (lex && vanillaItemForName(lex.en)) || null;
    const preferVanilla = !!vanilla && (forcedVanilla || !cat);
    const preferCatalog = Boolean(directCatalog);
    // Для записи ванильного индекса официальный ItemName по числовому ID
    // важнее старых алиасов словаря: иначе разные наковальни, ботинки и руды
    // ошибочно получали одно обобщённое имя.
    let ru = (preferVanilla && ruItemName(lookupName, vanilla))
      || EXACT_RECIPE_RU[lookupName]
      || (preferCatalog && ruItemName(lookupName, directCatalog))
      || (guide && guide.nameRu)
      || (lex && lex.ru)
      || (extra && extra.ru)
      || (cat ? ruItemName(lookupName, cat) : ruItemName(lookupName))
      || lookupName;
    let en = preferVanilla && String(vanilla.name).toLocaleLowerCase("ru") !== String(ru).toLocaleLowerCase("ru") ? vanilla.name : "";
    if (!en && preferCatalog && directCatalog.name.toLocaleLowerCase("ru") !== String(ru).toLocaleLowerCase("ru")) en = directCatalog.name;
    if (!en && !preferCatalog && lex && lex.en && String(lex.en).toLocaleLowerCase("ru") !== String(ru).toLocaleLowerCase("ru")) en = lex.en;
    if (!en && extra && extra.en) en = extra.en;
    if (!en && cat && cat.name.toLocaleLowerCase("ru") !== String(ru).toLocaleLowerCase("ru")) en = cat.name;
    if (!en && guide && /[A-Za-z]/.test(String(guide.name)) && String(guide.name).toLocaleLowerCase("ru") !== String(ru).toLocaleLowerCase("ru")) en = guide.name;
    if (EXACT_RECIPE_RU[lookupName] && /[A-Za-z]/.test(lookupName)) en = lookupName;
    let art = cat
      ? `assets/item-sprites/${encodeURIComponent(cat.id)}.png`
      : ((vanilla && vanilla.sprite) || (extra && extra.art) || resolveArt(lookupName) || (lex && resolveArt(lex.en)) || (guide ? spriteOfFixed(guide) : ""));
    let remoteArt = "";
    if (!art) {
      const vanilla = vanillaIngredientArt(lookupName);
      if (vanilla && vanilla.local) art = vanilla.local;
      else if (vanilla && vanilla.remote) remoteArt = vanilla.remote;
    }
    const vanillaRecipeRaw = vanilla && VANILLA_RECIPE_BY_ID.get(String(vanilla.id));
    const vanillaRecipe = vanillaRecipeRaw
      ? { ings: vanillaRecipeRaw.ings, station: vanillaStationName(vanillaRecipeRaw.station), yield: Math.max(1, Number(vanillaRecipeRaw.yield || 1)) }
      : null;
    const recipes = getRecipeIndex();
    let recipe = null;
    if (forcedVanilla) recipe = vanillaRecipe;
    else if (cat) recipe = recipes.get(normalizeArtName(cat.name)) || null;
    else recipe = recipes.get(key)
      || (lex && recipes.get(normalizeArtName(lex.en)))
      || (guide && recipes.get(normalizeArtName(guide.name)))
      || vanillaRecipe
      || null;
    const cycleCut = Boolean(vanilla && VANILLA_RECIPE_CUT_IDS.has(String(vanilla.id)))
      || [key, cat && normalizeArtName(cat.name), lex && normalizeArtName(lex.en), guide && normalizeArtName(guide.name)].filter(Boolean).some((candidate) => recipeCycleCuts.has(candidate));
    const resolvedKind = preferVanilla ? vanillaKind(vanilla.type) : cat ? cat.kind : (extra && extra.kind) || (guide && guide.kind) || "mat";
    const bossLinks = bossRelationsFor({ id: cat?.id || "", name: lookupName, vanilla: preferVanilla ? vanilla : null });
    let desc = preferVanilla
      ? vanillaDescription(vanilla)
      : (cat && cat.description)
        || (lex && lex.desc)
        || (guide && (guide.desc || ""))
        || (extra && extra.desc)
        || "";
    if (desc.length < 60) desc = `${completeSentence(desc)} ${purposeByKind(resolvedKind)}`.trim();
    desc = withBossRelationDescription(desc, bossLinks);
    const obtainRaw = preferVanilla
      ? vanillaObtain(vanilla, recipe)
      : (cycleCut ? "Базовый ресурс обратного преобразования: декоративный рецепт скрыт, чтобы дерево не замыкалось само на себя." : "")
        || (cat && (bossObtainOverride(cat) || cat.obtain))
        || (guide && guide.get)
        || (lex && lex.where)
        || (extra && extra.obtain)
        || craftStationSentence(recipe);
    const compositeCraft = !recipe && /^Крафт\.?$/i.test(String(obtainRaw || "").trim());
    let obtain = compositeCraft
      ? "Это составной комплект: шлем, нагрудник и поножи создаются по отдельным рецептам. Выбери конкретную часть комплекта или открой справочную страницу, чтобы увидеть её ингредиенты."
      : ruText(obtainRaw);
    if (recipe && obtain.length < 45) obtain = `${completeSentence(obtain === "Крафт" ? craftStationSentence(recipe) : obtain)} Полный состав и количество показаны в рецепте ниже.`;
    // Карточка дерева должна быть полезной даже для записи из полного
    // каталога, у которой нет отдельной строки в словаре: назначение и этап
    // берём из тех же русских правил, что используются в каталоге.
    let used = preferVanilla
      ? vanillaPurpose(vanilla)
      : (cat && catalogPurpose(cat))
        || (guide && (guide.why || guide.use || ""))
        || (lex && lex.used)
        || (extra && extra.used)
        || purposeByKind(resolvedKind);
    if (used.length < 50) used = `${completeSentence(used)} ${purposeByKind(resolvedKind)}`;
    let when = preferVanilla
      ? vanillaWhen(vanilla, recipe)
      : (cat && CATALOG_STAGE[Math.min(Math.max(cat.stage, 0), CATALOG_STAGE.length - 1)])
        || (guide && guide.when)
        || (extra && extra.when)
        || (guide && guide.q ? `Глава ${guide.q} «${CODEX.quests.find((quest) => quest.id === Number(guide.q))?.title || "Маршрут"}»: используй на этом этапе перед переходом к следующей главе.` : "")
        || "После получения: используй на этапе, указанном источником и назначением предмета.";
    if (when.length < 70) when = `${completeSentence(when)} Перед переходом дальше проверь, доступен ли указанный источник и улучшает ли предмет текущую сборку.`;
    const typeLabel = preferVanilla ? vanillaRole(vanilla) : (KIND_RU[resolvedKind] || "Предмет");
    const semanticStats = preferVanilla ? vanillaMetaStats(vanilla) : [];
    return { name: lookupName, key: requestedName, ru, en, art, artNote: (extra && extra.artNote) || "", desc, obtain, recipe, cycleCut, compositeCraft, used, when, kind: resolvedKind, typeLabel, semanticStats, catName: cat ? cat.name : "", remoteArt, vanilla, bossLinks };
  }
  const isTreeEntry = (info) => Boolean(info && (info.recipe || info.vanilla || info.catName));

  const GENERIC_OBTAIN_RE = /без рецепта|точный источник|соответствующ(?:его|ем|ий) (?:босса|биоме)|создаётся или добывается|получается как (?:награда|редкая)|находится, покупается|выпадает, находится|из игрового источника|точный рецепт есть на официальной/i;
  const isGenericObtainText = (value) => GENERIC_OBTAIN_RE.test(String(value || ""));
  const WIKI_SOURCE_CACHE_KEY = "calamity-codex-wiki-sources-v4";
  let wikiSourceCache = null;
  function getWikiSourceCache() {
    if (wikiSourceCache) return wikiSourceCache;
    try { wikiSourceCache = JSON.parse(localStorage.getItem(WIKI_SOURCE_CACHE_KEY) || "{}"); }
    catch { wikiSourceCache = {}; }
    return wikiSourceCache;
  }
  function cacheWikiSource(key, value, language = "ru", wiki = "terraria") {
    const cache = getWikiSourceCache();
    cache[key] = { text: value, language, wiki, savedAt: Date.now() };
    const entries = Object.entries(cache).sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0)).slice(0, 300);
    wikiSourceCache = Object.fromEntries(entries);
    try { localStorage.setItem(WIKI_SOURCE_CACHE_KEY, JSON.stringify(wikiSourceCache)); } catch { /* optional cache */ }
  }
  function officialWikiProfile(info) {
    if (!info) return null;
    if (info.vanilla) {
      const ruTitle = String(info.ru || "").trim();
      const enTitle = String(info.vanilla.name || info.en || info.name || "").trim();
      return {
        key: `terraria:${enTitle.toLocaleLowerCase("en")}`,
        label: "официальная Terraria Wiki",
        url: `https://terraria.wiki.gg/ru/wiki/${encodeURIComponent(ruTitle || enTitle).replace(/%20/g, "_")}`,
        requests: [
          ["https://terraria.wiki.gg/ru/api.php", ruTitle, "ru"],
          ["https://terraria.wiki.gg/ru/api.php", enTitle !== ruTitle ? enTitle : "", "ru"],
          ["https://terraria.wiki.gg/api.php", enTitle, "en"]
        ].filter((entry) => entry[1])
      };
    }
    const title = String(info.en || info.catName || info.name || "").trim();
    if (!title || !/[A-Za-z]/.test(title)) return null;
    return {
      key: `calamity:${title.toLocaleLowerCase("en")}`,
      label: "официальная Calamity Mod Wiki",
      url: `https://calamitymod.wiki.gg/wiki/Special:Search?search=${encodeURIComponent(title)}`,
      requests: [
        ["https://calamitymod.wiki.gg/ru/api.php", title, "ru"],
        ["https://calamitymod.wiki.gg/api.php", title, "en"]
      ]
    };
  }
  async function requestWikiExtract(apiUrl, pageTitle, language) {
    const clean = (raw) => {
      let text = String(raw || "").trim().split(/\n\s*\n/)[0].replace(/\s+/g, " ").slice(0, 1400);
      if (language === "ru") text = ruText(text.replace(/\(\s*англ\.\s*[^)]+\)/gi, "").replace(/\s+/g, " ").trim());
      return text;
    };
    const call = async (params) => {
      const api = new URL(apiUrl);
      api.search = new URLSearchParams({ format: "json", origin: "*", ...params });
      const response = await fetch(api, { mode: "cors", credentials: "omit" });
      if (!response.ok) throw new Error(`wiki ${response.status}`);
      return response.json();
    };
    try {
      const payload = await call({ action: "query", prop: "extracts", exintro: "1", explaintext: "1", redirects: "1", titles: pageTitle });
      const page = Object.values(payload?.query?.pages || {})[0];
      const extract = String(page?.extract || "").trim();
      if (extract && page?.missing === undefined && !/содержимое на этой странице отсутствует/i.test(extract)) {
        return { text: clean(extract), language };
      }
    } catch { /* пробуем поисковый сниппет того же зеркала */ }
    // Резерв: TextExtracts может быть отключён или страница переименована —
    // берём точный поисковый сниппет той же официальной wiki.
    const found = await call({ action: "query", list: "search", srsearch: pageTitle, srlimit: "1", srprop: "snippet" });
    const hit = (found?.query?.search || [])[0];
    const snippet = String(hit?.snippet || "").replace(/<[^>]+>/g, "").replace(/&\w+;/g, " ").trim();
    if (!snippet || !hit?.title) throw new Error("no wiki extract");
    return { text: clean(`${hit.title}: ${snippet}`), language };
  }
  async function enrichWikiSource(root, info) {
    const box = root?.querySelector?.("[data-wiki-live]");
    const profile = officialWikiProfile(info);
    if (!box || !profile || visualRecipeFor(info.key || info.name)) return;
    if (info.vanilla && vanillaItemSources(info.vanilla.id).length) { box.hidden = true; return; }
    const cached = getWikiSourceCache()[profile.key];
    const paragraph = box.querySelector("p");
    const label = box.querySelector("small");
    const link = box.querySelector("a");
    if (link) link.href = profile.url;
    const apply = (text, cachedResult = false, language = "ru") => {
      if (!paragraph || !text) return;
      paragraph.textContent = text;
      delete paragraph.dataset.mobLinked;
      linkifyMobMentions(paragraph);
      box.hidden = false;
      box.classList.remove("failed");
      box.classList.add("loaded");
      if (!info.cycleCut) box.closest(".noncraft-source")?.classList.add("wiki-enriched");
      const languageMark = language === "en" ? " · EN" : "";
      if (label) label.textContent = cachedResult ? `${profile.label}${languageMark} · сохранённая копия` : `${profile.label}${languageMark} · получено онлайн`;
    };
    if (cached?.text && Date.now() - Number(cached.savedAt || 0) < 30 * 864e5) {
      apply(cached.text, true, cached.language || "ru");
      return;
    }
    if (document.body.classList.contains("lite")) {
      box.hidden = false;
      box.classList.add("loaded");
      if (label) label.textContent = `${profile.label} · лёгкий режим`;
      if (paragraph) paragraph.textContent = "Автопроверка по сети отключена лёгким режимом. Открой официальную страницу по ссылке ниже или выключи лёгкий режим в боковой панели.";
      return;
    }
    box.hidden = false;
    if (label) label.textContent = `${profile.label} · проверяем источник…`;
    if (paragraph) paragraph.textContent = "Ищем конкретный способ получения, противника, структуру, магазин или условие появления предмета.";
    for (const [apiUrl, title, language] of profile.requests) {
      try {
        const result = await requestWikiExtract(apiUrl, title, language);
        cacheWikiSource(profile.key, result.text, language, info.vanilla ? "terraria" : "calamity");
        apply(result.text, false, language);
        return;
      } catch { /* пробуем следующую официальную локализацию */ }
    }
    if (cached?.text) {
      apply(cached.text, true, cached.language || "ru");
      return;
    }
    box.classList.add("failed");
    if (label) label.textContent = `${profile.label} · проверка недоступна`;
    if (paragraph) paragraph.textContent = "Не удалось получить данные автоматически. Открой официальную страницу по ссылке ниже — локальная карточка не подменяет источник догадкой.";
  }

  /* ---------- источники предметов: NPC-дроп, тайлы, сундуки ---------- */
  let NPC_SOURCES = window.CALAMITY_NPC_SOURCES || {};
  let VANILLA_DROPS = window.CALAMITY_VANILLA_DROPS || { npc: {} };
  let NPC_DATA = window.CALAMITY_NPCS || {};
  let NPC_RU_EXTRA = window.CALAMITY_NPC_RU || {};
  let NPC_BESTIARY_RU = window.CALAMITY_NPC_BESTIARY_RU || {};
  const NPC_WHERE_RU = {
    "Laserfish": "Бездна, глубокая вода. Спускайся ниже верхних слоёв и ищи кибернетическую фауну Дрейдона; чаще встречается после Левиафана.",
    "Burrower": "Подземные лаборатории Дрейдона и их шахтные коридоры. Ищи рядом с лабораторными механизмами; в тесных проходах он быстро набирает скорость.",
    "Reaper Shark": "Глубокая Бездна, обычно в воде. Это редкая акула нижних слоёв; после Полтергаста появляется дополнительный ценный дроп.",
    "Eidolon Wyrm": "Самое дно Бездны. Спускайся в глубокую воду с хорошей мобильностью: змей охраняет нижние слои и резко усиливается при подъёме.",
    "Primordial Wyrm": "Дно Бездны, финальные глубины. Это скрытый сильнейший обитатель жёлоба; готовься к бою до того, как начнёшь собирать дроп.",
    "Bloatfish": "Водные слои Бездны. Появляется в глубине среди войдстоуновых существ; для фарма бери дыхание и свет.",
    "Bobbit Worm": "Глубокая Бездна. Встречается в воде среди крупных хищников, поэтому не стой на месте и держи путь к поверхности открытым.",
    "Colossal Squid": "Бездна, подводные глубокие слои. Ищи в воде после продвижения по океанской ветке; тесные тоннели лучше заранее расчистить.",
    "Giant Squid": "Бездна, глубокая вода. Появляется в тех же слоях, где добываются глубинные материалы; используй свет и зелье дыхания.",
    "Gulper Eel": "Средние и глубокие слои Бездны. Опасен в воде и преследует игрока по тоннелям; оставь место для рывка.",
    "Cuttlefish": "Бездна, под водой. Маскируется среди окружения и атакует внезапно; добывается вместе с глубинными материалами.",
    "Mirage Jelly": "Бездна, водные слои. Ищи среди медуз и других существ жёлоба; добыча редкая, поэтому пригодится широкий светящийся маршрут.",
    "Luminous Corvina": "Бездна, средние и глубокие слои. Встречается в воде и служит одним из источников глубинных материалов.",
    "Acid Eel": "Сернистое море во время кислотного дождя. Появляется над зелёной водой; безопаснее фармить с платформы, а не из воды.",
    "Nuclear Toad": "Сернистое море во время кислотного дождя. Ищи на поверхности воды и в прибрежных участках, держи дистанцию от радиоактивных атак.",
    "Radiator": "Сернистое море во время кислотного дождя. Появляется над зелёной водой; не стой в кислотных лужах.",
    "Skyfin": "Небо над Сернистым морем во время кислотного дождя. Летает стаями, поэтому удобны пронзающие снаряды.",
    "Sulphurous Skater": "Сернистое море и его поверхность во время кислотного дождя. Быстро скользит по воде — арена над океаном заметно упрощает фарм.",
    "Mauler": "Сернистое море во время кислотного дождя. Редкая акула выходит к берегу во время события; не сражайся в воде без мобильности.",
    "Nuclear Terror": "Сернистое море во время сильной фазы кислотного дождя. Появляется в опасной зоне события и требует открытой арены.",
    "Orthocera": "Сернистое море во время кислотного дождя. Встречается над водой после продвижения по событию; хорошо фармится с высоты.",
    "Astral Slime": "Астральная инфекция, поверхность и подземные участки. Появляется после открытия астральной ветки; собирай руду и материалы ночью, если нужен редкий дроп.",
    "Astraglomerate": "Астральная инфекция. Ищи среди астральных врагов на заражённой поверхности; не позволяй мелким частям окружить персонажа.",
    "Atlas": "Астральная инфекция, заражённые поверхности и пещеры. Медленный, но очень тяжёлый противник; оставь длинную линию для отхода.",
    "Fusion Feeder": "Астральная инфекция, поверхность и небо. Держи вертикальную мобильность: враг атакует с дистанции и часто появляется группой.",
    "Hadarian": "Астральная инфекция, открытая поверхность. Появляется среди звёздных существ; дальняя атака безопаснее ближнего боя.",
    "Mantis": "Астральная инфекция, поверхность и открытые пещеры. Быстрый противник с режущими атаками, поэтому оставь свободную арену.",
    "Nova": "Астральная инфекция, заражённая поверхность. Не стой рядом: нестабильное ядро врага взрывается после атаки.",
    "Stellar Culex": "Астральная инфекция и заражённое небо. Появляется среди астральной фауны; удобнее фармить на длинной платформе.",
    "Wulfrum Drone": "Поверхность днём в начале игры. Ищи рядом с точкой появления и базой; это один из первых источников вульфрумового лома.",
    "Wulfrum Rover": "Поверхность днём до первых боссов. Встречается рядом с вульфрумовыми машинами и иногда закрывает проход щитом.",
    "Wulfrum Gyrator": "Поверхность днём в начале прохождения. Держись на расстоянии от вращающейся атаки и фарми рядом с домом.",
    "Wulfrum Hovercraft": "Поверхность днём до первых боссов. Летает над землёй и стреляет, поэтому для фарма лучше открытая площадка.",
    "Wulfrum Amplifier": "Поверхность днём в начале игры, рядом с другими вульфрумовыми машинами. Опаснее обычного дрона из-за усиленной атаки.",
    "Pestilent Slime": "Джунгли и их подземная часть после Голема. Появляется среди чумных противников и служит источником материалов чумной ветки.",
    "Plague Charger": "Джунгли во время чумного события. Быстро атакует по горизонтали; открытая арена над кронами безопаснее пещер.",
    "Cragmaw Mire": "Серный кратер и кислотный дождь. Ищи в опасной фазе события; огнестойкость и длинная платформа обязательны.",
    "Soul Slurper": "Серный кратер и связанные с ним подземные участки. Появляется среди огненных врагов после открытия кратера.",
    "Heat Spirit": "Серный кратер, открытые горячие участки. Уязвимее на длинной арене, чем в узких лавовых тоннелях.",
    "Infernal Congealment": "Серный кратер, глубинные горячие пещеры. Ищи рядом с лавой и заранее приготовь огнестойкость.",
    "Flak Crab": "Сернистое море во время позднего кислотного дождя. Держись выше воды: осколочные атаки опасны в узких местах.",
    "Scorn Eater": "После Лунного лорда: Святые земли или Преисподняя. Рывками прыгает к игроку и служит источником нечестивой эссенции.",
    "Stormlion": "Пустыня днём. Ищи в песках до Пустынного бича; его челюсть нужна для Пустынного медальона.",
    "Crabulon": "Подземный грибной биом. Враг охраняет грибные пещеры и появляется рядом со светящимися грибами.",
    "Clam": "Затонувшее море под пустыней. Обычный моллюск живёт в воде и у морского дна, освобождая материалы для ранних рецептов."
  };
  const NPC_RU = new Map();
  function buildNpcRu() {
    if (NPC_RU.size) return;
    Object.keys(NPC_DATA).forEach((name) => {
      const lex = exactLexLookup(name);
      if (lex && lex.ru && lex.ru !== name) NPC_RU.set(name, lex.ru);
    });
    Object.keys(NPC_RU_EXTRA).forEach((name) => NPC_RU.set(name, NPC_RU_EXTRA[name]));
  }
  function npcRuName(name) {
    buildNpcRu();
    return NPC_RU.get(name) || ruText(name) || name;
  }
  function matchRouteName(left, right) {
    const a = normalizeArtName(left);
    const b = normalizeArtName(right);
    return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
  }
  function bossRecordForName(name) {
    return (CODEX.bosses || []).find((boss) => matchRouteName(name, boss.en) || matchRouteName(name, boss.name)) || null;
  }
  function miniRecordForName(name) {
    return (CODEX.minis || []).find((mini) => matchRouteName(name, mini.en) || matchRouteName(name, mini.name)) || null;
  }
  function npcIsBossByName(name) {
    return !!bossRecordForName(name) || !!miniRecordForName(name);
  }
  function npcWhereForName(name) {
    if (NPC_WHERE_RU[name]) return NPC_WHERE_RU[name];
    const info = NPC_DATA[name] || {};
    if (info.biome || info.source) return [info.biome, info.source].filter(Boolean).map(ruText).join(". ");
    const low = String(name || "").toLocaleLowerCase("ru");
    if (/wulfrum|вульфрум/.test(low)) return "Поверхность днём в начале игры, рядом с базой и первыми пещерами.";
    if (/plague|чум/.test(low)) return "Джунгли и подземные джунгли после Голема, среди противников чумной ветки.";
    if (/astral|астрал|nova|mantis|atlas/.test(low)) return "Астральная инфекция: заражённая поверхность, небо и связанные пещеры.";
    if (/abyss|wyrm|eel|squid|fish|corvina|shark|cuttle|jelly|bloat|bobbit|luminous/.test(low)) return "Бездна: ищи в подводных слоях, глубина зависит от этапа прохождения.";
    if (/sulph|acid|nuclear|mauler|radiator|orthocera|skater|crab/.test(low)) return "Сернистое море и кислотный дождь: фарми над зелёной водой на открытой платформе.";
    if (/brimstone|infernal|heat|soul|crag/.test(low)) return "Серный кратер и его горячие подземные участки; пригодится огнестойкость.";
    return "";
  }
  function npcSourceForItem(it) {
    if (!it) return null;
    const id = it.id || (catalogByName(it.name) ? catalogByName(it.name).id : "");
    if (bossObtainOverride(id)) return null;
    return id ? (NPC_SOURCES[id] || null) : null;
  }
  function npcIsBoss(name) { return npcIsBossByName(name); }
  let itemByIdCache = null;
  function itemById(id) {
    if (!itemByIdCache) {
      itemByIdCache = new Map();
      indexedItems().forEach((it) => itemByIdCache.set(it.id, it));
    }
    return itemByIdCache.get(id) || null;
  }
  function itemRuById(id) {
    const it = itemById(id);
    if (!it) return ruItemName(id);
    return ruItemName(it);
  }
  function npcArtForName(name) {
    const direct = window.CALAMITY_NPC_ART && window.CALAMITY_NPC_ART[name];
    if (direct) return direct;
    const boss = bossRecordForName(name);
    if (boss) return routeBossArt(boss);
    const mini = miniRecordForName(name);
    if (mini) return mini.art || BOSS_ART_BY_ID[mini.id] || "";
    const mob = mobByName(name);
    if (mob && mob.art) return mob.art;
    const lex = exactLexLookup(name);
    return (lex && (LEX_ART[lex.en] || BOSS_ART_BY_ID[lex.id])) || resolveArt(name) || "";
  }
  function npcSourceArt(name) {
    const art = npcArtForName(name);
    return art
      ? `<span class="npc-source-art"><img src="${escAttr(art)}" alt="" loading="lazy" decoding="async" /></span>`
      : `<span class="npc-source-art npc-source-art-empty" aria-hidden="true">☠</span>`;
  }
  const WORLD_SOURCE_ART = Object.freeze({
    "турель лаборатории Дрейдона": "assets/item-sprites/HostileLabTurret.png",
    "огненная турель": "assets/item-sprites/HostileFireTurret.png",
    "ледяная турель": "assets/item-sprites/HostileIceTurret.png",
    "лазерная турель": "assets/item-sprites/HostileLaserTurret.png",
    "ониксовая турель": "assets/item-sprites/HostileOnyxTurret.png",
    "чумная турель": "assets/item-sprites/HostilePlagueTurret.png",
    "водяная турель": "assets/item-sprites/HostileWaterTurret.png",
    AbyssalPots: "assets/source-sprites/abyssal-pot.png",
    SulphurousPots: "assets/source-sprites/sulphurous-pot.png",
    SpineTree: "assets/item-sprites/SpineSapling.png",
    "сундуки лабораторий Дрейдона": "assets/item-sprites/SecurityChest.png",
    "сундуки серного кратера": "assets/item-sprites/AshenChest.png",
    "весенний перевал": "assets/item-sprites/BotanicChest.png",
    "аэролитовая руда": "assets/item-sprites/AerialiteOre.png",
    "руда улиблюма": "assets/item-sprites/UelibloomOre.png",
    "ауриковая руда": "assets/item-sprites/AuricOre.png",
    "крионитовая руда": "assets/item-sprites/CryonicOre.png",
    "многолетняя руда": "assets/item-sprites/PerennialOre.png",
    "скориевая руда": "assets/item-sprites/ScoriaOre.png",
    "кластер экзодиума": "assets/item-sprites/ExodiumCluster.png",
    "обугленная руда": "assets/item-sprites/BrimstoneSlag.png",
    "астральная руда": "assets/item-sprites/AstralOre.png",
    "морская призма": "assets/item-sprites/SeaPrism.png",
    "лабораторная турель": "assets/item-sprites/LabTurret.png",
    "кузня Дрейдона": "assets/item-sprites/DraedonsForge.png",
    "адская руда": "assets/item-sprites/BrimstoneSlag.png",
    "серный шлак": "assets/item-sprites/BrimstoneSlag.png"
  });
  function worldSourceRecord(value) {
    const raw = typeof value === "object" && value ? String(value.name || value.label || "") : String(value || "");
    const name = ruText(raw);
    const art = (typeof value === "object" && value && value.art) || WORLD_SOURCE_ART[raw] || WORLD_SOURCE_ART[name] || resolveArt(raw) || "";
    return { raw, name, art };
  }
  function worldSourceChip(value) {
    const source = worldSourceRecord(value);
    return `<span class="world-source-chip" title="${escAttr(source.name)}">${source.art
      ? `<span class="world-source-art"><img src="${escAttr(source.art)}" alt="" loading="lazy" decoding="async" /></span>`
      : `<span class="world-source-art world-source-art-empty" aria-hidden="true">⌖</span>`}<b>${esc(source.name)}</b></span>`;
  }
  function npcSourceLines(sources, short) {
    if (!sources) return "";
    const parts = [];
    (sources.npcs || []).forEach((d) => {
      const chance = d.chance ? `<em>${esc(d.chance)}${d.qty ? ` · ${esc(d.qty)}` : ""}</em>` : "";
      const cond = d.cond ? `<i>${esc(d.cond)}</i>` : "";
      parts.push(`<span class="src-drop npc-source-drop">${npcSourceArt(d.npc)}<span class="npc-source-copy"><span class="npc-source-name"><i class="src-ico" aria-hidden="true">☠</i><b class="npc-tip" data-npc="${escAttr(d.npc)}" role="button" tabindex="0">${esc(npcRuName(d.npc))}</b></span>${chance || cond ? `<span class="src-drop-meta">${chance}${cond}</span>` : ""}</span></span>`);
    });
    if (!short) {
      if ((sources.tiles || []).length) parts.push(`<span class="src-drop world-source-group"><span class="world-source-label"><i class="src-ico" aria-hidden="true">⌖</i>Выбивается из</span><span class="world-source-grid">${sources.tiles.map(worldSourceChip).join("")}</span></span>`);
      if ((sources.chests || []).length) parts.push(`<span class="src-drop world-source-group"><span class="world-source-label"><i class="src-ico" aria-hidden="true">▤</i>Лежит в</span><span class="world-source-grid">${sources.chests.map(worldSourceChip).join("")}</span></span>`);
    }
    return parts.join("");
  }

  /* Чипы-«полочки» ингредиентов: спрайт, количество, имя; ховер — карточка, клик — дерево */
  function ingChipHTML(name, count) {
    const info = ingredientInfo(name);
    const art = info.art
      ? `<img class="ings-icon" src="${escAttr(info.art)}" alt="" loading="lazy" decoding="async" />`
      : (info.remoteArt
        ? `<img class="ings-icon remote" src="${escAttr(info.remoteArt)}" alt="" loading="lazy" decoding="async" />`
        : `<span class="ings-bullet" aria-hidden="true">+</span>`);
    return `<span class="craft-chip ing" data-ing="${escAttr(name)}" tabindex="0" role="button" aria-label="Ингредиент: ${escAttr(info.ru)}">${art}${count ? `<em>×${esc(count)}</em>` : ""}<b>${esc(info.ru)}</b></span>`;
  }
  function stationChipHTML(station) {
    if (!station) return "";
    const label = stationDisplayName(station);
    return `<span class="craft-chip station-chip" title="${escAttr(label)}"><img class="ings-icon" src="${escAttr(craftStationSprite(station))}" alt="" loading="lazy" decoding="async" /><b>${esc(label)}</b></span>`;
  }
  function craftChipsHTML(name) {
    const rec = getRecipeIndex().get(normalizeArtName(name));
    if (!rec || !rec.ings.length) return "";
    return rec.ings.map((i) => ingChipHTML(i.name, i.count)).join("") + stationChipHTML(rec.station);
  }

  const BOSS_ART = {
    1: "assets/sprites/Slime_Crown.png",
    2: "assets/boss-sprites/desert-scourge.png",
    3: "assets/sprites/Suspicious_Looking_Eye.png",
    4: "assets/boss-sprites/crabulon.png",
    5: "assets/sprites/Worm_Food.png",
    6: "assets/boss-sprites/hive-mind.png",
    7: "assets/sprites/Abeemination.png",
    8: "assets/sprites/Deer_Thing.png",
    10: "assets/boss-sprites/slime-god.png",
    11: "assets/sprites/Guide_Voodoo_Doll.png",
    13: "assets/boss-sprites/cryogen.png",
    14: "assets/item-sprites/LoreMechs.png",
    15: "assets/boss-sprites/aquatic-scourge.png",
    16: "assets/boss-sprites/brimstone-elemental.png",
    17: "assets/boss-sprites/calamitas-clone.png",
    18: "assets/sprites/Portabulb.png",
    19: "assets/boss-sprites/leviathan.png",
    20: "assets/boss-sprites/astrum-aureus.png",
    21: "assets/sprites/Lihzahrd_Power_Cell.png",
    22: "assets/boss-sprites/plaguebringer-goliath.png",
    23: "assets/boss-sprites/ravager.png",
    24: "assets/item-sprites/LoreDukeFishron.png",
    25: "assets/boss-sprites/astrum-deus.png",
    26: "assets/sprites/Celestial_Sigil.png",
    27: "assets/boss-sprites/profaned-guardians.png",
    28: "assets/boss-sprites/dragonfolly.png",
    29: "assets/boss-sprites/providence.png",
    30: "assets/boss-sprites/signus.png",
    31: "assets/boss-sprites/polterghast.png",
    32: "assets/boss-sprites/old-duke.png",
    33: "assets/boss-sprites/devourer-of-gods.png",
    34: "assets/boss-sprites/yharon.png",
    35: "assets/boss-sprites/exo-mechs.png",
    36: "assets/boss-sprites/supreme-calamitas.png"
  };
  const BOSS_ART_BY_ID = {
    "king-slime": BOSS_ART[1], "desert-scourge": BOSS_ART[2], eoc: BOSS_ART[3], crabulon: BOSS_ART[4],
    eow: BOSS_ART[5], boc: BOSS_ART[5], "hive-mind": BOSS_ART[6], perforators: "assets/boss-sprites/perforators.png",
    "queen-bee": BOSS_ART[7], "slime-god": BOSS_ART[10], wof: BOSS_ART[11], cryogen: BOSS_ART[13],
    "aquatic-scourge": BOSS_ART[15], "brimstone-ele": BOSS_ART[16], "cal-clone": BOSS_ART[17], plantera: BOSS_ART[18],
    leviathan: BOSS_ART[19], aureus: BOSS_ART[20], golem: BOSS_ART[21], pbg: BOSS_ART[22], ravager: BOSS_ART[23],
    "astrum-deus": BOSS_ART[25], "moon-lord": BOSS_ART[26], guardians: BOSS_ART[27], dragonfolly: BOSS_ART[28],
    providence: BOSS_ART[29], weaver: "assets/boss-sprites/storm-weaver.png", void: "assets/boss-sprites/ceaseless-void.png",
    signus: BOSS_ART[30], polterghast: BOSS_ART[31], "old-duke": BOSS_ART[32], dog: BOSS_ART[33], yharon: BOSS_ART[34],
    exo: BOSS_ART[35], scal: BOSS_ART[36], "giant-clam": "assets/boss-sprites/giant-clam.png",
    "sand-shark": "assets/boss-sprites/great-sand-shark.png"
  };
  const GUIDE_ART = {
    1: "assets/sprites/StarterBag.png", 2: "assets/sprites/WulfrumMetalScrap.png", 3: "assets/sprites/LabSeekingMechanism.png",
    4: "assets/sprites/SeaPrism.png", 5: BOSS_ART[1], 6: BOSS_ART[2], 7: "assets/sprites/VictideBreastplate.png",
    8: BOSS_ART[3], 9: BOSS_ART[4], 10: BOSS_ART[6], 11: "assets/sprites/Abeemination.png", 12: BOSS_ART[10],
    13: BOSS_ART[11], 14: "assets/sprites/Cobalt_Breastplate.png", 15: BOSS_ART[13], 16: BOSS_ART[15],
    17: BOSS_ART[16], 18: BOSS_ART[17], 19: BOSS_ART[18], 20: "assets/boss-sprites/anahita.png", 21: BOSS_ART[20],
    22: BOSS_ART[21], 23: BOSS_ART[22], 24: BOSS_ART[25], 25: BOSS_ART[29], 26: BOSS_ART[31], 27: BOSS_ART[33],
    28: BOSS_ART[34], 29: BOSS_ART[35], 30: "assets/sprites/ShadowspecBar.png"
  };
  const REFERENCE_ART = {
    Wulfrum: "assets/sprites/WulfrumJacket.png", Victide: "assets/sprites/VictideBreastplate.png",
    Sulphurous: "assets/sprites/SulphurousBreastplate.png", Aerospec: "assets/sprites/AerospecBreastplate.png",
    Statigel: "assets/sprites/StatigelArmor.png", Mollusk: "assets/sprites/MolluskShellmet.png",
    Daedalus: "assets/sprites/DaedalusBreastplate.png", Hydrothermic: "assets/sprites/HydrothermicArmor.png",
    Astral: "assets/sprites/AstralBreastplate.png", Empyrean: "assets/sprites/EmpyreanCloak.png",
    Tarragon: "assets/sprites/TarragonBreastplate.png", Bloodflare: "assets/sprites/BloodflareBodyArmor.png",
    "Omega Blue": "assets/sprites/OmegaBlueChestplate.png", "God Slayer": "assets/sprites/GodSlayerChestplate.png",
    Silva: "assets/sprites/SilvaArmor.png", "Auric Tesla": "assets/sprites/AuricTeslaBodyArmor.png",
    Demonshade: "assets/sprites/DemonshadeBreastplate.png"
  };
  // Dictionary entries include biomes, classes and mechanics that do not have
  // inventory sprites of their own. Those cards use either the exact game UI /
  // NPC texture or a clearly related in-game landmark material; never a made-up
  // icon. Keeping the mapping explicit avoids brittle filename guessing.
  const LEX_ART = {
    Underworld: "assets/lex/vanilla/hellstone.png",
    Adrenaline: "assets/lex/calamity/adrenaline.png",
    Hellforge: "assets/lex/vanilla/hellforge.png",
    Hellstone: "assets/lex/vanilla/hellstone.png",
    "Demon Altar": "assets/lex/vanilla/demon-altar.png",
    Archmage: "assets/lex/calamity/archmage.png",
    Bandit: "assets/lex/calamity/bandit.png",
    Abyss: "assets/sprites/SeaRemains.png",
    "Bio-center Lab": "assets/lex/calamity/laboratory-icon.png",
    "Mollusk armor": "assets/sprites/MolluskShellmet.png",
    Codebreaker: "assets/sprites/CodebreakerBase.png",
    "Victide armor": "assets/sprites/VictideBreastplate.png",
    "Revengeance Mode": "assets/lex/calamity/adrenaline.png",
    "Wulfrum armor": "assets/sprites/WulfrumJacket.png",
    Guide: "assets/lex/vanilla/guide.png",
    "Glowing Mushroom biome": "assets/lex/vanilla/mushroom.png",
    Dungeon: "assets/lex/vanilla/blue-dungeon-brick.png",
    Jungle: "assets/lex/vanilla/jungle-spores.png",
    "Ancient Manipulator": "assets/lex/vanilla/ancient-manipulator.png",
    "Sunken Sea": "assets/sprites/SeaPrism.png",
    "Acid Rain": "assets/sprites/SulphuricScale.png",
    "Night's Edge": "assets/lex/vanilla/nights-edge.png",
    Space: "assets/lex/vanilla/fallen-star.png",
    "Mana Crystal": "assets/lex/vanilla/mana-crystal.png",
    Forest: "assets/lex/vanilla/acorn.png",
    "Lunatic Cultist": "assets/lex/vanilla/lunatic-cultist.png",
    "Tinkerer's Workshop": "assets/lex/vanilla/tinkerers-workshop.png",
    Mechanic: "assets/lex/vanilla/mechanic.png",
    Minishark: "assets/lex/vanilla/minishark.png",
    "Mythril Anvil": "assets/lex/vanilla/mythril-anvil.png",
    "Sea King": "assets/lex/calamity/sea-king.png",
    "Iron Anvil": "assets/lex/vanilla/iron-anvil.png",
    "Cloud in a Bottle": "assets/lex/vanilla/cloud-in-a-bottle.png",
    Ocean: "assets/lex/vanilla/coral.png",
    Rogue: "assets/sprites/RogueEmblem.png",
    Desert: "assets/lex/vanilla/sand-block.png",
    "Death Mode": "assets/lex/calamity/rage.png",
    "Hermes Boots": "assets/lex/vanilla/hermes-boots.png",
    Shrine: "assets/item-sprites/LuxorsGift.png",
    "The Hallow": "assets/lex/vanilla/crystal-shard.png",
    "Brimstone Witch": "assets/lex/calamity/brimstone-witch.png",
    "Sulphurous Sea": "assets/sprites/SulphuricScale.png",
    "Brimstone Crag": "assets/sprites/CharredIdol.png",
    "Snow biome": "assets/lex/vanilla/ice-block.png",
    Schematic: "assets/sprites/EncryptedSchematicSunkenSea.png",
    "Fallen Star": "assets/lex/vanilla/fallen-star.png",
    "Life Fruit": "assets/lex/vanilla/life-fruit.png",
    "Chlorophyte Ore": "assets/lex/vanilla/chlorophyte-ore.png",
    Deerclops: "assets/lex/vanilla/deerclops.png",
    "Plaguebringer armor": "assets/sprites/PlaguebringerCarapace.png",
    Rage: "assets/lex/calamity/rage.png"
  };
  // Some dictionary concepts have no standalone texture in the game. In those
  // cases the card says exactly what genuine related asset is being shown.
  const LEX_ART_NOTE = {
    Underworld: "Материал биома",
    Abyss: "Материал биома",
    "Mollusk armor": "Предмет комплекта",
    "Victide armor": "Предмет комплекта",
    "Revengeance Mode": "Связанный интерфейс",
    "Wulfrum armor": "Предмет комплекта",
    "Glowing Mushroom biome": "Материал биома",
    Dungeon: "Материал биома",
    Jungle: "Материал биома",
    "Sunken Sea": "Материал биома",
    "Acid Rain": "Материал события",
    Space: "Объект локации",
    Forest: "Материал биома",
    Ocean: "Материал биома",
    Rogue: "Эмблема класса",
    Desert: "Материал биома",
    "Death Mode": "Связанный интерфейс",
    Shrine: "Награда святилища",
    "The Hallow": "Материал биома",
    "Sulphurous Sea": "Материал биома",
    "Brimstone Crag": "Предмет биома",
    "Snow biome": "Материал биома",
    "Plaguebringer armor": "Предмет комплекта"
  };
  // The wiki section (armor sets, materials, permanent upgrades, mechanics)
  // uses short Russian names from the localized data files. The dictionary
  // tables above are keyed by English names, so those cards need their own
  // explicit mapping to the genuine in-game textures that already ship
  // locally. Without it the cards degrade to the empty "нет спрайта" state.
  const WIKI_ART = {
    "Вульфрум": "assets/sprites/WulfrumJacket.png",
    "Виктайд": "assets/sprites/VictideBreastplate.png",
    "Сернистый": "assets/sprites/SulphurousBreastplate.png",
    "Моллюск": "assets/sprites/MolluskShellmet.png",
    "Святой / хлорифит": "assets/sprites/Chlorophyte_Plate_Mail.png",
    "Чумной / жнец": "assets/sprites/PlaguebringerCarapace.png",
    "Астральный": "assets/sprites/AstralBreastplate.png",
    "Аурик-тесла": "assets/sprites/AuricTeslaBodyArmor.png",
    "Три эссенции": "assets/sprites/EssenceofSunlight.png",
    "Крионит": "assets/sprites/CryonicOre.png",
    "Клетки / люменил / каша": "assets/sprites/DepthCells.png",
    "Заражённая пластина": "assets/sprites/InfectedArmorPlating.png",
    "Бронированный панцирь": "assets/item-sprites/ArmoredShell.png",
    "Тёмная плазма": "assets/item-sprites/DarkPlasma.png",
    "Крутящийся эфир": "assets/item-sprites/TwistingNether.png",
    "Ядерный топливный стержень": "assets/item-sprites/NuclearFuelRod.png",
    "Гамма-сердце": "assets/item-sprites/GammaHeart.png",
    "Топливо / эндотерм / тёмное солнце": "assets/sprites/NightmareFuel.png",
    "Аурик": "assets/sprites/AuricOre.png",
    "Фрукт жизни": "assets/lex/vanilla/life-fruit.png",
    "Плут": "assets/sprites/RogueEmblem.png",
    "Возмездие": "assets/lex/calamity/adrenaline.png",
    "Режим смерти": "assets/lex/calamity/rage.png",
    "Апгрейды шкал": "assets/sprites/ElectrolyteGelPack.png",
    "Реворк руд": "assets/lex/vanilla/demon-altar.png",
    "Чертежи Дрейдона": "assets/sprites/EncryptedSchematicSunkenSea.png",
    "Эффект босса": "assets/sprites/Suspicious_Looking_Eye.png"
  };
  const LEX_KIND = {
    "Босс": "boss", "Мини-босс": "boss", "Биом": "world", "Структура": "world", "Событие": "world",
    "Механика": "mechanic", "Сложность": "mechanic", "Класс": "mechanic", "Мод": "mechanic", "НПС": "npc",
    "Броня": "armor", "Аксессуар": "acc", "Инструмент": "tool", "Оружие": "weapon", "Призыв": "summon",
    "Расходник": "potion", "Бафф": "potion", "Материал": "mat", "Руда": "mat", "Станция": "tool", "Предмет": "misc", "Маунт": "summon"
  };
  let artNameIndex;
  function normalizeArtName(name) {
    return String(name || "").toLocaleLowerCase("ru").replace(/[’']/g, "").replace(/[^a-zа-яё0-9]+/gi, " ").trim();
  }
  function getArtNameIndex() {
    if (artNameIndex) return artNameIndex;
    artNameIndex = new Map();
    Object.entries(CODEX.sprites || {}).forEach(([name, path]) => {
      [name, ...name.split(/\s*\/\s*/)].forEach((part) => {
        const key = normalizeArtName(part);
        if (key && !artNameIndex.has(key)) artNameIndex.set(key, path);
      });
    });
    indexedItems().forEach((item) => {
      const key = normalizeArtName(item.name);
      if (item.image && key && !artNameIndex.has(key)) artNameIndex.set(key, `assets/item-sprites/${encodeURIComponent(item.id)}.png`);
    });
    return artNameIndex;
  }
  function resolveArt(name, explicit = "") {
    if (explicit) return explicit;
    // Exact-name lookups only: CODEX.lookup() is intentionally fuzzy, so its
    // en/ru results must not be trusted for table hits ("Guide Voodoo Doll"
    // would wrongly match the "Guide" entry).
    if (LEX_ART[name]) return LEX_ART[name];
    if (REFERENCE_ART[name]) return REFERENCE_ART[name];
    if (WIKI_ART[name]) return WIKI_ART[name];
    const lex = CODEX.lookup ? CODEX.lookup(name) : null;
    const names = [name, lex && lex.en, lex && lex.ru].filter(Boolean);
    const index = getArtNameIndex();
    for (const candidate of names) {
      const exact = index.get(normalizeArtName(candidate));
      if (exact) return exact;
      for (const part of String(candidate).split(/\s*\/\s*/)) {
        const hit = index.get(normalizeArtName(part));
        if (hit) return hit;
      }
    }
    return "";
  }
  function visualArt(name, kind = "mat", explicit = "") {
    const src = resolveArt(name, explicit);
    return src
      ? `<span class="shot-window"><img class="item-art" src="${escAttr(releaseAsset(src))}" alt="" loading="lazy" decoding="async" data-kind="${escAttr(kind)}"></span>`
      : unavailableArt(kind);
  }
  function spriteKey(it) {
    if (it.sprite) return it.sprite;
    if (SPRITE_FIX[it.name]) return SPRITE_FIX[it.name];
    const lex = CODEX.lookup && CODEX.lookup(it.name);
    let en = (lex && lex.en) || "";
    if (!/[A-Za-z]/.test(en)) en = String(it.name || "");
    en = en.split(/\s*\/\s*/)[0].replace(/\s+из мешка.*$/i, "").replace(/&/g, "and");
    en = en.replace(/[^A-Za-z0-9' _-]/g, "").trim();
    return en.replace(/\s+/g, "_");
  }
  function bindSprites(root) {
    (root || document).querySelectorAll("img.item-art").forEach((img) => {
      if (img.dataset.bound) return;
      img.dataset.bound = "1";
      img.addEventListener("error", function step() {
        const n = Number(img.dataset.try || 0);
        const file = img.dataset.file;
        if (!file) { fail(); return; }
        const enc = encodeURIComponent(file);
        if (n === 0) { img.dataset.try = "1"; img.src = "https://calamitymod.wiki.gg/wiki/Special:FilePath/" + enc + ".gif"; }
        else if (n === 1) { img.dataset.try = "2"; img.src = "https://terraria.wiki.gg/wiki/Special:FilePath/" + enc + ".png"; }
        else if (n === 2) { img.dataset.try = "3"; img.src = "https://terraria.wiki.gg/wiki/Special:FilePath/" + enc + ".gif"; }
        else fail();
        function fail() {
          img.removeEventListener("error", step);
          const wrap = img.parentElement;
          const placeholder = unavailableArt(img.dataset.kind || "misc");
          img.remove();
          if (wrap) wrap.insertAdjacentHTML("afterbegin", placeholder);
        }
      });
    });
  }
  const CATALOG_ERAS = [
    ["all", "Все этапы"],
    ["any", "Вне этапа"],
    ["pre", "Прехардмод"],
    ["hard", "Хардмод"],
    ["post", "После Луны"],
    ["end", "Финал"]
  ];
  function catalogEraOf(stage) {
    const value = Number(stage || 0);
    if (value === 0) return "any";
    if (value === 1) return "pre";
    if (value <= 3) return "hard";
    if (value <= 5) return "post";
    return "end";
  }
  function catalogEraLabel(stage) {
    const id = catalogEraOf(stage);
    return CATALOG_ERAS.find(([value]) => value === id)?.[1] || "Вне этапа";
  }
  function catalogProgressionRank(stage) {
    const value = Number(stage || 0);
    return value === 0 ? CATALOG_STAGE.length : value;
  }
  const CATALOG_STAGE = [
    "Необязательный этап: предмет не привязан к отдельному боссу; используй его сразу после получения, если он подходит текущей задаче.",
    "Прехардмод: бери до Стены плоти, как только станет доступен источник.",
    "Хардмод: после Стены плоти, когда доступны указанные ингредиенты или противник.",
    "Поздний хардмод: после механических боссов и ближе к Лунному лорду.",
    "После Лунного лорда: для ранней постмунлорд-прогрессии.",
    "Поздний постмунлорд: для эндгейм-боссов и дорогих улучшений.",
    "Финал Каламити: после ключевых эндгейм-боссов."
  ];
  function catalogPurpose(item) {
    if (item.groupId === "summon-items") return "Вызывает связанного босса или событие и нужен для продолжения прогрессии.";
    if (item.groupId === "pets") return "Призывает декоративного спутника; полезен для коллекции и атмосферы.";
    if (item.groupId === "mounts") return "Даёт средство передвижения с собственной мобильностью или особой механикой.";
    if (item.groupId === "treasure-bags") return "Открой, чтобы получить экспертные награды, материалы и предметы босса.";
    if (item.groupId === "lore") return "Хранит сведения о мире и отмечает важную победу или находку.";
    if (item.groupId === "dyes") return "Меняет цвет экипировки, питомца или маунта; нужен для внешнего вида.";
    if (item.groupId === "placeables") return "Используется в строительстве, декоре либо как функциональный размещаемый объект.";
    const byKind = {
      weapon: `Оружие для класса «${CLS_RU[item.cls] || "Все классы"}»: используй его для урона и указанных в механике эффектов.`,
      armor: "Экипируй ради защиты, характеристик и бонуса полного комплекта.",
      acc: "Экипируй в слот аксессуара ради пассивного бонуса; позднее может войти в улучшенный аксессуар.",
      ammo: "Боеприпас расходуется подходящим оружием и меняет его урон или поведение выстрела.",
      tool: "Инструмент ускоряет добычу, строительство, рыбалку или исследование мира.",
      mat: "Сохраняй как материал для оружия, брони, аксессуаров и следующих ступеней крафта.",
      summon: "Используется для призыва существа, спутника, маунта либо важного события.",
      potion: "Расходник даёт временный эффект, лечение или постоянное улучшение персонажа.",
      misc: "Коллекционный или специализированный предмет; точное назначение раскрывает механика выше."
    };
    return byKind[item.kind] || byKind.misc;
  }
  function indexedItemCard(item) {
    const title = ruItemName(item);
    const detail = detailedNameMap().get(String(item.name).toLocaleLowerCase("ru"));
    const wikiTitle = encodeURIComponent(String(item.name).replace(/ /g, "_"));
    const wikiUrl = `https://calamitymod.wiki.gg/wiki/${wikiTitle}`;
    const classLabel = item.cls === "all" ? "Все классы" : (CLS_RU[item.cls] || item.cls);
    const detailName = detail && (detail.nameRu || ruItemName(detail));
    const purpose = catalogPurpose(item);
    const obtain = bossObtainOverride(item) || item.obtain || "";
    const obtainDisplay = isGenericObtainText(obtain)
      ? "Конкретный локальный источник не подтверждён. Нажми «Получение»: кодекс проверит официальную wiki и сохранит найденный способ для офлайн-просмотра."
      : ruText(obtain);
    const isCraft = /^Скрафтить/i.test(obtain);
    const visualRecipe = visualRecipeFor(`catalog:${item.id}`);
    const hasRecipe = Boolean(visualRecipe);
    const hasTreeRecipe = hasRecipe && Boolean(ingredientInfo(`catalog:${item.id}`).recipe?.ings?.length);
    const stageId = catalogEraOf(item.stage);
    const stageLabel = catalogEraLabel(item.stage);
    const useWhen = CATALOG_STAGE[Math.min(Math.max(item.stage, 0), CATALOG_STAGE.length - 1)];
    const bossLinks = bossRelationsFor(item);
    const description = withBossRelationDescription(ruText(item.description || purpose), bossLinks);
    const art = item.image
      ? `<span class="shot-window"><img class="item-art" src="${escAttr(releaseAsset(`assets/item-sprites/${encodeURIComponent(item.id)}.png`))}" alt="" loading="lazy" decoding="async" data-kind="${escAttr(item.kind || "mat")}"></span>`
      : unavailableArt(item.kind);
    const itemSources = npcSourceForItem(item);
    return `<article class="card has-art catalog-item-card" data-stage="${stageId}">
      <div class="card-shot slot" data-kind="${escAttr(item.kind)}">
        ${art}
        ${favoriteButton("item", item.name, title)}
        <span class="kind-pill">${esc(KIND_RU[item.kind] || item.kind)}</span>
        <span class="tag-cls ${escAttr(item.cls)}">${esc(classLabel)}</span>
      </div>
      <div class="card-body">
        <span class="stage-pill ${stageId}">${esc(stageLabel)}</span>
        <div class="card-title">${esc(title)}<span class="en-sub">оригинал: ${esc(item.name)}</span></div>
        <p class="desc">${esc(description)}</p>
        <details class="card-facts-shelf">
          <summary><span><b>Подробнее о предмете</b><small>Получение, связи и применение</small></span><i aria-hidden="true">⌄</i></summary>
          <div class="facts">
            ${!isCraft
              ? npcSourceLines(itemSources)
                ? `<div class="fact source-fact"><span>Где</span><div class="src-list">${npcSourceLines(itemSources)}</div></div>`
                : obtain ? `<div class="fact"><span>Где</span><p>${esc(obtainDisplay)}</p></div>` : ""
              : ""}
            ${bossRelationsHTML(bossLinks)}
            <div class="fact"><span>Зачем</span><p>${esc(purpose)}</p></div>
            <div class="fact"><span>Когда</span><p>${esc(useWhen)}</p></div>
          </div>
        </details>
        <div class="card-links">
          ${hasRecipe ? `${hasTreeRecipe ? fullTreeLink(`catalog:${item.id}`) : ""}<button class="recipe-btn" type="button" data-recipe="${escAttr(`catalog:${item.id}`)}"><span aria-hidden="true">⚒</span> Рецепт</button>${craftPlanActionButton(`catalog:${item.id}`)}` : `<button class="obtain-btn" type="button" data-item-details="${escAttr(`catalog:${item.id}`)}"><span aria-hidden="true">⌖</span> Получение</button>`}
          <a href="${escAttr(wikiUrl)}" target="_blank" rel="noopener noreferrer">${hasRecipe ? "Страница предмета" : "Источник и шансы"} на wiki ↗</a>
          ${detail ? `<a class="catalog-guide-link" href="#/items?mode=guide&s=${encodeURIComponent(detail.name)}" title="Открыть практическую рекомендацию ${escAttr(detailName)}">Рекомендация кодекса →</a>` : ""}
        </div>
      </div>
    </article>`;
  }

  function itemCard(it, cls, filter) {
    const mine = cls === "all" || it.cls === "all" || it.cls === cls;
    const hide = filter === "mine" && !mine;
    const dim = filter === "all" && !mine;
    const lex = exactLexLookup(it.name);
    const title = it.nameRu || ruItemName(it);
    const enRaw = lex ? lex.en : (/[A-Za-z]/.test(it.name) ? it.name : "");
    const en = enRaw && enRaw.toLowerCase() !== String(title).toLowerCase() ? enRaw : "";
    const kind = KIND_RU[it.kind] || it.kind;
    const stats = (it.stats || "").trim();
    const fake = !stats || stats === kind || /^(Оружие|Броня|Аксессуар|Инструмент|Материал|Предмет|Расходник)/i.test(stats);
    const bossLinks = bossRelationsFor(it);
    const desc = withBossRelationDescription(ruText((it.desc || (lex && lex.desc) || "").trim()), bossLinks);
    const why = ruText((it.why || "").trim());
    const showWhy = why && why !== desc;
    const getRaw = String(it.get || "").replace(/\bCalamity\b/g, "Каламити").trim();
    const getPlain = isGenericObtainText(getRaw)
      ? "Конкретный источник уточняется через отдельную кнопку «Получение» по официальной wiki."
      : ruText(getRaw);
    const showGet = getPlain && !/^крафт\.?$/i.test(getPlain);
    const local = spriteOfFixed(it) || (CODEX.sprites && (CODEX.sprites[it.name] || CODEX.sprites[it.nameRu])) || "";
    const itemInfo = ingredientInfo(it.name);
    const visualRecipe = visualRecipeFor(it.name);
    const hasRecipe = Boolean(visualRecipe);
    const hasTreeRecipe = Boolean(itemInfo.recipe?.ings?.length);
    const itemSources = npcSourceForItem(it);
    return `<article class="card has-art ${hide ? "hidden" : ""} ${dim ? "dim" : ""} ${mine && filter !== "all" ? "mine" : ""}">
      <div class="card-shot slot ${escAttr(it.cls)} ${escAttr(it.kind || "")}" data-kind="${escAttr(it.kind || "mat")}">
        ${local ? `<span class="shot-window"><img class="item-art" alt="" src="${escAttr(releaseAsset(local))}" loading="lazy" decoding="async" data-file="${escAttr(spriteKey(it))}" data-kind="${escAttr(it.kind || "mat")}" /></span>` : unavailableArt(it.kind)}
        ${favoriteButton("item", it.name, title)}
        <span class="kind-pill">${esc(kind)}</span>
        <span class="tag-cls ${escAttr(it.cls)}">${CLS_RU[it.cls] || it.cls}</span>
      </div>
      <div class="card-body">
        <div class="card-title">${esc(title)}${en ? `<span class="en-sub">оригинал: ${esc(en)}</span>` : ""}</div>
        ${!fake ? `<div class="stats-line">${esc(stats)}</div>` : ""}
        ${desc ? `<p class="desc">${esc(desc)}</p>` : ""}
        <details class="card-facts-shelf">
          <summary><span><b>Практические сведения</b><small>Источник, связи и назначение</small></span><i aria-hidden="true">⌄</i></summary>
          <div class="facts">
            ${showGet ? `<div class="fact"><span>Где</span><p>${esc(getPlain)}</p></div>` : ""}
            ${npcSourceLines(itemSources) ? `<div class="fact source-fact"><span>Дроп</span><div class="src-list">${npcSourceLines(itemSources)}</div></div>` : ""}
            ${bossRelationsHTML(bossLinks)}
            ${showWhy ? `<div class="fact"><span>Зачем</span><p>${esc(why)}</p></div>` : ""}
          </div>
        </details>
        <div class="card-links">
          ${hasRecipe ? `${hasTreeRecipe ? fullTreeLink(it.name) : ""}<button class="recipe-btn" type="button" data-recipe="${escAttr(it.name)}"><span aria-hidden="true">⚒</span> Рецепт</button>${craftPlanActionButton(it.name)}` : `<button class="obtain-btn" type="button" data-item-details="${escAttr(it.name)}"><span aria-hidden="true">⌖</span> Получение</button>`}
          ${itemInfo.catName ? `<a href="#/items?s=${encodeURIComponent(itemInfo.catName)}">Полная карточка →</a>` : ""}
        </div>
      </div>
    </article>`;
  }

  const NOVICE_CLASS_TITLES = {
    melee: "Бьёт мечом вблизи",
    ranged: "Лук и пушки издалека",
    mage: "Заклинания, нужна мана",
    summoner: "Помощники бьют за тебя",
    rogue: "Кинжалы и скрытность"
  };
  const NOVICE_CLASS_HINTS = {
    melee: "Воин: стой ближе, бей мечом или цепом.",
    ranged: "Стрелок: бегай, стреляй. Нужны стрелы или пули.",
    mage: "Маг: синяя шкала маны. Не стой вплотную.",
    summoner: "Призыватель: ты уворачиваешься, бьют помощники.",
    rogue: "Плут: постой без ударов — удар из скрытности сильнее."
  };
  const NOVICE_ERAS = [
    ["pre", "Прехардмод", "От первого дома и вульфрума до Стены плоти"],
    ["hard", "Хардмод", "Новые руды, механические боссы, Плантера и Лунный лорд"],
    ["post", "После Лунного лорда", "Профанные стражи, Провиденс, Пожиратель богов и Ярон"],
    ["end", "Финал", "Экзо-мехи, Верховная ведьма и жизнь после титров"]
  ];

  /* Карта пути новичка: все квесты отдельной страницей, сгруппированные по
     эпохам. Раньше список ютился в боковой панели и обрезался прокруткой. */
  function renderNoviceMap() {
    const quests = CODEX.quests;
    const { done, cls } = questProgress();
    const total = quests.length;
    const pct = Math.round((done.size / total) * 100);
    applyTheme(null);
    document.body.style.setProperty("--theme-image", "none");
    fillRail("");
    const current = quests.find((x) => !done.has(x.id)) || quests[total - 1];
    const allDone = done.size === total;
    const questCard = (item) => {
      const isDone = done.has(item.id);
      const isCurrent = !allDone && item.id === current.id;
      const art = GUIDE_ART[item.id] || "assets/sprites/Wooden_Sword.png";
      return `<a class="qmap-card ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}" href="#/novice?q=${item.id}" style="--qa:${escAttr(item.accent || "#ffd97a")}" aria-label="Квест ${item.id}: ${escAttr(item.title)}${isDone ? " — пройден" : isCurrent ? " — текущий" : ""}">
        <span class="qmap-num" aria-hidden="true">${isDone ? "✓" : String(item.id).padStart(2, "0")}</span>
        <span class="qmap-art slot"><img src="${escAttr(releaseAsset(art))}" alt="" loading="lazy" decoding="async" /></span>
        <span class="qmap-copy"><b>${esc(item.title)}</b><small>${esc(item.subtitle)}</small></span>
        ${isCurrent ? `<span class="qmap-flag">ты здесь</span>` : ""}
      </a>`;
    };
    app.innerHTML = `
      <div class="page novice-map">
        <header class="qmap-head">
          <div class="qmap-intro">
            <small>путь новичка</small>
            <h2>${total} квестов от первого дома до финала</h2>
            <p>Иди по порядку: каждый квест подсказывает, куда идти, что собрать, что скрафтить и кого бить. Отмечай завершённые — прогресс сохраняется, и кодекс всегда помнит, где ты остановился.</p>
          </div>
          <div class="qmap-status panel">
            <div class="qmap-progress"><span><b>Путь героя</b><i>${done.size} / ${total} · ${pct}%</i></span><div class="hpbar"><i style="width:${pct}%"></i></div></div>
            <a class="qmap-continue" href="#/novice?q=${current.id}">
              <span class="slot"><img src="${escAttr(releaseAsset(GUIDE_ART[current.id] || "assets/sprites/Wooden_Sword.png"))}" alt="" loading="lazy" decoding="async" /></span>
              <span class="qmap-continue-copy"><small>${allDone ? "маршрут пройден · можно перечитать финал" : done.size ? "продолжить с текущего места" : "начать с первого квеста"}</small><b>Квест ${String(current.id).padStart(2, "0")} · ${esc(current.title)}</b></span>
              <em aria-hidden="true">▶</em>
            </a>
            <div class="class-pick" role="group" aria-label="Выбор класса героя">
              ${CODEX.classes.map((c) => `<button data-cls="${c.id}" class="${c.id === cls ? "active" : ""}" title="${NOVICE_CLASS_TITLES[c.id]}">${c.name}</button>`).join("")}
            </div>
            <p class="qpanel-hint">${NOVICE_CLASS_HINTS[cls]}</p>
          </div>
        </header>
        ${NOVICE_ERAS.map(([era, title, desc], index) => {
          const list = quests.filter((x) => x.era === era);
          if (!list.length) return "";
          const eraDone = list.filter((x) => done.has(x.id)).length;
          return `<section class="qmap-era" data-era="${escAttr(era)}" aria-label="${escAttr(title)}">
            <header class="qmap-era-head">
              <span class="qmap-era-no" aria-hidden="true">0${index + 1}</span>
              <div><h3>${title}</h3><small>${desc}</small></div>
              <em>${eraDone} / ${list.length}</em>
            </header>
            <div class="qmap-grid">${list.map(questCard).join("")}</div>
          </section>`;
        }).join("")}
      </div>`;
    app.querySelectorAll("[data-cls]").forEach((el) => el.onclick = () => { store.set({ cls: el.dataset.cls }); renderNoviceMap(); });
    bindSprites(app);
  }

  function renderNovice(id) {
    const quests = CODEX.quests;
    const q = quests.find((x) => x.id === id) || quests[0];
    const { done, tasks, cls, itemFilter } = questProgress();
    const pct = Math.round((done.size / quests.length) * 100);
    store.set({ quest: q.id });
    applyTheme(q);
    const gear = q.gear || [];
    const counts = {
      all: gear.length,
      mine: gear.filter((i) => i.cls === "all" || i.cls === cls).length
    };
    const CLASS_TITLES = NOVICE_CLASS_TITLES;
    const CLASS_HINTS = NOVICE_CLASS_HINTS;
    const classPickHTML = `
      <div class="class-pick class-pick-inline" role="group" aria-label="Выбор класса героя">
        ${CODEX.classes.map((c) => `<button data-cls="${c.id}" class="${c.id === cls ? "active" : ""}" title="${CLASS_TITLES[c.id]}">${c.name}</button>`).join("")}
      </div>
      <p class="qpanel-hint">${CLASS_HINTS[cls]}</p>`;
    const gearHTML = gear.length
      ? `${classPickHTML}
        <div class="filter-row">
          <button class="mini ${itemFilter === "mine" ? "on" : ""}" data-if="mine">Мой класс</button>
          <button class="mini ${itemFilter === "all" ? "on" : ""}" data-if="all">Все</button>
        </div>
        <div class="item-grid">${gear.map((it) => itemCard(it, cls, itemFilter)).join("")}</div>`
      : `${classPickHTML}<div class="item-grid">${q.collect.map((x) => `<div class="card text-only"><div class="card-body"><div class="card-title">${T(RU(x.t))}</div><p class="desc">${T(x.d)}</p></div></div>`).join("")}</div>`;
    const prevQuest = quests.find((x) => x.id === q.id - 1) || null;
    const nextQuest = quests.find((x) => x.id === q.id + 1) || null;

    app.innerHTML = `
      <div class="page">
        <div class="quest-topbar">
          <a class="btn ghost quest-topbar-all" href="#/novice">≡ Все квесты</a>
          <div class="quest-topbar-meta"><small>Путь героя · ${done.size} / ${quests.length}</small><div class="hpbar mini"><i style="width:${pct}%"></i></div></div>
          <nav class="quest-topbar-nav" aria-label="Соседние квесты">
            ${prevQuest ? `<a class="btn ghost" href="#/novice?q=${prevQuest.id}" title="${escAttr(prevQuest.title)}">←</a>` : `<span class="btn ghost is-off" aria-hidden="true">←</span>`}
            <b>Квест ${String(q.id).padStart(2, "0")} / ${quests.length}</b>
            ${nextQuest ? `<a class="btn ghost" href="#/novice?q=${nextQuest.id}" title="${escAttr(nextQuest.title)}">→</a>` : `<span class="btn ghost is-off" aria-hidden="true">→</span>`}
          </nav>
        </div>
        <div class="novice-layout">
          <article class="quest">
            <div class="quest-hero">
              <div class="pic" style="background-image:url('${q.bg || "assets/hero.webp"}');filter:${q.filter || "none"}"></div>
              <div class="hero-glow"></div>
              <div class="inner">
                <div class="rune-row">
                  ${eraBadge(q.era)}
                  <span class="rune">Квест ${String(q.id).padStart(2, "0")} из ${quests.length}</span>
                </div>
                <h2>${q.title}</h2>
                <p class="mood">${esc(ruText(q.mood || q.subtitle))}</p>
              </div>
            </div>
            <div class="quest-pad">
            ${q.objective ? `<div class="obj-box"><strong>Сейчас</strong>${T(q.objective)}</div>` : ""}
            ${shelf("Зачем это", "", `<p class="story" style="margin:0">${T(q.story)}</p><p class="how-tip" style="margin-top:10px">Наведи на слово — всплывёт, что это.</p>`)}
            ${q.steps ? shelf("Шаги", q.steps.length, `<div class="steps">${q.steps.map((s, i) => `<div class="step"><div class="step-n">${i + 1}</div><div><h4>${T(s.t)}</h4><p>${T(s.d)}</p></div></div>`).join("")}</div>`, true) : ""}
            ${shelf("Куда идти", (q.where || []).length, `<div class="cards">${q.where.map((x, i) => `<div class="info-card"><em class="pin">${i + 1}</em><b>${esc(plainName(x.t).ru)}</b><p>${T(x.d)}</p></div>`).join("")}</div>`)}
            ${shelf("Предметы", `${counts.mine}/${counts.all}`, gearHTML)}
            ${shelf("Крафт", (q.crafts || []).length, `<div class="craft-grid">${(q.crafts || []).map((x) => craftCard(x)).join("")}</div>`)}
            ${shelf("Кого бить", (q.fight || []).length, q.fight.map((x) => `<div class="kill-card"><b>${esc(plainName(x.t).ru)}</b><p>${T(x.d)}</p></div>`).join(""))}
            ${shelf("Чеклист", (q.tasks || []).length, `<div class="tasks">${q.tasks.map((t, i) => {
              const key = q.id + ":" + i;
              const on = !!(tasks[key]);
              return `<label class="task ${on ? "checked" : ""}"><input type="checkbox" data-task="${key}" ${on ? "checked" : ""} /><span>${T(t)}</span></label>`;
            }).join("")}</div>`)}
            ${shelf("Советы", "", `<div class="tips">${q.tips.map((t) => `<div class="hint">${T(t)}</div>`).join("")}</div><div class="class-note ${escAttr(cls)}"><b>${CLS_RU[cls]}:</b> ${T(q.classTips[cls])}</div>`)}
            </div>
            <div class="quest-nav">
              <button class="btn ghost" data-go="${q.id - 1}" ${q.id === 1 ? "disabled" : ""}>← Назад</button>
              <button class="btn ${done.has(q.id) ? "done" : ""}" data-finish="${q.id}">${done.has(q.id) ? "✓ Квест пройден" : "Завершить квест"}</button>
              <button class="btn ghost" data-next="${q.id + 1}" ${q.id === quests.length ? "disabled" : ""}>Дальше →</button>
            </div>
          </article>
        </div>
      </div>
    `;

    app.querySelectorAll("[data-cls]").forEach((el) => el.onclick = () => { store.set({ cls: el.dataset.cls }); renderNovice(q.id); });
    app.querySelectorAll("[data-if]").forEach((el) => el.onclick = () => { store.set({ itemFilter: el.dataset.if }); renderNovice(q.id); });
    app.querySelectorAll("[data-task]").forEach((el) => el.onchange = () => {
      const s = store.get();
      store.set({ tasks: { ...(s.tasks || {}), [el.dataset.task]: el.checked } });
      el.closest(".task").classList.toggle("checked", el.checked);
      SND.play(el.checked ? "check" : "snap");
    });
    const fin = app.querySelector("[data-finish]");
    if (fin) fin.onclick = () => {
      const set = new Set((store.get().doneQuests || []).map(Number));
      const wasDone = set.has(q.id);
      if (wasDone) set.delete(q.id);
      else set.add(q.id);
      store.set({ doneQuests: [...set] });
      updateJourneyProgress();
      SND.play(wasDone ? "snap" : "chime");
      announce(wasDone ? `Квест ${q.id} снова отмечен как активный` : `Квест ${q.id} завершён`);
      renderNovice(q.id);
    };
    const back = app.querySelector("[data-go]");
    if (back) back.onclick = () => { if (q.id > 1) location.hash = `#/novice?q=${q.id - 1}`; };
    const nextButton = app.querySelector("[data-next]");
    if (nextButton) nextButton.onclick = () => {
      if (q.id < quests.length) location.hash = `#/novice?q=${q.id + 1}`;
    };
    fillRail(`
      <div class="rail-quest">
        <a class="rail-quest-all" href="#/novice"><i aria-hidden="true">≡</i> Все квесты маршрута</a>
        <div class="rail-quest-now"><small>сейчас открыт</small><b>${String(q.id).padStart(2, "0")} · ${esc(q.title)}</b></div>
        <div class="rail-quest-nav">
          ${prevQuest ? `<a href="#/novice?q=${prevQuest.id}"><small>← назад</small><span>${esc(prevQuest.title)}</span></a>` : `<span class="is-off"><small>← назад</small><span>Это начало</span></span>`}
          ${nextQuest ? `<a href="#/novice?q=${nextQuest.id}"><small>дальше →</small><span>${esc(nextQuest.title)}</span></a>` : `<span class="is-off"><small>дальше →</small><span>Это финал</span></span>`}
        </div>
      </div>`);
    const saved = store.get().openSh || {};
    app.querySelectorAll(".shelf").forEach((el) => {
      const key = q.id + ":" + (el.querySelector(".shelf-t")?.textContent || "");
      if (saved[key] === true) el.open = true;
      if (saved[key] === false) el.open = false;
      el.addEventListener("toggle", () => {
        store.set({ openSh: { ...(store.get().openSh || {}), [key]: el.open } });
      });
    });
    bindSprites(app);
  }

  /* ===================== Мобы: бестиарий всех существ ===================== */
  let mobIndexCache = null;
  function mobIndex() {
    if (mobIndexCache) return mobIndexCache;
    const raw = window.CALAMITY_MOB_INDEX || { mobs: [], tagLabels: {} };
    const mobs = raw.mobs.map((r) => ({
      id: r[0], src: r[1], en: r[2], ru: r[3], kind: r[4],
      hp: r[5] >= 0 ? r[5] : null, dmg: r[6] >= 0 ? r[6] : null, def: r[7] >= 0 ? r[7] : null,
      tags: String(r[8] || "").split(",").filter(Boolean),
      desc: r[9] || "", art: r[10] || "", folder: r[11] || ""
    }));
    mobIndexCache = { mobs, tagLabels: raw.tagLabels || {} };
    return mobIndexCache;
  }
  let mobDropsCache = null;
  function mobDropCount(en) {
    if (!mobDropsCache) {
      mobDropsCache = new Map();
      for (const entry of Object.values(NPC_SOURCES)) {
        for (const drop of entry.npcs || []) mobDropsCache.set(drop.npc, (mobDropsCache.get(drop.npc) || 0) + 1);
      }
    }
    return mobDropsCache.get(en) || 0;
  }
  /* Поиск моба по русскому или английскому имени: связывает крафты и бестиарий. */
  let mobByNameCache = null;
  function mobByName(name) {
    if (!window.CALAMITY_MOB_INDEX) return null;
    if (!mobByNameCache) {
      mobByNameCache = new Map();
      mobIndex().mobs.forEach((m) => {
        [m.en, m.ru].forEach((key) => {
          const lower = String(key || "").trim().toLocaleLowerCase("ru");
          if (lower && !mobByNameCache.has(lower)) mobByNameCache.set(lower, m);
        });
      });
    }
    return mobByNameCache.get(String(name || "").trim().toLocaleLowerCase("ru")) || null;
  }
  let mobByGameIdCache = null;
  function mobByGameId(npcId) {
    if (!window.CALAMITY_MOB_INDEX) return null;
    if (!mobByGameIdCache) {
      mobByGameIdCache = new Map();
      mobIndex().mobs.forEach((m) => {
        if (m.src === "v" && /^v-?\d+$/.test(m.id)) mobByGameIdCache.set(Number(m.id.slice(1)), m);
      });
    }
    return mobByGameIdCache.get(Number(npcId)) || null;
  }
  /* Ванильные лут-таблицы из кода игры: предмет -> с кого падает. */
  let vanillaItemSourcesCache = null;
  function vanillaItemSources(itemId) {
    if (!vanillaItemSourcesCache) {
      vanillaItemSourcesCache = new Map();
      for (const [npcId, rows] of Object.entries(VANILLA_DROPS.npc || {})) {
        (rows || []).forEach(([item, den, min, max, flags]) => {
          const list = vanillaItemSourcesCache.get(item) || [];
          list.push({ npcId: Number(npcId), den, min, max, flags });
          vanillaItemSourcesCache.set(item, list);
        });
      }
    }
    return vanillaItemSourcesCache.get(Number(itemId)) || [];
  }
  function vanillaDropChanceLabel(source) {
    const extras = [];
    if (source.den > 1) extras.push(`1 из ${source.den}`);
    if (source.max > 1) extras.push(source.min === source.max ? `×${source.max}` : `×${source.min}–${source.max}`);
    if (source.flags & 1) extras.push("мастер-режим");
    else if (source.flags & 2) extras.push("мешок босса");
    if (source.flags & 8) extras.push("один из набора");
    else if (source.flags & 4) extras.push("особое условие");
    return extras.join(", ");
  }
  function vanillaDropObtainText(itemId, limit = 6) {
    const sources = [...vanillaItemSources(itemId)].sort((a, b) => (a.den - b.den) || (a.flags - b.flags));
    if (!sources.length) return "";
    const parts = [];
    const seen = new Set();
    for (const source of sources) {
      const mob = mobByGameId(source.npcId);
      if (!mob || seen.has(mob.ru)) continue;
      seen.add(mob.ru);
      const label = vanillaDropChanceLabel(source);
      parts.push(`${mob.ru}${label ? ` (${label})` : ""}`);
      if (parts.length >= limit) break;
    }
    if (!parts.length) return "";
    const restCount = new Set(sources.map((x) => x.npcId)).size - seen.size;
    return `Падает с: ${parts.join(", ")}${restCount > 0 ? ` и ещё ${restCount}` : ""}. Данные лут-таблиц Terraria 1.4.4; имена кликабельны.`;
  }
  /* Упоминания мобов в текстах получения/источников становятся кликабельными:
     клик открывает ту же карточку существа, что и в структурированных источниках. */
  let mobMentionPatternCache = null;
  const MOB_MENTION_SELECTOR = ".tsrc, .tree-root-src, .fact p, .wiki-source-live p, .kill-card b, .kill-card p, .info-card p, .step p";
  function mobMentionPattern() {
    if (mobMentionPatternCache !== null) return mobMentionPatternCache;
    if (!window.CALAMITY_MOB_INDEX) return null;
    const names = new Map();
    mobIndex().mobs.forEach((m) => {
      [m.ru, m.en].forEach((raw) => {
        const name = String(raw || "").trim();
        if (name.length < 4) return; // короткие имена дают ложные срабатывания
        const lower = name.toLocaleLowerCase("ru");
        if (!names.has(lower)) names.set(lower, m.en);
      });
    });
    if (!names.size) { mobMentionPatternCache = false; return mobMentionPatternCache; }
    const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const alternatives = [...names.keys()].sort((a, b) => b.length - a.length).map(escapeRx).join("|");
    mobMentionPatternCache = { rx: new RegExp(`(^|[^A-Za-zА-Яа-яЁё-])(${alternatives})(?=[^A-Za-zА-Яа-яЁё-]|$)`, "giu"), names };
    return mobMentionPatternCache;
  }
  function linkifyMobMentions(root) {
    if (!root || !window.CALAMITY_MOB_INDEX) return;
    const pattern = mobMentionPattern();
    if (!pattern) return;
    const targets = root.matches?.(MOB_MENTION_SELECTOR)
      ? [root, ...root.querySelectorAll(MOB_MENTION_SELECTOR)]
      : [...root.querySelectorAll(MOB_MENTION_SELECTOR)];
    targets.forEach((el) => {
      if (el.dataset.mobLinked) return;
      el.dataset.mobLinked = "1";
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.parentElement && node.parentElement.closest("a, button, .npc-tip, .tip, [data-boss-detail]")) continue;
        nodes.push(node);
      }
      nodes.forEach((node) => {
        const text = node.nodeValue || "";
        pattern.rx.lastIndex = 0;
        if (!pattern.rx.test(text)) return;
        pattern.rx.lastIndex = 0;
        const frag = document.createDocumentFragment();
        let last = 0;
        let match;
        while ((match = pattern.rx.exec(text))) {
          const start = match.index + match[1].length;
          if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));
          const mention = document.createElement("b");
          mention.className = "npc-tip mob-mention";
          mention.dataset.npc = pattern.names.get(match[2].toLocaleLowerCase("ru")) || match[2];
          mention.setAttribute("role", "button");
          mention.tabIndex = 0;
          mention.title = "Показать карточку существа";
          mention.textContent = match[2];
          frag.appendChild(mention);
          last = start + match[2].length;
        }
        if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });
    });
  }
  function mobTagLabel(tag) {
    const guide = window.CALAMITY_MOB_GUIDE || {};
    if (guide.tagRu && guide.tagRu[tag]) return guide.tagRu[tag];
    const label = mobIndex().tagLabels[tag];
    return label || tag.split(":").pop();
  }
  const MOB_KIND_RU = { enemy: "враг", critter: "зверёк", boss: "босс" };
  function mobMatchesFilters(mob, filters) {
    if (filters.src && mob.src !== filters.src) return false;
    if (filters.kind && mob.kind !== filters.kind) return false;
    return true;
  }
  function mobSearchBlob(mob) {
    if (!mob.blob) mob.blob = `${mob.ru} ${mob.en} ${mob.tags.map(mobTagLabel).join(" ")}`.toLocaleLowerCase("ru");
    return mob.blob;
  }
  function mobCard(mob) {
    const stats = [
      mob.hp !== null ? `<span class="ms-hp"><i>ОЗ</i><b>${mob.hp.toLocaleString("ru-RU")}</b></span>` : "",
      mob.dmg !== null ? `<span class="ms-dmg"><i>Урон</i><b>${mob.dmg}</b></span>` : "",
      mob.def !== null ? `<span class="ms-def"><i>Защита</i><b>${mob.def}</b></span>` : ""
    ].filter(Boolean).join("");
    const chips = mob.tags.slice(0, 5).map((t) => `<i>${esc(mobTagLabel(t))}</i>`).join("");
    const gameId = mob.src === "v" && /^v-?\d+$/.test(mob.id) ? Number(mob.id.slice(1)) : null;
    const drops = mob.src === "c"
      ? mobDropCount(mob.en)
      : gameId !== null ? ((VANILLA_DROPS.npc[String(gameId)] || (gameId < 0 ? VANILLA_DROPS.npc["1"] : null) || []).length) : 0;
    const dropsLabel = drops ? `Дроп: ${drops} ${drops === 1 ? "предмет" : drops < 5 ? "предмета" : "предметов"}` : "";
    const links = [
      mob.kind === "boss" ? `<a href="#/bosses?q=${encodeURIComponent(mob.ru)}">Карточка босса →</a>` : "",
      drops && mob.src === "c" ? `<a href="#/items?s=${encodeURIComponent(mob.en)}" title="Показать предметы, которые выпадают с этого существа">${dropsLabel} →</a>` : "",
      drops && mob.src === "v" ? `<b class="npc-tip mob-drop-link" data-npc="${escAttr(mob.en)}" role="button" tabindex="0" title="Открыть карточку существа со списком дропа">${dropsLabel} →</b>` : ""
    ].filter(Boolean).join("");
    return `<article class="mob-card kind-${escAttr(mob.kind)}" data-src="${escAttr(mob.src)}">
      <em class="mob-kind ${escAttr(mob.kind)}">${MOB_KIND_RU[mob.kind] || mob.kind}${mob.src === "c" ? " · Calamity" : ""}</em>
      <div class="mob-card-head">
        <span class="slot mob-art">${mob.art ? `<img src="${escAttr(mob.art)}" alt="" loading="lazy" decoding="async" />` : (mob.src === "v" && /^v\d+$/.test(mob.id) && Number(mob.id.slice(1)) >= 688 ? `<i class="art-145" aria-hidden="true" title="Новинка Terraria 1.4.5 — спрайт появится после публикации дампа текстур">◆</i>` : `<i aria-hidden="true">◆</i>`)}</span>
        <div class="mob-name"><b class="npc-tip mob-card-name" data-npc="${escAttr(mob.en)}" role="button" tabindex="0" title="Открыть карточку существа">${esc(mob.ru)}</b>${mob.en !== mob.ru ? `<small>${esc(mob.en)}</small>` : ""}${stats ? `<div class="mob-stats">${stats}</div>` : ""}</div>
      </div>
      ${chips ? `<div class="mob-tags">${chips}</div>` : ""}
      ${mob.desc ? `<p class="mob-desc">${esc(mob.desc)}</p>` : ""}
      ${links ? `<div class="mob-links">${links}</div>` : ""}
    </article>`;
  }
  function renderMobs(params = {}) {
    fillRail("");
    const { mobs } = mobIndex();
    const filters = { src: params.src === "v" || params.src === "c" ? params.src : "", kind: ["enemy", "critter", "boss"].includes(params.kind) ? params.kind : "" };
    const query = String(params.q || "").trim().toLocaleLowerCase("ru");
    const openGroup = String(params.g || "");
    const filtered = mobs.filter((m) => mobMatchesFilters(m, filters));
    const byPower = (a, b) => ((a.hp ?? -1) - (b.hp ?? -1)) || a.ru.localeCompare(b.ru, "ru");
    const groupsWithMobs = (defs) => defs.map((def) => ({ ...def, list: filtered.filter((m) => m.tags.some((t) => def.tags.includes(t))).sort(byPower) })).filter((g) => g.list.length);
    const guide = window.CALAMITY_MOB_GUIDE || { events: [], biomes: [] };
    const eventGroups = groupsWithMobs(guide.events || []);
    const biomeGroups = groupsWithMobs(guide.biomes || []);
    const groupedIds = new Set();
    [...eventGroups, ...biomeGroups].forEach((g) => g.list.forEach((m) => groupedIds.add(m.id)));
    const rest = filtered.filter((m) => !groupedIds.has(m.id));
    if (rest.length) biomeGroups.push({ id: "other", title: "Особые существа и миньоны боссов", tags: [], list: [...rest].sort(byPower), sub: "Появляются в бою с боссами, в особых местах или по особым условиям." });
    const searchHits = query ? filtered.filter((m) => matchesSearch(mobSearchBlob(m), query)).slice(0, 150) : [];
    const activeFilterCount = (filters.src ? 1 : 0) + (filters.kind ? 1 : 0);
    const groupBlock = (group, type) => {
      const icon = group.icon || group.list.find((m) => m.art)?.art || "";
      const bossCount = group.list.filter((m) => m.kind === "boss").length;
      const isOpen = openGroup === group.id;
      return `<details class="mob-group" id="mob-group-${escAttr(group.id)}" data-group="${escAttr(group.id)}"${isOpen ? " open" : ""}>
        <summary>
          <span class="slot mob-group-icon">${icon ? `<img src="${escAttr(icon)}" alt="" loading="lazy" decoding="async" />` : `<i aria-hidden="true">◆</i>`}</span>
          <span class="mob-group-copy"><b>${esc(group.title)}</b><small>${esc(group.sub || group.summon || `${group.list.length} ${group.list.length === 1 ? "существо" : group.list.length < 5 ? "существа" : "существ"}${bossCount ? ` · ${bossCount} босс${bossCount === 1 ? "" : bossCount < 5 ? "а" : "ов"}` : ""}`)}</small></span>
          <em>${group.list.length}</em>
        </summary>
        <div class="mob-group-body" data-pending="1"></div>
      </details>`;
    };
    app.innerHTML = `
      <div class="page mobs-page">
        ${mast("Мобы и события", "Все существа Terraria и Calamity: где живут, когда появляются, сколько у них здоровья и что с них падает. События подсказывают, как их призвать и чем закончится бой.")}
        <div class="mob-controls panel">
          <label class="mob-search" aria-label="Поиск существа">
            <span aria-hidden="true">▶</span>
            <input id="mob-search" type="search" placeholder="Найти существо: зомби, wyvern, кислотный…" autocomplete="off" spellcheck="false" value="${escAttr(params.q || "")}" />
          </label>
          <div class="mob-filter-row" role="group" aria-label="Источник">
            <button class="mini ${!filters.src ? "on" : ""}" data-mob-src="">Все</button>
            <button class="mini ${filters.src === "v" ? "on" : ""}" data-mob-src="v">Terraria</button>
            <button class="mini ${filters.src === "c" ? "on" : ""}" data-mob-src="c">Calamity</button>
          </div>
          <div class="mob-filter-row" role="group" aria-label="Тип существа">
            <button class="mini ${!filters.kind ? "on" : ""}" data-mob-kind="">Все типы</button>
            <button class="mini ${filters.kind === "enemy" ? "on" : ""}" data-mob-kind="enemy">Враги</button>
            <button class="mini ${filters.kind === "critter" ? "on" : ""}" data-mob-kind="critter">Зверьки</button>
            <button class="mini ${filters.kind === "boss" ? "on" : ""}" data-mob-kind="boss">Боссы</button>
          </div>
          <p class="mob-controls-note">${query ? `Найдено: ${searchHits.length}` : `${filtered.length} существ${activeFilterCount ? " по фильтру" : ""} · ${eventGroups.length} событий · ${biomeGroups.length} групп биомов`}</p>
        </div>
        ${query ? `
          <section class="mob-results" aria-label="Результаты поиска">
            ${searchHits.length ? `<div class="mob-grid">${searchHits.map(mobCard).join("")}</div>` : `<div class="empty-state"><span>✦</span><b>Никого не нашли</b><p>Попробуй другое имя — работает и русское, и английское.</p><a class="btn ghost" href="#/mobs">Сбросить поиск</a></div>`}
          </section>` : `
          <section class="mob-section" aria-labelledby="mob-events-title">
            <header class="home-section-head"><div><small>как призвать и что делать</small><h2 id="mob-events-title">События и вторжения</h2></div><p>Каждое событие раскрывается: условия запуска, совет и полный список участников.</p></header>
            ${eventGroups.map((g) => groupBlock(g, "event")).join("")}
          </section>
          <section class="mob-section" aria-labelledby="mob-biomes-title">
            <header class="home-section-head"><div><small>кто где живёт</small><h2 id="mob-biomes-title">Биомы</h2></div><p>От леса на поверхности до Бездны Calamity — жители каждого уголка мира.</p></header>
            ${biomeGroups.map((g) => groupBlock(g, "biome")).join("")}
          </section>`}
      </div>`;
    const groupById = new Map([...eventGroups, ...biomeGroups].map((g) => [g.id, g]));
    const fillGroup = (details) => {
      const body = details.querySelector(".mob-group-body");
      if (!body || !body.dataset.pending) return;
      delete body.dataset.pending;
      const group = groupById.get(details.dataset.group);
      if (!group) return;
      const info = group.summon ? `<div class="mob-event-info"><p><b>Как начинается:</b> ${esc(group.summon)}</p>${group.tip ? `<p><b>Что делать:</b> ${esc(group.tip)}</p>` : ""}</div>` : "";
      body.innerHTML = `${info}<div class="mob-grid">${group.list.map(mobCard).join("")}</div>`;
      versionLocalImages(body);
    };
    app.querySelectorAll(".mob-group").forEach((details) => {
      if (details.open) fillGroup(details);
      details.addEventListener("toggle", () => { if (details.open) fillGroup(details); }, { once: false });
    });
    const syncUrl = (next) => {
      const qs = new URLSearchParams();
      if (next.q) qs.set("q", next.q);
      if (next.src) qs.set("src", next.src);
      if (next.kind) qs.set("kind", next.kind);
      if (next.g) qs.set("g", next.g);
      const hash = "#/mobs" + (qs.toString() ? `?${qs}` : "");
      history.replaceState(null, "", hash);
      renderMobs(Object.fromEntries(qs));
    };
    const current = () => ({ q: app.querySelector("#mob-search")?.value.trim() || "", src: filters.src, kind: filters.kind, g: openGroup });
    let searchTimer = 0;
    app.querySelector("#mob-search")?.addEventListener("input", (event) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => syncUrl({ ...current(), q: event.target.value.trim(), g: "" }), 220);
    });
    app.querySelectorAll("[data-mob-src]").forEach((btn) => btn.onclick = () => syncUrl({ ...current(), src: btn.dataset.mobSrc }));
    app.querySelectorAll("[data-mob-kind]").forEach((btn) => btn.onclick = () => syncUrl({ ...current(), kind: btn.dataset.mobKind }));
    if (openGroup) {
      const target = document.getElementById(`mob-group-${openGroup}`);
      if (target) requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start", behavior: "auto" });
        target.classList.add("flash-target");
        target.addEventListener("animationend", () => target.classList.remove("flash-target"), { once: true });
      });
    }
    const focused = app.querySelector("#mob-search");
    if (params.q && focused) { focused.focus(); focused.setSelectionRange(focused.value.length, focused.value.length); }
  }

  function lexCard(e) {
    const kind = LEX_KIND[e.type] || "mat";
    const art = BOSS_ART_BY_ID[e.id] || "";
    const artNote = LEX_ART_NOTE[e.en || e.ru] || "";
    const wikiName = e.en || e.ru;
    const wikiUrl = `https://calamitymod.wiki.gg/wiki/Special:Search?search=${encodeURIComponent(wikiName)}`;
    const top = artNote ? " top" : "";
    return `<article class="card has-art lex-card">
      <div class="card-shot slot" data-kind="${escAttr(kind)}">
        ${visualArt(e.en || e.ru, kind, art)}
        ${artNote ? `<span class="art-provenance">${esc(artNote)}</span>` : ""}
        <span class="kind-pill${top}">${esc(e.type)}</span>
        <span class="tag-cls all${top}">RU / EN</span>
      </div>
      <div class="card-body">
        <div class="card-title">${esc(e.ru)}${e.en ? `<span class="en-sub">в игре: ${esc(e.en)}</span>` : ""}</div>
        <p class="desc">${esc(ruText(e.desc))}</p>
        <div class="facts">
          ${e.where ? `<div class="fact"><span>Где</span><p>${esc(ruText(e.where))}</p></div>` : ""}
          ${e.used ? `<div class="fact"><span>Зачем</span><p>${esc(ruText(e.used))}</p></div>` : ""}
          ${e.craft ? `<div class="fact"><span>Крафт</span><p>${esc(ruText(e.craft))}</p></div>` : ""}
        </div>
        <div class="card-links"><a href="${escAttr(wikiUrl)}" target="_blank" rel="noopener noreferrer">Найти на официальной wiki ↗</a></div>
      </div>
    </article>`;
  }

  function renderLex(params = {}) {
    fillRail("");
    const search = (params.q || "").trim().toLocaleLowerCase("ru");
    const type = params.type || "all";
    const pageSize = 96;
    const limit = Math.max(pageSize, Number(params.limit) || pageSize);
    const allEntries = Object.values(CODEX.lex || {});
    const types = [...new Set(allEntries.map((e) => e.type))].sort((a, b) => a.localeCompare(b, "ru"));
    const list = allEntries.filter((e) => {
      if (type !== "all" && e.type !== type) return false;
      const blob = `${e.ru} ${e.en} ${e.type} ${e.desc} ${e.where || ""} ${e.used || ""} ${e.craft || ""} ${(e.aliases || []).join(" ")}`.toLocaleLowerCase("ru");
      return !search || matchesSearch(blob, search);
    }).sort((a, b) => a.ru.localeCompare(b.ru, "ru"));
    const visible = list.slice(0, limit);
    app.innerHTML = `
      <div class="page">
        ${mast("Словарь", "Все термины в формате карточек маршрута: изображение, смысл, источник и игровое название.")}
        <div class="filter-bar lex-controls">
          <label class="search-wrap">
            <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m20 20-4-4"/></svg>
            <input id="lex-s" type="search" aria-label="Поиск по словарю" placeholder="Термин, английское имя, место или назначение…" value="${escAttr(params.q || "")}" />
            ${search ? `<button class="filter-clear" id="lex-clear" type="button">Сбросить</button>` : ""}
          </label>
          <select id="lex-type" aria-label="Тип термина">
            <option value="all">Все типы · ${allEntries.length}</option>
            ${types.map((name) => `<option value="${escAttr(name)}" ${type === name ? "selected" : ""}>${esc(name)} · ${allEntries.filter((e) => e.type === name).length}</option>`).join("")}
          </select>
        </div>
        <div class="catalog-found"><p class="found">Найдено: <b>${list.length}</b> · показано ${visible.length}</p>${search || type !== "all" ? `<a href="#/lex">Сбросить фильтры</a>` : ""}</div>
        ${visible.length
          ? `<div class="item-grid lex-grid">${visible.map(lexCard).join("")}</div>
             ${visible.length < list.length ? `<div class="catalog-more"><button class="btn ghost" type="button" id="lex-more">Показать ещё ${Math.min(pageSize, list.length - visible.length)}<small>${visible.length} из ${list.length}</small></button></div>` : ""}`
          : `<div class="empty-state"><span>A</span><b>Термин не найден</b><p>Попробуй английское название, место или сбрось выбранный тип.</p><a class="btn ghost" href="#/lex">Показать весь словарь</a></div>`}
      </div>
    `;
    const build = (over = {}, replace = false) => {
      const next = { q: params.q || "", type, limit, ...over };
      const qs = new URLSearchParams();
      if (next.q) qs.set("q", next.q);
      if (next.type && next.type !== "all") qs.set("type", next.type);
      if (next.limit > pageSize) qs.set("limit", next.limit);
      const hash = "#/lex" + (qs.toString() ? `?${qs}` : "");
      if (replace) { history.replaceState(null, "", hash); route(); }
      else location.hash = hash;
    };
    const input = $("body") && $("#lex-s");
    let timer;
    if (input) input.oninput = () => { clearTimeout(timer); timer = setTimeout(() => build({ q: input.value, limit: pageSize }, true), 220); };
    const typeSelect = $("#lex-type");
    if (typeSelect) typeSelect.onchange = () => build({ type: typeSelect.value, limit: pageSize });
    const clear = $("#lex-clear");
    if (clear) clear.onclick = () => build({ q: "", limit: pageSize }, true);
    const more = $("#lex-more");
    if (more) more.onclick = () => build({ limit: visible.length + pageSize }, true);
    bindSprites(app);
  }

  function wikiCard(title, rows, options = {}) {
    const kind = options.kind || "mat";
    const lex = CODEX.lookup ? CODEX.lookup(title) : null;
    const en = options.en || lex?.en || "";
    const desc = options.desc || lex?.desc || "";
    const wikiUrl = `https://calamitymod.wiki.gg/wiki/Special:Search?search=${encodeURIComponent(options.wiki || en || title)}`;
    return `<article class="card has-art wiki-card">
      <div class="card-shot slot" data-kind="${escAttr(kind)}">
        ${visualArt(title, kind, options.art || "")}
        <span class="kind-pill">${esc(options.type || "Справочник")}</span>
        ${options.badge ? `<span class="tag-cls all">${esc(options.badge)}</span>` : ""}
      </div>
      <div class="card-body">
        <div class="card-title">${esc(title)}${en ? `<span class="en-sub">в игре: ${esc(en)}</span>` : ""}</div>
        ${desc ? `<p class="desc">${esc(ruText(desc))}</p>` : ""}
        <div class="facts">${rows.map(([k, v]) => v ? `<div class="fact"><span>${esc(k)}</span><p>${esc(ruText(v))}</p></div>` : "").join("")}</div>
        ${options.noWiki ? "" : `<div class="card-links"><a href="${escAttr(wikiUrl)}" target="_blank" rel="noopener noreferrer">Подробнее на wiki ↗</a></div>`}
      </div>
    </article>`;
  }

  function guideReferenceCard(q) {
    return `<article class="card has-art wiki-card guide-reference-card">
      <div class="card-shot slot" data-kind="mechanic">
        ${visualArt(q.title, "mechanic", GUIDE_ART[q.id] || "")}
        <span class="kind-pill">Глава ${String(q.id).padStart(2, "0")}</span>
        <span class="tag-cls all">${esc(({ pre: "Прехардмод", hard: "Хардмод", post: "После Луны", end: "Финал" })[q.era] || "Маршрут")}</span>
      </div>
      <div class="card-body">
        <div class="card-title">${esc(q.title)}<span class="en-sub">${esc(q.subtitle || "Этап прохождения")}</span></div>
        <p class="desc">${esc(ruText(q.mood || q.story || q.subtitle || "Практический этап маршрута прохождения."))}</p>
        <div class="facts">
          ${q.objective ? `<div class="fact"><span>Цель</span><p>${esc(ruText(q.objective))}</p></div>` : ""}
          <div class="fact"><span>Когда</span><p>${esc(ruText(q.subtitle || "По порядку маршрута"))}</p></div>
          <div class="fact"><span>Дальше</span><p>Открой главу: внутри шаги, предметы, крафты, противники и чеклист.</p></div>
        </div>
        <div class="card-links"><a href="#/novice?q=${q.id}">Открыть полный маршрут →</a></div>
      </div>
    </article>`;
  }

  function renderWiki(params = {}) {
    fillRail("");
    const tab = ["progress", "armor", "mats", "hp", "mech"].includes(params.tab) ? params.tab : "progress";
    const search = (params.q || "").trim().toLocaleLowerCase("ru");
    const tabs = [
      ["progress", "Прогрессия"],
      ["armor", "Броня"],
      ["mats", "Материалы"],
      ["hp", "Сердца и мана"],
      ["mech", "Механики"]
    ];
    const sources = { progress: CODEX.quests, armor: CODEX.armors, mats: CODEX.materials, hp: CODEX.hpUps, mech: CODEX.mechanics };
    const source = sources[tab] || sources.progress;
    const list = source.filter((entry) => {
      if (!search) return true;
      const name = entry.name || entry.title || "";
      const lex = CODEX.lookup ? CODEX.lookup(name) : null;
      const blob = `${JSON.stringify(entry)} ${lex?.en || ""} ${(lex?.aliases || []).join(" ")}`.toLocaleLowerCase("ru");
      return matchesSearch(blob, search);
    });
    let cards;
    if (tab === "armor") {
      cards = list.map((a) => wikiCard(a.name, [["Когда", a.when], ["Из", a.mat], ["Зачем", a.note]], { kind: "armor", type: "Броня", badge: a.era === "pre" ? "Прехардмод" : a.era === "hard" ? "Хардмод" : a.era === "post" ? "После Луны" : "Финал" }));
    } else if (tab === "mats") {
      cards = list.map((m) => wikiCard(m.name, [["Когда", m.when], ["Где", m.src], ["Зачем", m.use]], { kind: "mat", type: "Материал" }));
    } else if (tab === "hp") {
      cards = list.map((h) => wikiCard(h.name, [["Когда", h.when], ["Эффект", h.bonus], ["Зачем", "Постоянно усиливает текущего персонажа."]], { kind: "potion", type: "Усиление" }));
    } else if (tab === "mech") {
      cards = list.map((m) => wikiCard(m.name, [["Суть", m.d], ["Когда", "Учитывай механику на соответствующем этапе прохождения."]], { kind: "mechanic", type: "Механика", desc: "Ключевое правило Calamity, которое влияет на подготовку или бой.", noWiki: true }));
    } else {
      cards = list.map(guideReferenceCard);
    }
    app.innerHTML = `
      <div class="page">
        ${mast("Справочник", "Те же наглядные карточки маршрута: изображение, этап, источник, назначение и быстрый переход к подробностям.")}
        <div class="chips wiki-tabs">
          ${tabs.map(([id, name]) => `<button class="chip ${tab === id ? "active" : ""}" data-tab="${id}">${name}<em>${sources[id].length}</em></button>`).join("")}
        </div>
        <label class="search-wrap wiki-search">
          <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m20 20-4-4"/></svg>
          <input id="wiki-s" type="search" aria-label="Поиск по справочнику" placeholder="Название, этап, источник или назначение…" value="${escAttr(params.q || "")}" />
          ${search ? `<button class="filter-clear" id="wiki-clear" type="button">Сбросить</button>` : ""}
        </label>
        <p class="found">Раздел: ${esc(tabs.find(([id]) => id === tab)?.[1] || "Прогрессия")} · найдено ${list.length}</p>
        ${cards.length
          ? `<div class="item-grid wiki-card-grid">${cards.join("")}</div>`
          : `<div class="empty-state"><span>✦</span><b>Запись не найдена</b><p>Измени запрос или открой другой раздел справочника.</p><a class="btn ghost" href="#/wiki?tab=${escAttr(tab)}">Сбросить поиск</a></div>`}
      </div>
    `;
    app.querySelectorAll("[data-tab]").forEach((button) => { button.onclick = () => { location.hash = `#/wiki?tab=${button.dataset.tab}`; }; });
    const build = (q) => {
      const qs = new URLSearchParams();
      if (tab !== "progress") qs.set("tab", tab);
      if (q) qs.set("q", q);
      const hash = "#/wiki" + (qs.toString() ? `?${qs}` : "");
      history.replaceState(null, "", hash);
      route();
    };
    const input = $("#wiki-s");
    let timer;
    if (input) input.oninput = () => { clearTimeout(timer); timer = setTimeout(() => build(input.value), 220); };
    const clear = $("#wiki-clear");
    if (clear) clear.onclick = () => build("");
    bindSprites(app);
  }

  /* ---------- отдельный экран дерева крафта ---------- */
  let craftTreeRoot = store.get().craftTreeRoot || "";
  let craftTreeChoicesCache = null;
  let craftTreeChoiceLookupCache = null;
  const CRAFT_PICKER_PAGE_SIZE = 120;
  const CRAFT_RECENT_LIMIT = 8;

  function recentCraftRoots() {
    const recent = store.get().craftTreeRecent;
    return Array.isArray(recent) ? recent.filter(Boolean).slice(0, CRAFT_RECENT_LIMIT) : [];
  }

  function rememberCraftRoot(name) {
    const key = String(name || "").trim();
    if (!key) return;
    const next = [key, ...recentCraftRoots().filter((item) => normalizeArtName(item) !== normalizeArtName(key))].slice(0, CRAFT_RECENT_LIMIT);
    store.set({ craftTreeRecent: next });
  }

  function treeRecipeForName(name) {
    if (!name) return null;
    const index = getRecipeIndex();
    const cat = catalogByName(name);
    // Точная запись каталога никогда не заимствует рецепт словарного алиаса:
    // Prism Shard не должен получать рецепт Sea Prism и становиться сам себе ингредиентом.
    if (cat) return index.get(normalizeArtName(cat.name)) || null;
    const direct = index.get(normalizeArtName(name));
    if (direct) return direct;
    const lex = exactLexLookup(name);
    return lex
      ? (index.get(normalizeArtName(lex.en)) || index.get(normalizeArtName(lex.ru)) || null)
      : null;
  }

  function craftTreeChoices() {
    if (craftTreeChoicesCache) return craftTreeChoicesCache;
    ensureVanillaRecipes();
    buildNameIndexes();
    const choices = new Map();
    const add = (name, vanillaRecord = null, catalogRecord = null) => {
      // Скобочная часть ванильного имени различает реальные Item ID
      // (варианты клюшек, датчиков, логических вентилей и т. п.). Удалять её
      // можно только у рекомендаций кодекса, но не у записей Terraria.
      const sourceName = String(name || "").trim();
      if (vanillaRecord && isInternalVanillaName(sourceName)) return;
      const raw = vanillaRecord ? sourceName : sourceName.replace(/\s*\([^)]*\)\s*/g, " ").trim();
      if (!raw) return;
      // Сначала приводим всё к имени записи каталога. Рекомендация маршрута,
      // английское имя и запись из CODEX.crafts тогда занимают один и тот же
      // слот, а не рисуются несколькими копиями одного предмета.
      const cat = vanillaRecord ? null : (catalogRecord || catalogByName(raw));
      const canonical = cat ? cat.name : raw;
      const vanilla = vanillaRecord || (!cat ? (vanillaItemForName(canonical) || (canonical !== raw ? vanillaItemForName(raw) : null)) : null);
      const extra = vanilla ? null : (EXTRA_ITEM_INFO[canonical] || EXTRA_ITEM_INFO[raw] || null);
      const vanillaRecipeRaw = vanilla && VANILLA_RECIPE_BY_ID.get(String(vanilla.id));
      const vanillaRecipe = vanillaRecipeRaw
        ? { ings: vanillaRecipeRaw.ings, station: vanillaStationName(vanillaRecipeRaw.station) }
        : null;
      const key = cat ? `catalog:${cat.id}` : vanilla ? `vanilla:${vanilla.id}` : `name:${normalizeArtName(canonical)}`;
      const recipe = vanilla
        ? vanillaRecipe
        : treeRecipeForName(canonical) || (canonical !== raw ? treeRecipeForName(raw) : null);
      const cycleResource = !recipe && recipeCycleCuts.has(normalizeArtName(canonical));
      const catalogResource = Boolean(cat);
      if (!key || choices.has(key) || ((!recipe || !recipe.ings.length) && !vanilla && !cycleResource && !catalogResource)) return;
      const lex = vanilla ? null : (exactLexLookup(canonical) || (canonical !== raw ? exactLexLookup(raw) : null));
      const guide = vanilla ? null : (GUIDE_BY_NORM.get(normalizeArtName(raw)) || GUIDE_BY_NORM.get(normalizeArtName(canonical)) || null);
      const ru = vanilla
        ? ruItemName(canonical, vanilla)
        : (guide && guide.nameRu) || (lex && lex.ru) || (extra && extra.ru) || ruItemName(canonical, cat) || canonical;
      const en = vanilla ? canonical : (lex && lex.en) || (extra && extra.en) || (cat && cat.name) || (/[A-Za-z]/.test(canonical) ? canonical : "");
      const vanillaArtInfo = vanilla && vanillaIngredientArt(canonical);
      const vanillaArt = vanilla && (vanilla.sprite || vanillaArtInfo?.local || vanillaArtInfo?.remote);
      const rootInfo = cat || vanilla ? null : ingredientInfo(canonical);
      const art = cat
        ? `assets/item-sprites/${encodeURIComponent(cat.id)}.png`
        : vanilla
          ? (vanillaArt || craftStationSprite(recipe?.station))
          : (rootInfo.art || rootInfo.remoteArt || resolveArt(canonical) || resolveArt(raw) || CRAFT_ART[canonical] || craftStationSprite(recipe?.station));
      choices.set(key, {
        name: canonical,
        lookup: cat ? `catalog:${cat.id}` : vanilla ? key : canonical,
        ru, en, art,
        search: `${ru} ${en} ${canonical}`.toLocaleLowerCase("ru"),
        kind: cat ? cat.kind : (extra && extra.kind) || (vanilla && vanillaKind(vanilla.type)) || "misc",
        ingredients: recipe ? recipe.ings.length : 0,
        source: cat ? "calamity" : vanilla ? "vanilla" : "guide"
      });
    };
    indexedItems().forEach((item) => add(item.name, null, item));
    (CODEX.items || []).forEach((item) => add(item.name));
    (CODEX.crafts || []).forEach((item) => add(item.name || item.t));
    Object.keys(EXTRA_RECIPE_DEFS).forEach((name) => add(name));
    VANILLA_BY_ID.forEach((item) => add(item.name, item));
    craftTreeChoicesCache = [...choices.values()].sort((a, b) => a.ru.localeCompare(b.ru, "ru") || a.name.localeCompare(b.name, "en"));
    return craftTreeChoicesCache;
  }

  function craftTreeChoiceLookup() {
    if (craftTreeChoiceLookupCache) return craftTreeChoiceLookupCache;
    craftTreeChoiceLookupCache = new Map();
    craftTreeChoices().forEach((item) => {
      craftTreeChoiceLookupCache.set(normalizeArtName(item.lookup || item.name), item);
      const nameKey = normalizeArtName(item.name);
      if (!craftTreeChoiceLookupCache.has(nameKey)) craftTreeChoiceLookupCache.set(nameKey, item);
    });
    return craftTreeChoiceLookupCache;
  }

  function craftChoiceCardHTML(item) {
    const art = item.art
      ? `<img src="${escAttr(item.art)}" alt="" loading="lazy" decoding="async" />`
      : unavailableArt(item.kind || "misc");
    return `<button class="craft-choice-card" type="button" data-choice-name="${escAttr(item.lookup || item.name)}" data-choice-search="${escAttr(item.search || `${item.ru} ${item.en} ${item.name}`.toLocaleLowerCase("ru"))}" aria-pressed="false">
      <span class="slot craft-choice-art">${art}</span>
      <span class="craft-choice-copy"><b>${esc(item.ru)}</b>${item.en && item.en !== item.ru ? `<small>${esc(item.en)}</small>` : ""}<em>${item.ingredients ? `${item.ingredients} ингредиент${item.ingredients === 1 ? "" : item.ingredients < 5 ? "а" : "ов"}` : "ресурс / добывается"}</em></span>
      <span class="craft-choice-mark" aria-hidden="true">◆</span>
    </button>`;
  }

  // Карточки создаются заново при каждом поиске и переключении фильтра.
  // Прямой обработчик надёжнее делегирования на весь граф: выбор предмета
  // не зависит от служебных data-атрибутов родительской секции.
  function bindCraftChoiceCards(section, scope) {
    if (!section || !scope) return;
    scope.querySelectorAll(".craft-choice-card[data-choice-name]").forEach((card) => {
      card.onclick = () => selectCraftChoice(section, card);
    });
  }

  function craftTreeBranchHTML(root) {
    const info = root ? ingredientInfo(root) : null;
    const activeRoot = isTreeEntry(info) ? root : "";
    const activeInfo = activeRoot ? info : null;
    return `
      <section class="craft-tree-branch panel" id="craft-tree-branch" tabindex="-1" aria-labelledby="craft-tree-title">
        <div class="craft-tree-branch-head">
          <div class="craft-tree-branch-copy">
            <span class="craft-tree-branch-mark" aria-hidden="true">◆</span>
            <div>
              <small>главный инструмент · все зависимости</small>
              <h2 id="craft-tree-title">Полное дерево</h2>
              <p>Выбери любой предмет Terraria или Calamity: кодекс покажет весь путь до базовых ресурсов, точные количества, партии, станции и источники.</p>
            </div>
          </div>
          <button class="craft-tree-add" id="craft-tree-add" type="button" aria-expanded="${activeInfo ? "false" : "true"}">
            <span class="craft-tree-plus" aria-hidden="true">+</span>
            <span>${activeInfo ? "Сменить предмет" : "Выбрать предмет"}</span>
          </button>
        </div>
        <div class="craft-tree-picker" id="craft-tree-picker" ${activeInfo ? "hidden" : ""}>
          <div class="craft-tree-picker-copy">
            <b>Какой предмет разобрать?</b>
            <span>Выбирай любой предмет Каламити или ванильной Terraria — в индексе есть 5087 ванильных предметов и их рецепты.</span>
          </div>
          <div class="craft-tree-picker-controls">
            <label class="craft-tree-search">
              <span aria-hidden="true">▶</span>
              <input id="craft-tree-picker-search" type="search" placeholder="Фильтр по русскому или игровому имени…" autocomplete="off" />
            </label>
            <div class="craft-tree-recent" id="craft-tree-recent" hidden>
              <div class="craft-tree-recent-head"><b>Последние ветки</b><small>быстрый повторный выбор</small></div>
              <div class="craft-tree-recent-grid" id="craft-tree-recent-grid"></div>
            </div>
            <div class="craft-tree-choice-filters" role="group" aria-label="Фильтр индекса предметов">
              <button type="button" class="active" data-choice-filter="all" aria-pressed="true">Все</button>
              <button type="button" data-choice-filter="craftable" aria-pressed="false">С рецептом</button>
              <button type="button" data-choice-filter="vanilla" aria-pressed="false">Terraria</button>
              <button type="button" data-choice-filter="calamity" aria-pressed="false">Каламити</button>
            </div>
            <p class="craft-tree-choice-status" id="craft-tree-choice-status" aria-live="polite">Нажми на карточку предмета</p>
            <div class="craft-tree-choice-grid" id="craft-tree-choice-grid" role="listbox" aria-label="Предмет для дерева крафта">
              <div class="craft-tree-choice-placeholder">Подготавливаем полку предметов для выбора…</div>
            </div>
            <div class="craft-tree-picker-actions">
              <button class="btn" id="craft-tree-build" type="button">Построить ветку</button>
              <button class="btn ghost" id="craft-tree-clear" type="button">Очистить</button>
            </div>
          </div>
        </div>
        <div class="craft-tree-active" data-tree-active>${activeInfo ? `<span>корень полного дерева</span><b>${esc(activeInfo.ru)}</b><i>${activeInfo.en ? `в игре: ${esc(activeInfo.en)}` : ""}</i>` : `<span>шаг 1 из 2</span><b>Выбери результат на полке выше</b><i>После выбора здесь сразу появится полный граф</i>`}</div>
        <div class="craft-tree-inline-wrap">
          <div class="craft-tree-inline-tools"><span>✥ тяни карту мышью · Ctrl + колесо меняет масштаб только графа · ▸ раскрывает ветку</span><div class="craft-tree-zoom-controls" role="group" aria-label="Масштаб дерева"><button type="button" data-tree-zoom="out" aria-label="Уменьшить дерево">−</button><output data-tree-zoom-label>100%</output><button type="button" data-tree-zoom="in" aria-label="Увеличить дерево">+</button><button type="button" data-tree-zoom="reset" aria-label="Сбросить масштаб">↺</button></div><button type="button" data-inline-tree-expand>⊞ Развернуть всё</button><button type="button" data-inline-tree-collapse>⊟ Свернуть всё</button><button type="button" data-copy-tree-link ${activeInfo ? "" : "disabled"}>⧉ Ссылка</button></div>
          <div class="tree-body craft-tree-inline-body" id="craft-tree-inline-body" data-tree-surface="inline">${activeInfo
            ? treeNodeHTML(activeRoot, 0, new Set())
            : `<div class="craft-tree-empty"><span class="craft-tree-empty-mark">+</span><b>Здесь появится твоя ветка</b><p>Открой выбор предмета и начни с оружия, брони, аксессуара или призывалки.</p></div>`}</div>
        </div>
        <section class="craft-tree-inspector" id="craft-tree-inspector" hidden aria-live="polite" aria-labelledby="craft-tree-inspector-title">
          <div id="craft-tree-inspector-content"></div>
        </section>
        <p class="craft-tree-help"><b>Подсказка:</b> зажми левую кнопку мыши и тяни карту в любую сторону; стрелка раскрывает ингредиенты, обычный клик по предмету показывает полную карточку.</p>
      </section>`;
  }

  function renderCraftTreeRecent(section, query = "") {
    const wrap = section.querySelector("#craft-tree-recent");
    const grid = section.querySelector("#craft-tree-recent-grid");
    if (!wrap || !grid) return;
    const q = String(query || "").trim().toLocaleLowerCase("ru");
    const choiceMap = craftTreeChoiceLookup();
    const items = recentCraftRoots().map((name) => choiceMap.get(normalizeArtName(name))).filter(Boolean)
      .filter((item) => !q || item.search.includes(q));
    wrap.hidden = !items.length || !!q;
    if (!items.length || q) {
      grid.innerHTML = "";
      return;
    }
    grid.innerHTML = items.map(craftChoiceCardHTML).join("");
    bindCraftChoiceCards(section, grid);
  }

  function renderCraftChoiceWindow(section, query = "") {
    const grid = section.querySelector("#craft-tree-choice-grid");
    const status = section.querySelector("#craft-tree-choice-status");
    if (!grid) return;
    const all = craftTreeChoices();
    const filter = section.dataset.choiceSource || "all";
    const pool = filter === "craftable" ? all.filter((item) => item.ingredients > 0) : filter === "all" ? all : all.filter((item) => item.source === filter);
    const q = String(query || "").trim().toLocaleLowerCase("ru");
    const matches = q ? pool.filter((item) => item.search.includes(q)) : pool;
    const limit = Math.max(CRAFT_PICKER_PAGE_SIZE, Number(section.dataset.choiceLimit || CRAFT_PICKER_PAGE_SIZE));
    const visible = matches.slice(0, limit);
    grid.innerHTML = visible.length
      ? visible.map(craftChoiceCardHTML).join("")
      : `<div class="craft-tree-choice-placeholder">По запросу ничего не найдено</div>`;
    if (visible.length < matches.length) {
      grid.insertAdjacentHTML("beforeend", `<button class="craft-choice-more" type="button" data-choice-more>Показать ещё ${Math.min(CRAFT_PICKER_PAGE_SIZE, matches.length - visible.length)} из ${matches.length}</button>`);
    }
    bindCraftChoiceCards(section, grid);
    const more = grid.querySelector("button[data-choice-more]");
    if (more) more.onclick = () => {
      section.dataset.choiceLimit = String(Number(section.dataset.choiceLimit || CRAFT_PICKER_PAGE_SIZE) + CRAFT_PICKER_PAGE_SIZE);
      renderCraftChoiceWindow(section, q);
    };
    grid.dataset.ready = "1";
    renderCraftTreeRecent(section, q);
    if (status && !section.dataset.selectedChoice) status.textContent = q
      ? `Найдено карточек: ${matches.length}`
      : `Показано карточек: ${visible.length} из ${pool.length}`;
    if (section.dataset.selectedChoice) {
      const active = [...grid.querySelectorAll("[data-choice-name]")].find((card) => normalizeArtName(card.dataset.choiceName) === normalizeArtName(section.dataset.selectedChoice));
      if (active) selectCraftChoice(section, active);
    }
  }

  function populateCraftTreePicker(section) {
    const grid = section.querySelector("#craft-tree-choice-grid");
    if (!grid || grid.dataset.ready) return;
    section.dataset.choiceLimit = String(CRAFT_PICKER_PAGE_SIZE);
    if (craftTreeRoot) section.dataset.selectedChoice = craftTreeRoot;
    renderCraftChoiceWindow(section);
    if (craftTreeRoot && !section.dataset.selectedChoice) {
      const active = [...grid.querySelectorAll("[data-choice-name]")].find((card) => normalizeArtName(card.dataset.choiceName) === normalizeArtName(craftTreeRoot));
      if (active) selectCraftChoice(section, active);
    }
  }

  function selectCraftChoice(section, card) {
    if (!section || !card) return;
    const grid = section.querySelector("#craft-tree-choice-grid");
    if (grid) grid.querySelectorAll(".craft-choice-card.selected").forEach((other) => {
      other.classList.remove("selected");
      other.setAttribute("aria-pressed", "false");
    });
    card.classList.add("selected");
    card.setAttribute("aria-pressed", "true");
    section.dataset.selectedChoice = card.dataset.choiceName || "";
    const status = section.querySelector("#craft-tree-choice-status");
    if (status) status.innerHTML = `Выбран предмет: <b>${esc(card.querySelector(".craft-choice-copy b")?.textContent || card.dataset.choiceName || "")}</b>`;
  }

  function craftPlanMaterialSummary(roots) {
    // Aggregate demand for the same intermediate item across every target before
    // expanding it. This matters for batched recipes: two planned items that
    // each need one Torch share one three-Torch batch instead of consuming two.
    // `crafts` intentionally means recipe runs, matching every quantity control.
    const demands = new Map();
    const expandedRuns = new Map();
    const queue = [];
    let queueIndex = 0;
    let visited = 0;
    const keyFor = (info, itemName) => info.vanilla?.id != null
      ? `vanilla:${info.vanilla.id}`
      : info.catName
        ? `catalog:${normalizeArtName(info.catName)}`
        : normalizeArtName(info.name || itemName);
    const amountOf = (value) => {
      const amount = Number.parseFloat(String(value || "1").replace(",", "."));
      return Number.isFinite(amount) && amount > 0 ? amount : 1;
    };
    const addDemand = (itemName, count) => {
      const info = ingredientInfo(itemName);
      const key = keyFor(info, itemName);
      const current = demands.get(key) || { key, name: itemName, info, count: 0 };
      current.count += count;
      demands.set(key, current);
      queue.push(key);
    };
    (roots || []).forEach((root) => {
      const multiplier = Number(root?.crafts);
      const craftRuns = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
      const rootInfo = ingredientInfo(root?.name || root?.ref || "");
      const rootRecipe = rootInfo.recipe && rootInfo.recipe.ings.length ? rootInfo.recipe : null;
      if (!rootRecipe) addDemand(root?.name || root?.ref || "", craftRuns);
      else rootRecipe.ings.forEach((ingredient) => addDemand(ingredient.key || ingredient.name, amountOf(ingredient.count) * craftRuns));
    });

    while (queueIndex < queue.length && ++visited <= 20000) {
      const key = queue[queueIndex++];
      const demand = demands.get(key);
      if (!demand) continue;
      const recipe = demand.info.recipe && demand.info.recipe.ings.length ? demand.info.recipe : null;
      if (!recipe) continue;
      const resultYield = Math.max(1, Number(recipe.yield || 1));
      const requiredRuns = Math.ceil((demand.count - 1e-9) / resultYield);
      const previousRuns = expandedRuns.get(key) || 0;
      const addedRuns = requiredRuns - previousRuns;
      if (addedRuns <= 0) continue;
      expandedRuns.set(key, requiredRuns);
      recipe.ings.forEach((ingredient) => addDemand(ingredient.key || ingredient.name, amountOf(ingredient.count) * addedRuns));
    }

    return [...demands.values()]
      .filter((item) => !(item.info.recipe && item.info.recipe.ings.length))
      .map(({ name: itemName, info, count }) => ({ name: itemName, info, count }))
      .sort((a, b) => a.info.ru.localeCompare(b.info.ru, "ru"));
  }

  function craftTreeMaterialSummary(name, rootMultiplier = 1) {
    return craftPlanMaterialSummary([{ name, crafts: rootMultiplier }]);
  }

  function craftTreeStationSummary(name) {
    const stations = new Map();
    let visited = 0;
    const walk = (itemName, path) => {
      if (++visited > 5000) return;
      const info = ingredientInfo(itemName);
      const key = normalizeArtName(info.name || itemName);
      const recipe = info.recipe && info.recipe.ings.length ? info.recipe : null;
      if (!recipe || path.has(key)) return;
      if (recipe.station) {
        const label = stationDisplayName(recipe.station);
        const stationKey = normalizeArtName(label);
        if (stationKey && !stations.has(stationKey)) stations.set(stationKey, { name: label, art: craftStationSprite(recipe.station) });
      }
      const nextPath = new Set(path);
      nextPath.add(key);
      recipe.ings.forEach((ingredient) => walk(ingredient.key || ingredient.name, nextPath));
    };
    walk(name, new Set());
    return [...stations.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }

  function craftAmount(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value || "1");
    const rounded = Math.round(number * 100) / 100;
    return (Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ","));
  }

  const CRAFT_PLAN_LIMIT = 24;
  function craftPlanRows() {
    const rows = store.get().craftPlan;
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => Array.isArray(row) ? row : [row?.ref, row?.quantity])
      .map(([ref, quantity]) => [String(ref || "").trim(), Math.min(999, Math.max(1, Math.round(Number(quantity) || 1)))])
      .filter(([ref], index, all) => ref && all.findIndex(([candidate]) => candidate === ref) === index)
      .slice(0, CRAFT_PLAN_LIMIT);
  }
  function canonicalCraftPlanRef(value) {
    const info = ingredientInfo(value);
    if (info.vanilla?.id != null) return `vanilla:${info.vanilla.id}`;
    const catalog = info.catName ? catalogByName(info.catName) : catalogByName(info.name || value);
    if (catalog?.id) return `catalog:${catalog.id}`;
    return String(info.name || value || "").trim();
  }
  function craftPlanEntries() {
    return craftPlanRows().map(([ref, quantity]) => {
      const info = ingredientInfo(ref);
      const recipe = visualRecipeFor(ref);
      if (!recipe?.ings?.length) return null;
      const resultYield = Math.max(1, Number(recipe.yield || 1));
      return { ref, quantity, info, recipe, resultYield, resultQuantity: quantity * resultYield };
    }).filter(Boolean);
  }
  function saveCraftPlanRows(rows) {
    store.set({ craftPlan: rows.slice(0, CRAFT_PLAN_LIMIT) });
    updateCraftPlanCount();
  }
  function setCraftPlanEntry(value, quantity) {
    const ref = canonicalCraftPlanRef(value);
    if (!ref || !visualRecipeFor(ref)) return { ok: false, ref, quantity: 0 };
    const nextQuantity = Math.min(999, Math.max(1, Math.round(Number(quantity) || 1)));
    const rows = craftPlanRows();
    const index = rows.findIndex(([savedRef]) => savedRef === ref);
    if (index >= 0) rows[index] = [ref, nextQuantity];
    else if (rows.length < CRAFT_PLAN_LIMIT) rows.push([ref, nextQuantity]);
    else return { ok: false, full: true, ref, quantity: nextQuantity };
    saveCraftPlanRows(rows);
    return { ok: true, added: index < 0, ref, quantity: nextQuantity };
  }
  function addCraftPlanEntry(value, quantity = 1) {
    const ref = canonicalCraftPlanRef(value);
    const existing = craftPlanRows().find(([savedRef]) => savedRef === ref);
    if (existing) return { ok: true, added: false, ref, quantity: existing[1] };
    return setCraftPlanEntry(ref, quantity);
  }
  function craftPlanActionButton(value, label = "В план") {
    const ref = canonicalCraftPlanRef(value);
    const existing = craftPlanRows().find(([savedRef]) => savedRef === ref);
    const saved = Boolean(existing);
    return `<button class="craft-plan-card-add${saved ? " saved" : ""}" type="button" data-add-craft-plan="${escAttr(ref)}" aria-pressed="${saved}" title="${saved ? "Уже добавлено в общий план" : "Добавить этот рецепт в общий план крафта"}"><span aria-hidden="true">${saved ? "✓" : "＋"}</span> ${saved ? "В плане" : esc(label)}</button>`;
  }
  function fullTreeLink(value, label = "Открыть полное дерево") {
    const ref = canonicalCraftPlanRef(value);
    return `<a class="tree-primary-btn" href="#/crafts?item=${encodeURIComponent(ref)}"><span aria-hidden="true">◆</span><span><b>${esc(label)}</b><small>Все ветки до базовых ресурсов</small></span><i aria-hidden="true">→</i></a>`;
  }
  function removeCraftPlanEntry(value) {
    const ref = canonicalCraftPlanRef(value);
    const rows = craftPlanRows().filter(([savedRef]) => savedRef !== ref);
    saveCraftPlanRows(rows);
    return rows.length;
  }
  function clearCraftPlan() {
    store.set({ craftPlan: [], craftPlanMaterials: [] });
    updateCraftPlanCount();
  }
  function updateCraftPlanCount() {
    const count = craftPlanRows().length;
    document.querySelectorAll("[data-craft-plan-count]").forEach((element) => { element.textContent = count; });
    return count;
  }
  function craftPlanMaterialState() {
    const values = store.get().craftPlanMaterials;
    return new Set(Array.isArray(values) ? values.map(String) : []);
  }
  function toggleCraftPlanMaterial(materialKey) {
    const collected = craftPlanMaterialState();
    if (collected.has(materialKey)) collected.delete(materialKey);
    else collected.add(materialKey);
    store.set({ craftPlanMaterials: [...collected] });
    return collected.has(materialKey);
  }
  function clearCraftPlanMaterials() {
    store.set({ craftPlanMaterials: [] });
  }
  function craftPlanStationSummary(entries) {
    const stations = new Map();
    entries.forEach((entry) => craftTreeStationSummary(entry.ref).forEach((station) => {
      const key = normalizeArtName(station.name);
      if (key && !stations.has(key)) stations.set(key, station);
    }));
    return [...stations.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }
  function craftPlanCopyText(entries, materials, stations) {
    return [
      "Общий план крафта",
      "",
      "Цели:",
      ...entries.map((entry) => `${recipeCraftCountLabel(entry.quantity)}: ${entry.info.ru} → ${craftAmount(entry.resultQuantity)} шт.`),
      "",
      "Базовые ресурсы:",
      ...materials.map((item) => `${craftAmount(item.count)} × ${item.info.ru}`),
      "",
      `Станции: ${stations.length ? stations.map((station) => station.name).join(", ") : "не требуются"}`
    ].join("\n");
  }
  function craftPlanHTML() {
    const entries = craftPlanEntries();
    const materials = craftPlanMaterialSummary(entries.map((entry) => ({ name: entry.ref, crafts: entry.quantity })));
    const stations = craftPlanStationSummary(entries);
    const collected = craftPlanMaterialState();
    const collectedCount = materials.filter((item) => collected.has(normalizeArtName(item.info.ru))).length;
    const percent = materials.length ? Math.round((collectedCount / materials.length) * 100) : 0;
    const totalUnits = materials.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
    const targetsHTML = entries.map((entry) => {
      const art = entry.info.art || entry.info.remoteArt || "";
      return `<article class="craft-plan-target" data-plan-ref="${escAttr(entry.ref)}">
        <span class="slot craft-plan-target-art">${art ? `<img src="${escAttr(releaseAsset(art))}" alt="" loading="lazy" decoding="async" />` : unavailableArt(entry.info.kind || "misc")}</span>
        <div class="craft-plan-target-copy"><small>цель крафта</small><b>${esc(entry.info.ru)}</b>${entry.info.en ? `<i>в игре: ${esc(entry.info.en)}</i>` : ""}<em>${esc(recipeCraftCountLabel(entry.quantity))} → получится ×${esc(craftAmount(entry.resultQuantity))}</em></div>
        <div class="craft-plan-quantity" role="group" aria-label="Количество крафтов: ${escAttr(entry.info.ru)}"><button type="button" data-plan-quantity="-1" aria-label="Уменьшить количество" ${entry.quantity <= 1 ? "disabled" : ""}>−</button><input type="number" min="1" max="999" value="${entry.quantity}" data-plan-quantity-input aria-label="Количество крафтов: ${escAttr(entry.info.ru)}" /><button type="button" data-plan-quantity="1" aria-label="Увеличить количество" ${entry.quantity >= 999 ? "disabled" : ""}>+</button></div>
        <div class="craft-plan-target-actions"><button type="button" data-recipe="${escAttr(entry.ref)}">Рецепт</button><button type="button" data-tree="${escAttr(entry.ref)}">Дерево</button><button type="button" class="remove" data-plan-remove aria-label="Удалить из плана: ${escAttr(entry.info.ru)}">Удалить</button></div>
      </article>`;
    }).join("");
    const materialsHTML = materials.map((item) => {
      const materialKey = normalizeArtName(item.info.ru);
      const done = collected.has(materialKey);
      const art = item.info.art || item.info.remoteArt || "";
      return `<button class="craft-plan-material${done ? " collected" : ""}" type="button" data-plan-material="${escAttr(materialKey)}" aria-pressed="${done}" aria-label="${done ? "Убрать отметку" : "Отметить собранным"}: ${escAttr(item.info.ru)}, ${escAttr(craftAmount(item.count))} штук"><span class="slot">${art ? `<img src="${escAttr(releaseAsset(art))}" alt="" loading="lazy" decoding="async" />` : unavailableArt(item.info.kind || "mat")}</span><span><b>${esc(item.info.ru)}</b>${item.info.en ? `<small>в игре: ${esc(item.info.en)}</small>` : ""}<em>×${esc(craftAmount(item.count))}</em></span><i aria-hidden="true">${done ? "✓" : "○"}</i></button>`;
    }).join("");
    const stationsHTML = stations.map((station) => `<span class="craft-plan-station"><span class="slot">${station.art ? `<img src="${escAttr(releaseAsset(station.art))}" alt="" loading="lazy" decoding="async" />` : `<b aria-hidden="true">РУКИ</b>`}</span><b>${esc(station.name)}</b></span>`).join("");
    return `<section class="craft-plan panel" id="craft-plan" tabindex="-1" aria-labelledby="craft-plan-title">
      <header class="craft-plan-head"><div class="craft-plan-heading"><span aria-hidden="true">▦</span><div><small>общая смета нескольких рецептов</small><h2 id="craft-plan-title">План крафта</h2><p>Добавляй цели из визуальных рецептов. Кодекс объединит одинаковые промежуточные предметы, реальные размеры партий и базовые ресурсы.</p></div></div><div class="craft-plan-head-actions"><button type="button" data-plan-copy ${entries.length ? "" : "disabled"}>⧉ Скопировать план</button><button type="button" data-plan-clear ${entries.length ? "" : "disabled"}>Очистить</button></div></header>
      ${entries.length ? `<div class="craft-plan-stats"><span><b>${entries.length}</b><small>целей</small></span><span><b>${materials.length}</b><small>видов ресурсов</small></span><span><b>${esc(craftAmount(totalUnits))}</b><small>единиц суммарно</small></span><span><b>${stations.length}</b><small>станций</small></span></div><div class="craft-plan-targets">${targetsHTML}</div><section class="craft-plan-resources" aria-labelledby="craft-plan-resources-title"><header><div><small>единый список закупки и добычи</small><h3 id="craft-plan-resources-title">Базовые ресурсы</h3><p>Отметки сохраняются в профиле и остаются при изменении количества целей.</p></div><button type="button" data-plan-reset-materials ${collectedCount ? "" : "disabled"}>Сбросить отметки</button></header><div class="recipe-check-progress"><i style="width:${percent}%"></i></div><output aria-live="polite"><b>${collectedCount}</b> из ${materials.length} видов собрано · ${percent}%</output><div class="craft-plan-material-grid">${materialsHTML}</div></section><div class="craft-plan-stations"><small>Все станции плана</small><div>${stationsHTML || `<span class="craft-plan-no-stations">Дополнительные станции не нужны</span>`}</div></div>` : `<div class="craft-plan-empty"><span aria-hidden="true">＋</span><div><b>План пока пуст</b><p>Открой рецепт любого создаваемого предмета и нажми «Добавить в план». Можно объединить до ${CRAFT_PLAN_LIMIT} целей.</p></div><a class="btn ghost" href="#/items">Выбрать предмет</a></div>`}
    </section>`;
  }
  function refreshCraftPlan(options = {}) {
    const current = document.getElementById("craft-plan");
    if (!current) { updateCraftPlanCount(); return; }
    current.outerHTML = craftPlanHTML();
    const next = document.getElementById("craft-plan");
    bindCraftPlan(next);
    updateCraftPlanCount();
    if (options.focus) requestAnimationFrame(() => next?.focus({ preventScroll: true }));
  }
  function bindCraftPlan(section) {
    if (!section || section.dataset.bound) return;
    section.dataset.bound = "1";
    const focusTarget = (ref, selector) => requestAnimationFrame(() => {
      const card = [...section.ownerDocument.querySelectorAll(".craft-plan-target")].find((item) => item.dataset.planRef === ref);
      card?.querySelector(selector)?.focus({ preventScroll: true });
    });
    section.addEventListener("click", (event) => {
      const target = event.target.closest(".craft-plan-target");
      const ref = target?.dataset.planRef || "";
      const quantityButton = event.target.closest("[data-plan-quantity]");
      if (quantityButton && ref) {
        const currentEntry = craftPlanEntries().find((entry) => entry.ref === ref);
        const nextQuantity = (currentEntry?.quantity || 1) + Number(quantityButton.dataset.planQuantity || 0);
        setCraftPlanEntry(ref, nextQuantity);
        refreshCraftPlan();
        announce(`Количество крафтов: ${Math.min(999, Math.max(1, nextQuantity))}`);
        focusTarget(ref, `[data-plan-quantity="${quantityButton.dataset.planQuantity}"]`);
        return;
      }
      if (event.target.closest("[data-plan-remove]") && ref) {
        removeCraftPlanEntry(ref);
        refreshCraftPlan({ focus: true });
        SND.play("snap");
        announce("Цель удалена из плана крафта");
        return;
      }
      const material = event.target.closest("[data-plan-material]");
      if (material) {
        const key = material.dataset.planMaterial || "";
        const done = toggleCraftPlanMaterial(key);
        refreshCraftPlan();
        SND.play(done ? "check" : "snap");
        requestAnimationFrame(() => [...document.querySelectorAll("[data-plan-material]")].find((item) => item.dataset.planMaterial === key)?.focus({ preventScroll: true }));
        return;
      }
      if (event.target.closest("[data-plan-copy]")) {
        const entries = craftPlanEntries();
        const materials = craftPlanMaterialSummary(entries.map((entry) => ({ name: entry.ref, crafts: entry.quantity })));
        copyText(craftPlanCopyText(entries, materials, craftPlanStationSummary(entries)), "План крафта скопирован");
        return;
      }
      if (event.target.closest("[data-plan-reset-materials]")) {
        clearCraftPlanMaterials();
        refreshCraftPlan();
        announce("Отметки общего плана сброшены");
        return;
      }
      if (event.target.closest("[data-plan-clear]")) {
        clearCraftPlan();
        refreshCraftPlan({ focus: true });
        SND.play("snap");
        announce("План крафта очищен");
      }
    });
    section.addEventListener("change", (event) => {
      const input = event.target.closest("[data-plan-quantity-input]");
      const ref = input?.closest(".craft-plan-target")?.dataset.planRef || "";
      if (!input || !ref) return;
      const result = setCraftPlanEntry(ref, input.value);
      refreshCraftPlan();
      announce(`Количество крафтов: ${result.quantity}`);
      focusTarget(ref, "[data-plan-quantity-input]");
    });
  }

  function craftMaterialState(rootName) {
    const all = store.get().craftMaterials || {};
    return new Set(Array.isArray(all[normalizeArtName(rootName)]) ? all[normalizeArtName(rootName)] : []);
  }

  function toggleCraftMaterial(rootName, materialKey) {
    const all = store.get().craftMaterials || {};
    const rootKey = normalizeArtName(rootName);
    const collected = new Set(Array.isArray(all[rootKey]) ? all[rootKey] : []);
    if (collected.has(materialKey)) collected.delete(materialKey);
    else collected.add(materialKey);
    store.set({ craftMaterials: { ...all, [rootKey]: [...collected] } });
    return collected.has(materialKey);
  }

  function clearCraftMaterials(rootName) {
    const all = { ...(store.get().craftMaterials || {}) };
    delete all[normalizeArtName(rootName)];
    store.set({ craftMaterials: all });
  }

  function craftTreeInspectorHTML(name) {
    const info = ingredientInfo(name);
    const cat = info.catName ? catalogByName(info.catName) : catalogByName(name);
    const sources = cat ? (NPC_SOURCES[cat.id] || null) : null;
    const sourceHTML = sources ? npcSourceLines(sources) : "";
    const art = info.art || info.remoteArt || "";
    const artHTML = art
      ? `<img class="craft-tree-inspector-art${info.remoteArt && !info.art ? " remote" : ""}" src="${escAttr(art)}" alt="" loading="lazy" decoding="async" />`
      : `<span class="craft-tree-inspector-art-fallback" aria-hidden="true">◆</span>`;
    const where = info.obtain || "";
    const description = info.desc || (info.recipe && info.recipe.ings.length
      ? `${info.ru} — результат этой ветки из ${info.recipe.ings.length} типов ингредиентов.`
      : "");
    const hasRecipe = Boolean(info.recipe && info.recipe.ings.length);
    const recipeText = hasRecipe
      ? `${info.recipe.ings.map((item) => `${item.count ? `${item.count} × ` : ""}${ingredientInfo(item.key || item.name).ru}`).join(" + ")}${info.recipe.station ? ` · ${craftStationInline(info.recipe.station)}` : ""}`
      : `${info.compositeCraft ? "Создание комплекта" : "Получение без крафта"}: ${where || "официальный игровой источник"}`;
    const localWhere = isGenericObtainText(where)
      ? "Точный локальный источник не подтверждён. Кодекс проверяет официальную wiki ниже вместо универсальной догадки."
      : ruText(where || "Точный локальный источник не подтверждён; используется проверка официальной wiki.");
    const acquisitionSource = sourceHTML
      ? `<div class="src-list">${sourceHTML}</div>`
      : `<p>${esc(localWhere)}</p>`;
    const sourceWiki = !hasRecipe ? officialWikiProfile(info) : null;
    const wikiLiveHTML = sourceWiki
      ? `<section class="wiki-source-live" data-wiki-live><small>${esc(sourceWiki.label)} · проверяем источник…</small><p>Ищем конкретный способ получения, противника, структуру, магазин или условие появления.</p><a href="${escAttr(sourceWiki.url)}" target="_blank" rel="noopener noreferrer">Открыть официальную страницу ↗</a></section>`
      : "";
    const recipeYield = Math.max(1, Number(info.recipe?.yield || 1));
    const recipeHTML = hasRecipe
      ? `<div class="craft-chips">${info.recipe.ings.map((item) => ingChipHTML(item.key || item.name, item.count)).join("")}${stationChipHTML(info.recipe.station)}</div>${recipeYield > 1 ? `<p class="recipe-batch-note">Один крафт создаёт ×${esc(craftAmount(recipeYield))} результата; итоговые базовые ресурсы учитывают размер этой партии.</p>` : ""}`
      : `<div class="noncraft-source"><b>${info.compositeCraft ? "Несколько рецептов" : info.cycleCut ? "Базовый ресурс" : "Без крафта"}</b>${acquisitionSource}${wikiLiveHTML}${info.cycleCut ? `<p class="cycle-note">Обратное преобразование скрыто: предмет считается исходным ресурсом, поэтому ветка не требует его же для собственного получения.</p>` : ""}</div>`;
    const materials = info.recipe && info.recipe.ings.length ? craftTreeMaterialSummary(name) : [];
    const materialsText = materials.map((item) => `${craftAmount(item.count)} × ${item.info.ru}`).join("\n");
    const collectedMaterials = craftMaterialState(name);
    const collectedCount = materials.filter((item) => collectedMaterials.has(normalizeArtName(item.info.ru))).length;
    const collectedPercent = materials.length ? Math.round((collectedCount / materials.length) * 100) : 0;
    const materialsHTML = materials.length
      ? `<section class="craft-tree-materials"><div class="craft-tree-materials-head"><div><b>Итоговые ресурсы</b><small>Собрано: ${collectedCount} из ${materials.length} типов · суммарно для этой ветки</small></div><div class="craft-tree-materials-actions"><button class="tree-btn inspector-copy" type="button" data-copy-materials="${escAttr(materialsText)}">⧉ Список ресурсов</button><button class="tree-btn ghost" type="button" data-clear-materials>Сбросить отметки</button></div></div><div class="craft-material-progress"><i style="width:${collectedPercent}%"></i></div><div class="craft-tree-material-grid">${materials.map((item) => {
          const materialKey = normalizeArtName(item.info.ru);
          const collected = collectedMaterials.has(materialKey);
          const art = item.info.art || item.info.remoteArt || "";
          return `<div class="craft-tree-material${collected ? " collected" : ""}" data-material-node="${escAttr(item.name)}" role="button" tabindex="0"><span class="slot craft-tree-material-art">${art ? `<img class="${item.info.remoteArt && !item.info.art ? "remote" : ""}" src="${escAttr(art)}" alt="" loading="lazy" decoding="async" />` : `<b>◆</b>`}</span><span><b>${esc(item.info.ru)}</b><small>×${esc(craftAmount(item.count))}</small></span><button class="craft-material-check" type="button" data-material-toggle data-material-key="${escAttr(materialKey)}" aria-pressed="${collected}" aria-label="${collected ? "Убрать отметку" : "Отметить собранным"}">${collected ? "✓" : "○"}</button></div>`;
        }).join("")}</div></section>`
      : "";
    const wiki = info.vanilla
      ? `https://terraria.wiki.gg/ru/wiki/${encodeURIComponent(info.ru || info.en || name).replace(/%20/g, "_")}`
      : `https://calamitymod.wiki.gg/wiki/Special:Search?search=${encodeURIComponent(info.en || info.catName || name)}`;
    return `
      <div class="craft-tree-inspector-head">
        <span class="slot craft-tree-inspector-slot">${artHTML}</span>
        <div class="craft-tree-inspector-title">
          <small id="craft-tree-inspector-title">${esc(info.typeLabel || KIND_RU[info.kind] || (info.vanilla ? "Предмет Terraria" : "Предмет"))}</small>
          <h3>${esc(info.ru)}</h3>
          ${info.en ? `<span>оригинал: ${esc(info.en)}</span>` : ""}
        </div>
        <span class="craft-tree-inspector-badge">выбранный узел</span>
      </div>
      <nav class="craft-tree-breadcrumb" data-tree-breadcrumb aria-label="Путь ингредиента"></nav>
      ${description ? `<p class="craft-tree-inspector-desc">${esc(ruText(description))}</p>` : ""}
      ${info.semanticStats?.length ? `<div class="vanilla-semantic-stats" aria-label="Характеристики предмета">${info.semanticStats.map((stat) => `<span>${esc(stat)}</span>`).join("")}</div>` : ""}
      <div class="craft-tree-inspector-facts">
        ${hasRecipe && (sourceHTML || where) ? `<div class="fact source-fact"><span>Где</span><div class="craft-tree-inspector-where">${sourceHTML ? `<div class="src-list">${sourceHTML}</div>` : `<p>${esc(ruText(where))}</p>`}</div></div>` : ""}
        ${info.used ? `<div class="fact"><span>Зачем</span><p>${esc(ruText(info.used))}</p></div>` : ""}
        ${info.when ? `<div class="fact"><span>Когда</span><p>${esc(ruText(info.when))}</p></div>` : ""}
        ${bossRelationsHTML(info.bossLinks)}
        <div class="fact recipe-fact"><span>${hasRecipe ? "Полный рецепт" : info.compositeCraft ? "Как создать" : "Получение"}</span>${recipeHTML}</div>
      </div>
      ${materialsHTML}
      <div class="craft-tree-inspector-actions">
        <button class="tree-btn inspector-copy" type="button" data-copy-recipe="${escAttr(recipeText)}">⧉ ${hasRecipe ? "Скопировать рецепт" : info.compositeCraft ? "Скопировать создание" : "Скопировать получение"}</button>
        ${hasRecipe ? craftPlanActionButton(name, "В общий план") : ""}
        <a class="craft-catalog-link" href="${escAttr(wiki)}" target="_blank" rel="noopener noreferrer">Открыть справочную страницу ↗</a>
      </div>`;
  }

  async function copyText(value, successMessage) {
    const text = String(value || "");
    if (!text) return false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      toast(successMessage, "⧉");
      return true;
    } catch {
      toast("Не удалось скопировать", "!");
      return false;
    }
  }
  const copyCraftRecipe = (text) => {
    const value = String(text || "");
    return copyText(value, /^Получение/i.test(value) ? "Способ получения скопирован" : /^Создание/i.test(value) ? "Способ создания скопирован" : "Рецепт скопирован");
  };
  function copyCraftTreeLink(root) {
    if (!root) return;
    const params = new URLSearchParams();
    const current = new URLSearchParams((location.hash.split("?")[1] || ""));
    if (current.get("q")) params.set("q", current.get("q"));
    params.set("item", root);
    const url = new URL(location.href);
    url.hash = `/crafts?${params}`;
    copyText(url.href, "Ссылка на дерево скопирована");
  }

  function markCraftTreeNode(section, name) {
    const surface = section?.querySelector("[data-tree-surface='inline']");
    if (!surface) return;
    surface.querySelectorAll(".tnode-card.is-selected").forEach((card) => card.classList.remove("is-selected"));
    const selected = [...surface.querySelectorAll(".tnode-card[data-ing]")]
      .find((card) => normalizeArtName(card.dataset.ing || "") === normalizeArtName(name || ""));
    if (!selected) return;
    selected.classList.add("is-selected");
    // Если материал был выбран из итогового списка, автоматически раскрываем
    // все его родительские ветки, чтобы подсветка не указывала в скрытое место.
    let node = selected.closest(".tnode");
    let parentKids = node?.parentElement?.classList.contains("tkids") ? node.parentElement : null;
    while (parentKids) {
      parentKids.hidden = false;
      const owner = parentKids.parentElement;
      const toggle = owner?.querySelector(":scope > .tnode-card > .ttoggle[data-toggle]");
      if (toggle) {
        toggle.textContent = "▾";
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Свернуть рецепт");
      }
      node = owner;
      parentKids = node?.parentElement?.classList.contains("tkids") ? node.parentElement : null;
    }
  }

  function craftTreeNodePath(section, name) {
    const surface = section?.querySelector("[data-tree-surface='inline']");
    const selected = surface && [...surface.querySelectorAll(".tnode-card[data-ing]")]
      .find((card) => normalizeArtName(card.dataset.ing || "") === normalizeArtName(name || ""));
    if (!selected) return [];
    const path = [];
    let node = selected.closest(".tnode");
    while (node) {
      const card = node.querySelector(":scope > .tnode-card[data-ing]");
      if (card) path.unshift(card.dataset.ing || "");
      const parentKids = node.parentElement?.classList.contains("tkids") ? node.parentElement : null;
      node = parentKids?.parentElement?.classList.contains("tnode") ? parentKids.parentElement : null;
    }
    return path;
  }

  function renderCraftTreeInspector(section, name, scroll = false) {
    const panel = section?.querySelector("#craft-tree-inspector");
    const content = section?.querySelector("#craft-tree-inspector-content");
    if (!panel || !content) return;
    if (!name) {
      panel.hidden = true;
      content.innerHTML = "";
      delete section.dataset.inspectedNode;
      markCraftTreeNode(section, "");
      return;
    }
    section.dataset.inspectedNode = name;
    content.innerHTML = craftTreeInspectorHTML(name);
    panel.hidden = false;
    markCraftTreeNode(section, name);
    const breadcrumb = content.querySelector("[data-tree-breadcrumb]");
    const path = craftTreeNodePath(section, name);
    if (breadcrumb) breadcrumb.innerHTML = (path.length ? path : [name]).map((item, index) => `${index ? `<i aria-hidden="true">›</i>` : ""}<b>${esc(ingredientInfo(item).ru)}</b>`).join("");
    bindSprites(content);
    enrichWikiSource(content, ingredientInfo(name));
    if (scroll) requestAnimationFrame(() => panel.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }

  const TREE_ZOOM_MIN = .5;
  const TREE_ZOOM_MAX = 1.6;
  const TREE_ZOOM_STEP = .1;
  const normalizeTreeScale = (value) => Math.min(TREE_ZOOM_MAX, Math.max(TREE_ZOOM_MIN, Number(value) || 1));
  function savedTreeScale(kind) {
    return normalizeTreeScale(store.get().treeZoom?.[kind] || 1);
  }
  function saveTreeScale(kind, scale) {
    const treeZoom = store.get().treeZoom || {};
    store.set({ treeZoom: { ...treeZoom, [kind]: Number(normalizeTreeScale(scale).toFixed(2)) } });
  }
  function treeGraphNode(surface) {
    return surface?.querySelector?.(":scope > .tnode") || null;
  }
  function applyTreeGraphZoom(surface, scale, controlsRoot, labelSelector) {
    if (!surface) return;
    // The scroll viewport remains fixed. Only the generated recipe graph is
    // zoomed, so headers, modal dimensions, controls and inspector never move.
    surface.style.removeProperty("zoom");
    const normalized = normalizeTreeScale(scale);
    const graph = treeGraphNode(surface);
    if (graph) {
      graph.style.zoom = String(normalized);
      graph.style.transformOrigin = "left top";
      graph.dataset.graphScale = String(normalized);
    }
    const label = controlsRoot?.querySelector(labelSelector);
    if (label) label.textContent = `${Math.round(normalized * 100)}%`;
    controlsRoot?.querySelectorAll("button[data-tree-zoom], button[data-modal-tree-zoom]").forEach((button) => {
      const action = button.dataset.treeZoom || button.dataset.modalTreeZoom;
      button.disabled = action === "out" && normalized <= TREE_ZOOM_MIN || action === "in" && normalized >= TREE_ZOOM_MAX;
    });
  }
  function adjustTreeSurfaceZoom(surface, current, next, apply) {
    const normalizedCurrent = normalizeTreeScale(current);
    const normalizedNext = normalizeTreeScale(next);
    const centerX = surface ? surface.scrollLeft + surface.clientWidth / 2 : 0;
    const centerY = surface ? surface.scrollTop + surface.clientHeight / 2 : 0;
    apply(normalizedNext);
    if (surface && normalizedCurrent > 0) requestAnimationFrame(() => {
      const ratio = normalizedNext / normalizedCurrent;
      surface.scrollLeft = Math.max(0, centerX * ratio - surface.clientWidth / 2);
      surface.scrollTop = Math.max(0, centerY * ratio - surface.clientHeight / 2);
    });
    return normalizedNext;
  }
  function applyCraftTreeZoom(section) {
    const body = section?.querySelector("#craft-tree-inline-body");
    if (!body) return;
    const scale = normalizeTreeScale(section.dataset.treeScale || savedTreeScale("inline"));
    section.dataset.treeScale = String(scale);
    applyTreeGraphZoom(body, scale, section, "[data-tree-zoom-label]");
  }
  function adjustCraftTreeZoom(section, action) {
    const body = section?.querySelector("#craft-tree-inline-body");
    const current = normalizeTreeScale(section.dataset.treeScale || savedTreeScale("inline"));
    const requested = action === "reset" ? 1 : current + (action === "in" ? TREE_ZOOM_STEP : -TREE_ZOOM_STEP);
    const next = adjustTreeSurfaceZoom(body, current, requested, (scale) => {
      section.dataset.treeScale = String(Number(scale.toFixed(2)));
      applyTreeGraphZoom(body, scale, section, "[data-tree-zoom-label]");
    });
    saveTreeScale("inline", next);
  }

  function refreshInlineCraftTree(section) {
    if (!section) return;
    const body = section.querySelector("#craft-tree-inline-body");
    const info = craftTreeRoot ? ingredientInfo(craftTreeRoot) : null;
    if (!body) return;
    if (isTreeEntry(info)) {
      body.className = "tree-body craft-tree-inline-body drag-pan";
      body.dataset.treeSurface = "inline";
      body.innerHTML = treeNodeHTML(craftTreeRoot, 0, new Set());
      bindSprites(body);
      linkifyMobMentions(body);
    } else {
      body.className = "craft-tree-empty";
      body.removeAttribute("data-tree-surface");
      body.innerHTML = `<span class="craft-tree-empty-mark">+</span><b>Здесь появится твоя ветка</b><p>Открой выбор предмета и начни с оружия, брони, аксессуара или призывалки.</p>`;
    }
    applyCraftTreeZoom(section);
    renderCraftTreeInspector(section, isTreeEntry(info) ? craftTreeRoot : "");
    const active = section.querySelector("[data-tree-active]");
    if (active) {
      active.innerHTML = isTreeEntry(info)
        ? `<span>корень ветки</span><b>${esc(info.ru)}</b><i>${info.en ? `в игре: ${esc(info.en)}` : ""}</i>`
        : `<span>корень ветки</span><b>Предмет ещё не выбран</b><i>Нажми на плюсик справа</i>`;
    }
    const add = section.querySelector("#craft-tree-add span:last-child");
    if (add) add.textContent = isTreeEntry(info) ? "Сменить предмет" : "Выбрать предмет";
    const share = section.querySelector("[data-copy-tree-link]");
    if (share) share.disabled = !(isTreeEntry(info));
  }

  function bindCraftTreeBranch(section, pageFilter = "") {
    if (!section || section.dataset.bound) return;
    section.dataset.bound = "1";
    // Масштаб хранится отдельно от data-tree-zoom на кнопках управления:
    // иначе closest("[data-tree-zoom]") на любом дочернем клике находил саму
    // секцию и перехватывал выбор предметов, фильтры и раскрытие узлов.
    section.dataset.treeScale = section.dataset.treeScale || String(savedTreeScale("inline"));
    const picker = section.querySelector("#craft-tree-picker");
    const add = section.querySelector("#craft-tree-add");
    const search = section.querySelector("#craft-tree-picker-search");
    const grid = section.querySelector("#craft-tree-choice-grid");
    const build = section.querySelector("#craft-tree-build");
    const clear = section.querySelector("#craft-tree-clear");
    const inlineBody = section.querySelector("#craft-tree-inline-body");
    bindDragPan(inlineBody);
    inlineBody?.addEventListener("wheel", (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      adjustCraftTreeZoom(section, event.deltaY < 0 ? "in" : "out");
    }, { passive: false });
    const syncCraftUrl = (root) => {
      const params = new URLSearchParams();
      if (pageFilter) params.set("q", pageFilter);
      if (root) params.set("item", root);
      history.replaceState(null, "", `#/crafts${params.toString() ? `?${params}` : ""}`);
    };
    let choiceSearchTimer = 0;
    let pickerLoadTimer = 0;
    const setPickerLoading = (loading) => {
      if (!grid) return;
      grid.setAttribute("aria-busy", String(loading));
      section.querySelectorAll("button[data-choice-filter]").forEach((button) => { button.disabled = loading; });
      if (search) search.disabled = loading;
      if (build) build.disabled = loading;
      if (loading) {
        grid.innerHTML = `<div class="craft-tree-choice-placeholder is-loading"><span aria-hidden="true">◆</span><b>Подготавливаем индекс предметов…</b></div>`;
      }
    };
    const loadPickerChoices = () => {
      if (!grid || grid.dataset.ready || grid.dataset.loading) return;
      grid.dataset.loading = "1";
      setPickerLoading(true);
      clearTimeout(pickerLoadTimer);
      // Сначала браузер показывает открытую панель и индикатор, затем в
      // отдельной задаче строится индекс. Клик больше не выглядит зависшим.
      pickerLoadTimer = setTimeout(() => {
        craftTreeChoices();
        if (!section.isConnected) return;
        populateCraftTreePicker(section);
        delete grid.dataset.loading;
        setPickerLoading(false);
        search?.focus();
      }, 0);
    };
    const setPicker = (open) => {
      if (!picker || !add) return;
      picker.hidden = !open;
      add.setAttribute("aria-expanded", String(open));
      if (!open) return;
      // После закрытия открываем полный первый экран заново, а не оставляем
      // старый фильтр и сотни скрытых карточек в DOM.
      if (search && search.value) {
        search.value = "";
        section.dataset.choiceLimit = String(CRAFT_PICKER_PAGE_SIZE);
      }
      if (grid?.dataset.ready) {
        renderCraftChoiceWindow(section);
        requestAnimationFrame(() => search?.focus());
      } else {
        requestAnimationFrame(loadPickerChoices);
      }
    };
    if (add) add.onclick = () => setPicker(picker.hidden);
    if (picker && !picker.hidden) setPicker(true);
    if (search) search.oninput = () => {
      clearTimeout(choiceSearchTimer);
      section.dataset.choiceLimit = String(CRAFT_PICKER_PAGE_SIZE);
      choiceSearchTimer = setTimeout(() => renderCraftChoiceWindow(section, search.value), 100);
    };
    section.querySelectorAll("button[data-choice-filter]").forEach((button) => {
      button.onclick = () => {
        section.dataset.choiceSource = button.dataset.choiceFilter || "all";
        section.dataset.choiceLimit = String(CRAFT_PICKER_PAGE_SIZE);
        section.querySelectorAll("button[data-choice-filter]").forEach((other) => {
          const active = other === button;
          other.classList.toggle("active", active);
          other.setAttribute("aria-pressed", String(active));
        });
        renderCraftChoiceWindow(section, search?.value || "");
      };
    });
    if (build) build.onclick = () => {
      const chosen = section.dataset.selectedChoice || "";
      const info = chosen ? ingredientInfo(chosen) : null;
      if (!chosen || !info || !isTreeEntry(info)) {
        toast("Сначала выбери предмет из индекса Terraria или с рецептом", "+");
        return;
      }
      craftTreeRoot = chosen;
      rememberCraftRoot(chosen);
      store.set({ craftTreeRoot });
      syncCraftUrl(chosen);
      refreshInlineCraftTree(section);
      setPicker(false);
      toast(`Ветка построена: ${info.ru}`, "◆");
      SND.play("open");
    };
    if (clear) clear.onclick = () => {
      craftTreeRoot = "";
      store.set({ craftTreeRoot });
      syncCraftUrl("");
      delete section.dataset.selectedChoice;
      section.dataset.choiceLimit = String(CRAFT_PICKER_PAGE_SIZE);
      section.dataset.choiceSource = "all";
      if (search) search.value = "";
      section.querySelectorAll("[data-choice-filter]").forEach((button) => {
        const active = button.dataset.choiceFilter === "all";
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      grid?.querySelectorAll(".craft-choice-card.selected").forEach((card) => {
        card.classList.remove("selected");
        card.setAttribute("aria-pressed", "false");
      });
      const status = section.querySelector("#craft-tree-choice-status");
      if (status) status.textContent = "Нажми на карточку предмета";
      if (grid?.dataset.ready) renderCraftChoiceWindow(section);
      refreshInlineCraftTree(section);
      setPicker(true);
      toast("Ветка очищена — выбери следующий результат", "×");
    };
    section.addEventListener("click", (e) => {
      const zoom = e.target.closest("button[data-tree-zoom]");
      if (zoom) {
        adjustCraftTreeZoom(section, zoom.dataset.treeZoom || "reset");
        return;
      }
      const shareTree = e.target.closest("[data-copy-tree-link]");
      if (shareTree) {
        copyCraftTreeLink(craftTreeRoot);
        return;
      }
      const clearMaterials = e.target.closest("[data-clear-materials]");
      if (clearMaterials) {
        const root = section.dataset.inspectedNode || craftTreeRoot;
        clearCraftMaterials(root);
        renderCraftTreeInspector(section, root);
        return;
      }
      const materialToggle = e.target.closest("[data-material-toggle]");
      if (materialToggle) {
        const root = section.dataset.inspectedNode || craftTreeRoot;
        toggleCraftMaterial(root, materialToggle.dataset.materialKey || "");
        renderCraftTreeInspector(section, root);
        return;
      }
      const material = e.target.closest("[data-material-node]");
      if (material) {
        renderCraftTreeInspector(section, material.dataset.materialNode || "", true);
        return;
      }
      const copy = e.target.closest("[data-copy-recipe], [data-copy-materials]");
      if (copy) {
        copyCraftRecipe(copy.dataset.copyRecipe || copy.dataset.copyMaterials || "");
        return;
      }
      const expand = e.target.closest("[data-inline-tree-expand]");
      if (expand) { setTreeNodes(section.querySelector("[data-tree-surface='inline']"), true); return; }
      const collapse = e.target.closest("[data-inline-tree-collapse]");
      if (collapse) { setTreeNodes(section.querySelector("[data-tree-surface='inline']"), false); return; }
      const toggle = e.target.closest("[data-tree-surface='inline'] .ttoggle");
      if (toggle) { toggleTreeNode(toggle); return; }
      const card = e.target.closest("[data-tree-surface='inline'] .tnode-card[data-ing]");
      if (card && !e.target.closest("a, button, .npc-tip")) {
        renderCraftTreeInspector(section, card.dataset.ing || "", true);
        e.preventDefault();
      }
    });
    section.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "=", "-", "0"].includes(e.key)) {
        e.preventDefault();
        adjustCraftTreeZoom(section, e.key === "0" ? "reset" : e.key === "-" ? "out" : "in");
        return;
      }
      if (e.key !== "Enter" && e.key !== " ") return;
      const material = e.target.closest && e.target.closest("[data-material-node]");
      if (material && e.target === material) {
        e.preventDefault();
        renderCraftTreeInspector(section, material.dataset.materialNode || "", true);
        return;
      }
      const card = e.target.closest && e.target.closest("[data-tree-surface='inline'] .tnode-card[data-ing]");
      if (!card || e.target !== card) return;
      e.preventDefault();
      renderCraftTreeInspector(section, card.dataset.ing || "", true);
    });
    applyCraftTreeZoom(section);
    if (craftTreeRoot) {
      const rootInfo = ingredientInfo(craftTreeRoot);
      if (isTreeEntry(rootInfo)) renderCraftTreeInspector(section, craftTreeRoot);
    }
  }

  function renderItems(params) {
    fillRail("");
    buildNameIndexes();
    const mode = params.mode === "guide" ? "guide" : "catalog";
    const cls = params.cls || "all";
    const kind = params.kind || "all";
    const qid = mode === "guide" ? (params.q || "all") : "all";
    const era = mode === "catalog" && CATALOG_ERAS.some(([id]) => id === params.era) ? params.era : "all";
    const sort = mode === "catalog" && ["stage", "name", "type"].includes(params.sort) ? params.sort : "stage";
    const searchRaw = params.s || "";
    const search = searchRaw.trim().toLocaleLowerCase("ru");
    // Короче двух символов поиск не фильтрует: одна буква «а» матчила бы
    // почти каждое русское описание и «показывала не те предметы».
    const searchActive = search.length >= 2;
    const favoriteOnly = params.fav === "1";
    const favoriteItems = getFavorites().item;
    const pool = mode === "guide" ? CODEX.items : indexedItems();
    const matchesActiveFilters = (item) => {
      if (favoriteOnly && !favoriteItems.has(String(item.name))) return false;
      if (cls !== "all" && item.cls !== "all" && item.cls !== cls) return false;
      if (kind !== "all" && item.kind !== kind) return false;
      if (qid !== "all" && String(item.q) !== String(qid)) return false;
      if (era !== "all" && catalogEraOf(item.stage) !== era) return false;
      return true;
    };
    const filteredPool = pool.filter(matchesActiveFilters);
    const list = filteredPool.filter((item) => {
      if (!searchActive) return true;
      const blob = mode === "guide"
        ? `${item.name} ${item.nameRu || ""} ${item.get || ""} ${item.why || ""} ${item.rec || ""} ${item.desc || ""} ${bossRelationsFor(item).map(({ boss }) => `${boss.name} ${boss.en || ""}`).join(" ")}`
        : catalogItemSearchBlob(item);
      return matchesSearch(blob, search);
    });
    if (mode === "catalog") {
      const names = new Map(list.map((item) => [item, ruItemName(item)]));
      const byName = (left, right) => names.get(left).localeCompare(names.get(right), "ru");
      list.sort((left, right) => {
        if (sort === "name") return byName(left, right);
        if (sort === "type") {
          const kindOrder = (KIND_RU[left.kind] || left.kind).localeCompare(KIND_RU[right.kind] || right.kind, "ru");
          return kindOrder || byName(left, right);
        }
        return catalogProgressionRank(left.stage) - catalogProgressionRank(right.stage) || byName(left, right);
      });
    }
    // Точное совпадение имени всегда первым: «dubious plating» не должен
    // прятаться за 80 предметами, которые его упоминают в рецепте.
    if (searchActive) {
      const exact = new Set(list.filter((x) => String(x.name).toLocaleLowerCase("ru") === search || ruItemName(x).toLocaleLowerCase("ru") === search).map((x) => x));
      if (exact.size) list.sort((a, b) => (exact.has(b) ? 1 : 0) - (exact.has(a) ? 1 : 0));
    }
    const pageSize = mode === "catalog" ? CATALOG_PAGE_SIZE : GUIDE_PAGE_SIZE;
    const requestedLimit = Number.parseInt(params.limit, 10);
    const limit = Number.isFinite(requestedLimit) ? Math.max(pageSize, requestedLimit) : pageSize;
    const visible = list.slice(0, limit);
    const kindOptions = Object.entries(KIND_RU).filter(([id]) => pool.some((item) => item.kind === id));
    const indexCount = indexedItems().length;
    const sourceCommit = String(ITEM_INDEX.commit || "").slice(0, 7);
    const sourceDate = String(ITEM_INDEX.sourceDate || "").slice(0, 10);
    const coverage = ITEM_INDEX.coverage || {};
    const activeFilterCount = [favoriteOnly, cls !== "all", kind !== "all", mode === "catalog" && era !== "all"].filter(Boolean).length;
    const fmt = (value) => Number(value).toLocaleString("ru-RU");

    app.innerHTML = `
      <div class="page items-page">
        ${mast("Арсенал Каламити", "У каждого предмета есть изображение, источник, назначение и этап применения; отдельный режим сохраняет маршрут прохождения.")}
        <nav class="catalog-mode-switch" aria-label="Режим каталога предметов">
          <a class="catalog-mode ${mode === "catalog" ? "active" : ""}" href="#/items">
            <i aria-hidden="true">I</i>
            <span><b>Полный каталог</b><small>Изображения, получение, польза и этап для каждого предмета</small></span>
            <em>${fmt(indexCount)}</em>
          </a>
          <a class="catalog-mode ${mode === "guide" ? "active" : ""}" href="#/items?mode=guide">
            <i aria-hidden="true">II</i>
            <span><b>Маршрут прохождения</b><small>Отобранные рекомендации по главам кодекса</small></span>
            <em>${fmt(CODEX.items.length)}</em>
          </a>
        </nav>
        ${mode === "catalog" ? `
          <details class="catalog-about-shelf">
            <summary><span><i aria-hidden="true">i</i><b>Об источниках каталога</b><small>Покрытие спрайтов, описаний и рецептов</small></span><em>${fmt(indexCount)} предметов</em></summary>
            <div class="catalog-about-content">
          <section class="catalog-source">
            <span class="catalog-source-mark" aria-hidden="true">◆</span>
            <div>
              <b>Полные карточки собраны из официальных исходников</b>
              <p>${fmt(indexCount)} подтверждённых предметов: локальные игровые спрайты, русские описания, рецепты и проверяемые источники. Записи без самостоятельного официального изображения не маскируются выдуманной иллюстрацией и не включены в каталог.</p>
              <small>мод Каламити ${esc(ITEM_INDEX.modVersion || CODEX.version)} · срез ${esc(sourceDate || "2026-08-15")} · ${esc(sourceCommit || "источник")}</small>
            </div>
            <a href="https://github.com/CalamityTeam/CalamityModPublic" target="_blank" rel="noopener noreferrer">Исходные данные ↗</a>
          </section>
          <div class="catalog-stat-strip" aria-label="Покрытие полного каталога">
            <span><b>${fmt(coverage.sprites || 0)}</b><small>официальных спрайтов</small></span>
            <span><b>${fmt(coverage.russianDescriptions || 0)}</b><small>описаний на русском</small></span>
            <span><b>${fmt(coverage.recipes || 0)}</b><small>локальных рецептов</small></span>
            <span><b>${fmt(BOSS_RELATION_DATA.coverage?.catalogItems || 0)}</b><small>предметов со связями боссов</small></span>
          </div>
            </div>
          </details>
        ` : `
          <section class="catalog-source guide-source">
            <span class="catalog-source-mark" aria-hidden="true">✦</span>
            <div>
              <b>Короткий список для прохождения</b>
              <p>Здесь остаются ${fmt(CODEX.items.length)} подробные русские карточки: этап, получение, крафт и практическая польза. Это рекомендации, а не ограничение полного каталога.</p>
            </div>
            <a href="#/items">Открыть весь индекс →</a>
          </section>
        `}
        <details class="catalog-filter-shelf" ${activeFilterCount ? "open" : ""}>
          <summary><span><i aria-hidden="true">⌄</i><b>Фильтры каталога</b><small>Класс, тип${mode === "catalog" ? " и этап доступности" : " предмета"}</small></span><em>${activeFilterCount ? `${activeFilterCount} активно` : "Все предметы"}</em></summary>
          <section class="catalog-filter-stack panel" aria-label="Фильтры каталога">
          <div class="catalog-filter-row">
            <span class="catalog-filter-label"><i aria-hidden="true">I</i><b>Класс</b></span>
            <div class="chips item-class-chips">
              <button class="chip favorite-chip ${favoriteOnly ? "active" : ""}" data-p="fav" data-v="${favoriteOnly ? "all" : "1"}"><span aria-hidden="true">★</span> Избранное <em>${favoriteItems.size}</em></button>
              <button class="chip ${cls === "all" ? "active" : ""}" data-p="cls" data-v="all">Все классы</button>
              ${CODEX.classes.map((itemClass) => `<button class="chip ${cls === itemClass.id ? "active" : ""}" data-p="cls" data-v="${itemClass.id}">${itemClass.name}</button>`).join("")}
            </div>
          </div>
          <div class="catalog-filter-row">
            <span class="catalog-filter-label"><i aria-hidden="true">II</i><b>Тип</b></span>
            <div class="chips item-kind-chips">
              <button class="chip ${kind === "all" ? "active" : ""}" data-p="kind" data-v="all">Все типы <em>${fmt(pool.length)}</em></button>
              ${kindOptions.map(([id, label]) => `<button class="chip ${kind === id ? "active" : ""}" data-p="kind" data-v="${id}">${label}<em>${fmt(pool.filter((item) => item.kind === id).length)}</em></button>`).join("")}
            </div>
          </div>
          ${mode === "catalog" ? `<div class="catalog-filter-row catalog-filter-era">
            <span class="catalog-filter-label"><i aria-hidden="true">III</i><b>Этап</b></span>
            <div class="chips item-era-chips" role="group" aria-label="Этап прогрессии">
              ${CATALOG_ERAS.map(([id, label]) => `<button class="chip ${era === id ? "active" : ""}" data-p="era" data-v="${id}">${label}<em>${fmt(id === "all" ? pool.length : pool.filter((item) => catalogEraOf(item.stage) === id).length)}</em></button>`).join("")}
            </div>
          </div>` : ""}
          </section>
        </details>
        <div class="filter-bar">
          <label class="search-wrap">
            <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m20 20-4-4"/></svg>
            <input id="item-s" type="search" aria-label="Поиск предметов" placeholder="${mode === "catalog" ? "Название, механика, рецепт или источник…" : "Название или «где взять»…"}" value="${escAttr(searchRaw)}" />
            ${search ? `<button class="catalog-search-clear" type="button" id="item-search-clear" aria-label="Очистить поиск">×</button>` : ""}
          </label>
          ${mode === "catalog" ? `<button class="random-btn" type="button" id="item-random" title="Случайный предмет из каталога" aria-label="Случайный предмет">🎲</button>
          <select id="item-sort" aria-label="Сортировка предметов">
            <option value="stage" ${sort === "stage" ? "selected" : ""}>По прогрессии</option>
            <option value="name" ${sort === "name" ? "selected" : ""}>По названию</option>
            <option value="type" ${sort === "type" ? "selected" : ""}>По типу</option>
          </select>` : ""}
          ${mode === "guide" ? `<select id="item-q" aria-label="Фильтр предметов по этапу">
            <option value="all" ${qid === "all" ? "selected" : ""}>Все этапы</option>
            ${CODEX.quests.map((quest) => `<option value="${quest.id}" ${String(qid) === String(quest.id) ? "selected" : ""}>${quest.id}. ${quest.title}</option>`).join("")}
          </select>` : `<a class="official-wiki-link" href="https://calamitymod.wiki.gg/wiki/Items" target="_blank" rel="noopener noreferrer">Официальная wiki <span aria-hidden="true">↗</span></a>`}
        </div>
        <div class="catalog-found">
          <p class="found">${search && !searchActive ? "Для поиска введи минимум 2 символа" : `Найдено: <b>${fmt(list.length)}</b>${visible.length < list.length ? ` · показано ${fmt(visible.length)}` : ""}`}</p>
          <div class="card-controls">
            <button class="mini" type="button" id="cards-collapse" aria-label="Свернуть все карточки">⊟ Свернуть все</button>
            <button class="mini" type="button" id="cards-expand" aria-label="Развернуть все карточки">⊞ Развернуть все</button>
            ${search || cls !== "all" || kind !== "all" || favoriteOnly || qid !== "all" || era !== "all" || sort !== "stage" ? `<a href="${mode === "guide" ? "#/items?mode=guide" : "#/items"}">Сбросить фильтры</a>` : ""}
          </div>
        </div>
        ${visible.length
          ? `<div class="item-grid ${mode === "catalog" ? "full-catalog-grid" : "guide-item-grid"}">${mode === "catalog" ? visible.map(indexedItemCard).join("") : visible.map((item) => itemCard(item, cls, "all")).join("")}</div>
             ${visible.length < list.length ? `<div class="catalog-more"><button class="btn ghost" type="button" id="catalog-more">Показать ещё ${fmt(Math.min(pageSize, list.length - visible.length))}<small>${fmt(visible.length)} из ${fmt(list.length)}</small></button></div>` : ""}`
          : `<div class="empty-state"><span>◇</span><b>Ничего не найдено</b><p>Сбрось часть фильтров или попробуй официальное английское название.</p><a class="btn ghost" href="${mode === "guide" ? "#/items?mode=guide" : "#/items"}">Сбросить фильтры</a></div>`}
      </div>
    `;

    const build = (over = {}, replace = false) => {
      const next = { mode, cls, kind, q: qid, s: searchRaw, fav: favoriteOnly ? "1" : "all", era, sort, limit, ...over };
      const changesFilter = Object.keys(over).some((key) => ["cls", "kind", "q", "s", "fav", "era", "sort"].includes(key));
      if (changesFilter && over.limit == null) next.limit = pageSize;
      const query = new URLSearchParams();
      if (next.mode === "guide") query.set("mode", "guide");
      if (next.cls && next.cls !== "all") query.set("cls", next.cls);
      if (next.kind && next.kind !== "all") query.set("kind", next.kind);
      if (next.mode === "guide" && next.q && next.q !== "all") query.set("q", next.q);
      if (next.mode !== "guide" && next.era && next.era !== "all") query.set("era", next.era);
      if (next.s) query.set("s", next.s);
      if (next.fav === "1") query.set("fav", "1");
      if (next.mode !== "guide" && next.sort && next.sort !== "stage") query.set("sort", next.sort);
      if (next.limit > pageSize) query.set("limit", String(next.limit));
      const nextHash = "#/items" + (query.toString() ? `?${query}` : "");
      if (replace) {
        history.replaceState(null, "", nextHash);
        route();
      } else {
        location.hash = nextHash;
      }
    };
    app.querySelectorAll("[data-p]").forEach((button) => {
      button.onclick = () => build({ [button.dataset.p]: button.dataset.v });
    });
    const input = $("#item-s");
    let timer;
    let tooltipRefreshPending = false;
    const requestTooltipSearchData = () => {
      if (mode !== "catalog" || catalogTooltipsApplied || tooltipRefreshPending || input.value.trim().length < 2 || !/[a-z]/i.test(input.value)) return;
      tooltipRefreshPending = true;
      const requested = input.value;
      loadCatalogTooltips().then((changed) => {
        tooltipRefreshPending = false;
        if (!changed || document.body.dataset.view !== "items" || input.value !== requested) return;
        clearTimeout(timer);
        build({ s: input.value }, true);
      });
    };
    input.oninput = () => {
      clearTimeout(timer);
      requestTooltipSearchData();
      timer = setTimeout(() => build({ s: input.value }, true), 220);
    };
    if (searchActive) requestTooltipSearchData();
    const clearSearch = $("#item-search-clear");
    if (clearSearch) clearSearch.onclick = () => {
      build({ s: "" }, true);
      requestAnimationFrame(() => document.getElementById("item-s")?.focus());
    };
    const questSelect = $("#item-q");
    if (questSelect) questSelect.onchange = () => build({ q: questSelect.value });
    const sortSelect = $("#item-sort");
    if (sortSelect) sortSelect.onchange = () => build({ sort: sortSelect.value });
    const more = $("#catalog-more");
    if (more) more.onclick = () => build({ limit: visible.length + pageSize }, true);
    const randomBtn = $("#item-random");
    if (randomBtn) randomBtn.onclick = () => {
      if (!filteredPool.length) {
        toast("Для выбранных фильтров предметов нет", "◇");
        return;
      }
      const pick = filteredPool[Math.floor(Math.random() * filteredPool.length)];
      SND.play("pop");
      build({ s: pick.name, limit: pageSize });
    };
    const collapseAllBtn = $("#cards-collapse");
    const expandAllBtn = $("#cards-expand");
    const applyAllCards = (collapsed) => {
      const state = { ...cardStateMap() };
      app.querySelectorAll(".item-grid .card").forEach((card) => {
        applyCardState(card, collapsed);
        state[cardKeyFor(card)] = collapsed ? 1 : 0;
      });
      // Одна запись в storage вместо записи для каждой из 96 карточек.
      store.set({ cardCollapsed: state });
      requestAnimationFrame(() => {
        app.querySelectorAll(".masonry").forEach((grid) => layoutMasonry(grid));
        invalidateScrollMetrics();
      });
      SND.play(collapsed ? "close" : "open");
      toast(collapsed ? "Все карточки свёрнуты" : "Все карточки развёрнуты", collapsed ? "⊟" : "⊞");
    };
    if (collapseAllBtn) collapseAllBtn.onclick = () => applyAllCards(true);
    if (expandAllBtn) expandAllBtn.onclick = () => applyAllCards(false);
    if (mode === "guide") bindSprites(app);
  }

  const factSentence = (value) => {
    const text = String(value || "").trim();
    return text && !/[.!?]$/.test(text) ? `${text}.` : text;
  };
  function bossLocationAdvice(where) {
    const low = String(where || "").toLocaleLowerCase("ru");
    if (/данж|крепост/.test(low)) return "Расчисти коридоры, убери шипы и поставь несколько рядов платформ внутри биома.";
    if (/пустын/.test(low)) return "Не выводи босса из пустыни: вне биома он обычно ускоряется или приходит в ярость.";
    if (/джунг/.test(low)) return "Арена должна оставаться в джунглях; удобнее строить её над кронами или в большой очищенной пещере.";
    if (/океан|мор/.test(low)) return "Построй платформы над водой и сохрани границы океанского биома на всей ширине боя.";
    if (/снег|л[её]д/.test(low)) return "Не выходи из снежного биома и оставь достаточно места для горизонтальных рывков.";
    if (/ад|преиспод|кратер/.test(low)) return "Возьми защиту от огня и лавы и не покидай горячий биом во время боя.";
    if (/астрал/.test(low)) return "Расчисти заражённую поверхность и поставь длинные ряды платформ для уклонений.";
    if (/свят/.test(low)) return "Сохрани фон и блоки Святых земель вокруг арены, чтобы босс не вышел из нужного биома.";
    if (/храм/.test(low)) return "Освободи центральную комнату храма или подготовь безопасное пространство вокруг алтаря.";
    if (/поверхност|поляна|открыт|арена/.test(low)) return "Нужна ровная площадка с несколькими рядами платформ, костром, сердечным фонарём и свободным небом.";
    return "Перед призывом освободи пространство, поставь платформы и источники регенерации.";
  }
  function bossFactText(boss, field) {
    const override = boss.factOverrides?.[field];
    if (override) return override;
    const base = factSentence(ruText(boss[field] || ""));
    const previous = CODEX.bosses.find((item) => item.n === boss.n - 1);
    const next = CODEX.bosses.find((item) => item.n === boss.n + 1);
    if (field === "where") return `${base} ${bossLocationAdvice(boss.where)}`.trim();
    if (field === "when") {
      const order = [previous ? `после этапа «${previous.name}»` : "в начале боссовой прогрессии", next ? `перед этапом «${next.name}»` : "перед финальной зачисткой мира"].join(", ");
      return `Рекомендуемый этап: ${base} По порядку кодекса — ${order}.`;
    }
    if (field === "summon") return `Как начать бой: ${base} Используй призыв только в месте и времени, указанных в карточке; до активации подготовь арену и зелья.`;
    if (field === "drops") return `После победы: ${base} Не продавай новые материалы, пока не проверишь открывшиеся рецепты и следующий этап прогрессии.`;
    return base;
  }
  function miniBossFactText(mini, field) {
    const base = factSentence(ruText(mini[field] || ""));
    if (field === "where") return `${base} ${bossLocationAdvice(mini.where)}`.trim();
    if (field === "when") return `Рекомендуемый этап: ${base} Это дополнительный бой — сначала подготовь экипировку текущей главы и отдельную арену.`;
    if (field === "drops") return `После победы: ${base} Проверь новые материалы и оружие перед продажей повторных наград.`;
    return base;
  }

  const BOSS_ERA_META = {
    pre: ["Прехардмод", "I"], hard: ["Хардмод", "II"], post: ["После Луны", "III"], end: ["Финал", "IV"]
  };
  function bossProgressSnapshot(entries = [...CODEX.bosses, ...CODEX.minis], defeated = getDefeatedBosses()) {
    const mainRoute = CODEX.bosses.filter((boss) => boss.kind !== "hidden");
    const mainRemaining = mainRoute.filter((boss) => !defeated.has(String(boss.id || boss.n)));
    const mainDefeated = mainRoute.length - mainRemaining.length;
    const nextQuest = mainRemaining.length ? Math.min(...mainRemaining.map((boss) => Number(boss.q) || 999)) : null;
    let targets = nextQuest == null ? [] : mainRemaining.filter((boss) => Number(boss.q) === nextQuest);
    let extrasMode = false;
    if (!targets.length) {
      extrasMode = true;
      targets = entries.filter((boss) => (boss.kind === "hidden" || boss.kind === "mini") && !defeated.has(String(boss.id || boss.n)))
        .sort((left, right) => (Number(left.q) || 999) - (Number(right.q) || 999))
        .slice(0, 4);
    }
    const defeatedCount = entries.filter((boss) => defeated.has(String(boss.id || boss.n))).length;
    return { entries, mainRoute, mainRemaining, mainDefeated, nextQuest, targets, extrasMode, defeatedCount, total: entries.length };
  }
  function bossRoadmapHTML(entries, defeated) {
    const snapshot = bossProgressSnapshot(entries, defeated);
    const { mainRoute, mainDefeated, nextQuest, extrasMode } = snapshot;
    const targets = snapshot.targets;
    let targetEyebrow = nextQuest == null ? "основной маршрут завершён" : `ближайший этап · глава ${nextQuest}`;
    let targetTitle = targets.length > 1 ? "Выбери следующий бой" : "Следующая цель";
    let targetLead = targets.length > 1
      ? "На этом этапе доступны несколько параллельных или альтернативных боёв. Выбери подходящий своему миру и сборке."
      : "Это самая ранняя непобеждённая запись по порядку кодекса. Подготовь место боя, призыв и снаряжение главы.";
    if (extrasMode) {
      if (targets.length) {
        targetTitle = "Остались дополнительные испытания";
        targetLead = "Основной список закрыт. Ниже — ближайшие непобеждённые мини-боссы и скрытые встречи; они не блокируют обычную прогрессию.";
      } else {
        targetTitle = "Бестиарий полностью закрыт";
        targetLead = "Все основные, скрытые и мини-боссы отмечены побеждёнными. Журнал сохранён в профиле героя.";
      }
    }
    const targetCards = targets.map((boss) => {
      const id = String(boss.id || boss.n);
      const optional = boss.kind === "hidden" || boss.kind === "mini" || /необязател|опционал/i.test(`${boss.tip || ""} ${boss.when || ""}`);
      const badge = boss.kind === "hidden" ? "Скрытый босс" : boss.kind === "mini" ? "Мини-босс" : optional ? "Дополнительный бой" : `Глава ${boss.q}`;
      const art = boss.art || BOSS_ART_BY_ID[boss.id] || BOSS_ART[boss.n] || "";
      return `<article class="boss-next-card" data-boss-roadmap-id="${escAttr(id)}">
        <span class="slot boss-next-art">${art ? `<img src="${escAttr(releaseAsset(art))}" alt="" loading="lazy" decoding="async" />` : unavailableArt("boss")}</span>
        <div class="boss-next-copy"><small>${esc(badge)}</small><b>${esc(boss.name)}</b>${boss.en ? `<i>в игре: ${esc(boss.en)}</i>` : ""}<p><span>⌖ ${esc(ruText(boss.where))}</span><span>✦ ${esc(ruText(boss.summon))}</span></p></div>
        <div class="boss-next-actions">
          <a href="#/bosses?q=${encodeURIComponent(boss.name)}">Открыть карточку</a>
          ${boss.q ? `<a href="#/novice?q=${boss.q}">Подготовка · квест ${boss.q}</a>` : ""}
          <button type="button" data-boss-defeated="${escAttr(id)}" aria-label="Отметить победу над ${escAttr(boss.name)}"><span aria-hidden="true">○</span> Засчитать победу</button>
        </div>
      </article>`;
    }).join("");
    const eraProgress = Object.entries(BOSS_ERA_META).map(([id, [label, mark]]) => {
      const pool = entries.filter((boss) => boss.era === id);
      const done = pool.filter((boss) => defeated.has(String(boss.id || boss.n))).length;
      const percent = Math.round((done / Math.max(1, pool.length)) * 100);
      return `<a class="boss-era-progress-card" href="#/bosses?era=${id}" data-roadmap-era="${id}"><i aria-hidden="true">${mark}</i><span><b>${esc(label)}</b><small>${done} из ${pool.length} побед</small><em><u style="width:${percent}%"></u></em></span><strong>${percent}%</strong></a>`;
    }).join("");
    return `<section class="boss-roadmap panel" aria-labelledby="boss-roadmap-title">
      <header class="boss-roadmap-head"><div><small>${esc(targetEyebrow)}</small><h2 id="boss-roadmap-title">${esc(targetTitle)}</h2><p>${esc(targetLead)}</p></div><output><b>${mainDefeated}</b><span>/ ${mainRoute.length}</span><small>основной список</small></output></header>
      ${targetCards ? `<div class="boss-next-grid">${targetCards}</div>` : `<div class="boss-roadmap-complete"><span aria-hidden="true">✓</span><div><b>Все встречи пройдены</b><p>Можно повторять любимые бои, собирать редкие награды или экспортировать профиль в разделе «Избранное».</p></div></div>`}
      <div class="boss-era-progress" aria-label="Прогресс по эпохам">${eraProgress}</div>
    </section>`;
  }

  function renderBosses(params = {}) {
    fillRail("");
    const era = params.era || "all";
    const kind = ["all", "vanilla", "calamity", "hidden", "mini"].includes(params.kind) ? params.kind : "all";
    const status = ["all", "remaining", "defeated"].includes(params.status) ? params.status : "all";
    const search = (params.q || "").trim().toLocaleLowerCase("ru");
    const activeBossFilterCount = [era !== "all", kind !== "all", status !== "all"].filter(Boolean).length;
    const showRoadmap = era === "all" && kind === "all" && status === "all" && !search;
    const eras = [
      ["all", "Все эпохи"], ["pre", "Прехардмод"], ["hard", "Хардмод"],
      ["post", "После Луны"], ["end", "Финал и скрытые"]
    ];
    const kinds = [
      ["all", "Все", "☠"], ["vanilla", "Ваниль", "V"], ["calamity", "Каламити", "C"],
      ["hidden", "Скрытые", "?"], ["mini", "Мини-боссы", "◆"]
    ];
    const statuses = [
      ["all", "Все", "☰"], ["remaining", "Остались", "○"], ["defeated", "Побеждены", "✓"]
    ];
    const entries = [...CODEX.bosses, ...CODEX.minis];
    const defeated = getDefeatedBosses();
    const defeatedCount = entries.filter((boss) => defeated.has(String(boss.id || boss.n))).length;
    const defeatedPercent = Math.round((defeatedCount / Math.max(1, entries.length)) * 100);
    const categoryOf = (boss) => boss.kind === "mini" ? "mini" : boss.kind === "hidden" ? "hidden" : boss.type === "Ваниль" || boss.type.startsWith("Ваниль") ? "vanilla" : "calamity";
    const list = entries.filter((boss) => {
      const isDefeated = defeated.has(String(boss.id || boss.n));
      if (era !== "all" && boss.era !== era) return false;
      if (kind !== "all" && categoryOf(boss) !== kind) return false;
      if (status === "remaining" && isDefeated) return false;
      if (status === "defeated" && !isDefeated) return false;
      return !search || matchesSearch(`${boss.name} ${boss.en || ""} ${boss.type} ${ruText(boss.where)} ${ruText(boss.when)} ${ruText(boss.summon)} ${ruText(boss.drops)} ${ruText(boss.tip || "")}`, search);
    });
    const countEra = (id) => id === "all" ? entries.length : entries.filter((boss) => boss.era === id).length;
    const countKind = (id) => id === "all" ? entries.length : entries.filter((boss) => categoryOf(boss) === id).length;
    const countStatus = (id) => id === "all" ? entries.length : id === "defeated" ? defeatedCount : entries.length - defeatedCount;
    app.innerHTML = `
      <div class="page bosses-page">
        ${mast("Полный бестиарий", "Все боссы Terraria и Calamity 2.2.2: основные, событийные, скрытые и мини-боссы — отдельными одинаковыми карточками.")}
        <section class="boss-progress panel" aria-label="Прогресс побед над боссами">
          <span class="boss-progress-mark" aria-hidden="true">☠</span>
          <div class="boss-progress-copy">
            <small>журнал побед</small>
            <b>${defeatedCount === entries.length ? "Бестиарий завершён" : defeatedCount ? `Побеждено ${defeatedCount} из ${entries.length}` : "Отмечай завершённые бои"}</b>
            <div class="hpbar"><i style="width:${defeatedPercent}%"></i></div>
          </div>
          <output><b>${defeatedCount}</b><span>/ ${entries.length}</span><small>${defeatedPercent}%</small></output>
        </section>
        ${showRoadmap ? bossRoadmapHTML(entries, defeated) : ""}
        <details class="catalog-filter-shelf boss-filter-shelf" ${activeBossFilterCount ? "open" : ""}>
          <summary><span><i aria-hidden="true">⌄</i><b>Фильтры бестиария</b><small>Эпоха, категория и журнал побед</small></span><em>${activeBossFilterCount ? `${activeBossFilterCount} активно` : "Все встречи"}</em></summary>
          <section class="boss-filter-stack panel" aria-label="Фильтры бестиария">
          <div class="boss-filter-row"><span>Эпоха</span><div class="chips boss-era-chips">
            ${eras.map(([id, label]) => `<button class="chip ${era === id ? "active" : ""}" data-boss-era="${id}">${label}<em>${countEra(id)}</em></button>`).join("")}
          </div></div>
          <div class="boss-filter-row"><span>Категория</span><div class="chips boss-kind-chips">
            ${kinds.map(([id, label, mark]) => `<button class="chip ${kind === id ? "active" : ""}" data-boss-kind="${id}"><i aria-hidden="true">${mark}</i>${label}<em>${countKind(id)}</em></button>`).join("")}
          </div></div>
          <div class="boss-filter-row"><span>Прогресс</span><div class="chips boss-status-chips">
            ${statuses.map(([id, label, mark]) => `<button class="chip ${status === id ? "active" : ""}" data-boss-status="${id}"><i aria-hidden="true">${mark}</i>${label}<em>${countStatus(id)}</em></button>`).join("")}
          </div></div>
          </section>
        </details>
        <label class="search-wrap boss-search">
          <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m20 20-4-4"/></svg>
          <input id="boss-s" type="search" aria-label="Поиск боссов" placeholder="Имя, призывалка, дроп или место…" value="${escAttr(params.q || "")}" />
          ${search ? `<button type="button" id="boss-clear" class="filter-clear">Сбросить</button>` : ""}
        </label>
        <p class="found">Показано: <b>${list.length}</b> из ${entries.length}</p>
        ${list.length
          ? `<div class="item-grid" id="boss-grid">${list.map(bossCard).join("")}</div>`
          : `<div class="empty-state"><span>☠</span><b>Противник не найден</b><p>Попробуй другое имя, дроп или сбрось фильтры.</p><a class="btn ghost" href="#/bosses">Показать всех</a></div>`}
      </div>
    `;
    const build = (over = {}, replace = false) => {
      const next = { era, kind, status, q: params.q || "", ...over };
      const qs = new URLSearchParams();
      if (next.era && next.era !== "all") qs.set("era", next.era);
      if (next.kind && next.kind !== "all") qs.set("kind", next.kind);
      if (next.status && next.status !== "all") qs.set("status", next.status);
      if (next.q) qs.set("q", next.q);
      const nextHash = "#/bosses" + (qs.toString() ? `?${qs}` : "");
      if (replace) { history.replaceState(null, "", nextHash); route(); }
      else location.hash = nextHash;
    };
    app.querySelectorAll("[data-boss-era]").forEach((chip) => { chip.onclick = () => build({ era: chip.dataset.bossEra || "all" }); });
    app.querySelectorAll("[data-boss-kind]").forEach((chip) => { chip.onclick = () => build({ kind: chip.dataset.bossKind || "all" }); });
    app.querySelectorAll("[data-boss-status]").forEach((chip) => { chip.onclick = () => build({ status: chip.dataset.bossStatus || "all" }); });
    const input = document.getElementById("boss-s");
    let timer = 0;
    if (input) input.oninput = () => { clearTimeout(timer); timer = setTimeout(() => build({ q: input.value }, true), 180); };
    const clear = document.getElementById("boss-clear");
    if (clear) clear.onclick = () => build({ q: "" }, true);
    bindSprites(app);
  }

  function bossCard(b) {
    const era = ({ pre: "Прехардмод", hard: "Хардмод", post: "После Луны", end: "Финал" })[b.era] || b.era;
    const danger = b.kind === "mini"
      ? ({ pre: 30, hard: 55, post: 76, end: 90 }[b.era] || 45)
      : ({ pre: 22, hard: 46, post: 72, end: 100 }[b.era] || 30);
    const wikiUrl = `https://calamitymod.wiki.gg/wiki/Special:Search?search=${encodeURIComponent(b.en || b.name)}`;
    const favoriteKey = b.id || String(b.n);
    const defeated = getDefeatedBosses().has(String(favoriteKey));
    const number = b.kind === "mini" ? "МИНИ" : b.kind === "hidden" ? "СКР" : `#${String(b.n).padStart(2, "0")}`;
    const factText = (field) => b.kind === "mini" ? miniBossFactText(b, field) : bossFactText(b, field);
    return `<article class="card has-art boss-card ${defeated ? "is-defeated" : ""} ${b.kind === "mini" ? "mini-boss-card" : ""} ${b.kind === "hidden" ? "hidden-boss-card" : ""}" data-era="${escAttr(b.era)}" data-boss-kind="${escAttr(b.kind || "boss")}" data-boss-id="${escAttr(favoriteKey)}">
      <div class="card-shot slot boss-shot" data-kind="boss">
        ${visualArt(b.name, "boss", b.art || BOSS_ART_BY_ID[b.id] || BOSS_ART[b.n] || "")}
        ${favoriteButton("boss", favoriteKey, b.name)}
        <span class="kind-pill">${number}</span>
        <span class="tag-cls all">${esc(era)}</span>
      </div>
      <div class="card-body">
        <span class="boss-type-pill ${escAttr(b.kind || "boss")}">${esc(b.type || "Босс")}</span>
        <div class="card-title">${esc(b.name)}${b.en ? `<span class="en-sub">в игре: ${esc(b.en)}</span>` : ""}</div>
        <p class="desc">${esc(ruText(b.tip || "Подготовь арену, мобильность и подходящее этапу снаряжение."))}</p>
        <div class="danger-row"><label>Опасность <b>${danger}%</b></label><div class="hpbar"><i style="width:${danger}%"></i></div></div>
        <details class="card-facts-shelf boss-facts-shelf">
          <summary><span><b>Подготовка и награды</b><small>Место, этап, призыв и дроп</small></span><i aria-hidden="true">⌄</i></summary>
          <div class="facts">
            <div class="fact"><span>Где проходит бой</span><p>${esc(factText("where"))}</p></div>
            <div class="fact"><span>Когда идти</span><p>${esc(factText("when"))}</p></div>
            <div class="fact"><span>Как начать бой</span><p>${esc(factText("summon"))}</p></div>
            <div class="fact"><span>Что даст победа</span><p>${esc(factText("drops"))}</p></div>
          </div>
        </details>
        <div class="card-links boss-card-links">
          <button id="boss-state-${escAttr(favoriteKey)}" class="boss-defeat-btn ${defeated ? "done" : ""}" type="button" data-boss-defeated="${escAttr(favoriteKey)}" aria-pressed="${defeated}" aria-label="${defeated ? "Снять отметку о победе над" : "Отметить победу над"} ${escAttr(b.name)}"><span aria-hidden="true">${defeated ? "✓" : "○"}</span>${defeated ? "Победа записана" : "Отметить победу"}</button>
          <a href="${escAttr(wikiUrl)}" target="_blank" rel="noopener noreferrer">Тактика и дроп на wiki ↗</a>
          ${b.q ? `<a class="catalog-guide-link" href="#/novice?q=${b.q}">Открыть квест ${b.q} →</a>` : ""}
        </div>
      </div>
    </article>`;
  }

  const USEFUL_TIER_LABELS = {
    start: "Старт", pre: "Прехардмод", hard: "Хардмод", post: "После Луны", end: "Финал"
  };
  const USEFUL_PRIORITY_LABELS = {
    must: "Бери обязательно", high: "Сильно помогает", situational: "Для конкретной задачи"
  };
  const USEFUL_TIER_ADVICE = {
    start: "Постарайся получить в первые игровые дни: польза начинается сразу и сохраняется надолго.",
    pre: "Собери до Стены плоти, чтобы подготовка базы, арен и ресурсов не тормозила дальнейшее прохождение.",
    hard: "Ищи в хардмоде сразу после открытия указанного источника — на этом этапе сложность и объём фарма резко растут.",
    post: "Добавь в постоянный набор после Лунного лорда: поздние биомы и боссы уже рассчитаны на такую утилиту.",
    end: "Финальное улучшение: дорогое, но заметно упрощает повторный фарм, скрытых боссов и Натиск боссов."
  };
  function usefulEntries() {
    return (USEFUL_DATA.items || []).map(([ref, group, tier, priority, title, why, use]) => ({ ref, group, tier, priority, title, why, use, source: USEFUL_DATA.sources?.[ref] || "" }));
  }
  function usefulCard(item) {
    const info = ingredientInfo(item.ref);
    const art = info.art || info.remoteArt || "";
    const original = info.en || (info.catName && info.catName !== item.title ? info.catName : "");
    const visualRecipe = visualRecipeFor(item.ref);
    const description = String(info.desc || "").trim();
    const obtainRaw = String(item.source || info.obtain || "").trim();
    const obtain = visualRecipe?.ings?.length
      ? `Предмет создаётся из ${visualRecipe.ings.length} ${visualRecipe.ings.length === 1 ? "ингредиента" : "видов ингредиентов"}. Нажми отдельную кнопку «Рецепт»: она покажет настоящие изображения, точные количества и рабочую станцию.`
      : obtainRaw.length >= 70
        ? obtainRaw
        : `${obtainRaw}${obtainRaw && !/[.!?]$/.test(obtainRaw) ? "." : ""}${obtainRaw ? " " : ""}Открой полную карточку ниже: там показаны точный источник и условия получения.`;
    const timing = `${USEFUL_TIER_ADVICE[item.tier] || "Бери сразу после открытия источника."} ${String(info.when || "").trim()}`.trim();
    const catalogUrl = info.catName
      ? `#/items?s=${encodeURIComponent(info.catName)}`
      : info.vanilla
        ? `https://terraria.wiki.gg/ru/wiki/${encodeURIComponent(info.ru || item.title).replace(/%20/g, "_")}`
        : `#/items?mode=guide&s=${encodeURIComponent(info.name || item.title)}`;
    const external = Boolean(info.vanilla);
    return `<article class="useful-card panel" data-useful-tier="${escAttr(item.tier)}" data-useful-priority="${escAttr(item.priority)}">
      <div class="useful-card-head">
        <span class="slot useful-card-art">${art ? `<img src="${escAttr(releaseAsset(art))}" alt="" loading="lazy" decoding="async" />` : unavailableArt(info.kind || "misc")}</span>
        <div class="useful-card-title">
          <span class="useful-tier ${escAttr(item.tier)}">${esc(USEFUL_TIER_LABELS[item.tier] || item.tier)}</span>
          <h3>${esc(item.title)}</h3>
          ${original ? `<small>в игре: ${esc(original)}</small>` : ""}
        </div>
        <span class="useful-priority ${escAttr(item.priority)}">${esc(USEFUL_PRIORITY_LABELS[item.priority] || "Полезно")}</span>
      </div>
      ${description ? `<p class="useful-card-description">${esc(description)}</p>` : ""}
      <details class="card-facts-shelf useful-facts-shelf">
        <summary><span><b>Как получить и использовать</b><small>Четыре практических ответа</small></span><i aria-hidden="true">⌄</i></summary>
        <div class="useful-card-body">
          <div class="useful-detail useful-reason"><b>Почему полезно</b><p>${esc(item.why)}</p></div>
          <div class="useful-detail useful-timing"><b>Когда брать</b><p>${esc(timing)}</p></div>
          <div class="useful-detail useful-obtain"><b>Где взять</b><p>${esc(obtain)}</p></div>
          <div class="useful-detail useful-advice"><b>Как применять</b><p>${esc(item.use)}</p></div>
        </div>
      </details>
      <div class="useful-card-actions">
        ${visualRecipe ? `${info.recipe ? fullTreeLink(item.ref) : ""}<button class="recipe-btn" type="button" data-recipe="${escAttr(item.ref)}"><span aria-hidden="true">⚒</span> Рецепт</button>${craftPlanActionButton(item.ref)}` : `<button class="obtain-btn" type="button" data-item-details="${escAttr(item.ref)}"><span aria-hidden="true">⌖</span> Получение</button>`}
        <a href="${escAttr(catalogUrl)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${external ? "Terraria Wiki ↗" : "Полная карточка →"}</a>
      </div>
    </article>`;
  }
  function renderUseful(params = {}) {
    fillRail("");
    const groups = (USEFUL_DATA.groups || []).map(([id, name, mark, lead]) => ({ id, name, mark, lead }));
    const requested = groups.some((group) => group.id === params.type) ? params.type : "all";
    const entries = usefulEntries();
    const counts = new Map(groups.map((group) => [group.id, entries.filter((item) => item.group === group.id).length]));
    const visibleGroups = requested === "all" ? groups : groups.filter((group) => group.id === requested);
    app.innerHTML = `
      <div class="page useful-page">
        ${mast("Полезное", "Не коллекция ради количества, а практический набор: станции, фарм, хранение, мобильность, защита и постоянные усиления, которые действительно экономят время и упрощают прохождение.")}
        <section class="useful-intro panel" aria-label="Как пользоваться разделом">
          <span class="slot useful-intro-art"><img src="${releaseAsset("assets/vanilla-sprites/1923.png")}" alt="" width="48" height="48" /></span>
          <div><small>набор исследователя</small><h2>Практический набор: ${entries.length} предмет</h2><p>Сначала собери основные станции и мобильность, затем автоматизируй хранение и фарм. Постоянные улучшения используй сразу — хранить их в сундуке бессмысленно.</p></div>
          <dl><div><dt>${entries.filter((item) => item.priority === "must").length}</dt><dd>приоритетных</dd></div><div><dt>${groups.length}</dt><dd>категорий</dd></div></dl>
        </section>
        <nav class="useful-category-nav panel" aria-label="Категории полезных предметов">
          <a class="${requested === "all" ? "active" : ""}" href="#/useful"${requested === "all" ? ' aria-current="page"' : ""}><i aria-hidden="true">✚</i><span><b>Весь набор</b><small>Все категории</small></span><em>${entries.length}</em></a>
          ${groups.map((group) => `<a class="${requested === group.id ? "active" : ""}" href="#/useful?type=${group.id}"${requested === group.id ? ' aria-current="page"' : ""}><i aria-hidden="true">${group.mark}</i><span><b>${esc(group.name)}</b><small>${esc(group.lead)}</small></span><em>${counts.get(group.id)}</em></a>`).join("")}
        </nav>
        <div class="useful-legend" aria-label="Обозначения приоритета">
          <span class="must">● Бери обязательно</span><span class="high">● Сильно помогает</span><span class="situational">● Для конкретной задачи</span>
        </div>
        ${visibleGroups.map((group) => {
          const items = entries.filter((item) => item.group === group.id);
          return `<section class="useful-group" id="useful-${group.id}" aria-labelledby="useful-title-${group.id}">
            <header class="useful-group-head"><i aria-hidden="true">${group.mark}</i><div><small>практический набор · ${items.length}</small><h2 id="useful-title-${group.id}">${esc(group.name)}</h2><p>${esc(group.lead)}</p></div></header>
            <div class="useful-grid">${items.map(usefulCard).join("")}</div>
          </section>`;
        }).join("")}
      </div>`;
    bindSprites(app);
  }

  function renderFavorites() {
    fillRail("");
    const favorites = getFavorites();
    const items = CODEX.items.filter((item) => favorites.item.has(String(item.name)));
    const detailedKeys = new Set(items.map((item) => String(item.name)));
    const indexedFavorites = indexedItems().filter((item) => favorites.item.has(String(item.name)) && !detailedKeys.has(String(item.name)));
    const bosses = [...CODEX.bosses, ...CODEX.minis].filter((boss) => favorites.boss.has(String(boss.id || boss.n)));
    const craftMap = new Map();
    [...CODEX.crafts, ...CODEX.quests.flatMap((quest) => quest.crafts || [])].forEach((craft) => {
      const key = String(craft.t || craft.name || "");
      if (key && !craftMap.has(key)) craftMap.set(key, craft);
    });
    const crafts = [...craftMap.entries()].filter(([key]) => favorites.craft.has(key)).map(([, craft]) => craft);
    const itemTotal = items.length + indexedFavorites.length;
    const total = itemTotal + bosses.length + crafts.length;
    app.innerHTML = `
      <div class="page favorites-page">
        ${mast("Рюкзак героя", "Личная подборка предметов, противников и рецептов. Нажми на звезду ещё раз, чтобы убрать запись.")}
        <div class="favorite-summary" aria-label="Сводка избранного">
          <a href="#/items?fav=1"><span>◆</span><span><b>${itemTotal}</b><small>предметов</small></span></a>
          <a href="#/bosses"><span>☠</span><span><b>${bosses.length}</b><small>боссов</small></span></a>
          <a href="#/crafts"><span>⚒</span><span><b>${crafts.length}</b><small>рецептов</small></span></a>
        </div>
        <section class="hero-save panel" aria-labelledby="hero-save-title">
          <div class="hero-save-copy"><span aria-hidden="true">▣</span><div><small>локальное сохранение</small><b id="hero-save-title">Профиль героя</b><p>Перенеси квесты, победы над боссами, класс, избранное, план крафта и историю деревьев в другой браузер или сохрани резервную копию.</p></div></div>
          <div class="hero-save-actions">
            <button class="btn ghost" type="button" id="hero-export">↓ Экспорт</button>
            <button class="btn ghost" type="button" id="hero-import">↑ Импорт</button>
            <button class="btn ghost danger" type="button" id="hero-reset">Сбросить</button>
            <input id="hero-import-file" type="file" accept="application/json,.json" hidden />
          </div>
        </section>
        ${total ? `
          ${items.length ? shelf("Предметы с рекомендациями", items.length, `<div class="item-grid">${items.map((item) => itemCard(item, "all", "all")).join("")}</div>`, true) : ""}
          ${indexedFavorites.length ? shelf("Предметы из полного индекса", indexedFavorites.length, `<div class="item-grid full-catalog-grid">${indexedFavorites.map(indexedItemCard).join("")}</div>`, true) : ""}
          ${bosses.length ? shelf("Боссы", bosses.length, `<div class="item-grid">${bosses.map(bossCard).join("")}</div>`, true) : ""}
          ${crafts.length ? shelf("Крафты", crafts.length, `<div class="craft-grid">${crafts.map(craftCard).join("")}</div>`, true) : ""}
          <div class="favorites-more"><span>Нужно добавить ещё?</span><a href="#/items">Предметы</a><a href="#/bosses">Боссы</a><a href="#/crafts">Крафты</a></div>
        ` : `<div class="empty-state favorites-empty"><span>☆</span><b>Рюкзак пока пуст</b><p>Отмечай звёздочкой предметы, боссов и рецепты — они появятся здесь и сохранятся в браузере.</p><a class="btn" href="#/items">Выбрать первый предмет</a></div>`}
      </div>
    `;
    bindSprites(app);
    const exportButton = $("#hero-export");
    const importButton = $("#hero-import");
    const importFile = $("#hero-import-file");
    const resetButton = $("#hero-reset");
    if (exportButton) exportButton.onclick = () => {
      const payload = JSON.stringify({ app: "calamity-codex", format: 1, exportedAt: new Date().toISOString(), data: store.get() }, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = href;
      link.download = `calamity-codex-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(href), 0);
      toast("Профиль героя экспортирован", "↓");
    };
    if (importButton && importFile) importButton.onclick = () => importFile.click();
    if (importFile) importFile.onchange = async () => {
      const file = importFile.files?.[0];
      if (!file) return;
      try {
        if (file.size > 1024 * 1024) throw new Error("Слишком большой файл");
        const payload = JSON.parse(await file.text());
        const data = payload?.app === "calamity-codex" ? payload.data : payload;
        if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Неверный формат");
        store.replace(data);
        favoriteCache = null;
        defeatedBossCache = null;
        craftTreeRoot = String(data.craftTreeRoot || "");
        syncRevengeanceUI(Boolean(data.revengeance));
        route();
        toast("Профиль героя восстановлен", "↑");
      } catch {
        toast("Не удалось прочитать сохранение", "!");
      } finally {
        importFile.value = "";
      }
    };
    if (resetButton) resetButton.onclick = () => {
      if (!confirm("Сбросить квесты, избранное, план крафта и настройки этого кодекса?")) return;
      store.replace({});
      favoriteCache = null;
      defeatedBossCache = null;
      craftTreeRoot = "";
      syncRevengeanceUI(false);
      route();
      toast("Профиль героя очищен", "×");
    };
  }

  function renderCrafts(filter, requestedRoot = "", focusPlan = false) {
    const requestedInfo = requestedRoot ? ingredientInfo(requestedRoot) : null;
    if (requestedRoot) {
      if (isTreeEntry(requestedInfo)) {
        craftTreeRoot = requestedRoot;
        rememberCraftRoot(requestedRoot);
        store.set({ craftTreeRoot });
      } else {
        craftTreeRoot = "";
      }
    }
    const q = (filter || "").trim().toLocaleLowerCase("ru");
    const seen = new Set();
    const list = CODEX.crafts.filter((c) => {
      const key = String(c.name || "").toLocaleLowerCase("ru");
      if (seen.has(key)) return false;
      seen.add(key);
      const bossNames = bossRelationsFor(c).map(({ boss }) => `${boss.name} ${boss.en || ""}`).join(" ");
      const blob = `${c.name} ${ruItemName(c.name)} ${ruText(c.ings)} ${c.why} ${c.stage} ${c.station || ""} ${bossNames}`;
      const ru = ruItemName(c.name) || c.name;
      return !q || matchesSearch(`${blob} ${ru}`, q);
    });
    const groups = [];
    const map = {};
    list.forEach((c) => {
      const stage = c.stage || "Прочее";
      if (!map[stage]) { map[stage] = []; groups.push(stage); }
      map[stage].push(c);
    });
    const recipeCount = getRecipeIndex().size;
    const cycleCutCount = recipeCycleCuts.size + VANILLA_RECIPE_CUT_IDS.size;
    const planTargetCount = craftPlanRows().length;
    fillRail("");
    app.innerHTML = `
      <div class="page craft-graph-page">
        ${mast("Полное дерево крафта", "Главный инструмент кодекса: выбери любой результат и раскрой все зависимости до базовых ресурсов, точных партий и рабочих станций.")}
        <details class="catalog-about-shelf craft-about-shelf">
          <summary><span><i aria-hidden="true">i</i><b>О базе дерева</b><small>Покрытие рецептов и защита от циклов</small></span><em>${recipeCount.toLocaleString("ru-RU")} рецептов</em></summary>
          <div class="catalog-about-content"><div class="craft-graph-stats" aria-label="Статистика дерева рецептов">
            <span><b>${recipeCount.toLocaleString("ru-RU")}</b><small>рецептов в дереве</small></span>
            <span><b>${VANILLA_TREE_INDEX.items.length.toLocaleString("ru-RU")}</b><small>предметов Terraria</small></span>
            <span><b>${CODEX.crafts.length}</b><small>рекомендаций маршрута</small></span>
            <span><b>${cycleCutCount}</b><small>циклических рецептов скрыто</small></span>
          </div></div>
        </details>
        ${craftTreeBranchHTML(craftTreeRoot)}
        <details class="secondary-shelf craft-plan-shelf" ${focusPlan ? "open" : ""}>
          <summary><span><i aria-hidden="true">＋</i><b>Общий план крафта</b><small>Несколько целей и объединённая смета</small></span><em>${planTargetCount ? `${planTargetCount} целей` : "Пусто"}</em></summary>
          <div class="secondary-shelf-body">${craftPlanHTML()}</div>
        </details>
        <details class="secondary-shelf craft-recommendations-shelf" ${q ? "open" : ""}>
          <summary><span><i aria-hidden="true">☰</i><b>Рекомендации по этапам</b><small>Дополнительный справочник готовых результатов</small></span><em>${list.length}</em></summary>
          <div class="secondary-shelf-body"><section class="craft-index-panel panel" aria-labelledby="craft-index-title">
          <div class="craft-index-head">
            <div>
              <small>справочник результатов</small>
              <h2 id="craft-index-title">Все рекомендации по этапам</h2>
              <p>Кнопка «Дерево крафта» на карточке открывает тот же граф с выбранным результатом.</p>
            </div>
            <label class="search-wrap craft-index-search">
              <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m20 20-4-4"/></svg>
              <input id="craft-filter" type="search" aria-label="Поиск рецептов" placeholder="Название, материал, этап…" value="${escAttr(filter || "")}" />
            </label>
          </div>
          <div class="craft-index-results">
            ${groups.length
              ? groups.map((stage, i) => shelf(esc(stage), map[stage].length, `<div class="craft-grid">${map[stage].map((c) => craftCard(c)).join("")}</div>`, i === 0 || !!q)).join("")
              : `<div class="empty-state"><span>⚒</span><b>Рецепт не найден</b><p>Проверь название или попробуй поискать ингредиент.</p><a class="btn ghost" href="#/crafts">Показать все рецепты</a></div>`}
          </div>
        </section></div>
        </details>
      </div>
    `;
    const plan = app.querySelector("#craft-plan");
    bindCraftPlan(plan);
    updateCraftPlanCount();
    const branch = app.querySelector("#craft-tree-branch");
    if (branch) bindCraftTreeBranch(branch, filter);
    if (requestedRoot && branch && !focusPlan) requestAnimationFrame(() => {
      branch.scrollIntoView({ block: "start", behavior: "smooth" });
      branch.focus({ preventScroll: true });
    });
    if (focusPlan && plan) requestAnimationFrame(() => {
      plan.scrollIntoView({ block: "start", behavior: "smooth" });
      plan.focus({ preventScroll: true });
    });
    const inp = $("#craft-filter");
    let t;
    if (inp) inp.oninput = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const params = new URLSearchParams();
        if (inp.value) params.set("q", inp.value);
        if (craftTreeRoot) params.set("item", craftTreeRoot);
        history.replaceState(null, "", `#/crafts${params.toString() ? `?${params}` : ""}`);
        route();
      }, 200);
    };
  }

  const biomeModal = document.getElementById("biome-modal");
  const biomeModalPanel = biomeModal?.querySelector(".biome-modal-panel");
  const biomeModalImage = document.getElementById("biome-modal-image");
  const biomeModalTitle = document.getElementById("biome-modal-title");
  const biomeModalSub = document.getElementById("biome-modal-sub");
  const biomeModalDesc = document.getElementById("biome-modal-desc");
  const biomeModalDanger = document.getElementById("biome-modal-danger");
  const biomeModalCount = document.getElementById("biome-modal-count");
  const biomeModalPrev = document.getElementById("biome-modal-prev");
  const biomeModalNext = document.getElementById("biome-modal-next");
  let biomeViewerNames = [];
  let biomeViewerIndex = 0;
  let biomeViewerPreviousFocus = null;

  function renderBiomeViewer() {
    const name = biomeViewerNames[biomeViewerIndex];
    const biome = CODEX.biomes.find((entry) => entry.name === name);
    if (!biome) return;
    if (biomeModalImage) {
      biomeModalImage.src = biome.img || "assets/hero.webp";
      biomeModalImage.alt = `Иллюстрация биома: ${biome.name}`;
      biomeModalImage.style.filter = biome.filter || "none";
    }
    if (biomeModalTitle) biomeModalTitle.textContent = biome.name;
    if (biomeModalSub) biomeModalSub.textContent = biome.en ? `в игре: ${biome.en}` : "";
    if (biomeModalDesc) biomeModalDesc.textContent = [biome.desc, biome.where ? `Где: ${biome.where}` : ""].filter(Boolean).join(" ");
    if (biomeModalDanger) {
      biomeModalDanger.className = `danger-pill ${biome.dangerLvl || "low"}`;
      biomeModalDanger.textContent = biome.danger || "";
    }
    if (biomeModalCount) biomeModalCount.textContent = `${biomeViewerIndex + 1} / ${biomeViewerNames.length}`;
    const single = biomeViewerNames.length < 2;
    if (biomeModalPrev) biomeModalPrev.disabled = single;
    if (biomeModalNext) biomeModalNext.disabled = single;
  }
  function openBiomeViewer(name, names) {
    if (!biomeModal) return;
    biomeViewerNames = [...new Set((names || CODEX.biomes.map((biome) => biome.name)).filter(Boolean))];
    biomeViewerIndex = Math.max(0, biomeViewerNames.indexOf(name));
    biomeViewerPreviousFocus = document.activeElement;
    renderBiomeViewer();
    biomeModal.hidden = false;
    document.body.classList.add("biome-open");
    setElementInert(shellEl, true);
    setElementInert(mobileTabs, true);
    setElementInert(toTop, true);
    document.getElementById("biome-modal-close")?.focus();
  }
  function closeBiomeViewer(options = {}) {
    if (!biomeModal) return;
    const { restoreFocus = true } = options;
    const wasOpen = !biomeModal.hidden;
    biomeModal.hidden = true;
    document.body.classList.remove("biome-open");
    setElementInert(shellEl, false);
    setElementInert(mobileTabs, false);
    setElementInert(toTop, false);
    const restore = biomeViewerPreviousFocus;
    biomeViewerPreviousFocus = null;
    if (restoreFocus && wasOpen && restore) requestAnimationFrame(() => restore.focus?.({ preventScroll: true }));
  }
  function moveBiomeViewer(offset) {
    if (biomeViewerNames.length < 2) return;
    biomeViewerIndex = (biomeViewerIndex + offset + biomeViewerNames.length) % biomeViewerNames.length;
    renderBiomeViewer();
  }
  if (biomeModal) {
    biomeModal.addEventListener("click", (event) => {
      if (event.target.closest("[data-biome-close]")) closeBiomeViewer();
    });
    biomeModal.addEventListener("keydown", (event) => {
      if (event.key === "Tab") trapFocus(event, biomeModalPanel);
      else if (event.key === "ArrowLeft") { event.preventDefault(); moveBiomeViewer(-1); }
      else if (event.key === "ArrowRight") { event.preventDefault(); moveBiomeViewer(1); }
    });
    if (biomeModalPrev) biomeModalPrev.onclick = () => moveBiomeViewer(-1);
    if (biomeModalNext) biomeModalNext.onclick = () => moveBiomeViewer(1);
  }

  function renderBiomes(params = {}) {
    fillRail("");
    const levels = [
      ["all", "Все", "⌖"],
      ["low", "Низкая", "I"],
      ["mid", "Средняя", "II"],
      ["high", "Высокая", "III"],
      ["dead", "Смертельная", "☠"]
    ];
    const danger = levels.some(([id]) => id === params.danger) ? params.danger : "all";
    const list = CODEX.biomes.filter((biome) => danger === "all" || biome.dangerLvl === danger);
    const countFor = (level) => level === "all"
      ? CODEX.biomes.length
      : CODEX.biomes.filter((biome) => biome.dangerLvl === level).length;
    app.innerHTML = `
      <div class="page biomes-page">
        ${mast("Биомы", "Где это в мире, когда туда идти, что брать с собой и что унести.")}
        <section class="biome-controls panel" aria-label="Фильтр биомов по опасности">
          <div class="chips biome-danger-chips" role="group" aria-label="Уровень опасности">
            ${levels.map(([id, label, mark]) => `<button class="chip ${danger === id ? "active" : ""}" type="button" data-biome-danger="${id}"><span aria-hidden="true">${mark}</span>${label}<em>${countFor(id)}</em></button>`).join("")}
          </div>
        </section>
        <p class="found biome-found">Показано: <b>${list.length}</b> из ${CODEX.biomes.length}${danger !== "all" ? ` · опасность: ${esc(levels.find(([id]) => id === danger)?.[1] || danger)}` : ""}</p>
        <div class="biome-grid">${list.map((biome) => biomeCard(biome)).join("")}</div>
      </div>
    `;
    const build = (nextDanger) => {
      const query = new URLSearchParams();
      if (nextDanger && nextDanger !== "all") query.set("danger", nextDanger);
      location.hash = "#/biomes" + (query.toString() ? `?${query}` : "");
    };
    app.querySelectorAll("[data-biome-danger]").forEach((button) => {
      button.onclick = () => build(button.dataset.biomeDanger || "all");
    });
    const viewerNames = list.map((biome) => biome.name);
    app.querySelectorAll("[data-biome-view]").forEach((button) => {
      button.onclick = () => openBiomeViewer(button.dataset.biomeView || "", viewerNames);
    });
    bindLazyBackgrounds(app);
  }

  let globalCatalogSearchRows = null;
  let globalVanillaSearchRows = null;
  function queueBackgroundTask(task) {
    if (globalThis.scheduler?.postTask) {
      globalThis.scheduler.postTask(task, { priority: "background" }).catch(() => setTimeout(task, 32));
    } else if (typeof requestIdleCallback === "function") {
      requestIdleCallback(task, { timeout: 1200 });
    } else {
      setTimeout(task, 32);
    }
  }
  function scheduleGlobalSearchWarmup() {
    if (searchWarmupScheduled || !catalogDataReady()) return;
    searchWarmupScheduled = true;
    document.documentElement.dataset.searchIndex = "warming";
    // Two background tasks avoid combining both 2500 Calamity records and
    // 5000 Terraria names into one long main-thread task.
    queueBackgroundTask(() => {
      catalogSearchRows();
      queueBackgroundTask(() => {
        vanillaSearchRows();
        document.documentElement.dataset.searchIndex = "ready";
      });
    });
  }
  function vanillaSearchRows() {
    if (globalVanillaSearchRows) return globalVanillaSearchRows;
    ensureVanillaItems();
    globalVanillaSearchRows = [...VANILLA_BY_ID.values()]
      .filter((item) => !isInternalVanillaName(item.name) && VANILLA_RU_BY_ID[String(item.id)])
      .map((item) => {
        const title = ruItemName(item.name, item);
        return {
          item,
          title,
          blob: `${title} ${item.name} ${vanillaTypeName(item.type)}`.toLocaleLowerCase("ru")
        };
      });
    return globalVanillaSearchRows;
  }
  function catalogSearchRows() {
    if (globalCatalogSearchRows) return globalCatalogSearchRows;
    buildNameIndexes();
    globalCatalogSearchRows = indexedItems().map((item) => {
      const title = ruItemName(item);
      return {
        item,
        title,
        key: String(item.name).toLocaleLowerCase("ru"),
        localizedKey: title.toLocaleLowerCase("ru"),
        blob: catalogItemSearchBlob(item)
      };
    });
    return globalCatalogSearchRows;
  }

  function recentSearchHits() {
    const rows = store.get().searchRecent;
    if (!Array.isArray(rows)) return [];
    return rows.filter((row) => row && /^#\//.test(String(row.href || "")) && String(row.title || "").trim()).slice(0, 6).map((row) => ({
      href: String(row.href),
      title: String(row.title).slice(0, 120),
      sub: String(row.sub || "").slice(0, 180),
      type: String(row.type || "Недавнее").slice(0, 40),
      mark: String(row.mark || "◆").slice(0, 3),
      art: /^assets\//.test(String(row.art || "")) ? String(row.art) : ""
    }));
  }
  function rememberSearchHit(hit) {
    if (!hit || !/^#\//.test(String(hit.href || ""))) return;
    const row = {
      href: String(hit.href), title: String(hit.title || "").slice(0, 120), sub: String(hit.sub || "").slice(0, 180),
      type: String(hit.type || "Результат").slice(0, 40), mark: String(hit.mark || "◆").slice(0, 3),
      art: /^assets\//.test(String(hit.art || "")) ? String(hit.art) : ""
    };
    store.set({ searchRecent: [row, ...recentSearchHits().filter((item) => item.href !== row.href)].slice(0, 6) });
  }
  function markSearchMatch(value, query) {
    const text = String(value || "");
    if (!query) return esc(text);
    const index = text.toLocaleLowerCase("ru").indexOf(query);
    if (index === -1) return esc(text);
    return `${esc(text.slice(0, index))}<mark>${esc(text.slice(index, index + query.length))}</mark>${esc(text.slice(index + query.length))}`;
  }
  function globalSearchLinkHTML(hit, className = "search-hit", remember = false, query = "") {
    return `<a class="${className}" href="${escAttr(hit.href)}"${remember ? " data-search-result" : ""}>
      <span class="search-hit-art slot">${hit.art ? `<img src="${escAttr(hit.art)}" alt="" loading="lazy" decoding="async" />` : `<b>${esc(hit.mark || "◆")}</b>`}</span>
      <span><b>${markSearchMatch(hit.title, query)}</b><small>${markSearchMatch(hit.sub || "", query)}</small></span>
      ${className === "search-hit" ? `<span class="search-hit-type">${esc(hit.type || "")}</span>` : ""}
    </a>`;
  }
  function showSearchStart(hint = "") {
    const recent = recentSearchHits();
    const progress = updateJourneyProgress();
    const quick = [
      { href: `#/novice?q=${progress.current?.id || 1}`, title: `Продолжить квест ${progress.current?.id || 1}`, sub: progress.current?.title || "Путь новичка", mark: "▶", art: "assets/sprites/Wooden_Sword.png" },
      { href: "#/items", title: "Все предметы", sub: "Полный каталог Каламити", mark: "◆", art: "assets/sprites/StarterBag.png" },
      { href: "#/useful", title: "Полезные предметы", sub: "Станции, фарм, мобильность и усиления", mark: "✚", art: "assets/vanilla-sprites/1923.png" },
      { href: "#/crafts", title: "Дерево крафта", sub: "Рецепты и получение", mark: "⚒", art: "assets/sprites/Iron_Anvil.png" },
      { href: "#/bosses", title: "Боссы по порядку", sub: "Призыв, место и награды", mark: "☠", art: "assets/sprites/Suspicious_Looking_Eye.png" }
    ];
    searchPanel.classList.remove("hidden");
    searchPanel.innerHTML = `
      <div class="search-drop-head"><span>Поиск по всему кодексу</span><kbd>Esc</kbd></div>
      ${hint ? `<div class="search-min-hint">${esc(hint)}</div>` : ""}
      ${recent.length ? `<section class="search-start-section"><div class="search-start-title"><span>Недавно открывали</span><button type="button" data-clear-search-recent>Очистить</button></div>${recent.map((hit) => globalSearchLinkHTML(hit)).join("")}</section>` : ""}
      <section class="search-start-section"><div class="search-start-title"><span>Быстрые переходы</span></div><div class="search-quick-grid">${quick.map((hit) => globalSearchLinkHTML(hit, "search-quick")).join("")}</div></section>`;
    searchPanel.querySelector("[data-clear-search-recent]")?.addEventListener("click", () => {
      store.set({ searchRecent: [] });
      showSearchStart(hint);
      searchInput.focus();
    });
    searchPanel.querySelectorAll("a").forEach((link) => { link.onclick = () => { searchPanel.classList.add("hidden"); searchInput.value = ""; }; });
  }

  function searchAll(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) { searchPanel.classList.add("hidden"); return; }
    const hits = [];
    if (matchesSearch("полезное полезные предметы помощь облегчить игру станции крафт добыча фарм хранение база перемещение выживание постоянные улучшения", q)) {
      hits.push({ href: "#/useful", title: "Полезное", sub: "Практический набор предметов, которые экономят время и упрощают прохождение", type: "Раздел", mark: "✚", art: "assets/vanilla-sprites/1923.png" });
    }
    CODEX.quests.forEach((x) => {
      if (matchesSearch(`${x.title} ${x.subtitle} ${x.story} ${x.mood || ""} ${x.objective || ""}`, q))
        hits.push({ href: `#/novice?q=${x.id}`, title: `Квест ${x.id}: ${x.title}`, sub: x.subtitle, type: "Квест", mark: String(x.id), art: GUIDE_ART[x.id] || "" });
    });
    Object.values(CODEX.lex || {}).forEach((x) => {
      const blob = `${x.ru} ${x.en} ${x.type} ${x.desc} ${x.where || ""} ${x.used || ""} ${x.craft || ""} ${(x.aliases || []).join(" ")}`.toLowerCase();
      if (matchesSearch(blob, q))
        hits.push({ href: `#/lex?q=${encodeURIComponent(x.ru)}`, title: x.ru, sub: `${x.type} · ${x.en}`, type: "Словарь", mark: "A", art: BOSS_ART_BY_ID[x.id] || LEX_ART[x.en || x.ru] || resolveArt(x.en || x.ru) || "" });
    });
    const itemHitNames = new Set();
    (CODEX.items || []).forEach((x) => {
      const title = x.nameRu || ruItemName(x);
      if (matchesSearch(`${x.name} ${title} ${ruText(x.get)} ${x.why} ${x.desc || ""}`, q)) {
        hits.push({ href: `#/items?mode=guide&s=${encodeURIComponent(x.name)}`, title, sub: ruText(x.get), type: "Рекомендация", mark: "◆", art: spriteOfFixed(x) || resolveArt(x.name) || "" });
        itemHitNames.add(String(x.name).toLocaleLowerCase("ru"));
        itemHitNames.add(String(title).toLocaleLowerCase("ru"));
        itemHitNames.add(ruItemName(x).toLocaleLowerCase("ru"));
      }
    });
    catalogSearchRows().forEach(({ item, title, key, localizedKey, blob }) => {
      if (matchesSearch(blob, q) && !itemHitNames.has(key) && !itemHitNames.has(localizedKey)) {
        hits.push({
          href: `#/items?s=${encodeURIComponent(item.name)}`,
          title,
          sub: `${item.group} · ${item.cls === "all" ? "Все классы" : (CLS_RU[item.cls] || item.cls)}`,
          type: "Полный индекс",
          mark: ITEM_KIND_MARK[item.kind] || "◆",
          art: `assets/item-sprites/${encodeURIComponent(item.id)}.png`
        });
      }
    });
    const vanillaMatches = [];
    vanillaSearchRows().forEach((row) => {
      if (!matchesSearch(row.blob, q)) return;
      const ru = row.title.toLocaleLowerCase("ru");
      const en = row.item.name.toLocaleLowerCase("en");
      const score = ru === q || en === q ? 0 : ru.startsWith(q) || en.startsWith(q) ? 1 : 2;
      vanillaMatches.push({ ...row, score });
    });
    vanillaMatches.sort((a, b) => a.score - b.score || a.title.localeCompare(b.title, "ru"));
    vanillaMatches.slice(0, 8).forEach(({ item, title }) => {
      hits.push({
        href: `#/crafts?item=${encodeURIComponent(`vanilla:${item.id}`)}`,
        title,
        sub: `${vanillaTypeName(item.type)} · открыть дерево крафта`,
        type: "Terraria",
        mark: "◇",
        art: item.sprite || ""
      });
    });
    [...CODEX.bosses, ...CODEX.minis].forEach((x) => {
      if (matchesSearch(`${x.name} ${x.en || ""} ${ruText(x.drops)} ${ruText(x.summon)}`, q))
        hits.push({ href: `#/bosses?q=${encodeURIComponent(x.name)}`, title: x.name, sub: ruText(x.summon), type: x.type || "Босс", mark: x.kind === "mini" ? "◆" : "☠", art: x.art || BOSS_ART_BY_ID[x.id] || BOSS_ART[x.n] || "" });
    });
    CODEX.crafts.forEach((x) => {
      const title = ruItemName(x.name);
      const bosses = bossRelationsFor(x).map(({ boss }) => `${boss.name} ${boss.en || ""}`).join(" ");
      if (matchesSearch(`${x.name} ${title} ${ruText(x.ings)} ${x.why} ${bosses}`, q))
        hits.push({ href: `#/crafts?item=${encodeURIComponent(x.name)}`, title, sub: ruText(x.ings), type: "Крафт", mark: "⚒", art: resolveArt(x.name) || "" });
    });
    // Мобы: 635 существ бестиария; боссы уже покрыты карточками выше.
    if (window.CALAMITY_MOB_INDEX) {
      const mobMatches = [];
      mobIndex().mobs.forEach((m) => {
        if (m.kind === "boss") return;
        if (!matchesSearch(mobSearchBlob(m), q)) return;
        const ru = m.ru.toLocaleLowerCase("ru");
        const en = m.en.toLocaleLowerCase("en");
        mobMatches.push({ m, score: ru === q || en === q ? 0 : ru.startsWith(q) || en.startsWith(q) ? 1 : 2 });
      });
      mobMatches.sort((a, b) => a.score - b.score || a.m.ru.localeCompare(b.m.ru, "ru"));
      mobMatches.slice(0, 6).forEach(({ m }) => {
        hits.push({
          href: `#/mobs?q=${encodeURIComponent(m.ru)}`,
          title: m.ru,
          sub: `${m.kind === "critter" ? "Мирный зверёк" : "Противник"}${m.src === "c" ? " · Каламити" : " · Terraria"}${m.tags.length ? ` · ${m.tags.slice(0, 2).map(mobTagLabel).join(", ")}` : ""}`,
          type: "Моб", mark: "⚔", art: m.art || ""
        });
      });
    }
    const rank = (hit) => {
      const title = String(hit.title || "").toLocaleLowerCase("ru");
      const sub = String(hit.sub || "").toLocaleLowerCase("ru");
      if (title === q) return 0;
      if (title.startsWith(q)) return 1;
      if (sub.includes(q)) return 2;
      return 3;
    };
    hits.sort((a, b) => rank(a) - rank(b));
    const shown = hits.slice(0, 24);
    searchPanel.classList.remove("hidden");
    searchPanel.innerHTML = hits.length
      ? `<div class="search-drop-head"><span>Найдено: ${hits.length}</span><kbd>Esc</kbd></div>${shown.map((hit) => globalSearchLinkHTML(hit, "search-hit", true, q)).join("")}`
      : `<div class="search-empty"><b>Ничего не найдено</b><small>Попробуй «виктайд», «скория» или «морские останки»</small></div>`;
    searchPanel.querySelectorAll("a[data-search-result]").forEach((link, index) => { link.onclick = () => {
      rememberSearchHit(shown[index]);
      searchPanel.classList.add("hidden");
      searchInput.value = "";
    }; });
    return hits.length;
  }

  document.addEventListener("click", (e) => {
    const control = e.target.closest && e.target.closest("[data-favorite-type]");
    if (!control) return;
    e.preventDefault();
    const type = control.dataset.favoriteType;
    const key = control.dataset.favoriteKey;
    const removing = getFavorites()[type]?.has(String(key));
    toggleFavorite(type, key);
    starPop(e.clientX, e.clientY, removing ? "remove" : "");
    // Обновляем кнопку на месте вместо перерисовки всей страницы.
    const saved = !removing;
    control.classList.toggle("saved", saved);
    control.setAttribute("aria-pressed", String(saved));
    const label = control.getAttribute("aria-label") || "";
    const action = saved ? "Удалить из избранного" : "Добавить в избранное";
    const baseLabel = label.replace(/^(Добавить в избранное|Удалить из избранного)/, action);
    control.setAttribute("aria-label", baseLabel);
    control.title = baseLabel;
    control.querySelector("span").textContent = saved ? "★" : "☆";
    // Счётчик на чипе «Избранное» страницы предметов
    const chip = document.querySelector(".favorite-chip em");
    if (chip) chip.textContent = getFavorites().item.size;
    // На странице избранного структура меняется — перерисовываем.
    const view = document.body.dataset.view;
    if (view === "favorites" || (view === "items" && location.hash.includes("fav=1"))) route();
  });

  document.addEventListener("click", (e) => {
    const control = e.target.closest && e.target.closest("[data-boss-defeated]");
    if (!control) return;
    e.preventDefault();
    toggleBossDefeated(control.dataset.bossDefeated || "");
    route();
  });

  addEventListener("storage", (e) => {
    if (e.key !== "calamity-codex") return;
    favoriteCache = null;
    defeatedBossCache = null;
    updateFavoritesBadge();
    updateCraftPlanCount();
    updateJourneyProgress();
    if (["favorites", "bosses", "crafts"].includes(document.body.dataset.view)) route();
  });

  let globalSearchTimer = 0;
  let lastGlobalSearch = "";
  const queueGlobalSearch = (immediate = false) => {
    clearTimeout(globalSearchTimer);
    const value = searchInput.value;
    if (value.trim().length < 2) {
      lastGlobalSearch = "";
      if (document.activeElement === searchInput) {
        showSearchStart(value.trim() ? "Введи ещё один символ, чтобы начать поиск" : "Начни вводить название или выбери быстрый переход");
      } else {
        searchPanel.classList.add("hidden");
      }
      return;
    }
    const run = () => {
      const normalized = value.trim().toLocaleLowerCase("ru");
      if (!catalogDataReady()) {
        searchPanel.classList.remove("hidden");
        searchPanel.innerHTML = '<div class="search-data-loading"><b>◆</b><span><strong>Подключаем полный поиск</strong><small>Загружаем каталоги Calamity и Terraria…</small></span></div>';
        ensureCatalogData().then((ready) => {
          if (searchInput.value.trim().toLocaleLowerCase("ru") !== normalized) return;
          if (!ready) {
            searchPanel.innerHTML = '<div class="search-empty"><b>Каталог не загрузился</b><small>Проверь соединение и повтори ввод.</small></div>';
            return;
          }
          lastGlobalSearch = "";
          queueGlobalSearch(true);
        });
        return;
      }
      if (normalized === lastGlobalSearch && !searchPanel.classList.contains("hidden")) return;
      lastGlobalSearch = normalized;
      const coreHits = searchAll(value);
      // Английский tooltip-индекс нужен только для латинского запроса, который
      // основной каталог не смог уверенно закрыть. Русский и ванильный поиск
      // больше не скачивает дополнительные 68 КБ без необходимости.
      if (/[a-z]/i.test(value) && coreHits < 24) {
        loadCatalogTooltips().then((changed) => {
          if (!changed || searchInput.value.trim().toLocaleLowerCase("ru") !== normalized) return;
          searchAll(searchInput.value);
        });
      }
    };
    if (immediate) run();
    else globalSearchTimer = setTimeout(run, 120);
  };
  const catalogIntentSelector = 'a[href^="#/items"], a[href^="#/crafts"], a[href^="#/useful"], a[href^="#/favorites"], [data-tree]';
  const prefetchOnIntent = (event) => {
    const target = event.target;
    if (target === searchInput || target?.closest?.(catalogIntentSelector)) prefetchCatalogData();
  };
  document.addEventListener("pointerover", prefetchOnIntent, { passive: true });
  document.addEventListener("focusin", prefetchOnIntent);
  searchInput.addEventListener("input", () => queueGlobalSearch(false));
  searchInput.addEventListener("focus", () => queueGlobalSearch(true));
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      searchPanel.classList.add("hidden");
      searchInput.blur();
    } else if (e.key === "ArrowDown") {
      const first = searchPanel.querySelector("a");
      if (first) { e.preventDefault(); first.focus(); }
    }
  });
  searchPanel.addEventListener("keydown", (e) => {
    if (!["ArrowDown", "ArrowUp", "Escape"].includes(e.key)) return;
    if (e.key === "Escape") {
      searchPanel.classList.add("hidden");
      searchInput.focus();
      return;
    }
    const links = [...searchPanel.querySelectorAll("a")];
    if (!links.length) return;
    e.preventDefault();
    const index = links.indexOf(document.activeElement);
    const next = e.key === "ArrowDown" ? (index + 1) % links.length : (index - 1 + links.length) % links.length;
    links[next].focus();
  });

  /* Konami: ↑↑↓↓←→←→BA — секретный режим REVENGEANCE */
  let konamiStep = 0;
  const KONAMI_SEQ = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];

  document.addEventListener("keydown", (e) => {
    const target = e.target;
    const typing = target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    } else if (e.key === "/" && !typing) {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === "Escape") {
      document.getElementById("tt")?.setAttribute("hidden", "");
      if (tipCard && !tipCard.hidden) {
        e.preventDefault();
        hideTipCard({ restoreFocus: true });
        return;
      }
      if (recipeModal && !recipeModal.hidden) {
        e.preventDefault();
        closeRecipeModal();
        return;
      }
      if (treeModal && !treeModal.hidden) {
        e.preventDefault();
        closeCraftTree();
        return;
      }
      if (biomeModal && !biomeModal.hidden) {
        e.preventDefault();
        closeBiomeViewer();
        return;
      }
      if (railEl?.classList.contains("open")) {
        e.preventDefault();
        setMobileMenu(false);
        return;
      }
      if (!searchPanel.classList.contains("hidden")) {
        e.preventDefault();
        searchPanel.classList.add("hidden");
        searchInput.focus();
        return;
      }
    }
    const k = (e.key || "").toLowerCase();
    if (k === KONAMI_SEQ[konamiStep]) {
      konamiStep += 1;
      if (konamiStep === KONAMI_SEQ.length) { konamiStep = 0; toggleRevengeance(); }
    } else {
      konamiStep = k === KONAMI_SEQ[0] ? 1 : 0;
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest && e.target.closest(".chip, .mini, .class-pick button")) SND.play("select");
  });
  document.addEventListener("toggle", (e) => {
    if (e.target && e.target.classList && e.target.classList.contains("shelf")) SND.play(e.target.open ? "open" : "close");
  }, true);
  document.addEventListener("click", (e) => {
    if (!searchPanel.contains(e.target) && e.target !== searchInput) searchPanel.classList.add("hidden");
  });

  const railEl = document.getElementById("rail");
  const scrim = document.getElementById("rail-scrim");
  const stageEl = document.querySelector(".stage");
  const mobileTabs = document.querySelector(".mobile-tabs");
  let menuPreviousFocus = null;
  function setMobileMenu(open, options = {}) {
    if (!railEl || !menuButton) return;
    const { focus = true, restoreFocus = true, playSound = true } = options;
    const wasOpen = railEl.classList.contains("open");
    if (open && !wasOpen) menuPreviousFocus = document.activeElement;
    railEl.classList.toggle("open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    if (scrim) scrim.hidden = !open;
    document.body.classList.toggle("menu-open", open);
    setElementInert(stageEl, open);
    setElementInert(mobileTabs, open);
    if (playSound && open !== wasOpen) SND.play("tick");
    if (open && focus) {
      requestAnimationFrame(() => focusableWithin(railEl)[0]?.focus());
    } else if (!open) {
      const restore = menuPreviousFocus || menuButton;
      menuPreviousFocus = null;
      if (restoreFocus && wasOpen) requestAnimationFrame(() => restore?.focus?.({ preventScroll: true }));
    }
  }
  if (menuButton) menuButton.onclick = () => setMobileMenu(!railEl?.classList.contains("open"));
  if (scrim) scrim.onclick = () => setMobileMenu(false);
  railEl?.addEventListener("click", (event) => {
    if (event.target.closest("a[href]")) setMobileMenu(false, { restoreFocus: false, playSound: false });
  });
  railEl?.addEventListener("keydown", (event) => {
    if (railEl.classList.contains("open")) trapFocus(event, railEl);
  });

  const soundToggle = document.getElementById("sound-toggle");
  if (soundToggle) {
    soundToggle.setAttribute("aria-pressed", String(SND.enabled));
    soundToggle.setAttribute("aria-label", SND.enabled ? "Звук интерфейса: включён" : "Звук интерфейса: выключен");
    soundToggle.onclick = () => {
      SND.setEnabled(!SND.enabled);
      soundToggle.setAttribute("aria-pressed", String(SND.enabled));
      soundToggle.setAttribute("aria-label", SND.enabled ? "Звук интерфейса: включён" : "Звук интерфейса: выключен");
      if (SND.enabled) SND.play("blip");
      toast(SND.enabled ? "Звук интерфейса включён" : "Звук интерфейса выключен", SND.enabled ? "♪" : "∅");
    };
  }
  document.addEventListener("pointerdown", () => SND.unlock(), { once: true });

  /* Полоса прокрутки и плавающие элементы: один rAF на все scroll-события. */
  const scrollHp = document.getElementById("scroll-hp");
  const toTop = document.getElementById("to-top");
  let viewportFrame = 0;
  let scrollMax = 0;
  let scrollMetricsDirty = true;
  let viewportScrollDirty = true;
  let hideTipOnFrame = false;
  let toTopVisible = false;

  function readScrollMetrics() {
    scrollMax = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    scrollMetricsDirty = false;
  }
  function paintViewportFrame() {
    viewportFrame = 0;
    if (hideTipOnFrame) {
      hideTipOnFrame = false;
      hideTipCard();
    }
    if (!viewportScrollDirty) return;
    viewportScrollDirty = false;
    if (scrollMetricsDirty) readScrollMetrics();
    const progress = scrollMax > 0 ? Math.min(1, Math.max(0, scrollY / scrollMax)) : 0;
    if (scrollHp) scrollHp.style.transform = `scaleX(${progress})`;
    const nextToTop = scrollY > 650;
    if (nextToTop !== toTopVisible) {
      toTopVisible = nextToTop;
      toTop?.classList.toggle("show", nextToTop);
    }
  }
  function scheduleViewportFrame() {
    if (!viewportFrame) viewportFrame = requestAnimationFrame(paintViewportFrame);
  }
  function invalidateScrollMetrics() {
    scrollMetricsDirty = true;
    viewportScrollDirty = true;
    scheduleViewportFrame();
  }
  addEventListener("scroll", (event) => {
    const target = event.target;
    if (tipCard && !tipCard.hidden && !(target && tipCard.contains(target))) hideTipOnFrame = true;
    const viewport = target === document || target === document.documentElement || target === document.body || target === window;
    if (viewport) viewportScrollDirty = true;
    if (viewport || hideTipOnFrame) scheduleViewportFrame();
  }, { capture: true, passive: true });
  addEventListener("resize", invalidateScrollMetrics, { passive: true });
  if (typeof ResizeObserver !== "undefined" && app) {
    const scrollSizeObserver = new ResizeObserver(invalidateScrollMetrics);
    scrollSizeObserver.observe(app);
  }
  invalidateScrollMetrics();
  if (toTop) toTop.onclick = () => scrollTo({ top: 0, behavior: "smooth" });

  const shellEl = document.querySelector(".shell");

  /* ---------- отдельный визуальный рецепт ---------- */
  const recipeModal = document.getElementById("recipe-modal");
  const recipePanel = recipeModal?.querySelector(".recipe-panel");
  const recipeContent = document.getElementById("recipe-content");
  const recipeResultName = document.getElementById("recipe-result-name");
  const recipeResultOriginal = document.getElementById("recipe-result-original");
  const recipeTreeButton = document.getElementById("recipe-tree");
  const recipePlanButton = document.getElementById("recipe-plan");
  const recipePlanOpen = document.getElementById("recipe-plan-open");
  let recipeCurrent = "";
  let recipeStateKey = "";
  let recipePreviousFocus = null;

  function recipeChecklistState(key) {
    const all = store.get().recipeIngredients || {};
    return new Set(Array.isArray(all[key]) ? all[key] : []);
  }
  function toggleRecipeChecklistItem(key, materialKey) {
    const all = store.get().recipeIngredients || {};
    const collected = new Set(Array.isArray(all[key]) ? all[key] : []);
    if (collected.has(materialKey)) collected.delete(materialKey);
    else collected.add(materialKey);
    store.set({ recipeIngredients: { ...all, [key]: [...collected] } });
    return collected.has(materialKey);
  }
  function clearRecipeChecklist(key) {
    const all = { ...(store.get().recipeIngredients || {}) };
    delete all[key];
    store.set({ recipeIngredients: all });
  }
  function recipeCraftQuantity(key) {
    const value = Number(store.get().recipeQuantities?.[key] || 1);
    return Math.min(999, Math.max(1, Number.isFinite(value) ? Math.round(value) : 1));
  }
  function setRecipeCraftQuantity(key, value) {
    const quantity = Math.min(999, Math.max(1, Math.round(Number(value) || 1)));
    const all = { ...(store.get().recipeQuantities || {}), [key]: quantity };
    store.set({ recipeQuantities: all });
    return quantity;
  }
  function multipliedIngredientCount(raw, quantity) {
    const value = Number.parseFloat(String(raw || "1").replace(",", "."));
    if (!Number.isFinite(value)) return quantity === 1 ? String(raw || "1") : `${raw || "1"} × ${quantity}`;
    const total = value * quantity;
    return Number.isInteger(total) ? String(total) : String(Math.round(total * 100) / 100).replace(".", ",");
  }
  function recipeCraftCountLabel(quantity) {
    const mod100 = quantity % 100;
    const mod10 = quantity % 10;
    const word = mod100 >= 11 && mod100 <= 14 ? "крафтов" : mod10 === 1 ? "крафт" : mod10 >= 2 && mod10 <= 4 ? "крафта" : "крафтов";
    return `${quantity} ${word}`;
  }

  function recipeItemArt(info, className) {
    const art = info.art || info.remoteArt || "";
    return art
      ? `<img class="${className || ""}${info.remoteArt && !info.art ? " remote" : ""}" src="${escAttr(releaseAsset(art))}" alt="" loading="lazy" decoding="async" />`
      : `<span class="recipe-art-fallback" aria-hidden="true">◆</span>`;
  }
  function renderVisualRecipe(name) {
    const info = ingredientInfo(name);
    const recipe = visualRecipeFor(name);
    if (!recipe || !recipeContent) return false;
    recipeStateKey = normalizeArtName(info.catName || info.en || info.name || name);
    const quantity = recipeCraftQuantity(recipeStateKey);
    const resultYield = Math.max(1, Number(recipe.yield || 1));
    const resultQuantity = quantity * resultYield;
    const resultQuantityLabel = resultYield > 1 ? `${recipeCraftCountLabel(quantity)} → ${craftAmount(resultQuantity)} шт.` : recipeCraftCountLabel(quantity);
    const collected = recipeChecklistState(recipeStateKey);
    const ingredientRows = recipe.ings.map((ingredient) => {
      const key = ingredient.key || ingredient.name;
      const child = ingredientInfo(key);
      const materialKey = normalizeArtName(child.ru || key);
      const displayCount = multipliedIngredientCount(ingredient.count || "1", quantity);
      return { ingredient, key, child, materialKey, displayCount, done: collected.has(materialKey) };
    });
    const ingredients = ingredientRows.map(({ child, materialKey, displayCount, done }) => `<button class="recipe-ingredient${done ? " collected" : ""}" type="button" data-recipe-check data-material-key="${escAttr(materialKey)}" aria-pressed="${done}" aria-label="${done ? "Убрать отметку" : "Отметить собранным"}: ${escAttr(child.ru)}, ${esc(displayCount)} штук">
        <span class="slot recipe-ingredient-art">${recipeItemArt(child, "recipe-sprite")}</span>
        <span class="recipe-ingredient-count">×${esc(displayCount)}</span>
        <div><b>${esc(child.ru)}</b>${child.en ? `<small>в игре: ${esc(child.en)}</small>` : ""}${child.artNote ? `<small class="recipe-art-note">${esc(child.artNote)}</small>` : ""}<em>${done ? "✓ собрано" : "○ отметить"}</em></div>
      </button>`).join("");
    const collectedCount = ingredientRows.filter((row) => row.done).length;
    const collectedPercent = Math.round((collectedCount / Math.max(1, ingredientRows.length)) * 100);
    const copyList = [`${info.ru} — ${resultQuantityLabel}`, ...ingredientRows.map(({ child, displayCount }) => `${displayCount} × ${child.ru}`), `Станция: ${recipe.station ? stationDisplayName(recipe.station) : "не требуется"}`].join("\n");
    const stationName = recipe.station ? stationDisplayName(recipe.station) : "Без отдельной станции";
    const stationArt = recipe.station ? craftStationSprite(recipe.station) : "";
    const materialRoot = info.key || name;
    const baseMaterials = craftTreeMaterialSummary(materialRoot, quantity);
    const branchStations = craftTreeStationSummary(materialRoot);
    const baseCollected = craftMaterialState(materialRoot);
    const baseCollectedCount = baseMaterials.filter((item) => baseCollected.has(normalizeArtName(item.info.ru))).length;
    const baseCollectedPercent = Math.round((baseCollectedCount / Math.max(1, baseMaterials.length)) * 100);
    const baseUnitTotal = baseMaterials.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
    const hasNestedCrafts = recipe.ings.some((ingredient) => Boolean(ingredientInfo(ingredient.key || ingredient.name).recipe?.ings?.length));
    const baseCopyList = [
      `${info.ru} — полная смета на ${recipeCraftCountLabel(quantity)}`,
      ...baseMaterials.map((item) => `${craftAmount(item.count)} × ${item.info.ru}`),
      `Станции ветки: ${branchStations.length ? branchStations.map((station) => station.name).join(", ") : "не требуются"}`
    ].join("\n");
    const baseMaterialCards = baseMaterials.map((item) => {
      const materialKey = normalizeArtName(item.info.ru);
      const done = baseCollected.has(materialKey);
      const count = craftAmount(item.count);
      return `<button class="recipe-base-material${done ? " collected" : ""}" type="button" data-recipe-material-toggle data-material-key="${escAttr(materialKey)}" aria-pressed="${done}" aria-label="${done ? "Убрать отметку" : "Отметить собранным"}: ${escAttr(item.info.ru)}, ${escAttr(count)} штук">
        <span class="slot recipe-base-material-art">${recipeItemArt(item.info, "recipe-sprite")}</span>
        <span><b>${esc(item.info.ru)}</b>${item.info.en ? `<small>в игре: ${esc(item.info.en)}</small>` : ""}${item.info.artNote ? `<small class="recipe-art-note">${esc(item.info.artNote)}</small>` : ""}<em>×${esc(count)}</em></span>
        <i aria-hidden="true">${done ? "✓" : "○"}</i>
      </button>`;
    }).join("");
    const stationChain = branchStations.length
      ? branchStations.map((station) => `<span class="recipe-chain-station"><span class="slot">${station.art ? `<img src="${escAttr(releaseAsset(station.art))}" alt="" loading="lazy" decoding="async" />` : `<b aria-hidden="true">РУКИ</b>`}</span><b>${esc(station.name)}</b></span>`).join("")
      : `<span class="recipe-chain-empty">Дополнительные станции не нужны</span>`;
    const basePlanHTML = baseMaterials.length ? `<section class="recipe-material-plan" aria-label="Полная смета базовых ресурсов">
      <header>
        <div><small>вся ветка крафта</small><b>Базовые ресурсы без промежуточных предметов</b><p>${hasNestedCrafts ? "Кодекс раскрыл промежуточные рецепты и сложил одинаковые материалы. Количество пересчитывается вместе с числом крафтов выше." : "Промежуточных рецептов нет: итоговая смета совпадает с прямыми ингредиентами, но её можно отмечать отдельно."}</p></div>
        <div class="recipe-material-actions"><button type="button" data-copy-recipe-materials="${escAttr(baseCopyList)}">⧉ Скопировать смету</button><button type="button" data-reset-recipe-materials ${baseCollectedCount ? "" : "disabled"}>Сбросить отметки</button></div>
      </header>
      <div class="recipe-material-summary"><span><b>${baseMaterials.length}</b><small>видов ресурсов</small></span><span><b>${esc(craftAmount(baseUnitTotal))}</b><small>единиц суммарно</small></span><span><b>${baseCollectedCount}</b><small>видов собрано</small></span></div>
      <div class="recipe-check-progress recipe-material-progress"><i style="width:${baseCollectedPercent}%"></i></div>
      <output aria-live="polite"><b>${baseCollectedCount}</b> из ${baseMaterials.length} видов собрано · ${baseCollectedPercent}%</output>
      <div class="recipe-base-grid">${baseMaterialCards}</div>
      <div class="recipe-station-chain"><small>Станции для всей ветки</small><div>${stationChain}</div></div>
    </section>` : "";
    if (recipeResultName) recipeResultName.textContent = info.ru;
    if (recipeResultOriginal) recipeResultOriginal.textContent = info.en ? `в игре: ${info.en}` : "";
    if (recipeTreeButton) recipeTreeButton.hidden = !info.recipe?.ings?.length;
    const planRef = canonicalCraftPlanRef(name);
    const planned = craftPlanRows().find(([ref]) => ref === planRef);
    if (recipePlanButton) {
      recipePlanButton.dataset.planRef = planRef;
      recipePlanButton.classList.toggle("saved", Boolean(planned));
      recipePlanButton.textContent = planned ? `✓ Обновить план · ${quantity}` : "＋ Добавить в план";
      recipePlanButton.setAttribute("aria-label", `${planned ? "Обновить" : "Добавить"} в общем плане: ${info.ru}, ${recipeCraftCountLabel(quantity)}`);
    }
    if (recipePlanOpen) recipePlanOpen.querySelector("[data-craft-plan-count]").textContent = craftPlanRows().length;
    recipeContent.innerHTML = `
      <div class="recipe-equation">
        <section class="recipe-ingredient-side" aria-label="Ингредиенты рецепта">
          <header><span>01</span><div><small>необходимые предметы · ${recipeCraftCountLabel(quantity)}</small><b>Ингредиенты · ${recipe.ings.length} видов</b></div></header>
          <div class="recipe-ingredient-grid">${ingredients}</div>
        </section>
        <div class="recipe-arrow" aria-hidden="true"><small>создать</small><b>→</b></div>
        <section class="recipe-result-side" aria-label="Результат рецепта">
          <header><span>02</span><div><small>получится · ×${esc(craftAmount(resultQuantity))}</small><b>Результат</b></div></header>
          <span class="slot recipe-result-art">${recipeItemArt(info, "recipe-sprite")}</span>
          <h3>${esc(info.ru)}</h3>
          ${info.en ? `<p>в игре: ${esc(info.en)}</p>` : ""}
          <em>${esc(resultQuantityLabel)}</em>
        </section>
      </div>
      <section class="recipe-checklist" aria-label="Чеклист ингредиентов">
        <header>
          <div><small>подготовка к крафту</small><b>Отмечай уже собранные ингредиенты</b><p>Нажми на карточку ингредиента — отметка сохранится в профиле и останется после перезагрузки.</p></div>
          <div class="recipe-checklist-controls">
            <label class="recipe-quantity"><small>Количество крафтов</small><span><button type="button" data-recipe-quantity="-1" aria-label="Уменьшить количество крафтов" ${quantity <= 1 ? "disabled" : ""}>−</button><input type="number" min="1" max="999" step="1" value="${quantity}" data-recipe-quantity-input aria-label="Количество повторений крафта" /><button type="button" data-recipe-quantity="1" aria-label="Увеличить количество крафтов" ${quantity >= 999 ? "disabled" : ""}>+</button></span></label>
            <div class="recipe-checklist-actions"><button type="button" data-copy-recipe-list="${escAttr(copyList)}">⧉ Скопировать список</button><button type="button" data-reset-recipe-list ${collectedCount ? "" : "disabled"}>Сбросить отметки</button></div>
          </div>
        </header>
        <div class="recipe-check-progress"><i style="width:${collectedPercent}%"></i></div>
        <output aria-live="polite"><b>${collectedCount}</b> из ${ingredientRows.length} видов собрано · ${collectedPercent}%</output>
      </section>
      <section class="recipe-station" aria-label="Станция крафта">
        <span class="slot">${stationArt ? `<img src="${escAttr(releaseAsset(stationArt))}" alt="" loading="lazy" decoding="async" />` : `<b class="recipe-hand" aria-hidden="true">РУКИ</b>`}</span>
        <div><small>станция текущего рецепта</small><b>${esc(stationName)}</b><p>${recipe.station ? "Подойди к этой станции с ингредиентами в инвентаре — рецепт появится в меню создания." : "Предмет создаётся прямо из инвентаря, дополнительный рабочий объект не нужен."}</p></div>
      </section>
      ${basePlanHTML}`;
    bindSprites(recipeContent);
    linkifyMobMentions(recipeContent);
    return true;
  }
  function openRecipeModal(name) {
    const target = String(name || "").trim();
    if (!recipeModal || !target) return;
    if (!catalogDataReady()) {
      toast("Загружаем точный рецепт…", "⚒");
      ensureCatalogData().then((ready) => ready ? openRecipeModal(target) : toast("Не удалось загрузить рецепты", "!"));
      return;
    }
    if (!renderVisualRecipe(target)) {
      toast("Для этого предмета нет подтверждённого рецепта", "!");
      return;
    }
    if (recipeModal.hidden) recipePreviousFocus = document.activeElement && typeof document.activeElement.focus === "function" ? document.activeElement : null;
    recipeCurrent = target;
    recipeModal.hidden = false;
    document.body.classList.add("recipe-open");
    setElementInert(shellEl, true);
    setElementInert(mobileTabs, true);
    setElementInert(toTop, true);
    SND.play("open");
    if (liveRegion) liveRegion.textContent = `Открыт визуальный рецепт: ${ingredientInfo(target).ru}`;
    document.getElementById("recipe-close")?.focus();
  }
  function closeRecipeModal(options = {}) {
    if (!recipeModal) return;
    const { restoreFocus = true, playSound = true } = options;
    const wasOpen = !recipeModal.hidden;
    recipeModal.hidden = true;
    document.body.classList.remove("recipe-open");
    setElementInert(shellEl, false);
    setElementInert(mobileTabs, false);
    setElementInert(toTop, false);
    if (playSound && wasOpen) SND.play("close");
    const restore = recipePreviousFocus;
    recipePreviousFocus = null;
    if (restoreFocus && wasOpen && restore) requestAnimationFrame(() => restore.focus({ preventScroll: true }));
  }
  if (recipeModal) {
    recipeModal.addEventListener("click", (event) => {
      if (event.target.closest("[data-recipe-close]")) { closeRecipeModal(); return; }
      const quantityButton = event.target.closest("[data-recipe-quantity]");
      if (quantityButton) {
        const next = recipeCraftQuantity(recipeStateKey) + Number(quantityButton.dataset.recipeQuantity || 0);
        const quantity = setRecipeCraftQuantity(recipeStateKey, next);
        renderVisualRecipe(recipeCurrent);
        SND.play("select");
        announce(`Количество крафтов: ${quantity}`);
        requestAnimationFrame(() => recipeModal.querySelector(`[data-recipe-quantity="${quantityButton.dataset.recipeQuantity}"]`)?.focus());
        return;
      }
      const ingredient = event.target.closest("[data-recipe-check]");
      if (ingredient) {
        const materialKey = ingredient.dataset.materialKey || "";
        const nowCollected = toggleRecipeChecklistItem(recipeStateKey, materialKey);
        renderVisualRecipe(recipeCurrent);
        SND.play(nowCollected ? "check" : "snap");
        announce(nowCollected ? "Ингредиент отмечен собранным" : "Отметка ингредиента снята");
        requestAnimationFrame(() => [...recipeModal.querySelectorAll("[data-recipe-check]")].find((button) => button.dataset.materialKey === materialKey)?.focus());
        return;
      }
      const baseMaterial = event.target.closest("[data-recipe-material-toggle]");
      if (baseMaterial) {
        const root = ingredientInfo(recipeCurrent).key || recipeCurrent;
        const materialKey = baseMaterial.dataset.materialKey || "";
        const nowCollected = toggleCraftMaterial(root, materialKey);
        renderVisualRecipe(recipeCurrent);
        SND.play(nowCollected ? "check" : "snap");
        announce(nowCollected ? "Базовый ресурс отмечен собранным" : "Отметка базового ресурса снята");
        requestAnimationFrame(() => [...recipeModal.querySelectorAll("[data-recipe-material-toggle]")].find((button) => button.dataset.materialKey === materialKey)?.focus());
        return;
      }
      const copyMaterials = event.target.closest("[data-copy-recipe-materials]");
      if (copyMaterials) { copyText(copyMaterials.dataset.copyRecipeMaterials || "", "Полная смета ресурсов скопирована"); return; }
      if (event.target.closest("[data-reset-recipe-materials]")) {
        const root = ingredientInfo(recipeCurrent).key || recipeCurrent;
        clearCraftMaterials(root);
        renderVisualRecipe(recipeCurrent);
        SND.play("snap");
        announce("Отметки базовых ресурсов сброшены");
        requestAnimationFrame(() => recipeModal.querySelector("[data-copy-recipe-materials]")?.focus());
        return;
      }
      const copy = event.target.closest("[data-copy-recipe-list]");
      if (copy) { copyText(copy.dataset.copyRecipeList || "", "Список ингредиентов скопирован"); return; }
      if (event.target.closest("[data-reset-recipe-list]")) {
        clearRecipeChecklist(recipeStateKey);
        renderVisualRecipe(recipeCurrent);
        SND.play("snap");
        announce("Отметки ингредиентов сброшены");
      }
    });
    recipeModal.addEventListener("change", (event) => {
      const input = event.target.closest?.("[data-recipe-quantity-input]");
      if (!input) return;
      const quantity = setRecipeCraftQuantity(recipeStateKey, input.value);
      renderVisualRecipe(recipeCurrent);
      SND.play("select");
      announce(`Количество крафтов: ${quantity}`);
      requestAnimationFrame(() => recipeModal.querySelector("[data-recipe-quantity-input]")?.focus());
    });
    recipeModal.addEventListener("keydown", (event) => {
      if (event.key === "Tab") trapFocus(event, recipePanel);
    });
  }
  if (recipePlanButton) recipePlanButton.onclick = () => {
    const quantity = recipeCraftQuantity(recipeStateKey);
    const result = setCraftPlanEntry(recipeCurrent, quantity);
    if (!result.ok) {
      toast(result.full ? `В плане уже ${CRAFT_PLAN_LIMIT} целей` : "Этот рецепт нельзя добавить в план", "!");
      return;
    }
    renderVisualRecipe(recipeCurrent);
    refreshCraftPlan();
    SND.play(result.added ? "pop" : "select");
    toast(result.added ? "Цель добавлена в план крафта" : "Количество в плане обновлено", result.added ? "+" : "✓");
    announce(`${ingredientInfo(recipeCurrent).ru}: ${recipeCraftCountLabel(quantity)} в общем плане`);
    requestAnimationFrame(() => recipePlanButton.focus());
  };
  if (recipeTreeButton) recipeTreeButton.onclick = () => {
    const target = canonicalCraftPlanRef(recipeCurrent);
    closeRecipeModal({ restoreFocus: false, playSound: false });
    hideTipCard();
    location.hash = `#/crafts?item=${encodeURIComponent(target)}`;
  };
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-recipe]");
    if (!button) return;
    event.preventDefault();
    openRecipeModal(button.dataset.recipe || "");
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-add-craft-plan]");
    if (!button) return;
    event.preventDefault();
    const result = addCraftPlanEntry(button.dataset.addCraftPlan || "", 1);
    if (!result.ok) {
      toast(result.full ? `В плане уже ${CRAFT_PLAN_LIMIT} целей` : "Этот рецепт нельзя добавить в план", "!");
      return;
    }
    document.querySelectorAll("[data-add-craft-plan]").forEach((control) => {
      if (control.dataset.addCraftPlan !== result.ref) return;
      control.classList.add("saved");
      control.setAttribute("aria-pressed", "true");
      control.title = "Уже добавлено в общий план";
      control.innerHTML = '<span aria-hidden="true">✓</span> В плане';
    });
    refreshCraftPlan();
    SND.play(result.added ? "pop" : "select");
    toast(result.added ? "Цель добавлена в общий план" : `Уже в плане · ${recipeCraftCountLabel(result.quantity)}`, result.added ? "+" : "✓");
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-item-details]");
    if (!button) return;
    event.preventDefault();
    showTipCard(button.dataset.itemDetails || "", button, true);
  });

  /* ---------- дерево крафта ---------- */
  const treeModal = document.getElementById("tree-modal");
  const treePanel = treeModal?.querySelector(".tree-panel");
  const treeBody = document.getElementById("tree-body");
  let treeStack = [];
  let treeCurrent = "";
  let treePreviousFocus = null;
  let modalTreeScale = savedTreeScale("modal");
  const TREE_MAX_DEPTH = 32;

  function applyModalTreeZoom() {
    applyTreeGraphZoom(treeBody, modalTreeScale, treeModal, "[data-modal-tree-zoom-label]");
  }
  function adjustModalTreeZoom(action) {
    const current = modalTreeScale;
    const requested = action === "reset" ? 1 : current + (action === "in" ? TREE_ZOOM_STEP : -TREE_ZOOM_STEP);
    modalTreeScale = adjustTreeSurfaceZoom(treeBody, current, requested, (scale) => {
      modalTreeScale = Number(scale.toFixed(2));
      applyModalTreeZoom();
    });
    saveTreeScale("modal", modalTreeScale);
  }

  function bindDragPan(surface) {
    if (!surface || surface.dataset.dragPanBound) return;
    surface.dataset.dragPanBound = "1";
    surface.classList.add("drag-pan");
    if (!surface.hasAttribute("tabindex")) surface.tabIndex = 0;
    if (!surface.hasAttribute("aria-label")) surface.setAttribute("aria-label", "Карта дерева крафта: зажми левую кнопку мыши и тяни для перемещения");
    let drag = null;
    let panFrame = 0;
    let suppressClick = false;
    const isControl = (target) => target?.closest?.("a, button, input, select, textarea, .npc-tip");
    const begin = (x, y, id, kind) => {
      drag = {
        id, kind, x, y,
        left: surface.scrollLeft,
        top: surface.scrollTop,
        nextLeft: surface.scrollLeft,
        nextTop: surface.scrollTop,
        moved: false
      };
    };
    const paintPan = () => {
      panFrame = 0;
      if (!drag || !drag.moved) return;
      surface.scrollLeft = drag.nextLeft;
      surface.scrollTop = drag.nextTop;
    };
    const move = (x, y, event) => {
      if (!drag) return;
      const dx = x - drag.x;
      const dy = y - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      if (!drag.moved) {
        drag.moved = true;
        surface.classList.add("is-dragging");
        window.getSelection?.()?.removeAllRanges?.();
      }
      drag.nextLeft = drag.left - dx;
      drag.nextTop = drag.top - dy;
      if (!panFrame) panFrame = requestAnimationFrame(paintPan);
      if (event?.cancelable) event.preventDefault();
    };
    const finish = (cancelled = false) => {
      if (!drag) return;
      if (panFrame) {
        cancelAnimationFrame(panFrame);
        panFrame = 0;
        paintPan();
      }
      const moved = drag.moved;
      const kind = drag.kind;
      drag = null;
      surface.classList.remove("is-dragging");
      if (moved && !cancelled) {
        suppressClick = true;
        setTimeout(() => { suppressClick = false; }, kind === "touch" ? 400 : 0);
      }
    };

    // Отдельные mouse-события намеренно используются вместо одной только
    // Pointer Events: так перетаскивание работает и внутри preview/webview,
    // где pointer capture может быть отключён прокси-обёрткой.
    const onMouseMove = (event) => move(event.clientX, event.clientY, event);
    const onMouseUp = () => {
      finish(false);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    surface.addEventListener("mousedown", (event) => {
      if (event.button !== 0 || isControl(event.target)) return;
      begin(event.clientX, event.clientY, "mouse", "mouse");
      document.addEventListener("mousemove", onMouseMove, { passive: false });
      document.addEventListener("mouseup", onMouseUp, { once: true });
    });

    const touchPoint = (event, id) => [...(event.touches || []), ...(event.changedTouches || [])].find((touch) => touch.identifier === id);
    const onTouchMove = (event) => {
      if (!drag || drag.kind !== "touch") return;
      const touch = touchPoint(event, drag.id);
      if (touch) move(touch.clientX, touch.clientY, event);
    };
    const removeTouchListeners = () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchCancel);
    };
    const onTouchEnd = (event) => {
      if (!drag || drag.kind !== "touch") return;
      const ended = [...(event.changedTouches || [])].some((touch) => touch.identifier === drag.id);
      if (!ended) return;
      finish(false);
      removeTouchListeners();
    };
    const onTouchCancel = () => {
      finish(true);
      removeTouchListeners();
    };
    surface.addEventListener("touchstart", (event) => {
      if (isControl(event.target) || event.touches.length !== 1) return;
      const touch = event.touches[0];
      begin(touch.clientX, touch.clientY, touch.identifier, "touch");
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
      document.addEventListener("touchcancel", onTouchCancel);
    }, { passive: true });

    surface.addEventListener("dragstart", (event) => event.preventDefault());
    surface.addEventListener("click", (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }

  bindDragPan(treeBody);
  treeBody?.addEventListener("wheel", (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    adjustModalTreeZoom(event.deltaY < 0 ? "in" : "out");
  }, { passive: false });

  function toggleTreeNode(toggle) {
    const kids = toggle?.closest(".tnode")?.querySelector(":scope > .tkids");
    if (!kids) return;
    const open = kids.hidden;
    kids.hidden = !open;
    toggle.textContent = open ? "▾" : "▸";
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Свернуть рецепт" : "Развернуть рецепт");
    SND.play(open ? "open" : "close");
  }

  function setTreeNodes(surface, open) {
    if (!surface) return;
    surface.querySelectorAll(".tnode").forEach((node) => {
      const kids = node.querySelector(":scope > .tkids");
      const toggle = node.querySelector(":scope > .tnode-card > .ttoggle[data-toggle]");
      if (!kids || !toggle) return;
      kids.hidden = !open;
      toggle.textContent = open ? "▾" : "▸";
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Свернуть рецепт" : "Развернуть рецепт");
    });
    SND.play(open ? "open" : "close");
  }

  function treeNodeHTML(name, depth, seen, count, idx = 0) {
    const info = ingredientInfo(name);
    const key = normalizeArtName(name);
    const recipe = info.recipe;
    const kids = recipe && recipe.ings.length ? recipe.ings : [];
    const path = seen || new Set();
    const cyclic = path.has(key);
    const nextPath = new Set(path);
    if (!cyclic) nextPath.add(key);
    const tooDeep = depth >= TREE_MAX_DEPTH;
    const showKids = !cyclic && kids.length > 0 && !tooDeep;
    const art = info.art
      ? `<img src="${escAttr(info.art)}" alt="" loading="lazy" decoding="async" />`
      : (info.remoteArt
        ? `<img class="remote" src="${escAttr(info.remoteArt)}" alt="" loading="lazy" decoding="async" />`
        : unavailableArt("mat"));
    const linkName = info.catName || info.en || name;
    const linkHref = info.vanilla
      ? `https://terraria.wiki.gg/wiki/${encodeURIComponent(info.en || name).replace(/%20/g, "_")}`
      : `#/items?s=${encodeURIComponent(linkName)}`;
    const catItem = catalogByName(name);
    const nodeSources = catItem ? (NPC_SOURCES[catItem.id] || null) : null;
    const nodeDrops = npcSourceLines(nodeSources);
    const recipeYield = Math.max(1, Number(recipe?.yield || 1));
    const srcLine = recipe
      ? `${recipeYield > 1 ? `крафт даёт ×${craftAmount(recipeYield)}` : "крафт"}${recipe.station ? ` · ${esc(ruText(recipe.station))}` : " без отдельной станции"}`
      : (info.obtain ? esc(info.obtain.replace(/\s*[·•].*$/, "")) : "получение без крафта");
    const stationIcon = recipe && recipe.station
      ? `<img class="tstation" src="${escAttr(craftStationSprite(recipe.station))}" alt="" loading="lazy" decoding="async" />`
      : "";
    const kidsHTML = showKids
      ? `<div class="tkids" hidden>${kids.map((k, i) => treeNodeHTML(k.key || k.name, depth + 1, nextPath, k.count, i)).join("")}</div>`
      : "";
    const moreHTML = kids.length > 0 && tooDeep
      ? `<div class="tmore">рецепт уходит глубже — открой предмет в полном каталоге</div>`
      : "";
    return `
    <div class="tnode${cyclic ? " cyclic" : ""}${showKids ? " has-kids" : ""}">
      <div class="tnode-card" data-ing="${escAttr(name)}" role="button" tabindex="0" aria-label="Открыть сведения и дерево: ${escAttr(info.ru)}" style="--d:${idx}">
        <span class="slot tslot">${art}</span>
        <span class="tinfo">
          <b>${esc(info.ru)}</b>
          ${info.en ? `<small>${esc(info.en)}</small>` : ""}
        </span>
        <span class="tnode-divider" aria-hidden="true"><i></i><em>◆</em><i></i></span>
        <span class="tmeta">
          ${count ? `<em class="tcount">×${esc(count)}</em>` : ""}
          ${stationIcon}
          <span class="tsrc" title="${escAttr(srcLine)}">${srcLine}</span>
          <a class="tlink" href="${escAttr(linkHref)}"${info.vanilla ? " target=\"_blank\" rel=\"noopener noreferrer\"" : ""} title="${info.vanilla ? "Открыть страницу Terraria wiki" : "Открыть в полном каталоге"}" aria-label="Открыть ${escAttr(info.ru)}">↗</a>
        </span>
        ${nodeDrops ? `<span class="tnode-divider src-div" aria-hidden="true"><i></i><em>◆</em><i></i></span><span class="tnode-src">${nodeDrops}</span>` : ""}
        <button class="ttoggle" type="button" ${showKids ? 'data-toggle aria-expanded="false" aria-label="Развернуть рецепт"' : (cyclic ? 'disabled aria-hidden="true"' : 'disabled aria-hidden="true"')}>${showKids ? "▸" : (cyclic ? "↺" : "")}</button>
      </div>
      ${kidsHTML}${moreHTML}
    </div>`;
  }

  function renderTree(name) {
    if (!treeModal || !treeBody) return;
    treeCurrent = name;
    const info = ingredientInfo(name);
    const rootImg = document.getElementById("tree-root-img");
    const rootFallback = document.getElementById("tree-root-art-fallback");
    const rootName = document.getElementById("tree-root-name");
    const rootSub = document.getElementById("tree-root-sub");
    const rootDesc = document.getElementById("tree-root-desc");
    const rootSrc = document.getElementById("tree-root-src");
    const rootLive = document.getElementById("tree-root-live");
    if (rootImg) {
      rootImg.alt = info.ru || "Предмет";
      rootImg.hidden = false;
      rootImg.onerror = () => {
        rootImg.hidden = true;
        if (rootFallback) rootFallback.hidden = false;
      };
      if (info.art) rootImg.src = info.art;
      else if (info.remoteArt) rootImg.src = info.remoteArt;
      else {
        rootImg.removeAttribute("src");
        rootImg.hidden = true;
        if (rootFallback) rootFallback.hidden = false;
      }
      if (rootFallback && (info.art || info.remoteArt)) rootFallback.hidden = true;
    }
    if (rootName) rootName.textContent = info.ru;
    if (rootSub) rootSub.textContent = info.en ? `в игре: ${info.en}` : "";
    if (rootDesc) {
      rootDesc.textContent = [
        info.desc ? ruText(info.desc) : "",
        info.used ? `Зачем: ${ruText(info.used)}` : "",
        info.when ? `Когда: ${ruText(info.when)}` : ""
      ].filter(Boolean).join(" · ");
    }
    if (rootSrc) {
      let line = "";
      if (info.recipe && info.recipe.ings.length) {
        line = "рецепт: " + info.recipe.ings.map((i) => (i.count ? `${i.count} × ${ingredientInfo(i.key || i.name).ru}` : ingredientInfo(i.key || i.name).ru)).join(" + ") + (info.recipe.station ? ` · ${craftStationInline(info.recipe.station)}` : "");
      } else if (info.obtain) {
        line = isGenericObtainText(info.obtain)
          ? "Точный источник проверяется по официальной wiki ниже."
          : info.obtain.replace(/\s*[·•].*$/, "").trim();
      }
      rootSrc.textContent = line;
      rootSrc.title = line;
    }
    if (rootLive) {
      rootLive.classList.remove("loaded", "failed");
      const sourceProfile = !info.recipe ? officialWikiProfile(info) : null;
      rootLive.hidden = !sourceProfile;
      const liveLabel = rootLive.querySelector("small");
      const liveText = rootLive.querySelector("p");
      if (liveLabel) liveLabel.textContent = `${sourceProfile?.label || "официальная wiki"} · проверяем источник…`;
      if (liveText) liveText.textContent = "Ищем конкретный способ получения, противника, структуру, магазин или условие появления.";
      if (!rootLive.hidden) enrichWikiSource(rootLive.parentElement, info);
    }
    const backBtn = document.getElementById("tree-back");
    if (backBtn) backBtn.disabled = treeStack.length === 0;
    const seen = new Set();
    treeBody.innerHTML = treeNodeHTML(name, 0, seen);
    bindSprites(treeBody);
    linkifyMobMentions(treeBody);
    applyModalTreeZoom();
  }

  function openCraftTree(name) {
    const target = String(name || "").trim();
    if (!treeModal || !target) return;
    if (!catalogDataReady()) {
      toast("Загружаем рецепты…", "◆");
      ensureCatalogData().then((ready) => {
        if (ready) openCraftTree(target);
        else toast("Не удалось загрузить каталог", "!");
      });
      return;
    }
    // Новый запуск из карточки — новая ветка, а не продолжение истории
    // закрытого дерева. История сохраняется только внутри текущей модалки.
    if (treeModal.hidden) {
      treePreviousFocus = document.activeElement && typeof document.activeElement.focus === "function" ? document.activeElement : null;
      treeStack = [];
      treeCurrent = "";
    }
    if (treeCurrent && normalizeArtName(treeCurrent) !== normalizeArtName(target)) {
      treeStack.push(treeCurrent);
    }
    rememberCraftRoot(target);
    renderTree(target);
    treeModal.hidden = false;
    document.body.classList.add("tree-open");
    setElementInert(shellEl, true);
    setElementInert(mobileTabs, true);
    setElementInert(toTop, true);
    SND.play("open");
    if (liveRegion) liveRegion.textContent = `Открыто дерево крафта: ${ingredientInfo(target).ru}`;
    const close = document.getElementById("tree-close");
    if (close) close.focus();
  }

  function closeCraftTree(options = {}) {
    if (!treeModal) return;
    const { restoreFocus = true, playSound = true } = options;
    const wasOpen = !treeModal.hidden;
    treeModal.hidden = true;
    document.body.classList.remove("tree-open");
    setElementInert(shellEl, false);
    setElementInert(mobileTabs, false);
    setElementInert(toTop, false);
    if (playSound && wasOpen) SND.play("close");
    const restore = treePreviousFocus;
    treePreviousFocus = null;
    if (restoreFocus && wasOpen && restore) requestAnimationFrame(() => restore.focus({ preventScroll: true }));
  }

  if (treeModal) {
    treeModal.addEventListener("click", (e) => {
      if (e.target.closest("[data-tree-close]")) { closeCraftTree(); return; }
      const zoom = e.target.closest("button[data-modal-tree-zoom]");
      if (zoom) { adjustModalTreeZoom(zoom.dataset.modalTreeZoom || "reset"); return; }
      const t = e.target.closest("[data-toggle]");
      if (t) {
        const kids = t.closest(".tnode")?.querySelector(":scope > .tkids");
        if (!kids) return;
        const open = kids.hidden;
        kids.hidden = !open;
        t.textContent = open ? "▾" : "▸";
        t.setAttribute("aria-expanded", String(open));
        t.setAttribute("aria-label", open ? "Свернуть рецепт" : "Развернуть рецепт");
        SND.play(open ? "open" : "close");
        return;
      }
      const ing = e.target.closest("[data-ing]");
      if (ing) {
        if (e.target.closest("a")) return; // ↗ ведёт в каталог штатно
        if (e.target.closest(".npc-tip")) return; // имя моба — его карточка
        const ingName = ing.dataset.ing || "";
        if (treeCurrent && normalizeArtName(ingName) === normalizeArtName(treeCurrent)) {
          // клик по карточке корня — развернуть/свернуть его ветку
          const rootNode = treeBody.querySelector(":scope > .tnode");
          const kids = rootNode ? rootNode.querySelector(":scope > .tkids") : null;
          const toggle = rootNode ? rootNode.querySelector(":scope > .tnode-card > .ttoggle[data-toggle]") : null;
          if (kids && toggle) {
            const open = kids.hidden;
            kids.hidden = !open;
            toggle.textContent = open ? "▾" : "▸";
            toggle.setAttribute("aria-expanded", String(open));
            SND.play(open ? "open" : "close");
          }
          return;
        }
        openCraftTree(ingName);
        e.preventDefault();
      }
    });
    treeModal.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && ["+", "=", "-", "0"].includes(e.key)) {
        e.preventDefault();
        adjustModalTreeZoom(e.key === "0" ? "reset" : e.key === "-" ? "out" : "in");
        return;
      }
      if (e.key === "Tab") {
        trapFocus(e, treePanel);
        return;
      }
      if ((e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest("[data-ing]")) {
        e.preventDefault();
        openCraftTree(e.target.closest("[data-ing]").dataset.ing || "");
      }
    });
    const setAllNodes = (open) => {
      treeBody.querySelectorAll(".tnode").forEach((node) => {
        const kids = node.querySelector(":scope > .tkids");
        const toggle = node.querySelector(":scope > .tnode-card > .ttoggle[data-toggle]");
        if (!kids || !toggle) return;
        kids.hidden = !open;
        toggle.textContent = open ? "▾" : "▸";
        toggle.setAttribute("aria-expanded", String(open));
        toggle.setAttribute("aria-label", open ? "Свернуть рецепт" : "Развернуть рецепт");
      });
      SND.play(open ? "open" : "close");
    };
    const expandAll = document.getElementById("tree-expand");
    const collapseAll = document.getElementById("tree-collapse");
    if (expandAll) expandAll.onclick = () => setAllNodes(true);
    if (collapseAll) collapseAll.onclick = () => setAllNodes(false);
    const backBtn = document.getElementById("tree-back");
    if (backBtn) backBtn.onclick = () => {
      const prev = treeStack.pop();
      if (prev) {
        renderTree(prev);
        SND.play("select");
      }
    };
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-tree]");
    if (!btn) return;
    e.preventDefault();
    openCraftTree(btn.dataset.tree || "");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    if (e.target.closest && e.target.closest("#tree-modal")) return;
    const ing = e.target.closest && e.target.closest(".ing");
    if (ing) {
      e.preventDefault();
      openCraftTree(ing.dataset.ing || "");
    }
  });

  function syncConnectionStatus() {
    const status = document.getElementById("connection-status");
    const label = status?.querySelector("[data-connection-label]");
    const offline = navigator.onLine === false;
    status?.classList.toggle("offline", offline);
    if (label) label.textContent = offline ? "офлайн-режим активен" : "каталог доступен офлайн";
  }
  addEventListener("online", syncConnectionStatus);
  addEventListener("offline", syncConnectionStatus);
  syncConnectionStatus();

  const installButton = document.getElementById("install-app");
  let installPrompt = null;
  addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  if (installButton) installButton.onclick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
    if (choice?.outcome === "accepted") toast("Кодекс установлен как приложение", "⊕");
  };
  addEventListener("appinstalled", () => {
    installPrompt = null;
    if (installButton) installButton.hidden = true;
  });

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    const controlledAtBoot = Boolean(navigator.serviceWorker.controller);
    let refreshingForRelease = false;
    if (controlledAtBoot) {
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshingForRelease) return;
        refreshingForRelease = true;
        location.reload();
      });
    }
    addEventListener("load", () => {
      navigator.serviceWorker.register(`sw.js?v=${ASSET_VERSION}`, { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => {
        // Сайт остаётся обычным статическим приложением, если SW запрещён.
      });
    }, { once: true });
  }

  addEventListener("popstate", () => { restoreScrollOnNextRoute = true; });
  addEventListener("hashchange", () => {
    if (lastScrollKey) routeScrollPositions.set(lastScrollKey, scrollY);
    if (routeScrollPositions.size > 120) routeScrollPositions.delete(routeScrollPositions.keys().next().value);
    SND.play("tick");
    route();
  });
  route();

  /* Восстановление режима мести из сохранения */
  if (store.get().revengeance) {
    syncRevengeanceUI(true);
    FX.set("fire");
  }

  /* ---------- Лёгкий режим: слабые ПК и плохой интернет ---------- */
  function applyLiteMode(on, { save = true, notify = false, auto = false } = {}) {
    document.body.classList.toggle("lite", Boolean(on));
    document.querySelectorAll("[data-lite-toggle]").forEach((button) => {
      button.setAttribute("aria-pressed", String(Boolean(on)));
      button.classList.toggle("on", Boolean(on));
      const stateEl = button.querySelector("[data-lite-state]");
      if (stateEl) stateEl.textContent = on ? "вкл" : "выкл";
    });
    if (save) store.set({ liteMode: Boolean(on) });
    FX.sync?.();
    if (notify) {
      toast(on
        ? (auto ? "Обнаружено слабое устройство или медленная сеть — включён лёгкий режим" : "Лёгкий режим включён: эффекты и фоновая сеть отключены")
        : "Лёгкий режим выключен: полный визуал возвращён", on ? "⚡" : "✦");
      if (liveRegion) { liveRegion.textContent = ""; requestAnimationFrame(() => { liveRegion.textContent = on ? "Лёгкий режим включён" : "Лёгкий режим выключен"; }); }
    }
  }
  function detectWeakDevice() {
    const connection = navigator.connection || {};
    if (connection.saveData === true) return true;
    if (/(?:^|-)2g$/i.test(connection.effectiveType || "")) return true;
    if (typeof connection.downlink === "number" && connection.downlink > 0 && connection.downlink < 1.2) return true;
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) return true;
    // Малое число ядер учитываем только вместе с реально известной памятью:
    // тестовые среды и старые браузеры занижают hardwareConcurrency.
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2
      && typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) return true;
    return false;
  }
  {
    const saved = store.get().liteMode;
    if (saved === true) applyLiteMode(true, { save: false });
    else if (saved === undefined && detectWeakDevice()) applyLiteMode(true, { save: true, notify: true, auto: true });
    document.querySelectorAll("[data-lite-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const next = !document.body.classList.contains("lite");
        applyLiteMode(next, { notify: true });
        SND.play(next ? "snap" : "chime");
      });
    });
  }

  /* Световой курсор: мягкое золотое пятно следует за мышью (только точный
     указатель, без reduced-motion). Один rAF, только transform — компоузер. */
  (() => {
    if (!window.matchMedia) return;
    if (!matchMedia("(pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(glow);
    let x = innerWidth / 2, y = innerHeight / 3, raf = 0;
    const paint = () => { raf = 0; glow.style.transform = `translate3d(${x - 320}px, ${y - 320}px, 0)`; };
    addEventListener("pointermove", (event) => {
      x = event.clientX; y = event.clientY;
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
    paint();
  })();

  /* Тактильная золотая рябь на кнопках и чипах (одноразовая анимация) */
  document.addEventListener("click", (e) => {
    if (document.body.classList.contains("lite")) return;
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const control = e.target.closest && e.target.closest(".btn, .chip, .mini, .mode-btn, .qmap-continue, .boss-defeat-btn");
    if (!control) return;
    const rect = control.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "tap-ripple";
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${(e.clientX || rect.left + rect.width / 2) - rect.left - size / 2}px`;
    ripple.style.top = `${(e.clientY || rect.top + rect.height / 2) - rect.top - size / 2}px`;
    control.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  });
})();
