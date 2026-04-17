// ============================================================
// Маршруты чатов и сообщений
// GET  /api/chats                — чаты пользователя
// POST /api/chats/direct         — создать/получить личный чат
// POST /api/chats/group          — создать групповой чат
// GET  /api/chats/:id/messages   — сообщения чата
// GET  /api/users/all            — все пользователи для выбора
// ============================================================

import type { FastifyInstance } from 'fastify';
import { authHook } from '../middleware/auth.js';
import {
  getUserChats,
  getOrCreateDirectChat,
  createGroupChat,
  getChatMessages,
  isChatMember,
  addMemberToChat,
} from '../services/chatService.js';
import { getAllUsers } from '../services/userService.js';

export const chatsRoutes = async (fastify: FastifyInstance): Promise<void> => {

  // --- Список чатов пользователя ---
  fastify.get('/', {
    preHandler: [authHook],
  }, async (req, reply) => {
    const userId = req.currentUser!.userId;
    const chats = await getUserChats(userId);
    return reply.send({ chats });
  });

  // --- Создать/открыть личный чат ---
  fastify.post<{
    Body: { targetUserId: string };
  }>('/direct', {
    preHandler: [authHook],
    schema: {
      body: {
        type: 'object',
        required: ['targetUserId'],
        properties: {
          targetUserId: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const userId = req.currentUser!.userId;
    const { targetUserId } = req.body;

    if (userId === targetUserId) {
      return reply.code(400).send({ error: 'Нельзя создать чат с самим собой' });
    }

    const chat = await getOrCreateDirectChat(userId, targetUserId);
    return reply.send({ chat });
  });

  // --- Создать групповой чат ---
  fastify.post<{
    Body: { name: string; memberIds: string[] };
  }>('/group', {
    preHandler: [authHook],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'memberIds'],
        properties: {
          name: { type: 'string', minLength: 1 },
          memberIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (req, reply) => {
    const userId = req.currentUser!.userId;
    const { name, memberIds } = req.body;

    const chat = await createGroupChat(name, userId, memberIds);
    return reply.send({ chat });
  });

  // --- Добавить участника в чат ---
  fastify.post<{
    Params: { id: string };
    Body: { userId: string };
  }>('/:id/members', {
    preHandler: [authHook],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const currentUserId = req.currentUser!.userId;
    const { id: chatId } = req.params;
    const { userId } = req.body;

    const isMember = await isChatMember(chatId, currentUserId);
    if (!isMember) {
      return reply.code(403).send({ error: 'Вы не являетесь участником этого чата' });
    }

    await addMemberToChat(chatId, userId);
    return reply.send({ message: 'Участник добавлен' });
  });

  // --- Сообщения чата ---
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: number; before?: string };
  }>('/:id/messages', {
    preHandler: [authHook],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          before: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const userId = req.currentUser!.userId;
    const { id: chatId } = req.params;
    const { limit = 50, before } = req.query;

    const isMember = await isChatMember(chatId, userId);
    if (!isMember) {
      return reply.code(403).send({ error: 'Вы не являетесь участником этого чата' });
    }

    const messages = await getChatMessages(chatId, limit, before);
    return reply.send({ messages });
  });

  // --- Все пользователи (для создания чатов) ---
  fastify.get('/users/all', {
    preHandler: [authHook],
  }, async (_req, reply) => {
    const users = await getAllUsers();
    return reply.send({ users });
  });
};
