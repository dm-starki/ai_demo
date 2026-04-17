// ============================================================
// Страница настроек
// ============================================================

import React from 'react';
import {
  Card, Form, Input, Button, Typography, Divider, message, Avatar, Space,
} from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAppSelector } from '../hooks/useTypedDispatch';
import { useChangePasswordMutation } from '../api/usersApi';

const { Title, Text } = Typography;

interface PasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const SettingsPage: React.FC = () => {
  const { user } = useAppSelector(s => s.auth);
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [form] = Form.useForm<PasswordFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const handleChangePassword = async (values: PasswordFormValues) => {
    if (values.newPassword !== values.confirmPassword) {
      messageApi.error('Новый пароль и подтверждение не совпадают');
      return;
    }

    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap();
      messageApi.success('Пароль успешно изменён');
      form.resetFields();
    } catch (err: unknown) {
      const error = err as { data?: { error?: string } };
      messageApi.error(error?.data?.error ?? 'Ошибка при изменении пароля');
    }
  };

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      {contextHolder}

      <Title level={4} style={{ marginBottom: 24 }}>Настройки</Title>

      {/* Информация о пользователе */}
      <Card
        title="Профиль"
        style={{ maxWidth: 480, marginBottom: 24, borderRadius: 8 }}
      >
        <Space align="center" size={16}>
          <Avatar size={56} icon={<UserOutlined />} style={{ background: '#1677ff' }} />
          <div>
            <Text strong style={{ fontSize: 16 }}>{user?.email}</Text>
            <br />
            <Text type="secondary">
              Роль: {user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
            </Text>
          </div>
        </Space>
      </Card>

      {/* Смена пароля */}
      <Card
        title={<><LockOutlined /> Смена пароля</>}
        style={{ maxWidth: 480, borderRadius: 8 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleChangePassword}
        >
          <Form.Item
            name="currentPassword"
            label="Текущий пароль"
            rules={[{ required: true, message: 'Введите текущий пароль' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Текущий пароль"
              autoComplete="current-password"
            />
          </Form.Item>

          <Divider style={{ margin: '4px 0 16px' }} />

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
              placeholder="Новый пароль (минимум 4 символа)"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Подтверждение пароля"
            rules={[
              { required: true, message: 'Подтвердите новый пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Пароли не совпадают'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Повторите новый пароль"
              autoComplete="new-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              icon={<LockOutlined />}
            >
              Изменить пароль
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default SettingsPage;
