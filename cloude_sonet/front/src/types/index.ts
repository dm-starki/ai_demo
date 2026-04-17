// Общие типы TypeScript для фронтенда

// Роль пользователя
export type UserRole = 'user' | 'admin'

// Тип беседы
export type ConversationType = 'direct' | 'group'

// Публичные данные пользователя
export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
  updated_at: string
}

// Пара JWT токенов
export interface TokenPair {
  accessToken: string
  refreshToken: string
}

// Ответ на вход в систему
export interface LoginResponse extends TokenPair {
  user: User
}

// Реакция на сообщение
export interface Reaction {
  emoji: string
  user_id: string
  user_email: string
  created_at: string
}

// Цитируемое сообщение (укороченное)
export interface ReplyTo {
  id: string
  content: string
  sender_email: string
  created_at: string
}

// Сообщение чата
export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_email: string
  content: string
  reply_to_id: string | null
  reply_to?: ReplyTo | null
  created_at: string
  edited_at: string | null
  reactions: Reaction[]
}

// Участник беседы
export interface ConversationMember extends User {
  joined_at?: string
}

// Беседа
export interface Conversation {
  id: string
  type: ConversationType
  name: string | null
  created_by: string
  created_at: string
  updated_at: string
  members: ConversationMember[]
}

// Состояние аутентификации в Redux
export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Состояние чата в Redux
export interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  messages: Record<string, Message[]>
  onlineUserIds: string[]
  typingUsers: Record<string, { userId: string; email: string }[]>
  isConnected: boolean
}
