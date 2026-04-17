const ACCESS = 'accessToken';
const REFRESH = 'refreshToken';

export const getAccessToken = (): string | null => sessionStorage.getItem(ACCESS);
export const getRefreshToken = (): string | null => sessionStorage.getItem(REFRESH);

export const setTokens = (access: string, refresh: string) => {
  sessionStorage.setItem(ACCESS, access);
  sessionStorage.setItem(REFRESH, refresh);
};

export const clearTokens = () => {
  sessionStorage.removeItem(ACCESS);
  sessionStorage.removeItem(REFRESH);
};
