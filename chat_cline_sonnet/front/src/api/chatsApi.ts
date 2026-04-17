// ============================================================
// RTK Query эндпоинты чатов и сообщений
// ============================================================

import { baseApi } from './baseApi';
import type { Chat, Message, User } from '../types/index';

export const chatsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Список чатов текущего пользователя */
    getChats: builder.query<{ chats: Chat[] }, void>({
      query: () => '/api/chats',
      providesTags: ['Chat'],
    }),

    /** Все пользователи для создания чатов */
    getAllUsersForChat: builder.query<{ users: User[] }, void>({
      query: () => '/api/chats/users/all',
      providesTags: ['User'],
    }),

    /** Создать/открыть личный чат */
    createDirectChat: builder.mutation<{ chat: Chat }, { targetUserId: string }>({
      query: (body) => ({
        url: '/api/chats/direct',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Chat'],
    }),

    /** Создать групповой чат */
    createGroupChat: builder.mutation<
      { chat: Chat },
      { name: string; memberIds: string[] }
    >({
      query: (body) => ({
        url: '/api/chats/group',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Chat'],
    }),

    /** Добавить участника в чат */
    addChatMember: builder.mutation<
      { message: string },
      { chatId: string; userId: string }
    >({
      query: ({ chatId, userId }) => ({
        url: `/api/chats/${chatId}/members`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: ['Chat'],
    }),

    /** Сообщения чата */
    getChatMessages: builder.query<
      { messages: Message[] },
      { chatId: string; limit?: number; before?: string }
    >({
      query: ({ chatId, limit = 50, before }) => ({
        url: `/api/chats/${chatId}/messages`,
        params: { limit, ...(before ? { before } : {}) },
      }),
      providesTags: (_result, _error, { chatId }) => [{ type: 'Message', id: chatId }],
    }),
  }),
});

export const {
  useGetChatsQuery,
  useGetAllUsersForChatQuery,
  useCreateDirectChatMutation,
  useCreateGroupChatMutation,
  useAddChatMemberMutation,
  useGetChatMessagesQuery,
} = chatsApi;
