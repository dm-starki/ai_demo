import type { ConversationKind, ConversationRow } from '../types.js';
import { pool } from '../db.js';

export const assertMember = async (params: {
  conversationId: string;
  userId: string;
}): Promise<boolean> => {
  const r = await pool.query<{ ok: number }>(
    `SELECT 1 AS ok FROM conversation_members WHERE conversation_id = $1 AND user_id = $2`,
    [params.conversationId, params.userId],
  );
  return r.rowCount !== null && r.rowCount > 0;
};

export const findDirectBetween = async (params: {
  userA: string;
  userB: string;
}): Promise<string | null> => {
  const r = await pool.query<{ id: string }>(
    `
    SELECT c.id
    FROM conversations c
    JOIN conversation_members m1 ON m1.conversation_id = c.id AND m1.user_id = $1
    JOIN conversation_members m2 ON m2.conversation_id = c.id AND m2.user_id = $2
    WHERE c.kind = 'direct'
    LIMIT 1
    `,
    [params.userA, params.userB],
  );
  return r.rows[0]?.id ?? null;
};

export const createConversation = async (params: {
  kind: ConversationKind;
  title: string | null;
  createdBy: string;
}): Promise<ConversationRow> => {
  const r = await pool.query<ConversationRow>(
    `INSERT INTO conversations (kind, title, created_by)
     VALUES ($1, $2, $3)
     RETURNING id, kind, title, created_by, created_at`,
    [params.kind, params.title, params.createdBy],
  );
  return r.rows[0];
};

export const addMembers = async (params: {
  conversationId: string;
  userIds: string[];
}): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const uid of params.userIds) {
      await client.query(
        `INSERT INTO conversation_members (conversation_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [params.conversationId, uid],
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
};

export const listConversationsForUser = async (userId: string) => {
  const r = await pool.query<{
    id: string;
    kind: ConversationKind;
    title: string | null;
    created_at: string;
    peer_email: string | null;
  }>(
    `
    SELECT c.id,
           c.kind,
           c.title,
           c.created_at,
           CASE WHEN c.kind = 'direct' THEN u2.email ELSE NULL END AS peer_email
    FROM conversations c
    JOIN conversation_members m ON m.conversation_id = c.id AND m.user_id = $1
    LEFT JOIN LATERAL (
      SELECT u.email
      FROM conversation_members mx
      JOIN users u ON u.id = mx.user_id
      WHERE mx.conversation_id = c.id AND mx.user_id <> $1 AND c.kind = 'direct'
      LIMIT 1
    ) u2 ON TRUE
    ORDER BY c.created_at DESC
    `,
    [userId],
  );
  return r.rows;
};

export const listMembers = async (conversationId: string) => {
  const r = await pool.query<{ id: string; email: string }>(
    `
    SELECT u.id, u.email
    FROM conversation_members m
    JOIN users u ON u.id = m.user_id
    WHERE m.conversation_id = $1
    ORDER BY u.email
    `,
    [conversationId],
  );
  return r.rows;
};
