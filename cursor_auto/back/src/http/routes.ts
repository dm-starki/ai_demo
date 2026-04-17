import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { createJwtHelpers } from '../auth/jwt.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import * as conv from '../services/conversations.js';
import * as msg from '../services/messages.js';
import * as users from '../services/users.js';
import { buildRequireAdmin, buildRequireAuth } from './guards.js';
import type { Pool } from 'pg';

export const registerRoutes = (
  app: FastifyInstance,
  deps: {
    pool: Pool;
    jwt: ReturnType<typeof createJwtHelpers>;
  },
) => {
  const { pool, jwt } = deps;
  const requireAuth = buildRequireAuth(jwt.verifyAccess);
  const requireAdmin = buildRequireAdmin(jwt.verifyAccess);

  app.get('/api/health', async () => ({ ok: true }));

  app.post('/api/auth/login', async (req, reply) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Некорректные данные' });
    const u = await users.findUserByEmail(pool, body.data.email);
    if (!u || !(await verifyPassword(body.data.password, u.password_hash))) {
      return reply.status(401).send({ error: 'Неверный email или пароль' });
    }
    const fst = Date.now();
    const access = jwt.signAccess({ sub: u.id, email: u.email, role: u.role });
    const refresh = jwt.signRefresh({ sub: u.id, typ: 'refresh', fst });
    return { accessToken: access, refreshToken: refresh, user: { id: u.id, email: u.email, role: u.role } };
  });

  app.post('/api/auth/refresh', async (req, reply) => {
    const schema = z.object({ refreshToken: z.string().min(10) });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Некорректные данные' });
    try {
      const p = jwt.verifyRefresh(body.data.refreshToken);
      if (p.typ !== 'refresh') throw new Error('bad');
      jwt.assertSessionAlive(p.fst);
      const u = await users.findUserById(pool, p.sub);
      if (!u) return reply.status(401).send({ error: 'Пользователь не найден' });
      const access = jwt.signAccess({ sub: u.id, email: u.email, role: u.role });
      const refresh = jwt.signRefresh({ sub: u.id, typ: 'refresh', fst: p.fst });
      return { accessToken: access, refreshToken: refresh, user: u };
    } catch {
      return reply.status(401).send({ error: 'Недействительный refresh' });
    }
  });

  app.get('/api/me', { preHandler: [requireAuth] }, async (req) => {
    const u = await users.findUserById(pool, req.user!.sub);
    return u;
  });

  app.patch('/api/me/password', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(4),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Некорректные данные' });
    const row = await users.findUserByEmail(pool, req.user!.email);
    if (!row || !(await verifyPassword(body.data.currentPassword, row.password_hash))) {
      return reply.status(400).send({ error: 'Неверный текущий пароль' });
    }
    const ph = await hashPassword(body.data.newPassword);
    await users.updateUser(pool, row.id, { passwordHash: ph });
    return { ok: true };
  });

  app.get('/api/admin/users', { preHandler: [requireAdmin] }, async () => {
    return users.listUsers(pool);
  });

  app.post('/api/admin/users', { preHandler: [requireAdmin] }, async (req, reply) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(4),
      role: z.enum(['user', 'admin']),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Некорректные данные' });
    try {
      const ph = await hashPassword(body.data.password);
      const u = await users.insertUser(pool, {
        email: body.data.email,
        passwordHash: ph,
        role: body.data.role,
      });
      return u;
    } catch {
      return reply.status(400).send({ error: 'Email уже занят' });
    }
  });

  app.patch('/api/admin/users/:id', { preHandler: [requireAdmin] }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const schema = z.object({
      email: z.string().email().optional(),
      password: z.string().min(4).optional(),
      role: z.enum(['user', 'admin']).optional(),
    });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Некорректные данные' });
    const patch: { email?: string; passwordHash?: string; role?: 'user' | 'admin' } = {};
    if (body.data.email) patch.email = body.data.email;
    if (body.data.password) patch.passwordHash = await hashPassword(body.data.password);
    if (body.data.role) patch.role = body.data.role;
    try {
      const u = await users.updateUser(pool, id, patch);
      if (!u) return reply.status(404).send({ error: 'Не найдено' });
      return u;
    } catch {
      return reply.status(400).send({ error: 'Не удалось обновить' });
    }
  });

  app.delete('/api/admin/users/:id', { preHandler: [requireAdmin] }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    if (id === req.user!.sub) return reply.status(400).send({ error: 'Нельзя удалить себя' });
    await users.deleteUser(pool, id);
    return { ok: true };
  });

  app.get('/api/conversations', { preHandler: [requireAuth] }, async (req) => {
    return conv.listConversations(pool, req.user!.sub);
  });

  app.post('/api/conversations', { preHandler: [requireAuth] }, async (req, reply) => {
    const schema = z.discriminatedUnion('type', [
      z.object({ type: z.literal('direct'), peerEmail: z.string().email() }),
      z.object({
        type: z.literal('group'),
        name: z.string().min(1),
        memberEmails: z.array(z.string().email()).default([]),
      }),
    ]);
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Некорректные данные' });
    const me = req.user!.sub;
    if (body.data.type === 'direct') {
      const peer = await users.findUserByEmail(pool, body.data.peerEmail);
      if (!peer) return reply.status(404).send({ error: 'Пользователь не найден' });
      if (peer.id === me) return reply.status(400).send({ error: 'Нельзя чат с самим собой' });
      const existing = await conv.findDirectBetween(pool, me, peer.id);
      if (existing) return { id: existing };
      const id = await conv.createConversation(pool, {
        type: 'direct',
        name: null,
        createdBy: me,
        memberIds: [me, peer.id],
      });
      return { id };
    }
    const memberIds: string[] = [];
    for (const em of body.data.memberEmails) {
      const u = await users.findUserByEmail(pool, em);
      if (u) memberIds.push(u.id);
    }
    const id = await conv.createConversation(pool, {
      type: 'group',
      name: body.data.name,
      createdBy: me,
      memberIds: [...memberIds, me],
    });
    return { id };
  });

  app.post('/api/conversations/:id/members', { preHandler: [requireAuth] }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const ok = await conv.assertMember(pool, id, req.user!.sub);
    if (!ok) return reply.status(403).send({ error: 'Нет доступа к беседе' });
    const schema = z.object({ emails: z.array(z.string().email()).min(1) });
    const body = schema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Некорректные данные' });
    const ids: string[] = [];
    for (const em of body.data.emails) {
      const u = await users.findUserByEmail(pool, em);
      if (u) ids.push(u.id);
    }
    await conv.addMembers(pool, id, ids);
    return { ok: true };
  });

  app.get('/api/conversations/:id/messages', { preHandler: [requireAuth] }, async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const ok = await conv.assertMember(pool, id, req.user!.sub);
    if (!ok) return reply.status(403).send({ error: 'Нет доступа' });
    return msg.listMessages(pool, id);
  });
};
