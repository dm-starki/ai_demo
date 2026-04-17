import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../jwt.js';
import { findUserByEmail, findUserById } from '../repos/usersRepo.js';
import { verifyPassword } from '../password.js';

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshBody = z.object({
  refreshToken: z.string().min(1),
});

export const registerAuthRoutes = async (app: FastifyInstance) => {
  app.post('/auth/login', async (req, reply) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) {
      await reply.status(400).send({ error: 'Некорректные данные' });
      return;
    }
    const user = await findUserByEmail(parsed.data.email);
    if (!user) {
      await reply.status(401).send({ error: 'Неверный логин или пароль' });
      return;
    }
    const ok = await verifyPassword(parsed.data.password, user.password_hash);
    if (!ok) {
      await reply.status(401).send({ error: 'Неверный логин или пароль' });
      return;
    }
    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id, crypto.randomUUID());
    await reply.send({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role },
    });
  });

  app.post('/auth/refresh', async (req, reply) => {
    const parsed = refreshBody.safeParse(req.body);
    if (!parsed.success) {
      await reply.status(400).send({ error: 'Некорректные данные' });
      return;
    }
    try {
      const payload = verifyRefreshToken(parsed.data.refreshToken);
      if (payload.typ !== 'refresh') {
        await reply.status(401).send({ error: 'Неверный refresh-токен' });
        return;
      }
      const u = await findUserById(payload.sub);
      if (!u) {
        await reply.status(401).send({ error: 'Пользователь не найден' });
        return;
      }
      const accessToken = signAccessToken(u.id);
      const refreshToken = signRefreshToken(u.id, crypto.randomUUID());
      await reply.send({
        accessToken,
        refreshToken,
        user: { id: u.id, email: u.email, role: u.role },
      });
    } catch {
      await reply.status(401).send({ error: 'Недействительный refresh-токен' });
    }
  });
};
