import { Button, Card, Form, Input, Typography, message } from 'antd';
import { useChangePasswordMutation } from '../store/api';

export const SettingsPage = () => {
  const [form] = Form.useForm();
  const [change, { isLoading }] = useChangePasswordMutation();

  const onFinish = async (v: { currentPassword: string; newPassword: string }) => {
    try {
      await change(v).unwrap();
      message.success('Пароль обновлён');
      form.resetFields();
    } catch {
      message.error('Не удалось сменить пароль');
    }
  };

  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
      <Card style={{ maxWidth: 520 }}>
        <Typography.Title level={4}>Настройки</Typography.Title>
        <Typography.Paragraph type="secondary">
          Смена пароля учётной записи.
        </Typography.Paragraph>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="currentPassword"
            label="Текущий пароль"
            rules={[{ required: true }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="newPassword" label="Новый пароль" rules={[{ required: true, min: 4 }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading}>
            Сохранить
          </Button>
        </Form>
      </Card>
    </div>
  );
};
