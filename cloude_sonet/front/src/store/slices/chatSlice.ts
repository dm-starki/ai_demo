// Слайс состояния чата
// Хранит список бесед, сообщения, онлайн-пользователей и состояние набора текста

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ChatState, Conversation, Message, Reaction } from '../../types'

const initialState: ChatState = {
  conversations: [],
  activeConversationId: null,
  messages: {},
  onlineUserIds: [],
  typingUsers: {},
  isConnected: false,
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Установка списка бесед
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload
    },

    // Добавление новой беседы
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.find((c) => c.id === action.payload.id)
      if (!exists) {
        state.conversations.unshift(action.payload)
      }
    },

    // Активная беседа
    setActiveConversation: (state, action: PayloadAction<string | null>) => {
      state.activeConversationId = action.payload
    },

    // Загрузка истории сообщений беседы
    setMessages: (state, action: PayloadAction<{ conversationId: string; messages: Message[] }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages
    },

    // Добавление нового сообщения
    addMessage: (state, action: PayloadAction<Message>) => {
      const { conversation_id } = action.payload
      if (!state.messages[conversation_id]) {
        state.messages[conversation_id] = []
      }
      // Проверяем дубликаты
      const exists = state.messages[conversation_id]!.find((m) => m.id === action.payload.id)
      if (!exists) {
        state.messages[conversation_id]!.push(action.payload)
      }

      // Обновляем время беседы для сортировки
      const conv = state.conversations.find((c) => c.id === conversation_id)
      if (conv) {
        conv.updated_at = action.payload.created_at
        // Перемещаем беседу в начало списка
        state.conversations = [
          conv,
          ...state.conversations.filter((c) => c.id !== conversation_id),
        ]
      }
    },

    // Обновление реакций сообщения
    updateReactions: (state, action: PayloadAction<{ messageId: string; reactions: Reaction[] }>) => {
      const { messageId, reactions } = action.payload
      for (const msgs of Object.values(state.messages)) {
        const msg = msgs.find((m) => m.id === messageId)
        if (msg) {
          msg.reactions = reactions
          break
        }
      }
    },

    // Список онлайн-пользователей
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUserIds = action.payload
    },

    // Статус набора текста
    setTypingUser: (state, action: PayloadAction<{
      conversationId: string
      userId: string
      email: string
      isTyping: boolean
    }>) => {
      const { conversationId, userId, email, isTyping } = action.payload
      if (!state.typingUsers[conversationId]) {
        state.typingUsers[conversationId] = []
      }
      if (isTyping) {
        const exists = state.typingUsers[conversationId]!.find((u) => u.userId === userId)
        if (!exists) {
          state.typingUsers[conversationId]!.push({ userId, email })
        }
      } else {
        state.typingUsers[conversationId] = state.typingUsers[conversationId]!.filter(
          (u) => u.userId !== userId
        )
      }
    },

    // Статус подключения сокета
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload
    },
  },
})

export const {
  setConversations,
  addConversation,
  setActiveConversation,
  setMessages,
  addMessage,
  updateReactions,
  setOnlineUsers,
  setTypingUser,
  setConnected,
} = chatSlice.actions

export const chatReducer = chatSlice.reducer
