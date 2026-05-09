'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Plus, LogOut, BookOpen, Sparkles,
  MoreHorizontal, Pencil, Trash2, Pin, Archive,
  Share2, ChevronDown, ChevronRight, PinOff, ArchiveRestore,
  Search, X, Shield, PanelLeftClose, Building2, UserCog,
  Gauge, MessagesSquare, MessageCircle, Terminal, CreditCard, AreaChart,
  SlidersHorizontal, Database, Bot, Settings, Users, Home, FolderOpen, Crown,
} from 'lucide-react';
import useSWR from 'swr';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/use-auth-store';
import { useTranslation } from 'react-i18next';
import { VerseLogoBoxed } from '@/components/brand/verse-logo';
import { useDialog } from '@/components/ui/app-dialog';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { SkeletonSidebarChatItem } from '@/components/ui/skeleton-loaders';
import { UserRole } from '@/types';
import { homePathFor } from '@/lib/rbac';
import api from '@/lib/api';
import { useAuthedImage } from '@/components/ui/authed-image';
import { useSidebarStore } from '@/store/use-sidebar-store';
import { useChatStore } from '@/store/use-chat-store';
import { ShareModal } from '@/components/chat/share-modal';
import { LogoutDialog } from '@/components/auth/logout-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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

// ─── Nav Section Label (inspired by Talkness doc sidebar) ─────────────────
function NavSectionLabel({ label }: { label: string }) {
  return (
    <div className="px-1 pt-5 pb-1.5 first:pt-0">
      <span className="text-[10px] font-semibold uppercase tracking-[1.2px] text-slate-400/70 dark:text-slate-500/80 select-none px-2">
        {label}
      </span>
    </div>
  );
}

