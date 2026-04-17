import { Layout, Menu, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useLazyMeQuery } from '../api/api.js';
import { useAuth } from '../auth/AuthContext.js';

const { Header, Content } = Layout;

const HEADER_H = 56;

export const MainLayout = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, setUser, logout } = useAuth();
  const [fetchMe] = useLazyMeQuery();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const u = await fetchMe().unwrap();
        setUser(u);
      } catch {
        logout();
        nav('/login');
      }
    };
    void load();
  }, [fetchMe, logout, nav, setUser]);

  useEffect(() => {
    const api = import.meta.env.VITE_API_URL as string;
    const tick = async () => {
      try {
        const r = await fetch(`${api}/api/health`);
        setOnline(r.ok);
      } catch {
        setOnline(false);
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const selected = loc.pathname.startsWith('/users')
    ? ['users']
    : loc.pathname.startsWith('/settings')
      ? ['settings']
      : ['chat'];

  return (
    <Layout
      style={{
        minHeight: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingInline: 16,
          height: HEADER_H,
          lineHeight: `${HEADER_H}px`,
          background: '#141414',
          borderBottom: '1px solid #303030',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            title={online ? 'Сервер в сети' : 'Нет связи с сервером'}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: online ? '#52c41a' : '#ff4d4f',
              boxShadow: online ? '0 0 6px #52c41a' : 'none',
            }}
          />
          <Typography.Text strong style={{ color: 'rgba(255,255,255,0.88)' }}>
            {user?.email ?? '…'}
          </Typography.Text>
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={selected}
          style={{ flex: 1, justifyContent: 'flex-end', minWidth: 0, border: 'none' }}
          items={[
            { key: 'chat', label: <Link to="/chat">Чат</Link> },
            ...(user?.role === 'admin'
              ? [{ key: 'users', label: <Link to="/users">Пользователи</Link> }]
              : []),
            { key: 'settings', label: <Link to="/settings">Настройки</Link> },
            {
              key: 'logout',
              label: 'Выход',
              onClick: () => {
                logout();
                nav('/login');
              },
            },
          ]}
        />
      </Header>
      <Content
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: HEADER_H,
          marginLeft: 0,
          marginRight: 0,
          marginBottom: 0,
          padding: 0,
          /* Фиксированная шапка вне потока — высоту зоны контента задаём от вьюпорта, не от % родителя */
          height: `calc(100vh - ${HEADER_H}px)`,
          maxHeight: `calc(100vh - ${HEADER_H}px)`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: '1 1 0',
            minHeight: 0,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
          }}
        >
          <Outlet />
        </div>
      </Content>
    </Layout>
  );
};
