// Слайс аутентификации
// Хранит данные текущего пользователя и JWT токены
// Токены сохраняются в sessionStorage (продлеваются при активном сеансе)

import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, User, TokenPair, LoginResponse } from '../../types'

const loadFromSession = (): Partial<AuthState> => {
  try {
    const accessToken = sessionStorage.getItem('accessToken')
    const refreshToken = sessionStorage.getItem('refreshToken')
    const userStr = sessionStorage.getItem('user')
    const user = userStr ? (JSON.parse(userStr) as User) : null
    return {
      accessToken,
      refreshToken,
      user,
      isAuthenticated: !!(accessToken && user),
    }
  } catch {
    return {}
  }
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  ...loadFromSession(),
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Успешный вход — сохраняем данные в store и sessionStorage
    loginSuccess: (state, action: PayloadAction<LoginResponse>) => {
      const { user, accessToken, refreshToken } = action.payload
      state.user = user
      state.accessToken = accessToken
      state.refreshToken = refreshToken
      state.isAuthenticated = true
      state.isLoading = false
      sessionStorage.setItem('accessToken', accessToken)
      sessionStorage.setItem('refreshToken', refreshToken)
      sessionStorage.setItem('user', JSON.stringify(user))
    },

    // Обновление пары токенов (при refresh)
    tokensRefreshed: (state, action: PayloadAction<TokenPair>) => {
      const { accessToken, refreshToken } = action.payload
      state.accessToken = accessToken
      state.refreshToken = refreshToken
      sessionStorage.setItem('accessToken', accessToken)
      sessionStorage.setItem('refreshToken', refreshToken)
    },

    // Выход из системы
    logout: (state) => {
      state.user = null
      state.accessToken = null
      state.refreshToken = null
      state.isAuthenticated = false
      state.isLoading = false
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
      sessionStorage.removeItem('user')
    },

    // Завершение инициализации
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    // Обновление данных пользователя
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload
      sessionStorage.setItem('user', JSON.stringify(action.payload))
    },
  },
})

export const { loginSuccess, tokensRefreshed, logout, setLoading, updateUser } = authSlice.actions
export const authReducer = authSlice.reducer
