// Страница управления пользователями (только для администратора)
// Табличный интерфейс: просмотр, добавление, редактирование, удаление

import { useState } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Popconfirm,
  Alert,
  message,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from '../api/usersApi'
import { useAppSelector } from '../hooks/useStore'
import type { User } from '../types'
import type { ColumnsType } from 'antd/es/table'

const { Title } = Typography

type ModalMode = 'create' | 'edit'

interface UserFormValues {
  email: string
  password?: string
  role: 'user' | 'admin'
}

export const UsersPage = () => {
  const [form] = Form.useForm<UserFormValues>()
  const currentUser = useAppSelector((s) => s.auth.user)
  const [messageApi, contextHolder] = message.useMessage()

  const { data: users = [], isLoading } = useGetUsersQuery()
  const [createUser, { isLoading: isCreating }] = useCreateUserMutation()
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation()
  const [deleteUser] = useDeleteUserMutation()

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('create')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openCreateModal = () => {
    setModalMode('create')
    setEditingUser(null)
    setError(null)
    form.resetFields()
    form.setFieldsValue({ role: 'user' })
    setModalOpen(true)
  }

  const openEditModal = (user: User) => {
    setModalMode('edit')
    setEditingUser(user)
    setError(null)
    form.resetFields()
    form.setFieldsValue({ email: user.email, role: user.role })
    setModalOpen(true)
  }

  const handleSubmit = async (values: UserFormValues) => {
    setError(null)
    try {
      if (modalMode === 'create') {
        await createUser({
          email: values.email,
          password: values.password!,
          role: values.role,
        }).unwrap()
        messageApi.success('Пользователь создан')
      } else if (editingUser) {
        await updateUser({
          id: editingUser.id,
          email: values.email !== editingUser.email ? values.email : undefined,
          password: values.password || undefined,
          role: values.role !== editingUser.role ? values.role : undefined,
        }).unwrap()
        messageApi.success('Пользователь обновлён')
      }
      setModalOpen(false)
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      setError(err?.data?.message || 'Произошла ошибка')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id).unwrap()
      messageApi.success('Пользователь удалён')
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } }
      messageApi.error(err?.data?.message || 'Ошибка удаления')
    }
  }

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
      filters: [
        { text: 'Администратор', value: 'admin' },
        { text: 'Пользователь', value: 'user' },
      ],
      onFilter: (value, record) => record.role === value,
      render: (role: string) => (
        <Tag color={role === 'admin' ? 'red' : 'blue'}>
          {role === 'admin' ? 'Администратор' : 'Пользователь'}
        </Tag>
      ),
    },
    {
      title: 'Дата регистрации',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      render: (date: string) =>
        new Date(date).toLocaleString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }),
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
            onClick={() => openEditModal(record)}
          >
            Изменить
          </Button>
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
            >
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      {contextHolder}

      {/* Заголовок */}
      <Space align="center" style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <TeamOutlined style={{ fontSize: 20 }} />
          <Title level={4} style={{ margin: 0 }}>
            Управление пользователями
          </Title>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal}>
          Добавить пользователя
        </Button>
      </Space>

      {/* Таблица */}
      <Table
        columns={columns}
        dataSource={users}
        loading={isLoading}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        size="middle"
        rowClassName={(record) => (record.id === currentUser?.id ? 'current-user-row' : '')}
      />

      {/* Модальное окно создания/редактирования */}
      <Modal
        title={modalMode === 'create' ? 'Добавить пользователя' : 'Изменить пользователя'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        {error && (
          <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          requiredMark="optional"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Введите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input placeholder="user@example.com" />
          </Form.Item>

          <Form.Item
            name="password"
            label={modalMode === 'edit' ? 'Новый пароль (оставьте пустым чтобы не менять)' : 'Пароль'}
            rules={
              modalMode === 'create'
                ? [
                    { required: true, message: 'Введите пароль' },
                    { min: 4, message: 'Минимум 4 символа' },
                  ]
                : [{ min: 4, message: 'Минимум 4 символа' }]
            }
          >
            <Input.Password placeholder={modalMode === 'edit' ? 'Не менять' : 'Введите пароль'} />
          </Form.Item>

          <Form.Item name="role" label="Роль" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'user', label: 'Пользователь' },
                { value: 'admin', label: 'Администратор' },
              ]}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Отмена</Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isCreating || isUpdating}
              >
                {modalMode === 'create' ? 'Создать' : 'Сохранить'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
