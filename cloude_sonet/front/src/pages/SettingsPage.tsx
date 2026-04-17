// Страница настроек
// Позволяет пользователю сменить пароль

import { useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Space,
  Alert,
  Divider,
  message,
} from 'antd'
import { LockOutlined, SettingOutlined } from '@ant-design/icons'
import { useChangePasswordMutation } from '../api/usersApi'
import { useAppSelector } from '../hooks/useStore'

const { Title, Text } = Typography

interface PasswordFormValues {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export const SettingsPage = () => {
  const [form] = Form.useForm<PasswordFormValues>()
  const [messageApi, contextHolder] = message.useMessage()
  const user = useAppSelector((s) => s.auth.user)
  const [changePassword, { isLoading }] = useChangePasswordMutation()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (values: PasswordFormValues) => {
    setError(null)
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap()
      messageApi.success('Пароль успешно изменён')
      form.resetFields()
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      setError(err?.data?.message || 'Ошибка смены пароля')
    }
  }

  return (
    <div
      style={{
        padding: 24,
        height: '100%',
        overflow: 'auto',
        maxWidth: 600,
        margin: '0 auto',
      }}
    >
      {contextHolder}

      {/* Заголовок */}
      <Space align="center" style={{ marginBottom: 24 }}>
        <SettingOutlined style={{ fontSize: 20 }} />
        <Title level={4} style={{ margin: 0 }}>
          Настройки
        </Title>
      </Space>

      {/* Информация об аккаунте */}
      <Card style={{ marginBottom: 24 }}>
        <Title level={5}>Учётная запись</Title>
        <Space direction="vertical">
          <div>
            <Text type="secondary">Email: </Text>
            <Text strong>{user?.email}</Text>
          </div>
          <div>
            <Text type="secondary">Роль: </Text>
            <Text strong>
              {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </Text>
          </div>
        </Space>
      </Card>

      {/* Смена пароля */}
      <Card>
        <Title level={5}>
          <LockOutlined style={{ marginRight: 8 }} />
          Смена пароля
        </Title>
        <Divider />

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark="optional"
        >
          <Form.Item
            name="currentPassword"
            label="Текущий пароль"
            rules={[{ required: true, message: 'Введите текущий пароль' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Введите текущий пароль"
            />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Новый пароль"
            rules={[
              { required: true, message: 'Введите новый пароль' },
              { min: 4, message: 'Минимум 4 символа' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Не менее 4 символов"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Подтвердите новый пароль"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Подтвердите новый пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('Пароли не совпадают'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Повторите новый пароль"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              icon={<LockOutlined />}
            >
              Сменить пароль
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
