import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from './env.js';

export type AccessPayload = { sub: string; typ: 'access' };
export type RefreshPayload = { sub: string; typ: 'refresh'; sid: string };

export const signAccessToken = (userId: string): string =>
  jwt.sign(
    { sub: userId, typ: 'access' } satisfies AccessPayload,
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES } as SignOptions,
  );

export const signRefreshToken = (userId: string, sessionId: string): string =>
  jwt.sign(
    { sub: userId, typ: 'refresh', sid: sessionId } satisfies RefreshPayload,
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_MAX } as SignOptions,
  );

export const verifyAccessToken = (token: string): AccessPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;

export const verifyRefreshToken = (token: string): RefreshPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
