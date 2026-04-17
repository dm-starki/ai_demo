// ============================================================
// RTK Query эндпоинты авторизации
// ============================================================

import { baseApi } from './baseApi';
import type { AuthResponse, User } from '../types/index';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Вход */
    login: builder.mutation<AuthResponse, { email: string; password: string }>({
      query: (body) => ({
        url: '/api/auth/login',
        method: 'POST',
        body,
      }),
    }),

    /** Обновление токенов */
    refresh: builder.mutation<AuthResponse, { refreshToken: string }>({
      query: (body) => ({
        url: '/api/auth/refresh',
        method: 'POST',
        body,
      }),
    }),

    /** Выход */
    logout: builder.mutation<{ message: string }, { refreshToken?: string }>({
      query: (body) => ({
        url: '/api/auth/logout',
        method: 'POST',
        body,
      }),
    }),

    /** Текущий пользователь */
    getMe: builder.query<{ user: User }, void>({
      query: () => '/api/auth/me',
      providesTags: ['User'],
    }),
  }),
});

export const {
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGetMeQuery,
} = authApi;
