// Список сообщений (правая панель чата)
// Отображает историю сообщений активной беседы
// Поддерживает: автопрокрутку вниз, индикатор набора текста

import { useEffect, useRef } from 'react'
import { Typography, Spin, Empty } from 'antd'
import { MessageItem } from './MessageItem'
import { useAppSelector } from '../../hooks/useStore'
import type { Message } from '../../types'

const { Text } = Typography

interface MessageListProps {
  conversationId: string
  onReaction: (messageId: string, emoji: string) => void
  onReply: (message: Message) => void
}

export const MessageList = ({ conversationId, onReaction, onReply }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const messages = useAppSelector((s) => s.chat.messages[conversationId] || [])
  const typingUsers = useAppSelector((s) => s.chat.typingUsers[conversationId] || [])
  const conversations = useAppSelector((s) => s.chat.conversations)
  const conv = conversations.find((c) => c.id === conversationId)

  // Прокручиваем вниз при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!conv) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Spin />
      </div>
    )
  }

  return (
    <div
      style={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        paddingTop: 8,
        paddingBottom: 8,
      }}
    >
      {messages.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <Empty
            description="Нет сообщений. Напишите первым!"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            onReaction={onReaction}
            onReply={onReply}
            conversationMembers={conv.members}
          />
        ))
      )}

      {/* Индикатор набора текста */}
      {typingUsers.length > 0 && (
        <div style={{ padding: '4px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#999',
                  animation: `typing-bounce 1.4s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {typingUsers.map((u) => u.email).join(', ')} печатает...
          </Text>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
