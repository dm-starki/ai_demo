// ============================================================
// Маршруты авторизации
// POST /api/auth/login   — вход
// POST /api/auth/refresh — обновление токенов
// POST /api/auth/logout  — выход
// GET  /api/auth/me      — текущий пользователь
// ============================================================

import type { FastifyInstance } from 'fastify';
import {
  findUserByEmail,
  comparePassword,
  generateTokens,
  toPublicUser,
  saveRefreshToken,
  deleteRefreshToken,
  verifyRefreshToken,
  validateRefreshTokenInDb,
  deleteAllUserTokens,
  findUserById,
} from '../services/authService.js';
import { authHook } from '../middleware/auth.js';

export const authRoutes = async (fastify: FastifyInstance): Promise<void> => {

  // --- Вход ---
  fastify.post<{
    Body: { email: string; password: string };
  }>('/login', {
    schema: {
      description: 'Авторизация пользователя',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (req, reply) => {
    const { email, password } = req.body;

    const user = await findUserByEmail(email);
    if (!user) {
      return reply.code(401).send({ error: 'Неверный email или пароль' });
    }

    const passwordValid = await comparePassword(password, user.password);
    if (!passwordValid) {
      return reply.code(401).send({ error: 'Неверный email или пароль' });
    }

    const publicUser = toPublicUser(user);
    const tokens = generateTokens(publicUser);

    // Сохраняем refresh токен
    await saveRefreshToken(user.id, tokens.refreshToken);

    return reply.send({ user: publicUser, tokens });
  });

  // --- Обновление токенов ---
  fastify.post<{
    Body: { refreshToken: string };
  }>('/refresh', {
    schema: {
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { refreshToken } = req.body;

    // Валидируем подпись
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return reply.code(401).send({ error: 'Refresh токен недействителен' });
    }

    if (payload.type !== 'refresh') {
      return reply.code(401).send({ error: 'Неверный тип токена' });
    }

    // Проверяем наличие токена в БД
    const isValid = await validateRefreshTokenInDb(refreshToken);
    if (!isValid) {
      return reply.code(401).send({ error: 'Refresh токен не найден или истёк' });
    }

    // Получаем актуальные данные пользователя
    const user = await findUserById(payload.userId);
    if (!user) {
      return reply.code(401).send({ error: 'Пользователь не найден' });
    }

    const publicUser = toPublicUser(user);
    const newTokens = generateTokens(publicUser);

    // Удаляем старый и сохраняем новый токен
    await deleteRefreshToken(refreshToken);
    await saveRefreshToken(user.id, newTokens.refreshToken);

    return reply.send({ user: publicUser, tokens: newTokens });
  });

  // --- Выход ---
  fastify.post<{
    Body: { refreshToken?: string };
  }>('/logout', {
    preHandler: [authHook],
  }, async (req, reply) => {
    const { refreshToken } = req.body ?? {};

    if (refreshToken) {
      await deleteRefreshToken(refreshToken);
    } else if (req.currentUser) {
      await deleteAllUserTokens(req.currentUser.userId);
    }

    return reply.send({ message: 'Выход выполнен успешно' });
  });

  // --- Текущий пользователь ---
  fastify.get('/me', {
    preHandler: [authHook],
  }, async (req, reply) => {
    if (!req.currentUser) {
      return reply.code(401).send({ error: 'Не авторизован' });
    }

    const user = await findUserById(req.currentUser.userId);
    if (!user) {
      return reply.code(404).send({ error: 'Пользователь не найден' });
    }

    return reply.send({ user: toPublicUser(user) });
  });
};
