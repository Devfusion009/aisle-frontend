'use client';

import { useState } from 'react';
import useSWR from 'swr';
import api from '@/lib/api';
import {
  Loader2, Users, Bot, HardDrive, Zap, Crown, Folder,
  X, Check, ArrowRight, Lock, ChevronRight, Trash2, AlertTriangle, ChevronDown,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BillingInfo, UserRole } from '@/types';
import { useAuthStore } from '@/store/use-auth-store';
import { SkeletonPlanCard, SkeletonBillingCard, SkeletonTable } from '@/components/ui/skeleton-loaders';

interface TenantUserLite {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
}

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

const PLAN_COLORS: Record<string, { badge: string; bg: string; border: string }> = {
  'starter': {
    badge: 'bg-slate-600/20 text-slate-300 border-slate-600/30',
    bg: 'bg-slate-500/5',
    border: 'border-slate-600/30',
  },
  'business': {
    badge: 'bg-[#06d4ef]/15 text-[#06d4ef] border-[#06d4ef]/30',
    bg: 'bg-[#06d4ef]/5',
    border: 'border-[#06d4ef]/30',
  },
  'enterprise': {
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    bg: 'bg-purple-500/5',
    border: 'border-purple-500/30',
  },
};

const DEFAULT_PLAN_COLOR = {
  badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  bg: 'bg-slate-900/50',
  border: 'border-slate-800',
};

// All plan metadata (price, displayName, period, limits) comes from the
// /tenant/billing API which is in turn driven by the platform-admin-managed
// subscription_plans table. Nothing about a plan should ever be hardcoded
// here — that was the source of the historical "5 Users" / "25 Users" drift.
interface PlanComparisonRow {
  plan: string;
  displayName?: string;
  price?: number;
  currency?: string;
  billingPeriod?: string;
  maxUsers: number;
  maxAssistants: number;
  maxDatasets: number;
  maxStorageDisplay: string;
  maxStorageBytes: number;
  monthlyTokensDisplay: string;
  monthlyTokenLimit: number;
}

function planFeatures(p: PlanComparisonRow): string[] {
  return [
    `${p.maxUsers} Users`,
    `${p.maxAssistants} Assistants`,
    `${p.maxDatasets} Datasets`,
    `${p.maxStorageDisplay} Storage`,
    `${p.monthlyTokensDisplay} Tokens/mo`,
  ];
}

interface PriceLabels {
  free: string;
  perMonth: string;
  perYear: string;
}

function formatPrice(p: PlanComparisonRow, labels: PriceLabels): { price: string; period: string } {
  const period = p.billingPeriod ?? 'monthly';
  if (period === 'free' || (p.price ?? 0) === 0) {
    return { price: labels.free, period: '' };
  }
  // Lightweight currency formatting — falls back to a code suffix for ones
  // Intl.NumberFormat doesn't recognise.
  let priceStr: string;
  try {
    priceStr = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: p.currency ?? 'USD',
      maximumFractionDigits: 0,
    }).format(p.price ?? 0);
  } catch {
    priceStr = `${p.price ?? 0} ${p.currency ?? 'USD'}`;
  }
  const periodLabel = period === 'yearly' ? labels.perYear : labels.perMonth;
  return { price: priceStr, period: periodLabel };
}

function planLabel(p: PlanComparisonRow): string {
  return p.displayName?.trim() || p.plan.charAt(0).toUpperCase() + p.plan.slice(1);
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(0)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function formatTokens(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function ProgressBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (current / max) * 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-full mt-2">
      <div className="h-2 rounded-full bg-slate-700/50 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-slate-500 mt-1">{pct.toFixed(0)}% used</p>
    </div>
  );
}

