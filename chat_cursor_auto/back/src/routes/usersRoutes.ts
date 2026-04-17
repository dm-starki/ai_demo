import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../authPlugin.js';
import { pool } from '../db.js';

export const registerUsersRoutes = async (app: FastifyInstance) => {
  app.get('/users', { preHandler: authPreHandler }, async (_req, reply) => {
    const r = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM users ORDER BY email`,
    );
    await reply.send(r.rows);
  });
};
