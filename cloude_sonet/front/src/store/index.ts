// Настройка Redux Store
// Объединяет все слайсы и API

import { configureStore } from '@reduxjs/toolkit'
import { authReducer } from './slices/authSlice'
import { chatReducer } from './slices/chatSlice'
import { apiSlice } from '../api/apiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    chat: chatReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