// ── Change Plan Modal ───────────────────────────────────────────────────────
function UpgradeModal({
  currentPlan,
  planComparison,
  usage,
  onClose,
  onUpgraded,
  onUsageChanged,
}: {
  currentPlan: string;
  planComparison: any[];
  usage: BillingInfo['usage'];
  onClose: () => void;
  onUpgraded: (newPlan: string) => void;
  onUsageChanged: () => void;
}) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // User-removal sub-panel (force-choose flow, used only when downgrading
  // would leave the tenant over the new plan's user limit).
  const [showUserPanel, setShowUserPanel] = useState(false);
  const [users, setUsers] = useState<TenantUserLite[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<TenantUserLite | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const res = await api.get<TenantUserLite[]>('/tenant-users');
      setUsers(res.data);
    } catch {
      setUsersError(t('billing.changePlanModal.loadUsersFailed'));
    } finally {
      setLoadingUsers(false);
    }
  };

  const removeUser = async (userId: string) => {
    setRemovingId(userId);
    setUsersError('');
    try {
      await api.delete(`/tenant-users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      onUsageChanged();
    } catch (e: any) {
      setUsersError(e?.response?.data?.message || t('billing.changePlanModal.removeFailed'));
    } finally {
      setRemovingId(null);
      setConfirmRemove(null);
    }
  };

  const priceLabels: PriceLabels = {
    free: t('billing.free'),
    perMonth: t('billing.perMonth'),
    perYear: t('billing.perYear'),
  };

  // Show every plan except the current one, ordered cheapest → priciest. The
  // owner can move in either direction; we tag each card as Upgrade/Downgrade
  // by comparing prices so they orient instantly.
  const currentRow = planComparison.find((p: any) => p.plan === currentPlan);
  const currentPrice = Number(currentRow?.price ?? 0);
  const otherPlans = planComparison
    .filter((p: any) => p.plan !== currentPlan)
    .sort((a: any, b: any) => Number(a.price ?? 0) - Number(b.price ?? 0));

  // Resources where current usage already exceeds the *target* plan's limit.
  // Labels come from the existing billing.{users,assistants,datasets,storage,monthlyTokens}
  // translation keys so the warning matches the locale of the resource cards above.
  // The `key` is a stable identifier independent of locale — used to attach
  // resource-specific actions (e.g. "Manage users →" link).
  type OverCapKey = 'users' | 'assistants' | 'datasets' | 'storage' | 'tokens';
  const overCapResources = (target: PlanComparisonRow): { key: OverCapKey; label: string; current: string; max: string }[] => {
    const out: { key: OverCapKey; label: string; current: string; max: string }[] = [];
    if (usage.currentUsers > target.maxUsers)
      out.push({ key: 'users', label: t('billing.users'), current: String(usage.currentUsers), max: String(target.maxUsers) });
    if (usage.currentAssistants > target.maxAssistants)
      out.push({ key: 'assistants', label: t('billing.assistants'), current: String(usage.currentAssistants), max: String(target.maxAssistants) });
    if (usage.currentDatasets > target.maxDatasets)
      out.push({ key: 'datasets', label: t('billing.datasets'), current: String(usage.currentDatasets), max: String(target.maxDatasets) });
    if (usage.currentStorageBytes > target.maxStorageBytes)
      out.push({ key: 'storage', label: t('billing.storage'), current: formatBytes(usage.currentStorageBytes), max: formatBytes(target.maxStorageBytes) });
    if (usage.monthlyTokensUsed > target.monthlyTokenLimit)
      out.push({ key: 'tokens', label: t('billing.monthlyTokens'), current: formatTokens(usage.monthlyTokensUsed), max: formatTokens(target.monthlyTokenLimit) });
    return out;
  };

  const confirmChange = async () => {
    if (!selectedPlan) return;
    setLoading(true);
    setError('');
    try {
      await api.patch('/tenant/plan', { plan: selectedPlan });
      setStep('success');
      onUpgraded(selectedPlan);
    } catch (e: any) {
      setError(e?.response?.data?.message || t('billing.changePlanModal.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const directionFor = (planPrice: number): 'upgrade' | 'downgrade' | 'same' => {
    if (planPrice > currentPrice) return 'upgrade';
    if (planPrice < currentPrice) return 'downgrade';
    return 'same';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={step !== 'success' ? onClose : undefined} />
      <div className="relative bg-[#1a1d21] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-100">
              {step === 'select'
                ? t('billing.changePlanModal.titleSelect')
                : step === 'confirm'
                ? t('billing.changePlanModal.titleConfirm')
                : t('billing.changePlanModal.titleSuccess')}
            </h2>
            <p className="text-[12px] text-slate-500 mt-0.5">
              {step === 'select'
                ? t('billing.changePlanModal.subtitleSelect')
                : step === 'confirm'
                ? t('billing.changePlanModal.subtitleConfirm', { from: currentPlan, to: selectedPlan ?? '' })
                : t('billing.changePlanModal.subtitleSuccess')}
            </p>
          </div>
          {step !== 'success' && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* ── Step 1: Select Plan ── */}
        {step === 'select' && (
          <div className="p-6 space-y-4">
            {otherPlans.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-[13px]">{t('billing.changePlanModal.noOtherPlans')}</div>
            ) : (
              otherPlans.map((p) => {
                const pricing = formatPrice(p, priceLabels);
                const features = planFeatures(p);
                const isSelected = selectedPlan === p.plan;
                const planColor = PLAN_COLORS[p.plan] || DEFAULT_PLAN_COLOR;
                const direction = directionFor(Number(p.price ?? 0));
                const directionBadge =
                  direction === 'upgrade'
                    ? { label: t('billing.changePlanModal.badgeUpgrade'), cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
                    : direction === 'downgrade'
                    ? { label: t('billing.changePlanModal.badgeDowngrade'), cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
                    : null;
                return (
                  <button
                    key={p.plan}
                    onClick={() => setSelectedPlan(p.plan)}
                    className={`w-full text-left rounded-xl border p-5 transition-all ${
                      isSelected ? 'border-[#06d4ef] bg-[#06d4ef]/5' : 'border-slate-700 bg-[#111315] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${planColor.bg} border ${planColor.border}`}>
                          <Crown className={`h-5 w-5 ${
                            p.plan === 'enterprise' ? 'text-purple-400' : p.plan === 'business' ? 'text-[#06d4ef]' : 'text-slate-400'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-semibold text-slate-100">{planLabel(p)}</span>
                            {directionBadge && (
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${directionBadge.cls}`}>
                                {directionBadge.label}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                            {features.map((f) => (
                              <span key={f} className="flex items-center gap-1 text-[11px] text-slate-400">
                                <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                                {f}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <span className="text-[20px] font-black text-slate-100">{pricing.price}</span>
                        <span className="text-[12px] text-slate-500">{pricing.period}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[#06d4ef]">
                        <Check className="h-3.5 w-3.5" /> {t('billing.changePlanModal.selected')}
                      </div>
                    )}
                  </button>
                );
              })
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-[13px] text-slate-400 hover:text-slate-200">{t('billing.changePlanModal.cancel')}</button>
              <button
                disabled={!selectedPlan}
                onClick={() => setStep('confirm')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#06d4ef] text-white text-[13px] font-semibold hover:bg-[#06d4ef]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('billing.changePlanModal.continue')} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Confirm ── */}
        {step === 'confirm' && selectedPlan && (() => {
          const selectedRow = planComparison.find((p) => p.plan === selectedPlan) as PlanComparisonRow | undefined;
          const selectedFeatures = selectedRow ? planFeatures(selectedRow) : [];
          const selectedPricing = selectedRow ? formatPrice(selectedRow, priceLabels) : { price: '', period: '' };
          const selectedLabel = selectedRow ? planLabel(selectedRow) : selectedPlan;
          const direction = selectedRow ? directionFor(Number(selectedRow.price ?? 0)) : 'same';
          const headerLabel =
            direction === 'downgrade'
              ? t('billing.changePlanModal.headerDowngrade')
              : direction === 'upgrade'
              ? t('billing.changePlanModal.headerUpgrade')
              : t('billing.changePlanModal.headerSwitch');
          const overCap = selectedRow ? overCapResources(selectedRow) : [];
          const usersOverCap = overCap.find((r) => r.key === 'users');
          return (
          <div className="p-6 space-y-5">
            {/* Summary card */}
            <div className="rounded-xl border border-slate-700 bg-[#111315] p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">{headerLabel}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-bold text-slate-100">{selectedLabel}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[24px] font-black text-slate-100">{selectedPricing.price}</span>
                <span className="text-[13px] text-slate-500">{selectedPricing.period}</span>
              </div>
            </div>

            {/* Over-cap warning — only shown when current usage exceeds the
                target plan's limit on at least one resource. For non-user
                resources we keep the freeze-on-create policy (existing items
                stay, no new creation). For users we open an inline removal
                panel so the owner force-chooses which seats to drop, since
                auto-locking real humans is the #1 source of refund tickets.
                The Confirm button is gated on user overcap. */}
            {overCap.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <p className="text-[12px] font-semibold text-amber-300 mb-1.5">
                  {t('billing.changePlanModal.overCapTitle')}
                </p>
                <ul className="text-[12px] text-slate-300 space-y-0.5 list-disc list-inside">
                  {overCap.map((r) => (
                    <li key={r.key}>
                      <strong className="text-amber-200">{r.label}</strong>: {t('billing.changePlanModal.overCapItem', { current: r.current, max: r.max })}
                      {r.key === 'users' && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = !showUserPanel;
                            setShowUserPanel(next);
                            if (next && users.length === 0) fetchUsers();
                          }}
                          className="ml-2 inline-flex items-center gap-1 text-[#06d4ef] hover:text-[#06d4ef]/80 underline-offset-2 hover:underline transition-colors"
                        >
                          {showUserPanel
                            ? t('billing.changePlanModal.hideUserList')
                            : t('billing.changePlanModal.removeUsersToContinue')}
                          <ChevronDown className={`h-3 w-3 transition-transform ${showUserPanel ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="text-[11px] text-slate-400 mt-2">
                  {t('billing.changePlanModal.overCapHint')}
                </p>
              </div>
            )}

            {/* Inline user-removal panel — only renders when the owner has
                clicked "Remove users to continue" on the user over-cap row.
                The header shows current / max as a colored progress bar
                (red while over, green when under). Self can't be removed. */}
            {showUserPanel && usersOverCap && (() => {
              const removable = users.filter((u) => u.id !== currentUserId);
              const stillToRemove = Math.max(0, Number(usersOverCap.current) - Number(usersOverCap.max));
              const isReady = stillToRemove === 0;
              const overPct = Math.min(150, (Number(usersOverCap.current) / Math.max(1, Number(usersOverCap.max))) * 100);
              const formatLastLogin = (iso: string | null) => {
                if (!iso) return t('billing.changePlanModal.lastLoginNever');
                try {
                  const d = new Date(iso);
                  return t('billing.changePlanModal.lastLoginAt', { when: d.toLocaleDateString() });
                } catch {
                  return t('billing.changePlanModal.lastLoginNever');
                }
              };
              return (
                <div className="rounded-xl border border-slate-700 bg-[#111315] overflow-hidden">
                  {/* Header — visual count + progress */}
                  <div className="px-4 pt-4 pb-3 border-b border-slate-800">
                    <div className="flex items-end justify-between gap-3 mb-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          {t('billing.changePlanModal.removeUsersTitle')}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-[28px] font-black tabular-nums ${isReady ? 'text-emerald-400' : 'text-red-400'}`}>
                            {usersOverCap.current}
                          </span>
                          <span className="text-[14px] text-slate-500">/ {usersOverCap.max}</span>
                          <Users className={`h-4 w-4 ml-1 ${isReady ? 'text-emerald-500' : 'text-red-500'}`} />
                        </div>
                      </div>
                      {!isReady ? (
                        <p className="text-[12px] text-amber-300 text-right max-w-[55%] leading-snug">
                          {t(stillToRemove === 1 ? 'billing.changePlanModal.removeUsersBody' : 'billing.changePlanModal.removeUsersBodyPlural', { count: stillToRemove })}
                        </p>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[12px] text-emerald-400">
                          <Check className="h-3.5 w-3.5" />
                          {t('billing.changePlanModal.readyToDowngrade')}
                        </div>
                      )}
                    </div>
                    {/* Progress bar — fills to 150% when massively over */}
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isReady ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${overPct}%` }}
                      />
                    </div>
                  </div>

                  {/* User list */}
                  <div className="max-h-[260px] overflow-y-auto">
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                      </div>
                    ) : usersError ? (
                      <div className="px-4 py-6 text-[12px] text-red-400 text-center">{usersError}</div>
                    ) : removable.length === 0 ? (
                      <div className="px-4 py-6 text-[12px] text-slate-500 text-center">
                        {t('billing.changePlanModal.noRemovableUsers')}
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-800/70">
                        {removable.map((u) => (
                          <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-semibold text-slate-300 shrink-0">
                              {(u.name || u.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-slate-200 truncate">{u.name || u.email}</span>
                                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                  u.role === UserRole.TENANT_OWNER ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                  : u.role === UserRole.TENANT_ADMIN ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                  : u.role === UserRole.EDITOR ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                                }`}>
                                  {u.role.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">
                                {u.email} · {formatLastLogin(u.lastLoginAt)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setConfirmRemove(u)}
                              disabled={removingId === u.id}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 text-red-300 text-[12px] font-medium transition-colors disabled:opacity-50 shrink-0"
                            >
                              {removingId === u.id
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Trash2 className="h-3 w-3" />}
                              {removingId === u.id
                                ? t('billing.changePlanModal.removing')
                                : t('billing.changePlanModal.remove')}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Confirm-remove dialog — second click before destructive call */}
            {confirmRemove && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => removingId === null && setConfirmRemove(null)} />
                <div className="relative bg-[#1a1d21] border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-[14px] font-semibold text-slate-100 mb-1">
                        {t('billing.changePlanModal.removeUserConfirmTitle', { name: confirmRemove.name || confirmRemove.email })}
                      </h3>
                      <p className="text-[12px] text-slate-400 leading-relaxed">
                        {t('billing.changePlanModal.removeUserConfirmBody', { name: confirmRemove.name || confirmRemove.email })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-5">
                    <button
                      onClick={() => setConfirmRemove(null)}
                      disabled={removingId !== null}
                      className="px-3 py-1.5 text-[12px] text-slate-400 hover:text-slate-200 disabled:opacity-50"
                    >
                      {t('billing.changePlanModal.cancel')}
                    </button>
                    <button
                      onClick={() => removeUser(confirmRemove.id)}
                      disabled={removingId !== null}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[12px] font-semibold transition-colors disabled:opacity-50"
                    >
                      {removingId !== null
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Trash2 className="h-3 w-3" />}
                      {t('billing.changePlanModal.removeUserConfirmCta')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule-for-period-end placeholder. Disabled until the Stripe
                integration lands — at which point this toggle will set
                `tenant.scheduled_plan_change_at` and the actual plan flip
                happens via the `customer.subscription.updated` webhook. */}
            <label className="flex items-start gap-3 rounded-xl border border-slate-800 bg-[#111315] px-4 py-3 opacity-60 cursor-not-allowed">
              <input
                type="checkbox"
                disabled
                className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 cursor-not-allowed"
              />
              <div className="flex-1">
                <span className="text-[13px] font-medium text-slate-300 block">
                  {t('billing.changePlanModal.scheduleForPeriodEnd')}
                </span>
                <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                  {t('billing.changePlanModal.scheduleForPeriodEndHint')}
                </span>
              </div>
            </label>

            {/* What changes */}
            <div className="rounded-xl border border-slate-800 bg-[#111315] p-4 space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('billing.changePlanModal.newPlanLimits')}</p>
              {selectedFeatures.map((f) => (
                <div key={f} className="flex items-center gap-2 text-[13px] text-slate-300">
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  {f}
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-[12px] text-red-400">{error}</div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => { setStep('select'); setError(''); }}
                className="text-[13px] text-slate-400 hover:text-slate-200"
              >
                {t('billing.changePlanModal.back')}
              </button>
              <button
                onClick={confirmChange}
                disabled={loading || !!usersOverCap}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#06d4ef] text-white text-[13px] font-semibold hover:bg-[#06d4ef]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#06d4ef]/20"
                title={usersOverCap ? t('billing.changePlanModal.removeUsersFirst') : undefined}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                {usersOverCap
                  ? t('billing.changePlanModal.removeUsersFirst')
                  : t('billing.changePlanModal.confirmChange')}
              </button>
            </div>
          </div>
          );
        })()}

        {/* ── Step 3: Success ── */}
        {step === 'success' && selectedPlan && (() => {
          const selectedRow = planComparison.find((p) => p.plan === selectedPlan) as PlanComparisonRow | undefined;
          const selectedFeatures = selectedRow ? planFeatures(selectedRow) : [];
          const selectedLabel = selectedRow ? planLabel(selectedRow) : selectedPlan;
          return (
          <div className="p-8 flex flex-col items-center text-center gap-5">
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-slate-100 mb-1">{t('billing.changePlanModal.successTitle')}</h3>
              <p className="text-[13px] text-slate-400">
                {t('billing.changePlanModal.successBody', { plan: selectedLabel })}
              </p>
            </div>
            <div className="w-full rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-3">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                {selectedFeatures.map((f) => (
                  <span key={f} className="flex items-center gap-1.5 text-[12px] text-emerald-300">
                    <Check className="h-3 w-3" /> {f}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#06d4ef] text-white text-[13px] font-semibold hover:bg-[#06d4ef]/90 transition-all"
            >
              {t('billing.changePlanModal.done')}
            </button>
          </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function BillingPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isOwner = user?.role === UserRole.TENANT_OWNER;
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { data, error, isLoading, mutate } = useSWR<BillingInfo>('/tenant/billing', fetcher, { refreshInterval: 30000 });

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-[#111315]">
        <div className="flex-1 overflow-y-auto">
          <div className="sticky top-0 z-10 bg-[#111315]">
            <div className="px-6 md:px-8 pt-8 pb-4">
              <div className="skeleton" style={{ width: '20%', height: 28, marginBottom: 8, borderRadius: 6 }} />
              <div className="skeleton" style={{ width: '35%', height: 14, borderRadius: 6 }} />
            </div>
          </div>
          <div className="px-6 md:px-8 py-4 space-y-6">
            <SkeletonPlanCard />
            <div>
              <div className="skeleton" style={{ width: 120, height: 13, marginBottom: 12, borderRadius: 4 }} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonBillingCard key={i} />
                ))}
              </div>
            </div>
            <SkeletonTable rows={5} cols={4} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center bg-[#111315]">
        <p className="text-red-400 font-medium">Failed to load billing data.</p>
      </div>
    );
  }

  const { plan, limits, usage, planComparison } = data;
  const colors = PLAN_COLORS[plan] || DEFAULT_PLAN_COLOR;

  const resources = [
    {
      icon: Users,
      label: t('billing.users'),
      current: usage.currentUsers,
      max: limits.maxUsers,
      display: `${usage.currentUsers} / ${limits.maxUsers}`,
      iconColor: 'text-slate-400',
    },
    {
      icon: Bot,
      label: t('billing.assistants'),
      current: usage.currentAssistants,
      max: limits.maxAssistants,
      display: `${usage.currentAssistants} / ${limits.maxAssistants}`,
      iconColor: 'text-[#06d4ef]',
    },
    {
      icon: Folder,
      label: t('billing.datasets'),
      current: usage.currentDatasets,
      max: limits.maxDatasets,
      display: `${usage.currentDatasets} / ${limits.maxDatasets}`,
      iconColor: 'text-amber-400',
    },
    {
      icon: HardDrive,
      label: t('billing.storage'),
      current: usage.currentStorageBytes,
      max: limits.maxStorageBytes,
      display: `${formatBytes(usage.currentStorageBytes)} / ${formatBytes(limits.maxStorageBytes)}`,
      iconColor: 'text-emerald-400',
    },
    {
      icon: Zap,
      label: t('billing.monthlyTokens'),
      current: usage.monthlyTokensUsed,
      max: limits.monthlyTokenLimit,
      display: `${formatTokens(usage.monthlyTokensUsed)} / ${formatTokens(limits.monthlyTokenLimit)}`,
      iconColor: 'text-purple-400',
    },
  ];

  const comparisonRows = [
    { label: t('billing.users'), key: 'maxUsers' as const },
    { label: t('billing.assistants'), key: 'maxAssistants' as const },
    { label: t('billing.datasets'), key: 'maxDatasets' as const },
    { label: t('billing.storage'), key: 'maxStorageDisplay' as const },
    { label: t('billing.monthlyTokens'), key: 'monthlyTokensDisplay' as const },
  ];

  // The "Change Plan" button is shown whenever there's at least one other
  // active plan to switch to — either direction (upgrade or downgrade).
  const hasOtherPlans = planComparison.some((p: any) => p.plan !== plan);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#111315]">
      {showUpgradeModal && (
        <UpgradeModal
          currentPlan={plan}
          planComparison={planComparison}
          usage={usage}
          onClose={() => { setShowUpgradeModal(false); mutate(); }}
          onUpgraded={() => mutate()}
          onUsageChanged={() => mutate()}
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#111315]">
          <div className="px-6 md:px-8 pt-8 pb-4 flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-100">{t('billing.title')}</h1>
            <p className="text-[13px] text-slate-400">{t('billing.subtitle')}</p>
          </div>
        </div>

        <div className="px-6 md:px-8 py-4 space-y-6">
          {/* Current Plan Card */}
          {(() => {
            const priceLabels: PriceLabels = {
              free: t('billing.free'),
              perMonth: t('billing.perMonth'),
              perYear: t('billing.perYear'),
            };
            const currentRow = planComparison.find((p: any) => p.plan === plan) as PlanComparisonRow | undefined;
            const currentLabel = currentRow ? planLabel(currentRow) : plan;
            const currentPricing = currentRow ? formatPrice(currentRow, priceLabels) : { price: '', period: '' };
            return (
          <div className="rounded-xl border border-slate-800 bg-[#1a1d21] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colors.bg} border ${colors.border}`}>
                <Crown className={`h-6 w-6 ${
                  plan === 'enterprise' ? 'text-purple-400'
                  : plan === 'business' ? 'text-[#06d4ef]'
                  : 'text-slate-400'
                }`} />
              </div>
              <div>
                <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{t('billing.currentPlan')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <h2 className="text-xl font-bold text-slate-100">{currentLabel}</h2>
                  {currentPricing.price && (
                    <span className="text-[12px] text-slate-400">
                      · {currentPricing.price}{currentPricing.period}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {hasOtherPlans && (
              isOwner ? (
                /* Owner: can change plan in either direction */
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#06d4ef] to-[#06b4ef] text-white text-[13px] font-semibold hover:opacity-90 transition-all shadow-lg shadow-[#06d4ef]/20 active:scale-[0.98]"
                >
                  <Crown className="h-4 w-4" />
                  {t('billing.changePlan')}
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                /* Admin: read-only, contact owner */
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-400 text-[13px]">
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                  {t('billing.contactOwnerToChange')}
                </div>
              )
            )}
          </div>
            );
          })()}

          {/* Resource Usage */}
          <div>
            <h3 className="text-[13px] font-semibold text-slate-200 mb-3">{t('billing.resourceUsage')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {resources.map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.label} className="rounded-xl border border-slate-800 bg-[#1a1d21] p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`h-4 w-4 ${r.iconColor}`} />
                      <span className="text-[12px] font-medium text-slate-400">{r.label}</span>
                    </div>
                    <p className="text-lg font-bold text-slate-100">{r.display}</p>
                    <ProgressBar current={r.current} max={r.max} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Plan Comparison */}
          <div className="rounded-xl border border-slate-800 bg-[#1a1d21] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h3 className="text-[13px] font-semibold text-slate-200">{t('billing.planComparison')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-[#111315]/50">
                    <th className="px-5 py-3">{t('billing.feature')}</th>
                    {planComparison.map((p) => (
                      <th key={p.plan} className={`px-5 py-3 text-center ${p.plan === plan ? 'text-[#06d4ef]' : ''}`}>
                        <div className="flex items-center justify-center gap-1.5">
                          {t(`billing.${p.plan}`)}
                          {p.plan === plan && (
                            <span className="text-[9px] font-bold bg-[#06d4ef]/15 text-[#06d4ef] px-1.5 py-0.5 rounded-full">
                              {t('billing.yourPlan')}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {comparisonRows.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-5 py-3.5 text-[12px] text-slate-300 font-medium">{row.label}</td>
                      {planComparison.map((p) => (
                        <td
                          key={p.plan}
                          className={`px-5 py-3.5 text-[12px] text-center ${
                            p.plan === plan ? 'text-slate-100 font-semibold bg-[#06d4ef]/5' : 'text-slate-400'
                          }`}
                        >
                          {String(p[row.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
