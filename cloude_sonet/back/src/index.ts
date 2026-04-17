// Точка входа бэкенд-сервера
// Запускает HTTP REST API на порту PORT и WebSocket сервер на порту SOCKET_PORT

import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config/index.js'
import { checkConnection } from './db/index.js'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'
import { conversationRoutes } from './routes/conversations.js'
import { startSocketServer } from './sockets/index.js'

const app = Fastify({
  logger: config.server.isDev
    ? { level: 'info' }
    : false,
})

// Настройка CORS для фронтенда
await app.register(cors, {
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
})

// Обработчик ошибок
app.setErrorHandler((error, _request, reply) => {
  const statusCode = error.statusCode ?? 500
  app.log.error(error)
  reply.code(statusCode).send({
    statusCode,
    error: error.name,
    message: error.message,
  })
})

// Маршрут проверки состояния сервера (для индикатора онлайн на фронте)
app.get('/health', async () => {
  const dbOk = await checkConnection()
  return {
    status: 'ok',
    db: dbOk ? 'connected' : 'error',
    timestamp: new Date().toISOString(),
  }
})

// Регистрация маршрутов API
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(userRoutes, { prefix: '/api/users' })
await app.register(conversationRoutes, { prefix: '/api/conversations' })

// Запуск HTTP сервера
const start = async () => {
  try {
    // Проверяем подключение к БД
    const dbOk = await checkConnection()
    if (!dbOk) {
      console.error('[server] Не удалось подключиться к базе данных!')
      process.exit(1)
    }
    console.log('[server] Подключение к базе данных установлено')

    // Запускаем REST сервер
    await app.listen({
      port: config.server.port,
      host: config.server.host,
    })
    console.log(`[server] REST API сервер запущен на http://localhost:${config.server.port}`)

    // Запускаем WebSocket сервер на отдельном порту
    startSocketServer()
  } catch (err) {
    console.error('[server] Ошибка запуска сервера:', err)
    process.exit(1)
  }
}

start()
