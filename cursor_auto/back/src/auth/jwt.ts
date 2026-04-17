import jwt, { type SignOptions } from 'jsonwebtoken';
import type { AppConfig } from '../config.js';

export type AccessPayload = { sub: string; email: string; role: 'user' | 'admin' };

export type RefreshPayload = {
  sub: string;
  typ: 'refresh';
  /** Unix ms — начало сессии (первый вход) */
  fst: number;
};

const parseDurationMs = (value: string): number => {
  const m = /^(\d+)(ms|s|m|h|d)$/.exec(value.trim());
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2];
  const mult =
    u === 'ms' ? 1 : u === 's' ? 1000 : u === 'm' ? 60_000 : u === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
};

export const createJwtHelpers = (cfg: AppConfig) => {
  const sessionMaxMs = parseDurationMs(cfg.jwtSessionMax);

  const signAccess = (payload: AccessPayload) =>
    jwt.sign(payload, cfg.jwtAccessSecret, {
      expiresIn: cfg.jwtAccessExpires as SignOptions['expiresIn'],
    });

  const verifyAccess = (token: string): AccessPayload =>
    jwt.verify(token, cfg.jwtAccessSecret) as AccessPayload;

  const signRefresh = (payload: RefreshPayload) =>
    jwt.sign(payload, cfg.jwtRefreshSecret, {
      expiresIn: cfg.jwtSessionMax as SignOptions['expiresIn'],
    });

  const verifyRefresh = (token: string): RefreshPayload =>
    jwt.verify(token, cfg.jwtRefreshSecret) as RefreshPayload;

  const assertSessionAlive = (fst: number) => {
    if (Date.now() - fst > sessionMaxMs) {
      const err = new Error('Сессия истекла (максимум 7 дней с первого входа)');
      (err as Error & { statusCode?: number }).statusCode = 401;
      throw err;
    }
  };

  return { signAccess, verifyAccess, signRefresh, verifyRefresh, assertSessionAlive, sessionMaxMs };
};
