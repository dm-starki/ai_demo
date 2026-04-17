// ============================================================
// Сервис авторизации — JWT токены, хэширование паролей
// ============================================================

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/index.js';
import { jwtConfig, bcryptConfig } from '../config.js';
import type { User, UserPublic, JwtPayload, AuthTokens } from '../types/index.js';

/** Захэшировать пароль */
export const hashPassword = (password: string): Promise<string> =>
  bcrypt.hash(password, bcryptConfig.rounds);

/** Проверить пароль */
export const comparePassword = (password: string, hash: string): Promise<boolean> =>
  bcrypt.compare(password, hash);

/** Сгенерировать пару токенов */
export const generateTokens = (user: UserPublic): AuthTokens => {
  const accessPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };

  const refreshPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, jwtConfig.accessSecret, {
    expiresIn: jwtConfig.accessExpiresIn as jwt.SignOptions['expiresIn'],
  });

  const refreshToken = jwt.sign(refreshPayload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });

  return { accessToken, refreshToken };
};

/** Верифицировать access токен */
export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, jwtConfig.accessSecret) as JwtPayload;
};

/** Верифицировать refresh токен */
export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, jwtConfig.refreshSecret) as JwtPayload;
};

/** Найти пользователя по email */
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const result = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] ?? null;
};

/** Найти пользователя по id */
export const findUserById = async (id: string): Promise<User | null> => {
  const result = await query<User>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
};

/** Преобразовать пользователя в публичный объект (без пароля) */
export const toPublicUser = (user: User): UserPublic => ({
  id: user.id,
  email: user.email,
  role: user.role,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

/** Сохранить refresh токен в БД */
export const saveRefreshToken = async (userId: string, token: string): Promise<void> => {
  // Вычисляем дату истечения — 7 дней
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await query(
    `INSERT INTO refresh_tokens (id, user_id, token, expires_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (token) DO NOTHING`,
    [uuidv4(), userId, token, expiresAt]
  );
};

/** Удалить refresh токен из БД */
export const deleteRefreshToken = async (token: string): Promise<void> => {
  await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
};

/** Проверить валидность refresh токена в БД */
export const validateRefreshTokenInDb = async (token: string): Promise<boolean> => {
  const result = await query(
    'SELECT id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
    [token]
  );
  return (result.rowCount ?? 0) > 0;
};

/** Удалить все refresh токены пользователя */
export const deleteAllUserTokens = async (userId: string): Promise<void> => {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
};

/** Очистить истёкшие токены */
export const cleanExpiredTokens = async (): Promise<void> => {
  await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
};
