import { Button, Form, Input, Modal, Popconfirm, Select, Space, Table, Typography } from 'antd';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '../api/api.js';
import {
  useAdminCreateUserMutation,
  useAdminDeleteUserMutation,
  useAdminUpdateUserMutation,
  useAdminUsersQuery,
} from '../api/api.js';
import { useAuth } from '../auth/AuthContext.js';

export const UsersPage = () => {
  const { user } = useAuth();
  const { data, isLoading } = useAdminUsersQuery(undefined, { skip: user?.role !== 'admin' });
  const [createUser] = useAdminCreateUserMutation();
  const [updateUser] = useAdminUpdateUserMutation();
  const [deleteUser] = useAdminDeleteUserMutation();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<{ id: string; email: string; role: UserRole } | null>(null);

  if (user?.role !== 'admin') return <Navigate to="/chat" replace />;

  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
      <Space style={{ marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Пользователи
        </Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>
          Добавить
        </Button>
      </Space>
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data}
        pagination={false}
        columns={[
          { title: 'Email', dataIndex: 'email' },
          { title: 'Роль', dataIndex: 'role' },
          {
            title: '',
            render: (_, r) => (
              <Space>
                <Button size="small" onClick={() => setEdit({ id: r.id, email: r.email, role: r.role })}>
                  Изменить
                </Button>
                <Popconfirm title="Удалить пользователя?" onConfirm={() => void deleteUser(r.id)}>
                  <Button size="small" danger disabled={r.id === user.id}>
                    Удалить
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title="Новый пользователь"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
      >
        <Form
          layout="vertical"
          onFinish={async (v: { email: string; password: string; role: UserRole }) => {
            await createUser(v).unwrap();
            setOpen(false);
          }}
        >
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Пароль" rules={[{ required: true, min: 4 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Роль" initialValue="user" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'user', label: 'Пользователь' },
                { value: 'admin', label: 'Администратор' },
              ]}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Создать
          </Button>
        </Form>
      </Modal>
      <Modal
        title="Изменить пользователя"
        open={Boolean(edit)}
        onCancel={() => setEdit(null)}
        footer={null}
      >
        {edit && (
          <Form
            layout="vertical"
            initialValues={{ email: edit.email, role: edit.role }}
            onFinish={async (v: { email?: string; password?: string; role?: UserRole }) => {
              await updateUser({ id: edit.id, ...v }).unwrap();
              setEdit(null);
            }}
          >
            <Form.Item name="email" label="Email" rules={[{ type: 'email' }]}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label="Новый пароль (необязательно)" rules={[{ min: 4 }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item name="role" label="Роль">
              <Select
                allowClear
                options={[
                  { value: 'user', label: 'Пользователь' },
                  { value: 'admin', label: 'Администратор' },
                ]}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              Сохранить
            </Button>
          </Form>
        )}
      </Modal>
    </div>
  );
};
