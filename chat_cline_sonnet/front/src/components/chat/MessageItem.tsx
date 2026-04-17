// ============================================================
// Компонент одного сообщения
// ============================================================

import React, { useState } from 'react';
import {
  Avatar, Typography, Space, Tooltip, Popover, Button,
} from 'antd';
import {
  UserOutlined, SmileOutlined, RetweetOutlined,
} from '@ant-design/icons';
import EmojiPicker from 'emoji-picker-react';
import dayjs from 'dayjs';
import type { Message } from '../../types/index';
import { useAppSelector } from '../../hooks/useTypedDispatch';

const { Text } = Typography;

interface MessageItemProps {
  message: Message;
  onReply: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  /** Список id упомянутых пользователей для подсветки */
  currentUserId?: string;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, onReply, onReact, currentUserId }) => {
  const { user } = useAppSelector(s => s.auth);
  const isMine = message.user_id === user?.id;
  const isMentioned = message.mentions?.includes(currentUserId ?? '');

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);

  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    onReact(message.id, emojiData.emoji);
    setEmojiPickerOpen(false);
  };

  const formattedTime = dayjs(message.created_at).format('HH:mm');
  const formattedDate = dayjs(message.created_at).format('DD.MM.YYYY HH:mm');

  // Подготовка текста с тегами пользователей
  const renderContent = (content: string) => {
    // Ищем @email в тексте
    const parts = content.split(/(@\S+@\S+\.\S+)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <Text key={i} style={{ color: '#1677ff', fontWeight: 500 }}>{part}</Text>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 8,
        margin: '4px 12px',
        padding: '2px 0',
      }}
      onMouseEnter={() => setActionsVisible(true)}
      onMouseLeave={() => {
        if (!emojiPickerOpen) setActionsVisible(false);
      }}
    >
      {/* Аватар */}
      <Avatar
        size={32}
        icon={<UserOutlined />}
        style={{ background: isMine ? '#1677ff' : '#52c41a', flexShrink: 0 }}
      />

      {/* Содержимое сообщения */}
      <div style={{ maxWidth: '65%', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Цитируемое сообщение */}
        {message.reply_to && (
          <div
            style={{
              padding: '4px 10px',
              background: isMine ? '#d6e8ff' : '#f0f0f0',
              borderLeft: '3px solid #1677ff',
              borderRadius: 6,
              marginBottom: 2,
              fontSize: 12,
            }}
          >
            <Text type="secondary" style={{ fontSize: 11 }}>
              {message.reply_to.author?.email}
            </Text>
            <br />
            <Text ellipsis style={{ fontSize: 12 }}>
              {message.reply_to.content}
            </Text>
          </div>
        )}

        {/* Пузырь сообщения */}
        <div
          style={{
            background: isMentioned
              ? '#fff7e6'
              : isMine
              ? '#1677ff'
              : '#fff',
            color: isMine ? '#fff' : '#000',
            padding: '8px 12px',
            borderRadius: isMine ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            border: isMinted => isMine ? 'none' : '1px solid #e8e8e8',
            wordBreak: 'break-word',
            position: 'relative',
          }}
        >
          {/* Email автора (только в групповых - но показываем всегда для ясности) */}
          {!isMine && (
            <Text
              strong
              style={{ fontSize: 11, color: '#1677ff', display: 'block', marginBottom: 2 }}
            >
              {message.author?.email}
            </Text>
          )}

          {/* Текст сообщения */}
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>
            {renderContent(message.content)}
          </div>

          {/* Время */}
          <div style={{ textAlign: 'right', marginTop: 4 }}>
            <Tooltip title={formattedDate}>
              <Text
                style={{
                  fontSize: 11,
                  color: isMine ? 'rgba(255,255,255,0.7)' : '#999',
                }}
              >
                {formattedTime}
              </Text>
            </Tooltip>
          </div>
        </div>

        {/* Реакции */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              justifyContent: isMine ? 'flex-end' : 'flex-start',
            }}
          >
            {message.reactions.map((reaction) => (
              <Tooltip
                key={reaction.emoji}
                title={`${reaction.count} реакц.`}
              >
                <button
                  onClick={() => onReact(message.id, reaction.emoji)}
                  style={{
                    background: '#f0f0f060',
                    border: '1px solid #e0e0e0',
                    borderRadius: 12,
                    padding: '2px 6px',
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  {reaction.emoji}
                  <Text style={{ fontSize: 11 }}>{reaction.count}</Text>
                </button>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* Кнопки действий (показываются при наведении) */}
      {actionsVisible && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            alignSelf: 'flex-start',
            marginTop: 4,
          }}
        >
          {/* Ответить */}
          <Tooltip title="Ответить">
            <Button
              type="text"
              size="small"
              icon={<RetweetOutlined />}
              onClick={() => onReply(message)}
              style={{ padding: '0 4px' }}
            />
          </Tooltip>

          {/* Реакция */}
          <Popover
            trigger="click"
            open={emojiPickerOpen}
            onOpenChange={(open) => {
              setEmojiPickerOpen(open);
              if (!open) setActionsVisible(false);
            }}
            content={
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                width={300}
                height={350}
                searchPlaceholder="Поиск..."
              />
            }
          >
            <Tooltip title="Реакция">
              <Button
                type="text"
                size="small"
                icon={<SmileOutlined />}
                style={{ padding: '0 4px' }}
              />
            </Tooltip>
          </Popover>
        </div>
      )}
    </div>
  );
};

// Заглушка для TypeScript
const isMinted = (_: boolean) => {};

export default MessageItem;
