// ============================================================
// Хук для работы с Socket.io
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from './useTypedDispatch';
import {
  addMessage,
  updateMessageReactions,
  setOnlineUsers,
  addTypingUser,
  removeTypingUser,
} from '../store/slices/chatSlice';
import type { Message, ReactionGroup } from '../types/index';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5203';

/** Хук управляет подключением к Socket.io */
export const useSocket = () => {
  const dispatch = useAppDispatch();
  const { accessToken, isAuthenticated } = useAppSelector(s => s.auth);
  const socketRef = useRef<Socket | null>(null);

  // Подключение к сокету при авторизации
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.io подключён');
    });

    socket.on('disconnect', () => {
      console.log('Socket.io отключён');
    });

    socket.on('connect_error', (err) => {
      console.error('Ошибка подключения Socket.io:', err.message);
    });

    // Новое сообщение
    socket.on('message:new', (message: Message) => {
      dispatch(addMessage(message));
    });

    // Обновление реакций
    socket.on('message:reactions', (data: {
      messageId: string;
      reactions: ReactionGroup[];
    }) => {
      // Нужен chatId — его нет в событии,
      // но message уже в состоянии, найдём по messageId
      dispatch(updateMessageReactions({
        chatId: '', // временно — обновим в компоненте через store поиск
        messageId: data.messageId,
        reactions: data.reactions,
      }));
    });

    // Онлайн-пользователи
    socket.on('users:online', (userIds: string[]) => {
      dispatch(setOnlineUsers(userIds));
    });

    // Печатает...
    socket.on('typing:start', (data: { chatId: string; userId: string; email: string }) => {
      dispatch(addTypingUser(data));
    });

    socket.on('typing:stop', (data: { chatId: string; userId: string }) => {
      dispatch(removeTypingUser(data));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken, dispatch]);

  /** Вступить в комнату чата */
  const joinChat = useCallback((chatId: string) => {
    socketRef.current?.emit('chat:join', chatId);
  }, []);

  /** Покинуть комнату чата */
  const leaveChat = useCallback((chatId: string) => {
    socketRef.current?.emit('chat:leave', chatId);
  }, []);

  /** Отправить сообщение */
  const sendMessage = useCallback((data: {
    chatId: string;
    content: string;
    replyToId?: string;
    mentions?: string[];
  }) => {
    socketRef.current?.emit('message:send', data);
  }, []);

  /** Отправить реакцию */
  const sendReaction = useCallback((data: {
    chatId: string;
    messageId: string;
    emoji: string;
  }) => {
    socketRef.current?.emit('message:react', data);
  }, []);

  /** Начать печатать */
  const startTyping = useCallback((chatId: string) => {
    socketRef.current?.emit('typing:start', chatId);
  }, []);

  /** Остановить печатать */
  const stopTyping = useCallback((chatId: string) => {
    socketRef.current?.emit('typing:stop', chatId);
  }, []);

  return {
    socket: socketRef.current,
    joinChat,
    leaveChat,
    sendMessage,
    sendReaction,
    startTyping,
    stopTyping,
  };
};
