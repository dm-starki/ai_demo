// ============================================================
// Список чатов (левая колонка)
// ============================================================

import React, { useState } from 'react';
import {
  List, Avatar, Badge, Typography, Button, Modal,
  Select, Input, Space, Divider, Tooltip, Empty,
} from 'antd';
import {
  PlusOutlined, TeamOutlined, UserOutlined, MessageOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAppDispatch, useAppSelector } from '../../hooks/useTypedDispatch';
import { setActiveChat, upsertChat } from '../../store/slices/chatSlice';
import {
  useCreateDirectChatMutation,
  useCreateGroupChatMutation,
  useGetAllUsersForChatQuery,
} from '../../api/chatsApi';
import type { Chat } from '../../types/index';

const { Text } = Typography;
const { Option } = Select;

interface ChatListProps {
  onChatSelect?: (chatId: string) => void;
}

const ChatList: React.FC<ChatListProps> = ({ onChatSelect }) => {
  const dispatch = useAppDispatch();
  const { chats, activeChatId, onlineUsers } = useAppSelector(s => s.chat);
  const { user } = useAppSelector(s => s.auth);
  const { data: usersData } = useGetAllUsersForChatQuery();

  const [createDirectMutation] = useCreateDirectChatMutation();
  const [createGroupMutation] = useCreateGroupChatMutation();

  // Модалки
  const [directModalOpen, setDirectModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);

  const allUsers = usersData?.users?.filter(u => u.id !== user?.id) ?? [];

  /** Получить отображаемое имя чата */
  const getChatName = (chat: Chat): string => {
    if (chat.type === 'group') return chat.name ?? 'Группа';
    const other = chat.members?.find(m => m.id !== user?.id);
    return other?.email ?? 'Неизвестный';
  };

  /** Получить id собеседника в direct чате */
  const getDirectUserId = (chat: Chat): string | null => {
    if (chat.type !== 'direct') return null;
    return chat.members?.find(m => m.id !== user?.id)?.id ?? null;
  };

  /** Обработчик выбора чата */
  const handleSelectChat = (chatId: string) => {
    dispatch(setActiveChat(chatId));
    onChatSelect?.(chatId);
  };

  /** Создать личный чат */
  const handleCreateDirect = async () => {
    if (!selectedUserId) return;
    const res = await createDirectMutation({ targetUserId: selectedUserId }).unwrap();
    dispatch(upsertChat(res.chat));
    dispatch(setActiveChat(res.chat.id));
    setDirectModalOpen(false);
    setSelectedUserId(null);
  };

  /** Создать групповой чат */
  const handleCreateGroup = async () => {
    if (!groupName.trim() || groupMemberIds.length === 0) return;
    const res = await createGroupMutation({ name: groupName.trim(), memberIds: groupMemberIds }).unwrap();
    dispatch(upsertChat(res.chat));
    dispatch(setActiveChat(res.chat.id));
    setGroupModalOpen(false);
    setGroupName('');
    setGroupMemberIds([]);
  };

  /** Форматирование времени последнего сообщения */
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = dayjs(dateStr);
    if (d.isToday()) return d.format('HH:mm');
    return d.format('DD.MM');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Кнопки создания */}
      <div style={{ padding: '12px 12px 8px', display: 'flex', gap: 8 }}>
        <Tooltip title="Новый личный чат">
          <Button
            type="primary"
            size="small"
            icon={<UserOutlined />}
            onClick={() => setDirectModalOpen(true)}
            style={{ flex: 1 }}
          >
            Чат
          </Button>
        </Tooltip>
        <Tooltip title="Создать группу">
          <Button
            size="small"
            icon={<TeamOutlined />}
            onClick={() => setGroupModalOpen(true)}
            style={{ flex: 1 }}
          >
            Группа
          </Button>
        </Tooltip>
      </div>

      <Divider style={{ margin: '0 0 4px' }} />

      {/* Список чатов */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {chats.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Нет чатов"
            style={{ margin: '32px 0' }}
          />
        ) : (
          <List
            dataSource={chats}
            renderItem={(chat) => {
              const name = getChatName(chat);
              const directUserId = getDirectUserId(chat);
              const isOnline = directUserId ? onlineUsers.includes(directUserId) : false;
              const isActive = chat.id === activeChatId;
              const lastMsgTime = formatTime(chat.last_message?.created_at ?? chat.updated_at);
              const lastMsg = chat.last_message?.content ?? '';

              return (
                <List.Item
                  onClick={() => handleSelectChat(chat.id)}
                  style={{
                    cursor: 'pointer',
                    padding: '10px 12px',
                    background: isActive ? '#e6f4ff' : 'transparent',
                    borderLeft: isActive ? '3px solid #1677ff' : '3px solid transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge dot={isOnline} color="green" offset={[-2, 28]}>
                        <Avatar
                          icon={chat.type === 'group' ? <TeamOutlined /> : <UserOutlined />}
                          style={{
                            background: chat.type === 'group' ? '#722ed1' : '#1677ff',
                          }}
                        />
                      </Badge>
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong ellipsis style={{ maxWidth: 120, fontSize: 13 }}>
                          {name}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                          {lastMsgTime}
                        </Text>
                      </div>
                    }
                    description={
                      <Text
                        type="secondary"
                        ellipsis
                        style={{ fontSize: 12, maxWidth: 160 }}
                      >
                        {lastMsg || (chat.type === 'group' ? `${chat.members?.length ?? 0} участников` : '')}
                      </Text>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </div>

      {/* Модалка создания личного чата */}
      <Modal
        title={<><UserOutlined /> Новый диалог</>}
        open={directModalOpen}
        onOk={handleCreateDirect}
        onCancel={() => { setDirectModalOpen(false); setSelectedUserId(null); }}
        okText="Создать"
        cancelText="Отмена"
        okButtonProps={{ disabled: !selectedUserId }}
      >
        <Select
          showSearch
          placeholder="Выберите пользователя"
          style={{ width: '100%', marginTop: 8 }}
          value={selectedUserId}
          onChange={setSelectedUserId}
          filterOption={(input, option) =>
            (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
          }
          options={allUsers.map(u => ({ value: u.id, label: u.email }))}
        />
      </Modal>

      {/* Модалка создания группы */}
      <Modal
        title={<><TeamOutlined /> Новая группа</>}
        open={groupModalOpen}
        onOk={handleCreateGroup}
        onCancel={() => { setGroupModalOpen(false); setGroupName(''); setGroupMemberIds([]); }}
        okText="Создать"
        cancelText="Отмена"
        okButtonProps={{ disabled: !groupName.trim() || groupMemberIds.length === 0 }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <div>
            <Text strong>Название группы</Text>
            <Input
              placeholder="Введите название..."
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Text strong>Участники</Text>
            <Select
              mode="multiple"
              showSearch
              placeholder="Выберите участников"
              style={{ width: '100%', marginTop: 4 }}
              value={groupMemberIds}
              onChange={setGroupMemberIds}
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={allUsers.map(u => ({ value: u.id, label: u.email }))}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
};

// Упрощённый dayjs isToday (без плагина)
declare module 'dayjs' {
  interface Dayjs {
    isToday(): boolean;
  }
}

export default ChatList;
