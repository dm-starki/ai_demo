export type UserRole = 'user' | 'admin';

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
};

export type ConversationKind = 'direct' | 'group';

export type ConversationRow = {
  id: string;
  kind: ConversationKind;
  title: string | null;
  created_by: string | null;
  created_at: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  reply_to_id: string | null;
  mentions: string[];
  created_at: string;
};
