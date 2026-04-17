import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLoginMutation } from '../store/api';
import { setTokens } from '../auth/tokens';
import { reconnectChatSocket } from '../ws/chatSocket';

export const LoginPage = () => {
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [login, { isLoading }] = useLoginMutation();

  const onFinish = async (v: { email: string; password: string }) => {
    try {
      const res = await login(v).unwrap();
      setTokens(res.accessToken, res.refreshToken);
      reconnectChatSocket();
      nav(loc.state?.from && loc.state.from !== '/login' ? loc.state.from : '/chat', {
        replace: true,
      });
    } catch {
      message.error('Неверный логин или пароль');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg,#0b3d6d,#0f5132)',
        padding: 16,
      }}
    >
      <Card style={{ width: 420, maxWidth: '100%' }}>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>
          Вход в чат
        </Typography.Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="Пароль" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={isLoading}>
            Войти
          </Button>
        </Form>
      </Card>
    </div>
  );
};
