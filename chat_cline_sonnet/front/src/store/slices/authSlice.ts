// ============================================================
// Redux slice для авторизации
// ============================================================

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { saveTokens, clearTokens, getAccessToken, getRefreshToken } from '../../utils/auth';
import type { AuthState, User, AuthTokens } from '../../types/index';

const initialState: AuthState = {
  user: null,
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  isAuthenticated: Boolean(getAccessToken()),
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Успешный вход / обновление токенов */
    setCredentials: (state, action: PayloadAction<{ user: User; tokens: AuthTokens }>) => {
      const { user, tokens } = action.payload;
      state.user = user;
      state.accessToken = tokens.accessToken;
      state.refreshToken = tokens.refreshToken;
      state.isAuthenticated = true;
      state.isLoading = false;
      saveTokens(tokens.accessToken, tokens.refreshToken);
    },

    /** Обновить данные пользователя */
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },

    /** Выход */
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      clearTokens();
    },

    /** Установить состояние загрузки */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setCredentials, setUser, logout, setLoading } = authSlice.actions;
export default authSlice.reducer;
