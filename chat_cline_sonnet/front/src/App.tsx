// ============================================================
// Корневой компонент приложения
// Настройка роутера и защищённых маршрутов
// ============================================================

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { useAppDispatch, useAppSelector } from './hooks/useTypedDispatch';
import { setCredentials, logout } from './store/slices/authSlice';
import { useRefreshMutation } from './api/authApi';
import { getRefreshToken } from './utils/auth';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import UsersPage from './pages/UsersPage';
import SettingsPage from './pages/SettingsPage';

/** Компонент защищённого маршрута */
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, user } = useAppSelector(s => s.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/chat" replace />;
  }

  return <>{children}</>;
};

/** Главный компонент */
const App: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, accessToken } = useAppSelector(s => s.auth);
  const [refresh] = useRefreshMutation();

  // При загрузке: если есть refresh токен — обновляем токены
  useEffect(() => {
    const initAuth = async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken || isAuthenticated) return;

      try {
        const result = await refresh({ refreshToken }).unwrap();
        dispatch(setCredentials({ user: result.user, tokens: result.tokens }));
      } catch {
        dispatch(logout());
      }
    };

    initAuth();
  }, []);

  // Автообновление токена каждые 55 минут (до истечения 1 часа)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return;

      try {
        const result = await refresh({ refreshToken }).unwrap();
        dispatch(setCredentials({ user: result.user, tokens: result.tokens }));
      } catch {
        dispatch(logout());
      }
    }, 55 * 60 * 1000); // 55 минут

    return () => clearInterval(interval);
  }, [isAuthenticated, refresh, dispatch]);

  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <Routes>
            {/* Публичные маршруты */}
            <Route path="/login" element={<LoginPage />} />

            {/* Защищённые маршруты */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/chat" replace />} />

              <Route path="chat" element={<ChatPage />} />

              <Route
                path="users"
                element={
                  <ProtectedRoute adminOnly>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />

              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Фолбэк */}
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
