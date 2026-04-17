// Хук для автоматического обновления JWT токенов
// Обновляет токены каждый час при активном сеансе

import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from './useStore'
import { tokensRefreshed, logout } from '../store/slices/authSlice'

// Интервал обновления токенов — 1 час
const REFRESH_INTERVAL = 60 * 60 * 1000

export const useTokenRefresh = () => {
  const dispatch = useAppDispatch()
  const refreshToken = useAppSelector((s) => s.auth.refreshToken)
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const doRefresh = async () => {
    if (!refreshToken) return

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })

      if (response.ok) {
        const data = await response.json() as { accessToken: string; refreshToken: string }
        dispatch(tokensRefreshed(data))
      } else {
        // Refresh токен недействителен — выходим
        dispatch(logout())
      }
    } catch {
      console.error('Ошибка обновления токена')
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return

    // Запускаем периодическое обновление
    intervalRef.current = setInterval(doRefresh, REFRESH_INTERVAL)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, refreshToken])
}
