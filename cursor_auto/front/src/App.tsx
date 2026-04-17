import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from './layout/MainLayout.js';
import { ChatPage } from './pages/ChatPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { UsersPage } from './pages/UsersPage.js';

const Guard = ({ children }: { children: ReactElement }) => {
  const t = sessionStorage.getItem('accessToken');
  if (!t) return <Navigate to="/login" replace />;
  return children;
};

export const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route
      path="/"
      element={
        <Guard>
          <MainLayout />
        </Guard>
      }
    >
      <Route index element={<Navigate to="/chat" replace />} />
      <Route path="chat" element={<ChatPage />} />
      <Route path="users" element={<UsersPage />} />
      <Route path="settings" element={<SettingsPage />} />
    </Route>
    <Route path="*" element={<Navigate to="/chat" replace />} />
  </Routes>
);
