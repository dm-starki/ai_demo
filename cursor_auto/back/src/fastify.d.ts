import type { AccessPayload } from './auth/jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AccessPayload;
  }
}
