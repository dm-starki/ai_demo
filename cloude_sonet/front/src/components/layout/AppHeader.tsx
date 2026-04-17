// Фиксированная шапка приложения
// Слева: email пользователя + индикатор онлайн-статуса сервера
// Справа: навигационное меню

import { Badge, Tooltip } from 'antd'
import {
  MessageOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { logout } from '../../store/slices/authSlice'
import { useLogoutMutation } from '../../api/authApi'

const HEADER_HEIGHT = 56

interface AppHeaderProps {
  isServerOnline: boolean
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  isDanger?: boolean
  onClick: () => void
}

// Пункт навигации в шапке
const NavItem = ({ icon, label, isActive, isDanger, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '0 14px',
      height: HEADER_HEIGHT,
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      color: isDanger ? '#ff4d4f' : isActive ? '#1677ff' : 'rgba(255,255,255,0.75)',
      fontSize: 14,
      fontFamily: 'inherit',
      whiteSpace: 'nowrap',
      borderBottom: isActive ? '2px solid #1677ff' : '2px solid transparent',
      boxSizing: 'border-box',
      transition: 'color 0.2s, border-color 0.2s',
    }}
    onMouseEnter={(e) => {
      if (!isActive && !isDanger) {
        e.currentTarget.style.color = '#ffffff'
      }
    }}
    onMouseLeave={(e) => {
      if (!isActive && !isDanger) {
        e.currentTarget.style.color = 'rgba(255,255,255,0.75)'
      }
    }}
  >
    {icon}
    {label}
  </button>
)

export const AppHeader = ({ isServerOnline }: AppHeaderProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const refreshToken = useAppSelector((s) => s.auth.refreshToken)
  const [logoutApi] = useLogoutMutation()

  const handleLogout = async () => {
    if (refreshToken) {
      await logoutApi({ refreshToken }).catch(() => {})
    }
    dispatch(logout())
    navigate('/login')
  }

  const activeSection = '/' + location.pathname.split('/')[1]

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px 0 16px',
        background: '#001529',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: HEADER_HEIGHT,
        overflow: 'hidden',
      }}
    >
      {/* Левая часть: индикатор сервера + email */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Tooltip title={isServerOnline ? 'Сервер онлайн' : 'Сервер недоступен'}>
          <Badge
            status={isServerOnline ? 'success' : 'error'}
            style={{ flexShrink: 0 }}
          />
        </Tooltip>
        <span
          style={{
            color: '#ffffff',
            fontWeight: 500,
            fontSize: 14,
            lineHeight: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 220,
          }}
        >
          {user?.email}
        </span>
      </div>

      {/* Правая часть: пункты меню */}
      <nav style={{ display: 'flex', alignItems: 'stretch', height: HEADER_HEIGHT, flexShrink: 0 }}>
        <NavItem
          icon={<MessageOutlined />}
          label="Чат"
          isActive={activeSection === '/chat'}
          onClick={() => navigate('/chat')}
        />

        {user?.role === 'admin' && (
          <NavItem
            icon={<TeamOutlined />}
            label="Пользователи"
            isActive={activeSection === '/users'}
            onClick={() => navigate('/users')}
          />
        )}

        <NavItem
          icon={<SettingOutlined />}
          label="Настройки"
          isActive={activeSection === '/settings'}
          onClick={() => navigate('/settings')}
        />

        <NavItem
          icon={<LogoutOutlined />}
          label="Выход"
          isDanger
          onClick={handleLogout}
        />
      </nav>
    </header>
  )
}
