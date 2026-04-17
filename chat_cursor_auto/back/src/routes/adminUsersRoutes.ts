import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { adminPreHandler, authPreHandler } from '../authPlugin.js';
import { hashPassword } from '../password.js';
import {
  deleteUserById,
  insertUser,
  listUsers,
  findUserById,
  updateUserByAdmin,
} from '../repos/usersRepo.js';
import type { UserRole } from '../types.js';

const createBody = z.object({
  email: z.string().email(),
  password: z.string().min(4),
  role: z.enum(['user', 'admin']),
});

const updateBody = z.object({
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  password: z.union([z.string().min(4), z.literal('')]).optional(),
});

export const registerAdminUsersRoutes = async (app: FastifyInstance) => {
  app.get(
    '/admin/users',
    { preHandler: [authPreHandler, adminPreHandler] },
    async (_req, reply) => {
      const rows = await listUsers();
      await reply.send(rows);
    },
  );

  app.post(
    '/admin/users',
    { preHandler: [authPreHandler, adminPreHandler] },
    async (req, reply) => {
      const parsed = createBody.safeParse(req.body);
      if (!parsed.success) {
        await reply.status(400).send({ error: 'Некорректные данные' });
        return;
      }
      const hash = await hashPassword(parsed.data.password);
      try {
        const row = await insertUser({
          email: parsed.data.email,
          passwordHash: hash,
          role: parsed.data.role as UserRole,
        });
        await reply.send(row);
      } catch {
        await reply.status(409).send({ error: 'Email уже занят' });
      }
    },
  );

  app.patch(
    '/admin/users/:id',
    { preHandler: [authPreHandler, adminPreHandler] },
    async (req, reply) => {
      const id = (req.params as { id: string }).id;
      const parsed = updateBody.safeParse(req.body);
      if (!parsed.success) {
        await reply.status(400).send({ error: 'Некорректные данные' });
        return;
      }
      const existing = await findUserById(id);
      if (!existing) {
        await reply.status(404).send({ error: 'Пользователь не найден' });
        return;
      }
      if (id === req.user!.id && parsed.data.role !== 'admin') {
        await reply.status(400).send({ error: 'Нельзя снять с себя права администратора' });
        return;
      }
      const pwd = parsed.data.password;
      const passwordHash = pwd && pwd.length > 0 ? await hashPassword(pwd) : undefined;
      try {
        await updateUserByAdmin({
          id,
          email: parsed.data.email,
          role: parsed.data.role as UserRole,
          passwordHash,
        });
        await reply.send({ ok: true });
      } catch {
        await reply.status(409).send({ error: 'Email уже занят' });
      }
    },
  );

  app.delete(
    '/admin/users/:id',
    { preHandler: [authPreHandler, adminPreHandler] },
    async (req, reply) => {
      const id = (req.params as { id: string }).id;
      if (id === req.user!.id) {
        await reply.status(400).send({ error: 'Нельзя удалить самого себя' });
        return;
      }
      const existing = await findUserById(id);
      if (!existing) {
        await reply.status(404).send({ error: 'Пользователь не найден' });
        return;
      }
      await deleteUserById(id);
      await reply.send({ ok: true });
    },
  );
};
