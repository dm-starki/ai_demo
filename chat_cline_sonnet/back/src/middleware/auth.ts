// ============================================================
// Middleware аутентификации для Fastify
// ============================================================

import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken } from '../services/authService.js';
import type { JwtPayload } from '../types/index.js';

/** Расширение типа FastifyRequest для хранения данных пользователя */
declare module 'fastify' {
  interface FastifyRequest {
    currentUser?: JwtPayload;
  }
}

/**
 * Хук аутентификации — проверяет Bearer токен в заголовке Authorization
 * Устанавливает req.currentUser при успешной проверке
 */
export const authHook = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Не авторизован', message: 'Отсутствует токен авторизации' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    if (payload.type !== 'access') {
      reply.code(401).send({ error: 'Не авторизован', message: 'Неверный тип токена' });
      return;
    }
    req.currentUser = payload;
  } catch {
    reply.code(401).send({ error: 'Не авторизован', message: 'Токен недействителен или истёк' });
  }
};

/**
 * Хук проверки роли администратора
 * Применяется после authHook
 */
export const adminHook = async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  if (req.currentUser?.role !== 'admin') {
    reply.code(403).send({ error: 'Доступ запрещён', message: 'Требуются права администратора' });
  }
};
