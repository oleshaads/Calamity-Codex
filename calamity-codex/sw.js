константа ВЕРСИЯ = "20260824-core113";
константа CORE_CACHE = `кодекс-катастрофы-ядро-${ВЕРСИЯ}`;
константа RUNTIME_CACHE = `calamity-codex-время выполнения-${ВЕРСИЯ}`;
константа ОСНОВНЫЕ_АКТИВЫ = [
  "./",
  "./index.html",
  `./manifest.webmanifest?в=${ВЕРСИЯ}`,
  `./css/modern.min.css?в=${ВЕРСИЯ}`,
  `./js/codex.min.js?в=${ВЕРСИЯ}`,
  `./js/codex-data.min.js?в=${ВЕРСИЯ}`,
  "./assets/favicon.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/hero.webp",
  "./assets/fonts/RussoOne-Regular.woff2",
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

себя.addEventListener("установить", (событие) => {
  событие.подождите, пока(кэши.открыть(CORE_CACHE).затем((кэш) => кэш.добавитьВсе(ОСНОВНЫЕ_АКТИВЫ)).затем(() => себя.пропуститьОжидание()));
});

себя.addEventListener("активировать", (событие) => {
  событие.подождите, пока(
    кэши.ключи()
      .затем((ключи) => Обещать.все(ключи.фильтр((ключ) => ключ.начинаетсяС("кодекс бедствия-") && ![CORE_CACHE, RUNTIME_CACHE].включает в себя(ключ)).карта((ключ) => кэши.удалить(ключ))))
      .затем(() => себя.клиенты.требовать())
  );
});

асинхронный функция trimRuntimeCache(maxEntries = 12000) {
  константа кэш = ждать кэши.открыть(RUNTIME_CACHE);
  константа ключи = ждать кэш.ключи();
  если (ключи.длина <= maxEntries) возвращаться;
  ждать Обещать.все(ключи.ломтик(0, ключи.длина - maxEntries).карта((ключ) => кэш.удалить(ключ)));
}

// Мгновенный старт: оболочка отдаётся из кэша без ожидания сети, а свежий
// index.html подтягивается в фоне. Обновление релиза всё равно приходит через
// новый ВЕРСИЯ сервис-воркера (registration.update() пѸкаждом запуск).
асинхронный функция мгновеннаяНавигация(событие, запрос) {
  константа кэшированный = ждать кэши.соответствовать("./index.html");
  константа обновить = (асинхронный () => {
    константа ответ = ждать принести(запрос);
    если (ответ.хорошо) {
      константа кэш = ждать кэши.открыть(RUNTIME_CACHE);
      ждать кэш.помещать("./index.html", ответ.клон());
    }
    возвращаться ответ;
  })();
  если (кэшированный) {
    событие.подождите, пока(обновить.ловить(() => {}));
    возвращаться кэшированный;
  }
  пытаться {
    возвращаться ждать обновить;
  } ловить {
    возвращаться (ждать кэши.соответствовать("./")) || Ответ.ошибка();
  }
}

асинхронный функция кэшПервый(событие, запрос) {
  константа кэшированный = ждать кэши.соответствовать(запрос);
  если (кэшированный) возвращаться кэшированный;
  константа ответ = ждать принести(запрос);
  если (ответ.хорошо && ответ.тип === "базовый") {
    // Ответ уходит странице сразу; запись в кэш и подрезка идут в фоне.
    // Перечислять все ключи кэша после каждого спрайта расточительно —
    // батч раз в 25 записей держит ту же границу в 25 раз дешевле.
    const copy = response.clone();
    event.waitUntil((async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      await cache.put(request, copy);
      putsSinceTrim += 1;
      if (putsSinceTrim >= 100) {
        putsSinceTrim = 0;
        await trimRuntimeCache();
      }
    })());
  }
  return response;
}
let putsSinceTrim = 0;

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
  // Local art is keyed by this worker's release even when stale application
  // code asks for an unversioned (or older-versioned) sprite URL. This prevents
  // a cached vertical animation sheet from surviving a sprite-frame fix.
  event.respondWith(cacheFirst(event, currentReleaseAssetRequest(request, url)));
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
