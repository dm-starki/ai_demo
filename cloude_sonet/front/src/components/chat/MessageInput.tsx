// Поле ввода сообщения
// Поддерживает: отправку по Enter, отображение цитаты, выбор emoji, тегирование @

import { useState, useRef, useCallback } from 'react'
import {
  Input,
  Button,
  Space,
  Typography,
  Popover,
  Dropdown,
  theme,
} from 'antd'
import {
  SendOutlined,
  SmileOutlined,
  CloseOutlined,
  UserAddOutlined,
} from '@ant-design/icons'
import { LazyEmojiPicker, preloadEmojiPicker } from './LazyEmojiPicker'
import type { EmojiClickData } from 'emoji-picker-react'
import type { Message } from '../../types'

const { Text } = Typography

interface MessageInputProps {
  conversationId: string
  replyTo: Message | null
  onClearReply: () => void
  onSend: (content: string, replyToId?: string) => void
  onTypingStart: () => void
  onTypingStop: () => void
  members?: { id: string; email: string }[]
}

export const MessageInput = ({
  conversationId,
  replyTo,
  onClearReply,
  onSend,
  onTypingStart,
  onTypingStop,
  members = [],
}: MessageInputProps) => {
  const { token } = theme.useToken()
  const [value, setValue] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showMentions, setShowMentions] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)

    // Управление событиями набора текста
    if (!isTypingRef.current) {
      isTypingRef.current = true
      onTypingStart()
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false
      onTypingStop()
    }, 2000)
  }

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return

    onSend(trimmed, replyTo?.id)
    setValue('')
    onClearReply()

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    isTypingRef.current = false
    onTypingStop()

    inputRef.current?.focus()
  }, [value, replyTo, onSend, onClearReply, onTypingStop])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter без Shift отправляет; Shift+Enter — новая строка
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    setValue((prev) => prev + emojiData.emoji)
    setShowEmoji(false)
    inputRef.current?.focus()
  }

  const handleMention = (email: string) => {
    setValue((prev) => prev + `@${email} `)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  const mentionItems = members.map((m) => ({
    key: m.id,
    label: m.email,
    onClick: () => handleMention(m.email),
  }))

  return (
    <div
      style={{
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        padding: '8px 16px',
        background: '#fff',
      }}
    >
      {/* Цитата (ответ на сообщение) */}
      {replyTo && (
        <div
          style={{
            background: '#f5f5f5',
            borderLeft: `3px solid ${token.colorPrimary}`,
            borderRadius: 4,
            padding: '6px 10px',
            marginBottom: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <Text strong style={{ fontSize: 12, color: token.colorPrimary }}>
              {replyTo.sender_email}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              {replyTo.content.slice(0, 100)}
              {replyTo.content.length > 100 ? '...' : ''}
            </Text>
          </div>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClearReply}
            style={{ marginLeft: 8, flexShrink: 0 }}
          />
        </div>
      )}

      {/* Строка ввода */}
      <Space.Compact style={{ width: '100%' }} direction="horizontal">
        {/* Emoji — ленивая загрузка пикера */}
        <Popover
          content={
            <LazyEmojiPicker
              onEmojiClick={handleEmojiSelect}
              width={320}
              height={400}
            />
          }
          trigger="click"
          open={showEmoji}
          onOpenChange={setShowEmoji}
          placement="topLeft"
          destroyTooltipOnHide
        >
          <Button
            icon={<SmileOutlined />}
            style={{ flexShrink: 0 }}
            onMouseEnter={preloadEmojiPicker}
          />
        </Popover>

        {/* Упоминания */}
        {members.length > 0 && (
          <Dropdown
            menu={{ items: mentionItems }}
            open={showMentions}
            onOpenChange={setShowMentions}
            trigger={['click']}
            placement="topLeft"
          >
            <Button icon={<UserAddOutlined />} style={{ flexShrink: 0 }} title="Упомянуть пользователя @" />
          </Dropdown>
        )}

        {/* Поле ввода */}
        <Input.TextArea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Написать сообщение... (Enter — отправить, Shift+Enter — новая строка)"
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ resize: 'none', flex: 1 }}
        />

        {/* Кнопка отправки */}
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSend}
          disabled={!value.trim()}
          style={{ flexShrink: 0 }}
        >
          Отправить
        </Button>
      </Space.Compact>
    </div>
  )
}
