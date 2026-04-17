-- =============================================================================
-- Файл инициализации базы данных cursor_sonnet
-- Проект: AI Chat (клиент-серверный чат)
-- Версия: 1.0.0
-- Дата создания: 2026-04-16
-- =============================================================================
-- ВАЖНО: Этот файл пересоздаёт всю схему БД с нуля.
-- Запускается командой yarn db:init из корневого каталога проекта.
-- =============================================================================

-- Включаем расширение для генерации UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ТАБЛИЦА: users (Пользователи)
-- Хранит учётные записи пользователей системы.
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
    -- Уникальный идентификатор пользователя (UUID)
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Электронная почта - используется как логин, отображаемое имя пользователя
    email       VARCHAR(255) NOT NULL UNIQUE,

    -- Хэш пароля (bcrypt)
    password    VARCHAR(255) NOT NULL,

    -- Роль пользователя: 'user' - обычный, 'admin' - администратор
    role        VARCHAR(20) NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'admin')),

    -- Дата и время создания записи
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Дата и время последнего обновления
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Учётные записи пользователей чата';
COMMENT ON COLUMN users.id IS 'Уникальный идентификатор пользователя (UUID v4)';
COMMENT ON COLUMN users.email IS 'Электронная почта, используется как логин и отображаемое имя';
COMMENT ON COLUMN users.password IS 'Хэш пароля (bcrypt, cost=10)';
COMMENT ON COLUMN users.role IS 'Роль: user - обычный пользователь, admin - администратор';
COMMENT ON COLUMN users.created_at IS 'Дата и время регистрации пользователя';
COMMENT ON COLUMN users.updated_at IS 'Дата и время последнего изменения записи';

-- Индекс для быстрого поиска по email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =============================================================================
-- ТАБЛИЦА: refresh_tokens (Refresh-токены JWT)
-- Хранит активные refresh-токены для продления сессий.
-- =============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    -- Уникальный идентификатор токена
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ссылка на пользователя
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Значение токена (уникальное)
    token       TEXT NOT NULL UNIQUE,

    -- Дата и время истечения срока действия
    expires_at  TIMESTAMPTZ NOT NULL,

    -- Дата создания токена
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE refresh_tokens IS 'Активные refresh-токены JWT для продления сессий';
COMMENT ON COLUMN refresh_tokens.id IS 'Уникальный идентификатор записи токена';
COMMENT ON COLUMN refresh_tokens.user_id IS 'Ссылка на пользователя (каскадное удаление)';
COMMENT ON COLUMN refresh_tokens.token IS 'Значение refresh-токена';
COMMENT ON COLUMN refresh_tokens.expires_at IS 'Время истечения - 7 дней с момента создания';
COMMENT ON COLUMN refresh_tokens.created_at IS 'Время создания токена';

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- =============================================================================
-- ТАБЛИЦА: conversations (Беседы / Чаты)
-- Хранит индивидуальные и групповые беседы.
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversations (
    -- Уникальный идентификатор беседы
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Тип беседы: 'direct' - личный чат, 'group' - групповой чат
    type        VARCHAR(10) NOT NULL DEFAULT 'direct'
                CHECK (type IN ('direct', 'group')),

    -- Название (для групповых чатов)
    name        VARCHAR(255),

    -- Создатель беседы
    created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Дата создания беседы
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Дата последнего изменения
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE conversations IS 'Беседы: личные чаты и групповые чаты';
COMMENT ON COLUMN conversations.id IS 'Уникальный идентификатор беседы';
COMMENT ON COLUMN conversations.type IS 'Тип: direct - личный чат, group - групповой';
COMMENT ON COLUMN conversations.name IS 'Название группового чата (NULL для личных)';
COMMENT ON COLUMN conversations.created_by IS 'Пользователь, создавший беседу';
COMMENT ON COLUMN conversations.created_at IS 'Дата и время создания беседы';
COMMENT ON COLUMN conversations.updated_at IS 'Дата последнего сообщения или изменения';

CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON conversations(created_by);

-- =============================================================================
-- ТАБЛИЦА: conversation_members (Участники бесед)
-- Связывает пользователей с беседами.
-- =============================================================================
CREATE TABLE IF NOT EXISTS conversation_members (
    -- Ссылка на беседу
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Ссылка на пользователя
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Дата добавления в беседу
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Первичный ключ - комбинация беседы и пользователя
    PRIMARY KEY (conversation_id, user_id)
);

COMMENT ON TABLE conversation_members IS 'Участники бесед - связь пользователей с чатами';
COMMENT ON COLUMN conversation_members.conversation_id IS 'Ссылка на беседу';
COMMENT ON COLUMN conversation_members.user_id IS 'Ссылка на участника беседы';
COMMENT ON COLUMN conversation_members.joined_at IS 'Дата и время добавления в беседу';

CREATE INDEX IF NOT EXISTS idx_conv_members_conversation ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);

