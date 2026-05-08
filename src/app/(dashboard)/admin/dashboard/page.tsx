'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import { Bot, MessageSquare, Zap, Database, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { SkeletonKPICard, SkeletonChart, SkeletonTable } from '@/components/ui/skeleton-loaders';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Brush,
} from 'recharts';
import { Cpu } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// Provider → color palette (first model gets index 0, second gets index 1, etc.)
const PROVIDER_PALETTES: Record<string, string[]> = {
  gemini:      ['#06d4ef', '#0891b2', '#22d3ee', '#67e8f9'],
  openrouter:  ['#a855f7', '#7c3aed', '#c084fc', '#e879f9'],
  mistral:     ['#f59e0b', '#d97706', '#fbbf24', '#fde68a'],
  openai:      ['#22c55e', '#16a34a', '#4ade80', '#86efac'],
  anthropic:   ['#ec4899', '#db2777', '#f472b6', '#fbcfe8'],
};
const FALLBACK_PALETTE = ['#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];

function assignModelColors(summary: { model: string; provider: string; tokens: number }[]) {
  const counts: Record<string, number> = {};
  return summary.map(item => {
    const pal = PROVIDER_PALETTES[item.provider] || FALLBACK_PALETTE;
    const idx = counts[item.provider] ?? 0;
    counts[item.provider] = idx + 1;
    return { ...item, color: pal[idx % pal.length] };
  });
}

function ModelTimelineTooltip({ active, payload, label, modelColors }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
  if (total === 0) return null;
  return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', fontSize: 12, minWidth: 200 }}>
      <p style={{ color: '#94a3b8', marginBottom: 8, fontWeight: 600 }}>{String(label).replace('|', ' · ')}</p>
      {[...payload].reverse().filter((p: any) => Number(p.value) > 0).map((p: any) => {
        const mc = modelColors?.find((m: any) => m.model === p.dataKey);
        return (
          <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0, background: mc?.color || '#64748b' }} />
              <span style={{ color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }} title={p.dataKey}>{p.dataKey}</span>
            </div>
            <span style={{ color: '#94a3b8', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{Number(p.value).toLocaleString()}</span>
          </div>
        );
      })}
      <div style={{ borderTop: '1px solid #334155', marginTop: 7, paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#64748b', fontSize: 11 }}>Total</span>
        <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{total.toLocaleString()} tokens</span>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  let s = dateStr.replace(' ', 'T');
  if (!/Z|[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z';
  const seconds = Math.floor((Date.now() - new Date(s).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s atrás`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} dias atrás`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} meses atrás`;
  return `${Math.floor(months / 12)} anos atrás`;
}

// Custom X-axis tick that renders day name + date on two lines
function DateTick({ x, y, payload }: any) {
  const parts = (payload?.value || '').split('|');
  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle">
        <tspan x={0} dy={10} fontSize={11} fill="#64748b">{parts[0]}</tspan>
        {parts[1] && (
          <tspan x={0} dy={13} fontSize={10} fill="#475569">{parts[1]}</tspan>
        )}
      </text>
    </g>
  );
}

type Period = '7' | '30' | '90';

export default function TenantAdminDashboard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('7');
  const [brushRange, setBrushRange] = useState<{ startIndex: number; endIndex: number } | null>(null);

  // Reset brush whenever period changes
  useEffect(() => { setBrushRange(null); }, [period]);

  const { data, error, isLoading: isDataLoading } = useSWR(
    `/dashboard/metrics?period=${period}`,
    fetcher, { refreshInterval: 10000 }
  );

  // Enrich chart entries with a combined tick label "Mon|Apr 9"
  const enrichedCharts = useMemo(() => {
    const raw = data?.charts || [];
    return raw.map((c: any) => {
      const d = new Date(c.date + 'T00:00:00Z');
      const dateLabel = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
      return { ...c, tickLabel: `${c.day}|${dateLabel}` };
    });
  }, [data?.charts]);

  const dataLen = enrichedCharts.length;
  const brushStart = brushRange?.startIndex ?? 0;
  const brushEnd = brushRange?.endIndex ?? Math.max(0, dataLen - 1);
  const visibleCount = brushEnd - brushStart + 1;

  // Tick interval: keep ~7-8 labels visible regardless of dataset size
  const xTickInterval = Math.max(0, Math.ceil(dataLen / 8) - 1);

  const handleBrushChange = useCallback((range: any) => {
    if (range?.startIndex !== undefined && range?.endIndex !== undefined) {
      setBrushRange({ startIndex: range.startIndex, endIndex: range.endIndex });
    }
  }, []);

  const zoomIn = useCallback(() => {
    if (visibleCount <= 3) return;
    const step = Math.max(1, Math.floor(visibleCount * 0.25));
    setBrushRange({
      startIndex: Math.min(brushStart + step, brushEnd - 1),
      endIndex: Math.max(brushEnd - step, brushStart + 1),
    });
  }, [brushStart, brushEnd, visibleCount]);

  const zoomOut = useCallback(() => {
    if (brushStart === 0 && brushEnd === dataLen - 1) return;
    const step = Math.max(1, Math.floor(visibleCount * 0.33));
    setBrushRange({
      startIndex: Math.max(0, brushStart - step),
      endIndex: Math.min(dataLen - 1, brushEnd + step),
    });
  }, [brushStart, brushEnd, visibleCount, dataLen]);

  const resetZoom = useCallback(() => setBrushRange(null), []);

  const isAtFullRange = brushStart === 0 && brushEnd === Math.max(0, dataLen - 1);

  // ── Model-level data ──────────────────────────────────────────────────
  const modelColors = useMemo(
    () => assignModelColors(data?.modelSummary || []),
    [data?.modelSummary],
  );

  const enrichedModelTimeline = useMemo(() => {
    const raw: any[] = data?.modelTimeline || [];
    return raw.map((c) => {
      const d = new Date(c.date + 'T00:00:00Z');
      const dateLabel = `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
      return { ...c, tickLabel: `${c.day}|${dateLabel}` };
    });
  }, [data?.modelTimeline]);

  const totalModelTokens = useMemo(
    () => modelColors.reduce((s, m) => s + m.tokens, 0),
    [modelColors],
  );

  const hasModelData = modelColors.length > 0 && totalModelTokens > 0;

  if (isDataLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[#111315]">
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#111315]/90">
            <div className="px-6 md:px-8 pt-8 pb-4 flex flex-col gap-1">
              <div className="skeleton" style={{ width: '35%', height: 28, marginBottom: 6 }} />
              <div className="skeleton" style={{ width: '50%', height: 14 }} />
            </div>
          </div>
          <div className="px-6 md:px-8 py-4 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard /><SkeletonKPICard />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SkeletonChart height={300} /><SkeletonChart height={300} />
            </div>
            <SkeletonTable rows={5} cols={5} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-[#111315]">
        <p className="text-red-400 font-medium">Error loading dashboard data.</p>
      </div>
    );
  }

  const kpis = data?.kpis || { assistants: 0, conversationsToday: 0, tokensTotal: 0, documents: 0 };
  const recentConversations = data?.recentConversations || [];

  const formatTokens = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  const periodLabels: Record<Period, string> = { '7': '7D', '30': '30D', '90': '90D' };

  const ctrlBtn = `flex items-center justify-center h-7 w-7 rounded-lg border border-slate-700
    text-slate-400 hover:text-slate-200 hover:border-slate-500 transition-colors
    disabled:opacity-30 disabled:cursor-not-allowed`;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#111315]">
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#111315]/90">
          <div className="px-6 md:px-8 pt-8 pb-4 flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-100">{t('dashboard.title')}</h1>
            <p className="text-[13px] text-slate-400">{t('dashboard.subtitle')}</p>
          </div>
        </div>

        <div className="px-6 md:px-8 py-4 space-y-6">

          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded flex items-center justify-center">
                  <Bot className="h-5 w-5 text-slate-400" />
                </div>
                <span className="text-[11px] font-medium text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">+2</span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-100">{kpis.assistants}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{t('dashboard.activeAssistants')}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-[#06d4ef]" />
                </div>
                <span className="text-[11px] font-medium text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">+18%</span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-100">{kpis.conversationsToday}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{t('dashboard.conversationsToday')}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-400" />
                </div>
                <span className="text-[11px] font-medium text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">+5%</span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-100">{formatTokens(kpis.tokensTotal)}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{t('dashboard.tokensConsumed')}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="h-8 w-8 rounded flex items-center justify-center">
                  <Database className="h-5 w-5 text-emerald-400" />
                </div>
                <span className="text-[11px] font-medium text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">+34</span>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-slate-100">{kpis.documents.toLocaleString()}</p>
                <p className="text-[11px] text-slate-500 font-medium mt-1">{t('dashboard.documents')}</p>
              </div>
            </div>
          </div>

          {/* ── Chart Controls Row ── */}
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-slate-500 font-medium">
              {visibleCount < dataLen
                ? `Showing ${visibleCount} of ${dataLen} days`
                : `Showing ${dataLen} day${dataLen !== 1 ? 's' : ''}`}
            </p>
            <div className="flex items-center gap-1.5">
              {/* Period selector */}
              {(['7', '30', '90'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                    period === p
                      ? 'bg-[#06d4ef] text-[#0d0f12]'
                      : 'text-slate-400 border border-slate-700 hover:text-slate-200 hover:border-slate-600'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              ))}

              {/* Divider */}
              <div className="h-4 w-px bg-slate-700 mx-1" />

              {/* Zoom controls */}
              <button
                onClick={zoomOut}
                disabled={isAtFullRange}
                className={ctrlBtn}
                title="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={zoomIn}
                disabled={visibleCount <= 3}
                className={ctrlBtn}
                title="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={resetZoom}
                disabled={isAtFullRange}
                className={ctrlBtn}
                title="Reset zoom"
              >
                <RotateCcw className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* ── Charts ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 -mt-3">

            {/* Conversations Area Chart */}
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5 h-[390px] flex flex-col">
              <h2 className="text-[13px] font-semibold text-slate-200 mb-4">
                {t('dashboard.conversationsPerDay')}
              </h2>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={enrichedCharts} margin={{ top: 4, right: 4, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorConvs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06d4ef" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#06d4ef" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2e3a47" opacity={0.5} />
                    <XAxis
                      dataKey="tickLabel"
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      tick={<DateTick />}
                      interval={xTickInterval}
                      height={42}
                    />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                      labelFormatter={(label: any) => String(label).replace('|', ' · ')}
                    />
                    <Area type="monotone" dataKey="conversations" stroke="#06d4ef" strokeWidth={2} fillOpacity={1} fill="url(#colorConvs)" />
                    {dataLen > 0 && (
                      <Brush
                        dataKey="tickLabel"
                        height={28}
                        stroke="#2e3a47"
                        fill="#0d0f12"
                        travellerWidth={6}
                        startIndex={brushStart}
                        endIndex={brushEnd}
                        onChange={handleBrushChange}
                        tickFormatter={(val: string) => val.split('|')[0]}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tokens Bar Chart */}
            <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5 h-[390px] flex flex-col">
              <h2 className="text-[13px] font-semibold text-slate-200 mb-4">
                {t('dashboard.tokensConsumedChart')}
              </h2>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrichedCharts} margin={{ top: 4, right: 4, left: 0, bottom: 5 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2e3a47" opacity={0.5} />
                    <XAxis
                      dataKey="tickLabel"
                      stroke="#64748b"
                      tickLine={false}
                      axisLine={false}
                      tick={<DateTick />}
                      interval={xTickInterval}
                      height={42}
                    />
                    <YAxis
                      stroke="#64748b" fontSize={11} tickLine={false} axisLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                      dx={-10}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: '#e2e8f0' }}
                      cursor={{ fill: '#2e3a47', opacity: 0.4 }}
                      labelFormatter={(label: any) => String(label).replace('|', ' · ')}
                      formatter={(val: any) => [Number(val).toLocaleString() + ' tokens', 'Consumed']}
                    />
                    <Bar dataKey="tokens" fill="#06d4ef" radius={[2, 2, 0, 0]} />
                    {dataLen > 0 && (
                      <Brush
                        dataKey="tickLabel"
                        height={28}
                        stroke="#2e3a47"
                        fill="#0d0f12"
                        travellerWidth={6}
                        startIndex={brushStart}
                        endIndex={brushEnd}
                        onChange={handleBrushChange}
                        tickFormatter={(val: string) => val.split('|')[0]}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Model Usage Charts ── */}
          {hasModelData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Chart: Token Timeline by Model (stacked bar) */}
              <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5 h-[420px] flex flex-col">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-6 rounded-md bg-purple-500/15 flex items-center justify-center">
                    <Cpu className="h-3.5 w-3.5 text-purple-400" />
                  </div>
                  <h2 className="text-[13px] font-semibold text-slate-200">{t('analytics.tokensByModelTimeline')}</h2>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={enrichedModelTimeline}
                      margin={{ top: 4, right: 4, left: 0, bottom: 5 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2e3a47" opacity={0.5} />
                      <XAxis
                        dataKey="tickLabel"
                        stroke="#64748b"
                        tickLine={false}
                        axisLine={false}
                        tick={<DateTick />}
                        interval={xTickInterval}
                        height={42}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                        dx={-10}
                      />
                      <Tooltip
                        content={(props) => <ModelTimelineTooltip {...props} modelColors={modelColors} />}
                        cursor={{ fill: '#2e3a47', opacity: 0.4 }}
                      />
                      {modelColors.map((m) => (
                        <Bar key={m.model} dataKey={m.model} stackId="s" fill={m.color} />
                      ))}
                      {dataLen > 0 && (
                        <Brush
                          dataKey="tickLabel"
                          height={28}
                          stroke="#2e3a47"
                          fill="#0d0f12"
                          travellerWidth={6}
                          startIndex={brushStart}
                          endIndex={brushEnd}
                          onChange={handleBrushChange}
                          tickFormatter={(val: string) => val.split('|')[0]}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart: Model Distribution Leaderboard */}
              <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5 h-[420px] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-md bg-purple-500/15 flex items-center justify-center ring-1 ring-purple-500/20">
                      <Cpu className="h-4 w-4 text-purple-300" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-slate-100 tracking-tight">
                        {t('analytics.tokenUsageByModel')}
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {t('analytics.shareOfTokens')}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium tabular-nums shrink-0">
                    {modelColors.length} model{modelColors.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Column labels — aligns with grid below for quick scanning */}
                <div
                  className="grid grid-cols-[minmax(0,1fr)_5.75rem_3rem_4.5rem] gap-x-3 px-0.5 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                  aria-hidden
                >
                  <span>Model</span>
                  <span className="text-center">Provider</span>
                  <span className="text-right">Share</span>
                  <span className="text-right">Tokens</span>
                </div>

                <div
                  className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-5
                    [scrollbar-width:thin] [scrollbar-color:rgb(51_65_85)_transparent]
                    [&::-webkit-scrollbar]:w-1.5
                    [&::-webkit-scrollbar-track]:bg-transparent
                    [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600/80"
                >
                  {modelColors.map((m) => {
                    const pct = totalModelTokens > 0 ? (m.tokens / totalModelTokens) * 100 : 0;
                    const barW = pct > 0 ? Math.max(pct, 1.2) : 0;
                    return (
                      <div key={m.model} className="pb-1">
                        <div className="grid grid-cols-[minmax(0,1fr)_5.75rem_3rem_4.5rem] gap-x-3 gap-y-2 items-center">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-2 h-2 rounded-full shrink-0 ring-2 ring-white/10"
                              style={{ background: m.color, boxShadow: `0 0 0 1px ${m.color}40` }}
                            />
                            <span
                              className="text-[13px] text-slate-100 font-medium truncate leading-snug"
                              title={m.model}
                            >
                              {m.model}
                            </span>
                          </div>
                          <div className="flex justify-center">
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-white/5 max-w-full truncate"
                              style={{ color: m.color, background: `${m.color}18` }}
                              title={m.provider}
                            >
                              {m.provider}
                            </span>
                          </div>
                          <span className="text-[12px] text-slate-300 tabular-nums text-right font-medium">
                            {Math.round(pct)}%
                          </span>
                          <span className="text-[13px] text-slate-50 tabular-nums text-right font-semibold">
                            {formatTokens(m.tokens)}
                          </span>
                        </div>
                        <div className="mt-2.5 h-1.5 bg-slate-800/90 rounded-full overflow-hidden ring-1 ring-slate-700/40">
                          <div
                            className="h-full rounded-full transition-[width] duration-700 ease-out opacity-95"
                            style={{ width: `${barW}%`, background: m.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer total */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                    Total
                  </span>
                  <span className="text-sm font-bold text-slate-100 tabular-nums">
                    {formatTokens(totalModelTokens)} tokens
                  </span>
                </div>
              </div>

            </div>
          ) : (
            /* Empty state — shown when no model usage data exists yet */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-xl border border-slate-800/60 bg-[#1a1d21]/60 p-5 h-[160px] flex flex-col items-center justify-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-800/60 flex items-center justify-center">
                    <Cpu className="h-5 w-5 text-slate-600" />
                  </div>
                  <p className="text-[12px] text-slate-600 text-center">
                    {i === 0 ? t('analytics.tokensByModelTimeline') : t('analytics.tokenUsageByModel')}<br />
                    <span className="text-[11px] text-slate-700">{t('analytics.noModelUsageData')}</span>
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* ── Recent Conversations Table ── */}
          <div className="rounded-xl border border-slate-800 bg-[#1a1d21] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="text-[13px] font-semibold text-slate-200">{t('dashboard.recentConversations')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-[#111315]/50">
                    <th className="px-5 py-3">{t('dashboard.user')}</th>
                    <th className="px-5 py-3">{t('dashboard.assistant')}</th>
                    <th className="px-5 py-3">{t('dashboard.messages')}</th>
                    <th className="px-5 py-3">{t('dashboard.time')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentConversations.map((conv: any) => (
                    <tr key={conv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-medium text-slate-300">
                            {conv.userName[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-[12px] text-slate-200 font-medium">{conv.userName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="inline-flex flex-col gap-1 items-start">
                          <span className="text-[12px] text-slate-300 font-medium px-2 py-0.5 bg-[#06d4ef]/10 text-[#06d4ef] rounded-md border border-[#06d4ef]/20">{conv.assistantName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-slate-400">
                        {conv.messages || 0}
                      </td>
                      <td className="px-5 py-3.5 text-[12px] text-slate-500">
                        {conv.createdAt ? getTimeAgo(conv.createdAt) : ''}
                      </td>
                    </tr>
                  ))}
                  {recentConversations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-6 text-center text-slate-500 text-[12px]">
                        {t('dashboard.noRecentConversations')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
