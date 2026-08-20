const VERSION = "20260819-core67";
const CORE_CACHE = `calamity-codex-core-${VERSION}`;
const RUNTIME_CACHE = `calamity-codex-runtime-${VERSION}`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  `./manifest.webmanifest?v=${VERSION}`,
  `./css/modern.min.css?v=${VERSION}`,
  `./js/codex.min.js?v=${VERSION}`,
  `./js/codex-data.min.js?v=${VERSION}`,
  "./assets/favicon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/hero.webp",
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

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CORE_CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("calamity-codex-") && ![CORE_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function trimRuntimeCache(maxEntries = 400) {
  const cache = await caches.open(RUNTIME_CACHE);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put("./index.html", response.clone());
    }
    return response;
  } catch {
    return (await caches.match("./index.html")) || (await caches.match("./"));
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
    await trimRuntimeCache();
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
    event.respondWith(networkFirstNavigation(request));
    return;
  }
  // Local art is keyed by this worker's release even when stale application
  // code asks for an unversioned (or older-versioned) sprite URL. This prevents
  // a cached vertical animation sheet from surviving a sprite-frame fix.
  event.respondWith(cacheFirst(currentReleaseAssetRequest(request, url)));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
