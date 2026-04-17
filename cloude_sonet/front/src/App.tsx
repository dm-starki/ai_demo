// Корневой компонент приложения
// Настройка роутера, провайдеров и глобального макета

import { useEffect, useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout, ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { AppHeader } from './components/layout/AppHeader'
import { LoginPage } from './pages/LoginPage'
import { ChatPage } from './pages/ChatPage'
import { UsersPage } from './pages/UsersPage'
import { SettingsPage } from './pages/SettingsPage'
import { useAppSelector, useAppDispatch } from './hooks/useStore'
import { setLoading } from './store/slices/authSlice'
import { useTokenRefresh } from './hooks/useTokenRefresh'

const { Content } = Layout

const API_URL = import.meta.env.VITE_API_URL as string || 'http://localhost:3402'

// Компонент защищённого маршрута
const PrivateRoute = ({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode
  adminOnly?: boolean
}) => {
  const { isAuthenticated, user, isLoading } = useAppSelector((s) => s.auth)

  if (isLoading) return null

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/chat" replace />
  }

  return <>{children}</>
}

// Внутренний компонент с роутером (для хуков навигации)
const AppInner = () => {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const [isServerOnline, setIsServerOnline] = useState(false)

  // Автообновление токенов
  useTokenRefresh()

  // Проверка онлайн-статуса сервера
  const checkServerHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) })
      setIsServerOnline(res.ok)
    } catch {
      setIsServerOnline(false)
    }
  }, [])

  useEffect(() => {
    // Завершаем инициализацию авторизации
    dispatch(setLoading(false))

    // Первоначальная проверка и периодический пинг сервера
    checkServerHealth()
    const interval = setInterval(checkServerHealth, 15_000)
    return () => clearInterval(interval)
  }, [dispatch, checkServerHealth])

  return (
    <Routes>
      {/* Публичный маршрут */}
      <Route path="/login" element={<LoginPage />} />

      {/* Защищённые маршруты */}
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout style={{ minHeight: '100vh' }}>
              <AppHeader isServerOnline={isServerOnline} />
              <Content style={{ marginTop: 0 }}>
                <Routes>
                  <Route path="/chat" element={<ChatPage />} />
                  <Route
                    path="/users"
                    element={
                      <PrivateRoute adminOnly>
                        <div style={{ marginTop: 56, height: 'calc(100vh - 56px)', overflow: 'auto' }}>
                          <UsersPage />
                        </div>
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <div style={{ marginTop: 56, height: 'calc(100vh - 56px)', overflow: 'auto' }}>
                        <SettingsPage />
                      </div>
                    }
                  />
                  <Route path="/" element={<Navigate to="/chat" replace />} />
                  <Route path="*" element={<Navigate to="/chat" replace />} />
                </Routes>
              </Content>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  )
}

export const App = () => {
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </ConfigProvider>
  )
}
