import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import {
  useAdminUsersQuery,
  useAdminCreateUserMutation,
  useAdminUpdateUserMutation,
  useAdminDeleteUserMutation,
  useMeQuery,
} from '../store/api';

type Row = { id: string; email: string; role: string; created_at: string };

export const UsersAdminPage = () => {
  const { data: me } = useMeQuery();
  const { data, refetch, isFetching } = useAdminUsersQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [create] = useAdminCreateUserMutation();
  const [update] = useAdminUpdateUserMutation();
  const [remove] = useAdminDeleteUserMutation();

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const rows = useMemo(() => data ?? [], [data]);

  if (me && me.role !== 'admin') {
    return <Navigate to="/chat" replace />;
  }

  const onCreate = async () => {
    const v = await createForm.validateFields();
    try {
      await create(v).unwrap();
      message.success('Пользователь создан');
      setCreateOpen(false);
      createForm.resetFields();
      void refetch();
    } catch {
      message.error('Не удалось создать (возможно, email занят)');
    }
  };

  const onUpdate = async () => {
    if (!editRow) return;
    const v = await editForm.validateFields();
    const payload: {
      id: string;
      email: string;
      role: 'user' | 'admin';
      password?: string;
    } = {
      id: editRow.id,
      email: v.email,
      role: v.role,
    };
    const pwd = v.password as string | undefined;
    if (pwd && String(pwd).trim().length > 0) {
      payload.password = pwd;
    }
    try {
      await update(payload).unwrap();
      message.success('Сохранено');
      setEditRow(null);
      void refetch();
    } catch {
      message.error('Не удалось сохранить');
    }
  };

  const onDelete = (row: Row) => {
    Modal.confirm({
      title: `Удалить пользователя ${row.email}?`,
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await remove({ id: row.id }).unwrap();
          message.success('Удалено');
          void refetch();
        } catch {
          message.error('Не удалось удалить');
        }
      },
    });
  };

  return (
    <div style={{ padding: 16, height: '100%', overflow: 'auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Пользователи
          </Typography.Title>
          <Button type="primary" onClick={() => setCreateOpen(true)}>
            Добавить
          </Button>
        </Space>
        <Table<Row>
          rowKey="id"
          loading={isFetching}
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Email', dataIndex: 'email' },
            { title: 'Роль', dataIndex: 'role', width: 140 },
            {
              title: 'Действия',
              key: 'actions',
              width: 220,
              render: (_, r) => (
                <Space>
                  <Button size="small" onClick={() => {
                    setEditRow(r);
                    editForm.setFieldsValue({
                      email: r.email,
                      role: r.role as 'user' | 'admin',
                      password: '',
                    });
                  }}>
                    Изменить
                  </Button>
                  <Button size="small" danger onClick={() => onDelete(r)}>
                    Удалить
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Space>

      <Modal
        title="Новый пользователь"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={onCreate}
        okText="Создать"
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Пароль" rules={[{ required: true, min: 4 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'user', label: 'Пользователь' },
                { value: 'admin', label: 'Администратор' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Изменить пользователя"
        open={!!editRow}
        onCancel={() => setEditRow(null)}
        onOk={onUpdate}
        okText="Сохранить"
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'user', label: 'Пользователь' },
                { value: 'admin', label: 'Администратор' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="password"
            label="Новый пароль"
            extra="Оставьте пустым, если менять пароль не нужно"
            rules={[
              {
                validator: async (_, value: string | undefined) => {
                  if (!value || String(value).trim() === '') return;
                  if (String(value).length < 4) {
                    throw new Error('Не менее 4 символов');
                  }
                },
              },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
