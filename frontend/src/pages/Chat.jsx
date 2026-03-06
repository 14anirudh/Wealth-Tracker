import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Car,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  MessageSquare,
  MessageSquarePlus,
  Plus,
  SendHorizontal,
  Shield,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { chatAPI } from '../services/api';

const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const formatTime = (isoDate) =>
  new Date(isoDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const starterPrompts = [
  {
    title: 'Am I saving enough?',
    subtitle: 'Analyze current savings vs goals',
    icon: HelpCircle,
    prompt: 'Am I saving enough?',
    accent: 'text-[#3b82f6] bg-[#dbeafe]',
  },
  {
    title: 'Buy a car worth 8L?',
    subtitle: 'Check affordability and impact',
    icon: Car,
    prompt: 'Can I buy a car worth 8L?',
    accent: 'text-[#7c3aed] bg-[#ede9fe]',
  },
  {
    title: 'Review my finances',
    subtitle: 'Full monthly breakdown report',
    icon: BarChart3,
    prompt: 'Review my finances',
    accent: 'text-[#059669] bg-[#d1fae5]',
  },
  {
    title: 'Is my portfolio risky?',
    subtitle: 'Risk tolerance & exposure check',
    icon: Shield,
    prompt: 'Is my portfolio risky?',
    accent: 'text-[#ef4444] bg-[#fee2e2]',
  },
  {
    title: 'How long to reach 50L?',
    subtitle: 'Compound interest projections',
    icon: TrendingUp,
    prompt: 'How long to reach 50L?',
    accent: 'text-[#ca8a04] bg-[#fef3c7]',
  },
  {
    title: 'Split 1L salary?',
    subtitle: 'Budgeting 50/30/20 strategy',
    icon: Wallet,
    prompt: 'How should I split 1L salary?',
    accent: 'text-[#4f46e5] bg-[#e0e7ff]',
  },
];

const normalizeConversation = (conversation) => ({
  id: conversation.id || conversation._id,
  title: conversation.title || 'New chat',
  createdAt: conversation.createdAt || new Date().toISOString(),
  updatedAt: conversation.updatedAt || conversation.createdAt || new Date().toISOString(),
  messages: (conversation.messages || []).map((msg) => ({
    id: msg.id || msg._id || makeId(),
    role: msg.role,
    content: msg.content,
    meta: msg.meta,
    createdAt: msg.createdAt || new Date().toISOString(),
  })),
});

const Chat = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedStarterPrompt, setSelectedStarterPrompt] = useState('');
  const [pendingStarterPrompt, setPendingStarterPrompt] = useState('');
  const [animatedMessages, setAnimatedMessages] = useState({});
  const animatedMessageIdsRef = useRef(new Set());
  const activeAnimationRef = useRef({ timer: null, messageId: null });

  useEffect(() => {
    let cancelled = false;

    const fetchConversations = async () => {
      try {
        const response = await chatAPI.getConversations();
        const list = Array.isArray(response.data?.conversations) ? response.data.conversations : [];
        const normalized = list.map(normalizeConversation);
        const existingAssistantIds = new Set();
        normalized.forEach((conv) => {
          (conv.messages || []).forEach((msg) => {
            if (msg.role === 'assistant') {
              existingAssistantIds.add(msg.id);
            }
          });
        });
        if (!cancelled) {
          animatedMessageIdsRef.current = existingAssistantIds;
          setConversations(normalized);
          setActiveConversationId(normalized[0]?.id || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || 'Failed to load chats');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchConversations();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeConversationId) || null,
    [conversations, activeConversationId]
  );

  const createConversation = () => {
    setActiveConversationId(null);
    setError('');
    setSelectedStarterPrompt('');
    setPendingStarterPrompt('');
  };

  useEffect(() => {
    const active = activeConversation;
    if (!active?.messages?.length) return undefined;

    const lastAssistant = [...active.messages]
      .reverse()
      .find((msg) => msg.role === 'assistant' && msg.meta?.llm?.used && msg.content?.trim());

    if (!lastAssistant) return undefined;
    if (animatedMessageIdsRef.current.has(lastAssistant.id)) return undefined;
    if (activeAnimationRef.current.messageId === lastAssistant.id) return undefined;

    const chunks = `${lastAssistant.content}`.match(/\S+\s*/g) || [];
    if (!chunks.length) return undefined;

    if (activeAnimationRef.current.timer) {
      clearInterval(activeAnimationRef.current.timer);
      activeAnimationRef.current = { timer: null, messageId: null };
    }

    setAnimatedMessages((prev) => ({ ...prev, [lastAssistant.id]: '' }));
    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      const nextText = chunks.slice(0, index).join('');
      setAnimatedMessages((prev) => ({ ...prev, [lastAssistant.id]: nextText }));

      if (index >= chunks.length) {
        clearInterval(timer);
        activeAnimationRef.current = { timer: null, messageId: null };
        animatedMessageIdsRef.current.add(lastAssistant.id);
      }
    }, 35);

    activeAnimationRef.current = { timer, messageId: lastAssistant.id };

    return () => {
      if (activeAnimationRef.current.timer === timer) {
        clearInterval(timer);
        activeAnimationRef.current = { timer: null, messageId: null };
      }
    };
  }, [activeConversation]);

  const sendMessage = async (messageText) => {
    const trimmed = `${messageText || ''}`.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError('');
    setInput('');
    setPendingStarterPrompt(trimmed);

    try {
      const response = await chatAPI.sendMessage(trimmed, activeConversationId);
      const payload = response.data || {};
      const savedConversation = payload.conversation ? normalizeConversation(payload.conversation) : null;

      if (savedConversation) {
        setConversations((prev) => [savedConversation, ...prev.filter((conv) => conv.id !== savedConversation.id)]);
        setActiveConversationId(savedConversation.id);
      }
    } catch (err) {
      const apiError = err?.response?.data?.message || 'Failed to send message';
      setError(apiError);
    } finally {
      setSending(false);
      setPendingStarterPrompt('');
      setSelectedStarterPrompt('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleDeleteConversation = async (conversationId) => {
    const target = conversations.find((conv) => conv.id === conversationId);
    if (!target || deletingConversationId) return;

    const confirmed = window.confirm(`Delete "${target.title}" chat?`);
    if (!confirmed) return;

    setDeletingConversationId(conversationId);
    setError('');

    try {
      await chatAPI.deleteConversation(conversationId);
      const remaining = conversations.filter((conv) => conv.id !== conversationId);
      setConversations(remaining);
      if (activeConversationId === conversationId) {
        setActiveConversationId(remaining[0]?.id || null);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete chat');
    } finally {
      setDeletingConversationId(null);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden flex bg-[#f3f4f6] dark:bg-[#111315] text-[#111827] dark:text-[#e5e7eb]">
      <aside
        className={`h-full border-r border-black/10 dark:border-white/10 bg-[#ececef] dark:bg-[#17191b] hidden md:flex md:flex-col sticky top-0 transition-all duration-200 ${
          sidebarCollapsed ? 'w-[84px]' : 'w-[250px]'
        }`}
      >
        <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2">
            {!sidebarCollapsed && (
              <h2 className="text-[20px] tracking-[0.32em] font-semibold text-[#111] dark:text-[#9ca3af]">CHATS</h2>
            )}
            <button
              type="button"
              onClick={() => createConversation()}
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#3f4147] dark:text-[#d1d5db] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label="New chat"
              title="New chat"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#3f4147] dark:text-[#d1d5db] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {!sidebarCollapsed && (
            <div className="mb-4">
              {/* <p className="text-sm leading-none font-semibold text-[#737784] dark:text-[#c6c9d1] mb-2">All chats</p> */}
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#9a9fab] dark:text-[#9ca3af]">Last 7 days</p>
            </div>
          )}
          {conversations.map((conv) => (
            <div key={conv.id} className="group relative">
              <button
                type="button"
                onClick={() => setActiveConversationId(conv.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors ${
                  conv.id === activeConversationId
                    ? 'bg-black/10 dark:bg-white/10'
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                } ${sidebarCollapsed ? '' : 'pr-10'}`}
                title={conv.title}
              >
                {sidebarCollapsed ? (
                  <div className="h-2.5 w-2.5 rounded-full bg-[#555963] mx-auto" />
                ) : (
                  <>
                    <p className="text-sm leading-snug text-[#2f3137] dark:text-[#e5e7eb] truncate">{conv.title}</p>
                    <p className="text-[9px] opacity-60 mt-1">{formatTime(conv.updatedAt)}</p>
                  </>
                )}
              </button>
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                  disabled={Boolean(deletingConversationId)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-md text-[#555963] hover:text-red-600 hover:bg-black/5 dark:hover:bg-white/10 transition-all ${
                    conv.id === activeConversationId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  } ${deletingConversationId ? 'cursor-not-allowed opacity-50' : ''}`}
                  aria-label={`Delete ${conv.title}`}
                  title="Delete chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {!loading && !conversations.length && (
            <p className={`text-sm opacity-60 px-2 py-4 ${sidebarCollapsed ? 'text-center' : ''}`}>
              {sidebarCollapsed ? '-' : 'No chats yet'}
            </p>
          )}
        </div>
      </aside>

      <section className="flex-1 min-w-0 h-full flex flex-col">
        <div className="md:hidden px-4 pt-4">
          <button
            type="button"
            onClick={() => createConversation()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#161717] text-white dark:bg-white dark:text-[#111315] px-3 py-2 font-medium"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
          {conversations.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setActiveConversationId(conv.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs ${
                    conv.id === activeConversationId
                      ? 'bg-[#111827] text-white dark:bg-white dark:text-[#111827]'
                      : 'bg-black/5 dark:bg-white/10'
                  }`}
                >
                  {conv.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {loading ? (
            <div className="max-w-3xl mx-auto h-full flex items-center justify-center text-sm opacity-70">Loading chats...</div>
          ) : !activeConversation?.messages?.length ? (
            <div className="max-w-3xl mx-auto h-full flex flex-col items-center justify-center text-center">
              <h1 className="text-4xl font-semibold mb-2 text-[#0f1f4a] dark:text-[#cfd8ee]">What are you working on?</h1>
              <p className="text-base text-[#6b7280] dark:text-[#9ca3af] mb-8">
                Ask me anything about your finances, portfolio, or future goals.
              </p>
              {!pendingStarterPrompt && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 w-full">
                  {starterPrompts.map((item) => {
                    const Icon = item.icon;
                    const isSelected = item.prompt === selectedStarterPrompt || item.prompt === pendingStarterPrompt;
                    return (
                    <button
                      key={item.prompt}
                      type="button"
                      onClick={() => {
                        setSelectedStarterPrompt(item.prompt);
                        sendMessage(item.prompt);
                      }}
                      disabled={sending}
                      className={`text-left rounded-2xl p-4 border transition-all ${
                        isSelected
                          ? 'border-[#1d4ed8] bg-white dark:bg-[#202329] shadow-sm'
                          : 'border-transparent bg-transparent hover:bg-white/75 dark:hover:bg-[#1a1c1f]'
                      } ${sending ? 'opacity-75 cursor-not-allowed' : ''}`}
                    >
                      <div className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${item.accent}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-3 text-base font-semibold leading-snug text-[#1f2937] dark:text-[#e5e7eb]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-[#94a3b8] dark:text-[#9ca3af]">{item.subtitle}</p>
                    </button>
                    );
                  })}
                </div>
              )}
              {pendingStarterPrompt && (
                <div className="w-full mt-5 space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-[#111827] text-white dark:bg-[#f9fafb] dark:text-[#111827]">
                      <p className="whitespace-pre-wrap text-sm md:text-base">{pendingStarterPrompt}</p>
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-4 py-3 bg-white border border-black/10 dark:bg-[#1a1c1f] dark:border-white/10 text-sm opacity-70">
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-5">
              {activeConversation.messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-[#111827] text-white dark:bg-[#f9fafb] dark:text-[#111827]'
                        : 'bg-white border border-black/10 dark:bg-[#1a1c1f] dark:border-white/10'
                    }`}
                  >
                    <p className="whitespace-pre-wrap text-sm md:text-base">
                      {msg.role === 'assistant' && msg.meta?.llm?.used
                        ? animatedMessages[msg.id] ?? msg.content
                        : msg.content}
                    </p>
                    {msg.role === 'assistant' && msg.meta?.llm?.used === false && msg.meta?.llm?.error && (
                      <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                        LLM fallback: {msg.meta.llm.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {sending && pendingStarterPrompt && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-[#111827] text-white dark:bg-[#f9fafb] dark:text-[#111827]">
                    <p className="whitespace-pre-wrap text-sm md:text-base">{pendingStarterPrompt}</p>
                  </div>
                </div>
              )}
              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 bg-white border border-black/10 dark:bg-[#1a1c1f] dark:border-white/10 text-sm opacity-70">
                    Thinking...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 md:px-8 pb-4 md:pb-6 pt-2 md:pt-3 bg-gradient-to-t from-[#f3f4f6] via-[#f3f4f6] dark:from-[#111315] dark:via-[#111315] to-transparent sticky bottom-0">
          <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 rounded-3xl border border-black/15 dark:border-white/15 bg-white dark:bg-[#17191c] px-4 py-2.5 shadow-sm">
              <MessageSquare className="h-5 w-5 shrink-0 opacity-60" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about savings, risk, affordability, salary split..."
                className="flex-1 min-w-0 bg-transparent outline-none py-2 text-sm md:text-base"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className="inline-flex items-center justify-center rounded-2xl bg-[#111827] text-white dark:bg-white dark:text-[#111827] h-11 w-11 shrink-0 disabled:opacity-50"
                aria-label="Send"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </div>
            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          </form>
        </div>
      </section>
    </div>
  );
};

export default Chat;
