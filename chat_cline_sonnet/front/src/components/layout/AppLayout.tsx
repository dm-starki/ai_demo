// ============================================================
// Основной лейаут приложения
// ============================================================

import React from 'react';
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import AppHeader from './Header';
import { useSocket } from '../../hooks/useSocket';

const { Content } = Layout;

const AppLayout: React.FC = () => {
  // Инициализируем socket.io соединение на уровне лейаута
  useSocket();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Content
        style={{
          marginTop: 56, // высота шапки
          height: 'calc(100vh - 56px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  );
};

export default AppLayout;
