// Хук для работы с Socket.io
// Подключается к серверу, управляет жизненным циклом соединения,
// обрабатывает входящие события и обновляет Redux store

import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAppDispatch, useAppSelector } from './useStore'
import {
  setConnected,
  addMessage,
  updateReactions,
  setOnlineUsers,
  setTypingUser,
  addConversation,
} from '../store/slices/chatSlice'
import type { Message, Reaction, Conversation } from '../types'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL as string || 'http://localhost:3403'

export const useSocket = () => {
  const dispatch = useAppDispatch()
  const socketRef = useRef<Socket | null>(null)
  const accessToken = useAppSelector((s) => s.auth.accessToken)
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return

    // Создаём соединение
    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      dispatch(setConnected(true))
      // Присоединяемся ко всем беседам пользователя
      socket.emit('join:conversations')
    })

    socket.on('disconnect', () => {
      dispatch(setConnected(false))
    })

    // Новое сообщение
    socket.on('message:new', (message: Message) => {
      dispatch(addMessage(message))
    })

    // Обновление реакций
    socket.on('reaction:updated', (data: { messageId: string; reactions: Reaction[] }) => {
      dispatch(updateReactions(data))
    })

    // Список онлайн-пользователей
    socket.on('users:online', (userIds: string[]) => {
      dispatch(setOnlineUsers(userIds))
    })

    // Набор текста
    socket.on('typing:user', (data: { userId: string; email: string; conversationId: string }) => {
      dispatch(setTypingUser({ ...data, isTyping: true }))
    })

    socket.on('typing:stopped', (data: { userId: string; conversationId: string }) => {
      dispatch(setTypingUser({ ...data, email: '', isTyping: false }))
    })

    // Новая беседа создана
    socket.on('conversation:new', (conversation: Conversation) => {
      dispatch(addConversation(conversation))
    })

    return () => {
      socket.disconnect()
      dispatch(setConnected(false))
      socketRef.current = null
    }
  }, [isAuthenticated, accessToken, dispatch])

  // Отправка сообщения через сокет
  const sendMessage = (conversationId: string, content: string, replyToId?: string) => {
    socketRef.current?.emit('message:send', { conversationId, content, replyToId })
  }

  // Переключение реакции
  const toggleReaction = (messageId: string, emoji: string) => {
    socketRef.current?.emit('reaction:toggle', { messageId, emoji })
  }

  // События набора текста
  const startTyping = (conversationId: string) => {
    socketRef.current?.emit('typing:start', conversationId)
  }

  const stopTyping = (conversationId: string) => {
    socketRef.current?.emit('typing:stop', conversationId)
  }

  // Вступить в беседу
  const joinConversation = (conversationId: string) => {
    socketRef.current?.emit('join:conversation', conversationId)
  }

  return { sendMessage, toggleReaction, startTyping, stopTyping, joinConversation }
}
