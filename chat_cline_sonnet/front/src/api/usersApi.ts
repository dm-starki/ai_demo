// ============================================================
// RTK Query эндпоинты управления пользователями
// ============================================================

import { baseApi } from './baseApi';
import type { User, UserRole } from '../types/index';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Список всех пользователей (только admin) */
    getUsers: builder.query<{ users: User[] }, void>({
      query: () => '/api/users',
      providesTags: ['User'],
    }),

    /** Создать пользователя */
    createUser: builder.mutation<
      { user: User },
      { email: string; password: string; role?: UserRole }
    >({
      query: (body) => ({
        url: '/api/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    /** Изменить пользователя */
    updateUser: builder.mutation<
      { user: User },
      { id: string; email?: string; password?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/users/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),

    /** Удалить пользователя */
    deleteUser: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/api/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),

    /** Изменить свой пароль */
    changePassword: builder.mutation<
      { message: string },
      { currentPassword: string; newPassword: string }
    >({
      query: (body) => ({
        url: '/api/users/password',
        method: 'PUT',
        body,
      }),
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useChangePasswordMutation,
} = usersApi;
