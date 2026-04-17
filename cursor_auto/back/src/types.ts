export type UserRole = 'user' | 'admin';

export type UserPublic = {
  id: string;
  email: string;
  role: UserRole;
};

export type ConversationType = 'direct' | 'group';

export type ConversationListItem = {
  id: string;
  type: ConversationType;
  name: string | null;
  peerEmail: string | null;
  members: { id: string; email: string }[];
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_email: string;
  body: string;
  reply_to_id: string | null;
  created_at: string;
  reply_preview?: { id: string; sender_email: string; body: string } | null;
  mentions: string[];
  reactions: { emoji: string; emails: string[] }[];
};
