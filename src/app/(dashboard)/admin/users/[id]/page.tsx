'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import api from '@/lib/api';
import { UserRole, UserPriority } from '@/types';
import {
  ArrowLeft, MessageSquare, Coins, Send, Clock, ThumbsUp, ThumbsDown,
  Database, Bot, Mail, Shield, Star, CalendarDays, LogIn, Loader2,
  TrendingUp, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from 'recharts';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

function roleBadgeClass(role: UserRole) {
  switch (role) {
    case UserRole.TENANT_OWNER: return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case UserRole.TENANT_ADMIN: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case UserRole.EDITOR: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}

function formatTokens(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export default function UserDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error } = useSWR(id ? `/tenant-users/${id}/details` : null, fetcher, { refreshInterval: 10000 });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#111315] text-slate-400">
        <p className="text-lg">{t('userDetail.notFound')}</p>
        <button onClick={() => router.push('/admin/users')} className="mt-4 text-[#06d4ef] hover:underline text-sm">
          {t('userDetail.backToUsers')}
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full bg-[#111315]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  const { user, kpis, conversations, activity, topAssistants } = data;

  // Shorten activity for chart: show last 14 days with day labels
  const chartActivity = activity.slice(-14).map((a: any) => ({
    ...a,
    label: new Date(a.date + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#111315]">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#111315]/90">
          <div className="px-6 md:px-8 pt-6 pb-4">
            <button
              onClick={() => router.push('/admin/users')}
              className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-[#06d4ef] transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('userDetail.backToUsers')}
            </button>
          </div>
        </div>

        <div className="px-6 md:px-8 pb-10 space-y-6">
          {/* User Profile Card */}
          <div className="rounded-xl border border-slate-800 bg-[#1a1d21] overflow-hidden">
            <div className="h-20 bg-gradient-to-r from-[#06d4ef]/20 via-[#06d4ef]/10 to-transparent" />
            <div className="px-6 pb-6 -mt-8">
              <div className="flex items-end gap-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#06d4ef] to-[#06d4ef]/50 flex items-center justify-center text-white text-2xl font-bold border-4 border-[#1a1d21] shrink-0">
                  {user.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="pb-1 flex-1">
                  <h1 className="text-xl font-bold text-slate-100">{user.name}</h1>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-[12px] text-slate-400">
                      <Mail className="h-3 w-3" /> {user.email}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${roleBadgeClass(user.role)}`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {['user', 'editor', 'tenant_admin', 'tenant_owner', 'platform_admin'].includes(user.role)
                        ? t('superAdmin.roles.' + user.role)
                        : user.role.replace('tenant_', '').replace('_', ' ')}
                    </span>
                    {user.priority === 'high' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Star className="h-3 w-3" /> {t('userDetail.highPriority')}
                      </span>
                    )}
                    <span className={`text-[11px] font-medium ${user.isActive ? 'text-emerald-400' : 'text-red-400'}`}>
                      {user.isActive ? t('userDetail.active') : t('userDetail.inactive')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-[12px] text-slate-500">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {t('userDetail.joined')} {new Date(user.createdAt).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <LogIn className="h-3.5 w-3.5" />
                  {t('userDetail.lastLogin')} {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : t('userDetail.never')}
                </span>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard icon={<MessageSquare className="h-4 w-4 text-[#06d4ef]" />} label={t('userDetail.kpi.conversations')} value={kpis.totalConversations} />
            <KpiCard icon={<Coins className="h-4 w-4 text-[#06d4ef]" />} label={t('userDetail.kpi.tokensUsed')} value={formatTokens(kpis.totalTokens)} />
            <KpiCard icon={<Send className="h-4 w-4 text-[#06d4ef]" />} label={t('userDetail.kpi.messagesSent')} value={kpis.totalMessages} />
            <KpiCard icon={<Clock className="h-4 w-4 text-[#06d4ef]" />} label={t('userDetail.kpi.avgResponse')} value={kpis.avgResponseTime > 0 ? `${kpis.avgResponseTime}s` : '—'} />
          </div>

          {/* Feedback & Access Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ThumbsUp className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-100">{kpis.upVotes}</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{t('userDetail.positiveFeedback')}</p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <ThumbsDown className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-100">{kpis.downVotes}</p>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{t('userDetail.negativeFeedback')}</p>
              </div>
            </div>
            {user.priority === 'high' && (
              <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Database className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-100">{kpis.datasetAccessCount}</p>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">{t('userDetail.kbAccess')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Activity Chart */}
          <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-[#06d4ef]" />
              <h2 className="text-sm font-semibold text-slate-200">{t('userDetail.activityTitle')}</h2>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartActivity}>
                  <defs>
                    <linearGradient id="colorTokensUser" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06d4ef" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#06d4ef" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                    formatter={(val: any, name: any) => [
                      name === 'tokens' ? Number(val).toLocaleString() + ' ' + t('userDetail.tokensSuffix') : val,
                      name === 'tokens' ? t('userDetail.tooltipTokens') : t('userDetail.tooltipConversations'),
                    ]}
                  />
                  <Area type="monotone" dataKey="tokens" stroke="#06d4ef" fillOpacity={1} fill="url(#colorTokensUser)" />
                  <Bar dataKey="conversations" fill="#06d4ef66" radius={[2, 2, 0, 0]} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Assistants */}
          {topAssistants.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                <Bot className="h-4 w-4 text-[#06d4ef]" />
                <h2 className="text-[13px] font-semibold text-slate-200">{t('userDetail.mostUsedAssistants')}</h2>
              </div>
              <div className="divide-y divide-slate-800/60">
                {topAssistants.map((a: any) => (
                  <div key={a.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#06d4ef]/10 flex items-center justify-center shrink-0">
                        <Bot className="h-4 w-4 text-[#06d4ef]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-200">{a.name}</p>
                        <p className="text-[11px] text-slate-500">{a.model}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 text-[12px]">
                      <span className="text-slate-400">{a.conversations} {t('userDetail.convsSuffix')}</span>
                      <span className="text-slate-500">{formatTokens(a.tokens)} {t('userDetail.tokensShort')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Conversations Table */}
          <div className="rounded-xl border border-slate-800 bg-[#1a1d21] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-slate-200 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#06d4ef]" />
                {t('userDetail.allConversations')}
              </h2>
              <span className="text-[12px] text-slate-500">{conversations.length} {t('userDetail.totalSuffix')}</span>
            </div>

            {conversations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-[13px]">{t('userDetail.noConversations')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3">{t('userDetail.col.conversation')}</th>
                      <th className="px-5 py-3">{t('userDetail.col.assistant')}</th>
                      <th className="px-5 py-3">{t('userDetail.col.messages')}</th>
                      <th className="px-5 py-3">{t('userDetail.col.tokens')}</th>
                      <th className="px-5 py-3">{t('userDetail.col.status')}</th>
                      <th className="px-5 py-3">{t('userDetail.col.date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {conversations.map((conv: any) => (
                      <tr key={conv.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-5 py-3 text-[13px] text-slate-200 max-w-[200px] truncate">
                          {conv.title}
                          {conv.isPinned && <span className="ml-1.5 text-amber-400 text-[10px]">{t('userDetail.pinned')}</span>}
                        </td>
                        <td className="px-5 py-3 text-[12px] text-slate-400">{conv.assistantName}</td>
                        <td className="px-5 py-3 text-[12px] text-slate-400">{conv.messages}</td>
                        <td className="px-5 py-3 text-[12px] text-slate-400">{formatTokens(conv.totalTokensUsed)}</td>
                        <td className="px-5 py-3">
                          {conv.isArchived ? (
                            <span className="text-[11px] text-slate-600">{t('userDetail.archived')}</span>
                          ) : conv.isActive ? (
                            <span className="text-[11px] text-emerald-400">{t('userDetail.statusActive')}</span>
                          ) : (
                            <span className="text-[11px] text-slate-500">{t('userDetail.statusClosed')}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-[12px] text-slate-500">
                          {new Date(conv.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4 flex flex-col items-center justify-center text-center">
      <div className="h-10 w-10 rounded-full bg-[#06d4ef]/10 flex items-center justify-center mb-2">
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-wider font-semibold">{label}</p>
    </div>
  );
}
