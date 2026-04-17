-- ============================================================
-- Инициализация базы данных chat_cline_sonnet
-- Файл: back/sql/init_db.sql
-- Описание: Полная инициализация БД — пользователь, база, схема,
--            таблицы и начальные данные.
-- Версия: 1.0.0 | 2026-04-17
-- ============================================================

-- ============================================================
-- 1. Создание пользователя БД
-- ============================================================

-- Создаём пользователя chat_cline_sonnet если он не существует
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'chat_cline_sonnet') THEN
        CREATE USER chat_cline_sonnet WITH PASSWORD 'chat_pass_2024';
        COMMENT ON ROLE chat_cline_sonnet IS 'Пользователь приложения chat_cline_sonnet';
    ELSE
        -- Обновляем пароль если пользователь уже существует
        ALTER USER chat_cline_sonnet WITH PASSWORD 'chat_pass_2024';
    END IF;
END
$$;

-- ============================================================
-- 2. Создание базы данных (выполнять от имени postgres)
-- ============================================================

-- База создаётся в скрипте initDb.ts через pg от postgres
-- Здесь только структура таблиц (выполняется уже в контексте chat_cline_sonnet БД)

-- ============================================================
-- 3. Расширения
-- ============================================================

-- Расширение для генерации UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
COMMENT ON EXTENSION "uuid-ossp" IS 'Генерация UUID значений';

-- ============================================================
-- 4. Таблица пользователей (users)
-- ============================================================

-- Удаляем существующие таблицы (порядок важен из-за FK)
DROP TABLE IF EXISTS message_reactions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_members CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Тип для роли пользователя
DROP TYPE IF EXISTS user_role CASCADE;
CREATE TYPE user_role AS ENUM ('user', 'admin');
COMMENT ON TYPE user_role IS 'Роль пользователя: user — обычный, admin — администратор';

