// ============================================================
// Сервис управления чатами и сообщениями
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/index.js';
import type {
  Chat, ChatWithDetails, Message, MessageWithDetails,
  MessageReaction, ReactionGroup, UserPublic
} from '../types/index.js';

// ============================================================
// Чаты
// ============================================================

/** Получить все чаты пользователя */
export const getUserChats = async (userId: string): Promise<ChatWithDetails[]> => {
  const result = await query<Chat>(
    `SELECT c.* FROM chats c
     INNER JOIN chat_members cm ON cm.chat_id = c.id
     WHERE cm.user_id = $1
     ORDER BY c.updated_at DESC`,
    [userId]
  );

  const chats: ChatWithDetails[] = [];
  for (const chat of result.rows) {
    const members = await getChatMembers(chat.id);
    const lastMsg = await getLastMessage(chat.id);
    chats.push({ ...chat, members, last_message: lastMsg });
  }
  return chats;
};

/** Найти или создать личный чат между двумя пользователями */
export const getOrCreateDirectChat = async (
  userId1: string,
  userId2: string
): Promise<ChatWithDetails> => {
  // Поиск существующего direct чата между пользователями
  const existing = await query<Chat>(
    `SELECT c.* FROM chats c
     INNER JOIN chat_members cm1 ON cm1.chat_id = c.id AND cm1.user_id = $1
     INNER JOIN chat_members cm2 ON cm2.chat_id = c.id AND cm2.user_id = $2
     WHERE c.type = 'direct'
     LIMIT 1`,
    [userId1, userId2]
  );

  if (existing.rows.length > 0) {
    const chat = existing.rows[0];
    const members = await getChatMembers(chat.id);
    return { ...chat, members, last_message: null };
  }

  // Создаём новый direct чат
  const chatId = uuidv4();
  const chatResult = await query<Chat>(
    `INSERT INTO chats (id, type, creator_id) VALUES ($1, 'direct', $2) RETURNING *`,
    [chatId, userId1]
  );
  const chat = chatResult.rows[0];

  // Добавляем обоих участников
  await query(
    `INSERT INTO chat_members (id, chat_id, user_id) VALUES ($1, $2, $3), ($4, $2, $5)`,
    [uuidv4(), chatId, userId1, uuidv4(), userId2]
  );

  const members = await getChatMembers(chatId);
  return { ...chat, members, last_message: null };
};

/** Создать групповой чат */
export const createGroupChat = async (
  name: string,
  creatorId: string,
  memberIds: string[]
): Promise<ChatWithDetails> => {
  const chatId = uuidv4();
  const chatResult = await query<Chat>(
    `INSERT INTO chats (id, type, name, creator_id) VALUES ($1, 'group', $2, $3) RETURNING *`,
    [chatId, name, creatorId]
  );
  const chat = chatResult.rows[0];

  // Добавляем всех участников (включая создателя)
  const allMembers = [...new Set([creatorId, ...memberIds])];
  for (const memberId of allMembers) {
    await query(
      `INSERT INTO chat_members (id, chat_id, user_id) VALUES ($1, $2, $3)
       ON CONFLICT (chat_id, user_id) DO NOTHING`,
      [uuidv4(), chatId, memberId]
    );
  }

  const members = await getChatMembers(chatId);
  return { ...chat, members, last_message: null };
};

/** Добавить участника в групповой чат */
export const addMemberToChat = async (chatId: string, userId: string): Promise<void> => {
  await query(
    `INSERT INTO chat_members (id, chat_id, user_id) VALUES ($1, $2, $3)
     ON CONFLICT (chat_id, user_id) DO NOTHING`,
    [uuidv4(), chatId, userId]
  );
  await query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [chatId]);
};

/** Получить участников чата */
export const getChatMembers = async (chatId: string): Promise<UserPublic[]> => {
  const result = await query<UserPublic>(
    `SELECT u.id, u.email, u.role, u.created_at, u.updated_at
     FROM users u
     INNER JOIN chat_members cm ON cm.user_id = u.id
     WHERE cm.chat_id = $1`,
    [chatId]
  );
  return result.rows;
};

/** Проверить, является ли пользователь участником чата */
export const isChatMember = async (chatId: string, userId: string): Promise<boolean> => {
  const result = await query(
    'SELECT id FROM chat_members WHERE chat_id = $1 AND user_id = $2',
    [chatId, userId]
  );
  return (result.rowCount ?? 0) > 0;
};

/** Получить чат по id */
export const getChatById = async (chatId: string): Promise<Chat | null> => {
  const result = await query<Chat>(
    'SELECT * FROM chats WHERE id = $1',
    [chatId]
  );
  return result.rows[0] ?? null;
};

// ============================================================
// Сообщения
// ============================================================

