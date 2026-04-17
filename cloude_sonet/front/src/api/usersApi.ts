// RTK Query endpoints для управления пользователями

import { apiSlice } from './apiSlice'
import type { User } from '../types'

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Список всех пользователей
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),

    // Создание пользователя (admin)
    createUser: builder.mutation<User, { email: string; password: string; role?: string }>({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    // Обновление пользователя (admin)
    updateUser: builder.mutation<User, { id: string; email?: string; password?: string; role?: string }>({
      query: ({ id, ...body }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    // Удаление пользователя (admin)
    deleteUser: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    // Смена пароля текущим пользователем
    changePassword: builder.mutation<{ message: string }, { currentPassword: string; newPassword: string }>({
      query: (body) => ({
        url: '/users/me/password',
        method: 'PUT',
        body,
      }),
    }),
  }),
})

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useChangePasswordMutation,
} = usersApi
