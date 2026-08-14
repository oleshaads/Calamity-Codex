# Происхождение изображений

Все изображения интерфейса — настоящие игровые ассеты или статические композиции из них. Синтетические иллюстрации и нарисованные заменители предметов не используются.

## Calamity Mod

Источник: официальный репозиторий `CalamityTeam/CalamityModPublic`, commit `1a8cebd27ec5615316b78f71973446b5528d2b78` (2026-08-08).

- `item-sprites/*.png` — текстуры из `Items/`, а для предметов с общей текстурой — связанные официальные `NPCs/` или `Projectiles/` PNG. Точная политика выбора зафиксирована в `scripts/build-item-catalog.mjs`.
- `boss-sprites/*.png` — официальные boss-head PNG из `NPCs/*`.
- `hero.jpg`, `crest.jpg`, `novice.jpg`, `veteran.jpg`, `emblem.*`, `favicon.png`, `headers/*`, `themes/*` — кропы или статические композиции из `MainMenu/`, `Skies/`, `Backgrounds/` и перечисленных выше спрайтов. Команды пересборки находятся в `scripts/build-official-art.sh`.

Композиции панорам являются оформлением интерфейса, а не скриншотами игрового процесса.

### Ассеты словаря Calamity

`lex/calamity/*.png` загружаются непосредственно из того же официального репозитория на закреплённом commit `1a8cebd27ec5615316b78f71973446b5528d2b78`: это Laboratory Icon, штатные UI-текстуры Adrenaline/Rage и четыре оригинальных town-NPC head.

## Terraria

Небольшие vanilla-спрайты в `sprites/` используются для этапов базовой Terraria. `sprites/Deer_Thing.png` — игровой спрайт предмета Deer Thing (Item ID 5120), каноническая страница: <https://terraria.wiki.gg/wiki/Deer_Thing>. Локальная копия сверена с публичным набором `EzraGillooly/terraria-compass` (`public/icons/items/deer-thing.png`).

### Ассеты словаря Terraria

- `lex/vanilla/*.png` (обычные предметы и bestiary NPC) — отдельные оригинальные игровые текстуры из публичного набора `Live-yan/terraviewer-images`, commit `d8b7a655e210fe377186a083635733ece85c3594`. Идентификаторы `item_*` и `npc_*` явно закреплены в `scripts/fetch-lexicon-art.sh`; имена не подбираются приблизительно.
- `lex/vanilla/demon-altar.png` — настоящая tile/station-текстура Demon Altar из публичного Terraria recipe viewer `64mb/terraria-web-book`, commit `a825a5d87d18c63c22a461265b2d9188579b204f`, путь `assets/terraria/tool/demon_altar.png`.
- Исходный `item_75.png` (Fallen Star) является вертикальной игровой анимационной полосой. Скрипт детерминированно вырезает первый полный кадр `22×26`; цвет, пиксели и форма кадра не изменяются.
- Tile/station-текстуры не заменяются похожими inventory items. Для Demon Altar хранится точное извлечение тайла, а для понятий без самостоятельного спрайта карточка показывает честно подписанный связанный игровой ориентир.

Все 37 файлов `assets/lex/` воспроизводимо загружает `scripts/fetch-lexicon-art.sh` через GitHub Contents API с immutable revision. После загрузки каждый PNG проверяется ImageMagick `identify`.
