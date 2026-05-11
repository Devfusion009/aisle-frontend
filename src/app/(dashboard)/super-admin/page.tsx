
'use client';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/use-auth-store';
import { UserRole } from '@/types';
import useSWR from 'swr';
import api from '@/lib/api';
import { AuthedImage } from '@/components/ui/authed-image';
import { Building2, Users, Bot, FileText, Activity, ShieldAlert } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { SkeletonSuperAdminKPI, SkeletonSuperAdminChart, SkeletonSuperAdminTenantRow } from '@/components/ui/skeleton-loaders';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

type TimeRange = 'day' | 'week' | 'month' | 'year' | '5year';

const RANGE_DAYS: Record<TimeRange, number> = {
  day: 7,
  week: 56,
  month: 180,
  year: 365,
  '5year': 1825,
};

function buildTimelineBuckets(range: TimeRange) {
  const now = new Date();
  const buckets: { label: string; start: Date; end: Date }[] = [];

  switch (range) {
    case 'day': {
      // Last 7 days, daily granularity
      for (let i = 6; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
        buckets.push({
          label: start.toLocaleDateString(undefined, { weekday: 'short' }),
          start,
          end,
        });
      }
      break;
    }
    case 'week': {
      // Last 8 weeks, weekly granularity
      for (let i = 7; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i - 1) * 7);
        buckets.push({
          label: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          start,
          end,
        });
      }
      break;
    }
    case 'month': {
      // Last 6 months, monthly granularity
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        buckets.push({
          label: start.toLocaleString(undefined, { month: 'short' }),
          start,
          end,
        });
      }
      break;
    }
    case 'year': {
      // Last 12 months, monthly granularity
      for (let i = 11; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        buckets.push({
          label: start.toLocaleString(undefined, { month: 'short', year: '2-digit' }),
          start,
          end,
        });
      }
      break;
    }
    case '5year': {
      // Last 5 years, yearly granularity
      for (let i = 4; i >= 0; i--) {
        const start = new Date(now.getFullYear() - i, 0, 1);
        const end = new Date(now.getFullYear() - i + 1, 0, 1);
        buckets.push({
          label: String(start.getFullYear()),
          start,
          end,
        });
      }
      break;
    }
  }

  return buckets;
}

