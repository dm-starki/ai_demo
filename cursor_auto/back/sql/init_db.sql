-- =============================================================================
-- Файл: init_db.sql
-- Назначение: первичная инициализация схемы базы данных чата «cursor_auto».
-- Порядок применения: выполняется один раз при развёртывании (или через yarn db:init).
-- Расширения: pgcrypto — для генерации bcrypt-хешей паролей при начальном наполнении.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMENT ON EXTENSION pgcrypto IS 'Криптографические функции PostgreSQL; используется gen_salt/crypt для тестовых паролей в начальных данных.';

-- -----------------------------------------------------------------------------
-- Тип: user_role — роль учётной записи в системе.
-- Значения: user — обычный пользователь; admin — администратор (управление пользователями).
-- -----------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('user', 'admin');

COMMENT ON TYPE user_role IS 'Роли пользователя: user — обычный доступ; admin — расширенные права (раздел «Пользователи»).';

-- -----------------------------------------------------------------------------
-- Тип: conversation_type — вид беседы.
-- direct — личный чат между двумя пользователями; group — группа с названием.
-- -----------------------------------------------------------------------------
CREATE TYPE conversation_type AS ENUM ('direct', 'group');

COMMENT ON TYPE conversation_type IS 'Тип беседы: direct — диалог 1:1; group — групповой чат с именем.';

-- -----------------------------------------------------------------------------
-- Таблица: users — учётные записи.
-- Поля:
--   id            — UUID, первичный ключ.
--   email         — уникальный логин (отображается везде как имя пользователя).
--   password_hash — bcrypt-хеш пароля (генерируется приложением или crypt в SQL).
--   role          — роль (user_role).
--   created_at    — время создания записи.
--   updated_at    — время последнего изменения (пароль, email и т.д.).
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Пользователи системы: email как отображаемое имя, пароль в виде bcrypt, роль.';
COMMENT ON COLUMN users.id IS 'Уникальный идентификатор пользователя (UUID).';
COMMENT ON COLUMN users.email IS 'Электронная почта; уникальный логин, показывается в интерфейсе.';
COMMENT ON COLUMN users.password_hash IS 'Хеш пароля (алгоритм bcrypt, стоимость согласована с приложением).';
COMMENT ON COLUMN users.role IS 'Роль: user или admin.';
COMMENT ON COLUMN users.created_at IS 'Дата и время регистрации.';
COMMENT ON COLUMN users.updated_at IS 'Дата и время последнего обновления профиля.';

CREATE INDEX idx_users_email_lower ON users (LOWER(email));

-- -----------------------------------------------------------------------------
-- Таблица: conversations — беседы (личные и группы).
-- -----------------------------------------------------------------------------
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL,
  name VARCHAR(255),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_group_name CHECK (
    (type = 'group' AND name IS NOT NULL AND length(trim(name)) > 0)
    OR (type = 'direct' AND name IS NULL)
  )
);

COMMENT ON TABLE conversations IS 'Беседы: личные (direct) или группы (group) с названием.';
COMMENT ON COLUMN conversations.id IS 'Идентификатор беседы.';
COMMENT ON COLUMN conversations.type IS 'direct — пара пользователей; group — несколько участников, есть имя.';
COMMENT ON COLUMN conversations.name IS 'Название группы; для direct всегда NULL.';
COMMENT ON COLUMN conversations.created_by IS 'Кто создал беседу (группу или инициатор пары).';
COMMENT ON COLUMN conversations.created_at IS 'Время создания беседы.';

-- -----------------------------------------------------------------------------
-- Таблица: conversation_members — участники беседы.
-- -----------------------------------------------------------------------------
CREATE TABLE conversation_members (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

COMMENT ON TABLE conversation_members IS 'Связь пользователь ↔ беседа (многие ко многим).';
COMMENT ON COLUMN conversation_members.conversation_id IS 'Ссылка на беседу.';
COMMENT ON COLUMN conversation_members.user_id IS 'Ссылка на пользователя.';
COMMENT ON COLUMN conversation_members.joined_at IS 'Когда пользователь вступил в беседу.';

CREATE INDEX idx_conv_members_user ON conversation_members (user_id);

-- -----------------------------------------------------------------------------
-- Таблица: messages — сообщения в беседе.
-- sender_email — денормализация: отображение после возможного удаления отправителя.
-- -----------------------------------------------------------------------------
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_email VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE messages IS 'Сообщения чата с привязкой к беседе и отправителю.';
COMMENT ON COLUMN messages.id IS 'Идентификатор сообщения.';
COMMENT ON COLUMN messages.conversation_id IS 'Беседа, в которой отправлено сообщение.';
COMMENT ON COLUMN messages.sender_id IS 'Отправитель (может стать NULL при удалении пользователя).';
COMMENT ON COLUMN messages.sender_email IS 'Email отправителя на момент отправки (для истории).';
COMMENT ON COLUMN messages.body IS 'Текст сообщения (включая @упоминания и смайлы как символы Unicode).';
COMMENT ON COLUMN messages.reply_to_id IS 'Ссылка на сообщение, на которое дан ответ (цитата).';
COMMENT ON COLUMN messages.created_at IS 'Время отправки на сервере.';

CREATE INDEX idx_messages_conversation_created ON messages (conversation_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- Таблица: message_mentions — явные @упоминания пользователей в сообщении.
-- -----------------------------------------------------------------------------
CREATE TABLE message_mentions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, mentioned_user_id)
);

COMMENT ON TABLE message_mentions IS 'Какие пользователи были @тегнуты в сообщении.';
COMMENT ON COLUMN message_mentions.message_id IS 'Сообщение.';
COMMENT ON COLUMN message_mentions.mentioned_user_id IS 'Упомянутый пользователь.';

-- -----------------------------------------------------------------------------
-- Таблица: message_reactions — реакции (эмодзи) на сообщение, видны всем.
-- Один пользователь — одна реакция одного вида на сообщение (как в Telegram).
-- -----------------------------------------------------------------------------
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

COMMENT ON TABLE message_reactions IS 'Реакции на сообщения: эмодзи и автор реакции.';
COMMENT ON COLUMN message_reactions.message_id IS 'Сообщение.';
COMMENT ON COLUMN message_reactions.user_id IS 'Кто поставил реакцию.';
COMMENT ON COLUMN message_reactions.emoji IS 'Символ или короткий код эмодзи (один глиф или последовательность).';
COMMENT ON COLUMN message_reactions.created_at IS 'Время установки реакции.';

CREATE INDEX idx_reactions_message ON message_reactions (message_id);

-- -----------------------------------------------------------------------------
-- Начальные тестовые пользователи создаются скриптом yarn db:init (bcrypt в Node),
-- чтобы хеш пароля совпадал с проверкой в приложении.
-- -----------------------------------------------------------------------------

COMMENT ON CONSTRAINT users_pkey ON users IS 'Первичный ключ таблицы users.';
COMMENT ON CONSTRAINT users_email_key ON users IS 'Уникальность email.';

-- -----------------------------------------------------------------------------
-- Права для роли приложения cursor_auto (объекты создаёт суперпользователь/migration).
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO cursor_auto;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cursor_auto;
GRANT USAGE ON TYPE user_role TO cursor_auto;
GRANT USAGE ON TYPE conversation_type TO cursor_auto;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cursor_auto;
