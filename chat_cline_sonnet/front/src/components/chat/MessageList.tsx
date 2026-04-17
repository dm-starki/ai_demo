// ============================================================
// Список сообщений (правая колонка)
// ============================================================

import React, { useEffect, useRef } from 'react';
import { Typography, Spin, Empty } from 'antd';
import { useAppSelector } from '../../hooks/useTypedDispatch';
import MessageItem from './MessageItem';
import type { Message } from '../../types/index';

const { Text } = Typography;

interface MessageListProps {
  chatId: string;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({ chatId, onReply, onReact }) => {
  const { messages, isLoadingMessages, typingUsers } = useAppSelector(s => s.chat);
  const { user } = useAppSelector(s => s.auth);
  const bottomRef = useRef<HTMLDivElement>(null);

  const chatMessages = messages[chatId] ?? [];
  const typing = typingUsers[chatId]?.filter(u => u.userId !== user?.id) ?? [];

  // Прокрутка вниз при новых сообщениях
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length, chatId]);

  if (isLoadingMessages) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 0',
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f7fa',
      }}
    >
      {chatMessages.length === 0 ? (
        <Empty
          description="Нет сообщений. Начните общение!"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ margin: 'auto' }}
        />
      ) : (
        chatMessages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onReply={onReply}
            onReact={onReact}
            currentUserId={user?.id}
          />
        ))
      )}

      {/* Индикатор "печатает..." */}
      {typing.length > 0 && (
        <div style={{ padding: '4px 16px' }}>
          <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
            {typing.map(u => u.email).join(', ')} {typing.length === 1 ? 'печатает' : 'печатают'}...
          </Text>
        </div>
      )}

      {/* Якорь для прокрутки вниз */}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
