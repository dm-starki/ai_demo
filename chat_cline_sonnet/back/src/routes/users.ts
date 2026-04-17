// ============================================================
// Маршруты управления пользователями (только для администратора)
// GET    /api/users         — список всех пользователей
// POST   /api/users         — создать пользователя
// PUT    /api/users/:id     — изменить email/пароль пользователя
// DELETE /api/users/:id     — удалить пользователя
// PUT    /api/users/password — изменить свой пароль (для любого юзера)
// ============================================================

import type { FastifyInstance } from 'fastify';
import { authHook, adminHook } from '../middleware/auth.js';
import {
  getAllUsers,
  createUser,
  updateUserEmail,
  updateUserPassword,
  deleteUser,
  isEmailTaken,
  getUserById,
} from '../services/userService.js';
import { comparePassword } from '../services/authService.js';
import { getFullUserById } from '../services/userService.js';
import type { UserRole } from '../types/index.js';

export const usersRoutes = async (fastify: FastifyInstance): Promise<void> => {

  // --- Изменить свой пароль (доступно всем авторизованным) ---
  fastify.put<{
    Body: { currentPassword: string; newPassword: string };
  }>('/password', {
    preHandler: [authHook],
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 4 },
        },
      },
    },
  }, async (req, reply) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.currentUser!.userId;

    const user = await getFullUserById(userId);
    if (!user) {
      return reply.code(404).send({ error: 'Пользователь не найден' });
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return reply.code(400).send({ error: 'Текущий пароль неверен' });
    }

    await updateUserPassword(userId, newPassword);
    return reply.send({ message: 'Пароль изменён успешно' });
  });

  // --- Список всех пользователей (только admin) ---
  fastify.get('/', {
    preHandler: [authHook, adminHook],
  }, async (_req, reply) => {
    const users = await getAllUsers();
    return reply.send({ users });
  });

  // --- Создать пользователя (только admin) ---
  fastify.post<{
    Body: { email: string; password: string; role?: UserRole };
  }>('/', {
    preHandler: [authHook, adminHook],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 4 },
          role: { type: 'string', enum: ['user', 'admin'] },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password, role = 'user' } = req.body;

    const taken = await isEmailTaken(email);
    if (taken) {
      return reply.code(409).send({ error: 'Email уже занят' });
    }

    const user = await createUser(email, password, role);
    return reply.code(201).send({ user });
  });

  // --- Изменить пользователя (только admin) ---
  fastify.put<{
    Params: { id: string };
    Body: { email?: string; password?: string };
  }>('/:id', {
    preHandler: [authHook, adminHook],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 4 },
        },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params;
    const { email, password } = req.body;

    const existing = await getUserById(id);
    if (!existing) {
      return reply.code(404).send({ error: 'Пользователь не найден' });
    }

    if (email) {
      const taken = await isEmailTaken(email, id);
      if (taken) {
        return reply.code(409).send({ error: 'Email уже занят' });
      }
      await updateUserEmail(id, email);
    }

    if (password) {
      await updateUserPassword(id, password);
    }

    const updated = await getUserById(id);
    return reply.send({ user: updated });
  });

  // --- Удалить пользователя (только admin) ---
  fastify.delete<{
    Params: { id: string };
  }>('/:id', {
    preHandler: [authHook, adminHook],
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    const { id } = req.params;

    // Нельзя удалить самого себя
    if (id === req.currentUser!.userId) {
      return reply.code(400).send({ error: 'Нельзя удалить свою учётную запись' });
    }

    const deleted = await deleteUser(id);
    if (!deleted) {
      return reply.code(404).send({ error: 'Пользователь не найден' });
    }

    return reply.send({ message: 'Пользователь удалён' });
  });
};
