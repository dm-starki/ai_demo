// ============================================================
// Общие TypeScript типы для бэкенда
// ============================================================

/** Роль пользователя */
export type UserRole = 'user' | 'admin';

/** Пользователь из базы данных */
export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

/** Публичные данные пользователя (без пароля) */
export interface UserPublic {
  id: string;
  email: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

/** Payload JWT токена */
export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

/** Тип чата */
export type ChatType = 'direct' | 'group';

/** Чат из базы данных */
export interface Chat {
  id: string;
  type: ChatType;
  name: string | null;
  creator_id: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Чат с дополнительной информацией для отображения */
export interface ChatWithDetails extends Chat {
  members: UserPublic[];
  last_message?: Message | null;
  unread_count?: number;
}

/** Участник чата */
export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  joined_at: Date;
}

/** Сообщение */
export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  mentions: string[];
  created_at: Date;
  updated_at: Date;
}

/** Сообщение с деталями автора и цитируемого сообщения */
export interface MessageWithDetails extends Message {
  author: UserPublic;
  reply_to?: MessageWithDetails | null;
  reactions: ReactionGroup[];
}

/** Реакция на сообщение */
export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: Date;
}

/** Группа реакций (одно эмодзи от нескольких пользователей) */
export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[]; // user_id
}

/** Refresh токен */
export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

/** Ответ API с токенами */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Ответ API при успешной авторизации */
export interface AuthResponse {
  user: UserPublic;
  tokens: AuthTokens;
}
