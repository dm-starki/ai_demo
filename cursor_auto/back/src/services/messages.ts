import type { Pool } from 'pg';
import type { MessageRow } from '../types.js';

const mapReactions = (rows: { message_id: string; emoji: string; email: string }[]) => {
  const map = new Map<string, Map<string, string[]>>();
  for (const row of rows) {
    if (!map.has(row.message_id)) map.set(row.message_id, new Map());
    const em = map.get(row.message_id)!;
    if (!em.has(row.emoji)) em.set(row.emoji, []);
    em.get(row.emoji)!.push(row.email);
  }
  const toArr = (messageId: string) => {
    const em = map.get(messageId);
    if (!em) return [];
    return [...em.entries()].map(([emoji, emails]) => ({ emoji, emails }));
  };
  return toArr;
};

export const listMessages = async (
  pool: Pool,
  conversationId: string,
  limit = 80,
): Promise<MessageRow[]> => {
  const msg = await pool.query(
    `SELECT m.id, m.conversation_id, m.sender_id, m.sender_email, m.body, m.reply_to_id, m.created_at
     FROM messages m
     WHERE m.conversation_id = $1
     ORDER BY m.created_at DESC
     LIMIT $2`,
    [conversationId, limit],
  );
  const ids = msg.rows.map((m: { id: string }) => m.id);
  if (!ids.length) return [];

  const mentions = await pool.query<{ message_id: string; email: string }>(
    `SELECT mm.message_id, u.email
     FROM message_mentions mm
     JOIN users u ON u.id = mm.mentioned_user_id
     WHERE mm.message_id = ANY($1::uuid[])`,
    [ids],
  );
  const mentionMap = new Map<string, string[]>();
  for (const row of mentions.rows) {
    if (!mentionMap.has(row.message_id)) mentionMap.set(row.message_id, []);
    mentionMap.get(row.message_id)!.push(row.email);
  }

  const reactions = await pool.query<{ message_id: string; emoji: string; email: string }>(
    `SELECT r.message_id, r.emoji, u.email
     FROM message_reactions r
     JOIN users u ON u.id = r.user_id
     WHERE r.message_id = ANY($1::uuid[])`,
    [ids],
  );
  const reactFn = mapReactions(reactions.rows);

  const replyIds = [
    ...new Set(
      msg.rows
        .map((m: { reply_to_id: string | null }) => m.reply_to_id)
        .filter((x: string | null): x is string => Boolean(x)),
    ),
  ];
  const replyMap = new Map<string, { id: string; sender_email: string; body: string }>();
  if (replyIds.length) {
    const rp = await pool.query(
      `SELECT id, sender_email, body FROM messages WHERE id = ANY($1::uuid[])`,
      [replyIds],
    );
    for (const row of rp.rows as { id: string; sender_email: string; body: string }[]) {
      replyMap.set(row.id, row);
    }
  }

  const rows: MessageRow[] = msg.rows.map((m: Record<string, unknown>) => {
    const id = String(m.id);
    const replyToId = m.reply_to_id ? String(m.reply_to_id) : null;
    return {
      id,
      conversation_id: String(m.conversation_id),
      sender_id: m.sender_id ? String(m.sender_id) : null,
      sender_email: String(m.sender_email),
      body: String(m.body),
      reply_to_id: replyToId,
      created_at: new Date(m.created_at as string).toISOString(),
      reply_preview: replyToId ? replyMap.get(replyToId) ?? null : null,
      mentions: mentionMap.get(id) ?? [],
      reactions: reactFn(id),
    };
  });
  return rows.reverse();
};

export const insertMessage = async (
  pool: Pool,
  input: {
    conversationId: string;
    senderId: string;
    senderEmail: string;
    body: string;
    replyToId: string | null;
    mentionUserIds: string[];
  },
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ins = await client.query<{ id: string; created_at: Date }>(
      `INSERT INTO messages (conversation_id, sender_id, sender_email, body, reply_to_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, created_at`,
      [
        input.conversationId,
        input.senderId,
        input.senderEmail,
        input.body,
        input.replyToId,
      ],
    );
    const row = ins.rows[0];
    for (const uid of input.mentionUserIds) {
      await client.query(
        `INSERT INTO message_mentions (message_id, mentioned_user_id) VALUES ($1, $2)
         ON CONFLICT (message_id, mentioned_user_id) DO NOTHING`,
        [row.id, uid],
      );
    }
    await client.query('COMMIT');
    return row;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const toggleReaction = async (
  pool: Pool,
  input: { messageId: string; userId: string; emoji: string; add: boolean },
) => {
  if (input.add) {
    await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)
       ON CONFLICT (message_id, user_id, emoji) DO NOTHING`,
      [input.messageId, input.userId, input.emoji],
    );
  } else {
    await pool.query(
      `DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [input.messageId, input.userId, input.emoji],
    );
  }
};
