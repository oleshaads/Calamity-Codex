(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const searchInput = $("#global-search");
  const searchPanel = $("#search-panel");
  const nav = $("#main-nav");
  const routeTitle = $("#route-title");
  const liveRegion = $("#live-region");
  const menuButton = $("#menu-btn");
  const ROUTE_RU = {
    home: "Главная",
    novice: "Путь новичка",
    wiki: "Справочник",
    bosses: "Боссы",
    items: "Предметы",
    favorites: "Избранное",
    lex: "Словарь",
    crafts: "Крафты",
    biomes: "Биомы"
  };
  let lastView = "";
  const SECTION_THEMES = {
    wiki:      { eyebrow: "Архив исследователя", mark: "✦", no: "I",   cover: "assets/headers/wiki.webp",      bg: "assets/themes/mushroom.jpg",  accent: "#8ebbe0", fx: "dust" },
    bosses:    { eyebrow: "Бестиарий Каламити", mark: "☠", no: "II",  cover: "assets/headers/bosses.webp",    bg: "assets/themes/brimstone.jpg", accent: "#f06c73", fx: "fire" },
    items:     { eyebrow: "Арсенал героя",      mark: "◆", no: "III", cover: "assets/headers/items.webp",     bg: "assets/themes/desert.jpg",    accent: "#68d8c9", fx: "sparks" },
    favorites: { eyebrow: "Личная коллекция",    mark: "★", no: "IV",  cover: "assets/headers/favorites.webp", bg: "assets/themes/dungeon.jpg",   accent: "#efc66e", fx: "stars" },
    lex:       { eyebrow: "Язык этого мира",     mark: "A", no: "V",   cover: "assets/headers/lex.webp",       bg: "assets/themes/sea.jpg",       accent: "#c997e8", fx: "spores" },
    crafts:    { eyebrow: "Кузница и алхимия",   mark: "⚒", no: "VI",  cover: "assets/headers/crafts.webp",    bg: "assets/themes/hell.jpg",      accent: "#eea85b", fx: "embers" },
    biomes:    { eyebrow: "Атлас мира",           mark: "⌖", no: "VII", cover: "assets/headers/biomes.webp",    bg: "assets/themes/forest.jpg",    accent: "#91d47f", fx: "leaves" }
  };
  const KIND_RU = {
    weapon: "Оружие", armor: "Броня", acc: "Аксессуары", ammo: "Боеприпасы",
    tool: "Инструменты", mat: "Материалы", summon: "Призываемое", potion: "Расходники", misc: "Прочее"
  };
  const CLS_RU = { melee: "Воин", ranged: "Стрелок", mage: "Маг", summoner: "Призыватель", rogue: "Плут", all: "Все классы" };
  const ITEM_INDEX = window.CALAMITY_ITEM_INDEX || { modVersion: CODEX.version, groups: [], items: [] };
  const ITEM_GROUPS = new Map((ITEM_INDEX.groups || []).map(([id, label, kind, cls, count]) => [id, { id, label, kind, cls, count }]));
  const ITEM_KIND_MARK = { weapon: "⚔", armor: "◈", acc: "◇", ammo: "➶", tool: "⚒", mat: "◆", summon: "✦", potion: "⚗", misc: "▦" };
  const CATALOG_PAGE_SIZE = 96;
  let indexedItemsCache = null;
  let detailedNameCache = null;

  function indexedItems() {
    if (indexedItemsCache) return indexedItemsCache;
    indexedItemsCache = (ITEM_INDEX.items || []).map(([name, groupId, id, tooltip, image, obtain, stage, description]) => {
      const group = ITEM_GROUPS.get(groupId) || { label: "Предмет", kind: "misc", cls: "all" };
      return {
        name, id, groupId, group: group.label, kind: group.kind, cls: group.cls,
        tooltip: tooltip || "", description: description || "", image: Boolean(image),
        obtain: obtain || "", stage: Number(stage || 0)
      };
    });
    return indexedItemsCache;
  }

  function detailedNameMap() {
    if (detailedNameCache) return detailedNameCache;
    detailedNameCache = new Map();
    (CODEX.items || []).forEach((item) => {
      const lex = CODEX.lookup ? CODEX.lookup(item.name) : null;
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
    if (view === "favorites") {
      const saved = getFavorites();
      return [[saved.item.size + saved.boss.size + saved.craft.size, "в рюкзаке"], [3, "коллекции"]];
    }
    if (view === "lex") return [[Object.keys(CODEX.lex || {}).length, "терминов"], ["RU / EN", "названия"]];
    if (view === "crafts") return [[CODEX.crafts.length, "рецептов"], [new Set(CODEX.crafts.map((craft) => craft.stage || "Прочее")).size, "этапов"]];
    if (view === "biomes") return [[CODEX.biomes.length, "биомов"], [4, "уровня риска"]];
    return [];
  }
  const mast = (title, lead) => {
    const view = document.body.dataset.view || "wiki";
    const theme = SECTION_THEMES[view] || SECTION_THEMES.wiki;
    const cover = new URL(theme.cover, document.baseURI).href;
    const facts = sectionFacts(view);
    return `
      <header class="page-head" style="--page-cover:url('${cover}');--page-accent:${theme.accent}">
        <div class="page-head-art" aria-hidden="true"></div>
        <div class="page-head-copy">
          <small><i aria-hidden="true"></i>${theme.eyebrow}</small>
          <h1>${esc(title)}</h1>
          <p>${esc(lead)}</p>
          <div class="page-head-facts" aria-label="Краткая сводка">
            ${facts.map(([value, label]) => `<span><b>${esc(value)}</b><em>${esc(label)}</em></span>`).join("")}
          </div>
        </div>
        <div class="page-head-sigil" aria-hidden="true"><span>${theme.mark}</span><i>${theme.no}</i></div>
        <div class="page-head-coordinate" aria-hidden="true">CALAMITY // CODEX // ${theme.no}</div>
      </header>`;
  };
  const shelf = (title, count, inner, open = false) => `
    <details class="shelf"${open ? " open" : ""}>
      <summary>
        <i class="shelf-plus" aria-hidden="true"></i>
        <span class="shelf-t">${title}</span>
        ${count != null && count !== "" ? `<span class="shelf-n">${count}</span>` : ""}
      </summary>
      <div class="shelf-body">${inner}</div>
    </details>`;

  const tt = document.getElementById("tt");
  const fillTT = (info) => {
    if (!tt || !info) return;
    tt.innerHTML = `
      <div class="tt-type">${info.type}</div>
      <div class="tt-ru">${info.ru}</div>
      <div class="tt-en">${info.en}</div>
      <p>${info.desc}</p>
      ${info.where ? `<p><b>Где взять / где это</b> — ${info.where}</p>` : ""}
      ${info.craft ? `<p><b>Крафт</b> — ${info.craft}</p>` : ""}
      ${info.used ? `<p><b>Зачем</b> — ${info.used}</p>` : ""}
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
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest && e.target.closest(".tip");
    if (!el || !tt) return;
    const info = CODEX.lex && CODEX.lex[el.dataset.id];
    if (!info) return;
    fillTT(info);
    tt.hidden = false;
    placeTT(el);
  });
  document.addEventListener("mouseout", (e) => {
    const el = e.target.closest && e.target.closest(".tip");
    if (!el || !tt) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    tt.hidden = true;
  });
  document.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest(".tip");
    if (!el || !tt) return;
    const info = CODEX.lex && CODEX.lex[el.dataset.id];
    if (!info) return;
    if (!tt.hidden && tt.dataset.id === el.dataset.id) { tt.hidden = true; return; }
    fillTT(info);
    tt.dataset.id = el.dataset.id;
    tt.hidden = false;
    placeTT(el);
    e.preventDefault();
  });

  const store = {
    get() { try { return JSON.parse(localStorage.getItem("calamity-codex") || "{}"); } catch { return {}; } },
    set(p) {
      try { localStorage.setItem("calamity-codex", JSON.stringify({ ...store.get(), ...p })); }
      catch { /* The guide still works when private storage is unavailable. */ }
    }
  };

  const FAVORITE_TYPES = { item: "Предмет", boss: "Босс", craft: "Рецепт" };
  const favoriteValues = (value) => Array.isArray(value) ? value : [];
  let favoriteCache = null;
  function getFavorites() {
    if (favoriteCache) return favoriteCache;
    const raw = store.get().favorites || {};
    favoriteCache = {
      item: new Set(favoriteValues(raw.item).map(String)),
      boss: new Set(favoriteValues(raw.boss).map(String)),
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
    announce(`${FAVORITE_TYPES[type]} ${removing ? "удалён из избранного" : "добавлен в избранное"}`);
  }
  function favoriteButton(type, key, label) {
    const saved = getFavorites()[type]?.has(String(key));
    const action = saved ? "Удалить из избранного" : "Добавить в избранное";
    return `<button class="favorite-btn ${saved ? "saved" : ""}" type="button" data-favorite-type="${type}" data-favorite-key="${escAttr(key)}" aria-pressed="${saved}" aria-label="${action}: ${escAttr(label)}" title="${action}"><span aria-hidden="true">${saved ? "★" : "☆"}</span></button>`;
  }

  function announce(message) {
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
    const journey = document.querySelector(".journey-mini");
    if (count) count.textContent = `${percent}%`;
    if (railLabel) railLabel.textContent = `${done.size} / ${total}`;
    if (railFill) railFill.style.width = `${percent}%`;
    if (journey && current) journey.href = `#/novice?q=${current.id}`;
    return { done, total, percent, current };
  }

  /* ---------- themed particles ---------- */
  const FX = (() => {
    const c = $("#embers");
    if (!c) return { set() {} };
    const ctx = c.getContext("2d");
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!ctx || reduceMotion) return { set() {} };
    let w, h, dots = [], mode = "embers";
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
    const spawn = () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.2 + 0.4,
      s: Math.random() * 0.7 + 0.12,
      a: Math.random() * 0.5 + 0.12,
      vx: (Math.random() - 0.5) * 0.6,
      t: Math.random() * 100,
      c: (pal[mode] || pal.embers)[Math.random() < 0.6 ? 0 : 1]
    });
    const resize = () => {
      w = c.width = innerWidth; h = c.height = innerHeight;
      dots = Array.from({ length: 36 }, spawn);
    };
    resize();
    addEventListener("resize", resize);
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      dots.forEach((d) => {
        d.t += 0.02;
        if (mode === "bubbles") { d.y -= d.s; d.x += Math.sin(d.t) * 0.4; }
        else if (mode === "snow" || mode === "spores" || mode === "pollen" || mode === "leaves") {
          d.y += d.s * 0.55; d.x += Math.sin(d.t) * 0.8 + d.vx;
        } else if (mode === "sand") { d.y += d.s * 0.3; d.x += d.s * 1.4; }
        else if (mode === "drip" || mode === "acid") { d.y += d.s * 1.4; }
        else if (mode === "warp") { d.x += d.vx * 4; d.y += Math.sin(d.t) * 0.4; }
        else { d.y -= d.s; d.x += Math.sin(d.y * 0.01) * 0.25; }
        if (d.y < -8) d.y = h + 8;
        if (d.y > h + 8) d.y = -8;
        if (d.x < -8) d.x = w + 8;
        if (d.x > w + 8) d.x = -8;
        ctx.beginPath();
        ctx.fillStyle = `rgba(${d.c},${d.a})`;
        if (mode === "warp") {
          ctx.fillRect(d.x, d.y, 10 + d.s * 8, 1);
        } else if (mode === "leaves") {
          ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.t);
          ctx.fillRect(-d.r, -d.r / 2, d.r * 2, d.r); ctx.restore();
        } else {
          ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        }
      });
      requestAnimationFrame(tick);
    };
    tick();
    return {
      set(name) {
        mode = name || "embers";
        dots.forEach((d) => { d.c = (pal[mode] || pal.embers)[Math.random() < 0.6 ? 0 : 1]; });
      }
    };
  })();

  function fillRail(html) {
    const extra = document.getElementById("rail-extra");
    if (extra) extra.innerHTML = html || "";
  }

  function applyTheme(q) {
    const accent = (q && q.accent) || "#e8b84a";
    const fx = (q && q.fx) || "embers";
    document.body.style.setProperty("--accent", accent);
    const themeImage = q && q.bg ? new URL(q.bg, document.baseURI).href : "";
    document.body.style.setProperty("--theme-image", themeImage ? `url("${themeImage}")` : "none");
    document.body.style.setProperty("--theme-filter", (q && q.filter) || "none");
    document.body.dataset.fx = fx;
    FX.set(fx);
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

  function route() {
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

    nav.classList.remove("open");
    document.getElementById("rail")?.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
    const scrim = document.getElementById("rail-scrim");
    if (scrim) scrim.hidden = true;
    searchPanel.classList.add("hidden");

    if (view === "home") { applyTheme(null); renderHome(); }
    else if (view === "novice") renderNovice(Number(params.q) || store.get().quest || 1);
    else if (view === "wiki") { applySectionTheme(view); renderWiki(params); }
    else if (view === "bosses") { applySectionTheme(view); renderBosses(params); }
    else if (view === "crafts") { applySectionTheme(view); renderCrafts(params.q || ""); }
    else if (view === "items") { applySectionTheme(view); renderItems(params); }
    else if (view === "favorites") { applySectionTheme(view); renderFavorites(); }
    else if (view === "lex") { applySectionTheme(view); renderLex(params); }
    else if (view === "biomes") { applySectionTheme(view); renderBiomes(); }

    if (viewChanged) {
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
    } else if (focusedId) {
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
    const progress = updateJourneyProgress();
    const current = progress.current || CODEX.quests[0];
    const currentHref = `#/novice?q=${current.id}`;
    const modeLabel = progress.done.size ? "Продолжить путь" : "Начать приключение";
    app.innerHTML = `
      <section class="hero">
        <div class="hero-bg"></div>
        <div class="hero-inner">
          <div class="kicker">Terraria · Calamity ${CODEX.version}</div>
          <h1>Каламити<span>Кодекс</span></h1>
          <p class="lede">Интерактивный путеводитель по огромному миру Calamity. Пройди мод шаг за шагом или найди нужный предмет за несколько секунд.</p>
          <div class="hero-actions">
            <a class="btn btn-lg" href="${currentHref}"><span class="btn-icon">⚔</span>${modeLabel}</a>
            <a class="btn btn-lg ghost" href="#/wiki">Открыть справочник <span aria-hidden="true">→</span></a>
          </div>
          <div class="hero-trust">
            <span><i>◆</i> ${CODEX.quests.length} этапов прогрессии</span>
            <span><i>◆</i> Работает офлайн</span>
            <span><i>◆</i> Прогресс сохраняется</span>
          </div>
        </div>
        <div class="hero-visual" aria-hidden="true">
          <div class="crest-card">
            <img class="crest-scene" src="assets/crest.jpg" alt="" width="900" height="1100" />
            <img class="crest-emblem" src="assets/emblem.png" alt="Calamity" width="704" height="384" />
            <div class="crest-content">
              <small>Текущая глава · ${String(current.id).padStart(2, "0")}</small>
              <h2>${esc(current.title)}</h2>
              <p>${esc(current.subtitle)}</p>
              <div class="crest-progress"><i style="width:${progress.percent}%"></i></div>
            </div>
          </div>
          <div class="hero-rune">${progress.percent}%</div>
        </div>
      </section>

      <section class="home-strip">
        <div class="home-section-head">
          <div><small>Выбери свой маршрут</small><h2>Как будем играть?</h2></div>
          <p>Два режима для разного опыта. В любой момент можно переключиться между прохождением и базой знаний.</p>
        </div>
        <div class="mode-grid">
          <a class="mode-card" href="${currentHref}">
            <img src="assets/novice.jpg" alt="" />
            <span class="tag">Пошаговое прохождение</span>
            <h2>${progress.done.size ? `Продолжить с главы ${current.id}` : "Начать с нуля"}</h2>
            <p>Тридцать понятных квестов: куда идти, что собрать, что скрафтить и кого победить. Чеклисты и выбор класса внутри.</p>
            <span class="mode-arrow" aria-hidden="true">→</span>
          </a>
          <a class="mode-card" href="#/wiki">
            <img src="assets/veteran.jpg" alt="" />
            <span class="tag">Быстрый доступ</span>
            <h2>База знаний</h2>
            <p>Боссы, броня, материалы, рецепты и биомы без длинных статей — только то, что нужно прямо сейчас.</p>
            <span class="mode-arrow" aria-hidden="true">→</span>
          </a>
        </div>

        <div class="stat-row" aria-label="Содержимое кодекса">
          <div class="stat"><b>${CODEX.quests.length}</b><span>глав приключения</span></div>
          <div class="stat"><b>${indexedItems().length.toLocaleString("ru-RU")}</b><span>предметов в индексе</span></div>
          <div class="stat"><b>${CODEX.bosses.length}</b><span>боссов</span></div>
          <div class="stat"><b>${CODEX.crafts.length}</b><span>рецепт крафта</span></div>
        </div>

        <section class="journey-dashboard" aria-labelledby="journey-title">
          <div class="journey-dashboard-copy">
            <small>${progress.done.size >= progress.total ? "Путешествие завершено" : `Следующая глава · ${String(current.id).padStart(2, "0")}`}</small>
            <h2 id="journey-title">${progress.done.size >= progress.total ? "Кодекс покорён" : esc(current.title)}</h2>
            <p>${progress.done.size >= progress.total ? "Все главы отмечены. Можно вернуться к любому этапу, сменить класс или собрать личный рюкзак избранного." : esc(current.subtitle)}</p>
            <a class="btn ghost" href="${currentHref}">${progress.done.size >= progress.total ? "Открыть главы" : "Продолжить главу"} <span aria-hidden="true">→</span></a>
          </div>
          <div class="journey-dashboard-progress">
            <div class="journey-score"><strong>${progress.percent}%</strong><span><b>${progress.done.size}</b> из ${progress.total} глав завершено</span></div>
            <div class="journey-track" role="progressbar" aria-label="Прогресс прохождения" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}"><i style="width:${progress.percent}%"></i></div>
            <div class="journey-nodes" aria-label="Карта завершённых глав">${CODEX.quests.map((quest) => `<a href="#/novice?q=${quest.id}" class="${progress.done.has(quest.id) ? "done" : ""} ${quest.id === current.id ? "current" : ""}" aria-label="Глава ${quest.id}: ${escAttr(quest.title)}" title="Глава ${quest.id}: ${escAttr(quest.title)}"><span>${quest.id}</span></a>`).join("")}</div>
          </div>
        </section>

        <div class="home-section-head">
          <div><small>Архив искателя</small><h2>Быстрый доступ</h2></div>
          <p>Каждая запись короткая и практичная: где найти, когда использовать и почему это важно.</p>
        </div>
        <div class="jump-grid">
          <a class="jump" href="${currentHref}"><span class="jump-icon">⚑</span><span><small>Пошагово</small><b>Путь новичка</b></span><i>→</i></a>
          <a class="jump" href="#/bosses"><span class="jump-icon">☠</span><span><small>По порядку</small><b>Боссы</b></span><i>→</i></a>
          <a class="jump" href="#/items"><span class="jump-icon">◆</span><span><small>Где и зачем</small><b>Предметы</b></span><i>→</i></a>
          <a class="jump" href="#/crafts"><span class="jump-icon">⚒</span><span><small>Столы и ресурсы</small><b>Крафты</b></span><i>→</i></a>
          <a class="jump" href="#/biomes"><span class="jump-icon">⌖</span><span><small>Куда идти</small><b>Биомы</b></span><i>→</i></a>
          <a class="jump" href="#/lex"><span class="jump-icon">A</span><span><small>Термины мода</small><b>Словарь</b></span><i>→</i></a>
        </div>

        <div class="home-section-head">
          <div><small>Карта прогрессии</small><h2>Три эпохи мира</h2></div>
          <p>От первого деревянного меча до финальных испытаний за пределами Лунного лорда.</p>
        </div>
        <div class="era-grid">${CODEX.eras.map((e, i) => `<article class="era-card" data-index="0${i + 1}"><h3>${esc(e.title)}</h3><ol>${e.items.map((item) => `<li>${esc(item)}</li>`).join("")}</ol></article>`).join("")}</div>
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
  const plainName = (name) => {
    const lex = CODEX.lookup ? CODEX.lookup(name) : null;
    if (lex) {
      const ru = lex.ru || name;
      const en = lex.en && lex.en.toLowerCase() !== String(ru).toLowerCase() ? lex.en : "";
      return { ru, en };
    }
    const ru = CODEX.ru ? CODEX.ru(name) : name;
    const en = /[A-Za-z]/.test(String(name)) && String(name) !== ru ? name : "";
    return { ru, en };
  };
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
  function craftCard(c) {
    const src = c.t ? { name: c.t, ings: c.r, why: c.w, station: c.station } : c;
    const { ru, en } = plainName(src.name);
    const pulled = pullStation(src);
    const ings = splitIngs(pulled.ings);
    const why = String(src.why || "").trim();
    const station = pulled.station;
    return `<article class="craft-card">
      ${favoriteButton("craft", src.name, ru)}
      ${station ? `<div class="station-tag">${esc(station)}</div>` : ""}
      <b>${esc(ru)}${en ? `<span class="en-sub">в игре: ${esc(en)}</span>` : ""}</b>
      ${ings.length ? `<ul class="ings-list">${ings.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${why ? `<div class="item-foot"><div class="fact"><span>Зачем</span><p>${esc(why)}</p></div></div>` : ""}
    </article>`;
  }
  function biomeCard(b) {
    const title = b.name;
    const en = b.en || "";
    const loot = Array.isArray(b.loot) ? b.loot : String(b.loot || "").split(/,\s*/).filter(Boolean);
    const d = String(b.danger || "");
    const lvl = b.dangerLvl || (/смерт/i.test(d) ? "dead" : /высок/i.test(d) ? "high" : /средн/i.test(d) ? "mid" : "low");
    return `<article class="biome-card">
      <div class="shot" style="background-image:url('${b.img || "assets/hero.jpg"}');filter:${b.filter || "none"}">
        <span class="danger-pill ${lvl}">${esc(d)}</span>
      </div>
      <div class="body">
        <h3>${esc(title)}</h3>
        ${en ? `<span class="en-sub">в игре: ${esc(en)}</span>` : ""}
        ${b.desc ? `<p class="desc">${esc(b.desc)}</p>` : ""}
        <div class="item-foot">
          ${b.where ? `<div class="fact"><span>Где</span><p>${esc(b.where)}</p></div>` : ""}
          ${b.when ? `<div class="fact"><span>Когда</span><p>${esc(b.when)}</p></div>` : ""}
          ${loot.length ? `<div class="fact"><span>Лут</span><div class="loot-chips">${loot.map((x) => `<em>${esc(x)}</em>`).join("")}</div></div>` : ""}
          ${b.need ? `<div class="fact"><span>Бери</span><p>${esc(b.need)}</p></div>` : ""}
          ${b.tip ? `<div class="fact"><span>Совет</span><p>${esc(b.tip)}</p></div>` : ""}
        </div>
      </div>
    </article>`;
  }


  const SPRITE_FIX = {
    "Wooden Sword / Bow / Staff из мешка": "Wooden_Sword",
    "Hermes / Flurry / Sailfish / Dunerider Boots": "Hermes_Boots",
    "Cloud / Blizzard / Sandstorm in a Bottle": "Cloud_in_a_Bottle",
    "Wulfrum Hat & Goggles": "Wulfrum_Hat_and_Goggles",
    "Wulfrum Jacket": "Wulfrum_Jacket",
    "Wulfrum Overalls": "Wulfrum_Overalls",
    "Wulfrum Blade / Screwdriver": "Wulfrum_Blade",
    "Wulfrum Bow / Blunderbuss": "Wulfrum_Bow",
    "Wulfrum Prosthesis / Staff": "Wulfrum_Prosthesis",
    "Железная / свинцовая наковальня": "Iron_Anvil",
    "Кровать": "Bed",
    "Dubious Plating / Mysterious Circuitry": "Dubious_Plating",
    "Enchanted Sword / Terragrim": "Enchanted_Sword",
    "Worm Food / Bloody Spine": "Worm_Food",
    "Musket / The Undertaker": "Musket",
    "Vilethorn / Crimson Rod": "Vilethorn",
    "Ball O' Hurt / The Meatball": "Ball_O'_Hurt",
    "Bee Gun / Bee's Knees / Hive-Five": "Bee_Gun",
    "Muramasa / Aqua Scepter / Magic Missile / Handgun": "Muramasa",
    "Warrior / Ranger / Sorcerer / Summoner / Rogue Emblem": "Warrior_Emblem",
    "Cobalt / Palladium armor": "Cobalt_armor",
    "Frostspark / Lightning / Terraspark Boots": "Terraspark_Boots",
    "Soul of Sight / Might / Fright": "Soul_of_Sight",
    "Seedler / Pygmy Staff / Venus Magnum / Leaf Blower": "Seedler",
    "Tsunami / Razorblade Typhoon / Tempest Staff / Flairon": "Tsunami",
    "Empress оружия / Terraprisma": "Terraprisma",
    "Soaring Insignia / Wings Empress": "Soaring_Insignia",
    "Celestial Sigil / столбы": "Celestial_Sigil",
    "Solar / Vortex / Nebula / Stardust / Empyrean armor": "Solar_Flare_armor",
    "Mycoroot / Hyphae Rod / Fungicide": "Mycoroot",
    "Acid Gun / Toxibow": "Toxibow",
    "Slimy Saddle / Hook": "Slimy_Saddle",
    "Chlorophyte armor / оружие": "Chlorophyte_armor",
    "Plaguebringer / Plague Reaper armor": "Plaguebringer_armor",
    "God Slayer / Silva armor": "God_Slayer_armor"
  };
  function unavailableArt(kind = "misc") {
    const mark = ITEM_KIND_MARK[kind] || "·";
    return `<span class="sprite-unavailable" aria-label="Официальный спрайт не найден"><b aria-hidden="true">${esc(mark)}</b><small>нет спрайта</small></span>`;
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
    if (LEX_ART[name]) return LEX_ART[name];
    if (REFERENCE_ART[name]) return REFERENCE_ART[name];
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
      ? `<img class="item-art" src="${escAttr(src)}" alt="" loading="lazy" decoding="async" data-kind="${escAttr(kind)}">`
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
  const CATALOG_STAGE = [
    "По мере открытия соответствующего контента; проверь условие источника.",
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
    const detail = detailedNameMap().get(String(item.name).toLocaleLowerCase("ru"));
    const wikiTitle = encodeURIComponent(String(item.name).replace(/ /g, "_"));
    const wikiUrl = `https://calamitymod.wiki.gg/wiki/${wikiTitle}`;
    const classLabel = item.cls === "all" ? "Все классы" : (CLS_RU[item.cls] || item.cls);
    const detailName = detail && (detail.nameRu || detail.name);
    const purpose = catalogPurpose(item);
    const useWhen = CATALOG_STAGE[Math.min(Math.max(item.stage, 0), CATALOG_STAGE.length - 1)];
    const art = item.image
      ? `<img class="item-art" src="assets/item-sprites/${encodeURIComponent(item.id)}.png" alt="" loading="lazy" decoding="async" data-kind="${escAttr(item.kind || "mat")}">`
      : unavailableArt(item.kind);
    return `<article class="item-card has-art catalog-item-card" data-kind="${escAttr(item.kind)}">
      <div class="item-shot ${escAttr(item.cls)} ${escAttr(item.kind)}">
        ${art}
        ${favoriteButton("item", item.name, item.name)}
        <span class="kind-pill">${esc(KIND_RU[item.kind] || item.kind)}</span>
        <span class="tag-cls ${escAttr(item.cls)}">${esc(classLabel)}</span>
      </div>
      <div class="body">
        <b>${esc(item.name)}<span class="en-sub">${esc(item.group)}</span></b>
        <p class="desc">${esc(item.description || purpose)}</p>
        <div class="item-foot">
          <div class="fact"><span>Где</span><p>${esc(item.obtain || "Точный источник указан на официальной wiki.")}</p></div>
          <div class="fact"><span>Зачем</span><p>${esc(purpose)}</p></div>
          <div class="fact"><span>Когда</span><p>${esc(useWhen)}</p></div>
        </div>
        <div class="catalog-card-links">
          <a href="${escAttr(wikiUrl)}" target="_blank" rel="noopener noreferrer">Рецепт и шансы на wiki ↗</a>
          ${detail ? `<a class="catalog-guide-link" href="#/items?mode=guide&s=${encodeURIComponent(detail.name)}" title="Открыть практическую рекомендацию ${escAttr(detailName)}">Рекомендация кодекса →</a>` : ""}
        </div>
      </div>
    </article>`;
  }

  function itemCard(it, cls, filter) {
    const mine = cls === "all" || it.cls === "all" || it.cls === cls;
    const hide = filter === "mine" && !mine;
    const dim = filter === "all" && !mine;
    const lex = CODEX.lookup ? CODEX.lookup(it.name) : null;
    const title = it.nameRu || (lex ? lex.ru : it.name);
    const enRaw = lex ? lex.en : (/[A-Za-z]/.test(it.name) ? it.name : "");
    const en = enRaw && enRaw.toLowerCase() !== String(title).toLowerCase() ? enRaw : "";
    const kind = KIND_RU[it.kind] || it.kind;
    const stats = (it.stats || "").trim();
    const fake = !stats || stats === kind || /^(Оружие|Броня|Аксессуар|Инструмент|Материал|Предмет|Расходник)/i.test(stats);
    const desc = (it.desc || (lex && lex.desc) || "").trim();
    const why = (it.why || "").trim();
    const showWhy = why && why !== desc;
    const getPlain = String(it.get || "").replace(/\bCalamity\b/g, "Каламити").trim();
    const rec = String(it.rec || "").trim();
    const showGet = getPlain && !/^крафт\.?$/i.test(getPlain);
    const local = (CODEX.spriteOf ? CODEX.spriteOf(it) : (CODEX.sprites && (CODEX.sprites[it.name] || CODEX.sprites[it.nameRu]))) || "";
    return `<article class="item-card has-art ${hide ? "hidden" : ""} ${dim ? "dim" : ""} ${mine && filter !== "all" ? "mine" : ""}">
      <div class="item-shot ${it.cls} ${it.kind || ""}">
        ${local ? `<img class="item-art" alt="" src="${local}" loading="lazy" decoding="async" data-file="${escAttr(spriteKey(it))}" data-kind="${escAttr(it.kind || "mat")}" />` : unavailableArt(it.kind)}
        ${favoriteButton("item", it.name, title)}
        <span class="kind-pill">${esc(kind)}</span>
        <span class="tag-cls ${it.cls}">${CLS_RU[it.cls] || it.cls}</span>
      </div>
      <div class="body">
        <b>${esc(title)}${en ? `<span class="en-sub">в игре: ${esc(en)}</span>` : ""}</b>
        ${!fake ? `<div class="stats-line">${esc(stats)}</div>` : ""}
        ${desc ? `<p class="desc">${esc(desc)}</p>` : ""}
        <div class="item-foot">
          ${showGet ? `<div class="fact"><span>Где</span><p>${esc(getPlain)}</p></div>` : ""}
          ${rec ? `<div class="fact"><span>Крафт</span><p>${esc(rec)}</p></div>` : ""}
          ${showWhy ? `<div class="fact"><span>Зачем</span><p>${esc(why)}</p></div>` : ""}
        </div>
      </div>
    </article>`;
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

    app.innerHTML = `
      <div class="page">
        <div class="novice-layout">
          <aside class="quest-side">
            <div class="progress-box">
              <strong>${done.size} / ${quests.length} квестов</strong>
              <div class="bar"><i style="width:${pct}%"></i></div>
              <div class="class-pick">
                ${CODEX.classes.map((c) => `<button data-cls="${c.id}" class="${c.id === cls ? "active" : ""}" title="${({
                  melee: "Бьёт мечом вблизи",
                  ranged: "Лук и пушки издалека",
                  mage: "Заклинания, нужна мана",
                  summoner: "Помощники бьют за тебя",
                  rogue: "Кинжалы и скрытность"
                })[c.id]}">${c.name}</button>`).join("")}
              </div>
              <p style="font-size:11px;color:var(--muted);margin-top:8px">${({
                melee: "Воин: стой ближе, бей мечом или цепом.",
                ranged: "Стрелок: бегай, стреляй. Нужны стрелы или пули.",
                mage: "Маг: синяя шкала маны. Не стой вплотную.",
                summoner: "Призыватель: ты уворачиваешься, бьют помощники.",
                rogue: "Плут: постой без ударов — удар из скрытности сильнее."
              })[cls]}</p>
            </div>
            ${quests.map((item) => `
              <div class="q-item ${item.id === q.id ? "active" : ""} ${done.has(item.id) ? "done" : ""}" data-qid="${item.id}">
                <div class="q-num">${String(item.id).padStart(2, "0")}</div>
                <div><b>${item.title}</b><small>${item.subtitle}</small></div>
              </div>
            `).join("")}
          </aside>
          <article class="quest">
            <div class="frame-c tl"></div><div class="frame-c tr"></div>
            <div class="frame-c bl"></div><div class="frame-c br"></div>
            <div class="quest-hero">
              <div class="pic" style="background-image:url('${q.bg || "assets/hero.jpg"}');filter:${q.filter || "none"}"></div>
              <div class="hero-glow"></div>
              <div class="inner">
                <div class="rune-row">
                  ${eraBadge(q.era)}
                  <span class="rune">Квест ${String(q.id).padStart(2, "0")} из ${quests.length}</span>
                </div>
                <h2>${q.title}</h2>
                <p class="mood">${q.mood || q.subtitle}</p>
              </div>
            </div>
            <div class="quest-pad">
            ${q.objective ? `<div class="obj-box"><strong>Сейчас</strong>${T(q.objective)}</div>` : ""}
            ${shelf("Зачем это", "", `<p class="story" style="margin:0">${T(q.story)}</p><p class="how-tip" style="margin-top:10px">Наведи на слово — всплывёт, что это.</p>`)}
            ${q.steps ? shelf("Шаги", q.steps.length, `<div class="steps">${q.steps.map((s, i) => `<div class="step"><div class="step-n">${i + 1}</div><div><h4>${T(s.t)}</h4><p>${T(s.d)}</p></div></div>`).join("")}</div>`, true) : ""}
            ${shelf("Куда идти", (q.where || []).length, `<div class="cards">${q.where.map((x, i) => `<div class="info-card"><em class="pin">${i + 1}</em><b>${esc(plainName(x.t).ru)}</b><p>${T(x.d)}</p></div>`).join("")}</div>`)}
            ${shelf("Предметы", `${counts.mine}/${counts.all}`, `
              <div class="filter-row">
                <button class="mini ${itemFilter === "mine" ? "on" : ""}" data-if="mine">Мой класс</button>
                <button class="mini ${itemFilter === "all" ? "on" : ""}" data-if="all">Все</button>
              </div>
              <div class="item-grid">
                ${gear.map((it) => itemCard(it, cls, itemFilter)).join("") || q.collect.map((x) => `<div class="item-card"><b>${T(RU(x.t))}</b><p class="desc">${T(x.d)}</p></div>`).join("")}
              </div>`)}
            ${shelf("Крафт", (q.crafts || []).length, `<div class="craft-grid">${(q.crafts || []).map((x) => craftCard(x)).join("")}</div>`)}
            ${shelf("Кого бить", (q.fight || []).length, q.fight.map((x) => `<div class="kill-card"><b>${esc(plainName(x.t).ru)}</b><p>${T(x.d)}</p></div>`).join(""))}
            ${shelf("Чеклист", (q.tasks || []).length, `<div class="tasks">${q.tasks.map((t, i) => {
              const key = q.id + ":" + i;
              const on = !!(tasks[key]);
              return `<label class="task ${on ? "checked" : ""}"><input type="checkbox" data-task="${key}" ${on ? "checked" : ""} /><span>${T(t)}</span></label>`;
            }).join("")}</div>`)}
            ${shelf("Советы", "", `<div class="tips">${q.tips.map((t) => `<div class="hint">${T(t)}</div>`).join("")}</div><div class="class-note"><b>${CLS_RU[cls]}:</b> ${T(q.classTips[cls])}</div>`)}
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

    app.querySelectorAll("[data-qid]").forEach((el) => el.onclick = () => location.hash = `#/novice?q=${el.dataset.qid}`);
    app.querySelectorAll("[data-cls]").forEach((el) => el.onclick = () => { store.set({ cls: el.dataset.cls }); renderNovice(q.id); });
    app.querySelectorAll("[data-if]").forEach((el) => el.onclick = () => { store.set({ itemFilter: el.dataset.if }); renderNovice(q.id); });
    app.querySelectorAll("[data-task]").forEach((el) => el.onchange = () => {
      const s = store.get();
      store.set({ tasks: { ...(s.tasks || {}), [el.dataset.task]: el.checked } });
      el.closest(".task").classList.toggle("checked", el.checked);
    });
    const fin = app.querySelector("[data-finish]");
    if (fin) fin.onclick = () => {
      const set = new Set((store.get().doneQuests || []).map(Number));
      const wasDone = set.has(q.id);
      if (wasDone) set.delete(q.id);
      else set.add(q.id);
      store.set({ doneQuests: [...set] });
      updateJourneyProgress();
      announce(wasDone ? `Квест ${q.id} снова отмечен как активный` : `Квест ${q.id} завершён`);
      renderNovice(q.id);
    };
    const back = app.querySelector("[data-go]");
    if (back) back.onclick = () => { if (q.id > 1) location.hash = `#/novice?q=${q.id - 1}`; };
    const nextButton = app.querySelector("[data-next]");
    if (nextButton) nextButton.onclick = () => {
      if (q.id < quests.length) location.hash = `#/novice?q=${q.id + 1}`;
    };
    const side = app.querySelector(".quest-side");
    if (side) fillRail(side.innerHTML);
    const rail = document.getElementById("rail-extra");
    rail?.querySelectorAll("[data-qid]").forEach((el) => {
      el.onclick = () => location.hash = `#/novice?q=${el.dataset.qid}`;
    });
    rail?.querySelectorAll("[data-cls]").forEach((el) => {
      el.onclick = () => { store.set({ cls: el.dataset.cls }); renderNovice(q.id); };
    });
    rail?.querySelector(".q-item.active")?.scrollIntoView({ block: "nearest" });
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

  function lexCard(e) {
    const kind = LEX_KIND[e.type] || "mat";
    const art = BOSS_ART_BY_ID[e.id] || "";
    const artNote = LEX_ART_NOTE[e.en || e.ru] || "";
    const wikiName = e.en || e.ru;
    const wikiUrl = `https://calamitymod.wiki.gg/wiki/Special:Search?search=${encodeURIComponent(wikiName)}`;
    return `<article class="item-card has-art lex-card" data-kind="${escAttr(kind)}">
      <div class="item-shot lex-shot ${escAttr(kind)}">
        ${visualArt(e.en || e.ru, kind, art)}
        ${artNote ? `<span class="art-provenance">${esc(artNote)}</span>` : ""}
        <span class="kind-pill">${esc(e.type)}</span>
        <span class="tag-cls all">RU / EN</span>
      </div>
      <div class="body">
        <b>${esc(e.ru)}${e.en ? `<span class="en-sub">в игре: ${esc(e.en)}</span>` : ""}</b>
        <p class="desc">${esc(e.desc)}</p>
        <div class="item-foot">
          ${e.where ? `<div class="fact"><span>Где</span><p>${esc(e.where)}</p></div>` : ""}
          ${e.used ? `<div class="fact"><span>Зачем</span><p>${esc(e.used)}</p></div>` : ""}
          ${e.craft ? `<div class="fact"><span>Крафт</span><p>${esc(e.craft)}</p></div>` : ""}
        </div>
        <div class="catalog-card-links"><a href="${escAttr(wikiUrl)}" target="_blank" rel="noopener noreferrer">Найти на официальной wiki ↗</a></div>
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
      return !search || blob.includes(search);
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
    const input = $("#lex-s");
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
    return `<article class="item-card has-art wiki-card">
      <div class="item-shot wiki-shot ${escAttr(kind)}">
        ${visualArt(title, kind, options.art || "")}
        <span class="kind-pill">${esc(options.type || "Справочник")}</span>
        ${options.badge ? `<span class="tag-cls all">${esc(options.badge)}</span>` : ""}
      </div>
      <div class="body">
        <b>${esc(title)}${en ? `<span class="en-sub">в игре: ${esc(en)}</span>` : ""}</b>
        ${desc ? `<p class="desc">${esc(desc)}</p>` : ""}
        <div class="item-foot">${rows.map(([k, v]) => v ? `<div class="fact"><span>${esc(k)}</span><p>${esc(v)}</p></div>` : "").join("")}</div>
        ${options.noWiki ? "" : `<div class="catalog-card-links"><a href="${escAttr(wikiUrl)}" target="_blank" rel="noopener noreferrer">Подробнее на wiki ↗</a></div>`}
      </div>
    </article>`;
  }

  function guideReferenceCard(q) {
    return `<article class="item-card has-art wiki-card guide-reference-card">
      <div class="item-shot wiki-shot guide ${escAttr(q.era || "pre")}">
        ${visualArt(q.title, "mechanic", GUIDE_ART[q.id] || "")}
        <span class="kind-pill">Глава ${String(q.id).padStart(2, "0")}</span>
        <span class="tag-cls all">${esc(({ pre: "Прехардмод", hard: "Хардмод", post: "После Луны", end: "Финал" })[q.era] || "Маршрут")}</span>
      </div>
      <div class="body">
        <b>${esc(q.title)}<span class="en-sub">${esc(q.subtitle || "Этап прохождения")}</span></b>
        <p class="desc">${esc(q.mood || q.story || q.subtitle || "Практический этап маршрута прохождения.")}</p>
        <div class="item-foot">
          ${q.objective ? `<div class="fact"><span>Цель</span><p>${esc(q.objective)}</p></div>` : ""}
          <div class="fact"><span>Когда</span><p>${esc(q.subtitle || "По порядку маршрута")}</p></div>
          <div class="fact"><span>Дальше</span><p>Открой главу: внутри шаги, предметы, крафты, противники и чеклист.</p></div>
        </div>
        <div class="catalog-card-links"><a href="#/novice?q=${q.id}">Открыть полный маршрут →</a></div>
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
      return blob.includes(search);
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

  function renderItems(params) {
    fillRail("");
    const mode = params.mode === "guide" ? "guide" : "catalog";
    const cls = params.cls || "all";
    const kind = params.kind || "all";
    const qid = mode === "guide" ? (params.q || "all") : "all";
    const searchRaw = params.s || "";
    const search = searchRaw.trim().toLocaleLowerCase("ru");
    const favoriteOnly = params.fav === "1";
    const favoriteItems = getFavorites().item;
    const pool = mode === "guide" ? CODEX.items : indexedItems();
    const list = pool.filter((item) => {
      if (favoriteOnly && !favoriteItems.has(String(item.name))) return false;
      if (cls !== "all" && item.cls !== "all" && item.cls !== cls) return false;
      if (kind !== "all" && item.kind !== kind) return false;
      if (qid !== "all" && String(item.q) !== String(qid)) return false;
      if (!search) return true;
      const blob = mode === "guide"
        ? `${item.name} ${item.nameRu || ""} ${item.get || ""} ${item.why || ""} ${item.rec || ""} ${item.desc || ""}`
        : `${item.name} ${item.id} ${item.group} ${item.description} ${item.tooltip} ${item.obtain} ${KIND_RU[item.kind] || ""} ${CLS_RU[item.cls] || ""}`;
      return blob.toLocaleLowerCase("ru").includes(search);
    });
    const requestedLimit = Number.parseInt(params.limit, 10);
    const limit = mode === "catalog" && Number.isFinite(requestedLimit)
      ? Math.max(CATALOG_PAGE_SIZE, requestedLimit)
      : CATALOG_PAGE_SIZE;
    const visible = mode === "catalog" ? list.slice(0, limit) : list;
    const kindOptions = Object.entries(KIND_RU).filter(([id]) => pool.some((item) => item.kind === id));
    const indexCount = indexedItems().length;
    const sourceCommit = String(ITEM_INDEX.commit || "").slice(0, 7);
    const sourceDate = String(ITEM_INDEX.sourceDate || "").slice(0, 10);
    const coverage = ITEM_INDEX.coverage || {};
    const fmt = (value) => Number(value).toLocaleString("ru-RU");

    app.innerHTML = `
      <div class="page items-page">
        ${mast("Арсенал Calamity", "У каждого предмета есть изображение, источник, назначение и этап применения; отдельный режим сохраняет маршрут прохождения.")}
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
          <section class="catalog-source">
            <span class="catalog-source-mark" aria-hidden="true">◆</span>
            <div>
              <b>Полные карточки собраны из официальных исходников</b>
              <p>${fmt(indexCount)} подтверждённых предметов: локальные игровые спрайты, русские описания, рецепты и проверяемые источники. Записи без самостоятельного официального изображения не маскируются выдуманной иллюстрацией и не включены в каталог.</p>
              <small>Calamity Mod ${esc(ITEM_INDEX.modVersion || CODEX.version)} · срез ${esc(sourceDate || "2026-08-15")} · ${esc(sourceCommit || "source")}</small>
            </div>
            <a href="https://github.com/CalamityTeam/CalamityModPublic" target="_blank" rel="noopener noreferrer">Исходные данные ↗</a>
          </section>
          <div class="catalog-stat-strip" aria-label="Покрытие полного каталога">
            <span><b>${fmt(coverage.sprites || 0)}</b><small>официальных спрайтов</small></span>
            <span><b>${fmt(coverage.russianDescriptions || 0)}</b><small>описаний на русском</small></span>
            <span><b>${fmt(coverage.recipes || 0)}</b><small>локальных рецептов</small></span>
            <span><b>${fmt(indexCount)}</b><small>подробных карточки</small></span>
          </div>
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
        <div class="chips item-class-chips">
          <button class="chip favorite-chip ${favoriteOnly ? "active" : ""}" data-p="fav" data-v="${favoriteOnly ? "all" : "1"}"><span aria-hidden="true">★</span> Избранное <em>${favoriteItems.size}</em></button>
          <button class="chip ${cls === "all" ? "active" : ""}" data-p="cls" data-v="all">Все классы</button>
          ${CODEX.classes.map((itemClass) => `<button class="chip ${cls === itemClass.id ? "active" : ""}" data-p="cls" data-v="${itemClass.id}">${itemClass.name}</button>`).join("")}
        </div>
        <div class="chips item-kind-chips">
          <button class="chip ${kind === "all" ? "active" : ""}" data-p="kind" data-v="all">Все типы <em>${fmt(pool.length)}</em></button>
          ${kindOptions.map(([id, label]) => `<button class="chip ${kind === id ? "active" : ""}" data-p="kind" data-v="${id}">${label}<em>${fmt(pool.filter((item) => item.kind === id).length)}</em></button>`).join("")}
        </div>
        <div class="filter-bar">
          <label class="search-wrap">
            <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>
            <input id="item-s" type="search" aria-label="Поиск предметов" placeholder="${mode === "catalog" ? "Название, механика, рецепт или источник…" : "Название или «где взять»…"}" value="${escAttr(searchRaw)}" />
            ${search ? `<button class="catalog-search-clear" type="button" id="item-search-clear" aria-label="Очистить поиск">×</button>` : ""}
          </label>
          ${mode === "guide" ? `<select id="item-q" aria-label="Фильтр предметов по этапу">
            <option value="all" ${qid === "all" ? "selected" : ""}>Все этапы</option>
            ${CODEX.quests.map((quest) => `<option value="${quest.id}" ${String(qid) === String(quest.id) ? "selected" : ""}>${quest.id}. ${quest.title}</option>`).join("")}
          </select>` : `<a class="official-wiki-link" href="https://calamitymod.wiki.gg/wiki/Items" target="_blank" rel="noopener noreferrer">Официальная wiki <span aria-hidden="true">↗</span></a>`}
        </div>
        <div class="catalog-found">
          <p class="found">Найдено: <b>${fmt(list.length)}</b>${mode === "catalog" && visible.length < list.length ? ` · показано ${fmt(visible.length)}` : ""}</p>
          ${search || cls !== "all" || kind !== "all" || favoriteOnly || qid !== "all" ? `<a href="${mode === "guide" ? "#/items?mode=guide" : "#/items"}">Сбросить фильтры</a>` : ""}
        </div>
        ${visible.length
          ? mode === "catalog"
            ? `<div class="item-grid full-catalog-grid">${visible.map(indexedItemCard).join("")}</div>
              ${visible.length < list.length ? `<div class="catalog-more"><button class="btn ghost" type="button" id="catalog-more">Показать ещё ${fmt(Math.min(CATALOG_PAGE_SIZE, list.length - visible.length))}<small>${fmt(visible.length)} из ${fmt(list.length)}</small></button></div>` : ""}`
            : `<div class="item-grid">${visible.map((item) => itemCard(item, cls, "all")).join("")}</div>`
          : `<div class="empty-state"><span>◇</span><b>Ничего не найдено</b><p>Сбрось часть фильтров или попробуй официальное английское название.</p><a class="btn ghost" href="${mode === "guide" ? "#/items?mode=guide" : "#/items"}">Сбросить фильтры</a></div>`}
      </div>
    `;

    const build = (over = {}, replace = false) => {
      const next = { mode, cls, kind, q: qid, s: searchRaw, fav: favoriteOnly ? "1" : "all", limit, ...over };
      const changesFilter = Object.keys(over).some((key) => ["cls", "kind", "q", "s", "fav"].includes(key));
      if (mode === "catalog" && changesFilter && over.limit == null) next.limit = CATALOG_PAGE_SIZE;
      const query = new URLSearchParams();
      if (next.mode === "guide") query.set("mode", "guide");
      if (next.cls && next.cls !== "all") query.set("cls", next.cls);
      if (next.kind && next.kind !== "all") query.set("kind", next.kind);
      if (next.mode === "guide" && next.q && next.q !== "all") query.set("q", next.q);
      if (next.s) query.set("s", next.s);
      if (next.fav === "1") query.set("fav", "1");
      if (next.mode === "catalog" && next.limit > CATALOG_PAGE_SIZE) query.set("limit", String(next.limit));
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
    input.oninput = () => {
      clearTimeout(timer);
      timer = setTimeout(() => build({ s: input.value }, true), 220);
    };
    const clearSearch = $("#item-search-clear");
    if (clearSearch) clearSearch.onclick = () => build({ s: "" }, true);
    const questSelect = $("#item-q");
    if (questSelect) questSelect.onchange = () => build({ q: questSelect.value });
    const more = $("#catalog-more");
    if (more) more.onclick = () => build({ limit: visible.length + CATALOG_PAGE_SIZE }, true);
    if (mode === "guide") bindSprites(app);
  }
  function renderBosses(params = {}) {
    fillRail("");
    const era = params.era || "all";
    const search = (params.q || "").trim().toLowerCase();
    const eras = [
      ["all", "Все"], ["pre", "Прехардмод"], ["hard", "Хардмод"],
      ["post", "После Луны"], ["end", "Финал"]
    ];
    const list = CODEX.bosses.filter((b) => {
      if (era !== "all" && b.era !== era) return false;
      return !search || `${b.name} ${b.en || ""} ${b.type} ${b.where} ${b.when} ${b.summon} ${b.drops} ${b.tip || ""}`.toLowerCase().includes(search);
    });
    const minis = era === "all" ? CODEX.minis.filter((m) => !search || `${m.name} ${m.en || ""} ${m.where} ${m.when} ${m.drops}`.toLowerCase().includes(search)) : [];
    const countFor = (id) => id === "all" ? CODEX.bosses.length : CODEX.bosses.filter((b) => b.era === id).length;
    app.innerHTML = `
      <div class="page">
        ${mast("Боссы по порядку", "Фильтруй прогрессию и сохраняй нужных противников в рюкзак героя.")}
        <div class="chips boss-era-chips">
          ${eras.map(([id, label]) => `<button class="chip ${era === id ? "active" : ""}" data-era="${id}">${label}<em>${countFor(id)}</em></button>`).join("")}
        </div>
        <label class="search-wrap boss-search">
          <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m20 20-4-4"/></svg>
          <input id="boss-s" type="search" aria-label="Поиск боссов" placeholder="Имя, призывалка, дроп или место…" value="${escAttr(params.q || "")}" />
          ${search ? `<a href="${era === "all" ? "#/bosses" : `#/bosses?era=${era}`}" class="filter-clear">Сбросить</a>` : ""}
        </label>
        <p class="found">Основные боссы: ${list.length}${minis.length ? ` · мини-боссы: ${minis.length}` : ""}</p>
        ${list.length
          ? `<div class="item-grid" id="boss-grid">${list.map(bossCard).join("")}</div>`
          : `<div class="empty-state"><span>☠</span><b>Противник не найден</b><p>Попробуй другое имя, дроп или сбрось выбранную эпоху.</p><a class="btn ghost" href="#/bosses">Показать всех боссов</a></div>`}
        ${minis.length ? `<h2 class="section-title" style="margin-top:28px">Мини-боссы</h2><div class="item-grid">${minis.map(miniCard).join("")}</div>` : ""}
      </div>
    `;
    const build = (over = {}, replace = false) => {
      const next = { era, q: params.q || "", ...over };
      const qs = new URLSearchParams();
      if (next.era && next.era !== "all") qs.set("era", next.era);
      if (next.q) qs.set("q", next.q);
      const nextHash = "#/bosses" + (qs.toString() ? `?${qs}` : "");
      if (replace) { history.replaceState(null, "", nextHash); route(); }
      else location.hash = nextHash;
    };
    app.querySelectorAll("[data-era]").forEach((chip) => { chip.onclick = () => build({ era: chip.dataset.era }); });
    const inp = $("#boss-s");
    let timer;
    if (inp) inp.oninput = () => { clearTimeout(timer); timer = setTimeout(() => build({ q: inp.value }, true), 220); };
    bindSprites(app);
  }

  function bossCard(b) {
    const era = ({ pre: "Прехардмод", hard: "Хардмод", post: "После Луны", end: "Финал" })[b.era] || b.era;
    const wikiUrl = `https://calamitymod.wiki.gg/wiki/Special:Search?search=${encodeURIComponent(b.en || b.name)}`;
    return `<article class="item-card has-art boss-card">
      <div class="item-shot boss-shot boss ${escAttr(b.era)}">
        ${visualArt(b.name, "boss", BOSS_ART[b.n] || "")}
        ${favoriteButton("boss", b.n, b.name)}
        <span class="kind-pill">#${String(b.n).padStart(2, "0")} · ${esc(b.type)}</span>
        <span class="tag-cls all">${esc(era)}</span>
      </div>
      <div class="body">
        <b>${esc(b.name)}${b.en ? `<span class="en-sub">в игре: ${esc(b.en)}</span>` : ""}</b>
        <p class="desc">${esc(b.tip || "Ключевой противник маршрута: подготовь арену, мобильность и подходящее этапу снаряжение.")}</p>
        <div class="item-foot">
          <div class="fact"><span>Где</span><p>${esc(b.where)}</p></div>
          <div class="fact"><span>Когда</span><p>${esc(b.when)}</p></div>
          <div class="fact"><span>Зови</span><p>${esc(b.summon)}</p></div>
          <div class="fact"><span>Дроп</span><p>${esc(b.drops)}</p></div>
        </div>
        <div class="catalog-card-links">
          <a href="${escAttr(wikiUrl)}" target="_blank" rel="noopener noreferrer">Тактика и дроп на wiki ↗</a>
          ${b.q ? `<a class="catalog-guide-link" href="#/novice?q=${b.q}">Открыть квест ${b.q} →</a>` : ""}
        </div>
      </div>
    </article>`;
  }

  function miniCard(m) {
    const art = m.name === "Giant Clam" ? BOSS_ART_BY_ID["giant-clam"]
      : m.name === "Great Sand Shark" ? BOSS_ART_BY_ID["sand-shark"]
      : "assets/boss-sprites/cragmaw-mire.png";
    const wikiUrl = `https://calamitymod.wiki.gg/wiki/Special:Search?search=${encodeURIComponent(m.name)}`;
    return `<article class="item-card has-art boss-card mini-boss-card">
      <div class="item-shot boss-shot boss">
        ${visualArt(m.name, "boss", art)}
        <span class="kind-pill">Мини-босс</span>
        <span class="tag-cls all">Дополнительно</span>
      </div>
      <div class="body">
        <b>${esc(m.name)}${m.en ? `<span class="en-sub">в игре: ${esc(m.en)}</span>` : ""}</b>
        <p class="desc">Опциональный сильный противник с полезными материалами и оружием.</p>
        <div class="item-foot">
          <div class="fact"><span>Когда</span><p>${esc(m.when)}</p></div>
          <div class="fact"><span>Где</span><p>${esc(m.where)}</p></div>
          <div class="fact"><span>Дроп</span><p>${esc(m.drops)}</p></div>
        </div>
        <div class="catalog-card-links"><a href="${escAttr(wikiUrl)}" target="_blank" rel="noopener noreferrer">Подробнее на wiki ↗</a></div>
      </div>
    </article>`;
  }

  function renderFavorites() {
    fillRail("");
    const favorites = getFavorites();
    const items = CODEX.items.filter((item) => favorites.item.has(String(item.name)));
    const detailedKeys = new Set(items.map((item) => String(item.name)));
    const indexedFavorites = indexedItems().filter((item) => favorites.item.has(String(item.name)) && !detailedKeys.has(String(item.name)));
    const bosses = CODEX.bosses.filter((boss) => favorites.boss.has(String(boss.n)));
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
          <a href="#/items?fav=1"><span>◆</span><b>${itemTotal}</b><small>предметов</small></a>
          <a href="#/bosses"><span>☠</span><b>${bosses.length}</b><small>боссов</small></a>
          <a href="#/crafts"><span>⚒</span><b>${crafts.length}</b><small>рецептов</small></a>
        </div>
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
  }

  function renderCrafts(filter) {
    const q = (filter || "").toLowerCase();
    const seen = new Set();
    const list = CODEX.crafts.filter((c) => {
      const key = String(c.name || "").toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      const blob = `${c.name} ${c.ings} ${c.why} ${c.stage} ${c.station || ""}`;
      const ru = (CODEX.ru ? CODEX.ru(c.name) : c.name) || "";
      return !q || `${blob} ${ru}`.toLowerCase().includes(q);
    });
    const groups = [];
    const map = {};
    list.forEach((c) => {
      const stage = c.stage || "Прочее";
      if (!map[stage]) { map[stage] = []; groups.push(stage); }
      map[stage].push(c);
    });
    fillRail("");
    app.innerHTML = `
      <div class="page">
        ${mast("Крафты", "Полка по этапу. На карточке — стол, ингредиенты и зачем это нужно.")}
        <label class="search-wrap">
          <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>
          <input id="craft-filter" type="search" aria-label="Поиск рецептов" placeholder="Название, материал, этап…" value="${escAttr(filter || "")}" />
        </label>
        ${groups.length
          ? groups.map((stage, i) => shelf(esc(stage), map[stage].length, `<div class="craft-grid">${map[stage].map((c) => craftCard(c)).join("")}</div>`, i === 0 || !!q)).join("")
          : `<div class="empty-state"><span>⚒</span><b>Рецепт не найден</b><p>Проверь название или попробуй поискать ингредиент.</p><a class="btn ghost" href="#/crafts">Показать все рецепты</a></div>`}
      </div>
    `;
    const inp = $("#craft-filter");
    let t;
    inp.oninput = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        history.replaceState(null, "", `#/crafts?q=${encodeURIComponent(inp.value)}`);
        route();
      }, 200);
    };
  }

  function renderBiomes() {
    fillRail("");
    app.innerHTML = `
      <div class="page">
        ${mast("Биомы", "Где это в мире, когда туда идти, что брать с собой и что унести.")}
        <div class="biome-grid">
          ${CODEX.biomes.map((b) => biomeCard(b)).join("")}
        </div>
      </div>
    `;
  }

  function searchAll(query) {
    const q = query.trim().toLowerCase();
    if (q.length < 2) { searchPanel.classList.add("hidden"); return; }
    const hits = [];
    CODEX.quests.forEach((x) => {
      if (`${x.title} ${x.subtitle} ${x.story} ${x.mood || ""} ${x.objective || ""}`.toLowerCase().includes(q))
        hits.push({ href: `#/novice?q=${x.id}`, title: `Квест ${x.id}: ${x.title}`, sub: x.subtitle, type: "Квест", mark: String(x.id) });
    });
    Object.values(CODEX.lex || {}).forEach((x) => {
      const blob = `${x.ru} ${x.en} ${x.type} ${x.desc} ${x.where || ""} ${x.used || ""} ${x.craft || ""} ${(x.aliases || []).join(" ")}`.toLowerCase();
      if (blob.includes(q))
        hits.push({ href: `#/lex?q=${encodeURIComponent(x.ru)}`, title: x.ru, sub: `${x.type} · ${x.en}`, type: "Словарь", mark: "A" });
    });
    const itemHitNames = new Set();
    (CODEX.items || []).forEach((x) => {
      const title = x.nameRu || x.name;
      if (`${x.name} ${title} ${x.get} ${x.why} ${x.desc || ""}`.toLowerCase().includes(q)) {
        hits.push({ href: `#/items?mode=guide&s=${encodeURIComponent(x.name)}`, title, sub: x.get, type: "Рекомендация", mark: "◆" });
        itemHitNames.add(String(x.name).toLocaleLowerCase("ru"));
        itemHitNames.add(String(title).toLocaleLowerCase("ru"));
      }
    });
    indexedItems().forEach((item) => {
      const blob = `${item.name} ${item.id} ${item.group} ${item.description} ${item.tooltip} ${item.obtain} ${KIND_RU[item.kind] || ""} ${CLS_RU[item.cls] || ""}`.toLocaleLowerCase("ru");
      const key = String(item.name).toLocaleLowerCase("ru");
      if (blob.includes(q) && !itemHitNames.has(key)) {
        hits.push({
          href: `#/items?s=${encodeURIComponent(item.name)}`,
          title: item.name,
          sub: `${item.group} · ${item.cls === "all" ? "Все классы" : (CLS_RU[item.cls] || item.cls)}`,
          type: "Полный индекс",
          mark: ITEM_KIND_MARK[item.kind] || "◆"
        });
      }
    });
    CODEX.bosses.forEach((x) => {
      if (`${x.name} ${x.en || ""} ${x.drops} ${x.summon}`.toLowerCase().includes(q))
        hits.push({ href: `#/bosses?q=${encodeURIComponent(x.name)}`, title: x.name, sub: x.summon, type: "Босс", mark: "☠" });
    });
    CODEX.crafts.forEach((x) => {
      if (`${x.name} ${x.ings} ${x.why}`.toLowerCase().includes(q))
        hits.push({ href: `#/crafts?q=${encodeURIComponent(x.name)}`, title: x.name, sub: x.ings, type: "Крафт", mark: "⚒" });
    });
    const shown = hits.slice(0, 24);
    searchPanel.classList.remove("hidden");
    searchPanel.innerHTML = hits.length
      ? `<div class="search-drop-head"><span>Найдено: ${hits.length}</span><kbd>Esc</kbd></div>${shown.map((h) => `
          <a class="search-hit" href="${h.href}">
            <span class="search-hit-mark">${esc(h.mark)}</span>
            <span><b>${esc(h.title)}</b><small>${esc(h.sub || "")}</small></span>
            <span class="search-hit-type">${esc(h.type)}</span>
          </a>`).join("")}`
      : `<div class="search-empty"><b>Ничего не найдено</b><small>Попробуй «виктайд», «скория» или «морские останки»</small></div>`;
    searchPanel.querySelectorAll("a").forEach((a) => a.onclick = () => {
      searchPanel.classList.add("hidden");
      searchInput.value = "";
    });
  }

  document.addEventListener("click", (e) => {
    const control = e.target.closest && e.target.closest("[data-favorite-type]");
    if (!control) return;
    e.preventDefault();
    toggleFavorite(control.dataset.favoriteType, control.dataset.favoriteKey);
    route();
  });

  addEventListener("storage", (e) => {
    if (e.key !== "calamity-codex") return;
    favoriteCache = null;
    updateFavoritesBadge();
    updateJourneyProgress();
    if (document.body.dataset.view === "favorites") route();
  });

  searchInput.addEventListener("input", () => searchAll(searchInput.value));
  searchInput.addEventListener("focus", () => { if (searchInput.value.length >= 2) searchAll(searchInput.value); });
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
      searchPanel.classList.add("hidden");
      document.getElementById("tt")?.setAttribute("hidden", "");
    }
  });
  document.addEventListener("click", (e) => {
    if (!searchPanel.contains(e.target) && e.target !== searchInput) searchPanel.classList.add("hidden");
  });

  const railEl = document.getElementById("rail");
  const scrim = document.getElementById("rail-scrim");
  menuButton.onclick = () => {
    railEl?.classList.toggle("open");
    const open = !!railEl?.classList.contains("open");
    menuButton.setAttribute("aria-expanded", String(open));
    if (scrim) scrim.hidden = !open;
  };
  if (scrim) scrim.onclick = () => {
    railEl?.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    scrim.hidden = true;
  };

  const toTop = document.getElementById("to-top");
  addEventListener("scroll", () => toTop?.classList.toggle("show", scrollY > 650), { passive: true });
  if (toTop) toTop.onclick = () => scrollTo({ top: 0, behavior: "smooth" });

  addEventListener("hashchange", route);
  route();
})();
