'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuthStore } from '@/store/use-auth-store';
import { useDialog } from '@/components/ui/app-dialog';
import { UserRole } from '@/types';
import { Loader2, Plus, Save, ShieldAlert, Trash2 } from 'lucide-react';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

interface PlanRow {
  id?: string;
  name: string;
  displayName: string;
  code: string;
  price: number;
  currency: string;
  billingPeriod: string;
  maxUsers: number;
  maxAssistants: number;
  maxDatasets: number;
  maxStorageBytes: number;
  monthlyTokenLimit: number;
  isActive: boolean;
  /** True when this row was loaded from the server — its `code` is then immutable. */
  persisted?: boolean;
}

const SUGGESTED_TIERS: PlanRow[] = [
  {
    name: 'Starter', displayName: 'Starter', code: 'starter',
    price: 0, currency: 'USD', billingPeriod: 'free',
    maxUsers: 5, maxAssistants: 3, maxDatasets: 5,
    maxStorageBytes: 1_073_741_824, monthlyTokenLimit: 1_000_000,
    isActive: true,
  },
  {
    name: 'Business', displayName: 'Business', code: 'business',
    price: 49, currency: 'USD', billingPeriod: 'monthly',
    maxUsers: 50, maxAssistants: 20, maxDatasets: 20,
    maxStorageBytes: 10_737_418_240, monthlyTokenLimit: 10_000_000,
    isActive: true,
  },
  {
    name: 'Enterprise', displayName: 'Enterprise', code: 'enterprise',
    price: 199, currency: 'USD', billingPeriod: 'monthly',
    maxUsers: 200, maxAssistants: 100, maxDatasets: 100,
    maxStorageBytes: 107_374_182_400, monthlyTokenLimit: 100_000_000,
    isActive: true,
  },
];

function emptyTier(): PlanRow {
  return {
    name: '', displayName: '', code: '',
    price: 0, currency: 'USD', billingPeriod: 'monthly',
    maxUsers: 5, maxAssistants: 3, maxDatasets: 5,
    maxStorageBytes: 1_073_741_824, monthlyTokenLimit: 1_000_000,
    isActive: true,
  };
}

const inputCls =
  'w-full rounded-md bg-[#111315] border border-slate-700 px-2.5 py-1.5 text-[13px] text-slate-100 outline-none focus:border-[#06d4ef]';

const parseNum = (v: string): number => {
  const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 0 : n;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</span>
      {children}
    </label>
  );
}

