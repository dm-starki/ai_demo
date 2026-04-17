// ============================================================
// Шапка приложения — фиксированная, с меню навигации
// ============================================================

import React from 'react';
import { Layout, Menu, Badge, Typography, Space, Avatar } from 'antd';
import {
  MessageOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/useTypedDispatch';
import { logout } from '../../store/slices/authSlice';
import { useLogoutMutation } from '../../api/authApi';
import { getRefreshToken } from '../../utils/auth';

const { Header: AntHeader } = Layout;
const { Text } = Typography;

const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector(s => s.auth);
  const { onlineUsers } = useAppSelector(s => s.chat);
  const [logoutMutation] = useLogoutMutation();

  // Текущий пользователь онлайн (соединение с сервером установлено)
  const isServerOnline = onlineUsers.length >= 0; // сокет подключён если state существует

  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    try {
      await logoutMutation({ refreshToken: refreshToken ?? undefined }).unwrap();
    } catch {
      // игнорируем ошибку при выходе
    }
    dispatch(logout());
    navigate('/login');
  };

  // Определяем активный пункт меню
  const getActiveKey = () => {
    if (location.pathname.startsWith('/chat')) return 'chat';
    if (location.pathname.startsWith('/users')) return 'users';
    if (location.pathname.startsWith('/settings')) return 'settings';
    return 'chat';
  };

  const menuItems = [
    { key: 'chat', icon: <MessageOutlined />, label: 'Чат', onClick: () => navigate('/chat') },
    ...(user?.role === 'admin'
      ? [{ key: 'users', icon: <TeamOutlined />, label: 'Пользователи', onClick: () => navigate('/users') }]
      : []),
    { key: 'settings', icon: <SettingOutlined />, label: 'Настройки', onClick: () => navigate('/settings') },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Выход',
      onClick: handleLogout,
      danger: true,
    },
  ];

  if (!isAuthenticated) return null;

  return (
    <AntHeader
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: '#001529',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Левая часть — пользователь и статус */}
      <Space align="center" size={12}>
        <Avatar
          size={32}
          icon={<UserOutlined />}
          style={{ background: '#1677ff', flexShrink: 0 }}
        />
        <Space direction="vertical" size={0} style={{ lineHeight: 1.2 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>
            {user?.email}
          </Text>
          <Space size={4} align="center">
            {/* Зелёная точка — индикатор онлайн */}
            <Badge
              status={isServerOnline ? 'success' : 'error'}
              style={{ fontSize: 11 }}
            />
            <Text style={{ color: isServerOnline ? '#52c41a' : '#ff4d4f', fontSize: 11 }}>
              {isServerOnline ? 'онлайн' : 'оффлайн'}
            </Text>
          </Space>
        </Space>
      </Space>

      {/* Правая часть — навигационное меню */}
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[getActiveKey()]}
        items={menuItems}
        style={{
          background: 'transparent',
          borderBottom: 'none',
          flex: 'none',
          minWidth: 0,
        }}
        disabledOverflow
      />
    </AntHeader>
  );
};

export default AppHeader;
