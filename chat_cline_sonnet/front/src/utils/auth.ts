// ============================================================
// Утилиты для работы с токенами авторизации
// Токены хранятся в sessionStorage
// ============================================================

const ACCESS_TOKEN_KEY = 'chat_access_token';
const REFRESH_TOKEN_KEY = 'chat_refresh_token';

/** Сохранить токены в sessionStorage */
export const saveTokens = (accessToken: string, refreshToken: string): void => {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

/** Получить access токен из sessionStorage */
export const getAccessToken = (): string | null =>
  sessionStorage.getItem(ACCESS_TOKEN_KEY);

/** Получить refresh токен из sessionStorage */
export const getRefreshToken = (): string | null =>
  sessionStorage.getItem(REFRESH_TOKEN_KEY);

/** Удалить токены из sessionStorage */
export const clearTokens = (): void => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
};

/** Проверить наличие токенов */
export const hasTokens = (): boolean =>
  Boolean(getAccessToken() && getRefreshToken());
