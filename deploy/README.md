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

## Бесплатный домен calamity-codex.is-a.dev

1. Откройте создание файла в реестре is-a.dev (GitHub сам сделает форк):
   **https://github.com/is-a-dev/register/new/main**
2. Имя файла: `domains/calamity-codex.json`
3. Содержимое — скопируйте из `deploy/is-a-dev/calamity-codex.json` (этот каталог).
4. Нажмите «Propose changes» → «Create pull request». PR должен идти от аккаунта
   `oleshaads` — так is-a.dev проверяет владение.
5. Дождитесь мержа PR (обычно от пары часов до 1–2 дней, есть автопроверки).
6. После мержа: добавить файл `CNAME` с текстом `calamity-codex.is-a.dev` в корень
   ветки, из которой публикуется Pages, и включить Enforce HTTPS в Settings → Pages.
   (Шаг 6 выполняет агент — просто сообщите, что PR принят.)

Важно: CNAME добавляется только ПОСЛЕ мержа PR, иначе старый адрес начнёт
перенаправлять на ещё не существующий домен.
