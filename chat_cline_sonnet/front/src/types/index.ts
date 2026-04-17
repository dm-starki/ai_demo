// ============================================================
// Общие TypeScript типы для фронтенда
// ============================================================

/** Роль пользователя */
export type UserRole = 'user' | 'admin';

/** Пользователь */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

/** JWT токены */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Ответ авторизации */
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

/** Тип чата */
export type ChatType = 'direct' | 'group';

/** Чат */
export interface Chat {
  id: string;
  type: ChatType;
  name: string | null;
  creator_id: string | null;
  created_at: string;
  updated_at: string;
  members: User[];
  last_message?: Message | null;
}

/** Группа реакций */
export interface ReactionGroup {
  emoji: string;
  count: number;
  users: string[];
}

/** Сообщение */
export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  content: string;
  reply_to_id: string | null;
  mentions: string[];
  created_at: string;
  updated_at: string;
  author: User;
  reply_to?: Message | null;
  reactions: ReactionGroup[];
}

/** Состояние авторизации в Redux */
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

/** Состояние чата в Redux */
export interface ChatState {
  chats: Chat[];
  activeChatId: string | null;
  messages: Record<string, Message[]>;
  onlineUsers: string[];
  typingUsers: Record<string, { userId: string; email: string }[]>;
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
}
