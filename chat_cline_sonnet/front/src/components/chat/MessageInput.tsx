// ============================================================
// Поле ввода сообщения с поддержкой смайлов и упоминаний
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import {
  Input, Button, Space, Popover, Typography, Tag, Mentions,
} from 'antd';
import {
  SendOutlined, SmileOutlined, CloseOutlined,
} from '@ant-design/icons';
import EmojiPicker from 'emoji-picker-react';
import type { Message, User } from '../../types/index';

const { Text } = Typography;

interface MessageInputProps {
  chatId: string;
  replyTo: Message | null;
  onClearReply: () => void;
  onSend: (content: string, replyToId?: string, mentions?: string[]) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  chatMembers: User[];
}

const MessageInput: React.FC<MessageInputProps> = ({
  replyTo,
  onClearReply,
  onSend,
  onTypingStart,
  onTypingStop,
  chatMembers,
}) => {
  const [content, setContent] = useState('');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /** Обработка изменения текста */
  const handleChange = useCallback((value: string) => {
    setContent(value);

    // Логика "typing"
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTypingStart();
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onTypingStop();
    }, 1500);
  }, [onTypingStart, onTypingStop]);

  /** Добавить эмодзи в текст */
  const handleAddEmoji = (emojiData: { emoji: string }) => {
    setContent(prev => prev + emojiData.emoji);
    setEmojiPickerOpen(false);
    inputRef.current?.focus();
  };

  /** Извлечь упомянутых пользователей из текста */
  const extractMentions = (text: string): string[] => {
    const emails = text.match(/@(\S+@\S+\.\S+)/g)?.map(m => m.slice(1)) ?? [];
    return chatMembers
      .filter(m => emails.includes(m.email))
      .map(m => m.id);
  };

  /** Отправить сообщение */
  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const mentions = extractMentions(trimmed);
    onSend(trimmed, replyTo?.id ?? undefined, mentions);

    setContent('');
    onClearReply();

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    onTypingStop();
  }, [content, replyTo, onSend, onClearReply, onTypingStop]);

  /** Отправка по Ctrl+Enter */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ padding: '8px 12px', background: '#fff', borderTop: '1px solid #f0f0f0' }}>
      {/* Плашка ответа на сообщение */}
      {replyTo && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            background: '#f5f5f5',
            borderLeft: '3px solid #1677ff',
            borderRadius: 6,
            marginBottom: 8,
          }}
        >
          <div>
            <Text strong style={{ fontSize: 12, color: '#1677ff' }}>
              Ответ: {replyTo.author?.email}
            </Text>
            <br />
            <Text type="secondary" ellipsis style={{ fontSize: 12, maxWidth: 300 }}>
              {replyTo.content}
            </Text>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClearReply}
          />
        </div>
      )}

      {/* Строка ввода */}
      <Space.Compact style={{ width: '100%', display: 'flex', alignItems: 'flex-end' }}>
        {/* Поле ввода с поддержкой @упоминаний */}
        <Mentions
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Написать сообщение... (Enter — отправить, Shift+Enter — новая строка)"
          autoSize={{ minRows: 1, maxRows: 5 }}
          style={{ flex: 1, resize: 'none' }}
          prefix="@"
          options={chatMembers.map(m => ({
            value: m.email,
            label: m.email,
          }))}
        />

        {/* Кнопка смайлов */}
        <Popover
          trigger="click"
          open={emojiPickerOpen}
          onOpenChange={setEmojiPickerOpen}
          placement="topRight"
          content={
            <EmojiPicker
              onEmojiClick={handleAddEmoji}
              width={300}
              height={350}
              searchPlaceholder="Поиск..."
            />
          }
        >
          <Button
            icon={<SmileOutlined />}
            style={{ height: 'auto', minHeight: 32, borderRadius: 0 }}
          />
        </Popover>

        {/* Кнопка отправки */}
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!content.trim()}
          style={{ height: 'auto', minHeight: 32 }}
        >
          Отправить
        </Button>
      </Space.Compact>
    </div>
  );
};

export default MessageInput;
