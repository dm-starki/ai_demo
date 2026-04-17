import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './env.js';
import { registerAuthRoutes } from './routes/authRoutes.js';
import { registerMeRoutes } from './routes/meRoutes.js';
import { registerUsersRoutes } from './routes/usersRoutes.js';
import { registerAdminUsersRoutes } from './routes/adminUsersRoutes.js';
import { registerConversationRoutes } from './routes/conversationRoutes.js';

export const buildApp = async () => {
  const app = Fastify({ logger: true });
  await app.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });
  app.get('/health', async () => ({ ok: true }));
  await registerAuthRoutes(app);
  await registerMeRoutes(app);
  await registerUsersRoutes(app);
  await registerAdminUsersRoutes(app);
  await registerConversationRoutes(app);
  return app;
};