/** Получить сообщения чата с пагинацией */
export const getChatMessages = async (
  chatId: string,
  limit = 50,
  before?: string
): Promise<MessageWithDetails[]> => {
  let sql: string;
  let params: unknown[];

  if (before) {
    sql = `
      SELECT m.*, u.email as author_email, u.role as author_role,
             u.created_at as author_created_at, u.updated_at as author_updated_at
      FROM messages m
      INNER JOIN users u ON u.id = m.user_id
      WHERE m.chat_id = $1 AND m.created_at < (SELECT created_at FROM messages WHERE id = $2)
      ORDER BY m.created_at DESC
      LIMIT $3
    `;
    params = [chatId, before, limit];
  } else {
    sql = `
      SELECT m.*, u.email as author_email, u.role as author_role,
             u.created_at as author_created_at, u.updated_at as author_updated_at
      FROM messages m
      INNER JOIN users u ON u.id = m.user_id
      WHERE m.chat_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2
    `;
    params = [chatId, limit];
  }

  const result = await query<Message & {
    author_email: string;
    author_role: string;
    author_created_at: Date;
    author_updated_at: Date;
  }>(sql, params);

  // Разворачиваем в хронологическом порядке
  const messages = result.rows.reverse();

  // Обогащаем каждое сообщение деталями
  const enriched: MessageWithDetails[] = [];
  for (const row of messages) {
    const reactions = await getMessageReactions(row.id);
    let reply_to: MessageWithDetails | null = null;

    if (row.reply_to_id) {
      const replyResult = await query<Message & {
        author_email: string;
        author_role: string;
        author_created_at: Date;
        author_updated_at: Date;
      }>(
        `SELECT m.*, u.email as author_email, u.role as author_role,
                u.created_at as author_created_at, u.updated_at as author_updated_at
         FROM messages m
         INNER JOIN users u ON u.id = m.user_id
         WHERE m.id = $1`,
        [row.reply_to_id]
      );
      if (replyResult.rows.length > 0) {
        const r = replyResult.rows[0];
        reply_to = {
          ...r,
          author: {
            id: r.user_id,
            email: r.author_email,
            role: r.author_role as UserPublic['role'],
            created_at: r.author_created_at,
            updated_at: r.author_updated_at,
          },
          reactions: [],
          reply_to: null,
        };
      }
    }

    enriched.push({
      ...row,
      author: {
        id: row.user_id,
        email: row.author_email,
        role: row.author_role as UserPublic['role'],
        created_at: row.author_created_at,
        updated_at: row.author_updated_at,
      },
      reactions,
      reply_to,
    });
  }

  return enriched;
};

/** Получить последнее сообщение чата */
export const getLastMessage = async (chatId: string): Promise<Message | null> => {
  const result = await query<Message>(
    'SELECT * FROM messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 1',
    [chatId]
  );
  return result.rows[0] ?? null;
};

/** Создать сообщение */
export const createMessage = async (
  chatId: string,
  userId: string,
  content: string,
  replyToId?: string | null,
  mentions?: string[]
): Promise<MessageWithDetails> => {
  const msgId = uuidv4();
  const result = await query<Message & {
    author_email: string;
    author_role: string;
    author_created_at: Date;
    author_updated_at: Date;
  }>(
    `INSERT INTO messages (id, chat_id, user_id, content, reply_to_id, mentions)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [msgId, chatId, userId, content, replyToId ?? null, mentions ?? []]
  );

  // Обновляем updated_at чата
  await query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [chatId]);

  const msg = result.rows[0];

  // Получаем автора
  const userResult = await query<UserPublic>(
    'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1',
    [userId]
  );

  let reply_to: MessageWithDetails | null = null;
  if (replyToId) {
    const replyResult = await query<Message & {
      author_email: string;
      author_role: string;
      author_created_at: Date;
      author_updated_at: Date;
    }>(
      `SELECT m.*, u.email as author_email, u.role as author_role,
              u.created_at as author_created_at, u.updated_at as author_updated_at
       FROM messages m
       INNER JOIN users u ON u.id = m.user_id
       WHERE m.id = $1`,
      [replyToId]
    );
    if (replyResult.rows.length > 0) {
      const r = replyResult.rows[0];
      reply_to = {
        ...r,
        author: {
          id: r.user_id,
          email: r.author_email,
          role: r.author_role as UserPublic['role'],
          created_at: r.author_created_at,
          updated_at: r.author_updated_at,
        },
        reactions: [],
        reply_to: null,
      };
    }
  }

  return {
    ...msg,
    author: userResult.rows[0],
    reactions: [],
    reply_to,
  };
};

// ============================================================
// Реакции
// ============================================================

/** Получить реакции на сообщение, сгруппированные по эмодзи */
export const getMessageReactions = async (messageId: string): Promise<ReactionGroup[]> => {
  const result = await query<MessageReaction>(
    'SELECT * FROM message_reactions WHERE message_id = $1',
    [messageId]
  );

  // Группируем по эмодзи
  const groups: Map<string, ReactionGroup> = new Map();
  for (const reaction of result.rows) {
    const existing = groups.get(reaction.emoji);
    if (existing) {
      existing.count++;
      existing.users.push(reaction.user_id);
    } else {
      groups.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        users: [reaction.user_id],
      });
    }
  }

  return Array.from(groups.values());
};

/** Переключить реакцию (добавить или убрать) */
export const toggleReaction = async (
  messageId: string,
  userId: string,
  emoji: string
): Promise<{ added: boolean }> => {
  // Проверяем, есть ли уже такая реакция
  const existing = await query(
    'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
    [messageId, userId, emoji]
  );

  if ((existing.rowCount ?? 0) > 0) {
    // Убираем реакцию
    await query(
      'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
      [messageId, userId, emoji]
    );
    return { added: false };
  } else {
    // Добавляем реакцию
    await query(
      `INSERT INTO message_reactions (id, message_id, user_id, emoji)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), messageId, userId, emoji]
    );
    return { added: true };
  }
};
