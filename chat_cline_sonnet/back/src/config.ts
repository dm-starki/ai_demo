// ============================================================
// Конфигурация приложения
// Загружает переменные окружения из .env файла
// ============================================================

import 'dotenv/config';

/** Конфигурация сервера */
export const serverConfig = {
  host: process.env.SERVER_HOST ?? '0.0.0.0',
  apiPort: parseInt(process.env.API_PORT ?? '5202', 10),
  socketPort: parseInt(process.env.SOCKET_PORT ?? '5203', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') === 'development',
};

/** Конфигурация базы данных PostgreSQL */
export const dbConfig = {
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  name: process.env.DB_NAME ?? 'chat_cline_sonnet',
  user: process.env.DB_USER ?? 'chat_cline_sonnet',
  password: process.env.DB_PASSWORD ?? 'chat_pass_2024',
  poolMax: parseInt(process.env.DB_POOL_MAX ?? '10', 10),
};

/** Конфигурация JWT токенов */
export const jwtConfig = {
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'local_access_secret_change_in_production_32chars',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'local_refresh_secret_change_in_production_32chars',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
};

/** Конфигурация CORS */
export const corsConfig = {
  origins: (process.env.CORS_ORIGINS ?? 'http://localhost:5201').split(',').map(o => o.trim()),
};

/** Конфигурация bcrypt */
export const bcryptConfig = {
  rounds: parseInt(process.env.BCRYPT_ROUNDS ?? '10', 10),
};
