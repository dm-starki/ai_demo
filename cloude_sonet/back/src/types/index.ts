// Общие типы TypeScript для бэкенда

// Роли пользователей
export type UserRole = 'user' | 'admin'

// Тип беседы
export type ConversationType = 'direct' | 'group'

// Пользователь из базы данных
export interface User {
  id: string
  email: string
  password: string
  role: UserRole
  created_at: Date
  updated_at: Date
}

// Пользователь без пароля (для передачи клиенту)
export interface UserPublic {
  id: string
  email: string
  role: UserRole
  created_at: Date
  updated_at: Date
}

// Refresh токен из БД
export interface RefreshToken {
  id: string
  user_id: string
  token: string
  expires_at: Date
  created_at: Date
}

// Беседа (чат)
export interface Conversation {
  id: string
  type: ConversationType
  name: string | null
  created_by: string
  created_at: Date
  updated_at: Date
}

// Беседа с участниками (расширенный тип)
export interface ConversationWithMembers extends Conversation {
  members: UserPublic[]
}

// Сообщение
export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  reply_to_id: string | null
  created_at: Date
  edited_at: Date | null
}

// Сообщение с данными отправителя (для передачи клиенту)
export interface MessageWithSender extends Message {
  sender_email: string
  reply_to?: MessageWithSender | null
  reactions: Reaction[]
}

// Реакция на сообщение
export interface Reaction {
  emoji: string
  user_id: string
  user_email: string
  created_at: Date
}

// Полезная нагрузка JWT токена
export interface JwtPayload {
  userId: string
  email: string
  role: UserRole
}

// Пара токенов
export interface TokenPair {
  accessToken: string
  refreshToken: string
}

// Базовый ответ API с ошибкой
export interface ApiError {
  statusCode: number
  error: string
  message: string
}
