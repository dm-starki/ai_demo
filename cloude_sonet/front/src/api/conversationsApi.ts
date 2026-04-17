// RTK Query endpoints для работы с беседами

import { apiSlice } from './apiSlice'
import type { Conversation, Message } from '../types'

export const conversationsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Список бесед пользователя
    getConversations: builder.query<Conversation[], void>({
      query: () => '/conversations',
      providesTags: ['Conversation'],
    }),

    // Создание беседы
    createConversation: builder.mutation<
      Conversation,
      { type: 'direct' | 'group'; name?: string; memberIds: string[] }
    >({
      query: (body) => ({
        url: '/conversations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Conversation'],
    }),

    // История сообщений беседы
    getMessages: builder.query<Message[], { conversationId: string; before?: string }>({
      query: ({ conversationId, before }) => ({
        url: `/conversations/${conversationId}/messages`,
        params: before ? { before, limit: 50 } : { limit: 50 },
      }),
      providesTags: (_result, _error, { conversationId }) => [
        { type: 'Message', id: conversationId },
      ],
    }),

    // Добавление участника в группу
    addMember: builder.mutation<void, { conversationId: string; userId: string }>({
      query: ({ conversationId, userId }) => ({
        url: `/conversations/${conversationId}/members`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: ['Conversation'],
    }),
  }),
})

export const {
  useGetConversationsQuery,
  useCreateConversationMutation,
  useGetMessagesQuery,
  useAddMemberMutation,
} = conversationsApi
