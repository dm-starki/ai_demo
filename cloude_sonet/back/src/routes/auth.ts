// Маршруты аутентификации
// POST /api/auth/login    — вход по email/пароль
// POST /api/auth/refresh  — обновление токенов по refresh токену
// POST /api/auth/logout   — выход (удаление refresh токена)
// GET  /api/auth/me       — получение данных текущего пользователя

import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { query } from '../db/index.js'
import { authenticate } from '../middleware/auth.js'
import type { User, JwtPayload, TokenPair, UserPublic } from '../types/index.js'

// Генерация пары токенов (access + refresh)
const generateTokens = (payload: JwtPayload): TokenPair => {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires as jwt.SignOptions['expiresIn'],
  })
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires as jwt.SignOptions['expiresIn'],
  })
  return { accessToken, refreshToken }
}

// Сохранение refresh токена в БД
const saveRefreshToken = async (userId: string, token: string): Promise<void> => {
  // Вычисляем время истечения из конфига (7 дней)
  const days = 7
  await query(
    `INSERT INTO refresh_tokens (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '${days} days')`,
    [userId, token]
  )
}

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  // POST /api/auth/login — Вход пользователя
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }

    if (!email || !password) {
      return reply.code(400).send({ message: 'Email и пароль обязательны' })
    }

    // Ищем пользователя по email
    const result = await query<User>(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    )
    const user = result.rows[0]

    if (!user) {
      return reply.code(401).send({ message: 'Неверный email или пароль' })
    }

    // Проверяем пароль
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return reply.code(401).send({ message: 'Неверный email или пароль' })
    }

    const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role }
    const tokens = generateTokens(payload)

    // Сохраняем refresh токен
    await saveRefreshToken(user.id, tokens.refreshToken)

    const userPublic: UserPublic = {
      id: user.id,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    }

    return reply.send({ ...tokens, user: userPublic })
  })

  // POST /api/auth/refresh — Обновление токенов
  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }

    if (!refreshToken) {
      return reply.code(400).send({ message: 'Refresh токен обязателен' })
    }

    // Проверяем токен в БД
    const tokenResult = await query(
      `SELECT rt.*, u.email, u.role FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = $1 AND rt.expires_at > NOW()`,
      [refreshToken]
    )

    if (!tokenResult.rows[0]) {
      return reply.code(401).send({ message: 'Refresh токен недействителен' })
    }

    const tokenRecord = tokenResult.rows[0] as {
      user_id: string
      email: string
      role: string
      id: string
    }

    // Проверяем подпись токена
    try {
      jwt.verify(refreshToken, config.jwt.refreshSecret)
    } catch {
      return reply.code(401).send({ message: 'Refresh токен истёк или повреждён' })
    }

    // Удаляем старый токен и создаём новую пару
    await query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRecord.id])

    const payload: JwtPayload = {
      userId: tokenRecord.user_id,
      email: tokenRecord.email,
      role: tokenRecord.role as 'user' | 'admin',
    }
    const tokens = generateTokens(payload)
    await saveRefreshToken(tokenRecord.user_id, tokens.refreshToken)

    return reply.send(tokens)
  })

  // POST /api/auth/logout — Выход
  app.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken?: string }

    if (refreshToken) {
      await query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken])
    }

    return reply.send({ message: 'Выход выполнен успешно' })
  })

  // GET /api/auth/me — Данные текущего пользователя
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const result = await query<UserPublic>(
      'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1',
      [request.user!.userId]
    )
    const user = result.rows[0]
    if (!user) {
      return reply.code(404).send({ message: 'Пользователь не найден' })
    }
    return reply.send(user)
  })
}
