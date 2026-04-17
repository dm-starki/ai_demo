import {
  Button,
  ConfigProvider,
  Input,
  List,
  Modal,
  Popover,
  Space,
  Tag,
  Typography,
  theme,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import type { MessageDto } from '../api/api.js';
import {
  api,
  useAddMembersMutation,
  useConversationsQuery,
  useCreateConversationMutation,
  useMessagesQuery,
} from '../api/api.js';
import { useAuth } from '../auth/AuthContext.js';
import { store } from '../store.js';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😂', '😮', '😢', '🎉', '👏', '🤔', '🙏'];

/** Светлая «инверсия» зоны чата (шапка приложения остаётся в глобальной тёмной теме). */
const CHAT = {
  sidebarBg: '#ffffff',
  sidebarBorder: '#c4cad3',
  listActive: '#d6e8ff',
  messagesBg: '#e8ecf0',
  bubbleIn: '#ffffff',
  bubbleOut: '#d9eefc',
  bubbleBorder: '#b4becd',
  inputBarBg: '#f4f6f8',
  inputBarBorder: '#c4cad3',
} as const;

export const ChatPage = () => {
  const { data: convs = [] } = useConversationsQuery();
  const [createConv] = useCreateConversationMutation();
  const [addMembers] = useAddMembersMutation();
  const { accessVersion, user } = useAuth();

  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: messages = [] } = useMessagesQuery(activeId ?? '', { skip: !activeId });

  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<MessageDto | null>(null);
  const [dmOpen, setDmOpen] = useState(false);
  const [grpOpen, setGrpOpen] = useState(false);
  const [memOpen, setMemOpen] = useState(false);
  const [dmEmail, setDmEmail] = useState('');
  const [grpName, setGrpName] = useState('');
  const [grpEmails, setGrpEmails] = useState('');
  const [memEmails, setMemEmails] = useState('');
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const active = useMemo(() => convs.find((c) => c.id === activeId) ?? null, [convs, activeId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, activeId]);

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    socketRef.current?.disconnect();
    socketRef.current = null;
    if (!activeId || !token) return;
    const url = import.meta.env.VITE_SOCKET_URL as string;
    const s = io(url, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = s;
    const onMsg = (m: MessageDto) => {
      store.dispatch(api.util.invalidateTags([{ type: 'Messages', id: m.conversation_id }]));
      store.dispatch(api.util.invalidateTags(['Conversations']));
    };
    const onReact = (p: { conversationId: string }) => {
      store.dispatch(api.util.invalidateTags([{ type: 'Messages', id: p.conversationId }]));
    };
    s.on('message:new', onMsg);
    s.on('reaction:update', onReact);
    s.on('connect', () => {
      s.emit('conv:join', activeId, () => undefined);
    });
    return () => {
      s.emit('conv:leave', activeId);
      s.off('message:new', onMsg);
      s.off('reaction:update', onReact);
      s.disconnect();
      if (socketRef.current === s) socketRef.current = null;
    };
  }, [activeId, accessVersion]);

  const collectMentions = () => {
    if (!active) return [] as string[];
    const ids: string[] = [];
    for (const m of active.members) {
      if (text.includes(`@${m.email}`)) ids.push(m.id);
    }
    return [...new Set(ids)];
  };

  const send = () => {
    const s = socketRef.current;
    if (!s?.connected || !activeId || !text.trim()) return;
    s.emit('message:send', {
      conversationId: activeId,
      text: text.trim(),
      replyToId: replyTo?.id ?? null,
      mentionUserIds: collectMentions(),
    });
    setText('');
    setReplyTo(null);
  };

  const toggleReaction = (messageId: string, emoji: string, add: boolean) => {
    const s = socketRef.current;
    if (!s?.connected) return;
    s.emit('reaction:toggle', { messageId, emoji, add });
  };

  const titleFor = (c: (typeof convs)[number]) =>
    c.type === 'group' ? c.name ?? 'Группа' : c.peerEmail ?? 'Диалог';

  const myEmail = user?.email ?? '';

  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '280px minmax(0, 1fr)',
          gridTemplateRows: 'minmax(0, 1fr)',
          flex: 1,
          minHeight: 0,
          width: '100%',
          overflow: 'hidden',
          color: 'rgba(0,0,0,0.88)',
        }}
      >
      <div
        style={{
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          borderRight: `1px solid ${CHAT.sidebarBorder}`,
          background: CHAT.sidebarBg,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Space.Compact style={{ padding: 8, gap: 8, flexWrap: 'wrap' }}>
          <Button size="small" type="primary" onClick={() => setDmOpen(true)}>
            + Личный
          </Button>
          <Button size="small" onClick={() => setGrpOpen(true)}>
            + Группа
          </Button>
          <Button
            size="small"
            disabled={!activeId || !active || active.type !== 'group'}
            onClick={() => setMemOpen(true)}
          >
            + В группу
          </Button>
        </Space.Compact>
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <List
            size="small"
            dataSource={convs}
            renderItem={(c) => (
              <List.Item
                style={{
                  cursor: 'pointer',
                  background: c.id === activeId ? CHAT.listActive : undefined,
                  paddingInline: 12,
                }}
                onClick={() => setActiveId(c.id)}
              >
                <Typography.Text ellipsis>{titleFor(c)}</Typography.Text>
              </List.Item>
            )}
          />
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 0,
          background: CHAT.messagesBg,
        }}
      >
        {!activeId ? (
          <div
            style={{
              flex: '1 1 auto',
              minHeight: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography.Text type="secondary">Выберите чат слева</Typography.Text>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 0',
              minHeight: 0,
              height: '100%',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                flex: '1 1 0',
                minHeight: 0,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                background: CHAT.messagesBg,
              }}
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    border: `1px solid ${CHAT.bubbleBorder}`,
                    borderRadius: 12,
                    padding: '8px 12px',
                    background: m.sender_email === myEmail ? CHAT.bubbleOut : CHAT.bubbleIn,
                    alignSelf: m.sender_email === myEmail ? 'flex-end' : 'flex-start',
                    maxWidth: '78%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}
                >
                  {m.reply_preview && (
                    <div
                      style={{
                        borderLeft: '3px solid #177ddc',
                        paddingLeft: 8,
                        marginBottom: 6,
                        opacity: 0.85,
                        fontSize: 12,
                      }}
                    >
                      <Typography.Text type="secondary">
                        {m.reply_preview.sender_email}: {m.reply_preview.body.slice(0, 120)}
                      </Typography.Text>
                    </div>
                  )}
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {m.sender_email}
                  </Typography.Text>
                  <div style={{ marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {m.body}
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {dayjs(m.created_at).format('DD.MM.YYYY HH:mm')}
                  </Typography.Text>
                  {m.mentions?.length ? (
                    <div style={{ marginTop: 4 }}>
                      {m.mentions.map((e) => (
                        <Tag key={e} color="blue">
                          @{e}
                        </Tag>
                      ))}
                    </div>
                  ) : null}
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.reactions.map((r) => {
                      const mine = myEmail && r.emails.includes(myEmail);
                      return (
                        <Tag
                          key={r.emoji}
                          style={{ cursor: 'pointer', borderRadius: 12, padding: '0 8px' }}
                          onClick={() => toggleReaction(m.id, r.emoji, !mine)}
                        >
                          {r.emoji} {r.emails.length}
                        </Tag>
                      );
                    })}
                    <Popover
                      content={
                        <Space wrap>
                          {QUICK_EMOJIS.map((e) => (
                            <Button
                              key={e}
                              type="text"
                              size="small"
                              onClick={() => toggleReaction(m.id, e, true)}
                            >
                              {e}
                            </Button>
                          ))}
                        </Space>
                      }
                    >
                      <Button size="small" type="link">
                        Реакция
                      </Button>
                    </Popover>
                    <Button size="small" type="link" onClick={() => setReplyTo(m)}>
                      Ответить
                    </Button>
                  </div>
                </div>
              ))}
              <div ref={listEndRef} />
            </div>
            <div
              style={{
                flex: '0 0 auto',
                borderTop: `1px solid ${CHAT.inputBarBorder}`,
                background: CHAT.inputBarBg,
                padding: 8,
              }}
            >
              {replyTo && (
                <div style={{ marginBottom: 6, fontSize: 12 }}>
                  <Typography.Text type="secondary">
                    Ответ на {replyTo.sender_email}: {replyTo.body.slice(0, 80)}
                  </Typography.Text>{' '}
                  <Button type="link" size="small" onClick={() => setReplyTo(null)}>
                    отмена
                  </Button>
                </div>
              )}
              <Space.Compact style={{ width: '100%' }}>
                <Popover
                  content={
                    <div style={{ maxWidth: 220 }}>
                      <Space wrap>
                        {QUICK_EMOJIS.map((e) => (
                          <Button key={e} type="text" onClick={() => setText((t) => t + e)}>
                            {e}
                          </Button>
                        ))}
                      </Space>
                    </div>
                  }
                >
                  <Button>😀</Button>
                </Popover>
                <Input.TextArea
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Сообщение… (@email для упоминания)"
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                />
                <Button type="primary" onClick={() => send()}>
                  Отправить
                </Button>
              </Space.Compact>
            </div>
          </div>
        )}
      </div>
      </div>
      <Modal
        title="Новый личный чат"
        open={dmOpen}
        onCancel={() => setDmOpen(false)}
        onOk={async () => {
          const r = await createConv({ type: 'direct', peerEmail: dmEmail.trim() }).unwrap();
          setDmOpen(false);
          setDmEmail('');
          setActiveId(r.id);
        }}
      >
        <Typography.Paragraph type="secondary">
          Введите email пользователя, с которым нужен диалог.
        </Typography.Paragraph>
        <Input placeholder="email" value={dmEmail} onChange={(e) => setDmEmail(e.target.value)} />
      </Modal>
      <Modal
        title="Новая группа"
        open={grpOpen}
        onCancel={() => setGrpOpen(false)}
        onOk={async () => {
          const emails = grpEmails
            .split(/[\s,;]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          const r = await createConv({
            type: 'group',
            name: grpName.trim(),
            memberEmails: emails,
          }).unwrap();
          setGrpOpen(false);
          setGrpName('');
          setGrpEmails('');
          setActiveId(r.id);
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="Название группы" value={grpName} onChange={(e) => setGrpName(e.target.value)} />
          <Input.TextArea
            placeholder="Email участников через запятую"
            value={grpEmails}
            onChange={(e) => setGrpEmails(e.target.value)}
          />
        </Space>
      </Modal>
      <Modal
        title="Добавить в группу"
        open={memOpen}
        onCancel={() => setMemOpen(false)}
        onOk={async () => {
          if (!activeId) return;
          const emails = memEmails
            .split(/[\s,;]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          await addMembers({ id: activeId, emails }).unwrap();
          setMemOpen(false);
          setMemEmails('');
        }}
      >
        <Input.TextArea
          placeholder="Email через запятую"
          value={memEmails}
          onChange={(e) => setMemEmails(e.target.value)}
        />
      </Modal>
      </div>
    </ConfigProvider>
  );
};
