import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authPreHandler } from '../authPlugin.js';
import { hashPassword, verifyPassword } from '../password.js';
import { findUserById, updateUserPassword } from '../repos/usersRepo.js';

const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(4),
});

export const registerMeRoutes = async (app: FastifyInstance) => {
  app.get('/users/me', { preHandler: authPreHandler }, async (req, reply) => {
    const u = await findUserById(req.user!.id);
    if (!u) {
      await reply.status(404).send({ error: 'Пользователь не найден' });
      return;
    }
    await reply.send({ id: u.id, email: u.email, role: u.role });
  });

  app.patch(
    '/users/me/password',
    { preHandler: authPreHandler },
    async (req, reply) => {
      const parsed = changePasswordBody.safeParse(req.body);
      if (!parsed.success) {
        await reply.status(400).send({ error: 'Некорректные данные' });
        return;
      }
      const u = await findUserById(req.user!.id);
      if (!u) {
        await reply.status(404).send({ error: 'Пользователь не найден' });
        return;
      }
      const ok = await verifyPassword(parsed.data.currentPassword, u.password_hash);
      if (!ok) {
        await reply.status(400).send({ error: 'Неверный текущий пароль' });
        return;
      }
      const hash = await hashPassword(parsed.data.newPassword);
      await updateUserPassword({ id: u.id, passwordHash: hash });
      await reply.send({ ok: true });
    },
  );
};