export default function PlansConfigPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { showAlert } = useDialog();
  const { data, error, isLoading, mutate } = useSWR<PlanRow[]>(
    user?.role === UserRole.PLATFORM_ADMIN ? '/plans/all' : null,
    fetcher,
  );

  const [tiers, setTiers] = useState<PlanRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Hydrate the form once whenever the server data lands. If the server has
  // no plans yet, prefill with the suggested tiers so the client has something
  // concrete to edit instead of staring at a blank page.
  useEffect(() => {
    if (!data) return;
    if (data.length === 0) {
      setTiers(SUGGESTED_TIERS.map((t) => ({ ...t, persisted: false })));
    } else {
      setTiers(data.map((t) => ({ ...t, persisted: true })));
    }
  }, [data]);

  if (user?.role !== UserRole.PLATFORM_ADMIN) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-8 text-center">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4 opacity-80" />
        <h2 className="text-xl font-semibold">{t('plansConfig.accessRestrictedTitle')}</h2>
        <p className="text-slate-400 mt-2 max-w-md">{t('plansConfig.accessRestrictedMessage')}</p>
      </div>
    );
  }

  const update = (idx: number, patch: Partial<PlanRow>) => {
    setTiers((prev) => prev.map((t, i) => (i === idx ? { ...t, ...patch } : t)));
  };

  const addTier = () => setTiers((prev) => [...prev, emptyTier()]);
  const removeTier = (idx: number) => setTiers((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    // Light client-side validation — backend re-validates everything.
    for (const tier of tiers) {
      if (!tier.code?.trim() || !tier.name?.trim()) {
        showAlert(t('plansConfig.needCodeAndName'), { variant: 'danger' });
        return;
      }
      if (!/^[a-z0-9_]+$/.test(tier.code)) {
        showAlert(t('plansConfig.invalidCode', { code: tier.code }), { variant: 'danger' });
        return;
      }
    }

    setSaving(true);
    try {
      await api.put('/plans/configure', {
        plans: tiers.map((tier) => ({
          name: tier.name.trim(),
          displayName: (tier.displayName || tier.name).trim(),
          code: tier.code.trim(),
          price: Number(tier.price),
          currency: (tier.currency || 'USD').toUpperCase(),
          billingPeriod: tier.billingPeriod || 'monthly',
          maxUsers: Number(tier.maxUsers),
          maxAssistants: Number(tier.maxAssistants),
          maxDatasets: Number(tier.maxDatasets),
          maxStorageBytes: Number(tier.maxStorageBytes),
          monthlyTokenLimit: Number(tier.monthlyTokenLimit),
          isActive: tier.isActive,
        })),
      });
      await mutate();
      showAlert(t('plansConfig.savedMessage'), { title: t('plansConfig.savedTitle') });
    } catch (err: any) {
      showAlert(err?.response?.data?.message || t('plansConfig.saveFailed'), { variant: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#111315]">
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 md:px-8 pt-8 pb-4 max-w-4xl">
          <h1 className="text-2xl font-bold text-slate-100">{t('plansConfig.title')}</h1>
        </div>

        <div className="px-6 md:px-8 pb-8 max-w-4xl space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#06d4ef]" />
              <span className="text-[13px]">{t('plansConfig.loading')}</span>
            </div>
          )}
          {error && (
            <div className="text-center py-12 text-red-400 text-[13px]">{t('plansConfig.loadFailed')}</div>
          )}

          {!isLoading && !error && tiers.map((tier, idx) => (
            <div key={idx} className="rounded-xl border border-slate-800 bg-[#1a1d21] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-slate-100">
                  {t('plansConfig.tier')} {idx + 1}
                  {tier.persisted && (
                    <span className="ml-2 text-[10px] font-medium text-slate-500 uppercase tracking-wider">{t('plansConfig.savedBadge')}</span>
                  )}
                </h2>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-[12px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tier.isActive}
                      onChange={(e) => update(idx, { isActive: e.target.checked })}
                      className="h-3.5 w-3.5 accent-[#06d4ef]"
                    />
                    {t('plansConfig.active')}
                  </label>
                  <button
                    onClick={() => removeTier(idx)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                    title={t('plansConfig.removeTier')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label={t('plansConfig.fields.displayName')}>
                  <input
                    type="text" value={tier.displayName}
                    onChange={(e) => update(idx, { displayName: e.target.value })}
                    placeholder="Pro" className={inputCls}
                  />
                </Field>
                <Field label={t('plansConfig.fields.internalName')}>
                  <input
                    type="text" value={tier.name}
                    onChange={(e) => update(idx, { name: e.target.value })}
                    placeholder="Pro" className={inputCls}
                  />
                </Field>
                <Field label={tier.persisted ? t('plansConfig.fields.codeImmutable') : t('plansConfig.fields.code')}>
                  <input
                    type="text" value={tier.code}
                    onChange={(e) => update(idx, { code: e.target.value.toLowerCase() })}
                    disabled={tier.persisted}
                    placeholder="pro"
                    className={`${inputCls} font-mono ${tier.persisted ? 'opacity-60 cursor-not-allowed' : ''}`}
                  />
                </Field>

                <Field label={t('plansConfig.fields.price')}>
                  <input
                    type="text" inputMode="decimal" value={tier.price || ''}
                    onChange={(e) => update(idx, { price: parseFloat(e.target.value) || 0 })}
                    className={inputCls}
                  />
                </Field>
                <Field label={t('plansConfig.fields.currency')}>
                  <input
                    type="text" value={tier.currency} maxLength={10}
                    onChange={(e) => update(idx, { currency: e.target.value.toUpperCase() })}
                    className={inputCls}
                  />
                </Field>
                <Field label={t('plansConfig.fields.billingPeriod')}>
                  <select
                    value={tier.billingPeriod}
                    onChange={(e) => update(idx, { billingPeriod: e.target.value })}
                    className={inputCls}
                  >
                    <option value="free">{t('plansConfig.periods.free')}</option>
                    <option value="monthly">{t('plansConfig.periods.monthly')}</option>
                    <option value="yearly">{t('plansConfig.periods.yearly')}</option>
                  </select>
                </Field>

                <Field label={t('plansConfig.fields.maxUsers')}>
                  <input
                    type="text" inputMode="numeric" value={tier.maxUsers || ''}
                    onChange={(e) => update(idx, { maxUsers: parseNum(e.target.value) })}
                    className={inputCls}
                  />
                </Field>
                <Field label={t('plansConfig.fields.maxAssistants')}>
                  <input
                    type="text" inputMode="numeric" value={tier.maxAssistants || ''}
                    onChange={(e) => update(idx, { maxAssistants: parseNum(e.target.value) })}
                    className={inputCls}
                  />
                </Field>
                <Field label={t('plansConfig.fields.maxDatasets')}>
                  <input
                    type="text" inputMode="numeric" value={tier.maxDatasets || ''}
                    onChange={(e) => update(idx, { maxDatasets: parseNum(e.target.value) })}
                    className={inputCls}
                  />
                </Field>
                <Field label={t('plansConfig.fields.storageBytes')}>
                  <input
                    type="text" inputMode="numeric" value={tier.maxStorageBytes || ''}
                    onChange={(e) => update(idx, { maxStorageBytes: parseNum(e.target.value) })}
                    className={inputCls}
                  />
                </Field>
                <Field label={t('plansConfig.fields.monthlyTokens')}>
                  <input
                    type="text" inputMode="numeric" value={tier.monthlyTokenLimit || ''}
                    onChange={(e) => update(idx, { monthlyTokenLimit: parseNum(e.target.value) })}
                    className={inputCls}
                  />
                </Field>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={addTier}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-[#1a1d21] text-slate-300 text-[12px] font-medium hover:border-slate-600"
            >
              <Plus className="h-3.5 w-3.5" /> {t('plansConfig.addTier')}
            </button>
            <button
              onClick={save}
              disabled={saving || tiers.length === 0}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#06d4ef] text-white text-[13px] font-semibold hover:bg-[#06d4ef]/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t('plansConfig.saveConfiguration')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
