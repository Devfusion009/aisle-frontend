'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import { MessageSquare, Clock, User, Bot, ArrowLeft, Search, X, Zap, Trash2 } from 'lucide-react';
import { SkeletonConversationItem, SkeletonChatMessage } from '@/components/ui/skeleton-loaders';
import { useTranslation } from 'react-i18next';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

function getTimeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  // Force UTC parsing: if no timezone indicator, the server sent a naive timestamp
  // and the browser would wrongly interpret it as local time (causing timezone offset errors)
  let s = dateStr.replace(' ', 'T');
  if (!/Z|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z';
  const seconds = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (seconds < 60) return t('conversations.timeAgoSeconds', { count: seconds });
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t('conversations.timeAgoMinutes', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('conversations.timeAgoHours', { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t('conversations.timeAgoDays', { count: days });
  const months = Math.floor(days / 30);
  if (months < 12) return t('conversations.timeAgoMonths', { count: months });
  return t('conversations.timeAgoYears', { count: Math.floor(months / 12) });
}

type Filter = 'all' | 'active' | 'closed' | 'deleted';

interface AdminConversation {
  id: string;
  title: string;
  userName: string;
  assistantName: string;
  isActive: boolean;
  isDeletedByUser: boolean;
  messages: number;
  totalTokensUsed: number;
  timeAgo: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokensUsed: number;
  model: string | null;
  createdAt: string;
}

interface ConversationDetail {
  conversation: {
    id: string;
    title: string;
    userName: string;
    assistantName: string;
    assistantModel: string | null;
    isActive: boolean;
    createdAt: string;
  };
  messages: ChatMessage[];
}

function ChatBubble({ msg, assistantModel }: { msg: ChatMessage; assistantModel?: string | null }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system';
  const isFallback = !isUser && !!msg.model && !!assistantModel && msg.model !== assistantModel;

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
        isUser ? 'bg-[#06d4ef]/15 border border-[#06d4ef]/30'
        : isFallback ? 'bg-amber-500/15 border border-amber-500/30'
        : 'bg-slate-700/60 border border-slate-600/40'
      }`}>
        {isUser
          ? <User className="h-4 w-4 text-[#06d4ef]" />
          : isFallback
            ? <Zap className="h-4 w-4 text-amber-400" />
            : <Bot className="h-4 w-4 text-slate-300" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[72%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-[#06d4ef] text-white rounded-tr-sm'
            : isFallback
              ? 'bg-[#1e2226] border border-amber-500/25 text-slate-200 rounded-tl-sm'
              : 'bg-[#1e2226] border border-slate-700/60 text-slate-200 rounded-tl-sm'
        }`}>
          {msg.content}
        </div>
        <div className="flex items-center gap-2 px-1">
          <span className="text-[11px] text-slate-600">
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {msg.model && !isUser && (
            isFallback ? (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[10px] font-medium text-amber-400">
                <Zap className="h-2.5 w-2.5" />
                {msg.model}
                <span className="text-amber-400/50">fallback</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-700">{msg.model}</span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function ChatHistoryPanel({
  conversationId,
  isDeletedByUser,
  totalTokensUsed,
  onBack,
  onNotFound,
}: {
  conversationId: string;
  isDeletedByUser?: boolean;
  totalTokensUsed?: number;
  onBack: () => void;
  onNotFound: () => void;
}) {
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useSWR<ConversationDetail>(
    conversationId ? `/dashboard/conversations/${conversationId}/messages` : null,
    fetcher,
    { refreshInterval: 10000, shouldRetryOnError: false },
  );

  const isNotFound = error?.response?.status === 404 || error?.status === 404;

  useEffect(() => {
    if (isNotFound) onNotFound();
  }, [isNotFound]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="shrink-0 border-b border-slate-800 px-5 py-5 flex items-center gap-3 bg-[#111315]">
          <div className="h-9 w-9 rounded-full bg-slate-800/60 flex shrink-0 skeleton" />
          <div className="flex-1 min-w-0">
            <div className="h-4 w-32 bg-slate-800/60 rounded mb-2 skeleton" />
            <div className="h-3 w-20 bg-slate-800/60 rounded skeleton" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <SkeletonChatMessage isUser={true} />
          <SkeletonChatMessage />
          <SkeletonChatMessage isUser={true} />
        </div>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
        <div className="h-14 w-14 rounded-full bg-slate-800/60 border border-slate-700/40 flex items-center justify-center">
          <MessageSquare className="h-6 w-6 text-slate-600" />
        </div>
        <p className="text-slate-400 text-[14px] font-medium">{t('conversations.notFound')}</p>
        <p className="text-slate-600 text-[12px]">{t('conversations.notFoundDesc')}</p>
        <button
          onClick={onBack}
          className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t('conversations.backToList')}
        </button>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
        <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <MessageSquare className="h-6 w-6 text-red-400" />
        </div>
        <p className="text-red-400 text-[14px] font-medium">{t('errors.loadMessages')}</p>
        <button
          onClick={onBack}
          className="mt-1 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] text-slate-400 border border-slate-700 hover:border-slate-500 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t('conversations.backToList')}
        </button>
      </div>
    );
  }

  const { conversation, messages } = data;

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="shrink-0 border-b border-slate-800 px-5 py-4 flex items-center gap-3 bg-[#111315]">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="h-9 w-9 rounded-full bg-[#06d4ef]/10 border border-[#06d4ef]/20 flex items-center justify-center shrink-0">
          <MessageSquare className="h-4 w-4 text-[#06d4ef]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[14px] font-semibold text-slate-100 truncate">{conversation.userName}</span>
            {isDeletedByUser ? (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 text-red-400 bg-red-400/10 flex items-center gap-0.5">
                <Trash2 className="h-2.5 w-2.5" /> {t('conversations.deletedByUser')}
              </span>
            ) : (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                conversation.isActive
                  ? 'text-emerald-400 bg-emerald-400/10'
                  : 'text-slate-400 bg-slate-700/50'
              }`}>
                {conversation.isActive ? t('conversations.statusActive') : t('conversations.statusClosed')}
              </span>
            )}
          </div>
          <p className="text-[12px] text-slate-500 truncate">
            {conversation.title} · {conversation.assistantName}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[11px] text-slate-600">{messages.length} {t('conversations.msgs')}</span>
          {totalTokensUsed != null && totalTokensUsed > 0 && (
            <span className="text-[11px] text-slate-600 flex items-center gap-0.5">
              <Zap className="h-2.5 w-2.5" />{totalTokensUsed.toLocaleString()} {t('conversations.tok')}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <MessageSquare className="h-10 w-10 text-slate-700" />
            <p className="text-slate-500 text-[13px]">{t('conversations.noMessages')}</p>
          </div>
        ) : (
          <>
            {/* Date header */}
            <div className="flex justify-center">
              <span className="text-[11px] text-slate-500 bg-slate-800/60 px-3 py-1 rounded-full">
                {new Date(conversation.createdAt).toLocaleDateString([], {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </span>
            </div>
            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} assistantModel={conversation.assistantModel} />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default function AdminConversationsPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [leftWidth, setLeftWidth] = useState(380);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = ev.clientX - rect.left;
      setLeftWidth(Math.min(600, Math.max(220, newWidth)));
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const { data: conversations, error, isLoading, mutate } = useSWR<AdminConversation[]>(
    '/dashboard/conversations',
    fetcher,
    { refreshInterval: 15000 },
  );

  const handleNotFound = () => {
    setSelectedId(null);
    mutate();
  };

  const filtered = (conversations || []).filter((c) => {
    if (c.title?.startsWith('__pg__')) return false;
    if (filter === 'active') return c.isActive && !c.isDeletedByUser;
    if (filter === 'closed') return !c.isActive && !c.isDeletedByUser;
    if (filter === 'deleted') return c.isDeletedByUser;
    return true;
  }).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.userName.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.assistantName.toLowerCase().includes(q)
    );
  });

  const selectedConv = filtered.find((c) => c.id === selectedId) ?? null;

  // Auto-select first conversation (new chat by default)
  useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered.length]);

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden bg-[#111315]">
      {/* ── LEFT PANEL: Conversation List ── */}
      <div
        style={{ width: leftWidth }}
        className={`flex flex-col shrink-0 border-r border-slate-800 overflow-hidden ${
          selectedId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 px-5 pt-6 pb-3 border-b border-slate-800">
          <h1 className="text-xl font-bold text-slate-100 mb-0.5">{t('conversations.title')}</h1>
          <p className="text-[12px] text-slate-500 mb-3">{t('conversations.subtitle')}</p>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('conversations.searchPlaceholder')}
              className="w-full pl-8 pr-8 py-2 rounded-lg bg-[#1a1d21] border border-slate-700 text-[12.5px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-[#06d4ef]/50"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-slate-500 hover:text-slate-300" />
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {(['all', 'active', 'closed', 'deleted'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-[12px] font-medium transition-colors border ${
                  filter === f
                    ? f === 'deleted'
                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                      : 'bg-[#06d4ef] text-white border-[#06d4ef]'
                    : 'bg-transparent text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200'
                }`}
              >
                {f === 'all' ? t('conversations.filterAll') : f === 'active' ? t('conversations.filterActive') : f === 'closed' ? t('conversations.filterClosed') : t('conversations.filterDeleted')}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonConversationItem key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="px-5 py-10 text-center text-red-400 text-[12px]">
              {t('errors.loadConversations')}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <MessageSquare className="h-8 w-8 mx-auto text-slate-700 mb-2" />
              <p className="text-slate-500 text-[12px]">{t('conversations.noConversations')}</p>
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3.5 border-b border-slate-800/60 transition-colors ${
                    selectedId === conv.id
                      ? 'bg-[#06d4ef]/8 border-l-2 border-l-[#06d4ef]'
                      : 'hover:bg-[#1e2226]'
                  }`}
                >
                  {/* Avatar */}
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    selectedId === conv.id
                      ? 'bg-[#06d4ef]/15 border border-[#06d4ef]/30'
                      : 'bg-slate-700/50 border border-slate-600/30'
                  }`}>
                    <MessageSquare className={`h-4 w-4 ${selectedId === conv.id ? 'text-[#06d4ef]' : 'text-slate-400'}`} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[13px] font-semibold text-slate-100 truncate">{conv.userName}</span>
                      {conv.isDeletedByUser ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 text-red-400 bg-red-400/10 flex items-center gap-0.5">
                          <Trash2 className="h-2.5 w-2.5" /> {t('conversations.filterDeleted')}
                        </span>
                      ) : (
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0 ${
                          conv.isActive
                            ? 'text-emerald-400 bg-emerald-400/10'
                            : 'text-slate-500 bg-slate-700/40'
                        }`}>
                          {conv.isActive ? t('conversations.statusActive') : t('conversations.statusClosed')}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-slate-400 truncate">{conv.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-600">
                      <span className="truncate max-w-[100px]">{conv.assistantName}</span>
                      <span>·</span>
                      <span>{conv.messages} {t('conversations.msgs')}</span>
                      {conv.totalTokensUsed > 0 && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5 shrink-0">
                            <Zap className="h-2.5 w-2.5" />
                            {conv.totalTokensUsed.toLocaleString()}
                          </span>
                        </>
                      )}
                      <span>·</span>
                      <span className="flex items-center gap-0.5 shrink-0">
                        <Clock className="h-2.5 w-2.5" />
                        {getTimeAgo(conv.createdAt, t)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DRAG HANDLE ── */}
      <div
        onMouseDown={handleDragStart}
        className="hidden md:flex w-1 shrink-0 cursor-col-resize items-center justify-center group relative z-10 hover:bg-[#06d4ef]/20 transition-colors"
        title={t('conversations.dragResize')}
      >
        <div className="w-0.5 h-8 rounded-full bg-slate-700 group-hover:bg-[#06d4ef]/60 transition-colors" />
      </div>

      {/* ── RIGHT PANEL: Chat History ── */}
      <div className={`flex-1 flex flex-col min-w-0 ${
        selectedId ? 'flex' : 'hidden md:flex'
      }`}>
        {selectedId ? (
          <ChatHistoryPanel
            key={selectedId}
            conversationId={selectedId}
            isDeletedByUser={selectedConv?.isDeletedByUser}
            totalTokensUsed={selectedConv?.totalTokensUsed}
            onBack={() => setSelectedId(null)}
            onNotFound={handleNotFound}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <div className="h-16 w-16 rounded-full bg-slate-800/60 border border-slate-700/40 flex items-center justify-center">
              <MessageSquare className="h-7 w-7 text-slate-600" />
            </div>
            <p className="text-slate-400 text-[14px] font-medium">{t('conversations.selectConversation')}</p>
            <p className="text-slate-600 text-[12px]">{t('conversations.selectConversationDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
