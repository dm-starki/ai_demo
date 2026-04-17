import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AccessPayload } from '../auth/jwt.js';

export const buildRequireAuth =
  (verifyAccess: (t: string) => AccessPayload) =>
  async (req: FastifyRequest, reply: FastifyReply) => {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) {
      await reply.status(401).send({ error: 'Требуется авторизация' });
      return;
    }
    try {
      req.user = verifyAccess(h.slice(7));
    } catch {
      await reply.status(401).send({ error: 'Недействительный токен' });
      return;
    }
  };

export const buildRequireAdmin =
  (verifyAccess: (t: string) => AccessPayload) =>
  async (req: FastifyRequest, reply: FastifyReply) => {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) {
      await reply.status(401).send({ error: 'Требуется авторизация' });
      return;
    }
    try {
      const u = verifyAccess(h.slice(7));
      if (u.role !== 'admin') {
        await reply.status(403).send({ error: 'Недостаточно прав' });
        return;
      }
      req.user = u;
    } catch {
      await reply.status(401).send({ error: 'Недействительный токен' });
      return;
    }
  };
