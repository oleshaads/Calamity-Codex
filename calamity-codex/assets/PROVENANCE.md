# Происхождение изображений

Все изображения интерфейса — настоящие игровые ассеты или статические композиции из них. Синтетические иллюстрации и нарисованные заменители предметов не используются.

## Calamity Mod

Источник: официальный репозиторий `CalamityTeam/CalamityModPublic`, commit `1a8cebd27ec5615316b78f71973446b5528d2b78` (2026-08-08).

- `item-sprites/*.png` — текстуры из `Items/`, а для предметов с общей текстурой — связанные официальные `NPCs/` или `Projectiles/` PNG. Точная политика выбора зафиксирована в `scripts/build-item-catalog.mjs`.
- `boss-sprites/*.png` — официальные boss-head PNG из `NPCs/*`.
- `hero.jpg`, `novice.jpg`, `veteran.jpg`, `emblem.*`, `favicon.png`, `headers/*`, `themes/*` — кропы или статические композиции из `MainMenu/`, `Skies/`, `Backgrounds/` и перечисленных выше спрайтов. Команды пересборки находятся в `scripts/build-official-art.sh`.

Композиции панорам являются оформлением интерфейса, а не скриншотами игрового процесса.

## Terraria

Небольшие vanilla-спрайты в `sprites/` используются для этапов базовой Terraria. `sprites/Deer_Thing.png` — игровой спрайт предмета Deer Thing (Item ID 5120), каноническая страница: <https://terraria.wiki.gg/wiki/Deer_Thing>. Локальная копия сверена с публичным набором `EzraGillooly/terraria-compass` (`public/icons/items/deer-thing.png`).
