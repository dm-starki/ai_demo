import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { Pool } from 'pg';
import type { AppConfig } from '../config.js';
import type { createJwtHelpers } from '../auth/jwt.js';
import { registerRoutes } from './routes.js';

export const buildRestServer = async (deps: {
  cfg: AppConfig;
  pool: Pool;
  jwt: ReturnType<typeof createJwtHelpers>;
}) => {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: deps.cfg.corsOrigin, credentials: true });
  registerRoutes(app, deps);
  await app.listen({ port: deps.cfg.restPort, host: '0.0.0.0' });
  return app;
};
