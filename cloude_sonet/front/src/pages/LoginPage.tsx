// Страница входа в систему

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd'
import { UserOutlined, LockOutlined, MessageOutlined } from '@ant-design/icons'
import { useLoginMutation } from '../api/authApi'
import { useAppDispatch, useAppSelector } from '../hooks/useStore'
import { loginSuccess } from '../store/slices/authSlice'
import type { LoginResponse } from '../types'

const { Title, Text } = Typography

export const LoginPage = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const [login, { isLoading, error }] = useLoginMutation()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat', { replace: true })
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (values: { email: string; password: string }) => {
    try {
      const result = await login(values).unwrap()
      dispatch(loginSuccess(result as LoginResponse))
      navigate('/chat', { replace: true })
    } catch {
      /* ошибка отображается через error */
    }
  }

  const getErrorMessage = () => {
    if (!error) return null
    if ('data' in error) {
      const data = error.data as { message?: string }
      return data?.message || 'Ошибка входа'
    }
    return 'Ошибка соединения с сервером'
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #001529 0%, #003a6e 100%)',
      }}
    >
      <Card
        style={{
          width: 380,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          borderRadius: 16,
        }}
      >
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          {/* Логотип и заголовок */}
          <div style={{ textAlign: 'center' }}>
            <MessageOutlined style={{ fontSize: 48, color: '#1677ff', marginBottom: 12 }} />
            <Title level={3} style={{ margin: 0 }}>
              AI Chat
            </Title>
            <Text type="secondary">Войдите в свою учётную запись</Text>
          </div>

          {/* Ошибка */}
          {error && (
            <Alert
              message={getErrorMessage()}
              type="error"
              showIcon
              closable
            />
          )}

          {/* Форма */}
          <Form
            onFinish={handleSubmit}
            layout="vertical"
            requiredMark={false}
            autoComplete="off"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Введите email' },
                { type: 'email', message: 'Некорректный email' },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="a@a.ru"
                size="large"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Пароль"
              rules={[{ required: true, message: 'Введите пароль' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Введите пароль"
                size="large"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                block
                size="large"
              >
                Войти
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}
