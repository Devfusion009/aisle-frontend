'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { useChat, Assistant, FallbackState } from '@/hooks/use-chat';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { AlertCircle, Sun, Moon, Bot, ChevronDown, Check, Zap, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/use-chat-store';

interface ChatInterfaceProps {
  conversationId?: string;
  onNewConversation?: (id: string) => void;
}

// ── Assistant Selector Dropdown ──────────────────────────────────────────
function AssistantSelector({
  assistants,
  selectedId,
  lockedName,
  onSelect,
}: {
  assistants: Assistant[];
  selectedId: string | undefined;
  lockedName: string | undefined;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const selected = assistants.find((a) => a.id === selectedId);
  const displayName = lockedName || selected?.name || t('chat.selectAssistant');

  const activeAssistants = assistants.filter((a) => a.isActive);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? activeAssistants.filter((a) =>
        a.name.toLowerCase().includes(q) ||
        (a.model || '').toLowerCase().includes(q) ||
        (a.linkedDatasets || []).some((d) => d.name.toLowerCase().includes(q))
      )
    : activeAssistants;
  const showSearch = activeAssistants.length > 5;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !lockedName && setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all',
          lockedName
            ? 'text-slate-500 dark:text-slate-400 cursor-default'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
        )}
      >
        <Bot className="h-4 w-4 text-[#06d4ef]" />
        <span className="max-w-[200px] truncate">{displayName}</span>
        {!lockedName && <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />}
      </button>

      {open && !lockedName && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[300px] rounded-2xl border border-slate-700/60 bg-[#13161a] shadow-2xl py-2 animate-in fade-in slide-in-from-top-1 duration-150">
          {showSearch && (
            <div className="px-3 pb-2">
              <div className="relative flex items-center rounded-lg border border-slate-700/80 bg-slate-900/60 hover:border-slate-600 focus-within:border-[#06d4ef]/60 transition-colors">
                <Search className="h-3.5 w-3.5 ml-2.5 text-slate-500 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={t('chat.searchAssistants', 'Search assistants...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-[12.5px] py-1.5 px-2 outline-none text-slate-200 placeholder:text-slate-500"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                    className="mr-1.5 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="max-h-[320px] overflow-y-auto assistant-scroll">
            {filtered.length > 0 ? (
              filtered.map((a, i, arr) => (
                <div key={a.id}>
                  <button
                    onClick={() => { onSelect(a.id); setOpen(false); }}
                    className={cn(
                      'flex items-start gap-3 w-full px-4 py-3 text-[13px] text-left transition-colors',
                      a.id === selectedId
                        ? 'bg-[#06d4ef]/10 text-[#06d4ef]'
                        : 'text-slate-300 hover:bg-slate-800/60'
                    )}
                  >
                    <div className={cn(
                      'mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0',
                      a.id === selectedId ? 'bg-[#06d4ef]/15' : 'bg-slate-800'
                    )}>
                      <Bot className={cn('h-3.5 w-3.5', a.id === selectedId ? 'text-[#06d4ef]' : 'text-slate-400')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[13px] truncate leading-tight">{a.name}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{a.model}</p>
                      {a.linkedDatasets && a.linkedDatasets.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                          {a.linkedDatasets.map((ds) => (
                            <span key={ds.id} className="flex items-center gap-1 text-[10px] text-slate-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-[#06d4ef]/50 shrink-0" />
                              {ds.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {a.id === selectedId && <Check className="h-3.5 w-3.5 shrink-0 mt-1 text-[#06d4ef]" />}
                  </button>
                  {i < arr.length - 1 && <div className="mx-4 border-t border-slate-800/60" />}
                </div>
              ))
            ) : (
              <p className="px-4 py-3 text-[12px] text-slate-500 italic">
                {q ? t('chat.noAssistantsFound', 'No assistants match your search') : t('chat.noAssistants')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fallback Model Banner ────────────────────────────────────────────────
function FallbackBanner({
  state,
  onRetry,
  onDismiss,
}: {
  state: FallbackState;
  onRetry: (provider: string, model: string, label: string) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mx-4 mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="flex items-start gap-3">
        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <div className="flex-1 min-w-0">
          <p className="text-amber-300 font-medium mb-0.5">{t('chat.fallback.title', 'Primary model unavailable')}</p>
          <p className="text-red-400 text-xs mb-3">{state.error}</p>
          <p className="text-amber-300/70 text-xs mb-2">
            {t('chat.fallback.prompt', 'Switch to a fallback model? Your conversation history and knowledge base will be preserved.')}
          </p>
          <div className="flex flex-wrap gap-2">
            {state.options.map((opt) => (
              <button
                key={`${opt.provider}/${opt.model}`}
                onClick={() => onRetry(opt.provider, opt.model, opt.label)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
              >
                <Zap className="h-3 w-3" />
                {opt.label}
                <span className="text-amber-400/50 font-normal">— {opt.description}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={onDismiss} className="shrink-0 text-amber-400/60 hover:text-amber-400 transition-colors text-xs">✕</button>
      </div>
    </div>
  );
}

// ── Main Chat Interface ──────────────────────────────────────────────────
export function ChatInterface({ conversationId, onNewConversation }: ChatInterfaceProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { pendingAssistantId, setPendingAssistantId, incrementNewChatKey } = useChatStore();
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | undefined>(
    !conversationId && pendingAssistantId ? pendingAssistantId : undefined
  );
  // Tracks the real conversation ID even after it's created via pushState (prop stays undefined)
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(conversationId);

  const {
    messages,
    messagesError,
    isMessagesLoading,
    sendMessage,
    retryWithFallback,
    voteMessage,
    isLoading,
    streamingContent,
    streamError,
    clearStreamError,
    fallbackState,
    dismissFallback,
    activeFallback,
    fallbackToast,
    assistants,
    currentConversation,
  } = useChat({ conversationId, assistantId: selectedAssistantId });

  const bottomRef = useRef<HTMLDivElement>(null);

  // Clear pending assistant from store once consumed on mount
  useEffect(() => {
    if (!conversationId && pendingAssistantId) {
      setPendingAssistantId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select first active assistant if none selected
  useEffect(() => {
    if (!selectedAssistantId && assistants.length > 0) {
      const preselect = conversationId
        ? assistants.find((a) => a.id === currentConversation?.assistantId)
        : assistants.find((a) => a.isActive);
      if (preselect) setSelectedAssistantId(preselect.id);
    }
  }, [assistants, selectedAssistantId, conversationId, currentConversation?.assistantId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  const handleSend = async (
    content: string,
    images?: { name: string; mimeType: string; dataBase64: string }[],
  ) => {
    try {
      await sendMessage(
        content,
        (newId) => {
          if (!conversationId && newId) {
            window.history.pushState({}, '', `/chat/${newId}`);
            setActiveConversationId(newId);
            onNewConversation?.(newId);
          }
        },
        images,
      );
    } catch (error) {
      console.error('Send failed', error);
    }
  };

  const handleAssistantSelect = (assistantId: string) => {
    if (activeConversationId && selectedAssistantId !== assistantId) {
      if (onNewConversation) {
        // Split-panel (admin): keep in panel, clear conversation
        setSelectedAssistantId(assistantId);
        setActiveConversationId(undefined);
        onNewConversation('');
      } else {
        // Regular user: navigate to /chat with the chosen assistant pre-selected
        setPendingAssistantId(assistantId);
        incrementNewChatKey();
        router.push('/chat');
      }
    } else {
      setSelectedAssistantId(assistantId);
    }
  };

  if (messagesError) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 gap-3 bg-white dark:bg-gray-950">
        <AlertCircle className="h-10 w-10 text-red-400 opacity-70" />
        <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">{t('chat.errorTitle')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm text-center">
          {t('chat.errorMessage')}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-1.5 text-sm rounded-full border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-gray-950 relative">
      {/* ── Fallback success toast ── */}
      {fallbackToast && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#0f1117]/90 border border-amber-500/30 shadow-xl backdrop-blur-sm">
            <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="text-[13px] font-medium text-amber-300">{fallbackToast}</span>
            <span className="text-[12px] text-slate-400">is now responding</span>
          </div>
        </div>
      )}
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <AssistantSelector
            assistants={assistants}
            selectedId={selectedAssistantId}
            lockedName={undefined}
            onSelect={handleAssistantSelect}
          />
          {activeFallback && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 text-[11px] font-medium">
              <Zap className="h-2.5 w-2.5" />
              {activeFallback.label}
            </span>
          )}
        </div>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Sun className="h-4 w-4 hidden dark:block" />
          <Moon className="h-4 w-4 block dark:hidden" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages || []}
          isLoading={isLoading && streamingContent === null}
          isMessagesLoading={isMessagesLoading}
          streamingContent={streamingContent}
          onVote={voteMessage}
        />
        {fallbackState && (
          <FallbackBanner
            state={fallbackState}
            onRetry={retryWithFallback}
            onDismiss={dismissFallback}
          />
        )}
        {streamError && (
          <div className="mx-4 mb-3 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{streamError}</span>
            <button onClick={clearStreamError} className="shrink-0 text-red-400/60 hover:text-red-400 transition-colors text-xs">✕</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} isLoading={isLoading} />
    </div>
  );
}