export default function SuperAdminDashboard() {
  const { t } = useTranslation();
  const { user, logoVersion } = useAuthStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  const TIME_RANGES: { key: TimeRange; label: string }[] = [
    { key: 'day', label: t('superAdmin.timeRanges.day') },
    { key: 'week', label: t('superAdmin.timeRanges.week') },
    { key: 'month', label: t('superAdmin.timeRanges.month') },
    { key: 'year', label: t('superAdmin.timeRanges.year') },
    { key: '5year', label: t('superAdmin.timeRanges.fiveYear') },
  ];

  const { data: tenants, isLoading: tenantsLoading } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/tenants' : null,
    fetcher, { refreshInterval: 5000 }
  );
  const { data: users, isLoading: usersLoading } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/users' : null,
    fetcher, { refreshInterval: 5000 }
  );
  const { data: assistants, isLoading: assistantsLoading } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/assistants' : null,
    fetcher, { refreshInterval: 5000 }
  );
  const { data: documents, isLoading: documentsLoading } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/documents' : null,
    fetcher, { refreshInterval: 5000 }
  );
  const { data: tokenUsage = [], isLoading: tokenLoading } = useSWR<{ date: string; tokens: number }[]>(
    user?.role === UserRole.PLATFORM_ADMIN
      ? `/super-admin/token-usage?days=${RANGE_DAYS[timeRange]}`
      : null,
    fetcher, { refreshInterval: 10000 }
  );

  const isLoading = tenantsLoading || usersLoading || assistantsLoading || documentsLoading;
  const tenantList: any[] = tenants ?? [];
  const userList: any[] = users ?? [];
  const assistantList: any[] = assistants ?? [];
  const documentList: any[] = documents ?? [];

  const { tenantGrowthData, tokensData } = useMemo(() => {
    const buckets = buildTimelineBuckets(timeRange);
    const customerTenants = tenantList.filter((t: any) => t.slug !== 'system');

    // Count tenants created before the first bucket
    const windowStart = buckets[0]?.start.getTime() || 0;
    let runningTenants = customerTenants.filter(
      (t: any) => new Date(t.createdAt).getTime() < windowStart,
    ).length;

    const tenantBuckets = buckets.map((b) => {
      const newInBucket = customerTenants.filter((t: any) => {
        const ts = new Date(t.createdAt).getTime();
        return ts >= b.start.getTime() && ts < b.end.getTime();
      }).length;
      runningTenants += newInBucket;
      return { name: b.label, tenants: runningTenants };
    });

    // Build a lookup map from date string -> tokens for O(1) bucket matching
    const tokenByDate = new Map<string, number>();
    tokenUsage.forEach((entry) => {
      tokenByDate.set(entry.date, (tokenByDate.get(entry.date) || 0) + entry.tokens);
    });

    const pad = (n: number) => String(n).padStart(2, '0');
    const localDateKey = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const tokenBuckets = buckets.map((b) => {
      let tokens = 0;
      const cursor = new Date(b.start);
      while (cursor < b.end) {
        tokens += tokenByDate.get(localDateKey(cursor)) || 0;
        cursor.setDate(cursor.getDate() + 1);
      }
      return { name: b.label, tokens };
    });

    return { tenantGrowthData: tenantBuckets, tokensData: tokenBuckets };
  }, [tenantList, tokenUsage, timeRange]);

  // Decide tick interval based on range to avoid label crowding
  const xTickInterval = timeRange === 'year' ? 1 : 0;

  // RBAC guard — non-platform users should never see the super-admin shell.
  // Kept consistent with the sub-pages (/tenants, /users, /databases, etc.)
  // that already render the AccessRestricted view.
  if (user && user.role !== UserRole.PLATFORM_ADMIN) {
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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0a0e1a]">
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0a0e1a]/90 border-b border-[#1e293b]">
          <div className="max-w-[1400px] mx-auto px-6 md:px-8 pt-6 pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#06d4ef]/70 mb-1">{t('superAdmin.platform')}</p>
            <h1 className="text-[22px] font-bold text-slate-100 leading-tight">{t('superAdmin.dashboard')}</h1>
            <p className="text-[12px] text-slate-500 mt-0.5">{t('superAdmin.dashboardSubtitle')}</p>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-5 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonSuperAdminKPI key={i} />)
            ) : (
              <>
                <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4 flex flex-col items-center justify-center text-center">
                  <div className="h-10 w-10 rounded-full bg-[#06d4ef]/10 flex items-center justify-center mb-3">
                    <Building2 className="h-5 w-5 text-[#06d4ef]" />
                  </div>
                  <p className="text-3xl font-bold text-slate-100">{tenantList.filter((t: any) => t.slug !== 'system').length}</p>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">{t('superAdmin.tenants')}</p>
                </div>

                <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4 flex flex-col items-center justify-center text-center">
                  <div className="h-10 w-10 rounded-full bg-[#06d4ef]/10 flex items-center justify-center mb-3">
                    <Users className="h-5 w-5 text-[#06d4ef]" />
                  </div>
                  <p className="text-3xl font-bold text-slate-100">{userList.filter((u: any) => u.role !== UserRole.PLATFORM_ADMIN).length}</p>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">{t('superAdmin.users')}</p>
                </div>

                <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4 flex flex-col items-center justify-center text-center">
                  <div className="h-10 w-10 rounded-full bg-[#06d4ef]/10 flex items-center justify-center mb-3">
                    <Bot className="h-5 w-5 text-[#06d4ef]" />
                  </div>
                  <p className="text-3xl font-bold text-slate-100">{assistantList.filter((a: any) => !a.isDataset).length}</p>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">{t('superAdmin.assistantsCount')}</p>
                </div>

                <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4 flex flex-col items-center justify-center text-center">
                  <div className="h-10 w-10 rounded-full bg-[#06d4ef]/10 flex items-center justify-center mb-3">
                    <FileText className="h-5 w-5 text-[#06d4ef]" />
                  </div>
                  <p className="text-3xl font-bold text-slate-100">{documentList.length}</p>
                  <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold">{t('superAdmin.documents')}</p>
                </div>
              </>
            )}
          </div>

          {/* Timeline Selector */}
          <div className="flex items-center justify-end">
            <div className="inline-flex rounded-lg border border-[#1e293b] bg-[#111827] p-0.5">
              {TIME_RANGES.map((tr) => (
                <button
                  key={tr.key}
                  onClick={() => setTimeRange(tr.key)}
                  className={`px-3.5 py-1.5 rounded-md text-[12px] font-medium transition-all ${
                    timeRange === tr.key
                      ? 'bg-[#06d4ef] text-white shadow-sm shadow-[#06d4ef]/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'
                  }`}
                >
                  {tr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              <>
                <SkeletonSuperAdminChart />
                <SkeletonSuperAdminChart />
              </>
            ) : (
              <>
                <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4 h-80">
                   <div className="flex items-center gap-2 mb-4">
                     <Activity className="h-4 w-4 text-[#06d4ef]" />
                     <h2 className="text-sm font-semibold text-slate-200">{t('superAdmin.tenantGrowth')}</h2>
                   </div>
                   <ResponsiveContainer width="100%" height="90%">
                     <AreaChart data={tenantGrowthData}>
                       <defs>
                         <linearGradient id="colorTenants" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#06d4ef" stopOpacity={0.6}/>
                           <stop offset="95%" stopColor="#06d4ef" stopOpacity={0}/>
                         </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                       <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval={xTickInterval} />
                       <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                       <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#e2e8f0' }} />
                       <Area type="monotone" dataKey="tenants" stroke="#06d4ef" fillOpacity={1} fill="url(#colorTenants)" />
                     </AreaChart>
                   </ResponsiveContainer>
                </div>

                <div className="rounded-xl border border-[#1e293b] bg-[#111827] p-4 h-80">
                   <div className="flex items-center gap-2 mb-4">
                     <Bot className="h-4 w-4 text-[#06d4ef]" />
                     <h2 className="text-sm font-semibold text-slate-200">{t('superAdmin.tokensConsumed')}</h2>
                   </div>
                   <ResponsiveContainer width="100%" height="90%">
                     <BarChart data={tokensData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                       <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval={xTickInterval} />
                       <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                       <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }} itemStyle={{ color: '#e2e8f0' }} cursor={{fill: '#1e293b'}} formatter={(val: any) => [Number(val).toLocaleString() + ' tokens', t('superAdmin.tokensConsumed')]} />
                       <Bar dataKey="tokens" fill="#06d4ef99" radius={[4, 4, 0, 0]} />
                     </BarChart>
                   </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Tenants Table */}
          <div className="rounded-xl border border-[#1e293b] bg-[#111827] w-full mt-8 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e293b]">
              <h2 className="text-sm font-semibold text-slate-100">{t('superAdmin.tenants')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase tracking-wider bg-[#0d1117] border-b border-[#1e293b]">
                    <th className="px-5 py-4 text-left font-semibold">{t('superAdmin.tenant')}</th>
                    <th className="px-5 py-4 text-left font-semibold">{t('superAdmin.plan')}</th>
                    <th className="px-5 py-4 text-left font-semibold">{t('superAdmin.users')}</th>
                    <th className="px-5 py-4 text-left font-semibold">{t('superAdmin.assistantsCount')}</th>
                    <th className="px-5 py-4 text-left font-semibold">{t('superAdmin.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonSuperAdminTenantRow key={i} />)}
                  {!isLoading && tenantList.filter((t: any) => t.slug !== 'system').map((tenant: any) => {
                    const totalUsers = userList.filter((u: any) => u.tenantId === tenant.id).length;
                    const assistantsCount = assistantList.filter((a: any) => a.tenantId === tenant.id && !a.isDataset).length;

                    const maxUsers = tenant.settings?.maxUsers || (totalUsers > 10 ? 200 : (totalUsers > 2 ? 50 : 5));
                    const maxAssistants = tenant.settings?.maxAssistants || (assistantsCount > 5 ? 100 : (assistantsCount > 1 ? 20 : 3));
                    let planColor = 'text-cyan-400';
                    let plan = t('billing.starter');
                    if (totalUsers > 40) { plan = t('billing.enterprise'); planColor = 'text-emerald-400'; }
                    else if (totalUsers > 5) { plan = t('billing.business'); planColor = 'text-blue-400'; }

                    const isTrial = tenant.name?.toLowerCase().includes('beta');

                    return (
                      <tr key={tenant.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            {tenant.settings?.branding?.logoUrl ? (
                              <AuthedImage
                                src={`/tenant/logo/${tenant.id}?v=${logoVersion}`}
                                alt={tenant.name}
                                className="h-7 w-7 rounded-md object-cover shrink-0 border border-slate-700"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-md bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                              </div>
                            )}
                            <span className="font-semibold text-slate-200">{tenant.name}</span>
                          </div>
                        </td>
                        <td className={`px-5 py-4 text-[12px] font-medium ${planColor}`}>
                          {plan}
                        </td>
                        <td className="px-5 py-4 text-[13px] text-slate-300">
                          {totalUsers} <span className="text-slate-500">/ {maxUsers}</span>
                        </td>
                        <td className="px-5 py-4 text-[13px] text-slate-300">
                          {assistantsCount} <span className="text-slate-500">/ {maxAssistants}</span>
                        </td>
                        <td className="px-5 py-4">
                           {isTrial ? (
                             <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">{t('superAdmin.trial')}</span>
                           ) : (
                             <span className="text-[10px] uppercase font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">{t('superAdmin.active')}</span>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                  {!isLoading && tenantList.filter((t: any) => t.slug !== 'system').length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                         {t('superAdmin.noTenants')}
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