-- Таблица пользователей
CREATE TABLE users (
    -- Уникальный идентификатор пользователя (UUID)
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Email пользователя (используется как логин и отображаемое имя)
    email       VARCHAR(255) NOT NULL UNIQUE,
    -- Хэш пароля (bcrypt)
    password    VARCHAR(255) NOT NULL,
    -- Роль пользователя
    role        user_role NOT NULL DEFAULT 'user',
    -- Дата и время создания аккаунта
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Дата и время последнего обновления
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Пользователи приложения';
COMMENT ON COLUMN users.id IS 'UUID пользователя — первичный ключ';
COMMENT ON COLUMN users.email IS 'Email адрес — используется как логин и отображаемое имя';
COMMENT ON COLUMN users.password IS 'Хэш пароля bcrypt';
COMMENT ON COLUMN users.role IS 'Роль: user (обычный) или admin (администратор)';
COMMENT ON COLUMN users.created_at IS 'Дата и время регистрации';
COMMENT ON COLUMN users.updated_at IS 'Дата и время последнего изменения записи';

-- Индекс по email для быстрого поиска при авторизации
CREATE INDEX idx_users_email ON users (email);

-- ============================================================
-- 5. Таблица refresh токенов (refresh_tokens)
-- ============================================================

CREATE TABLE refresh_tokens (
    -- Уникальный идентификатор токена
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Владелец токена
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Значение токена (хранится в зашифрованном виде)
    token       TEXT NOT NULL UNIQUE,
    -- Дата истечения токена
    expires_at  TIMESTAMPTZ NOT NULL,
    -- Дата создания
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE refresh_tokens IS 'Refresh JWT токены пользователей';
COMMENT ON COLUMN refresh_tokens.id IS 'UUID токена';
COMMENT ON COLUMN refresh_tokens.user_id IS 'Ссылка на пользователя (users.id)';
COMMENT ON COLUMN refresh_tokens.token IS 'Строка refresh токена';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Дата и время истечения токена';
COMMENT ON COLUMN refresh_tokens.created_at IS 'Дата создания токена';

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens (token);

-- ============================================================
-- 6. Таблица чатов (chats)
-- ============================================================

-- Тип чата
DROP TYPE IF EXISTS chat_type CASCADE;
CREATE TYPE chat_type AS ENUM ('direct', 'group');
COMMENT ON TYPE chat_type IS 'Тип чата: direct — личный, group — групповой';

CREATE TABLE chats (
    -- UUID чата
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Тип чата: direct или group
    type        chat_type NOT NULL DEFAULT 'direct',
    -- Название чата (для групп, для direct NULL)
    name        VARCHAR(255),
    -- Создатель чата
    creator_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Дата создания
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Дата обновления
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE chats IS 'Чаты (личные и групповые)';
COMMENT ON COLUMN chats.id IS 'UUID чата';
COMMENT ON COLUMN chats.type IS 'Тип: direct (личный 1:1) или group (групповой)';
COMMENT ON COLUMN chats.name IS 'Название группы (NULL для личных чатов)';
COMMENT ON COLUMN chats.creator_id IS 'Пользователь создавший чат';
COMMENT ON COLUMN chats.created_at IS 'Дата создания чата';
COMMENT ON COLUMN chats.updated_at IS 'Дата последнего изменения';

-- ============================================================
-- 7. Таблица участников чата (chat_members)
-- ============================================================

CREATE TABLE chat_members (
    -- UUID записи
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Чат
    chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    -- Участник
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Дата добавления в чат
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Уникальность: один пользователь в чате только один раз
    UNIQUE(chat_id, user_id)
);

COMMENT ON TABLE chat_members IS 'Участники чатов (связь многие-ко-многим)';
COMMENT ON COLUMN chat_members.chat_id IS 'Ссылка на чат';
COMMENT ON COLUMN chat_members.user_id IS 'Ссылка на пользователя';
COMMENT ON COLUMN chat_members.joined_at IS 'Дата вступления в чат';

CREATE INDEX idx_chat_members_chat_id ON chat_members (chat_id);
CREATE INDEX idx_chat_members_user_id ON chat_members (user_id);

-- ============================================================
-- 8. Таблица сообщений (messages)
-- ============================================================

CREATE TABLE messages (
    -- UUID сообщения
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Чат к которому относится сообщение
    chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    -- Автор сообщения
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Текст сообщения
    content     TEXT NOT NULL,
    -- Ссылка на сообщение-ответ (цитирование)
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    -- Список упомянутых пользователей (UUID[])
    mentions    UUID[] DEFAULT '{}',
    -- Дата отправки
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Дата изменения (для будущего редактирования)
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE messages IS 'Сообщения в чатах';
COMMENT ON COLUMN messages.id IS 'UUID сообщения';
COMMENT ON COLUMN messages.chat_id IS 'Ссылка на чат (chats.id)';
COMMENT ON COLUMN messages.user_id IS 'Автор сообщения (users.id)';
COMMENT ON COLUMN messages.content IS 'Текст сообщения';
COMMENT ON COLUMN messages.reply_to_id IS 'Ссылка на цитируемое сообщение (NULL если не ответ)';
COMMENT ON COLUMN messages.mentions IS 'Массив UUID упомянутых пользователей';
COMMENT ON COLUMN messages.created_at IS 'Дата и время отправки сообщения';
COMMENT ON COLUMN messages.updated_at IS 'Дата и время редактирования сообщения';

CREATE INDEX idx_messages_chat_id ON messages (chat_id, created_at DESC);
CREATE INDEX idx_messages_user_id ON messages (user_id);
CREATE INDEX idx_messages_reply_to ON messages (reply_to_id) WHERE reply_to_id IS NOT NULL;

-- ============================================================
-- 9. Таблица реакций на сообщения (message_reactions)
-- ============================================================

CREATE TABLE message_reactions (
    -- UUID реакции
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Сообщение
    message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    -- Пользователь поставивший реакцию
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Эмодзи реакции
    emoji       VARCHAR(10) NOT NULL,
    -- Дата создания реакции
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Уникальность: один пользователь — одна реакция одним эмодзи на сообщение
    UNIQUE(message_id, user_id, emoji)
);

COMMENT ON TABLE message_reactions IS 'Реакции пользователей на сообщения';
COMMENT ON COLUMN message_reactions.message_id IS 'Ссылка на сообщение';
COMMENT ON COLUMN message_reactions.user_id IS 'Пользователь поставивший реакцию';
COMMENT ON COLUMN message_reactions.emoji IS 'Эмодзи символ реакции';
COMMENT ON COLUMN message_reactions.created_at IS 'Дата постановки реакции';

CREATE INDEX idx_reactions_message_id ON message_reactions (message_id);

-- ============================================================
-- 10. Права доступа
-- ============================================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chat_cline_sonnet;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chat_cline_sonnet;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO chat_cline_sonnet;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO chat_cline_sonnet;

-- ============================================================
-- 11. Тестовые пользователи
-- ============================================================
-- Пароли хэшируются в скрипте initDb.ts
-- Здесь только placeholder — реальная вставка через Node.js

-- ============================================================
-- Конец файла инициализации
-- ============================================================
