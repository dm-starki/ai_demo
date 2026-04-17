// RTK Query endpoints для аутентификации

import { apiSlice } from './apiSlice'
import type { LoginResponse, User } from '../types'

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Вход в систему
    login: builder.mutation<LoginResponse, { email: string; password: string }>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    // Выход из системы
    logout: builder.mutation<{ message: string }, { refreshToken: string }>({
      query: (body) => ({
        url: '/auth/logout',
        method: 'POST',
        body,
      }),
    }),

    // Данные текущего пользователя
    getMe: builder.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['User'],
    }),
  }),
})

export const { useLoginMutation, useLogoutMutation, useGetMeQuery } = authApi
