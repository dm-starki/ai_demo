# Chat — Клиент-серверный чат

Полнофункциональное веб-приложение чата с реалтайм-обменом сообщениями.

## Стек технологий

**Бэкенд** (`back/`): Node.js · TypeScript · Fastify · Socket.io · PostgreSQL · JWT  
**Фронтенд** (`front/`): React · TypeScript · Vite · Ant Design · RTK Query · Socket.io-client

## Быстрый старт

### 1. Установка зависимостей

```bash
yarn install
```

### 2. Инициализация базы данных

```bash
yarn db:init
```

Создаёт БД `chat_cline_sonnet`, пользователя БД, схему таблиц и тестовых пользователей:
- `a@a.ru` / `1234` — администратор
- `u@u.ru` / `1234` — пользователь

### 3. Запуск в режиме разработки

```bash
yarn dev
```

Запускает:
- **API** на `http://localhost:5202`
- **WebSocket** на `http://localhost:5203`
- **Фронтенд** на `http://localhost:5201` (откроется в браузере автоматически)

## Команды

| Команда | Описание |
|---------|----------|
| `yarn dev` | Запуск в режиме разработки (фронт + бэк) |
| `yarn build` | Сборка для продуктива |
| `yarn db:init` | Инициализация / сброс базы данных |
| `yarn clean` | Удаление `build/` и `node_modules/` |
| `yarn stop` | Остановка запущенных сервисов |

## Структура проекта

```
chat_cline_sonnet/
├── back/                   # Бэкенд
│   ├── src/
│   │   ├── config.ts       # Конфигурация из .env
│   │   ├── index.ts        # Точка входа
│   │   ├── db/             # Подключение к БД и инициализация
│   │   ├── middleware/     # JWT аутентификация
│   │   ├── plugins/        # Socket.io
│   │   ├── routes/         # HTTP маршруты
│   │   ├── services/       # Бизнес-логика
│   │   └── types/          # TypeScript типы
│   └── sql/
│       ├── init_db.sql     # Инициализация схемы БД
│       └── upd_db.sql      # История изменений БД
├── front/                  # Фронтенд
│   └── src/
│       ├── api/            # RTK Query эндпоинты
│       ├── components/     # React компоненты
│       ├── hooks/          # Кастомные хуки
│       ├── pages/          # Страницы
│       ├── store/          # Redux store
│       ├── types/          # TypeScript типы
│       └── utils/          # Утилиты
├── package.json            # Корневой package.json (workspaces)
├── README.md
└── HISTORY.md
```

## API эндпоинты

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/login` | Авторизация |
| POST | `/api/auth/refresh` | Обновление токенов |
| POST | `/api/auth/logout` | Выход |
| GET | `/api/auth/me` | Текущий пользователь |
| GET | `/api/users` | Список пользователей (admin) |
| POST | `/api/users` | Создать пользователя (admin) |
| PUT | `/api/users/:id` | Изменить пользователя (admin) |
| DELETE | `/api/users/:id` | Удалить пользователя (admin) |
| PUT | `/api/users/password` | Изменить свой пароль |
| GET | `/api/chats` | Список чатов |
| POST | `/api/chats/direct` | Создать личный чат |
| POST | `/api/chats/group` | Создать группу |
| GET | `/api/chats/:id/messages` | Сообщения чата |
| GET | `/api/health` | Проверка состояния сервера |

## WebSocket события

| Событие | Направление | Описание |
|---------|-------------|----------|
| `chat:join` | клиент→сервер | Войти в комнату чата |
| `chat:leave` | клиент→сервер | Покинуть комнату |
| `message:send` | клиент→сервер | Отправить сообщение |
| `message:new` | сервер→клиент | Новое сообщение |
| `message:react` | клиент→сервер | Реакция на сообщение |
| `message:reactions` | сервер→клиент | Обновлённые реакции |
| `typing:start` | клиент→сервер | Начал печатать |
| `typing:stop` | клиент→сервер | Перестал печатать |
| `users:online` | сервер→клиент | Список онлайн пользователей |
