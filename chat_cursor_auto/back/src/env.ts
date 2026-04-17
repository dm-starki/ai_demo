import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const schema = z.object({
  HTTP_PORT: z.coerce.number().default(5102),
  SOCKET_PORT: z.coerce.number().default(5103),
  CORS_ORIGIN: z.string().default('http://localhost:5101'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_MAX: z.string().default('7d'),
});

export type AppEnv = z.infer<typeof schema>;

export const env: AppEnv = schema.parse(process.env);
