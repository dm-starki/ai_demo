// Список бесед (левая панель чата)
// Отображает личные чаты и группы
// Позволяет создавать новые чаты и группы

import { useState } from 'react'
import {
  List,
  Button,
  Modal,
  Select,
  Input,
  Space,
  Typography,
  Badge,
  Avatar,
  Tooltip,
  Divider,
  Spin,
} from 'antd'
import {
  PlusOutlined,
  UserOutlined,
  TeamOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '../../hooks/useStore'
import { setActiveConversation } from '../../store/slices/chatSlice'
import { useGetConversationsQuery, useCreateConversationMutation } from '../../api/conversationsApi'
import { useGetUsersQuery } from '../../api/usersApi'
import type { Conversation } from '../../types'

const { Text, Title } = Typography

interface ConversationListProps {
  onSelect: (id: string) => void
}

export const ConversationList = ({ onSelect }: ConversationListProps) => {
  const dispatch = useAppDispatch()
  const currentUser = useAppSelector((s) => s.auth.user)
  const activeConversationId = useAppSelector((s) => s.chat.activeConversationId)
  const onlineUserIds = useAppSelector((s) => s.chat.onlineUserIds)
  const conversations = useAppSelector((s) => s.chat.conversations)

  const { isLoading } = useGetConversationsQuery()
  const { data: users = [] } = useGetUsersQuery()
  const [createConversation] = useCreateConversationMutation()

  const [showDirectModal, setShowDirectModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [groupName, setGroupName] = useState('')
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([])

  const otherUsers = users.filter((u) => u.id !== currentUser?.id)

  const handleSelectConversation = (conv: Conversation) => {
    dispatch(setActiveConversation(conv.id))
    onSelect(conv.id)
  }

  const handleCreateDirect = async () => {
    if (!selectedUserId) return
    try {
      const result = await createConversation({
        type: 'direct',
        memberIds: [selectedUserId],
      }).unwrap()
      dispatch(setActiveConversation(result.id))
      onSelect(result.id)
      setShowDirectModal(false)
      setSelectedUserId('')
    } catch {
      /* ошибка обработана глобально */
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName || groupMemberIds.length === 0) return
    try {
      const result = await createConversation({
        type: 'group',
        name: groupName,
        memberIds: groupMemberIds,
      }).unwrap()
      dispatch(setActiveConversation(result.id))
      onSelect(result.id)
      setShowGroupModal(false)
      setGroupName('')
      setGroupMemberIds([])
    } catch {
      /* ошибка обработана глобально */
    }
  }

  // Формируем отображаемое название беседы
  const getConversationTitle = (conv: Conversation): string => {
    if (conv.type === 'group') return conv.name || 'Группа'
    const other = conv.members.find((m) => m.id !== currentUser?.id)
    return other?.email || 'Неизвестный'
  }

  const getConversationUserId = (conv: Conversation): string | null => {
    if (conv.type === 'group') return null
    const other = conv.members.find((m) => m.id !== currentUser?.id)
    return other?.id || null
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spin />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        borderRight: '1px solid #f0f0f0',
      }}
    >
      {/* Заголовок и кнопки */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
          Беседы
        </Title>
        <Space>
          <Tooltip title="Новый личный чат">
            <Button
              size="small"
              icon={<UserOutlined />}
              onClick={() => setShowDirectModal(true)}
            >
              Чат
            </Button>
          </Tooltip>
          <Tooltip title="Создать группу">
            <Button
              size="small"
              icon={<TeamOutlined />}
              onClick={() => setShowGroupModal(true)}
            >
              Группа
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Список бесед */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {conversations.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#999' }}>
            <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
            <br />
            <Text type="secondary">Нет бесед</Text>
          </div>
        ) : (
          <List
            dataSource={conversations}
            renderItem={(conv) => {
              const title = getConversationTitle(conv)
              const userId = getConversationUserId(conv)
              const isOnline = userId ? onlineUserIds.includes(userId) : false
              const isActive = conv.id === activeConversationId

              return (
                <List.Item
                  onClick={() => handleSelectConversation(conv)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    background: isActive ? '#e6f4ff' : 'transparent',
                    borderLeft: isActive ? '3px solid #1677ff' : '3px solid transparent',
                    transition: 'background 0.2s',
                    borderBottom: '1px solid #f5f5f5',
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge
                        status={conv.type === 'direct' && isOnline ? 'success' : 'default'}
                        dot
                        offset={[-2, 30]}
                      >
                        <Avatar
                          icon={conv.type === 'group' ? <TeamOutlined /> : <UserOutlined />}
                          style={{
                            background: conv.type === 'group' ? '#722ed1' : '#1677ff',
                          }}
                        />
                      </Badge>
                    }
                    title={
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#1677ff' : undefined,
                        }}
                        ellipsis
                      >
                        {title}
                      </Text>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                        {conv.type === 'group'
                          ? `${conv.members.length} участников`
                          : isOnline
                          ? 'онлайн'
                          : 'не в сети'}
                      </Text>
                    }
                  />
                </List.Item>
              )
            }}
          />
        )}
      </div>

      {/* Модальное окно: новый личный чат */}
      <Modal
        title="Новый личный чат"
        open={showDirectModal}
        onOk={handleCreateDirect}
        onCancel={() => { setShowDirectModal(false); setSelectedUserId('') }}
        okText="Открыть чат"
        cancelText="Отмена"
        okButtonProps={{ disabled: !selectedUserId }}
      >
        <Divider />
        <Select
          style={{ width: '100%' }}
          placeholder="Выберите пользователя"
          value={selectedUserId || undefined}
          onChange={setSelectedUserId}
          showSearch
          optionFilterProp="label"
          options={otherUsers.map((u) => ({
            value: u.id,
            label: u.email,
          }))}
        />
      </Modal>

      {/* Модальное окно: создать группу */}
      <Modal
        title="Создать группу"
        open={showGroupModal}
        onOk={handleCreateGroup}
        onCancel={() => { setShowGroupModal(false); setGroupName(''); setGroupMemberIds([]) }}
        okText="Создать"
        cancelText="Отмена"
        okButtonProps={{ disabled: !groupName || groupMemberIds.length === 0 }}
      >
        <Divider />
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder="Название группы"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            maxLength={50}
          />
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Добавить участников"
            value={groupMemberIds}
            onChange={setGroupMemberIds}
            showSearch
            optionFilterProp="label"
            options={otherUsers.map((u) => ({
              value: u.id,
              label: u.email,
            }))}
          />
        </Space>
      </Modal>

      {/* Кнопка добавить участника в группу — показывается вне модалки */}
      <div style={{ padding: 8, borderTop: '1px solid #f0f0f0' }}>
        <Tooltip title="Добавить участника в активную группу">
          <Button
            type="text"
            icon={<PlusOutlined />}
            style={{ width: '100%', textAlign: 'left' }}
            size="small"
          >
            Добавить в группу
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
