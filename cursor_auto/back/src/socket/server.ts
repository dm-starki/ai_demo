import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { Pool } from 'pg';
import { z } from 'zod';
import type { createJwtHelpers } from '../auth/jwt.js';
import * as conv from '../services/conversations.js';
import * as msg from '../services/messages.js';
import * as users from '../services/users.js';
import type { AppConfig } from '../config.js';

export const startSocketServer = async (deps: {
  cfg: AppConfig;
  pool: Pool;
  jwt: ReturnType<typeof createJwtHelpers>;
}) => {
  const { cfg, pool, jwt } = deps;
  const httpServer = createServer();
  const io = new Server(httpServer, {
    cors: { origin: cfg.corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('Нет токена'));
      const u = jwt.verifyAccess(token);
      socket.data.userId = u.sub;
      socket.data.email = u.email;
      next();
    } catch {
      next(new Error('Недействительный токен'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    const email = socket.data.email as string;

    socket.on('conv:join', async (raw, ack) => {
      const p = z.string().uuid().safeParse(raw);
      if (!p.success) return ack?.({ ok: false });
      const ok = await conv.assertMember(pool, p.data, userId);
      if (!ok) return ack?.({ ok: false });
      await socket.join(`conv:${p.data}`);
      ack?.({ ok: true });
    });

    socket.on('conv:leave', async (raw) => {
      const p = z.string().uuid().safeParse(raw);
      if (p.success) await socket.leave(`conv:${p.data}`);
    });

    socket.on(
      'message:send',
      async (raw: {
        conversationId: string;
        text: string;
        replyToId?: string | null;
        mentionUserIds?: string[];
      }) => {
        const schema = z.object({
          conversationId: z.string().uuid(),
          text: z.string().min(1).max(8000),
          replyToId: z.string().uuid().nullable().optional(),
          mentionUserIds: z.array(z.string().uuid()).optional(),
        });
        const body = schema.safeParse(raw);
        if (!body.success) return;
        const ok = await conv.assertMember(pool, body.data.conversationId, userId);
        if (!ok) return;
        const row = await msg.insertMessage(pool, {
          conversationId: body.data.conversationId,
          senderId: userId,
          senderEmail: email,
          body: body.data.text,
          replyToId: body.data.replyToId ?? null,
          mentionUserIds: body.data.mentionUserIds ?? [],
        });
        const [full] = await msg.listMessages(pool, body.data.conversationId, 1);
        const payload =
          full ??
          ({
            id: row.id,
            conversation_id: body.data.conversationId,
            sender_id: userId,
            sender_email: email,
            body: body.data.text,
            reply_to_id: body.data.replyToId ?? null,
            created_at: row.created_at.toISOString(),
            reply_preview: null,
            mentions: [],
            reactions: [],
          } as const);
        io.to(`conv:${body.data.conversationId}`).emit('message:new', payload);
      },
    );

    socket.on('reaction:toggle', async (raw: { messageId: string; emoji: string; add: boolean }) => {
      const schema = z.object({
        messageId: z.string().uuid(),
        emoji: z.string().min(1).max(16),
        add: z.boolean(),
      });
      const body = schema.safeParse(raw);
      if (!body.success) return;
      const m = await pool.query<{ conversation_id: string }>(
        `SELECT conversation_id FROM messages WHERE id = $1`,
        [body.data.messageId],
      );
      const cid = m.rows[0]?.conversation_id;
      if (!cid) return;
      const ok = await conv.assertMember(pool, cid, userId);
      if (!ok) return;
      await msg.toggleReaction(pool, {
        messageId: body.data.messageId,
        userId,
        emoji: body.data.emoji,
        add: body.data.add,
      });
      const u = await users.findUserById(pool, userId);
      io.to(`conv:${cid}`).emit('reaction:update', {
        conversationId: cid,
        messageId: body.data.messageId,
        emoji: body.data.emoji,
        add: body.data.add,
        email: u?.email ?? email,
      });
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(cfg.socketPort, '0.0.0.0', () => resolve());
  });
  return { io, httpServer };
};
