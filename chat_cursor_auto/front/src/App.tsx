import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';
import { UsersAdminPage } from './pages/UsersAdminPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { getRefreshToken } from './auth/tokens';
import { useRefreshMutation } from './store/api';
import { reconnectChatSocket } from './ws/chatSocket';

const TokenMaintenance = () => {
  const [refresh] = useRefreshMutation();
  useEffect(() => {
    const id = window.setInterval(
      () => {
        const rt = getRefreshToken();
        if (!rt) return;
        void refresh({ refreshToken: rt })
          .unwrap()
          .then((d) => {
            sessionStorage.setItem('accessToken', d.accessToken);
            sessionStorage.setItem('refreshToken', d.refreshToken);
            reconnectChatSocket();
          })
          .catch(() => {});
      },
      60 * 60 * 1000,
    );
    return () => window.clearInterval(id);
  }, [refresh]);
  return null;
};

export const App = () => (
  <>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <>
              <AppShell />
              <TokenMaintenance />
            </>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/chat" replace />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="users" element={<UsersAdminPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/chat" replace />} />
    </Routes>
  </>
);
