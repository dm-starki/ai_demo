import 'dotenv/config';

export type AppConfig = {
  restPort: number;
  socketPort: number;
  corsOrigin: string;
  databaseUrl: string;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessExpires: string;
  jwtSessionMax: string;
};

export const getConfig = (): AppConfig => {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET ?? '';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ?? '';
  if (!databaseUrl || !jwtAccessSecret || !jwtRefreshSecret) {
    throw new Error('Заполните DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET в back/.env');
  }
  return {
    restPort: Number(process.env.REST_PORT ?? 3102),
    socketPort: Number(process.env.SOCKET_PORT ?? 3103),
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3101',
    databaseUrl,
    jwtAccessSecret,
    jwtRefreshSecret,
    jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    jwtSessionMax: process.env.JWT_SESSION_MAX ?? '7d',
  };
};
