# Клиент-серверный чат (cursor_auto)

Монорепозиторий: REST и WebSocket на **Node.js + Fastify + Socket.IO + PostgreSQL**, SPA на **React + Vite + Ant Design + RTK Query**. Язык интерфейса и комментариев в проекте — русский.

## Требования

- Node.js 20+
- Yarn (классический)
- Локально запущенный PostgreSQL

## Быстрый старт (локально)

1. Создайте пользователя и базу в PostgreSQL (один раз), либо выполните только `yarn db:init` после настройки `DB_ADMIN_URL` в `back/.env` — скрипт пересоздаёт схему `public` и тестовых пользователей.
2. Скопируйте примеры env: `back/.env` и `front/.env` уже содержат значения для разработки; для прода ориентируйтесь на `*.env.production.example`.
3. В корне:

```bash
yarn install
yarn --cwd back install
yarn --cwd front install
yarn db:init
yarn dev
```

Фронтенд: [http://localhost:3101](http://localhost:3101) (браузер откроется автоматически). REST: порт **3102**, сокеты: **3103**.

Тестовые учётные записи:

- `a@a.ru` / `1234` — администратор  
- `u@u.ru` / `1234` — пользователь  

## Скрипты корня

| Команда       | Назначение                                      |
|---------------|-------------------------------------------------|
| `yarn dev`    | Параллельно API+сокеты (back) и Vite (front)   |
| `yarn build`  | Сборка `back/build` и `front/build`            |
| `yarn db:init`| Пересоздание схемы БД и сид тестовых пользователей |
| `yarn clean`  | Удаление `node_modules` и каталогов сборки      |
| `yarn stop`   | Принудительная остановка процессов на 3101–3103 |

## Структура

- `back/` — сервер, `sql/init_db.sql`, `sql/upd_db.sql`
- `front/` — клиент Vite + React
- `scripts/` — вспомогательные скрипты корня

Подробности изменений — в `HISTORY.md`.
