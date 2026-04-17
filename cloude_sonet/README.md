# AI Chat — Клиент-серверный чат

Полноценный чат в реальном времени с поддержкой групп, реакций, ответов на сообщения и управлением пользователями.

## Технологический стек

### Бэкенд (`back/`)
- **Node.js** v22+ / **TypeScript** (ESM модули, стрелочные функции)
- **Fastify** — HTTP REST API (порт 3402)
- **Socket.io** — WebSocket сервер (порт 3403, отдельный порт)
- **PostgreSQL** — база данных
- **JWT** — аутентификация (access + refresh токены)
- **bcryptjs** — хэширование паролей

### Фронтенд (`front/`)
- **React 18** / **TypeScript** (SPA, стрелочные функции)
- **Vite** — сборщик (порт 3401)
- **ANT Design 5** — UI компоненты
- **RTK Query** — REST запросы
- **Socket.io-client** — WebSocket клиент
- **React Router 6** — маршрутизация
- **Redux Toolkit** — управление состоянием

## Требования

- Node.js >= 18.0.0
- Yarn >= 1.22.0
- PostgreSQL >= 14 (должен быть запущен)

## Быстрый старт

```bash
# 1. Установить зависимости
cd back && yarn install
cd ../front && yarn install

# 2. Инициализировать базу данных
yarn db:init

# 3. Запустить в режиме разработки
yarn dev
```

Браузер откроется автоматически на http://localhost:3401

## Команды из корневого каталога

| Команда | Описание |
|---------|----------|
| `yarn dev` | Запуск в режиме разработки (фронт + бэкенд) |
| `yarn build` | Сборка для продакшена |
| `yarn db:init` | Инициализация базы данных |
| `yarn stop` | Остановка всех сервисов |
| `yarn clean` | Удаление build и node_modules |
| `yarn install:all` | Установка всех зависимостей |

## Конфигурация

### Бэкенд (`back/.env`)
```env
HOST=0.0.0.0
PORT=3402              # REST API порт
SOCKET_PORT=3403       # WebSocket порт
DB_HOST=localhost
DB_NAME=cursor_sonnet
DB_USER=cursor_sonnet
DB_PASSWORD=cursor_sonnet_pass
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
```

### Фронтенд (`front/.env`)
```env
VITE_API_URL=http://localhost:3402
VITE_SOCKET_URL=http://localhost:3403
```

Примеры для продакшена: `back/.env.example` и `front/.env.example`

## Порты

| Сервис | Порт | Описание |
|--------|------|----------|
| Фронтенд | 3401 | React SPA (Vite dev server) |
| REST API | 3402 | Fastify HTTP сервер |
| WebSocket | 3403 | Socket.io сервер |

## База данных

- **Хост**: localhost
- **БД**: cursor_sonnet
- **Пользователь**: cursor_sonnet
- **Пароль**: cursor_sonnet_pass

### SQL файлы (`back/sql/`)
- `init_db.sql` — полная инициализация схемы (запускается при `yarn db:init`)
- `upd_db.sql` — последовательные обновления схемы

## Тестовые пользователи

| Email | Пароль | Роль |
|-------|--------|------|
| a@a.ru | 1234 | Администратор |
| u@u.ru | 1234 | Пользователь |

## Функциональность

### Аутентификация
- Вход по email/пароль
- JWT токены (access 1ч + refresh 7д)
- Хранение токенов в sessionStorage
- Автоматическое обновление токена каждый час при активном сеансе

### Чат
- Личные чаты между пользователями
- Групповые чаты с несколькими участниками
- Сообщения в реальном времени через Socket.io
- Ответы на сообщения (цитирование)
- Реакции emoji (как в Telegram)
- Индикатор набора текста
- Статус онлайн пользователей
- Выбор emoji в сообщениях
- Тегирование @пользователей

### Управление пользователями (admin)
- Табличный список пользователей
- Создание, редактирование, удаление пользователей
- Смена роли пользователя

### Настройки
- Смена пароля текущим пользователем

## Структура проекта

```
/
├── package.json          # Корневой пакет (скрипты управления)
├── scripts/              # Bash скрипты (dev, build, stop, clean)
├── README.md
├── HISTORY.md
├── back/                 # Бэкенд
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env              # Локальная конфигурация
│   ├── .env.example      # Пример для продакшена
│   ├── sql/
│   │   ├── init_db.sql   # Инициализация БД
│   │   └── upd_db.sql    # Обновления БД
│   └── src/
│       ├── index.ts      # Точка входа
│       ├── config/       # Конфигурация из .env
│       ├── db/           # Подключение к PostgreSQL
│       ├── middleware/   # JWT middleware
│       ├── routes/       # REST маршруты
│       ├── sockets/      # Socket.io сервер
│       └── types/        # TypeScript типы
└── front/                # Фронтенд
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── .env              # Локальная конфигурация
    ├── .env.example      # Пример для продакшена
    └── src/
        ├── main.tsx      # Точка входа
        ├── App.tsx       # Корневой компонент + роутер
        ├── api/          # RTK Query endpoints
        ├── components/   # React компоненты
        ├── hooks/        # Кастомные хуки
        ├── pages/        # Страницы приложения
        ├── store/        # Redux store + слайсы
        └── types/        # TypeScript типы
```
