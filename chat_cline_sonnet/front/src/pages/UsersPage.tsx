// ============================================================
// Страница управления пользователями (только для администратора)
// ============================================================

import React, { useState } from 'react';
import {
  Table, Button, Space, Typography, Tag, Modal, Form,
  Input, Select, Popconfirm, message, Card,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, KeyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from '../api/usersApi';
import type { User, UserRole } from '../types/index';
import { useAppSelector } from '../hooks/useTypedDispatch';

const { Title } = Typography;
const { Option } = Select;

type EditMode = 'create' | 'edit';

interface UserFormValues {
  email: string;
  password?: string;
  role?: UserRole;
}

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAppSelector(s => s.auth);
  const { data, isLoading, refetch } = useGetUsersQuery();
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm<UserFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const users = data?.users ?? [];

  /** Открыть модалку создания */
  const handleCreate = () => {
    setEditMode('create');
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  /** Открыть модалку редактирования */
  const handleEdit = (user: User) => {
    setEditMode('edit');
    setEditingUser(user);
    form.setFieldsValue({ email: user.email, role: user.role });
    setModalOpen(true);
  };

  /** Удалить пользователя */
  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id).unwrap();
      messageApi.success('Пользователь удалён');
    } catch (err: unknown) {
      const error = err as { data?: { error?: string } };
      messageApi.error(error?.data?.error ?? 'Ошибка удаления');
    }
  };

  /** Сохранить пользователя */
  const handleSave = async (values: UserFormValues) => {
    try {
      if (editMode === 'create') {
        await createUser({
          email: values.email,
          password: values.password!,
          role: values.role ?? 'user',
        }).unwrap();
        messageApi.success('Пользователь создан');
      } else if (editingUser) {
        await updateUser({
          id: editingUser.id,
          ...(values.email !== editingUser.email ? { email: values.email } : {}),
          ...(values.password ? { password: values.password } : {}),
        }).unwrap();
        messageApi.success('Пользователь обновлён');
      }
      setModalOpen(false);
      form.resetFields();
    } catch (err: unknown) {
      const error = err as { data?: { error?: string } };
      messageApi.error(error?.data?.error ?? 'Ошибка сохранения');
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: UserRole) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? 'Администратор' : 'Пользователь'}
        </Tag>
      ),
      filters: [
        { text: 'Администратор', value: 'admin' },
        { text: 'Пользователь', value: 'user' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить пользователя?"
            description={`Вы уверены, что хотите удалить ${record.email}?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Удалить"
            cancelText="Отмена"
            okButtonProps={{ danger: true }}
            disabled={record.id === currentUser?.id}
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              disabled={record.id === currentUser?.id}
              title={record.id === currentUser?.id ? 'Нельзя удалить себя' : 'Удалить'}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
      {contextHolder}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Управление пользователями</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Добавить пользователя
        </Button>
      </div>

      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 8 }}>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="middle"
          locale={{ emptyText: 'Нет пользователей' }}
        />
      </Card>

      {/* Модалка создания/редактирования */}
      <Modal
        title={editMode === 'create' ? 'Добавить пользователя' : 'Редактировать пользователя'}
        open={modalOpen}
        onOk={form.submit}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        okText={editMode === 'create' ? 'Создать' : 'Сохранить'}
        cancelText="Отмена"
        confirmLoading={isCreating || isUpdating}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input placeholder="user@example.ru" />
          </Form.Item>

          <Form.Item
            name="password"
            label={editMode === 'create' ? 'Пароль' : 'Новый пароль (оставьте пустым, чтобы не менять)'}
            rules={editMode === 'create' ? [
              { required: true, message: 'Введите пароль' },
              { min: 4, message: 'Минимум 4 символа' },
            ] : [
              { min: 4, message: 'Минимум 4 символа', warningOnly: false },
            ]}
          >
            <Input.Password placeholder="••••••••" />
          </Form.Item>

          {editMode === 'create' && (
            <Form.Item name="role" label="Роль" initialValue="user">
              <Select>
                <Option value="user">Пользователь</Option>
                <Option value="admin">Администратор</Option>
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default UsersPage;
