import { Button, Card, ConfigProvider, Form, Input, Typography, theme } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useLoginMutation } from '../api/api.js';
import { useAuth } from '../auth/AuthContext.js';

export const LoginPage = () => {
  const [login, { isLoading }] = useLoginMutation();
  const nav = useNavigate();
  const { setUser, bumpAccess } = useAuth();

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          background: '#dfe3e8',
          color: 'rgba(0,0,0,0.88)',
        }}
      >
        <Card
          style={{
            width: 400,
            maxWidth: '100%',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            border: '1px solid #c4cad3',
          }}
        >
          <Typography.Title level={3} style={{ marginTop: 0 }}>
            Вход
          </Typography.Title>
          <Form
            layout="vertical"
            onFinish={async (v: { email: string; password: string }) => {
              const data = await login(v).unwrap();
              sessionStorage.setItem('accessToken', data.accessToken);
              sessionStorage.setItem('refreshToken', data.refreshToken);
              setUser(data.user);
              bumpAccess();
              nav('/chat');
            }}
          >
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={isLoading} block>
              Войти
            </Button>
          </Form>
        </Card>
      </div>
    </ConfigProvider>
  );
};
