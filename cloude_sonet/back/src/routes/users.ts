// Маршруты управления пользователями
// GET    /api/users         — список пользователей (все авторизованные)
// POST   /api/users         — создание пользователя (только admin)
// PUT    /api/users/:id     — обновление пользователя (admin или сам пользователь)
// DELETE /api/users/:id     — удаление пользователя (только admin)
// PUT    /api/users/me/password — смена пароля (любой авторизованный)

import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { query } from '../db/index.js'
import { authenticate, requireAdmin } from '../middleware/auth.js'
import type { User, UserPublic } from '../types/index.js'

export const userRoutes = async (app: FastifyInstance): Promise<void> => {
  // GET /api/users — список всех пользователей
  app.get('/', { preHandler: authenticate }, async (_request, reply) => {
    const result = await query<UserPublic>(
      'SELECT id, email, role, created_at, updated_at FROM users ORDER BY created_at ASC'
    )
    return reply.send(result.rows)
  })

  // POST /api/users — создание нового пользователя (только admin)
  app.post('/', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const { email, password, role } = request.body as {
      email: string
      password: string
      role?: string
    }

    if (!email || !password) {
      return reply.code(400).send({ message: 'Email и пароль обязательны' })
    }

    const userRole = role === 'admin' ? 'admin' : 'user'
    const normalizedEmail = email.toLowerCase().trim()

    // Проверяем уникальность email
    const existing = await query<User>(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    )
    if (existing.rows[0]) {
      return reply.code(409).send({ message: 'Пользователь с таким email уже существует' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await query<UserPublic>(
      `INSERT INTO users (email, password, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at, updated_at`,
      [normalizedEmail, passwordHash, userRole]
    )

    return reply.code(201).send(result.rows[0])
  })

  // PUT /api/users/me/password — смена пароля текущим пользователем
  app.put('/me/password', { preHandler: authenticate }, async (request, reply) => {
    const { currentPassword, newPassword } = request.body as {
      currentPassword: string
      newPassword: string
    }

    if (!currentPassword || !newPassword) {
      return reply.code(400).send({ message: 'Текущий и новый пароль обязательны' })
    }
    if (newPassword.length < 4) {
      return reply.code(400).send({ message: 'Новый пароль слишком короткий (минимум 4 символа)' })
    }

    const result = await query<User>(
      'SELECT * FROM users WHERE id = $1',
      [request.user!.userId]
    )
    const user = result.rows[0]
    if (!user) {
      return reply.code(404).send({ message: 'Пользователь не найден' })
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return reply.code(400).send({ message: 'Текущий пароль неверен' })
    }

    const newHash = await bcrypt.hash(newPassword, 10)
    await query('UPDATE users SET password = $1 WHERE id = $2', [newHash, user.id])

    return reply.send({ message: 'Пароль успешно изменён' })
  })

  // PUT /api/users/:id — обновление данных пользователя (admin)
  app.put('/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { email, password, role } = request.body as {
      email?: string
      password?: string
      role?: string
    }

    const existing = await query<User>('SELECT * FROM users WHERE id = $1', [id])
    if (!existing.rows[0]) {
      return reply.code(404).send({ message: 'Пользователь не найден' })
    }

    const updates: string[] = []
    const values: unknown[] = []
    let idx = 1

    if (email) {
      const normalizedEmail = email.toLowerCase().trim()
      // Проверяем уникальность нового email
      const emailCheck = await query<User>(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [normalizedEmail, id]
      )
      if (emailCheck.rows[0]) {
        return reply.code(409).send({ message: 'Email уже занят другим пользователем' })
      }
      updates.push(`email = $${idx++}`)
      values.push(normalizedEmail)
    }

    if (password) {
      const hash = await bcrypt.hash(password, 10)
      updates.push(`password = $${idx++}`)
      values.push(hash)
    }

    if (role && (role === 'user' || role === 'admin')) {
      updates.push(`role = $${idx++}`)
      values.push(role)
    }

    if (updates.length === 0) {
      return reply.code(400).send({ message: 'Нет данных для обновления' })
    }

    values.push(id)
    const result = await query<UserPublic>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, email, role, created_at, updated_at`,
      values
    )

    return reply.send(result.rows[0])
  })

  // DELETE /api/users/:id — удаление пользователя (только admin)
  app.delete('/:id', { preHandler: [authenticate, requireAdmin] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    // Запрещаем удалять самого себя
    if (id === request.user!.userId) {
      return reply.code(400).send({ message: 'Нельзя удалить собственную учётную запись' })
    }

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id])
    if (result.rowCount === 0) {
      return reply.code(404).send({ message: 'Пользователь не найден' })
    }

    return reply.send({ message: 'Пользователь удалён' })
  })
}
