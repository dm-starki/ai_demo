// ============================================================
// Точка входа бэкенда
// Запускает Fastify API сервер и Socket.io сервер
// ============================================================

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { serverConfig, corsConfig } from './config.js';
import { testConnection } from './db/index.js';
import { authRoutes } from './routes/auth.js';
import { usersRoutes } from './routes/users.js';
import { chatsRoutes } from './routes/chats.js';
import { createSocketServer } from './plugins/socket.js';
import { cleanExpiredTokens } from './services/authService.js';

// --- Создаём Fastify экземпляр ---
const fastify = Fastify({
  logger: serverConfig.isDev
    ? { level: 'info', transport: { target: 'pino-pretty', options: { colorize: true } } }
    : true,
});

// --- CORS ---
await fastify.register(cors, {
  origin: corsConfig.origins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});

// --- Маршруты ---
await fastify.register(authRoutes, { prefix: '/api/auth' });
await fastify.register(usersRoutes, { prefix: '/api/users' });
await fastify.register(chatsRoutes, { prefix: '/api/chats' });

// --- Health check ---
fastify.get('/api/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
}));

// --- Запуск ---
const start = async () => {
  try {
    // Проверяем подключение к БД
    await testConnection();

    // Запускаем Fastify
    await fastify.listen({
      host: serverConfig.host,
      port: serverConfig.apiPort,
    });

    console.log(`🚀 API сервер запущен на http://${serverConfig.host}:${serverConfig.apiPort}`);

    // Запускаем Socket.io на отдельном порту
    createSocketServer();

    // Очищаем истёкшие токены каждый час
    setInterval(cleanExpiredTokens, 60 * 60 * 1000);

  } catch (err) {
    console.error('❌ Ошибка запуска сервера:', err);
    process.exit(1);
  }
};

start();
