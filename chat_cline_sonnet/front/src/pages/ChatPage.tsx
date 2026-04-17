// ============================================================
// Страница чата
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Layout, Typography, Avatar, Space, Divider, Spin } from 'antd';
import { TeamOutlined, UserOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../hooks/useTypedDispatch';
import { setMessages, setLoadingMessages } from '../store/slices/chatSlice';
import { useGetChatsQuery } from '../api/chatsApi';
import { setChats } from '../store/slices/chatSlice';
import { useSocket } from '../hooks/useSocket';
import ChatList from '../components/chat/ChatList';
import MessageList from '../components/chat/MessageList';
import MessageInput from '../components/chat/MessageInput';
import type { Message } from '../types/index';

const { Sider, Content } = Layout;
const { Text, Title } = Typography;

const ChatPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { chats, activeChatId } = useAppSelector(s => s.chat);
  const { user } = useAppSelector(s => s.auth);

  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const { sendMessage, sendReaction, joinChat, leaveChat, startTyping, stopTyping } = useSocket();

  // Загружаем список чатов
  const { data: chatsData, isLoading: chatsLoading } = useGetChatsQuery();

  useEffect(() => {
    if (chatsData?.chats) {
      dispatch(setChats(chatsData.chats));
    }
  }, [chatsData, dispatch]);

  // Загружаем сообщения при выборе чата через API
  const activeChatData = chats.find(c => c.id === activeChatId);

  // Подключаемся к комнате сокета при смене чата
  useEffect(() => {
    if (!activeChatId) return;
    joinChat(activeChatId);

    // Загружаем сообщения через API
    dispatch(setLoadingMessages(true));
    fetch(`${import.meta.env.VITE_API_URL}/api/chats/${activeChatId}/messages?limit=50`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem('chat_access_token')}`,
      },
    })
      .then(r => r.json())
      .then(data => {
        if (data.messages) {
          dispatch(setMessages({ chatId: activeChatId, messages: data.messages }));
        }
      })
      .catch(console.error)
      .finally(() => dispatch(setLoadingMessages(false)));

    return () => {
      leaveChat(activeChatId);
    };
  }, [activeChatId, dispatch, joinChat, leaveChat]);

  /** Отправить сообщение */
  const handleSend = useCallback((
    content: string,
    replyToId?: string,
    mentions?: string[],
  ) => {
    if (!activeChatId) return;
    sendMessage({ chatId: activeChatId, content, replyToId, mentions });
    setReplyTo(null);
  }, [activeChatId, sendMessage]);

  /** Поставить реакцию */
  const handleReact = useCallback((messageId: string, emoji: string) => {
    if (!activeChatId) return;
    sendReaction({ chatId: activeChatId, messageId, emoji });
  }, [activeChatId, sendReaction]);

  /** Начать ответ */
  const handleReply = useCallback((message: Message) => {
    setReplyTo(message);
  }, []);

  /** Отменить ответ */
  const handleClearReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  /** Получить имя активного чата */
  const getActiveChatName = () => {
    if (!activeChatData) return 'Выберите чат';
    if (activeChatData.type === 'group') return activeChatData.name ?? 'Группа';
    const other = activeChatData.members?.find(m => m.id !== user?.id);
    return other?.email ?? 'Диалог';
  };

  const chatMembers = activeChatData?.members ?? [];

  if (chatsLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Layout style={{ height: '100%', overflow: 'hidden' }}>
      {/* Левая колонка — список чатов */}
      <Sider
        width={280}
        style={{
          background: '#fff',
          borderRight: '1px solid #f0f0f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ChatList />
      </Sider>

      {/* Правая колонка — сообщения */}
      <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {activeChatId ? (
          <>
            {/* Заголовок активного чата */}
            <div
              style={{
                padding: '10px 16px',
                background: '#fff',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <Avatar
                size={36}
                icon={activeChatData?.type === 'group' ? <TeamOutlined /> : <UserOutlined />}
                style={{
                  background: activeChatData?.type === 'group' ? '#722ed1' : '#1677ff',
                }}
              />
              <div>
                <Title level={5} style={{ margin: 0, fontSize: 14 }}>
                  {getActiveChatName()}
                </Title>
                {activeChatData?.type === 'group' && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {chatMembers.length} участников
                  </Text>
                )}
              </div>
            </div>

            {/* Список сообщений */}
            <MessageList
              chatId={activeChatId}
              onReply={handleReply}
              onReact={handleReact}
            />

            {/* Поле ввода */}
            <MessageInput
              chatId={activeChatId}
              replyTo={replyTo}
              onClearReply={handleClearReply}
              onSend={handleSend}
              onTypingStart={() => startTyping(activeChatId)}
              onTypingStop={() => stopTyping(activeChatId)}
              chatMembers={chatMembers}
            />
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 12,
              color: '#999',
            }}
          >
            <div style={{ fontSize: 64 }}>💬</div>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Выберите чат или создайте новый
            </Text>
          </div>
        )}
      </Content>
    </Layout>
  );
};

export default ChatPage;
