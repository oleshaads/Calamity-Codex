/* VERSION проставляется сборкой (scripts/build-runtime.mjs) по хэшу содержимого
   бандлов: пока файлы не менялись — URL и кеш стабильны, изменились — версия
   меняется сама. Ручные даты больше не используются. */
const VERSION = "h-0ed96c6b2a";
const CORE_CACHE = `calamity-codex-core-${VERSION}`;
const RUNTIME_CACHE = `calamity-codex-runtime-${VERSION}`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  `./manifest.webmanifest?v=${VERSION}`,
  `./css/modern.min.css?v=${VERSION}`,
  `./js/codex.min.js?v=${VERSION}`,
  "./assets/favicon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/hero.webp",
  "./assets/fonts/RussoOne-Regular.woff2",
  `./assets/sprite-manifest.json?v=${VERSION}`,
  "./assets/sprites/Calamity.png",
  "./assets/sprites/Wooden_Sword.png",
  "./assets/sprites/AdvancedDisplay.png",
  "./assets/sprites/Suspicious_Looking_Eye.png",
  "./assets/sprites/StarterBag.png",
  "./assets/sprites/HeavenfallenStardisk.png",
  "./assets/sprites/DecryptionComputer.png",
  "./assets/sprites/Iron_Anvil.png",
  "./assets/sprites/Rock.png"
];
// Тяжёлые индексы каталога греются в фоне после активации: установка
// сервис-воркера остаётся быстрой, а обещание «каталог доступен офлайн»
// выполняется целиком — предметы, мобы и рецепты не требуют сети.
const CORE_EXTRA_ASSETS = [
  `./js/codex-data.min.js?v=${VERSION}`,
  `./js/catalog-tooltips.js?v=${VERSION}`
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CORE_CACHE);
    // Один сбой файла не должен ронять всю установку: ошибочные доберут
    // фоновый прогрев и cacheFirst.
    await Promise.all(CORE_ASSETS.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

async function warmCoreExtras() {
  const cache = await caches.open(CORE_CACHE);
  await Promise.all(CORE_EXTRA_ASSETS.map(async (url) => {
    try {
      if (await cache.match(url)) return;
      const response = await fetch(url);
      if (response.ok) await cache.put(url, response);
    } catch { /* остаёмся на cacheFirst — прогрев повторится в следующий заход */ }
  }));
}

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("calamity-codex-") && ![CORE_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => warmCoreExtras())
  );
});

async function instantNavigation(event, request) {
  const cached = await caches.match("./index.html");
  const update = (async () => {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put("./index.html", response.clone());
    }
    return response;
  })();
  if (cached) {
    event.waitUntil(update.catch(() => {}));
    return cached;
  }
  try {
    return await update;
  } catch {
    return (await caches.match("./")) || Response.error();
  }
}

async function cacheFirst(event, request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  let response = null;
  try {
    response = await fetch(request);
  } catch {
    // Сеть недоступна, а этого файла ещё нет в кеше (например, графика,
    // которую не успел прогреть фоновый прогрев) — отдаём честную ошибку
    // вместо падения обработчика: страница продолжает работать офлайн.
    return (await caches.match(request, { ignoreSearch: true })) || Response.error();
  }
  if (response.ok && response.type === "basic") {
    const copy = response.clone();
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(RUNTIME_CACHE);
        // Без ручного потолка записей: размером хранилища управляет браузер
        // (под давлением квоты он вытесняет данные сам), а при нехватке места
        // запись тихо пропускается — офлайн-режим не ломается.
        await cache.put(request, copy);
      } catch { /* квота исчерпана — файл останется сетевым */ }
    })());
  }
  return response;
}

function currentReleaseAssetRequest(request, url) {
  if (!url.pathname.includes("/assets/") || url.searchParams.get("v") === VERSION) return request;
  const releasedUrl = new URL(url.href);
  releasedUrl.searchParams.set("v", VERSION);
  return new Request(releasedUrl.href, request);
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.headers.has("range")) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(instantNavigation(event, request));
    return;
  }
  event.respondWith(cacheFirst(event, currentReleaseAssetRequest(request, url)));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
