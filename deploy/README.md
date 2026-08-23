# Публикация Каламити Кодекса

Сайт — статическая папка `calamity-codex/`. Самый простой путь — GitHub Pages.

## Вариант A: GitHub Pages через Actions (рекомендуется)

1. Сделайте репозиторий **публичным** (Settings → General → Danger Zone → Change visibility)
   — на бесплатном тарифе Pages работает только для публичных репозиториев.
2. Включите Pages: **Settings → Pages → Source: GitHub Actions**.
3. Скопируйте файл `deploy/github-pages-workflow.yml` в `.github/workflows/deploy-pages.yml`
   (через веб-интерфейс GitHub: Add file → Create new file) в нужной ветке.
4. Готово: каждый пуш ветки автоматически публикует сайт на
   **https://oleshaads.github.io/Calamity-Codex/**

## Вариант B: любой статический хостинг

Залейте содержимое папки `calamity-codex/` на Cloudflare Pages / Netlify / свой сервер
с HTTPS. Серверные правила переадресации не нужны (hash-роутинг). После выбора другого
домена замените абсолютный `og:image` в `index.html`.
