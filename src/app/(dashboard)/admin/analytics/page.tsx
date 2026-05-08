'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import api from '@/lib/api';
import { ThumbsUp, ThumbsDown, Clock, TrendingUp, Zap, Bot, Download, AlertCircle, MessageSquare, Cpu, Timer, Star } from 'lucide-react';
import { SkeletonKPICard, SkeletonChart, SkeletonAssistantPerformanceCard } from '@/components/ui/skeleton-loaders';
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from 'recharts';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

// ── Custom Tooltips ────────────────────────────────────────────────────

function ResponseTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-[12px] shadow-xl">
      <p className="text-slate-400 mb-0.5">{label}</p>
      <p className="text-[#f59e0b] font-semibold">{payload[0].value}s</p>
    </div>
  );
}

function TrendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-[12px] shadow-xl">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-[#06d4ef] font-semibold">{payload[0].value} conversations</p>
      {payload[1] && (
        <p className="text-amber-400 font-semibold">{payload[1].value.toLocaleString()} tokens</p>
      )}
    </div>
  );
}

// ── CSV Export helper ──────────────────────────────────────────────────

function downloadCSV(data: any, period: string, t: (key: string) => string) {
  const rows: string[][] = [];

  rows.push([t('analytics.title'), `${t('analytics.period' + period)}`]);
  rows.push([]);
  rows.push([t('analytics.avgSatisfaction'), `${data.avgSatisfaction}%`]);
  rows.push([t('analytics.avgResponseTime'), `${data.avgResponseTime}s`]);
  rows.push([t('analytics.conversationsThisPeriod'), `${data.conversationsCount}`]);
  rows.push([t('analytics.tokensThisPeriod'), data.tokensLabel]);
  rows.push([]);

  rows.push(['User Feedback']);
  rows.push(['Type', 'Count', '%']);
  rows.push(['Positive', `${data.upVotes || 0}`, `${data.satisfaction?.[0]?.value || 0}%`]);
  rows.push(['Negative', `${data.downVotes || 0}`, `${data.satisfaction?.[1]?.value || 0}%`]);
  rows.push([]);

  rows.push([t('analytics.responseTimeByHour')]);
  rows.push(['Hour', 'Time (s)']);
  (data.responseByHour || []).forEach((r: any) => {
    rows.push([r.hour, `${r.time}`]);
  });
  rows.push([]);

  rows.push(['Daily Trend']);
  rows.push(['Date', t('analytics.conversations'), 'Tokens']);
  (data.dailyTrend || []).forEach((d: any) => {
    rows.push([d.label, `${d.conversations}`, `${d.tokens}`]);
  });
  rows.push([]);

  rows.push([t('analytics.performanceByAssistant')]);
  rows.push([t('analytics.assistant'), t('analytics.modelLabel'), t('analytics.conversations'), t('analytics.tokens'), t('analytics.responseTime'), t('analytics.satisfaction'), t('analytics.positive'), t('analytics.negative')]);
  (data.assistants || []).forEach((a: any) => {
    rows.push([a.name, a.model || '', `${a.conversations}`, a.tokens, a.avgResponseTime > 0 ? `${a.avgResponseTime}s` : '', a.satisfaction !== null ? `${a.satisfaction}%` : '', `${a.upVotes ?? 0}`, `${a.downVotes ?? 0}`]);
  });

  const csvContent = rows.map(row =>
    row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analytics_${period}d_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Main page ──────────────────────────────────────────────────────────

type PeriodKey = '1' | '7' | '30' | '90';

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodKey>('30');

  const { data, error, isLoading } = useSWR(
    `/dashboard/analytics?period=${period}`,
    fetcher,
    { refreshInterval: 30000, keepPreviousData: false },
  );

  const periods: { key: PeriodKey; label: string }[] = [
    { key: '1',  label: t('analytics.period1') },
    { key: '7',  label: t('analytics.period7') },
    { key: '30', label: t('analytics.period30') },
    { key: '90', label: t('analytics.period90') },
  ];

  const handleExport = useCallback(() => {
    if (!data) return;
    try {
      downloadCSV(data, period, t);
    } catch (err) {
      console.error('Export failed', err);
    }
  }, [data, period, t]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[#111315]">
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#111315]/90 border-b border-slate-800/50">
            <div className="px-6 md:px-8 pt-7 pb-4 flex items-start justify-between gap-4">
              <div>
                <div className="skeleton" style={{ width: 160, height: 26, marginBottom: 6 }} />
                <div className="skeleton" style={{ width: 220, height: 14 }} />
              </div>
              <div className="flex items-center gap-2">
                {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ width: 60, height: 32, borderRadius: 999 }} />)}
              </div>
            </div>
          </div>
          <div className="px-6 md:px-8 pb-8 space-y-4 pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SkeletonKPICard />
              <SkeletonKPICard />
              <SkeletonKPICard />
              <SkeletonKPICard />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonChart height={280} />
              <SkeletonChart height={280} />
            </div>
            <SkeletonChart height={320} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SkeletonAssistantPerformanceCard />
              <SkeletonAssistantPerformanceCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-[#111315] gap-3">
        <AlertCircle className="h-10 w-10 text-red-400 opacity-70" />
        <p className="text-red-400 font-medium text-sm">{t('analytics.errorLoading')}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-1.5 text-sm rounded-full border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  const d = data || {
    avgSatisfaction: 0,
    avgResponseTime: 0,
    conversationsCount: 0,
    tokensLabel: '0',
    totalVotes: 0,
    upVotes: 0,
    downVotes: 0,
    satisfaction: [],
    responseByHour: [],
    dailyTrend: [],
    assistants: [],
  };

  // Chart tick control for daily trend
  const trendData = d.dailyTrend || [];
  const tickInterval = trendData.length > 14 ? Math.ceil(trendData.length / 10) - 1 : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#111315]">
      <div className="flex-1 overflow-y-auto">

        {/* ── Header ── */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#111315]/90 border-b border-slate-800/50">
          <div className="px-6 md:px-8 pt-7 pb-4 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">{t('analytics.title')}</h1>
              <p className="text-[13px] text-slate-400 mt-0.5">{t('analytics.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {periods.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                    period === p.key
                      ? 'bg-[#06d4ef] text-[#0d0f12]'
                      : 'text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={handleExport}
                disabled={!data}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Download className="h-3.5 w-3.5" />
                {t('analytics.export')}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 pb-8 space-y-4 pt-4">

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5">
              <ThumbsUp className="h-5 w-5 text-green-400 mb-3" />
              <p className="text-3xl font-bold text-slate-100">{d.avgSatisfaction}%</p>
              <p className="text-[12px] text-slate-500 mt-1">{t('analytics.avgSatisfaction')}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5">
              <Clock className="h-5 w-5 text-[#06d4ef] mb-3" />
              <p className="text-3xl font-bold text-slate-100">{d.avgResponseTime}s</p>
              <p className="text-[12px] text-slate-500 mt-1">{t('analytics.avgResponseTime')}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5">
              <TrendingUp className="h-5 w-5 text-yellow-400 mb-3" />
              <p className="text-3xl font-bold text-slate-100">{d.conversationsCount.toLocaleString()}</p>
              <p className="text-[12px] text-slate-500 mt-1">{t('analytics.conversationsThisPeriod')}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5">
              <Zap className="h-5 w-5 text-[#06d4ef] mb-3" />
              <p className="text-3xl font-bold text-slate-100">{d.tokensLabel}</p>
              <p className="text-[12px] text-slate-500 mt-1">{t('analytics.tokensThisPeriod')}</p>
            </div>
          </div>

          {/* ── Row 2: Satisfaction + Response Time ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Satisfaction — real positive/negative breakdown */}
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5">
              <h2 className="text-[13px] font-semibold text-slate-200 mb-4">{t('analytics.userSatisfaction')}</h2>
              {d.totalVotes > 0 ? (
                <div className="space-y-5">
                  {/* Large centered percentage */}
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-emerald-400">{d.avgSatisfaction}%</p>
                      <p className="text-[12px] text-slate-500 mt-1">{d.totalVotes} total votes</p>
                    </div>
                  </div>

                  {/* Horizontal bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-[13px] font-semibold text-emerald-400">{d.satisfaction?.[0]?.value || 0}%</span>
                        <span className="text-[11px] text-slate-500">({d.upVotes})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">({d.downVotes})</span>
                        <span className="text-[13px] font-semibold text-red-400">{d.satisfaction?.[1]?.value || 0}%</span>
                        <ThumbsDown className="h-3.5 w-3.5 text-red-400" />
                      </div>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full transition-all duration-700"
                        style={{ width: `${d.satisfaction?.[0]?.value || 0}%` }}
                      />
                      {(d.satisfaction?.[1]?.value || 0) > 0 && (
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-r-full transition-all duration-700"
                          style={{ width: `${d.satisfaction?.[1]?.value || 0}%` }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-[13px] gap-2">
                  <ThumbsUp className="h-8 w-8 text-slate-700" />
                  {t('analytics.noVotesYet')}
                </div>
              )}
            </div>

            {/* Area chart – Response time by hour (all 24 hours) */}
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5 h-[280px] flex flex-col">
              <h2 className="text-[13px] font-semibold text-slate-200 mb-4">{t('analytics.responseTimeByHour')}</h2>
              <div className="flex-1 min-h-0">
                {d.responseByHour.length > 0 && d.responseByHour.some((r: any) => r.time > 0) ? (
                  <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                    <AreaChart data={d.responseByHour} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2e3a47" opacity={0.5} />
                      <XAxis
                        dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} dy={8}
                        interval={2}
                      />
                      <YAxis
                        stroke="#64748b" fontSize={11} tickLine={false} axisLine={false}
                        tickFormatter={(v) => `${v}s`}
                        domain={[0, 'auto']}
                      />
                      <Tooltip content={<ResponseTooltip />} />
                      <Area
                        type="monotone" dataKey="time"
                        stroke="#f59e0b" strokeWidth={2}
                        fill="url(#responseGradient)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 text-[13px] gap-2">
                    <Timer className="h-8 w-8 text-slate-700" />
                    {t('analytics.noDataYet')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Daily Activity Trend ── */}
          <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5 h-[320px] flex flex-col">
            <h2 className="text-[13px] font-semibold text-slate-200 mb-4">
              {t('analytics.weeklyTrend')}
            </h2>
            <div className="flex-1 min-h-0">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minHeight={0} minWidth={0}>
                  <BarChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="20%">
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06d4ef" stopOpacity={1} />
                        <stop offset="100%" stopColor="#06d4ef" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2e3a47" opacity={0.5} />
                    <XAxis
                      dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={8}
                      interval={tickInterval}
                    />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<TrendTooltip />} />
                    <Bar dataKey="conversations" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-[13px] gap-2">
                  <TrendingUp className="h-8 w-8 text-slate-700" />
                  {t('analytics.noDataYet')}
                </div>
              )}
            </div>
          </div>

          {/* ── Performance by Assistant ── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-[#06d4ef]/10 border border-[#06d4ef]/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-[#06d4ef]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-100">{t('analytics.performanceByAssistant')}</h2>
                  {d.assistants.length > 0 && (
                    <p className="text-[11px] text-slate-500">{d.assistants.length} {t('analytics.assistantCount')}</p>
                  )}
                </div>
              </div>
            </div>

            {d.assistants.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#1a1d21] py-16 flex flex-col items-center justify-center gap-3">
                <Bot className="h-10 w-10 text-slate-700" />
                <p className="text-slate-500 text-[13px]">{t('analytics.noDataYet')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {d.assistants.map((a: any, idx: number) => {
                  const total = (a.upVotes ?? 0) + (a.downVotes ?? 0);
                  const upPct = total > 0 ? Math.round((a.upVotes / total) * 100) : 0;
                  const downPct = total > 0 ? 100 - upPct : 0;
                  const hasVotes = total > 0;
                  const satisfactionColor = a.satisfaction === null ? 'text-slate-600' : a.satisfaction >= 70 ? 'text-emerald-400' : a.satisfaction >= 40 ? 'text-amber-400' : 'text-red-400';
                  const satisfactionBg = a.satisfaction === null ? 'bg-slate-800' : a.satisfaction >= 70 ? 'bg-emerald-500/10' : a.satisfaction >= 40 ? 'bg-amber-500/10' : 'bg-red-500/10';

                  return (
                    <div
                      key={a.name + idx}
                      className="rounded-2xl border border-slate-800 bg-[#1a1d21] overflow-hidden hover:border-slate-700 transition-all duration-300"
                    >
                      {/* Card Header */}
                      <div className="px-5 pt-5 pb-4 border-b border-slate-800/60">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#06d4ef]/20 to-[#06d4ef]/5 border border-[#06d4ef]/25 flex items-center justify-center shrink-0">
                            <Bot className="h-5 w-5 text-[#06d4ef]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[16px] font-bold text-slate-50 truncate">{a.name}</p>
                            {a.model && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <Cpu className="h-3 w-3 text-slate-500 shrink-0" />
                                <span className="text-[11px] text-slate-400 font-medium bg-slate-800/60 px-2 py-0.5 rounded-md truncate">{a.model}</span>
                              </div>
                            )}
                          </div>
                          <div className={`shrink-0 px-3 py-1.5 rounded-xl ${satisfactionBg} flex items-center gap-1.5`}>
                            <Star className={`h-3.5 w-3.5 ${satisfactionColor}`} />
                            <span className={`text-[14px] font-bold ${satisfactionColor}`}>
                              {a.satisfaction !== null ? `${a.satisfaction}%` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Metric Tiles */}
                      <div className="grid grid-cols-3 divide-x divide-slate-800/50">
                        <div className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-[#06d4ef]" />
                          </div>
                          <p className="text-[20px] font-bold text-slate-100">{a.conversations.toLocaleString()}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 font-medium">{t('analytics.conversations')}</p>
                        </div>
                        <div className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1.5">
                            <Zap className="h-3.5 w-3.5 text-amber-400" />
                          </div>
                          <p className="text-[20px] font-bold text-slate-100">{a.tokens}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 font-medium">{t('analytics.tokens')}</p>
                        </div>
                        <div className="px-4 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 mb-1.5">
                            <Timer className="h-3.5 w-3.5 text-violet-400" />
                          </div>
                          <p className="text-[20px] font-bold text-slate-100">{a.avgResponseTime > 0 ? `${a.avgResponseTime}s` : '—'}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5 font-medium">{t('analytics.responseTime')}</p>
                        </div>
                      </div>

                      {/* Feedback Bar */}
                      <div className="px-5 py-4 border-t border-slate-800/60 bg-[#161a1d]">
                        {hasVotes ? (
                          <>
                            <div className="flex items-center justify-between mb-2.5">
                              <div className="flex items-center gap-1.5">
                                <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-[13px] font-bold text-emerald-400">{upPct}%</span>
                                <span className="text-[11px] text-slate-500 ml-0.5">({a.upVotes})</span>
                              </div>
                              <span className="text-[11px] text-slate-600 font-medium">
                                {total} {t('analytics.votes')}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-500 mr-0.5">({a.downVotes})</span>
                                <span className="text-[13px] font-bold text-red-400">{downPct}%</span>
                                <ThumbsDown className="h-3.5 w-3.5 text-red-400" />
                              </div>
                            </div>
                            <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-l-full transition-all duration-700"
                                style={{ width: `${upPct}%` }}
                              />
                              <div
                                className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-r-full transition-all duration-700"
                                style={{ width: `${downPct}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center gap-2 py-1">
                            <ThumbsUp className="h-3.5 w-3.5 text-slate-600" />
                            <span className="text-[12px] text-slate-600 italic">{t('analytics.noFeedbackYet')}</span>
                            <ThumbsDown className="h-3.5 w-3.5 text-slate-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
