import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Dropdown,
  Input,
  List,
  Modal,
  Popover,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  MessageOutlined,
  SmileOutlined,
  SendOutlined,
  UserAddOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  useConversationsQuery,
  useCreateDirectMutation,
  useCreateGroupMutation,
  useAddMembersMutation,
  useLazyMessagesQuery,
  useMembersQuery,
  useMeQuery,
  useUsersDirectoryQuery,
} from '../store/api';
import { getChatSocket } from '../ws/chatSocket';
import { upsertConversationInListCache } from '../store/conversationCache';

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderEmail: string;
  body: string;
  replyToId: string | null;
  mentions: string[];
  createdAt: string;
  reactions: { userId: string; emoji: string }[];
  replyPreview?: { id: string; senderEmail: string; body: string } | null;
};

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '😀', '😂', '🤔', '👀', '🎉', '💯', '✅', '⭐', '🙏'];

const bubbleStyle: CSSProperties = {
  border: '1px solid #cfe8ff',
  borderRadius: 12,
  padding: '10px 12px',
  marginBottom: 10,
  background: 'linear-gradient(180deg,#ffffff,#f3fbff)',
  boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
};

export const ChatPage = () => {
  const { data: me } = useMeQuery();
  const { data: convs = [], refetch: refetchConvs } = useConversationsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });
  const { data: directory = [] } = useUsersDirectoryQuery();
  const [active, setActive] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  activeRef.current = active;

  const { data: members = [] } = useMembersQuery({ id: active as string }, { skip: !active });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fetchMessages] = useLazyMessagesQuery();
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  const [directOpen, setDirectOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [peer, setPeer] = useState<string | undefined>();
  const [gTitle, setGTitle] = useState('');
  const [gMembers, setGMembers] = useState<string[]>([]);
  const [moreMembers, setMoreMembers] = useState<string[]>([]);

  const [createDirect, { isLoading: directCreating }] = useCreateDirectMutation();
  const [createGroup, { isLoading: groupCreating }] = useCreateGroupMutation();
  const [addMembers, { isLoading: membersAdding }] = useAddMembersMutation();

  const convTitle = (c: (typeof convs)[number]) => {
    if (c.kind === 'group') return c.title ?? 'Группа';
    return c.peer_email ? `Личный: ${c.peer_email}` : 'Личный чат';
  };

  const peers = useMemo(
    () => directory.filter((u) => u.id !== me?.id),
    [directory, me?.id],
  );

  useEffect(() => {
    if (!active) {
      setMessages([]);
      return;
    }
    void fetchMessages({ id: active })
      .unwrap()
      .then((rows) => setMessages(rows as ChatMessage[]))
      .catch(() => message.error('Не удалось загрузить сообщения'));
  }, [active, fetchMessages]);

  useEffect(() => {
    let s: ReturnType<typeof getChatSocket>;
    try {
      s = getChatSocket();
    } catch {
      return;
    }
    const onMsg = (dto: ChatMessage) => {
      if (dto.conversationId !== activeRef.current) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === dto.id)) return prev;
        return [...prev, dto];
      });
    };
    const onReaction = (payload: {
      messageId: string;
      reactions: { userId: string; emoji: string }[];
    }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m,
        ),
      );
    };
    s.on('chat:message', onMsg);
    s.on('chat:reaction', onReaction);
    return () => {
      s.off('chat:message', onMsg);
      s.off('chat:reaction', onReaction);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    try {
      const s = getChatSocket();
      s.emit('join', { conversationId: active }, (ack: { ok?: boolean; error?: string }) => {
        if (!ack?.ok) {
          message.error(ack?.error ?? 'Не удалось присоединиться к комнате');
        }
      });
    } catch {
      message.error('Нет соединения с сокетами');
    }
  }, [active]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, active]);

  const parseMentions = (text: string) => {
    const ids: string[] = [];
    for (const m of members) {
      if (text.includes(`@${m.email}`)) ids.push(m.id);
    }
    return Array.from(new Set(ids));
  };

  const send = () => {
    const trimmed = body.trim();
    if (!active || !trimmed) return;
    try {
      const s = getChatSocket();
      const mentions = parseMentions(trimmed);
      s.emit(
        'send_message',
        {
          conversationId: active,
          body: trimmed,
          replyToId: replyTo?.id ?? null,
          mentions,
        },
        (ack: { ok?: boolean; error?: string }) => {
          if (!ack?.ok) message.error(ack?.error ?? 'Не отправлено');
        },
      );
      setBody('');
      setReplyTo(null);
    } catch {
      message.error('Нет соединения с сокетами');
    }
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    try {
      const s = getChatSocket();
      s.emit('toggle_reaction', { messageId, emoji }, (ack: { ok?: boolean }) => {
        if (!ack?.ok) message.error('Не удалось поставить реакцию');
      });
    } catch {
      message.error('Нет соединения с сокетами');
    }
  };

  const activeConv = convs.find((c) => c.id === active);

  const renderBodyWithMentions = (text: string) => {
    const parts = text.split(/(@[^\s]+)/g);
    return parts.map((p, i) => {
      if (p.startsWith('@')) {
        return (
          <Typography.Text key={i} type="warning" style={{ fontWeight: 600 }}>
            {p}
          </Typography.Text>
        );
      }
      return <span key={i}>{p}</span>;
    });
  };

  const groupedReactions = (rs: { userId: string; emoji: string }[]) => {
    const map = new Map<string, number>();
    for (const r of rs) {
      map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1);
    }
    return Array.from(map.entries());
  };

  const onCreateDirect = async () => {
    if (!peer) {
      message.warning('Выберите пользователя');
      return Promise.reject(new Error('validation'));
    }
    try {
      const res = await createDirect({ peerUserId: peer }).unwrap();
      upsertConversationInListCache(res);
      setDirectOpen(false);
      setPeer(undefined);
      setActive(res.id);
      void refetchConvs();
    } catch (e) {
      message.error('Не удалось создать чат');
      throw e;
    }
  };

  const onCreateGroup = async () => {
    if (!gTitle.trim() || gMembers.length === 0) {
      message.warning('Укажите название группы и хотя бы одного участника');
      return Promise.reject(new Error('validation'));
    }
    try {
      const res = await createGroup({ title: gTitle.trim(), memberIds: gMembers }).unwrap();
      upsertConversationInListCache(res);
      setGroupOpen(false);
      setGTitle('');
      setGMembers([]);
      setActive(res.id);
      void refetchConvs();
    } catch (e) {
      message.error('Не удалось создать группу');
      throw e;
    }
  };

  const onAddMembers = async () => {
    if (!active || moreMembers.length === 0) {
      message.warning('Выберите пользователей');
      return Promise.reject(new Error('validation'));
    }
    try {
      await addMembers({ id: active, userIds: moreMembers }).unwrap();
      setAddMembersOpen(false);
      setMoreMembers([]);
      message.success('Участники добавлены');
      void refetchConvs();
    } catch (e) {
      message.error('Не удалось добавить участников');
      throw e;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div
        style={{
          width: 300,
          borderRight: '1px solid #f0f0f0',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button block icon={<MessageOutlined />} onClick={() => setDirectOpen(true)}>
              Личный чат
            </Button>
            <Button block icon={<TeamOutlined />} onClick={() => setGroupOpen(true)}>
              Новая группа
            </Button>
          </Space>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <List
            rowKey="id"
            dataSource={convs}
            renderItem={(c) => (
              <List.Item
                onClick={() => setActive(c.id)}
                style={{
                  cursor: 'pointer',
                  background: c.id === active ? '#e6f7ff' : undefined,
                  paddingInline: 12,
                }}
              >
                <List.Item.Meta title={convTitle(c)} description={c.kind === 'group' ? 'Группа' : 'Личный'} />
              </List.Item>
            )}
          />
        </div>
        {activeConv?.kind === 'group' && (
          <div style={{ padding: 12, borderTop: '1px solid #f0f0f0' }}>
            <Button block icon={<UserAddOutlined />} onClick={() => setAddMembersOpen(true)}>
              Добавить в группу
            </Button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        {!active && (
          <div style={{ padding: 24 }}>
            <Typography.Title level={4}>Выберите беседу</Typography.Title>
            <Typography.Paragraph type="secondary">
              Создайте личный чат или группу слева.
            </Typography.Paragraph>
          </div>
        )}
        {active && (
          <>
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: 16,
                background: 'linear-gradient(180deg,#e9f4ff,#f6fbff)',
              }}
            >
              {messages.map((m) => (
                <div key={m.id} style={bubbleStyle}>
                  <Space direction="vertical" style={{ width: '100%' }} size={6}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <Typography.Text strong>{m.senderEmail}</Typography.Text>
                      <Typography.Text type="secondary">
                        {dayjs(m.createdAt).format('DD.MM.YYYY HH:mm')}
                      </Typography.Text>
                    </div>
                    {m.replyPreview && (
                      <div
                        style={{
                          borderLeft: '3px solid #1890ff',
                          paddingLeft: 8,
                          background: 'rgba(24,144,255,0.06)',
                          borderRadius: 6,
                        }}
                      >
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {m.replyPreview.senderEmail}
                        </Typography.Text>
                        <div style={{ fontSize: 13 }}>{m.replyPreview.body}</div>
                      </div>
                    )}
                    <Typography.Paragraph style={{ marginBottom: 6, whiteSpace: 'pre-wrap' }}>
                      {renderBodyWithMentions(m.body)}
                    </Typography.Paragraph>
                    <Space size={[4, 4]} wrap>
                      {groupedReactions(m.reactions).map(([emoji, count]) => (
                        <Tag
                          key={emoji}
                          style={{ cursor: 'pointer', borderRadius: 14, padding: '2px 8px' }}
                          onClick={() => toggleReaction(m.id, emoji)}
                        >
                          {emoji} {count}
                        </Tag>
                      ))}
                    </Space>
                    <Space>
                      <Button size="small" type="link" onClick={() => setReplyTo(m)}>
                        Ответить
                      </Button>
                      <Dropdown
                        menu={{
                          items: QUICK_EMOJIS.map((e) => ({
                            key: e,
                            label: e,
                            onClick: () => toggleReaction(m.id, e),
                          })),
                        }}
                        trigger={['click']}
                      >
                        <Button size="small" type="link" icon={<SmileOutlined />}>
                          Реакция
                        </Button>
                      </Dropdown>
                    </Space>
                  </Space>
                </div>
              ))}
              <div ref={listEndRef} />
            </div>
            <div style={{ borderTop: '1px solid #f0f0f0', padding: 12, background: '#fff' }}>
              {replyTo && (
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <Typography.Text type="secondary">
                    Ответ на: <b>{replyTo.senderEmail}</b> — {replyTo.body.slice(0, 80)}
                    {replyTo.body.length > 80 ? '…' : ''}
                  </Typography.Text>
                  <Button type="link" size="small" onClick={() => setReplyTo(null)}>
                    Отмена
                  </Button>
                </div>
              )}
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Input.TextArea
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Сообщение… Упоминания: @email участника"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Popover
                    content={
                      <div style={{ maxWidth: 260 }}>
                        <Space wrap>
                          {QUICK_EMOJIS.map((e) => (
                            <Button key={e} size="small" type="text" onClick={() => setBody((b) => `${b}${e}`)}>
                              {e}
                            </Button>
                          ))}
                        </Space>
                      </div>
                    }
                    title="Смайлы"
                    trigger="click"
                  >
                    <Button icon={<SmileOutlined />}>Смайлы</Button>
                  </Popover>
                  <Button type="primary" icon={<SendOutlined />} onClick={send}>
                    Отправить
                  </Button>
                </div>
              </Space>
            </div>
          </>
        )}
      </div>

      <Modal
        title="Новый личный чат"
        open={directOpen}
        onCancel={() => setDirectOpen(false)}
        onOk={onCreateDirect}
        confirmLoading={directCreating}
        okText="Создать"
      >
        <Typography.Paragraph type="secondary">
          Выберите пользователя для индивидуального чата.
        </Typography.Paragraph>
        <Select
          showSearch
          optionFilterProp="label"
          style={{ width: '100%' }}
          placeholder="Пользователь"
          options={peers.map((u) => ({ value: u.id, label: u.email }))}
          value={peer}
          onChange={setPeer}
        />
      </Modal>

      <Modal
        title="Новая группа"
        open={groupOpen}
        onCancel={() => setGroupOpen(false)}
        onOk={onCreateGroup}
        confirmLoading={groupCreating}
        okText="Создать"
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="Название группы" value={gTitle} onChange={(e) => setGTitle(e.target.value)} />
          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="Участники"
            options={peers.map((u) => ({ value: u.id, label: u.email }))}
            value={gMembers}
            onChange={setGMembers}
          />
        </Space>
      </Modal>

      <Modal
        title="Добавить участников"
        open={addMembersOpen}
        onCancel={() => setAddMembersOpen(false)}
        onOk={onAddMembers}
        confirmLoading={membersAdding}
        okText="Добавить"
      >
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          placeholder="Пользователи"
          options={peers
            .filter((u) => !members.some((m) => m.id === u.id))
            .map((u) => ({ value: u.id, label: u.email }))}
          value={moreMembers}
          onChange={setMoreMembers}
        />
      </Modal>
    </div>
  );
};