// ─── Nav Item (inspired by Talkness doc sidebar with dot + left border) ───
function NavItem({
  href,
  icon: Icon,
  label,
  active,
  dotColor,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  dotColor: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-2.5 w-full rounded-lg px-2.5 py-[7px] text-[13px] transition-all duration-150 border-l-2",
        active
          ? "border-l-[#06d4ef] bg-[#06d4ef]/8 text-[#06d4ef] font-medium"
          : "border-l-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200"
      )}
    >
      <span
        className={cn(
          "w-[6px] h-[6px] rounded-full shrink-0 transition-all duration-200",
          active && "scale-125 shadow-sm"
        )}
        style={{
          backgroundColor: active ? '#06d4ef' : dotColor,
          boxShadow: active ? `0 0 6px #06d4ef60` : 'none',
          opacity: active ? 1 : 0.55,
        }}
      />
      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-[#06d4ef]" : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

// ─── Conversation Item ──────────────────────────────────────────────────
function ConversationItem({
  chat,
  pathname,
  onRename,
  onDelete,
  onPin,
  onArchive,
}: {
  chat: Conversation;
  pathname: string;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPin: (id: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { confirm } = useDialog();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(chat.title || t('chatPanel.defaultTitle'));
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [showShare, setShowShare] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isActive = pathname === `/chat/${chat.id}`;

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== (chat.title || t('chatPanel.defaultTitle'))) {
      await onRename(chat.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(chat.title || t('chatPanel.defaultTitle'));
    }
  };

  const handleShare = () => { setMenuOpen(false); setShowShare(true); };

  // ── Inline rename ───────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="relative rounded-lg px-1 py-0.5">
        <input
          ref={inputRef}
          className={cn(
            "w-full text-sm font-medium py-1.5 px-2.5 rounded-lg",
            "text-slate-900 dark:text-slate-100",
            "outline-none ring-2 ring-[#06d4ef]",
            "bg-white dark:bg-slate-800"
          )}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
        />
      </div>
    );
  }

  // ── Normal state ────────────────────────────────────────────────────
  return (
    <div className="group relative">
      <Link
        href={`/chat/${chat.id}`}
        onDoubleClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsEditing(true);
        }}
        className={cn(
          "flex items-center w-full rounded-lg px-2.5 py-2 text-[13px] transition-all duration-150",
          isActive
            ? "bg-[#06d4ef]/10 text-[#06d4ef] font-medium"
            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
        )}
      >
        {chat.isPinned && (
          <Pin className="h-3 w-3 mr-1.5 shrink-0 text-[#06d4ef] -rotate-45" />
        )}
        <span className="truncate flex-1">{chat.title || t('chatPanel.defaultTitle')}</span>
      </Link>

      {/* Three-dot menu */}
      <div
        className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 transition-opacity duration-150",
          menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded-md transition-colors",
                "text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200",
                "hover:bg-slate-200/80 dark:hover:bg-slate-700/60",
                isActive &&
                "text-[#06d4ef] hover:bg-[#06d4ef]/10"
              )}
              onClick={(e) => e.stopPropagation()}
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
              onClick={() => { setMenuOpen(false); handleShare(); }}
              className="gap-2.5 px-3 py-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[13px]"
            >
              <Share2 className="h-4 w-4" />
              {t('chatPanel.share')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { setMenuOpen(false); setIsEditing(true); }}
              className="gap-2.5 px-3 py-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[13px]"
            >
              <Pencil className="h-4 w-4" />
              {t('chatPanel.rename')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => { setMenuOpen(false); await onPin(chat.id); }}
              className="gap-2.5 px-3 py-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[13px]"
            >
              {chat.isPinned ? <><PinOff className="h-4 w-4" /> {t('chatPanel.unpinChat')}</> : <><Pin className="h-4 w-4" /> {t('chatPanel.pinChat')}</>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => { setMenuOpen(false); await onArchive(chat.id); }}
              className="gap-2.5 px-3 py-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[13px]"
            >
              {chat.isArchived ? <><ArchiveRestore className="h-4 w-4" /> {t('chatPanel.unarchive')}</> : <><Archive className="h-4 w-4" /> {t('chatPanel.archive')}</>}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1" />
            <DropdownMenuItem
              onClick={async () => { setMenuOpen(false); if (await confirm(t('chatPanel.deleteConfirm'), { variant: 'danger', title: t('common.delete') })) await onDelete(chat.id); }}
              className="gap-2.5 px-3 py-2 cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:text-red-600 rounded-lg text-[13px]"
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showShare && (
        <ShareModal
          title={chat.title || t('chatPanel.defaultTitle')}
          chatId={chat.id}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────
function SectionHeader({
  label,
  collapsible = false,
  isOpen = true,
  onToggle,
  count,
}: {
  label: string;
  collapsible?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={collapsible ? onToggle : undefined}
      className={cn(
        "flex items-center gap-1.5 w-full px-2.5 py-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none",
        collapsible && "cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      )}
    >
      {collapsible && (
        isOpen
          ? <ChevronDown className="h-3 w-3" />
          : <ChevronRight className="h-3 w-3" />
      )}
      {label}
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-[10px] font-medium bg-slate-200/80 dark:bg-slate-700/80 text-slate-500 dark:text-slate-400 rounded-full px-1.5 py-px leading-none">
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Chat List Section (with independent scroll) ────────────────────────
function ChatSection({
  chats,
  maxHeight,
  itemProps,
}: {
  chats: Conversation[];
  maxHeight: string;
  itemProps: any;
}) {
  if (chats.length === 0) return null;

  return (
    <ScrollArea className={`min-h-0 ${maxHeight}`}>
      <div className="space-y-px pr-3">
        {chats.map((chat) => (
          <ConversationItem key={chat.id} chat={chat} {...itemProps} />
        ))}
      </div>
    </ScrollArea>
  );
}

// ─── Dot color palette for section groupings ─────────────────────────────
const DOT_COLORS = {
  overview:   '#60a5fa', // blue
  ai:         '#a78bfa', // purple
  content:    '#34d399', // green
  developer:  '#fbbf24', // yellow
  management: '#f87171', // red
  system:     '#06d4ef', // cyan
  platform:   '#a78bfa', // purple
};

// ─── Sidebar ────────────────────────────────────────────────────────────
export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, logoVersion, avatarVersion } = useAuthStore();
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);
  const avatarSrc = useAuthedImage(
    user?.profilePhotoUrl ? `/tenant/profile-photo/${user.id}?v=${avatarVersion}` : null,
  ) ?? undefined;
  const { t } = useTranslation();
  const { incrementNewChatKey } = useChatStore();
  const { data: conversations, mutate, isLoading } = useSWR<Conversation[]>('/conversations', fetcher);
  const { data: tenantInfo, isLoading: isTenantLoading } = useSWR(user ? '/tenant/info' : null, fetcher);
  const [archivedOpen, setArchivedOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchFocused, setSearchFocused] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const logoSrc = useAuthedImage(
    tenantInfo?.logoUrl ? `/tenant/logo/${tenantInfo.id}?v=${logoVersion}` : null,
  );

  const handleRename = async (id: string, newTitle: string) => {
    try {
      await api.post(`/conversations/${id}/update`, { title: newTitle });
      mutate();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.post(`/conversations/${id}/delete`);
      mutate();
      if (pathname === `/chat/${id}`) router.push('/chat');
    } catch (e) { console.error(e); }
  };

  const handlePin = async (id: string) => {
    try {
      await api.post(`/conversations/${id}/pin`);
      mutate();
    } catch (e) { console.error(e); }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.post(`/conversations/${id}/archive`);
      mutate();
    } catch (e) { console.error(e); }
  };

  // Filter by search
  const filtered = React.useMemo(() => {
    if (!conversations) return [];
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) =>
      (c.title || 'New Conversation').toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // Split into sections
  const pinnedChats = filtered.filter((c) => c.isPinned && !c.isArchived);
  const recentChats = filtered.filter((c) => !c.isPinned && !c.isArchived);
  const archivedChats = filtered.filter((c) => c.isArchived);

  const itemProps = {
    pathname,
    onRename: handleRename,
    onDelete: handleDelete,
    onPin: handlePin,
    onArchive: handleArchive,
  };

  return (
    <div className="flex h-full w-[280px] flex-col border-r border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60">
      <LogoutDialog
        open={showLogoutDialog}
        onConfirm={() => {
          setShowLogoutDialog(false);
          logout();
          router.push('/login');
        }}
        onCancel={() => setShowLogoutDialog(false)}
      />
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex h-14 items-center justify-between border-b border-slate-200/60 dark:border-slate-800 px-4">
        <Link
          href={homePathFor(user)}
          className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 hover:text-[#06d4ef] transition-colors min-w-0"
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={t('common.logoAlt')}
              className="h-8 w-8 rounded-lg object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
            />
          ) : (
            <VerseLogoBoxed className="h-8 w-8" iconClassName="w-5 h-5" />
          )}
          <span className="tracking-tight text-[15px] font-semibold truncate">
            {user?.role === UserRole.PLATFORM_ADMIN ? t('common.verseAi') : (tenantInfo?.name || t('common.logo'))}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          <button
            onClick={() => useSidebarStore.getState().toggle()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title={t('sidebar.collapseSidebar')}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* Chat UI — shown for regular users only (editors/admins use nav-link sidebar) */}
        {(user?.role === UserRole.USER) && (
          <>
            {/* New Chat + Search */}
            <div className="px-3 pt-3 pb-1 space-y-2">
              <Button
                asChild
                className="w-full justify-start gap-2 h-9 bg-[#06d4ef] text-white hover:bg-[#06d4ef]/90 shadow-sm shadow-[#06d4ef]/20 border-0 text-[13px] font-medium rounded-lg"
              >
                <Link href="/chat" onClick={incrementNewChatKey}>
                  <Plus className="h-4 w-4" />
                  {t('sidebar.newChat')}
                </Link>
              </Button>

              {/* Search Bar */}
              <div className={cn(
                "relative flex items-center rounded-lg border transition-all duration-200",
                searchFocused
                  ? "border-purple-400 dark:border-purple-500 ring-1 ring-[#06d4ef]/50 bg-white dark:bg-slate-900"
                  : "border-slate-200 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-600"
              )}>
                <Search className="h-3.5 w-3.5 ml-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder={t('sidebar.searchChats')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="flex-1 bg-transparent text-[13px] py-1.5 px-2 outline-none text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
                    className="mr-1.5 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Chat Sections ─────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden flex flex-col px-2 pt-2 gap-1">

              {isLoading && !conversations?.length ? (
                <div className="flex-1 overflow-hidden flex flex-col py-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonSidebarChatItem key={i} delay={i * 50} />
                  ))}
                </div>
              ) : (
                <>
                  {/* Pinned */}
              {pinnedChats.length > 0 && (
                <div className="shrink-0 flex flex-col">
                  <SectionHeader label={t('chatPanel.pinned')} count={pinnedChats.length} />
                  <ChatSection chats={pinnedChats} maxHeight="h-[144px]" itemProps={itemProps} />
                </div>
              )}

              {/* Recent Chats — takes remaining space */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <SectionHeader label={t('chatPanel.recent')} count={recentChats.length > 0 ? recentChats.length : undefined} />
                {recentChats.length > 0 ? (
                  <ScrollArea className="flex-1 min-h-0">
                    <div className="space-y-px pr-3">
                      {recentChats.map((chat) => (
                        <ConversationItem key={chat.id} chat={chat} {...itemProps} />
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="px-3 py-3 text-[12px] text-slate-400 dark:text-slate-500 text-center italic">
                    {searchQuery ? t('common.noResults') : t('chatPanel.noRecentChats')}
                  </div>
                )}
              </div>

              {/* Archived (collapsible) */}
              {archivedChats.length > 0 && (
                <div className="shrink-0 flex flex-col border-t border-slate-200/60 dark:border-slate-800 pt-1">
                  <SectionHeader
                    label={t('chatPanel.archived')}
                    collapsible
                    isOpen={archivedOpen}
                    onToggle={() => setArchivedOpen(!archivedOpen)}
                    count={archivedChats.length}
                  />
                  {archivedOpen && (
                    <ChatSection chats={archivedChats} maxHeight="h-[144px]" itemProps={itemProps} />
                  )}
                </div>
              )}
              </>
              )}
            </div>
          </>
        )}

        {/* ── Tenant Admin Navigation (grouped sections with dots) ── */}
        {(user?.role === UserRole.TENANT_ADMIN || user?.role === UserRole.TENANT_OWNER) && (
          <ScrollArea className="flex-1">
            <div className="px-2 pt-2 pb-4">
              {isTenantLoading ? (
                <div className="space-y-1.5 px-1">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className="skeleton h-9 w-full rounded-lg opacity-40" style={{ animationDelay: `${i * 50}ms` }} />
                  ))}
                </div>
              ) : (
                <>
                  {/* ── Overview ── */}
                  <NavSectionLabel label={t('sidebar.dashboard')} />
                  <div className="space-y-0.5">
                    <NavItem href="/admin/dashboard" icon={Gauge} label={t('sidebar.dashboard')} active={pathname === '/admin/dashboard' || pathname === '/dashboard'} dotColor={DOT_COLORS.overview} />
                  </div>

                  {/* ── AI & Content ── */}
                  <NavSectionLabel label={t('sidebar.aiContent')} />
                  <div className="space-y-0.5">
                    <NavItem href="/assistants" icon={Sparkles} label={t('sidebar.assistants')} active={pathname === '/assistants'} dotColor={DOT_COLORS.ai} />
                    <NavItem href="/admin/conversations" icon={MessagesSquare} label={t('sidebar.conversations')} active={pathname === '/admin/conversations'} dotColor={DOT_COLORS.ai} />
                    <NavItem href="/chat" icon={MessageCircle} label={t('sidebar.chat')} active={pathname === '/chat'} dotColor={DOT_COLORS.content} />
                    <NavItem href="/knowledge" icon={BookOpen} label={t('sidebar.knowledgeBase')} active={pathname === '/knowledge'} dotColor={DOT_COLORS.content} />
                  </div>

                  {/* ── Developer ── */}
                  <NavSectionLabel label={t('sidebar.developer')} />
                  <div className="space-y-0.5">
                    <NavItem href="/admin/playground" icon={Terminal} label={t('sidebar.playground')} active={pathname === '/admin/playground'} dotColor={DOT_COLORS.developer} />
                    {/* API Keys and Integrations hidden — not yet implemented */}
                  </div>

                  {/* ── Management ── */}
                  <NavSectionLabel label={t('sidebar.management')} />
                  <div className="space-y-0.5">
                    <NavItem href="/admin/billing" icon={CreditCard} label={t('sidebar.billing')} active={pathname === '/admin/billing'} dotColor={DOT_COLORS.management} />
                    <NavItem href="/admin/analytics" icon={AreaChart} label={t('sidebar.analytics')} active={pathname === '/admin/analytics'} dotColor={DOT_COLORS.management} />
                    <NavItem href="/admin/users" icon={UserCog} label={t('sidebar.users')} active={pathname === '/admin/users'} dotColor={DOT_COLORS.management} />
                    <NavItem href="/settings" icon={SlidersHorizontal} label={t('sidebar.settings')} active={pathname === '/settings'} dotColor={DOT_COLORS.management} />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

        {/* ── Super Admin Navigation (grouped sections with dots) ── */}
        {user?.role === UserRole.PLATFORM_ADMIN && (
          <ScrollArea className="flex-1">
            <div className="px-2 pt-2 pb-4">
              {isTenantLoading ? (
                <div className="space-y-1.5 px-1">
                  <div className="flex items-center gap-2 mb-4 px-1.5">
                    <div className="skeleton h-8 w-8 rounded-lg shrink-0" />
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="skeleton h-3.5 w-24 rounded" />
                      <div className="skeleton h-2 w-16 rounded" />
                    </div>
                  </div>
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="skeleton h-9 w-full rounded-lg opacity-40" style={{ animationDelay: `${i * 50}ms` }} />
                  ))}
                </div>
              ) : (
                <>
                  {/* Header chip */}
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <div className="bg-gradient-to-br from-[#06d4ef] to-[#06d4ef]/50 rounded-lg p-1.5">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">{t('sidebar.systemControl')}</p>
                      <p className="text-[11px] text-slate-400">{t('sidebar.platformAdmin')}</p>
                    </div>
                  </div>

                  {/* ── Platform ── */}
                  <NavSectionLabel label={t('sidebar.platform')} />
                  <div className="space-y-0.5">
                    <NavItem href="/super-admin" icon={Shield} label={t('sidebar.panel')} active={pathname === '/super-admin'} dotColor={DOT_COLORS.system} />
                    <NavItem href="/super-admin/tenants" icon={Building2} label={t('sidebar.tenants')} active={pathname === '/super-admin/tenants'} dotColor={DOT_COLORS.overview} />
                    <NavItem href="/super-admin/plans" icon={Crown} label={t('sidebar.plansAndPricing')} active={pathname === '/super-admin/plans'} dotColor={DOT_COLORS.management} />
                  </div>

                  {/* ── Resources ── */}
                  <NavSectionLabel label={t('sidebar.resources')} />
                  <div className="space-y-0.5">
                    <NavItem href="/super-admin/users" icon={Users} label={t('sidebar.users')} active={pathname === '/super-admin/users'} dotColor={DOT_COLORS.management} />
                    <NavItem href="/super-admin/assistants" icon={Bot} label={t('sidebar.assistants')} active={pathname === '/super-admin/assistants'} dotColor={DOT_COLORS.ai} />
                    <NavItem href="/super-admin/databases" icon={Database} label={t('sidebar.databases')} active={pathname === '/super-admin/databases'} dotColor={DOT_COLORS.content} />
                  </div>

                  {/* ── System ── */}
                  <NavSectionLabel label={t('sidebar.system')} />
                  <div className="space-y-0.5">
                    <NavItem href="/settings" icon={SlidersHorizontal} label={t('sidebar.settings')} active={pathname === '/settings'} dotColor={DOT_COLORS.developer} />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

        {/* ── Editor Section (grouped with dots) ─────────────────── */}
        {user?.role === UserRole.EDITOR && (
          <ScrollArea className="flex-1">
            <div className="px-2 pt-2 pb-4">
              {isTenantLoading ? (
                <div className="space-y-1.5 px-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="skeleton h-9 w-full rounded-lg opacity-40" style={{ animationDelay: `${i * 50}ms` }} />
                  ))}
                </div>
              ) : (
                <>
                  <NavSectionLabel label={t('sidebar.workspace')} />
                  <div className="space-y-0.5">
                    {/* Editors don't manage assistants — page is admin-only.
                        They consume assistants through /chat instead. */}
                    <NavItem href="/knowledge" icon={BookOpen} label={t('sidebar.knowledgeBase')} active={pathname === '/knowledge'} dotColor={DOT_COLORS.content} />
                    <NavItem href="/chat" icon={MessageCircle} label={t('sidebar.chat')} active={pathname === '/chat'} dotColor={DOT_COLORS.content} />
                    <NavItem href="/admin/playground" icon={Terminal} label={t('sidebar.playground')} active={pathname === '/admin/playground'} dotColor={DOT_COLORS.developer} />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        )}

      </div>

      {/* ── User Profile ──────────────────────────────────────────── */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 px-2 h-10 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors rounded-xl"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={avatarSrc} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-[#06d4ef] to-[#0596a8] text-white text-xs font-bold">
                  {user?.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start flex-1 min-w-0">
                <span className="font-semibold text-slate-700 dark:text-slate-200 truncate w-full text-[12px]">
                  {user?.name}
                </span>
                <span className="text-slate-500 truncate w-full text-[11px]">
                  {user?.email}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>

          {/* ── ChatGPT-style popup ── */}
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-64 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-[#1a1c20] shadow-xl dark:shadow-2xl p-1.5"
          >
            {/* User info header */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={avatarSrc} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-[#06d4ef] to-[#0596a8] text-white text-sm font-bold">
                  {user?.name?.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700/60 my-1" />

            {/* Navigation items — USER role */}
            {user?.role === UserRole.USER && (
              <>
                <DropdownMenuItem
                  onClick={() => router.push('/user-home')}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-[13px] my-0.5",
                    pathname === '/user-home'
                      ? "bg-[#06d4ef]/10 dark:bg-[#06d4ef]/12 text-[#06d4ef]"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <span className="h-7 w-7 rounded-lg bg-[#06d4ef]/12 flex items-center justify-center shrink-0">
                    <Home className="h-4 w-4 text-[#06d4ef]" />
                  </span>
                  <span className="font-medium">{t('sidebar.dashboard')}</span>
                </DropdownMenuItem>

                {user?.priority === 'high' && (
                  <DropdownMenuItem
                    onClick={() => router.push('/contents')}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-[13px] my-0.5",
                      pathname === '/contents'
                        ? "bg-amber-500/10 dark:bg-amber-500/12 text-amber-600 dark:text-amber-400"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100"
                    )}
                  >
                    <span className="h-7 w-7 rounded-lg bg-amber-500/12 flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4 text-amber-400" />
                    </span>
                    <span className="font-medium">{t('sidebar.knowledgeBase')}</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => router.push('/settings')}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-[13px] my-0.5",
                    pathname === '/settings'
                      ? "bg-slate-100 dark:bg-slate-700/60 text-slate-900 dark:text-slate-200"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <span className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-700/60 flex items-center justify-center shrink-0">
                    <SlidersHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </span>
                  <span className="font-medium">{t('sidebar.settings')}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700/60 my-1" />
              </>
            )}

            <DropdownMenuItem
              onClick={() => setShowLogoutDialog(true)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-[13px] my-0.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-300"
            >
              <span className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <LogOut className="h-4 w-4 text-red-400" />
              </span>
              <span className="font-medium">{t('sidebar.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
