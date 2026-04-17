import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authPreHandler } from '../authPlugin.js';
import {
  addMembers,
  assertMember,
  createConversation,
  findDirectBetween,
  listConversationsForUser,
  listMembers,
} from '../repos/conversationsRepo.js';
import { listMessages, listReactions } from '../repos/messagesRepo.js';
import { findUserById } from '../repos/usersRepo.js';

const directBody = z.object({ peerUserId: z.string().uuid() });
const groupBody = z.object({
  title: z.string().min(1),
  memberIds: z.array(z.string().uuid()).min(1),
});
const membersBody = z.object({ userIds: z.array(z.string().uuid()).min(1) });

const findConversationInList = async (userId: string, conversationId: string) => {
  const rows = await listConversationsForUser(userId);
  return rows.find((r) => r.id === conversationId) ?? null;
};

export const registerConversationRoutes = async (app: FastifyInstance) => {
  app.get('/conversations', { preHandler: authPreHandler }, async (req, reply) => {
    const rows = await listConversationsForUser(req.user!.id);
    await reply.send(rows);
  });

  app.post(
    '/conversations/direct',
    { preHandler: authPreHandler },
    async (req, reply) => {
      const parsed = directBody.safeParse(req.body);
      if (!parsed.success) {
        await reply.status(400).send({ error: 'Некорректные данные' });
        return;
      }
      const me = req.user!.id;
      const peer = parsed.data.peerUserId;
      if (peer === me) {
        await reply.status(400).send({ error: 'Нельзя создать чат с самим собой' });
        return;
      }
      const peerUser = await findUserById(peer);
      if (!peerUser) {
        await reply.status(404).send({ error: 'Пользователь не найден' });
        return;
      }
      const existing = await findDirectBetween({ userA: me, userB: peer });
      if (existing) {
        const row = await findConversationInList(me, existing);
        if (!row) {
          await reply.status(500).send({ error: 'Не удалось загрузить беседу' });
          return;
        }
        await reply.send(row);
        return;
      }
      const conv = await createConversation({
        kind: 'direct',
        title: null,
        createdBy: me,
      });
      await addMembers({ conversationId: conv.id, userIds: [me, peer] });
      const row = await findConversationInList(me, conv.id);
      if (!row) {
        await reply.status(500).send({ error: 'Не удалось загрузить беседу' });
        return;
      }
      await reply.send(row);
    },
  );

  app.post(
    '/conversations/group',
    { preHandler: authPreHandler },
    async (req, reply) => {
      const parsed = groupBody.safeParse(req.body);
      if (!parsed.success) {
        await reply.status(400).send({ error: 'Некорректные данные' });
        return;
      }
      const me = req.user!.id;
      const uniq = Array.from(new Set([me, ...parsed.data.memberIds]));
      for (const uid of uniq) {
        const u = await findUserById(uid);
        if (!u) {
          await reply.status(404).send({ error: `Пользователь не найден: ${uid}` });
          return;
        }
      }
      const conv = await createConversation({
        kind: 'group',
        title: parsed.data.title,
        createdBy: me,
      });
      await addMembers({ conversationId: conv.id, userIds: uniq });
      const row = await findConversationInList(me, conv.id);
      if (!row) {
        await reply.status(500).send({ error: 'Не удалось загрузить беседу' });
        return;
      }
      await reply.send(row);
    },
  );

  app.get(
    '/conversations/:id/members',
    { preHandler: authPreHandler },
    async (req, reply) => {
      const id = (req.params as { id: string }).id;
      const ok = await assertMember({ conversationId: id, userId: req.user!.id });
      if (!ok) {
        await reply.status(403).send({ error: 'Нет доступа к беседе' });
        return;
      }
      const rows = await listMembers(id);
      await reply.send(rows);
    },
  );

  app.post(
    '/conversations/:id/members',
    { preHandler: authPreHandler },
    async (req, reply) => {
      const id = (req.params as { id: string }).id;
      const ok = await assertMember({ conversationId: id, userId: req.user!.id });
      if (!ok) {
        await reply.status(403).send({ error: 'Нет доступа к беседе' });
        return;
      }
      const parsed = membersBody.safeParse(req.body);
      if (!parsed.success) {
        await reply.status(400).send({ error: 'Некорректные данные' });
        return;
      }
      for (const uid of parsed.data.userIds) {
        const u = await findUserById(uid);
        if (!u) {
          await reply.status(404).send({ error: `Пользователь не найден: ${uid}` });
          return;
        }
      }
      await addMembers({ conversationId: id, userIds: parsed.data.userIds });
      await reply.send({ ok: true });
    },
  );

  app.get(
    '/conversations/:id/messages',
    { preHandler: authPreHandler },
    async (req, reply) => {
      const id = (req.params as { id: string }).id;
      const ok = await assertMember({ conversationId: id, userId: req.user!.id });
      if (!ok) {
        await reply.status(403).send({ error: 'Нет доступа к беседе' });
        return;
      }
      const q = req.query as { before?: string; limit?: string };
      const limit = Math.min(Number(q.limit ?? 50) || 50, 200);
      const rows = await listMessages({ conversationId: id, limit, before: q.before ?? null });
      const ids = rows.map((m) => m.id);
      const reactions = await listReactions(ids);
      const byMsg: Record<string, { userId: string; emoji: string }[]> = {};
      for (const r of reactions) {
        byMsg[r.message_id] ??= [];
        byMsg[r.message_id].push({ userId: r.user_id, emoji: r.emoji });
      }
      const senderIds = Array.from(new Set(rows.map((m) => m.sender_id)));
      const emails = await Promise.all(
        senderIds.map(async (sid) => {
          const u = await findUserById(sid);
          return [sid, u?.email ?? ''] as const;
        }),
      );
      const emailById = Object.fromEntries(emails);
      await reply.send(
        rows.map((m) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderId: m.sender_id,
          senderEmail: emailById[m.sender_id],
          body: m.body,
          replyToId: m.reply_to_id,
          mentions: m.mentions,
          createdAt: m.created_at,
          reactions: byMsg[m.id] ?? [],
        })),
      );
    },
  );
};
