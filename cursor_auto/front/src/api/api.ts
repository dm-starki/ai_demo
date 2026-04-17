import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export type UserRole = 'user' | 'admin';

export type UserPublic = { id: string; email: string; role: UserRole };

export type ConversationItem = {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  peerEmail: string | null;
  members: { id: string; email: string }[];
};

export type MessageDto = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_email: string;
  body: string;
  reply_to_id: string | null;
  created_at: string;
  reply_preview: { id: string; sender_email: string; body: string } | null;
  mentions: string[];
  reactions: { emoji: string; emails: string[] }[];
};

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL as string,
  prepareHeaders: (headers) => {
    const t = sessionStorage.getItem('accessToken');
    if (t) headers.set('Authorization', `Bearer ${t}`);
    return headers;
  },
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Me', 'Conversations', 'Messages', 'Users'],
  endpoints: (build) => ({
    login: build.mutation<
      { accessToken: string; refreshToken: string; user: UserPublic },
      { email: string; password: string }
    >({
      query: (body) => ({ url: '/api/auth/login', method: 'POST', body }),
    }),
    refresh: build.mutation<
      { accessToken: string; refreshToken: string; user: UserPublic },
      { refreshToken: string }
    >({
      query: (body) => ({ url: '/api/auth/refresh', method: 'POST', body }),
    }),
    me: build.query<UserPublic, void>({
      query: () => '/api/me',
      providesTags: ['Me'],
    }),
    changePassword: build.mutation<
      { ok: boolean },
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({ url: '/api/me/password', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
    conversations: build.query<ConversationItem[], void>({
      query: () => '/api/conversations',
      providesTags: ['Conversations'],
    }),
    createConversation: build.mutation<{ id: string }, Record<string, unknown>>({
      query: (body) => ({ url: '/api/conversations', method: 'POST', body }),
      invalidatesTags: ['Conversations'],
    }),
    addMembers: build.mutation<{ ok: boolean }, { id: string; emails: string[] }>({
      query: ({ id, emails }) => ({
        url: `/api/conversations/${id}/members`,
        method: 'POST',
        body: { emails },
      }),
      invalidatesTags: ['Conversations'],
    }),
    messages: build.query<MessageDto[], string>({
      query: (id) => `/api/conversations/${id}/messages`,
      providesTags: (_r, _e, id) => [{ type: 'Messages', id }],
    }),
    adminUsers: build.query<UserPublic[], void>({
      query: () => '/api/admin/users',
      providesTags: ['Users'],
    }),
    adminCreateUser: build.mutation<
      UserPublic,
      { email: string; password: string; role: UserRole }
    >({
      query: (body) => ({ url: '/api/admin/users', method: 'POST', body }),
      invalidatesTags: ['Users'],
    }),
    adminUpdateUser: build.mutation<
      UserPublic,
      { id: string; email?: string; password?: string; role?: UserRole }
    >({
      query: ({ id, ...patch }) => ({ url: `/api/admin/users/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: ['Users'],
    }),
    adminDeleteUser: build.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/api/admin/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Users'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshMutation,
  useMeQuery,
  useLazyMeQuery,
  useChangePasswordMutation,
  useConversationsQuery,
  useCreateConversationMutation,
  useAddMembersMutation,
  useMessagesQuery,
  useAdminUsersQuery,
  useAdminCreateUserMutation,
  useAdminUpdateUserMutation,
  useAdminDeleteUserMutation,
} = api;
