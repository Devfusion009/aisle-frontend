'use client';

import React from 'react';

// ── Base Skeleton Block ─────────────────────────────────────────────────
function Sk({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

// ── KPI / Stat Card ─────────────────────────────────────────────────────
export function SkeletonKPICard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5">
      <Sk className="skeleton-circle" style={{ width: 20, height: 20, marginBottom: 12 }} />
      <Sk style={{ width: '50%', height: 28, marginBottom: 8 }} />
      <Sk className="skeleton-text xs" />
    </div>
  );
}

// ── Chart Container ─────────────────────────────────────────────────────
export function SkeletonChart({ height = 280 }: { height?: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5 flex flex-col" style={{ height }}>
      <Sk style={{ width: '40%', height: 14, marginBottom: 16 }} />
      <div className="flex-1 relative overflow-hidden rounded-lg">
        <Sk className="skeleton-rounded" style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

// ── Table ────────────────────────────────────────────────────────────────
export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-slate-800/40">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Sk style={{ width: `${60 + Math.random() * 30}%`, height: 14 }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#1a1d21] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <Sk style={{ width: '70%', height: 10 }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── User Table Row ──────────────────────────────────────────────────────
export function SkeletonUserRow() {
  return (
    <tr className="border-b border-slate-800/40">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Sk className="skeleton-circle" style={{ width: 32, height: 32, flexShrink: 0 }} />
          <div className="flex-1">
            <Sk style={{ width: '60%', height: 14, marginBottom: 4 }} />
            <Sk style={{ width: '40%', height: 10 }} />
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5"><Sk style={{ width: 70, height: 20, borderRadius: 999 }} /></td>
      <td className="px-5 py-3.5"><Sk style={{ width: 60, height: 20, borderRadius: 999 }} /></td>
      <td className="px-5 py-3.5"><Sk style={{ width: 50, height: 14 }} /></td>
      <td className="px-5 py-3.5"><Sk style={{ width: 70, height: 14 }} /></td>
      <td className="px-5 py-3.5 text-right"><Sk style={{ width: 60, height: 28, borderRadius: 8, marginLeft: 'auto' }} /></td>
    </tr>
  );
}

// ── Assistant Card ──────────────────────────────────────────────────────
export function SkeletonAssistantCard() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#1a1d21] p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Sk className="skeleton-rounded" style={{ width: 44, height: 44, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <Sk style={{ width: '70%', height: 16, marginBottom: 6 }} />
          <Sk style={{ width: '50%', height: 12 }} />
        </div>
        <Sk style={{ width: 60, height: 24, borderRadius: 12 }} />
      </div>
      <Sk className="skeleton-text" />
      <Sk className="skeleton-text short" />
      <div className="flex items-center gap-2 mt-auto">
        <Sk style={{ width: 80, height: 24, borderRadius: 6 }} />
        <Sk style={{ width: 60, height: 24, borderRadius: 6 }} />
      </div>
    </div>
  );
}

// ── Knowledge Folder Card ───────────────────────────────────────────────
export function SkeletonFolderCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4 flex items-center gap-3">
      <Sk className="skeleton-rounded" style={{ width: 40, height: 40, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <Sk style={{ width: '60%', height: 14, marginBottom: 6 }} />
        <Sk style={{ width: '35%', height: 10 }} />
      </div>
    </div>
  );
}

// ── Document Row ────────────────────────────────────────────────────────
export function SkeletonDocumentRow() {
  return (
    <tr className="border-b border-slate-800/40">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Sk className="skeleton-rounded" style={{ width: 28, height: 28, flexShrink: 0 }} />
          <Sk style={{ width: '55%', height: 14 }} />
        </div>
      </td>
      <td className="px-4 py-3"><Sk style={{ width: 60, height: 14 }} /></td>
      <td className="px-4 py-3"><Sk style={{ width: 50, height: 20, borderRadius: 12 }} /></td>
      <td className="px-4 py-3"><Sk style={{ width: 80, height: 14 }} /></td>
      <td className="px-4 py-3"><Sk style={{ width: 50, height: 14 }} /></td>
    </tr>
  );
}

