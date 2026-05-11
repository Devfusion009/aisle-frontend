'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { useAuthStore } from '@/store/use-auth-store';
import { UserRole } from '@/types';
import { ShieldAlert, Bot, Database, Search, X, SearchX } from 'lucide-react';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

export default function SuperAdminAssistantsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { data: assistants = [] } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/assistants' : null,
    fetcher, { refreshInterval: 5000 }
  );

  const { data: tenants = [] } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/tenants' : null,
    fetcher, { refreshInterval: 5000 }
  );

  const [activeTab, setActiveTab] = useState<string>('all');
  const [search, setSearch] = useState('');
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

  const visibleTenants = tenants.filter((t: any) => t.slug !== 'system');
  const baseAssistants = assistants.filter((a: any) => {
    const tnt = tenants.find((t: any) => t.id === a.tenantId);
    return tnt && tnt.slug !== 'system';
  });

  const countByTenant = baseAssistants.reduce((acc: Record<string, number>, a: any) => {
    acc[a.tenantId] = (acc[a.tenantId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tabFiltered = activeTab === 'all'
    ? baseAssistants
    : baseAssistants.filter((a: any) => a.tenantId === activeTab);

  const q = search.trim().toLowerCase();
  const filteredAssistants = q
    ? tabFiltered.filter((a: any) => {
        const tnt = tenants.find((t: any) => t.id === a.tenantId);
        const tenantName = (tnt?.name || '').toLowerCase();
        const model = (a.settings?.model || a.model || '').toLowerCase();
        const desc = (a.description || '').toLowerCase();
        const provider = (a.provider || '').toLowerCase();
        const datasetMatch = (a.linkedDatasets || []).some((d: any) =>
          (d.name || '').toLowerCase().includes(q)
        );
        return (
          a.name.toLowerCase().includes(q) ||
          desc.includes(q) ||
          model.includes(q) ||
          provider.includes(q) ||
          tenantName.includes(q) ||
          datasetMatch
        );
      })
    : tabFiltered;

  const isFiltering = q.length > 0 || activeTab !== 'all';
  const clearFilters = () => { setSearch(''); setActiveTab('all'); };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0a0e1a]">
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0a0e1a]/90 border-b border-[#1e293b]">
          <div className="max-w-[1400px] mx-auto px-6 md:px-8 pt-6 pb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#06d4ef]/70 mb-1">{t('superAdmin.platform')}</p>
            <h1 className="text-[22px] font-bold text-slate-100 leading-tight">{t('superAdmin.assistantsCount')}</h1>
            <p className="text-[12px] text-slate-500 mt-0.5">{t('superAdmin.assistantsSubtitle')}</p>
          </div>

          <div className="max-w-[1400px] mx-auto px-6 md:px-8 pb-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1 lg:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('superAdmin.searchAssistantsPlaceholder', 'Search by name, model, tenant, or dataset…')}
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

              <div className="lg:ml-auto text-[11px] text-slate-500 whitespace-nowrap">
                {t('superAdmin.showingCount', {
                  shown: filteredAssistants.length,
                  total: baseAssistants.length,
                  defaultValue: 'Showing {{shown}} of {{total}}',
                })}
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all border ${
                  activeTab === 'all'
                    ? 'bg-[#06d4ef]/15 text-[#06d4ef] border-[#06d4ef]/40'
                    : 'bg-[#111827] text-slate-400 border-[#1e293b] hover:text-slate-200 hover:border-slate-600'
                }`}>
                {t('superAdmin.allPlans')}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === 'all' ? 'bg-[#06d4ef]/20 text-[#06d4ef]' : 'bg-[#0a0e1a] text-slate-500'
                }`}>{baseAssistants.length}</span>
              </button>
              {visibleTenants.map((tnt: any) => {
                const count = countByTenant[tnt.id] || 0;
                const isActive = activeTab === tnt.id;
                return (
                  <button
                    key={tnt.id}
                    onClick={() => setActiveTab(tnt.id)}
                    className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all border ${
                      isActive
                        ? 'bg-[#06d4ef]/15 text-[#06d4ef] border-[#06d4ef]/40'
                        : 'bg-[#111827] text-slate-400 border-[#1e293b] hover:text-slate-200 hover:border-slate-600'
                    }`}>
                    {tnt.name}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-[#06d4ef]/20 text-[#06d4ef]' : 'bg-[#0a0e1a] text-slate-500'
                    }`}>{count}</span>
                  </button>
                  
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-5">
           <div className="rounded-xl border border-[#1e293b] bg-[#111827] w-full overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="text-[10px] text-slate-500 uppercase tracking-wider bg-[#0d1117] border-b border-[#1e293b]">
                     <th className="px-5 py-3.5 text-left font-semibold">{t('superAdmin.assistant')}</th>
                     <th className="px-5 py-3.5 text-left font-semibold">{t('superAdmin.tenant')}</th>
                     <th className="px-5 py-3.5 text-left font-semibold">{t('superAdmin.model')}</th>
                     <th className="px-5 py-3.5 text-left font-semibold">{t('superAdmin.datasets')}</th>
                     <th className="px-5 py-3.5 text-left font-semibold">{t('superAdmin.conversations')}</th>
                     <th className="px-5 py-3.5 text-left font-semibold">{t('superAdmin.status')}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1e293b]">
                    {filteredAssistants.map((a: any) => {
                      const modelProvider = a.settings?.model || t('superAdmin.modelFallback');
                      const hasRag = !!a.systemPrompt;

                      return (
                      <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                           <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-[#0d121c] text-cyan-400 border border-cyan-500/20">
                               <Bot className="h-4 w-4" />
                             </div>
                             <div className="max-w-[200px]">
                               <div className="text-[13px] font-semibold text-slate-200 truncate">{a.name}</div>
                               <div className="text-[11px] text-slate-500 truncate">{a.description || t('superAdmin.noDescription')}</div>
                             </div>
                           </div>
                        </td>
                        <td className="px-5 py-4 text-[12px] text-slate-400">
                          {tenants.find((tnt: any) => tnt.id === a.tenantId)?.name || t('superAdmin.unknownTenant')}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-[12px] text-slate-400">
                            <span>{modelProvider}</span>
                            {hasRag && <span className="text-[9px] font-bold text-cyan-400 bg-cyan-400/10 px-1 py-0.5 rounded">RAG</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                           <div className="flex flex-wrap gap-1 border-t-0 p-0">
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-[#1e293b]/50 border border-[#2d3748] px-1.5 py-0.5 rounded">
                                <Database className="h-3 w-3" />
                                {a.name}
                              </div>
                           </div>
                        </td>
                        <td className="px-5 py-4 text-[12px] text-slate-400">
                           {Math.floor(Math.random() * 200)}
                        </td>
                        <td className="px-5 py-4">
                           <span className="text-[10px] font-bold text-emerald-500">{t('superAdmin.active')}</span>
                        </td>
                      </tr>
                    )})}
                    {filteredAssistants.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          {isFiltering ? (
                            <div>
                              <SearchX className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                              <p className="text-sm text-slate-300 font-medium">
                                {t('superAdmin.noAssistantsMatch', 'No assistants match your filters')}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                {t('superAdmin.noAssistantsMatchHint', 'Try a different search term or change the tenant tab.')}
                              </p>
                              <button
                                onClick={clearFilters}
                                className="mt-4 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-medium bg-[#06d4ef]/15 text-[#06d4ef] border border-[#06d4ef]/40 hover:bg-[#06d4ef]/25 transition-colors"
                              >
                                <X className="h-3 w-3" />
                                {t('superAdmin.clearFilters', 'Clear filters')}
                              </button>
                            </div>
                          ) : (
                            <div>
                              <Bot className="h-10 w-10 mx-auto mb-3 text-slate-600" />
                              <p className="text-sm text-slate-400">{t('superAdmin.noAssistantsFound')}</p>
                            </div>
                          )}
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
