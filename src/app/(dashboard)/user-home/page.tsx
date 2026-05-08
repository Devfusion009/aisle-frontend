'use client';

import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthedImage } from '@/components/ui/authed-image';
import { useAuthStore } from '@/store/use-auth-store';
import {
  Zap, MessageCircle, Bot, BookOpen, ArrowRight,
  Clock, Sparkles, ChevronRight, TrendingUp,
  Plus, Activity, BarChart3, Star,
} from 'lucide-react';
import { SkeletonUserHomePage } from '@/components/ui/skeleton-loaders';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

interface UserMetrics {
  tokensUsed: number;
  conversationsMonth: number;
  assistantsCount: number;
  accessibleKbCount: number;
  recentConversations: {
    id: string;
    title: string;
    assistantName: string;
    createdAt: string;
    timeAgo: string;
  }[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function getRoleBadge(role: string | undefined, t: (key: string) => string) {
  const map: Record<string, { color: string }> = {
    editor:         { color: 'bg-sky-500/15 text-sky-400 border-sky-500/20' },
    tenant_admin:   { color: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
    tenant_owner:   { color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    platform_admin: { color: 'bg-rose-500/15 text-rose-400 border-rose-500/20' },
    user:           { color: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
  };
  const entry = role ? map[role] : undefined;
  if (!entry) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${entry.color}`}>
      {t(`superAdmin.roles.${role}`)}
    </span>
  );
}

const STATS = [
  {
    key: 'tokens',
    labelKey: 'userDashboard.tokensUsed',
    icon: Zap,
    accent: '#a855f7',
    accentLight: 'rgba(168,85,247,0.12)',
    border: 'rgba(168,85,247,0.25)',
    iconColor: 'text-purple-400',
    getValue: (m: UserMetrics) => formatTokens(m.tokensUsed),
    raw: (m: UserMetrics) => m.tokensUsed,
  },
  {
    key: 'conversations',
    labelKey: 'userDashboard.conversationsMonth',
    icon: MessageCircle,
    accent: '#06d4ef',
    accentLight: 'rgba(6,212,239,0.12)',
    border: 'rgba(6,212,239,0.25)',
    iconColor: 'text-[#06d4ef]',
    getValue: (m: UserMetrics) => String(m.conversationsMonth),
    raw: (m: UserMetrics) => m.conversationsMonth,
  },
  {
    key: 'assistants',
    labelKey: 'userDashboard.availableAssistants',
    icon: Bot,
    accent: '#10b981',
    accentLight: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.25)',
    iconColor: 'text-emerald-400',
    getValue: (m: UserMetrics) => String(m.assistantsCount),
    raw: (m: UserMetrics) => m.assistantsCount,
  },
];

const KB_STAT = {
  key: 'kb',
  labelKey: 'userDashboard.accessibleKb',
  icon: BookOpen,
  accent: '#f59e0b',
  accentLight: 'rgba(245,158,11,0.12)',
  border: 'rgba(245,158,11,0.25)',
  iconColor: 'text-amber-400',
  getValue: (m: UserMetrics) => String(m.accessibleKbCount),
  raw: (m: UserMetrics) => m.accessibleKbCount,
};

export default function UserHomePage() {
  const { t } = useTranslation();
  const { user, avatarVersion } = useAuthStore();
  const { data: metrics } = useSWR<UserMetrics>('/dashboard/user-metrics', fetcher);
  const avatarSrc = useAuthedImage(
    user?.profilePhotoUrl ? `/tenant/profile-photo/${user.id}?v=${avatarVersion}` : null,
  );

  const stats = user?.priority === 'high' ? [...STATS, KB_STAT] : STATS;
  const lastConv = metrics?.recentConversations?.[0];

  if (!metrics) {
    return <SkeletonUserHomePage />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#111315]">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 md:px-10 pt-8 pb-14 max-w-6xl mx-auto space-y-7">

          {/* ── Welcome Banner ── */}
          <div className="relative rounded-2xl overflow-hidden dash-enter">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-[#1a1d21] dark:via-[#16181c] dark:to-[#111315]" />
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjA0KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSkyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />
            {/* Glows */}
            <div className="absolute -top-8 -right-8 h-48 w-48 rounded-full bg-[#06d4ef]/8 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-purple-500/6 blur-2xl pointer-events-none" />

            <div className="relative border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="h-16 w-16 rounded-2xl shrink-0 shadow-lg shadow-[#06d4ef]/10 dark:shadow-[#06d4ef]/25 ring-1 ring-[#06d4ef]/20 dark:ring-[#06d4ef]/30 overflow-hidden">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={user?.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#06d4ef] to-[#0596a8] flex items-center justify-center text-white text-xl font-bold">
                      {getInitials(user?.name || 'U')}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {t('userDashboard.welcome', { name: user?.name || '' })}
                    </h1>
                    {getRoleBadge(user?.role, t)}
                  </div>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
                    {t('userDashboard.subtitle')}
                  </p>
                </div>
                {/* CTA */}
                <Link
                  href="/chat"
                  className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#06d4ef] text-white text-[13px] font-semibold hover:bg-[#06d4ef]/90 transition-colors shadow-lg shadow-[#06d4ef]/25 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  {t('userDashboard.newChat')}
                </Link>
              </div>
            </div>
          </div>

          {/* ── Stat Cards ── */}
          <div className={`grid gap-4 dash-enter dash-enter-delay-1 ${stats.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {stats.map((s) => {
              const Icon = s.icon;
              const value = s.getValue(metrics);
              return (
                <div
                  key={s.key}
                  className="relative rounded-2xl border bg-white dark:bg-[#1a1d21] p-5 overflow-hidden group hover:scale-[1.01] transition-transform duration-200 shadow-sm dark:shadow-none"
                  style={{ borderColor: s.border }}
                >
                  {/* Background accent glow */}
                  <div
                    className="absolute top-0 right-0 h-24 w-24 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: s.accent, transform: 'translate(30%, -30%)' }}
                  />
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: s.accent }} />

                  <div className="relative flex items-start justify-between mb-4">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center"
                      style={{ background: s.accentLight }}
                    >
                      <Icon className={`h-5 w-5 ${s.iconColor}`} />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      <TrendingUp className="h-3 w-3" />
                      <span>{t('userDashboard.activeStatus')}</span>
                    </div>
                  </div>

                  <p className="text-4xl font-black text-slate-900 dark:text-slate-100 mb-1 tabular-nums">{value}</p>
                  <p className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">{t(s.labelKey)}</p>
                </div>
              );
            })}
          </div>

          {/* ── Main Content Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 dash-enter dash-enter-delay-2">

            {/* Left: Quick Actions */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-slate-500" />
                <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {t('userDashboard.quickActions')}
                </h2>
              </div>

              {/* New Chat */}
              <Link
                href="/chat"
                className="group flex items-center gap-4 rounded-xl border border-[#06d4ef]/20 bg-gradient-to-br from-[#06d4ef]/8 to-transparent p-4 hover:border-[#06d4ef]/40 hover:from-[#06d4ef]/12 transition-all"
              >
                <div className="h-11 w-11 rounded-xl bg-[#06d4ef]/15 flex items-center justify-center shrink-0 group-hover:bg-[#06d4ef]/25 transition-colors">
                  <Bot className="h-5 w-5 text-[#06d4ef]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                    {t('userDashboard.chooseAssistant')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                    {t('userDashboard.chooseAssistantDesc')}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-[#06d4ef]/50 group-hover:text-[#06d4ef] group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>

              {/* Continue Last Chat */}
              {lastConv && (
                <Link
                  href={`/chat/${lastConv.id}`}
                  className="group flex items-center gap-4 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/8 to-transparent p-4 hover:border-blue-500/40 hover:from-blue-500/12 transition-all"
                >
                  <div className="h-11 w-11 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 group-hover:bg-blue-500/25 transition-colors">
                    <MessageCircle className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                      {t('userDashboard.lastConversation')}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{lastConv.title}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-blue-500/50 dark:text-blue-400/50 group-hover:text-blue-500 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              )}

              {/* Knowledge Base (high-priority only) */}
              {user?.priority === 'high' && (
                <Link
                  href="/knowledge"
                  className="group flex items-center gap-4 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 to-transparent p-4 hover:border-amber-500/40 hover:from-amber-500/12 transition-all"
                >
                  <div className="h-11 w-11 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0 group-hover:bg-amber-500/25 transition-colors">
                    <BookOpen className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-100">{t('sidebar.knowledgeBase')}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{t('userDashboard.browseDatasets')}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-amber-500/50 dark:text-amber-400/50 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              )}

              {/* Tip card */}
              <div className="mt-auto rounded-xl border border-purple-500/15 bg-purple-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">{t('userDashboard.proTip')}</span>
                </div>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  {t('userDashboard.proTipText')}
                </p>
              </div>
            </div>

            {/* Right: Recent Conversations */}
            <div className="lg:col-span-3 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
                  <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {t('userDashboard.recentConversations')}
                  </h2>
                </div>
                {metrics.recentConversations.length > 0 && (
                  <Link
                    href="/chat"
                    className="flex items-center gap-1 text-[11px] text-[#06d4ef] hover:text-[#06d4ef]/80 transition-colors"
                  >
                    {t('userDashboard.viewAll')} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>

              <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d21] overflow-hidden shadow-sm dark:shadow-none">
                {metrics.recentConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="h-14 w-14 rounded-2xl bg-[#06d4ef]/8 border border-[#06d4ef]/15 flex items-center justify-center mb-4">
                      <MessageCircle className="h-7 w-7 text-[#06d4ef]/50" />
                    </div>
                    <p className="text-[14px] font-semibold text-slate-500 dark:text-slate-400">{t('userDashboard.noConversationsYet')}</p>
                    <p className="text-[12px] text-slate-400 dark:text-slate-600 mt-1.5">{t('userDashboard.startChatting')}</p>
                    <Link
                      href="/chat"
                      className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#06d4ef]/10 border border-[#06d4ef]/20 text-[12px] text-[#06d4ef] hover:bg-[#06d4ef]/15 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {t('userDashboard.startFirstChat')}
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {/* Header row */}
                    <div className="grid grid-cols-12 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-transparent">
                      <span className="col-span-1 text-[10px] font-semibold text-slate-500 dark:text-slate-600 uppercase tracking-wider">#</span>
                      <span className="col-span-6 text-[10px] font-semibold text-slate-500 dark:text-slate-600 uppercase tracking-wider">{t('userDashboard.titleColumn')}</span>
                      <span className="col-span-3 text-[10px] font-semibold text-slate-500 dark:text-slate-600 uppercase tracking-wider">{t('userDashboard.assistantColumn')}</span>
                      <span className="col-span-2 text-[10px] font-semibold text-slate-500 dark:text-slate-600 uppercase tracking-wider text-right">{t('userDashboard.timeColumn')}</span>
                    </div>
                    {metrics.recentConversations.map((conv, i) => (
                      <Link
                        key={conv.id}
                        href={`/chat/${conv.id}`}
                        className="grid grid-cols-12 items-center px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                      >
                        {/* Index */}
                        <div className="col-span-1">
                          <div className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-400 dark:text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                            {i + 1}
                          </div>
                        </div>
                        {/* Title */}
                        <div className="col-span-6 min-w-0 pr-3">
                          <p className="text-[13px] text-slate-700 dark:text-slate-200 font-medium truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                            {conv.title}
                          </p>
                        </div>
                        {/* Assistant */}
                        <div className="col-span-3 min-w-0 pr-2">
                          <span className="text-[11px] text-[#06d4ef]/80 dark:text-[#06d4ef]/70 font-medium truncate block">
                            {conv.assistantName}
                          </span>
                        </div>
                        {/* Time */}
                        <div className="col-span-2 flex items-center justify-end gap-1 text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                          <Clock className="h-3 w-3" />
                          <span className="truncate">{conv.timeAgo}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Bottom Action Strip (inspired by Image #1 social metrics row) ── */}
          <div className={`grid gap-4 dash-enter dash-enter-delay-3 ${user?.priority === 'high' ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            <Link
              href="/chat"
              className="group flex items-center justify-between gap-3 rounded-xl p-4 border border-[#06d4ef]/25 bg-gradient-to-r from-[#06d4ef]/10 to-[#0596a8]/5 hover:from-[#06d4ef]/18 hover:border-[#06d4ef]/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[#06d4ef] shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-200">{t('userDashboard.startNewChat')}</p>
                  <p className="text-[11px] text-slate-500">{t('userDashboard.pickAssistant')}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-[#06d4ef]/60 group-hover:text-[#06d4ef] group-hover:translate-x-0.5 transition-all" />
            </Link>

            {user?.priority === 'high' && (
              <Link
                href="/knowledge"
                className="group flex items-center justify-between gap-3 rounded-xl p-4 border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-orange-500/5 hover:from-amber-500/18 hover:border-amber-500/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-200">{t('sidebar.knowledgeBase')}</p>
                    <p className="text-[11px] text-slate-500">{t('userDashboard.datasetsAvailable', { count: metrics.accessibleKbCount })}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-amber-500/60 dark:text-amber-400/60 group-hover:text-amber-500 dark:group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            )}

            <div className="flex items-center justify-between gap-3 rounded-xl p-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1d21] shadow-sm dark:shadow-none">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-slate-200">{t('userDashboard.thisMonth')}</p>
                  <p className="text-[11px] text-slate-500">
                    {t('userDashboard.conversationCount', { count: metrics.conversationsMonth })} · {formatTokens(metrics.tokensUsed)} tokens
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[20px] font-black text-emerald-500 dark:text-emerald-400">{metrics.conversationsMonth}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
