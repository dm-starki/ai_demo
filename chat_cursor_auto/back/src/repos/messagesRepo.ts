import type { MessageRow } from '../types.js';
import { pool } from '../db.js';

export const insertMessage = async (params: {
  conversationId: string;
  senderId: string;
  body: string;
  replyToId: string | null;
  mentions: string[];
}): Promise<MessageRow> => {
  const r = await pool.query<MessageRow>(
    `
    INSERT INTO messages (conversation_id, sender_id, body, reply_to_id, mentions)
    VALUES ($1, $2, $3, $4, $5::uuid[])
    RETURNING id, conversation_id, sender_id, body, reply_to_id, mentions, created_at
    `,
    [params.conversationId, params.senderId, params.body, params.replyToId, params.mentions],
  );
  return r.rows[0];
};

export const listMessages = async (params: {
  conversationId: string;
  limit: number;
  before?: string | null;
}) => {
  const before = params.before;
  const r = await pool.query<MessageRow>(
    before
      ? `
        SELECT id, conversation_id, sender_id, body, reply_to_id, mentions, created_at
        FROM messages
        WHERE conversation_id = $1 AND created_at < (SELECT created_at FROM messages WHERE id = $3)
        ORDER BY created_at DESC
        LIMIT $2
        `
      : `
        SELECT id, conversation_id, sender_id, body, reply_to_id, mentions, created_at
        FROM messages
        WHERE conversation_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        `,
    before ? [params.conversationId, params.limit, before] : [params.conversationId, params.limit],
  );
  return r.rows.reverse();
};

export const getMessageById = async (id: string): Promise<MessageRow | null> => {
  const r = await pool.query<MessageRow>(
    `SELECT id, conversation_id, sender_id, body, reply_to_id, mentions, created_at FROM messages WHERE id = $1`,
    [id],
  );
  return r.rows[0] ?? null;
};

export const listReactions = async (messageIds: string[]) => {
  if (messageIds.length === 0) return [];
  const r = await pool.query<{ message_id: string; user_id: string; emoji: string }>(
    `SELECT message_id, user_id, emoji FROM message_reactions WHERE message_id = ANY($1::uuid[])`,
    [messageIds],
  );
  return r.rows;
};

export const toggleReaction = async (params: {
  messageId: string;
  userId: string;
  emoji: string;
}): Promise<'added' | 'removed'> => {
  const del = await pool.query(
    `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
    [params.messageId, params.userId, params.emoji],
  );
  if (del.rowCount && del.rowCount > 0) return 'removed';
  await pool.query(
    `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)`,
    [params.messageId, params.userId, params.emoji],
  );
  return 'added';
};