-- =============================================================================
-- ТАБЛИЦА: messages (Сообщения)
-- Хранит все сообщения чата.
-- =============================================================================
CREATE TABLE IF NOT EXISTS messages (
    -- Уникальный идентификатор сообщения
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Беседа, к которой относится сообщение
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,

    -- Автор сообщения
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Текст сообщения
    content         TEXT NOT NULL,

    -- Ссылка на сообщение-ответ (для цитирования)
    reply_to_id     UUID REFERENCES messages(id) ON DELETE SET NULL,

    -- Время отправки сообщения
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Время редактирования (NULL если не редактировалось)
    edited_at       TIMESTAMPTZ
);

COMMENT ON TABLE messages IS 'Сообщения чата';
COMMENT ON COLUMN messages.id IS 'Уникальный идентификатор сообщения';
COMMENT ON COLUMN messages.conversation_id IS 'Беседа, к которой принадлежит сообщение';
COMMENT ON COLUMN messages.sender_id IS 'Отправитель сообщения';
COMMENT ON COLUMN messages.content IS 'Текстовое содержание сообщения (поддерживает emoji и @упоминания)';
COMMENT ON COLUMN messages.reply_to_id IS 'Ссылка на цитируемое сообщение (NULL если не ответ)';
COMMENT ON COLUMN messages.created_at IS 'Дата и время отправки';
COMMENT ON COLUMN messages.edited_at IS 'Дата последнего редактирования (NULL если не менялось)';

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);

-- =============================================================================
-- ТАБЛИЦА: message_reactions (Реакции на сообщения)
-- Хранит эмодзи-реакции пользователей на сообщения.
-- =============================================================================
CREATE TABLE IF NOT EXISTS message_reactions (
    -- Сообщение, на которое поставлена реакция
    message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,

    -- Пользователь, поставивший реакцию
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Эмодзи-реакция (например: 👍, ❤️, 😂)
    emoji       VARCHAR(10) NOT NULL,

    -- Время постановки реакции
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Один пользователь - одна реакция одним эмодзи на одно сообщение
    PRIMARY KEY (message_id, user_id, emoji)
);

COMMENT ON TABLE message_reactions IS 'Эмодзи-реакции пользователей на сообщения';
COMMENT ON COLUMN message_reactions.message_id IS 'Сообщение, получившее реакцию';
COMMENT ON COLUMN message_reactions.user_id IS 'Пользователь, поставивший реакцию';
COMMENT ON COLUMN message_reactions.emoji IS 'Символ эмодзи-реакции';
COMMENT ON COLUMN message_reactions.created_at IS 'Время постановки реакции';

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON message_reactions(user_id);

-- =============================================================================
-- ФУНКЦИЯ: update_updated_at()
-- Автоматически обновляет поле updated_at при изменении записи.
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at() IS
    'Триггер-функция: обновляет поле updated_at до текущего времени при UPDATE';

-- Триггер для таблицы users
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Триггер для таблицы conversations
CREATE TRIGGER trg_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- ТЕСТОВЫЕ ДАННЫЕ
-- Создание двух тестовых пользователей.
-- Пароли хэшированы через bcrypt (cost=10).
-- a@a.ru / 1234 — администратор
-- u@u.ru / 1234 — обычный пользователь
-- =============================================================================

-- Пользователь-администратор
INSERT INTO users (email, password, role)
VALUES (
    'a@a.ru',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin'
) ON CONFLICT (email) DO UPDATE
    SET password = EXCLUDED.password,
        role = EXCLUDED.role,
        updated_at = NOW();

-- Обычный пользователь
INSERT INTO users (email, password, role)
VALUES (
    'u@u.ru',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'user'
) ON CONFLICT (email) DO UPDATE
    SET password = EXCLUDED.password,
        role = EXCLUDED.role,
        updated_at = NOW();

-- =============================================================================
-- Завершение инициализации
-- =============================================================================
