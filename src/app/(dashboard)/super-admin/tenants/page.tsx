'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDialog } from '@/components/ui/app-dialog';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/use-auth-store';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building2, Plus, ArrowRight, ShieldAlert, X, Users, Bot, FileText, ChevronDown, Search, SearchX
} from 'lucide-react';
import api from '@/lib/api';
import { AuthedImage } from '@/components/ui/authed-image';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

const TENANT_COLORS = [
  { accent: '#3b82f6', dark: 'rgba(59,130,246,0.10)', badge: '#60a5fa', strip: 'linear-gradient(90deg, #3b82f6, #60a5fa)' },
  { accent: '#2563eb', dark: 'rgba(37,99,235,0.10)', badge: '#3b82f6', strip: 'linear-gradient(90deg, #2563eb, #3b82f6)' },
  { accent: '#0ea5e9', dark: 'rgba(14,165,233,0.10)', badge: '#38bdf8', strip: 'linear-gradient(90deg, #0ea5e9, #38bdf8)' },
  { accent: '#0284c7', dark: 'rgba(2,132,199,0.10)', badge: '#0ea5e9', strip: 'linear-gradient(90deg, #0284c7, #0ea5e9)' },
  { accent: '#10b981', dark: 'rgba(16,185,129,0.10)', badge: '#34d399', strip: 'linear-gradient(90deg, #10b981, #34d399)' },
  { accent: '#06b6d4', dark: 'rgba(6,182,212,0.10)', badge: '#22d3ee', strip: 'linear-gradient(90deg, #06b6d4, #22d3ee)' },
  { accent: '#f97316', dark: 'rgba(249,115,22,0.10)', badge: '#fb923c', strip: 'linear-gradient(90deg, #f97316, #fb923c)' },
  { accent: '#14b8a6', dark: 'rgba(20,184,166,0.10)', badge: '#2dd4bf', strip: 'linear-gradient(90deg, #14b8a6, #2dd4bf)' },
  { accent: '#e11d48', dark: 'rgba(225,29,72,0.10)', badge: '#fb7185', strip: 'linear-gradient(90deg, #e11d48, #fb7185)' },
  { accent: '#0369a1', dark: 'rgba(3,105,161,0.10)', badge: '#0284c7', strip: 'linear-gradient(90deg, #0369a1, #0284c7)' },
];

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function SuperAdminTenantsPage() {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const { user, logoVersion } = useAuthStore();
  const router = useRouter();

  const { data: tenants = [], mutate: mutateTenants } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/tenants' : null,
    fetcher, { refreshInterval: 5000 }
  );
  const { data: users = [] } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/users' : null,
    fetcher, { refreshInterval: 5000 }
  );
  const { data: assistants = [] } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/assistants' : null,
    fetcher, { refreshInterval: 5000 }
  );
  const { data: documents = [] } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/documents' : null,
    fetcher, { refreshInterval: 5000 }
  );

  const [showRegisterOrg, setShowRegisterOrg] = useState(false);
  const [tenantForm, setTenantForm] = useState({ name: '', slug: '', plan: 'starter' });
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'business' | 'enterprise'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMac = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent),
    []
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearch('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (user?.role !== UserRole.PLATFORM_ADMIN) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-8 text-center animate-in fade-in">
        <ShieldAlert className="h-12 w-12 text-red-500 mb-4 opacity-80" />
        <h2 className="text-xl font-semibold">{t('superAdmin.accessRestricted')}</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md">
          {t('superAdmin.accessRestrictedDesc')}
        </p>
      </div>
    );
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/super-admin/tenants', tenantForm);
      setTenantForm({ name: '', slug: '', plan: 'starter' });
      setShowRegisterOrg(false);
      await mutateTenants();
      if (res.data?.id) {
        router.push(`/super-admin/organizations/${res.data.id}`);
      }
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err.message, { variant: 'danger' });
    }
  };

  const baseTenants = tenants.filter((t: any) => t.slug !== 'system');

  const planCounts = baseTenants.reduce(
    (acc: Record<string, number>, t: any) => {
      const p = (t.plan || 'starter').toLowerCase();
      acc[p] = (acc[p] || 0) + 1;
      acc.all += 1;
      return acc;
    },
    { all: 0, starter: 0, business: 0, enterprise: 0 } as Record<string, number>
  );

  const enrichedTenants = baseTenants
    .map((t: any) => {
      const tUsers = users.filter((u: any) => u.tenantId === t.id);
      const admins = tUsers.filter((u: any) => u.role === 'tenant_owner' || u.role === 'tenant_admin');
      const regularUsers = tUsers.filter((u: any) => u.role !== 'tenant_owner' && u.role !== 'tenant_admin');
      return {
        tenant: t,
        admins,
        users: regularUsers,
        totalUsers: tUsers.length,
        assistantsCount: assistants.filter((a: any) => a.tenantId === t.id && !a.isDataset).length,
        documentsCount: documents.filter((d: any) => d.tenantId === t.id).length,
      };
    })
    .sort((a: any, b: any) => a.tenant.name.localeCompare(b.tenant.name));

  const q = search.trim().toLowerCase();
  const processedTenants = enrichedTenants
    .filter((g: any) => planFilter === 'all' || (g.tenant.plan || 'starter').toLowerCase() === planFilter)
    .filter((g: any) => {
      if (!q) return true;
      return (
        g.tenant.name.toLowerCase().includes(q) ||
        (g.tenant.slug || '').toLowerCase().includes(q) ||
        (g.tenant.plan || 'starter').toLowerCase().includes(q)
      );
    });

  const isFiltering = q.length > 0 || planFilter !== 'all';
  const clearFilters = () => { setSearch(''); setPlanFilter('all'); };

  const PLAN_TABS: Array<{ key: 'all' | 'starter' | 'business' | 'enterprise'; label: string }> = [
    { key: 'all', label: t('superAdmin.allPlans', 'All') },
    { key: 'starter', label: t('billing.starter') },
    { key: 'business', label: t('billing.business') },
    { key: 'enterprise', label: t('billing.enterprise') },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0a0e1a]">
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0a0e1a]/90 border-b border-[#1e293b]">
          <div className="max-w-[1400px] mx-auto px-6 md:px-8 pt-6 pb-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#06d4ef]/70 mb-1">{t('superAdmin.platform')}</p>
              <h1 className="text-[22px] font-bold text-slate-100 leading-tight">{t('superAdmin.tenants')}</h1>
              <p className="text-[12px] text-slate-500 mt-0.5">{t('superAdmin.tenantsSubtitle')}</p>
            </div>
            <Button size="sm" onClick={() => setShowRegisterOrg(true)}
              className="h-8 text-xs px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full mb-1">
              <Plus className="h-3 w-3 mr-1.5" /> {t('superAdmin.newTenant')}
            </Button>
          </div>

          <div className="max-w-[1400px] mx-auto px-6 md:px-8 pb-4 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 lg:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('superAdmin.searchTenantsPlaceholder', 'Search by name, slug, or plan…')}
                className="w-full h-9 pl-9 pr-20 rounded-lg bg-[#111827] border border-[#1e293b] text-[13px] text-slate-200 placeholder:text-slate-600 outline-none focus:border-[#06d4ef]/50 focus:ring-2 focus:ring-[#06d4ef]/15 transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {search ? (
                  <button
                    type="button"
                    onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}
                    className="p-1 rounded hover:bg-slate-700/60 text-slate-500 hover:text-slate-200 transition-colors"
                    aria-label={t('common.clear', 'Clear')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[#1e293b] bg-[#0a0e1a] text-[10px] font-mono text-slate-500">
                    {isMac ? '⌘' : 'Ctrl'}K
                  </kbd>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {PLAN_TABS.map((tab) => {
                const count = planCounts[tab.key] || 0;
                const isActive = planFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setPlanFilter(tab.key)}
                    className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium transition-all border ${
                      isActive
                        ? 'bg-[#06d4ef]/15 text-[#06d4ef] border-[#06d4ef]/40'
                        : 'bg-[#111827] text-slate-400 border-[#1e293b] hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-[#06d4ef]/20 text-[#06d4ef]' : 'bg-[#0a0e1a] text-slate-500'
                    }`}>{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="lg:ml-auto text-[11px] text-slate-500 whitespace-nowrap">
              {t('superAdmin.showingCount', {
                shown: processedTenants.length,
                total: baseTenants.length,
                defaultValue: 'Showing {{shown}} of {{total}}',
              })}
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {processedTenants.map((group: any, idx: number) => {
              const color = TENANT_COLORS[idx % TENANT_COLORS.length];
              const hasLogo = group.tenant.settings?.branding?.logoUrl;
              return (
                <div key={group.tenant.id} className="rounded-xl overflow-hidden border border-[#1e293b] bg-[#111827] flex flex-col shadow-sm">
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {hasLogo ? (
                        <AuthedImage
                          src={`/tenant/logo/${group.tenant.id}?v=${logoVersion}`}
                          alt={group.tenant.name}
                          className="h-10 w-10 rounded-lg object-cover shrink-0 border border-slate-700"
                        />
                      ) : (
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0`} style={{ background: color.dark, border: `1px solid ${color.accent}20` }}>
                          <Building2 className="h-5 w-5" style={{ color: color.accent }} />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-100">{group.tenant.name}</h3>
                          <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded-sm bg-[#5c6d86]/20 text-slate-300 border border-[#5c6d86]/20">
                            {t('billing.' + (group.tenant.plan || 'starter'))}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium" style={{ color: color.accent }}>{group.tenant.slug}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                       <span className="text-[10px] uppercase font-bold text-emerald-500">{t('superAdmin.active')}</span>
                       <ChevronDown className="h-4 w-4 text-emerald-500" />
                    </div>
                  </div>
                  {(() => {
                    const planLimits: Record<string, { users: number; assistants: number; documents: number }> = {
                      starter: { users: 5, assistants: 3, documents: 10 },
                      business: { users: 50, assistants: 20, documents: 50 },
                      enterprise: { users: 200, assistants: 100, documents: 200 },
                    };
                    const plan = group.tenant.plan || 'starter';
                    const limits = planLimits[plan] || planLimits.starter;
                    const maxU = limits.users;
                    const maxA = group.tenant.settings?.maxAssistants || limits.assistants;
                    const maxD = limits.documents;
                    const uOver = group.totalUsers >= maxU;
                    const aOver = group.assistantsCount >= maxA;
                    const dOver = group.documentsCount >= maxD;
                    return (
                  <div className="px-5 pb-5 grid grid-cols-4 gap-2 text-center text-slate-200">
                     <div className="flex flex-col items-center justify-center bg-[#0d121c] rounded-md py-4">
                       <span className="font-bold text-base">
                         {group.totalUsers}
                         <span className={`text-[11px] font-normal ${uOver ? 'text-red-400' : 'text-slate-500'}`}> / {maxU}</span>
                       </span>
                       <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1"><Users className="h-3 w-3" /> {t('superAdmin.users')}</span>
                     </div>
                     <div className="flex flex-col items-center justify-center bg-[#0d121c] rounded-md py-4">
                       <span className="font-bold text-base">
                         {group.assistantsCount}
                         <span className={`text-[11px] font-normal ${aOver ? 'text-red-400' : 'text-slate-500'}`}> / {maxA}</span>
                       </span>
                       <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1"><Bot className="h-3 w-3" /> {t('superAdmin.assistantsCount')}</span>
                     </div>
                     <div className="flex flex-col items-center justify-center bg-[#0d121c] rounded-md py-4">
                       <span className="font-bold text-base">
                         {group.documentsCount}
                         <span className={`text-[11px] font-normal ${dOver ? 'text-red-400' : 'text-slate-500'}`}> / {maxD}</span>
                       </span>
                       <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1"><FileText className="h-3 w-3" /> {t('superAdmin.documents')}</span>
                     </div>
                     <div className="flex flex-col items-center justify-center bg-[#0d121c] rounded-md py-4">
                       <span className="font-bold text-base text-[#06d4ef]">
                         {group.tenant.tokensConsumed >= 1000 
                           ? (group.tenant.tokensConsumed / 1000).toFixed(1) + 'k' 
                           : group.tenant.tokensConsumed}
                       </span>
                       <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">{t('analytics.tokens')}</span>
                     </div>
                  </div>
                    );
                  })()}
                  <div className="px-5 pb-4 text-[10px] text-slate-500 flex items-center justify-between">
                     <span>{t('superAdmin.createdAt')} {formatDate(group.tenant.createdAt)}</span>
                     <Link href={`/super-admin/organizations/${group.tenant.id}`} className="text-blue-400 hover:text-blue-300">{t('superAdmin.viewDetails')} &rarr;</Link>
                  </div>
                </div>
              );
            })}
            
            {processedTenants.length === 0 && (
              <div className="col-span-1 md:col-span-2 py-20 text-center">
                {isFiltering ? (
                  <>
                    <SearchX className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                    <p className="text-sm text-slate-300 font-medium">
                      {t('superAdmin.noTenantsFound', 'No tenants match your filters')}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {t('superAdmin.noTenantsFoundHint', 'Try a different search term or change the plan filter.')}
                    </p>
                    <button
                      onClick={clearFilters}
                      className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium bg-[#06d4ef]/15 text-[#06d4ef] border border-[#06d4ef]/40 hover:bg-[#06d4ef]/25 transition-colors"
                    >
                      <X className="h-3 w-3" />
                      {t('superAdmin.clearFilters', 'Clear filters')}
                    </button>
                  </>
                ) : (
                  <>
                    <Building2 className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                    <p className="text-sm text-slate-400">{t('superAdmin.noTenants')}</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showRegisterOrg && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowRegisterOrg(false)} />
          <div className="relative w-full max-w-md bg-[#111827] border-l border-[#1e293b] animate-in slide-in-from-right duration-300">
            <div className="h-full overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{t('superAdmin.registerOrg')}</h2>
                  <p className="text-xs mt-0.5 text-slate-500">{t('superAdmin.newTenantSubtitle')}</p>
                </div>
                <button onClick={() => setShowRegisterOrg(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleCreateTenant} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('superAdmin.orgName')}</Label>
                  <Input required value={tenantForm.name} onChange={e => setTenantForm({ ...tenantForm, name: e.target.value })}
                    placeholder={t('superAdmin.orgNamePlaceholder')} className="h-9 bg-[#1e293b] border-[#2d3748] text-slate-200 placeholder:text-slate-600" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('superAdmin.slug')}</Label>
                  <Input required value={tenantForm.slug} onChange={e => setTenantForm({ ...tenantForm, slug: e.target.value })}
                    placeholder={t('superAdmin.slugPlaceholder')} className="h-9 bg-[#1e293b] border-[#2d3748] text-slate-200 placeholder:text-slate-600" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('superAdmin.plan')}</Label>
                  <select
                    className="w-full h-9 rounded-md bg-[#1e293b] border border-[#2d3748] text-slate-200 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#06d4ef]"
                    value={tenantForm.plan}
                    onChange={e => setTenantForm({ ...tenantForm, plan: e.target.value })}
                  >
                    <option value="starter">{t('billing.starter')}</option>
                    <option value="business">{t('billing.business')}</option>
                    <option value="enterprise">{t('billing.enterprise')}</option>
                  </select>
                </div>
                <Button type="submit" className="w-full bg-[#06d4ef] hover:bg-[#06d4ef]/90 text-white h-9 text-sm">
                  <ArrowRight className="h-3.5 w-3.5 mr-1.5" /> {t('superAdmin.registerOrg')}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
