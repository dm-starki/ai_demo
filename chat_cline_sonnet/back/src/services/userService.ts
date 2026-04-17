// ============================================================
// Сервис управления пользователями
// ============================================================

import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/index.js';
import { hashPassword } from './authService.js';
import type { User, UserPublic, UserRole } from '../types/index.js';

/** Получить всех пользователей */
export const getAllUsers = async (): Promise<UserPublic[]> => {
  const result = await query<UserPublic>(
    'SELECT id, email, role, created_at, updated_at FROM users ORDER BY created_at ASC'
  );
  return result.rows;
};

/** Найти пользователя по id (публичные данные) */
export const getUserById = async (id: string): Promise<UserPublic | null> => {
  const result = await query<UserPublic>(
    'SELECT id, email, role, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
};

/** Создать нового пользователя */
export const createUser = async (
  email: string,
  password: string,
  role: UserRole = 'user'
): Promise<UserPublic> => {
  const hashedPassword = await hashPassword(password);
  const result = await query<UserPublic>(
    `INSERT INTO users (id, email, password, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, role, created_at, updated_at`,
    [uuidv4(), email, hashedPassword, role]
  );
  return result.rows[0];
};

/** Обновить email пользователя */
export const updateUserEmail = async (id: string, email: string): Promise<UserPublic | null> => {
  const result = await query<UserPublic>(
    `UPDATE users SET email = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, email, role, created_at, updated_at`,
    [email, id]
  );
  return result.rows[0] ?? null;
};

/** Обновить пароль пользователя */
export const updateUserPassword = async (id: string, newPassword: string): Promise<boolean> => {
  const hashedPassword = await hashPassword(newPassword);
  const result = await query(
    'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
    [hashedPassword, id]
  );
  return (result.rowCount ?? 0) > 0;
};

/** Удалить пользователя */
export const deleteUser = async (id: string): Promise<boolean> => {
  const result = await query('DELETE FROM users WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
};

/** Проверить уникальность email */
export const isEmailTaken = async (email: string, excludeId?: string): Promise<boolean> => {
  const result = excludeId
    ? await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, excludeId])
    : await query('SELECT id FROM users WHERE email = $1', [email]);
  return (result.rowCount ?? 0) > 0;
};

/** Получить полный объект пользователя по id */
export const getFullUserById = async (id: string): Promise<User | null> => {
  const result = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
};
