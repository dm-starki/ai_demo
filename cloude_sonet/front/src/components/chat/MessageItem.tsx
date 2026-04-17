// Компонент отдельного сообщения в чате
// Отображает: email отправителя, текст, время, реакции, кнопки действий
// Панель реакций и кнопка ответа появляются сбоку от пузыря при наведении

import { useState } from 'react'
import {
  Typography,
  Tooltip,
  Popover,
  Button,
  Avatar,
  theme,
} from 'antd'
import {
  SmileOutlined,
  MessageOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { LazyEmojiPicker, preloadEmojiPicker } from './LazyEmojiPicker'
import type { EmojiClickData } from 'emoji-picker-react'
import { useAppSelector } from '../../hooks/useStore'
import type { Message } from '../../types'

const { Text } = Typography

// Популярные быстрые реакции (как в Telegram)
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉']

// Размер эмодзи: значки под сообщением и в панели быстрых реакций при наведении
const REACTION_EMOJI_PX = 21
// Крупный эмодзи над значком (как раньше ~3.7× от базового)
const REACTION_HOVER_PREVIEW_PX = 78

interface ReactionBadgeProps {
  emoji: string
  count: number
  users: string[]
  isOwn: boolean
  onClick: () => void
}

// Значок реакции под сообщением — при наведении показывает эмодзи в увеличенном виде
const ReactionBadge = ({ emoji, count, users, isOwn, onClick }: ReactionBadgeProps) => {
  const { token } = theme.useToken()
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Увеличенный эмодзи над значком */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: hovered ? 'translateX(-50%) scale(1)' : 'translateX(-50%) scale(0.4)',
          transformOrigin: 'bottom center',
          fontSize: REACTION_HOVER_PREVIEW_PX,
          lineHeight: 1,
          pointerEvents: 'none',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s ease, transform 0.15s ease',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.18))',
          zIndex: 20,
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {emoji}
      </div>

      {/* Тултип со списком пользователей — только имена, без дублирования иконки */}
      <Tooltip
        title={users.join(', ')}
        placement="bottom"
        mouseEnterDelay={0.5}
      >
        <button
          onClick={onClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            border: `1.5px solid ${isOwn ? token.colorPrimary : token.colorBorderSecondary}`,
            borderRadius: 18,
            padding: '3px 12px',
            cursor: 'pointer',
            background: isOwn ? '#e6f4ff' : '#f9f9f9',
            fontSize: REACTION_EMOJI_PX,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'transform 0.15s ease, border-color 0.15s, background 0.15s',
            transform: hovered ? 'scale(1.15)' : 'scale(1)',
            transformOrigin: 'center bottom',
            outline: 'none',
          }}
        >
          {emoji}
          <span
            style={{
              fontSize: 16.5,
              color: isOwn ? token.colorPrimary : '#555',
              fontWeight: 600,
              lineHeight: 1,
            }}
          >
            {count}
          </span>
        </button>
      </Tooltip>
    </div>
  )
}

interface MessageItemProps {
  message: Message
  onReaction: (messageId: string, emoji: string) => void
  onReply: (message: Message) => void
  conversationMembers?: { id: string; email: string }[]
}

