// Middleware аутентификации через JWT
// Проверяет access токен в заголовке Authorization: Bearer <token>

import type { FastifyRequest, FastifyReply } from 'fastify'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import type { JwtPayload } from '../types/index.js'

// Расширяем типы Fastify для добавления пользователя в запрос
declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayload
  }
}

// Проверяет JWT и добавляет данные пользователя в запрос
export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    reply.code(401).send({ message: 'Требуется авторизация' })
    return
  }

  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload
    request.user = payload
  } catch {
    reply.code(401).send({ message: 'Токен недействителен или истёк' })
  }
}

// Проверяет роль администратора
export const requireAdmin = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  if (request.user?.role !== 'admin') {
    reply.code(403).send({ message: 'Доступ разрешён только администраторам' })
  }
}
