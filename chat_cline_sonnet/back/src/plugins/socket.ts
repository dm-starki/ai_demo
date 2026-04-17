// ============================================================
// Socket.io сервер — реалтайм обмен сообщениями
// Запускается на отдельном порту SOCKET_PORT
// ============================================================

import { createServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { serverConfig, corsConfig } from '../config.js';
import { verifyAccessToken } from '../services/authService.js';
import {
  createMessage,
  toggleReaction,
  isChatMember,
  getMessageReactions,
} from '../services/chatService.js';
import type { JwtPayload } from '../types/index.js';

/** Расширенный Socket с данными пользователя */
interface AuthSocket extends Socket {
  user?: JwtPayload;
}

/** Карта userId -> socketId (для уведомлений онлайн-пользователей) */
const onlineUsers = new Map<string, string>();

/** Инициализация Socket.io сервера */
export const createSocketServer = () => {
  const httpServer = createServer();

  const io = new Server(httpServer, {
    cors: {
      origin: corsConfig.origins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // --- Middleware аутентификации для socket.io ---
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Токен авторизации отсутствует'));
    }

    try {
      const payload = verifyAccessToken(token);
      if (payload.type !== 'access') {
        return next(new Error('Неверный тип токена'));
      }
      socket.user = payload;
      next();
    } catch {
      next(new Error('Токен недействителен или истёк'));
    }
  });

  // --- Обработка подключений ---
  io.on('connection', (socket: AuthSocket) => {
    const user = socket.user!;
    console.log(`🔌 Пользователь подключился: ${user.email} (${socket.id})`);

    // Регистрируем пользователя как онлайн
    onlineUsers.set(user.userId, socket.id);

    // Уведомляем всех об изменении онлайн-статуса
    io.emit('users:online', Array.from(onlineUsers.keys()));

    // --- Вступить в комнату чата ---
    socket.on('chat:join', (chatId: string) => {
      socket.join(chatId);
      console.log(`📥 ${user.email} вошёл в чат ${chatId}`);
    });

    // --- Покинуть комнату чата ---
    socket.on('chat:leave', (chatId: string) => {
      socket.leave(chatId);
      console.log(`📤 ${user.email} покинул чат ${chatId}`);
    });

    // --- Отправить сообщение ---
    socket.on('message:send', async (data: {
      chatId: string;
      content: string;
      replyToId?: string;
      mentions?: string[];
    }) => {
      try {
        const { chatId, content, replyToId, mentions } = data;

        // Проверяем участие в чате
        const member = await isChatMember(chatId, user.userId);
        if (!member) {
          socket.emit('error', { message: 'Вы не являетесь участником этого чата' });
          return;
        }

        // Создаём сообщение
        const message = await createMessage(chatId, user.userId, content, replyToId, mentions);

        // Рассылаем всем в комнате
        io.to(chatId).emit('message:new', message);

        console.log(`💬 Сообщение от ${user.email} в чат ${chatId}`);
      } catch (err) {
        console.error('Ошибка отправки сообщения:', err);
        socket.emit('error', { message: 'Ошибка при отправке сообщения' });
      }
    });

    // --- Реакция на сообщение ---
    socket.on('message:react', async (data: {
      chatId: string;
      messageId: string;
      emoji: string;
    }) => {
      try {
        const { chatId, messageId, emoji } = data;

        await toggleReaction(messageId, user.userId, emoji);
        const reactions = await getMessageReactions(messageId);

        // Рассылаем обновлённые реакции всем в комнате
        io.to(chatId).emit('message:reactions', { messageId, reactions });
      } catch (err) {
        console.error('Ошибка реакции:', err);
        socket.emit('error', { message: 'Ошибка при сохранении реакции' });
      }
    });

    // --- Пользователь печатает ---
    socket.on('typing:start', (chatId: string) => {
      socket.to(chatId).emit('typing:start', { chatId, userId: user.userId, email: user.email });
    });

    socket.on('typing:stop', (chatId: string) => {
      socket.to(chatId).emit('typing:stop', { chatId, userId: user.userId });
    });

    // --- Отключение ---
    socket.on('disconnect', () => {
      onlineUsers.delete(user.userId);
      io.emit('users:online', Array.from(onlineUsers.keys()));
      console.log(`🔌 Пользователь отключился: ${user.email}`);
    });
  });

  // --- Запуск сервера ---
  httpServer.listen(serverConfig.socketPort, () => {
    console.log(`🔌 Socket.io сервер запущен на порту ${serverConfig.socketPort}`);
  });

  return io;
};
