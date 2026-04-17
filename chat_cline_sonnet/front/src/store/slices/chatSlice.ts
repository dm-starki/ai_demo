// ============================================================
// Redux slice для чатов и сообщений
// ============================================================

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ChatState, Chat, Message, ReactionGroup } from '../../types/index';

const initialState: ChatState = {
  chats: [],
  activeChatId: null,
  messages: {},
  onlineUsers: [],
  typingUsers: {},
  isLoadingChats: false,
  isLoadingMessages: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    /** Установить список чатов */
    setChats: (state, action: PayloadAction<Chat[]>) => {
      state.chats = action.payload;
    },

    /** Добавить или обновить чат */
    upsertChat: (state, action: PayloadAction<Chat>) => {
      const idx = state.chats.findIndex(c => c.id === action.payload.id);
      if (idx >= 0) {
        state.chats[idx] = action.payload;
      } else {
        state.chats.unshift(action.payload);
      }
    },

    /** Установить активный чат */
    setActiveChat: (state, action: PayloadAction<string | null>) => {
      state.activeChatId = action.payload;
    },

    /** Установить сообщения для чата */
    setMessages: (state, action: PayloadAction<{ chatId: string; messages: Message[] }>) => {
      state.messages[action.payload.chatId] = action.payload.messages;
    },

    /** Добавить новое сообщение */
    addMessage: (state, action: PayloadAction<Message>) => {
      const { chat_id } = action.payload;
      if (!state.messages[chat_id]) {
        state.messages[chat_id] = [];
      }
      // Проверяем дубли
      const exists = state.messages[chat_id].find(m => m.id === action.payload.id);
      if (!exists) {
        state.messages[chat_id].push(action.payload);
      }

      // Обновляем last_message в чате
      const chatIdx = state.chats.findIndex(c => c.id === chat_id);
      if (chatIdx >= 0) {
        state.chats[chatIdx].last_message = action.payload;
        // Перемещаем чат наверх
        const chat = state.chats.splice(chatIdx, 1)[0];
        state.chats.unshift(chat);
      }
    },

    /** Обновить реакции сообщения */
    updateMessageReactions: (
      state,
      action: PayloadAction<{ chatId: string; messageId: string; reactions: ReactionGroup[] }>
    ) => {
      const { chatId, messageId, reactions } = action.payload;
      const messages = state.messages[chatId];
      if (messages) {
        const msgIdx = messages.findIndex(m => m.id === messageId);
        if (msgIdx >= 0) {
          state.messages[chatId][msgIdx].reactions = reactions;
        }
      }
    },

    /** Установить онлайн-пользователей */
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
    },

    /** Добавить печатающего пользователя */
    addTypingUser: (
      state,
      action: PayloadAction<{ chatId: string; userId: string; email: string }>
    ) => {
      const { chatId, userId, email } = action.payload;
      if (!state.typingUsers[chatId]) {
        state.typingUsers[chatId] = [];
      }
      const exists = state.typingUsers[chatId].find(u => u.userId === userId);
      if (!exists) {
        state.typingUsers[chatId].push({ userId, email });
      }
    },

    /** Убрать печатающего пользователя */
    removeTypingUser: (
      state,
      action: PayloadAction<{ chatId: string; userId: string }>
    ) => {
      const { chatId, userId } = action.payload;
      if (state.typingUsers[chatId]) {
        state.typingUsers[chatId] = state.typingUsers[chatId].filter(
          u => u.userId !== userId
        );
      }
    },

    /** Состояние загрузки чатов */
    setLoadingChats: (state, action: PayloadAction<boolean>) => {
      state.isLoadingChats = action.payload;
    },

    /** Состояние загрузки сообщений */
    setLoadingMessages: (state, action: PayloadAction<boolean>) => {
      state.isLoadingMessages = action.payload;
    },
  },
});

export const {
  setChats,
  upsertChat,
  setActiveChat,
  setMessages,
  addMessage,
  updateMessageReactions,
  setOnlineUsers,
  addTypingUser,
  removeTypingUser,
  setLoadingChats,
  setLoadingMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
