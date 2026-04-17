// Модуль WebSocket сервера на базе Socket.io
// Работает на отдельном порту (SOCKET_PORT)
// Обеспечивает обмен сообщениями в реальном времени

import { createServer } from 'http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { query } from '../db/index.js'
import type { JwtPayload, MessageWithSender } from '../types/index.js'

// Карта онлайн-пользователей: userId -> socketId[]
const onlineUsers = new Map<string, Set<string>>()

// Создаём и запускаем Socket.io сервер
export const startSocketServer = (): void => {
  const httpServer = createServer()

  const io = new Server(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // Middleware аутентификации для сокетов
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) {
      return next(new Error('Требуется токен авторизации'))
    }
    try {
      const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload
      // Сохраняем данные пользователя в объекте сокета
      ;(socket as typeof socket & { user: JwtPayload }).user = payload
      next()
    } catch {
      next(new Error('Токен недействителен'))
    }
  })

  io.on('connection', (socket) => {
    const user = (socket as typeof socket & { user: JwtPayload }).user
    console.log(`[socket] Подключён: ${user.email} (${socket.id})`)

    // Добавляем пользователя в список онлайн
    if (!onlineUsers.has(user.userId)) {
      onlineUsers.set(user.userId, new Set())
    }
    onlineUsers.get(user.userId)!.add(socket.id)

    // Присоединяемся к комнатам бесед пользователя
    socket.on('join:conversations', async () => {
      const result = await query<{ conversation_id: string }>(
        'SELECT conversation_id FROM conversation_members WHERE user_id = $1',
        [user.userId]
      )
      for (const row of result.rows) {
        socket.join(`conv:${row.conversation_id}`)
      }
      socket.emit('conversations:joined', result.rows.map((r) => r.conversation_id))
    })

    // Вступить в конкретную беседу
    socket.on('join:conversation', async (conversationId: string) => {
      const memberCheck = await query(
        'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, user.userId]
      )
      if (memberCheck.rows[0]) {
        socket.join(`conv:${conversationId}`)
        socket.emit('conversation:joined', conversationId)
      }
    })

    // Отправка нового сообщения
    socket.on('message:send', async (data: {
      conversationId: string
      content: string
      replyToId?: string
    }) => {
      const { conversationId, content, replyToId } = data

      if (!content?.trim()) return

      // Проверяем членство
      const memberCheck = await query(
        'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, user.userId]
      )
      if (!memberCheck.rows[0]) {
        socket.emit('error', { message: 'Нет доступа к этой беседе' })
        return
      }

      // Сохраняем сообщение в БД
      const msgResult = await query<MessageWithSender>(
        `INSERT INTO messages (conversation_id, sender_id, content, reply_to_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [conversationId, user.userId, content.trim(), replyToId || null]
      )
      const msg = msgResult.rows[0]!

      // Обновляем время беседы
      await query(
        'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
        [conversationId]
      )

      // Получаем сообщение с данными отправителя и реакциями
      const fullMsgResult = await query<MessageWithSender>(
        `SELECT m.*, u.email as sender_email,
           '[]'::json as reactions,
           CASE WHEN m.reply_to_id IS NOT NULL THEN
             (SELECT json_build_object(
               'id', rm.id,
               'content', rm.content,
               'sender_email', ru.email,
               'created_at', rm.created_at
             ) FROM messages rm JOIN users ru ON ru.id = rm.sender_id WHERE rm.id = m.reply_to_id)
           END as reply_to
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.id = $1`,
        [msg.id]
      )

      // Рассылаем сообщение всем участникам беседы
      io.to(`conv:${conversationId}`).emit('message:new', fullMsgResult.rows[0])
    })

    // Добавление/удаление реакции на сообщение
    socket.on('reaction:toggle', async (data: {
      messageId: string
      emoji: string
    }) => {
      const { messageId, emoji } = data

      // Проверяем доступ через беседу
      const msgResult = await query<{ conversation_id: string }>(
        'SELECT conversation_id FROM messages WHERE id = $1',
        [messageId]
      )
      const msg = msgResult.rows[0]
      if (!msg) return

      const memberCheck = await query(
        'SELECT 1 FROM conversation_members WHERE conversation_id = $1 AND user_id = $2',
        [msg.conversation_id, user.userId]
      )
      if (!memberCheck.rows[0]) return

      // Переключаем реакцию (если есть — удаляем, если нет — добавляем)
      const existing = await query(
        'SELECT 1 FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
        [messageId, user.userId, emoji]
      )

      if (existing.rows[0]) {
        await query(
          'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3',
          [messageId, user.userId, emoji]
        )
      } else {
        await query(
          'INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)',
          [messageId, user.userId, emoji]
        )
      }

      // Получаем обновлённые реакции сообщения
      const reactionsResult = await query(
        `SELECT mr.emoji, mr.user_id, u.email as user_email, mr.created_at
         FROM message_reactions mr
         JOIN users u ON u.id = mr.user_id
         WHERE mr.message_id = $1`,
        [messageId]
      )

      // Рассылаем обновление реакций
      io.to(`conv:${msg.conversation_id}`).emit('reaction:updated', {
        messageId,
        reactions: reactionsResult.rows,
      })
    })

    // Событие набора текста
    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('typing:user', {
        userId: user.userId,
        email: user.email,
        conversationId,
      })
    })

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conv:${conversationId}`).emit('typing:stopped', {
        userId: user.userId,
        conversationId,
      })
    })

    // Отключение пользователя
    socket.on('disconnect', () => {
      console.log(`[socket] Отключён: ${user.email} (${socket.id})`)
      const userSockets = onlineUsers.get(user.userId)
      if (userSockets) {
        userSockets.delete(socket.id)
        if (userSockets.size === 0) {
          onlineUsers.delete(user.userId)
        }
      }
      // Уведомляем других об изменении статуса
      io.emit('users:online', Array.from(onlineUsers.keys()))
    })

    // Отправляем список онлайн-пользователей при подключении
    io.emit('users:online', Array.from(onlineUsers.keys()))
  })

  httpServer.listen(config.socket.port, () => {
    console.log(`[socket] WebSocket сервер запущен на порту ${config.socket.port}`)
  })
}
