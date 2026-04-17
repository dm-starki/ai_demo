import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyAccessToken } from './jwt.js';
import { findUserById } from './repos/usersRepo.js';
import type { UserRole } from './types.js';

export type AuthedUser = { id: string; email: string; role: UserRole };

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthedUser;
  }
}

export const authPreHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Требуется авторизация' });
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    if (payload.typ !== 'access') {
      return reply.status(401).send({ error: 'Неверный токен' });
    }
    const row = await findUserById(payload.sub);
    if (!row) {
      return reply.status(401).send({ error: 'Пользователь не найден' });
    }
    req.user = { id: row.id, email: row.email, role: row.role };
  } catch {
    return reply.status(401).send({ error: 'Недействительный токен' });
  }
};

export const adminPreHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  if (!req.user) {
    return reply.status(401).send({ error: 'Требуется авторизация' });
  }
  if (req.user.role !== 'admin') {
    return reply.status(403).send({ error: 'Недостаточно прав' });
  }
};
