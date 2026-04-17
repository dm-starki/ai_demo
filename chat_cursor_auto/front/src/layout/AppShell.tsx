import { Layout, Menu, Typography, Space } from 'antd';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  CommentOutlined,
  SettingOutlined,
  TeamOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useMeQuery, useHealthQuery } from '../store/api';
import { clearTokens } from '../auth/tokens';
import { disconnectChatSocket } from '../ws/chatSocket';

const { Header, Content } = Layout;

export const AppShell = () => {
  const loc = useLocation();
  const nav = useNavigate();
  const { data: me } = useMeQuery();
  const { data: health, isError } = useHealthQuery(undefined, {
    pollingInterval: 5000,
    refetchOnReconnect: true,
  });
  const online = !isError && health?.ok;

  const items = [
    { key: '/chat', icon: <CommentOutlined />, label: <Link to="/chat">Чат</Link> },
    ...(me?.role === 'admin'
      ? [{ key: '/users', icon: <TeamOutlined />, label: <Link to="/users">Пользователи</Link> }]
      : []),
    { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">Настройки</Link> },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выход',
      onClick: () => {
        clearTokens();
        disconnectChatSocket();
        nav('/login', { replace: true });
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'fixed',
          zIndex: 1000,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingInline: 16,
        }}
      >
        <Space size="middle">
          <Typography.Text style={{ color: '#fff' }}>{me?.email ?? '…'}</Typography.Text>
          <span title={online ? 'Сервер в сети' : 'Нет связи с сервером'}>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: online ? '#52c41a' : '#ff4d4f',
                boxShadow: online ? '0 0 0 2px rgba(82,196,26,0.35)' : undefined,
              }}
            />
          </span>
        </Space>
        <Menu
          theme="dark"
          mode="horizontal"
          selectable={false}
          style={{ flex: 1, justifyContent: 'flex-end', minWidth: 0 }}
          items={items}
          selectedKeys={[loc.pathname]}
        />
      </Header>
      <Content style={{ marginTop: 64, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        <Outlet />
      </Content>
    </Layout>
  );
};
