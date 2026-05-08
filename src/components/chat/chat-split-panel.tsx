'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import { ChatInterface } from './chat-interface';
import { ShareModal } from './share-modal';
import {
  Plus, Search, X, Pin, PinOff, Archive, ArchiveRestore,
  Pencil, Trash2, MoreHorizontal, MessageCircle, ChevronDown,
  GripVertical, Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useDialog } from '@/components/ui/app-dialog';
import { SkeletonConversationItem } from '@/components/ui/skeleton-loaders';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Conversation {
  id: string;
  title?: string;
  assistantName: string;
  isPinned?: boolean;
  isArchived?: boolean;
}

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

const MIN_WIDTH = 180;
const MAX_WIDTH = 520;
const DEFAULT_WIDTH = 260;

// ── Conversation Item (mirrors sidebar ConversationItem) ───────────────────
function ConvItem({
  conv,
  active,
  onSelect,
  onRename,
  onDelete,
  onPin,
  onArchive,
}: {
  conv: Conversation;
  active: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPin: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { confirm } = useDialog();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conv.title || 'New Conversation');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== (conv.title || 'New Conversation')) {
      await onRename(conv.id, trimmed);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="relative rounded-lg px-1 py-0.5">
        <input
          ref={inputRef}
          className="w-full text-sm font-medium py-1.5 px-2.5 rounded-lg text-slate-900 dark:text-slate-100 outline-none ring-2 ring-[#06d4ef] bg-white dark:bg-slate-800"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
            if (e.key === 'Escape') { setIsEditing(false); setEditTitle(conv.title || 'New Conversation'); }
          }}
        />
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        onClick={() => onSelect(conv.id)}
        onDoubleClick={() => setIsEditing(true)}
        className={cn(
          'flex items-center w-full rounded-lg px-2.5 py-2 text-[13px] transition-all duration-150 text-left',
          active
            ? 'bg-[#06d4ef]/10 text-[#06d4ef] font-medium'
            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
        )}
      >
        {conv.isPinned && <Pin className="h-3 w-3 mr-1.5 shrink-0 text-[#06d4ef] -rotate-45" />}
        <span className="truncate flex-1">{conv.title || 'New Conversation'}</span>
      </button>

      {/* Three-dot menu */}
      <div className={cn(
        'absolute right-1 top-1/2 -translate-y-1/2 transition-opacity duration-150',
        menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'flex items-center justify-center h-6 w-6 rounded-md transition-colors',
                'text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200',
                'hover:bg-slate-200/80 dark:hover:bg-slate-700/60',
                active && 'text-[#06d4ef] hover:bg-[#06d4ef]/10'
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="bottom"
            className="w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1"
          >
            <DropdownMenuItem
              onClick={() => { setMenuOpen(false); setShowShare(true); }}
              className="gap-2.5 px-3 py-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[13px]"
            >
              <Share2 className="h-4 w-4" /> {t('chatPanel.share')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { setMenuOpen(false); setIsEditing(true); }}
              className="gap-2.5 px-3 py-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[13px]"
            >
              <Pencil className="h-4 w-4" /> {t('chatPanel.rename')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => { setMenuOpen(false); await onPin(conv.id); }}
              className="gap-2.5 px-3 py-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[13px]"
            >
              {conv.isPinned
                ? <><PinOff className="h-4 w-4" /> {t('chatPanel.unpinChat')}</>
                : <><Pin className="h-4 w-4" /> {t('chatPanel.pinChat')}</>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => { setMenuOpen(false); await onArchive(conv.id); }}
              className="gap-2.5 px-3 py-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[13px]"
            >
              {conv.isArchived
                ? <><ArchiveRestore className="h-4 w-4" /> {t('chatPanel.unarchive')}</>
                : <><Archive className="h-4 w-4" /> {t('chatPanel.archive')}</>}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
            <DropdownMenuItem
              onClick={async () => {
                setMenuOpen(false);
                if (await confirm(t('chatPanel.deleteConfirm'), { variant: 'danger', title: t('common.delete') })) await onDelete(conv.id);
              }}
              className="gap-2.5 px-3 py-2 cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-[13px]"
            >
              <Trash2 className="h-4 w-4" /> {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showShare && (
        <ShareModal
          title={conv.title || 'New Conversation'}
          chatId={conv.id}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

// ── Chat Split Panel ──────────────────────────────────────────────────────
export function ChatSplitPanel({ initialId }: { initialId?: string }) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | undefined>(initialId);
  const [search, setSearch] = useState('');
  const [archivedOpen, setArchivedOpen] = useState(false);

  // ── Resizable panel ───────────────────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = Math.min(Math.max(e.clientX - rect.left, MIN_WIDTH), MAX_WIDTH);
      setLeftWidth(newWidth);
    };
    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ── Data + handlers ───────────────────────────────────────────────────
  const { data: conversations, mutate, isLoading } = useSWR<Conversation[]>('/conversations', fetcher, {
    refreshInterval: 5000,
  });

  // Silently keep URL in sync
  useEffect(() => {
    const url = selectedId ? `/chat/${selectedId}` : '/chat';
    window.history.replaceState({}, '', url);
  }, [selectedId]);

  const handleNew = () => setSelectedId(undefined);
  const handleSelect = (id: string) => setSelectedId(id);
  const handleNewConversation = (id: string) => {
    if (id === '') {
      // User switched assistant from header — clear to new chat
      setSelectedId(undefined);
    } else {
      setSelectedId(id);
    }
    mutate();
  };

  const handleRename = async (id: string, title: string) => {
    await api.post(`/conversations/${id}/update`, { title });
    mutate();
  };
  const handleDelete = async (id: string) => {
    await api.post(`/conversations/${id}/delete`);
    if (selectedId === id) setSelectedId(undefined);
    mutate();
  };
  const handlePin = async (id: string) => {
    await api.post(`/conversations/${id}/pin`);
    mutate();
  };
  const handleArchive = async (id: string) => {
    await api.post(`/conversations/${id}/archive`);
    mutate();
  };

  const filtered = (conversations || []).filter((c) =>
    !search.trim() || (c.title || 'New Conversation').toLowerCase().includes(search.toLowerCase())
  );
  const pinned = filtered.filter((c) => c.isPinned && !c.isArchived);
  const recent = filtered.filter((c) => !c.isPinned && !c.isArchived);
  const archived = filtered.filter((c) => c.isArchived);

  const itemProps = { onSelect: handleSelect, onRename: handleRename, onDelete: handleDelete, onPin: handlePin, onArchive: handleArchive };

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden bg-white dark:bg-gray-950">

      {/* ── Left Panel ── */}
      <div
        style={{ width: leftWidth }}
        className="shrink-0 flex flex-col border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 overflow-hidden"
      >
        {/* New Chat + Search (same as sidebar) */}
        <div className="px-3 pt-3 pb-1 space-y-2 shrink-0">
          <button
            onClick={handleNew}
            className="w-full justify-start gap-2 h-9 px-3 flex items-center bg-[#06d4ef] text-white hover:bg-[#06d4ef]/90 shadow-sm shadow-[#06d4ef]/20 border-0 text-[13px] font-medium rounded-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            {t('chatPanel.newChat')}
          </button>

          {/* Search (same as sidebar) */}
          <div className={cn(
            'relative flex items-center rounded-lg border transition-all duration-200',
            'border-slate-200 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-600'
          )}>
            <Search className="h-3.5 w-3.5 ml-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder={t('chatPanel.searchChats')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-[13px] py-1.5 px-2 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mr-1.5 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

          {/* Conversation Sections (same layout as sidebar) */}
          <div className="flex-1 overflow-hidden flex flex-col px-2 pt-2 gap-1">

          {isLoading && !conversations?.length ? (
            <div className="flex-1 overflow-hidden flex flex-col py-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonConversationItem key={i} />
              ))}
            </div>
          ) : (
            <>
              {/* Pinned */}
          {pinned.length > 0 && (
            <div className="shrink-0 flex flex-col">
              <p className="flex items-center gap-1.5 w-full px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
                {t('chatPanel.pinned')}
                <span className="ml-auto text-[10px] font-medium bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 rounded-full px-1.5 py-px leading-none">
                  {pinned.length}
                </span>
              </p>
              <div className="space-y-px pr-2">
                {pinned.map((c) => <ConvItem key={c.id} conv={c} active={selectedId === c.id} {...itemProps} />)}
              </div>
            </div>
          )}

          {/* Recent Chats — takes remaining space */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <p className="flex items-center gap-1.5 w-full px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
              {t('chatPanel.recent')}
              {recent.length > 0 && (
                <span className="ml-auto text-[10px] font-medium bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 rounded-full px-1.5 py-px leading-none">
                  {recent.length}
                </span>
              )}
            </p>
            {recent.length > 0 ? (
              <ScrollArea className="flex-1 min-h-0">
                <div className="space-y-px pr-2">
                  {recent.map((c) => <ConvItem key={c.id} conv={c} active={selectedId === c.id} {...itemProps} />)}
                </div>
              </ScrollArea>
            ) : (
              <div className="px-3 py-3 text-[12px] text-slate-400 dark:text-slate-500 text-center italic">
                {search ? t('common.noResults') : t('chatPanel.noRecentChats')}
              </div>
            )}
          </div>

          {/* Archived (collapsible) */}
          {archived.length > 0 && (
            <div className="shrink-0 flex flex-col border-t border-slate-200/60 dark:border-slate-800 pt-1">
              <button
                onClick={() => setArchivedOpen(!archivedOpen)}
                className="flex items-center gap-1.5 w-full px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <ChevronDown className={cn('h-3 w-3 transition-transform', archivedOpen ? '' : '-rotate-90')} />
                {t('chatPanel.archived')}
                <span className="ml-auto text-[10px] font-medium bg-slate-200/80 dark:bg-slate-700/80 rounded-full px-1.5 py-px leading-none">
                  {archived.length}
                </span>
              </button>
              {archivedOpen && (
                <ScrollArea className="max-h-[144px]">
                  <div className="space-y-px pr-2">
                    {archived.map((c) => <ConvItem key={c.id} conv={c} active={selectedId === c.id} {...itemProps} />)}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {/* ── Resize Divider ── */}
      <div
        onMouseDown={handleDividerMouseDown}
        className="w-[5px] shrink-0 flex items-center justify-center cursor-col-resize group relative bg-slate-200/50 dark:bg-slate-800/50 hover:bg-[#06d4ef]/30 active:bg-[#06d4ef]/50 transition-colors"
        title="Drag to resize"
      >
        <GripVertical className="h-4 w-4 text-slate-400 dark:text-slate-600 group-hover:text-[#06d4ef] transition-colors opacity-0 group-hover:opacity-100" />
      </div>

      {/* ── Right Panel: Full ChatInterface (exact same as user chat) ── */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <ChatInterface
          conversationId={selectedId}
          onNewConversation={handleNewConversation}
        />
      </div>
    </div>
  );
}
