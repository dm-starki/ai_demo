import type { Server, Socket } from 'socket.io';
import { verifyAccessToken } from '../jwt.js';
import { assertMember } from '../repos/conversationsRepo.js';
import { findUserById } from '../repos/usersRepo.js';
import {
  getMessageById,
  insertMessage,
  listReactions,
  toggleReaction,
} from '../repos/messagesRepo.js';
type SocketData = { userId: string; email: string };

const roomName = (conversationId: string) => `conv:${conversationId}`;

const buildMessagePayload = async (messageId: string) => {
  const row = await getMessageById(messageId);
  if (!row) return null;
  const sender = await findUserById(row.sender_id);
  const reactions = await listReactions([row.id]);
  let replyPreview: { id: string; senderEmail: string; body: string } | null = null;
  if (row.reply_to_id) {
    const parent = await getMessageById(row.reply_to_id);
    if (parent) {
      const pSender = await findUserById(parent.sender_id);
      replyPreview = {
        id: parent.id,
        senderEmail: pSender?.email ?? '',
        body: parent.body.length > 160 ? `${parent.body.slice(0, 160)}…` : parent.body,
      };
    }
  }
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderEmail: sender?.email ?? '',
    body: row.body,
    replyToId: row.reply_to_id,
    mentions: row.mentions,
    createdAt: row.created_at,
    reactions: reactions.map((r) => ({ userId: r.user_id, emoji: r.emoji })),
    replyPreview,
  };
};

export const registerChatSocket = (io: Server) => {
  io.use(async (socket, next) => {
    const raw = (socket.handshake.auth as { token?: string } | undefined)?.token;
    if (!raw) {
      next(new Error('Требуется токен'));
      return;
    }
    try {
      const payload = verifyAccessToken(raw);
      if (payload.typ !== 'access') {
        next(new Error('Неверный токен'));
        return;
      }
      const u = await findUserById(payload.sub);
      if (!u) {
        next(new Error('Пользователь не найден'));
        return;
      }
      (socket.data as SocketData).userId = u.id;
      (socket.data as SocketData).email = u.email;
      next();
    } catch {
      next(new Error('Недействительный токен'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;

    socket.on('join', async (payload: { conversationId: string }, ack) => {
      const ok = await assertMember({ conversationId: payload.conversationId, userId: data.userId });
      if (!ok) {
        ack?.({ ok: false, error: 'Нет доступа' });
        return;
      }
      await socket.join(roomName(payload.conversationId));
      ack?.({ ok: true });
    });

    socket.on(
      'send_message',
      async (
        payload: {
          conversationId: string;
          body: string;
          replyToId?: string | null;
          mentions?: string[];
        },
        ack,
      ) => {
        const body = (payload.body ?? '').trim();
        if (!body) {
          ack?.({ ok: false, error: 'Пустое сообщение' });
          return;
        }
        const ok = await assertMember({ conversationId: payload.conversationId, userId: data.userId });
        if (!ok) {
          ack?.({ ok: false, error: 'Нет доступа' });
          return;
        }
        let replyToId: string | null = payload.replyToId ?? null;
        if (replyToId) {
          const parent = await getMessageById(replyToId);
          if (!parent || parent.conversation_id !== payload.conversationId) {
            replyToId = null;
          }
        }
        const mentions = Array.from(new Set(payload.mentions ?? [])).filter(Boolean);
        const inserted = await insertMessage({
          conversationId: payload.conversationId,
          senderId: data.userId,
          body,
          replyToId,
          mentions,
        });
        const dto = await buildMessagePayload(inserted.id);
        if (dto) {
          io.to(roomName(payload.conversationId)).emit('chat:message', dto);
        }
        ack?.({ ok: true, id: inserted.id });
      },
    );

    socket.on(
      'toggle_reaction',
      async (payload: { messageId: string; emoji: string }, ack) => {
        const msg = await getMessageById(payload.messageId);
        if (!msg) {
          ack?.({ ok: false, error: 'Сообщение не найдено' });
          return;
        }
        const ok = await assertMember({ conversationId: msg.conversation_id, userId: data.userId });
        if (!ok) {
          ack?.({ ok: false, error: 'Нет доступа' });
          return;
        }
        const action = await toggleReaction({
          messageId: payload.messageId,
          userId: data.userId,
          emoji: payload.emoji,
        });
        const reactions = await listReactions([msg.id]);
        io.to(roomName(msg.conversation_id)).emit('chat:reaction', {
          messageId: msg.id,
          action,
          userId: data.userId,
          emoji: payload.emoji,
          reactions: reactions.map((r) => ({ userId: r.user_id, emoji: r.emoji })),
        });
        ack?.({ ok: true, action });
      },
    );
  });
};