// ── API Key Card ────────────────────────────────────────────────────────
export function SkeletonApiKeyCard() {
  return (
    <div className="bg-[#16191e] border border-slate-800 rounded-xl px-5 py-4 flex items-start gap-4">
      <Sk className="skeleton-rounded" style={{ width: 36, height: 36, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <Sk style={{ width: '35%', height: 16 }} />
          <Sk style={{ width: 50, height: 18, borderRadius: 6 }} />
        </div>
        <Sk style={{ width: '80%', height: 12, marginBottom: 6 }} />
        <div className="flex items-center gap-3">
          <Sk style={{ width: 100, height: 12 }} />
          <Sk style={{ width: 80, height: 12 }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Sk style={{ width: 70, height: 28, borderRadius: 8 }} />
        <Sk style={{ width: 60, height: 28, borderRadius: 8 }} />
      </div>
    </div>
  );
}

// ── Conversation Sidebar Item ───────────────────────────────────────────
export function SkeletonConversationItem() {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 border-b border-slate-800/60">
      <Sk className="skeleton-circle" style={{ width: 36, height: 36, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <Sk style={{ width: '55%', height: 14 }} />
          <Sk style={{ width: 45, height: 16, borderRadius: 4 }} />
        </div>
        <Sk style={{ width: '80%', height: 12, marginBottom: 6 }} />
      </div>
    </div>
  );
}

// ── Sidebar Chat Link Item ──────────────────────────────────────────────
export function SkeletonSidebarChatItem({ delay = 0 }: { delay?: number }) {
  return (
    <div className="flex items-center w-full rounded-lg px-2.5 py-2.5 mb-[2px]">
      <Sk className="skeleton-rounded" style={{ width: `${80 - Math.random() * 30}%`, height: 14, animationDelay: `${delay}ms` }} />
    </div>
  );
}

// ── Chat Message Skeleton ───────────────────────────────────────────────
export function SkeletonChatMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <Sk className="skeleton-circle" style={{ width: 32, height: 32, flexShrink: 0, marginTop: 4 }} />
      <div className={`max-w-[72%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl ${isUser ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}>
          <Sk style={{ width: isUser ? 150 : 220, height: 14, marginBottom: 6 }} />
          {!isUser && <Sk style={{ width: 180, height: 14, marginBottom: 6 }} />}
          <Sk style={{ width: isUser ? 100 : 140, height: 14 }} />
        </div>
        <Sk style={{ width: 50, height: 10, marginTop: 4 }} />
      </div>
    </div>
  );
}

// ── Connector Card ──────────────────────────────────────────────────────
export function SkeletonConnectorCard() {
  return (
    <div className="bg-[#16191e] border border-slate-700/40 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Sk className="skeleton-rounded" style={{ width: 42, height: 42, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <Sk style={{ width: '50%', height: 16, marginBottom: 6 }} />
          <Sk style={{ width: '80%', height: 12 }} />
        </div>
      </div>
      <Sk style={{ width: '100%', height: 32, borderRadius: 8 }} />
    </div>
  );
}

// ── Webhook Card ────────────────────────────────────────────────────────
export function SkeletonWebhookCard() {
  return (
    <div className="bg-[#16191e] border border-slate-700/40 rounded-xl px-5 py-4 flex items-start gap-4">
      <Sk className="skeleton-rounded" style={{ width: 32, height: 32, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <Sk style={{ width: '30%', height: 16 }} />
          <Sk style={{ width: 50, height: 18, borderRadius: 12 }} />
        </div>
        <Sk style={{ width: '70%', height: 12, marginBottom: 8 }} />
        <div className="flex flex-wrap gap-1.5">
          <Sk style={{ width: 100, height: 20, borderRadius: 12 }} />
          <Sk style={{ width: 80, height: 20, borderRadius: 12 }} />
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Sk style={{ width: 28, height: 28, borderRadius: 8 }} />
        <Sk style={{ width: 28, height: 28, borderRadius: 8 }} />
      </div>
    </div>
  );
}

// ── API Log Table Row ───────────────────────────────────────────────────
export function SkeletonLogRow() {
  return (
    <tr className="border-b border-slate-800/40">
      <td className="px-4 py-3"><Sk style={{ width: 40, height: 20, borderRadius: 4 }} /></td>
      <td className="px-4 py-3"><Sk style={{ width: 80, height: 14 }} /></td>
      <td className="px-4 py-3"><Sk style={{ width: 100, height: 14 }} /></td>
      <td className="px-4 py-3"><Sk style={{ width: 30, height: 14 }} /></td>
      <td className="px-4 py-3"><Sk style={{ width: 50, height: 14 }} /></td>
      <td className="px-4 py-3"><Sk style={{ width: 90, height: 14 }} /></td>
    </tr>
  );
}

// ── Billing Resource Card ───────────────────────────────────────────────
export function SkeletonBillingCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sk className="skeleton-circle" style={{ width: 16, height: 16 }} />
        <Sk style={{ width: '40%', height: 12 }} />
      </div>
      <Sk style={{ width: '70%', height: 20, marginBottom: 8 }} />
      <Sk style={{ width: '100%', height: 8, borderRadius: 999 }} />
      <Sk style={{ width: 50, height: 10, marginTop: 4 }} />
    </div>
  );
}

// ── Billing Plan Card ───────────────────────────────────────────────────
export function SkeletonPlanCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Sk className="skeleton-rounded" style={{ width: 48, height: 48 }} />
        <div>
          <Sk style={{ width: 80, height: 10, marginBottom: 8 }} />
          <div className="flex items-center gap-2">
            <Sk style={{ width: 100, height: 22 }} />
            <Sk style={{ width: 40, height: 20, borderRadius: 12 }} />
          </div>
        </div>
      </div>
      <Sk style={{ width: 130, height: 36, borderRadius: 8 }} />
    </div>
  );
}

// ── User-Home Stat Card ─────────────────────────────────────────────────
export function SkeletonStatCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5 flex items-center gap-4">
      <Sk className="skeleton-rounded" style={{ width: 44, height: 44, flexShrink: 0 }} />
      <div className="flex-1">
        <Sk style={{ width: '30%', height: 10, marginBottom: 6 }} />
        <Sk style={{ width: '50%', height: 24 }} />
      </div>
    </div>
  );
}

// ── Quick Action Card ───────────────────────────────────────────────────
export function SkeletonQuickAction() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4 flex items-center gap-3">
      <Sk className="skeleton-rounded" style={{ width: 36, height: 36, flexShrink: 0 }} />
      <div className="flex-1">
        <Sk style={{ width: '60%', height: 14, marginBottom: 4 }} />
        <Sk style={{ width: '40%', height: 10 }} />
      </div>
    </div>
  );
}

// ── Conversation Link (user-home) ───────────────────────────────────────
export function SkeletonConversationLink() {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-800/40">
      <Sk className="skeleton-circle" style={{ width: 32, height: 32, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <Sk style={{ width: '65%', height: 14, marginBottom: 4 }} />
        <Sk style={{ width: '40%', height: 10 }} />
      </div>
      <Sk style={{ width: 50, height: 10, flexShrink: 0 }} />
    </div>
  );
}

// ── Access Request Card ─────────────────────────────────────────────────
export function SkeletonRequestCard() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <Sk className="skeleton-circle" style={{ width: 40, height: 40 }} />
            <div>
              <Sk style={{ width: 120, height: 16, marginBottom: 4 }} />
              <Sk style={{ width: 180, height: 12 }} />
            </div>
          </div>
          <div className="ml-[52px]">
            <Sk style={{ width: '60%', height: 14, marginBottom: 6 }} />
            <Sk style={{ width: '80%', height: 12, marginBottom: 6 }} />
            <Sk style={{ width: 160, height: 10 }} />
          </div>
        </div>
        <div className="flex gap-2 ml-[52px] md:ml-0">
          <Sk style={{ width: 90, height: 34, borderRadius: 6 }} />
          <Sk style={{ width: 80, height: 34, borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

// ── Dataset Card (contents page) ────────────────────────────────────────
export function SkeletonDatasetCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5">
      <div className="flex items-start gap-3 mb-4">
        <Sk className="skeleton-rounded" style={{ width: 40, height: 40, flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <Sk style={{ width: '60%', height: 16, marginBottom: 6 }} />
          <Sk style={{ width: '40%', height: 12 }} />
        </div>
      </div>
      <Sk className="skeleton-text" />
      <Sk className="skeleton-text short" />
      <div className="flex items-center gap-2 mt-3">
        <Sk style={{ width: 60, height: 20, borderRadius: 6 }} />
        <Sk style={{ width: 70, height: 20, borderRadius: 6 }} />
      </div>
    </div>
  );
}

// ── Super Admin KPI Card ────────────────────────────────────────────────
export function SkeletonSuperAdminKPI() {
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4 flex flex-col items-center justify-center text-center">
      <Sk className="skeleton-circle" style={{ width: 40, height: 40, marginBottom: 12 }} />
      <Sk style={{ width: '50%', height: 28, marginBottom: 8 }} />
      <Sk style={{ width: '60%', height: 10 }} />
    </div>
  );
}

// ── Super Admin Chart ───────────────────────────────────────────────────
export function SkeletonSuperAdminChart() {
  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4 h-80">
      <div className="flex items-center gap-2 mb-4">
        <Sk className="skeleton-circle" style={{ width: 16, height: 16 }} />
        <Sk style={{ width: '30%', height: 14 }} />
      </div>
      <Sk className="skeleton-rounded" style={{ width: '100%', height: 'calc(90% - 30px)' }} />
    </div>
  );
}

// ── Super Admin Table Row ───────────────────────────────────────────────
export function SkeletonSuperAdminTenantRow() {
  return (
    <tr className="border-b border-[#1e293b]">
      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Sk className="skeleton-rounded" style={{ width: 28, height: 28, flexShrink: 0 }} />
          <Sk style={{ width: '55%', height: 14 }} />
        </div>
      </td>
      <td className="px-5 py-4"><Sk style={{ width: 60, height: 14 }} /></td>
      <td className="px-5 py-4"><Sk style={{ width: 50, height: 14 }} /></td>
      <td className="px-5 py-4"><Sk style={{ width: 50, height: 14 }} /></td>
      <td className="px-5 py-4"><Sk style={{ width: 60, height: 20, borderRadius: 4 }} /></td>
    </tr>
  );
}

// ── Welcome Banner (user-home) ──────────────────────────────────────────
export function SkeletonWelcomeBanner() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#1a1d21] p-6">
      <Sk style={{ width: '30%', height: 10, marginBottom: 12 }} />
      <Sk style={{ width: '50%', height: 26, marginBottom: 8 }} />
      <Sk style={{ width: '70%', height: 14 }} />
    </div>
  );
}

// ── Analytics Assistant Performance Card ────────────────────────────────
export function SkeletonAssistantPerformanceCard() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#1a1d21] overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <Sk className="skeleton-rounded" style={{ width: 44, height: 44, flexShrink: 0 }} />
          <div className="flex-1 min-w-0">
            <Sk style={{ width: '50%', height: 16, marginBottom: 6 }} />
            <Sk style={{ width: '35%', height: 12 }} />
          </div>
          <Sk style={{ width: 60, height: 32, borderRadius: 12 }} />
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-800/50">
        {[1, 2, 3].map((i) => (
          <div key={i} className="px-4 py-4 text-center">
            <Sk className="skeleton-circle mx-auto" style={{ width: 14, height: 14, marginBottom: 6 }} />
            <Sk className="mx-auto" style={{ width: '60%', height: 22, marginBottom: 4 }} />
            <Sk className="mx-auto" style={{ width: '50%', height: 8 }} />
          </div>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-slate-800/60 bg-[#161a1d]">
        <Sk style={{ width: '100%', height: 10, borderRadius: 999 }} />
      </div>
    </div>
  );
}

// ── Playground Loading Skeleton ─────────────────────────────────────────────
export function SkeletonPlayground() {
  return (
    <div className="flex flex-col h-full bg-[#111315] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 py-3 border-b border-slate-800/80 bg-[#0d0f12] flex items-center justify-between">
        <div>
          <Sk style={{ width: 100, height: 15, marginBottom: 6 }} />
          <Sk style={{ width: 160, height: 10 }} />
        </div>
        <div className="flex items-center gap-2">
          <Sk style={{ width: 80, height: 28, borderRadius: 8 }} />
          <Sk style={{ width: 130, height: 28, borderRadius: 8 }} />
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left config panel */}
        <div className="w-[340px] shrink-0 border-r border-slate-800/80 flex flex-col bg-[#0d0f12] overflow-hidden">
          <div className="flex-1 px-5 py-4 space-y-5">
            {/* Assistant selector */}
            <div className="space-y-2">
              <Sk style={{ width: 80, height: 10 }} />
              <Sk style={{ width: '100%', height: 38, borderRadius: 12 }} />
              <div className="flex gap-1.5 flex-wrap mt-1">
                {[60, 80, 70, 50].map((w, i) => (
                  <Sk key={i} style={{ width: w, height: 20, borderRadius: 6 }} />
                ))}
              </div>
            </div>
            <Sk style={{ width: '100%', height: 1 }} />
            {/* System message */}
            <div className="space-y-2">
              <Sk style={{ width: 110, height: 10 }} />
              <Sk style={{ width: '100%', height: 108, borderRadius: 12 }} />
            </div>
            <Sk style={{ width: '100%', height: 1 }} />
            {/* Params */}
            <div className="space-y-4">
              <Sk style={{ width: 90, height: 10 }} />
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="flex justify-between mb-2">
                    <Sk style={{ width: 80, height: 10 }} />
                    <Sk style={{ width: 30, height: 10 }} />
                  </div>
                  <Sk style={{ width: '100%', height: 4, borderRadius: 999 }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right chat panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 px-6 py-5 space-y-6 overflow-hidden">
            <SkeletonChatMessage isUser={false} />
            <SkeletonChatMessage isUser={true} />
            <SkeletonChatMessage isUser={false} />
          </div>
          {/* Input */}
          <div className="shrink-0 px-5 py-4 border-t border-slate-800/80">
            <Sk style={{ width: '100%', height: 52, borderRadius: 12 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Settings Organisation Section Skeleton ──────────────────────────────────
export function SkeletonSettingsOrgSection() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#16191e] overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800/60">
        <Sk style={{ width: '35%', height: 10 }} />
        <Sk style={{ width: '55%', height: 10, marginTop: 8 }} />
      </div>
      <div className="px-6 py-6">
        <div className="flex items-start gap-6">
          <Sk className="skeleton-rounded shrink-0" style={{ width: 96, height: 96 }} />
          <div className="flex-1 pt-1 space-y-3">
            <div>
              <Sk style={{ width: '45%', height: 14, marginBottom: 8 }} />
              <Sk style={{ width: '65%', height: 10 }} />
            </div>
            <Sk style={{ width: 130, height: 32, borderRadius: 8 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── User Home Full Page ─────────────────────────────────────────────────────
export function SkeletonUserHomePage() {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#111315]">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 md:px-10 pt-8 pb-14 max-w-6xl mx-auto space-y-7">

          {/* Welcome Banner */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#1a1d21] p-6 md:p-8">
            <div className="flex items-center gap-5">
              <Sk className="skeleton-rounded shrink-0" style={{ width: 64, height: 64 }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-2">
                  <Sk style={{ width: '38%', height: 28 }} />
                  <Sk style={{ width: 48, height: 20, borderRadius: 999 }} />
                </div>
                <Sk style={{ width: '22%', height: 13 }} />
              </div>
              <Sk style={{ width: 110, height: 38, borderRadius: 12, flexShrink: 0 }} />
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d21] p-5 overflow-hidden">
                <div className="flex items-start justify-between mb-4">
                  <Sk className="skeleton-rounded" style={{ width: 40, height: 40 }} />
                  <Sk style={{ width: 56, height: 20, borderRadius: 999 }} />
                </div>
                <Sk style={{ width: '42%', height: 40, marginBottom: 6 }} />
                <Sk style={{ width: '58%', height: 10 }} />
              </div>
            ))}
          </div>

          {/* Main Content Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Quick Actions */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <Sk style={{ width: 100, height: 10 }} />
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d21] p-4 flex items-center gap-4">
                  <Sk className="skeleton-rounded shrink-0" style={{ width: 44, height: 44 }} />
                  <div className="flex-1">
                    <Sk style={{ width: '60%', height: 14, marginBottom: 6 }} />
                    <Sk style={{ width: '38%', height: 10 }} />
                  </div>
                  <Sk style={{ width: 16, height: 16, flexShrink: 0 }} />
                </div>
              ))}
              <div className="mt-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d21] p-4">
                <Sk style={{ width: 80, height: 10, marginBottom: 8 }} />
                <Sk style={{ width: '90%', height: 12, marginBottom: 4 }} />
                <Sk style={{ width: '70%', height: 12 }} />
              </div>
            </div>

            {/* Recent Conversations */}
            <div className="lg:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <Sk style={{ width: 130, height: 10 }} />
                <Sk style={{ width: 50, height: 10 }} />
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d21] overflow-hidden">
                <div className="grid grid-cols-12 px-4 py-2.5 bg-slate-100 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                  {[1, 6, 3, 2].map((span, idx) => (
                    <div key={idx} className={`col-span-${span} flex ${idx === 3 ? 'justify-end' : ''}`}>
                      <Sk style={{ width: '55%', height: 10 }} />
                    </div>
                  ))}
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="grid grid-cols-12 items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800/40">
                    <div className="col-span-1">
                      <Sk className="skeleton-rounded" style={{ width: 24, height: 24 }} />
                    </div>
                    <div className="col-span-6 pr-3">
                      <Sk style={{ width: `${55 + i * 6}%`, height: 13 }} />
                    </div>
                    <div className="col-span-3 pr-2">
                      <Sk style={{ width: '65%', height: 11 }} />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Sk style={{ width: '75%', height: 11 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Action Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1d21] p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Sk className="skeleton-rounded shrink-0" style={{ width: 20, height: 20 }} />
                  <div>
                    <Sk style={{ width: 110, height: 13, marginBottom: 5 }} />
                    <Sk style={{ width: 80, height: 11 }} />
                  </div>
                </div>
                <Sk style={{ width: 16, height: 16, flexShrink: 0 }} />
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Contents (User Knowledge Base) Dataset Cards ────────────────────────────
export function SkeletonContentsDatasets() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-[#1a1d21] p-4">
          <div className="flex items-start gap-3 mb-3">
            <Sk className="skeleton-rounded shrink-0" style={{ width: 40, height: 40 }} />
            <div className="flex-1 min-w-0">
              <Sk style={{ width: '70%', height: 14, marginBottom: 6 }} />
              <Sk style={{ width: '45%', height: 10 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Contents Document Table Rows ────────────────────────────────────────────
export function SkeletonContentsDocumentRow() {
  return (
    <tr className="border-b border-slate-200 dark:border-slate-800/40">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Sk className="skeleton-rounded shrink-0" style={{ width: 28, height: 28 }} />
          <Sk style={{ width: '55%', height: 14 }} />
        </div>
      </td>
      <td className="px-5 py-3.5"><Sk style={{ width: 55, height: 14 }} /></td>
      <td className="px-5 py-3.5"><Sk style={{ width: 80, height: 22, borderRadius: 999 }} /></td>
      <td className="px-5 py-3.5 text-right"><Sk style={{ width: 28, height: 28, borderRadius: 8, marginLeft: 'auto' }} /></td>
    </tr>
  );
}

// ── Super Admin User Table Row ──────────────────────────────────────────────
export function SkeletonSuperAdminUserRow() {
  return (
    <tr className="border-b border-[#1e293b]">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Sk className="skeleton-circle" style={{ width: 32, height: 32, flexShrink: 0 }} />
          <div className="flex-1">
            <Sk style={{ width: '55%', height: 13, marginBottom: 4 }} />
            <Sk style={{ width: '70%', height: 10 }} />
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5"><Sk style={{ width: 80, height: 13 }} /></td>
      <td className="px-5 py-3.5"><Sk style={{ width: 90, height: 20, borderRadius: 4 }} /></td>
      <td className="px-5 py-3.5"><Sk style={{ width: 50, height: 13 }} /></td>
      <td className="px-5 py-3.5 text-right"><Sk style={{ width: 28, height: 28, borderRadius: 6, marginLeft: 'auto' }} /></td>
    </tr>
  );
}
