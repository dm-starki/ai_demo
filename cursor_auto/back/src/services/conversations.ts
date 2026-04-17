import type { Pool } from 'pg';
import type { ConversationListItem, ConversationType } from '../types.js';

export const assertMember = async (pool: Pool, conversationId: string, userId: string) => {
  const r = await pool.query(
    `SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId],
  );
  return r.rowCount !== null && r.rowCount > 0;
};

export const findDirectBetween = async (pool: Pool, a: string, b: string) => {
  const r = await pool.query<{ id: string }>(
    `SELECT c.id
     FROM conversations c
     JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = $1
     JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = $2
     WHERE c.type = 'direct'
     LIMIT 1`,
    [a, b],
  );
  return r.rows[0]?.id ?? null;
};

export const listConversations = async (pool: Pool, userId: string): Promise<ConversationListItem[]> => {
  const r = await pool.query<{
    id: string;
    type: ConversationType;
    name: string | null;
  }>(
    `SELECT c.id, c.type, c.name
     FROM conversations c
     JOIN conversation_members m ON m.conversation_id = c.id AND m.user_id = $1
     ORDER BY c.created_at DESC`,
    [userId],
  );

  const out: ConversationListItem[] = [];
  for (const row of r.rows) {
    const members = await pool.query<{ email: string; user_id: string }>(
      `SELECT u.email, u.id AS user_id
       FROM conversation_members m
       JOIN users u ON u.id = m.user_id
       WHERE m.conversation_id = $1
       ORDER BY u.email`,
      [row.id],
    );
    const memberList = members.rows.map((m) => ({ id: m.user_id, email: m.email }));
    let peerEmail: string | null = null;
    if (row.type === 'direct') {
      peerEmail = members.rows.find((m) => m.user_id !== userId)?.email ?? null;
    }
    out.push({
      id: row.id,
      type: row.type,
      name: row.name,
      peerEmail,
      members: memberList,
    });
  }
  return out;
};

export const createConversation = async (
  pool: Pool,
  input: { type: ConversationType; name: string | null; createdBy: string; memberIds: string[] },
) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ins = await client.query<{ id: string }>(
      `INSERT INTO conversations (type, name, created_by) VALUES ($1, $2, $3) RETURNING id`,
      [input.type, input.name, input.createdBy],
    );
    const id = ins.rows[0].id;
    const uniq = [...new Set([...input.memberIds, input.createdBy])];
    for (const uid of uniq) {
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)
         ON CONFLICT (conversation_id, user_id) DO NOTHING`,
        [id, uid],
      );
    }
    await client.query('COMMIT');
    return id;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const addMembers = async (pool: Pool, conversationId: string, userIds: string[]) => {
  for (const uid of userIds) {
    await pool.query(
      `INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)
       ON CONFLICT (conversation_id, user_id) DO NOTHING`,
      [conversationId, uid],
    );
  }
};

export const getMemberIds = async (pool: Pool, conversationId: string) => {
  const r = await pool.query<{ user_id: string }>(
    `SELECT user_id FROM conversation_members WHERE conversation_id = $1`,
    [conversationId],
  );
  return r.rows.map((x) => x.user_id);
};
