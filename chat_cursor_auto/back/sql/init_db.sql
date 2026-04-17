-- =============================================================================
-- Файл: init_db.sql
-- Назначение: полная инициализация базы данных проекта «chat_cursor_auto»:
--             роль приложения, сама база, таблицы, ограничения, комментарии к
--             объектам и права доступа для роли приложения.
-- Выполнение (локально / сервер): от суперпользователя postgres, подключение к
--             служебной базе postgres:
--   PGPASSWORD=<пароль_postgres> psql -h localhost -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f back/sql/init_db.sql
-- Примечание: команда DROP DATABASE ... WITH (FORCE) завершает активные
--             сессии к целевой базе (PostgreSQL 13+).
-- =============================================================================

\set ON_ERROR_STOP on

-- Завершить сторонние подключения к базе (если она существует)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'chat_cursor_auto'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS chat_cursor_auto WITH (FORCE);

-- -----------------------------------------------------------------------------
-- Роль приложения: после удаления БД пересоздаём роль, чтобы пароль и права
-- соответствовали актуальному init_db.sql (избегаем рассинхрона с DO/IF NOT EXISTS).
-- -----------------------------------------------------------------------------
DROP ROLE IF EXISTS chat_cursor_auto;

CREATE ROLE chat_cursor_auto LOGIN PASSWORD 'LocalChatCursorAuto_2026';

CREATE DATABASE chat_cursor_auto
  OWNER chat_cursor_auto
  TEMPLATE template0
  ENCODING 'UTF8';

COMMENT ON DATABASE chat_cursor_auto IS 'База данных клиент-серверного чата chat_cursor_auto (пользователи, беседы, сообщения, реакции).';

\c chat_cursor_auto postgres

-- -----------------------------------------------------------------------------
-- Таблица: users — учётные записи пользователей веб-приложения
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- email: уникальный логин и отображаемое имя в интерфейсе
  email TEXT NOT NULL UNIQUE,
  -- password_hash: хэш пароля (bcrypt), пароль в открытом виде не хранится
  password_hash TEXT NOT NULL,
  -- role: роль в приложении — user (обычный) или admin (администратор)
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE users IS 'Пользователи чата: email, хэш пароля и роль.';
COMMENT ON COLUMN users.id IS 'Первичный ключ, UUID v4.';
COMMENT ON COLUMN users.email IS 'Электронная почта; используется как логин и отображаемое имя.';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt-хэш пароля.';
COMMENT ON COLUMN users.role IS 'Роль: user | admin.';
COMMENT ON COLUMN users.created_at IS 'Дата и время создания записи.';

-- -----------------------------------------------------------------------------
-- Таблица: conversations — беседы (личные и групповые)
-- -----------------------------------------------------------------------------
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- kind: direct — личный чат между двумя пользователями; group — группа
  kind TEXT NOT NULL CHECK (kind IN ('direct', 'group')),
  -- title: название группы; для direct обычно NULL (имя берётся из собеседника)
  title TEXT,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE conversations IS 'Беседы: личные (direct) и групповые (group).';
COMMENT ON COLUMN conversations.kind IS 'Тип: direct | group.';
COMMENT ON COLUMN conversations.title IS 'Название группы; для личных чатов может быть NULL.';

-- -----------------------------------------------------------------------------
-- Таблица: conversation_members — состав участников беседы
-- -----------------------------------------------------------------------------
CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

COMMENT ON TABLE conversation_members IS 'Связь беседа — участник (многие ко многим).';
COMMENT ON COLUMN conversation_members.joined_at IS 'Момент добавления пользователя в беседу.';

-- -----------------------------------------------------------------------------
-- Таблица: messages — сообщения в беседах
-- -----------------------------------------------------------------------------
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  -- reply_to_id: ссылка на сообщение, на которое дано «ответить»
  reply_to_id UUID REFERENCES messages (id) ON DELETE SET NULL,
  -- mentions: массив UUID пользователей, упомянутых в сообщении (@тег)
  mentions UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE messages IS 'Сообщения чата с опциональной цитатой и упоминаниями.';
COMMENT ON COLUMN messages.body IS 'Текст сообщения.';
COMMENT ON COLUMN messages.reply_to_id IS 'ID сообщения, на которое отвечают.';
COMMENT ON COLUMN messages.mentions IS 'Массив UUID упомянутых пользователей.';

CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Таблица: message_reactions — реакции (эмодзи) на сообщения
-- -----------------------------------------------------------------------------
CREATE TABLE message_reactions (
  message_id UUID NOT NULL REFERENCES messages (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- emoji: строка эмодзи или короткий код (как в UI)
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);

COMMENT ON TABLE message_reactions IS 'Реакции пользователей на сообщения; видны всем участникам беседы.';
COMMENT ON COLUMN message_reactions.emoji IS 'Символ или код реакции.';

-- -----------------------------------------------------------------------------
-- Права для роли приложения
-- -----------------------------------------------------------------------------
GRANT CONNECT ON DATABASE chat_cursor_auto TO chat_cursor_auto;
GRANT USAGE ON SCHEMA public TO chat_cursor_auto;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO chat_cursor_auto;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO chat_cursor_auto;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO chat_cursor_auto;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO chat_cursor_auto;
