import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../auth/tokens';

type LoginRes = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; role: 'user' | 'admin' };
};

const baseUrl = import.meta.env.VITE_API_URL;

/** Элемент списка бесед (как в GET /conversations и в ответах POST создания). */
export type ConversationListItem = {
  id: string;
  kind: 'direct' | 'group';
  title: string | null;
  created_at: string;
  peer_email: string | null;
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl,
  prepareHeaders: (headers) => {
    const t = getAccessToken();
    if (t) headers.set('Authorization', `Bearer ${t}`);
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) {
    const rt = getRefreshToken();
    if (rt) {
      const refresh = await fetch(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (refresh.ok) {
        const data = (await refresh.json()) as LoginRes;
        setTokens(data.accessToken, data.refreshToken);
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        clearTokens();
      }
    }
  }
  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Me', 'Users', 'Conversations', 'Messages', 'Members'],
  endpoints: (build) => ({
    login: build.mutation<LoginRes, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    refresh: build.mutation<LoginRes, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/refresh', method: 'POST', body }),
    }),
    me: build.query<{ id: string; email: string; role: 'user' | 'admin' }, void>({
      query: () => '/users/me',
      providesTags: ['Me'],
    }),
    changePassword: build.mutation<
      { ok: boolean },
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({ url: '/users/me/password', method: 'PATCH', body }),
    }),
    usersDirectory: build.query<{ id: string; email: string }[], void>({
      query: () => '/users',
      providesTags: ['Users'],
    }),
    adminUsers: build.query<{ id: string; email: string; role: string; created_at: string }[], void>(
      {
        query: () => '/admin/users',
        providesTags: ['Users'],
      },
    ),
    adminCreateUser: build.mutation<
      { id: string; email: string; role: string; created_at: string },
      { email: string; password: string; role: 'user' | 'admin' }
    >({
      query: (body) => ({ url: '/admin/users', method: 'POST', body }),
      invalidatesTags: ['Users'],
    }),
    adminUpdateUser: build.mutation<
      { ok: boolean },
      { id: string; email: string; role: 'user' | 'admin'; password?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/admin/users/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Users', 'Me'],
    }),
    adminDeleteUser: build.mutation<{ ok: boolean }, { id: string }>({
      query: ({ id }) => ({ url: `/admin/users/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Users'],
    }),
    conversations: build.query<ConversationListItem[], void>({
      query: () => '/conversations',
      providesTags: () => [{ type: 'Conversations' as const, id: 'LIST' }],
    }),
    createDirect: build.mutation<ConversationListItem, { peerUserId: string }>({
      query: (body) => ({ url: '/conversations/direct', method: 'POST', body }),
      invalidatesTags: () => [{ type: 'Conversations', id: 'LIST' }],
    }),
    createGroup: build.mutation<ConversationListItem, { title: string; memberIds: string[] }>({
      query: (body) => ({ url: '/conversations/group', method: 'POST', body }),
      invalidatesTags: () => [{ type: 'Conversations', id: 'LIST' }],
    }),
    addMembers: build.mutation<{ ok: boolean }, { id: string; userIds: string[] }>({
      query: ({ id, userIds }) => ({
        url: `/conversations/${id}/members`,
        method: 'POST',
        body: { userIds },
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: 'Conversations', id: 'LIST' },
        { type: 'Members', id: arg.id },
      ],
    }),
    members: build.query<{ id: string; email: string }[], { id: string }>({
      query: ({ id }) => `/conversations/${id}/members`,
      providesTags: (_r, _e, arg) => [{ type: 'Members', id: arg.id }],
    }),
    messages: build.query<
      {
        id: string;
        conversationId: string;
        senderId: string;
        senderEmail: string;
        body: string;
        replyToId: string | null;
        mentions: string[];
        createdAt: string;
        reactions: { userId: string; emoji: string }[];
      }[],
      { id: string; before?: string }
    >({
      query: ({ id, before }) => ({
        url: `/conversations/${id}/messages`,
        params: before ? { before, limit: 100 } : { limit: 100 },
      }),
      providesTags: (_r, _e, arg) => [{ type: 'Messages', id: arg.id }],
    }),
    health: build.query<{ ok: boolean }, void>({
      query: () => '/health',
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshMutation,
  useMeQuery,
  useLazyMeQuery,
  useChangePasswordMutation,
  useUsersDirectoryQuery,
  useAdminUsersQuery,
  useAdminCreateUserMutation,
  useAdminUpdateUserMutation,
  useAdminDeleteUserMutation,
  useConversationsQuery,
  useCreateDirectMutation,
  useCreateGroupMutation,
  useAddMembersMutation,
  useMembersQuery,
  useMessagesQuery,
  useLazyMessagesQuery,
  useHealthQuery,
} = api;
