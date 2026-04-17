// Главная страница чата
// Занимает всю область от шапки до нижнего края экрана (без прокрутки страницы)
// Слева: список бесед, справа: сообщения активной беседы

import { useState, useEffect } from 'react'
import { Layout, Typography, Avatar, theme } from 'antd'
import { MessageOutlined, TeamOutlined } from '@ant-design/icons'
import { ConversationList } from '../components/chat/ConversationList'
import { MessageList } from '../components/chat/MessageList'
import { MessageInput } from '../components/chat/MessageInput'
import { useAppDispatch, useAppSelector } from '../hooks/useStore'
import { setMessages, setConversations } from '../store/slices/chatSlice'
import { useGetConversationsQuery, useGetMessagesQuery } from '../api/conversationsApi'
import { useSocket } from '../hooks/useSocket'
import type { Message, Conversation } from '../types'

const { Sider, Content } = Layout
const { Title, Text } = Typography

// Высота шапки (px)
const HEADER_HEIGHT = 56

export const ChatPage = () => {
  const { token } = theme.useToken()
  const dispatch = useAppDispatch()
  const currentUser = useAppSelector((s) => s.auth.user)
  const activeConversationId = useAppSelector((s) => s.chat.activeConversationId)
  const conversations = useAppSelector((s) => s.chat.conversations)

  const [replyTo, setReplyTo] = useState<Message | null>(null)

  const { data: conversationsList } = useGetConversationsQuery()
  const { data: messagesData } = useGetMessagesQuery(
    { conversationId: activeConversationId! },
    { skip: !activeConversationId }
  )

  const { sendMessage, toggleReaction, startTyping, stopTyping, joinConversation } = useSocket()

  // Синхронизируем беседы из API в store
  useEffect(() => {
    if (conversationsList) {
      dispatch(setConversations(conversationsList as Conversation[]))
    }
  }, [conversationsList, dispatch])

  // Синхронизируем историю сообщений
  useEffect(() => {
    if (messagesData && activeConversationId) {
      dispatch(setMessages({ conversationId: activeConversationId, messages: messagesData as Message[] }))
    }
  }, [messagesData, activeConversationId, dispatch])

  // При выборе беседы — присоединяемся к ней через сокет
  const handleConversationSelect = (id: string) => {
    joinConversation(id)
    setReplyTo(null)
  }

  const handleSend = (content: string, replyToId?: string) => {
    if (!activeConversationId) return
    sendMessage(activeConversationId, content, replyToId)
  }

  const handleReaction = (messageId: string, emoji: string) => {
    toggleReaction(messageId, emoji)
  }

  const handleReply = (message: Message) => {
    setReplyTo(message)
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  // Участники активной беседы (кроме текущего пользователя)
  const activeMembersForInput = activeConversation?.members || []

  return (
    <Layout
      style={{
        height: `calc(100vh - ${HEADER_HEIGHT}px)`,
        marginTop: HEADER_HEIGHT,
        overflow: 'hidden',
      }}
    >
      {/* Левая панель: список бесед */}
      <Sider
        width={280}
        style={{
          background: '#fff',
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <ConversationList onSelect={handleConversationSelect} />
        </div>
      </Sider>

      {/* Правая часть: сообщения */}
      <Content
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#f5f5f5',
        }}
      >
        {activeConversationId ? (
          <>
            {/* Заголовок беседы */}
            <div
              style={{
                padding: '12px 16px',
                background: '#fff',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
              }}
            >
              <Avatar
                icon={activeConversation?.type === 'group' ? <TeamOutlined /> : <MessageOutlined />}
                style={{
                  background: activeConversation?.type === 'group' ? '#722ed1' : '#1677ff',
                }}
              />
              <div>
                <Title level={5} style={{ margin: 0, lineHeight: 1.2 }}>
                  {activeConversation?.type === 'group'
                    ? activeConversation.name
                    : activeConversation?.members.find((m) => m.id !== currentUser?.id)?.email}
                </Title>
                {activeConversation?.type === 'group' && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {activeConversation.members.length} участников
                  </Text>
                )}
              </div>
            </div>

            {/* Список сообщений */}
            <MessageList
              conversationId={activeConversationId}
              onReaction={handleReaction}
              onReply={handleReply}
            />

            {/* Поле ввода */}
            <MessageInput
              conversationId={activeConversationId}
              replyTo={replyTo}
              onClearReply={() => setReplyTo(null)}
              onSend={handleSend}
              onTypingStart={() => startTyping(activeConversationId)}
              onTypingStop={() => stopTyping(activeConversationId)}
              members={activeMembersForInput}
            />
          </>
        ) : (
          /* Заглушка когда нет активной беседы */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              color: '#999',
            }}
          >
            <MessageOutlined style={{ fontSize: 64 }} />
            <Title level={4} style={{ color: '#999', margin: 0 }}>
              Выберите беседу
            </Title>
            <Text type="secondary">
              Откройте чат или создайте новый из панели слева
            </Text>
          </div>
        )}
      </Content>
    </Layout>
  )
}