export const MessageItem = ({
  message,
  onReaction,
  onReply,
}: MessageItemProps) => {
  const { token } = theme.useToken()
  const currentUser = useAppSelector((s) => s.auth.user)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [hovering, setHovering] = useState(false)

  const isOwn = message.sender_id === currentUser?.id

  const formattedTime = new Date(message.created_at).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const formattedDate = new Date(message.created_at).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })

  // Группируем реакции по эмодзи
  const groupedReactions = message.reactions.reduce<
    Record<string, { emoji: string; count: number; users: string[] }>
  >((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { emoji: r.emoji, count: 0, users: [] }
    acc[r.emoji]!.count++
    acc[r.emoji]!.users.push(r.user_email)
    return acc
  }, {})

  const myReactions = message.reactions
    .filter((r) => r.user_id === currentUser?.id)
    .map((r) => r.emoji)

  const handleEmojiSelect = (emojiData: EmojiClickData) => {
    onReaction(message.id, emojiData.emoji)
    setShowEmojiPicker(false)
  }

  // Панель действий — рендерится всегда, управляется visibility
  const ActionsPanel = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: '#fff',
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 22,
        padding: '4px 8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        visibility: hovering ? 'visible' : 'hidden',
        opacity: hovering ? 1 : 0,
        transition: 'opacity 0.15s ease',
        flexShrink: 0,
        alignSelf: 'center',
        // Небольшой отступ от пузыря
        marginLeft: isOwn ? 0 : 6,
        marginRight: isOwn ? 6 : 0,
      }}
    >
      {/* Быстрые реакции */}
      {QUICK_REACTIONS.map((emoji) => (
        <Tooltip key={emoji} title={emoji} mouseEnterDelay={0.5}>
          <button
            onClick={() => onReaction(message.id, emoji)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '2px 4px',
              fontSize: REACTION_EMOJI_PX,
              lineHeight: 1,
              borderRadius: 4,
              transition: 'transform 0.1s, background 0.15s',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget
              btn.style.background = '#f0f0f0'
              btn.style.transform = 'scale(1.2)'
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget
              btn.style.background = 'transparent'
              btn.style.transform = 'scale(1)'
            }}
          >
            {emoji}
          </button>
        </Tooltip>
      ))}

      {/* Разделитель */}
      <div
        style={{
          width: 1,
          height: REACTION_EMOJI_PX,
          background: token.colorBorderSecondary,
          margin: '0 2px',
          flexShrink: 0,
        }}
      />

      {/* Полный выбор emoji — загружается лениво */}
      <Popover
        content={
          <LazyEmojiPicker
            onEmojiClick={handleEmojiSelect}
            width={320}
            height={400}
          />
        }
        trigger="click"
        open={showEmojiPicker}
        onOpenChange={setShowEmojiPicker}
        placement={isOwn ? 'topRight' : 'topLeft'}
        destroyTooltipOnHide
      >
        <Tooltip title="Другие реакции" mouseEnterDelay={0.5}>
          <Button
            type="text"
            size="small"
            icon={<SmileOutlined style={{ fontSize: REACTION_EMOJI_PX }} />}
            style={{ padding: '0 6px', height: 36, minWidth: 36 }}
            // Preload чанка при наведении — до клика пользователя
            onMouseEnter={preloadEmojiPicker}
          />
        </Tooltip>
      </Popover>

      {/* Ответить */}
      <Tooltip title="Ответить" mouseEnterDelay={0.5}>
        <Button
          type="text"
          size="small"
          icon={<MessageOutlined style={{ fontSize: REACTION_EMOJI_PX }} />}
          onClick={() => onReply(message)}
          style={{ padding: '0 6px', height: 36, minWidth: 36 }}
        />
      </Tooltip>
    </div>
  )

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        // Не скрываем панель если открыт emoji picker
        if (!showEmojiPicker) setHovering(false)
      }}
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 6,
        padding: '3px 16px',
      }}
    >
      {/* Аватар */}
      <Avatar
        icon={<UserOutlined />}
        size={32}
        style={{
          flexShrink: 0,
          background: isOwn ? '#1677ff' : '#52c41a',
          fontSize: 14,
          marginBottom: 2,
        }}
      >
        {message.sender_email[0]?.toUpperCase()}
      </Avatar>

      {/* Пузырь + панель действий — в одном flex-ряду */}
      <div
        style={{
          display: 'flex',
          flexDirection: isOwn ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          gap: 0,
          maxWidth: 'calc(70% + 120px)',
          // Выравниваем по той же стороне что и пузырь
        }}
      >
        {/* Группа: цитата + пузырь + реакции */}
        <div style={{ maxWidth: '100%', minWidth: 120 }}>
          {/* Цитата (если ответ) */}
          {message.reply_to && (
            <div
              style={{
                background: '#f0f0f0',
                borderLeft: `3px solid ${token.colorPrimary}`,
                borderRadius: '6px 6px 0 0',
                padding: '4px 10px',
                marginBottom: -2,
                overflow: 'hidden',
              }}
            >
              <Text
                strong
                style={{ fontSize: 11, color: token.colorPrimary, display: 'block' }}
              >
                {message.reply_to.sender_email}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }} ellipsis>
                {message.reply_to.content}
              </Text>
            </div>
          )}

          {/* Основной пузырь */}
          <div
            style={{
              background: isOwn ? '#1677ff' : '#ffffff',
              border: isOwn ? 'none' : `1px solid ${token.colorBorderSecondary}`,
              borderRadius: isOwn ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
              padding: '8px 12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}
          >
            {/* Email отправителя */}
            {!isOwn && (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#1677ff',
                  display: 'block',
                  marginBottom: 2,
                }}
              >
                {message.sender_email}
              </Text>
            )}

            {/* Текст сообщения */}
            <Text
              style={{
                color: isOwn ? '#ffffff' : token.colorText,
                fontSize: 14,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {message.content}
            </Text>

            {/* Время */}
            <div style={{ textAlign: 'right', marginTop: 2 }}>
              <Tooltip title={`${formattedDate} ${formattedTime}`}>
                <Text
                  style={{
                    fontSize: 10,
                    color: isOwn ? 'rgba(255,255,255,0.7)' : token.colorTextTertiary,
                  }}
                >
                  {formattedTime}
                  {message.edited_at && ' (ред.)'}
                </Text>
              </Tooltip>
            </div>
          </div>

          {/* Реакции под пузырём */}
          {Object.values(groupedReactions).length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
                // Отступ сверху с запасом для увеличенного эмодзи
                marginTop: 8,
                justifyContent: isOwn ? 'flex-end' : 'flex-start',
                // Оставляем место для всплывающего эмодзи над значками
                paddingTop: 4,
              }}
            >
              {Object.values(groupedReactions).map(({ emoji, count, users }) => (
                <ReactionBadge
                  key={emoji}
                  emoji={emoji}
                  count={count}
                  users={users}
                  isOwn={myReactions.includes(emoji)}
                  onClick={() => onReaction(message.id, emoji)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Панель действий — сбоку от пузыря */}
        {ActionsPanel}
      </div>
    </div>
  )
}
