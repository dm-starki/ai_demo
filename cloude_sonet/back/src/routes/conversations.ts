// Маршруты для работы с беседами (чатами)
// GET  /api/conversations             — список бесед пользователя
// POST /api/conversations             — создание беседы
// GET  /api/conversations/:id/messages — история сообщений
// POST /api/conversations/:id/members — добавление участника в группу

import type { FastifyInstance } from 'fastify'
import { query, transaction } from '../db/index.js'
import { authenticate } from '../middleware/auth.js'
import type {
  Conversation,
  ConversationWithMembers,
  MessageWithSender,
  UserPublic,
} from '../types/index.js'

export const conversationRoutes = async (app: FastifyInstance): Promise<void> => {
  // GET /api/conversations — список бесед текущего пользователя
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId

    const result = await query<Conversation & { members: string }>(
      `SELECT
         c.*,
         json_agg(
           json_build_object(
             'id', u.id,
             'email', u.email,
             'role', u.role,
             'created_at', u.created_at,
             'updated_at', u.updated_at
           )
         ) as members
       FROM conversations c
       JOIN conversation_members cm ON cm.conversation_id = c.id
       JOIN conversation_members cm2 ON cm2.conversation_id = c.id
       JOIN users u ON u.id = cm2.user_id
       WHERE cm.user_id = $1
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
      [userId]
    )

    return reply.send(result.rows)
  })

  // POST /api/conversations — создание новой беседы
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user!.userId
    const { type, name, memberIds } = request.body as {
      type: 'direct' | 'group'
      name?: string
      memberIds: string[]
    }

    if (!memberIds || memberIds.length === 0) {
      return reply.code(400).send({ message: 'Укажите участников беседы' })
    }

    if (type === 'direct') {
      // Для личного чата — проверяем, не существует ли уже
      const targetId = memberIds[0]
      if (!targetId) {
        return reply.code(400).send({ message: 'Укажите собеседника' })
      }

      // Ищем существующий прямой чат между двумя пользователями
      const existing = await query<{ id: string }>(
        `SELECT c.id FROM conversations c
         JOIN conversation_members cm1 ON cm1.conversation_id = c.id AND cm1.user_id = $1
         JOIN conversation_members cm2 ON cm2.conversation_id = c.id AND cm2.user_id = $2
         WHERE c.type = 'direct'
         LIMIT 1`,
        [userId, targetId]
      )

      if (existing.rows[0]) {
        return reply.send({ id: existing.rows[0].id, exists: true })
      }
    }

    if (type === 'group' && !name) {
      return reply.code(400).send({ message: 'Для группового чата требуется название' })
    }

    // Создаём беседу в транзакции
    const conversation = await transaction(async (client) => {
      const convResult = await client.query<Conversation>(
        `INSERT INTO conversations (type, name, created_by)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [type, name || null, userId]
      )
      const conv = convResult.rows[0]!

      // Добавляем создателя и участников
      const allMembers = [userId, ...memberIds.filter((id) => id !== userId)]
      for (const memberId of allMembers) {
        await client.query(
          'INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2)',
          [conv.id, memberId]
        )
      }

      return conv
    })

    return reply.code(201).send(conversation)
  })

  // GET /api/conversations/:id/messages — история сообщений
  app.get('/:id/messages', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.userId
    const { limit = 50, before } = request.query as { limit?: number; before?: string }

    // Проверяем членство пользователя в беседе
    const memberCheck = await query(
      'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [id, userId]
    )
    if (!memberCheck.rows[0]) {
      return reply.code(403).send({ message: 'Нет доступа к этой беседе' })
    }

    const params: unknown[] = [id, Math.min(Number(limit), 100)]
    let dateFilter = ''
    if (before) {
      dateFilter = 'AND m.created_at < $3'
      params.push(before)
    }

    const result = await query<MessageWithSender>(
      `SELECT
         m.*,
         u.email as sender_email,
         COALESCE(
           json_agg(
             json_build_object(
               'emoji', mr.emoji,
               'user_id', mr.user_id,
               'user_email', ru.email,
               'created_at', mr.created_at
             )
           ) FILTER (WHERE mr.emoji IS NOT NULL),
           '[]'
         ) as reactions,
         CASE WHEN m.reply_to_id IS NOT NULL THEN
           (SELECT json_build_object(
             'id', rm.id,
             'content', rm.content,
             'sender_email', ru2.email,
             'created_at', rm.created_at
           ) FROM messages rm
            JOIN users ru2 ON ru2.id = rm.sender_id
            WHERE rm.id = m.reply_to_id)
         END as reply_to
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       LEFT JOIN message_reactions mr ON mr.message_id = m.id
       LEFT JOIN users ru ON ru.id = mr.user_id
       WHERE m.conversation_id = $1 ${dateFilter}
       GROUP BY m.id, u.email
       ORDER BY m.created_at DESC
       LIMIT $2`,
      params
    )

    return reply.send(result.rows.reverse())
  })

  // POST /api/conversations/:id/members — добавление участника в группу
  app.post('/:id/members', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const userId = request.user!.userId
    const { userId: newMemberId } = request.body as { userId: string }

    // Проверяем что беседа существует и это группа
    const convResult = await query<ConversationWithMembers>(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    )
    const conv = convResult.rows[0]
    if (!conv) return reply.code(404).send({ message: 'Беседа не найдена' })
    if (conv.type !== 'group') {
      return reply.code(400).send({ message: 'Добавление участников только в групповые чаты' })
    }

    // Проверяем что текущий пользователь — участник
    const memberCheck = await query(
      'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
      [id, userId]
    )
    if (!memberCheck.rows[0]) {
      return reply.code(403).send({ message: 'Нет доступа к этой беседе' })
    }

    // Добавляем нового участника
    await query(
      'INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, newMemberId]
    )

    // Обновляем время изменения беседы
    await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [id])

    // Получаем данные нового участника
    const userResult = await query<UserPublic>(
      'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1',
      [newMemberId]
    )

    return reply.code(201).send(userResult.rows[0])
  })
}
