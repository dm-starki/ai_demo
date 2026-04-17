# История изменений

## v1.0.0 — 2026-04-17

### Начальная версия проекта

#### Инфраструктура
- Монорепозиторий с yarn workspaces (back + front)
- Единые скрипты запуска из корня: `yarn dev`, `yarn build`, `yarn db:init`, `yarn clean`, `yarn stop`
- Конфигурация через `.env` файлы (раздельные для фронта и бэка)
- Добавлены примеры конфигурации для продуктива (`.env.production`)

#### База данных
- PostgreSQL, БД `chat_cline_sonnet`
- Пользователь БД `chat_cline_sonnet`
- Таблицы: `users`, `refresh_tokens`, `chats`, `chat_members`, `messages`, `message_reactions`
- Файлы инициализации: `back/sql/init_db.sql`, `back/sql/upd_db.sql`
- Тестовые пользователи: `a@a.ru` (admin), `u@u.ru` (user)

#### Бэкенд (back/)
- Fastify HTTP API на порту 5202
- Socket.io WebSocket на порту 5203
- JWT авторизация (access + refresh токены)
- Маршруты: `/api/auth`, `/api/users`, `/api/chats`
- Реалтайм: сообщения, реакции, индикатор набора текста, онлайн-статус

#### Фронтенд (front/)
- React 18 + Vite + TypeScript
- Ant Design UI
- RTK Query для HTTP запросов
- Redux Toolkit для состояния
- Socket.io-client для реалтайм
- React Router v6 с защищёнными маршрутами
- Страницы: Авторизация, Чат, Пользователи (admin), Настройки
- Токены в sessionStorage с автообновлением каждые 55 минут
