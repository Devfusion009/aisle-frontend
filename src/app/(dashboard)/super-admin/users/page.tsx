'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDialog } from '@/components/ui/app-dialog';
import useSWR from 'swr';
import { useAuthStore } from '@/store/use-auth-store';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Users, Plus, ShieldAlert, X, Trash2, Loader2, Search
} from 'lucide-react';
import { SkeletonSuperAdminUserRow } from '@/components/ui/skeleton-loaders';
import api from '@/lib/api';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

type PendingRoleChange = {
  userId: string;
  userName: string;
  currentRole: UserRole;
  newRole: UserRole;
};

export default function SuperAdminUsersPage() {
  const { t } = useTranslation();
  const { confirm: confirmDialog, showAlert } = useDialog();
  const { user } = useAuthStore();

  const { data: users, mutate: mutateUsers, isLoading: usersLoading } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/users' : null,
    fetcher, { refreshInterval: 5000 }
  );
  const { data: tenants = [] } = useSWR(
    user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/tenants' : null,
    fetcher, { refreshInterval: 5000 }
  );

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProvision, setShowProvision] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [roleChanging, setRoleChanging] = useState(false);
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: UserRole.USER,
    tenantId: 'new', newTenantName: '', newTenantSlug: '',
  });

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: userForm.name, email: userForm.email,
        password: userForm.password, role: userForm.role,
      };
      if (userForm.tenantId !== 'new') {
        payload.tenantId = userForm.tenantId;
      } else {
        if (!userForm.newTenantName || !userForm.newTenantSlug) {
          showAlert(t('superAdmin.needOrgInfo'), { variant: 'warning' });
          return;
        }
        payload.newTenantName = userForm.newTenantName;
        payload.newTenantSlug = userForm.newTenantSlug;
      }
      await api.post('/super-admin/users', payload);
      setUserForm({ name: '', email: '', password: '', role: UserRole.USER, tenantId: 'new', newTenantName: '', newTenantSlug: '' });
      setShowProvision(false);
      mutateUsers();
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err.message, { variant: 'danger' });
    }
  };

  const getTenantName = (tenantId: string) => {
    if (!tenantId) return t('superAdmin.systemUser');
    const found = tenants.find((tx: any) => tx.id === tenantId);
    return found ? found.name : t('superAdmin.unknownUser');
  };

  const userList = users || [];

  // Tenants that actually have non-admin users
  const tenantsWithUsers = tenants.filter((t: any) =>
    t.slug !== 'system' && userList.some((u: any) => u.tenantId === t.id && u.role !== UserRole.PLATFORM_ADMIN)
  );

  // Reset to "All" if the selected tenant no longer has users
  const effectiveTab = activeTab !== 'all' && !tenantsWithUsers.some((t: any) => t.id === activeTab)
    ? 'all'
    : activeTab;

  const filteredUsers = userList.filter((u: any) => {
      if (u.role === UserRole.PLATFORM_ADMIN) return false;
      if (effectiveTab !== 'all' && u.tenantId !== effectiveTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tenantName = getTenantName(u.tenantId).toLowerCase();
        return (
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          tenantName.includes(q)
        );
      }
      return true;
  });

  const requestRoleChange = (u: any, newRole: UserRole) => {
    if (u.role === newRole) return;
    setPendingRoleChange({
      userId: u.id,
      userName: u.name,
      currentRole: u.role as UserRole,
      newRole,
    });
  };

  const confirmRoleChange = async () => {
    if (!pendingRoleChange) return;
    setRoleChanging(true);
    try {
      await api.patch(`/super-admin/users/${pendingRoleChange.userId}/role`, { role: pendingRoleChange.newRole });
      await mutateUsers();
    } catch (err: any) {
      showAlert(err?.response?.data?.message || err.message, { variant: 'danger' });
    } finally {
      setRoleChanging(false);
      setPendingRoleChange(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
      if (!await confirmDialog(t('superAdmin.deleteUserConfirm'), { variant: 'danger' })) return;
      try {
          await api.delete(`/super-admin/users/${userId}`);
          await mutateUsers();
      } catch (err: any) {
          showAlert(err?.response?.data?.message || err.message, { variant: 'danger' });
      }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0a0e1a]">
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#0a0e1a]/90 border-b border-[#1e293b]">
          <div className="max-w-[1400px] mx-auto px-6 md:px-8 pt-6 pb-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#06d4ef]/70 mb-1">{t('superAdmin.platform')}</p>
              <h1 className="text-[22px] font-bold text-slate-100 leading-tight">{t('superAdmin.users')}</h1>
              <p className="text-[12px] text-slate-500 mt-0.5">{t('superAdmin.usersSubtitle')}</p>
            </div>
            <Button size="sm" onClick={() => setShowProvision(true)}
              className="h-8 text-xs px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full mb-1">
              <Plus className="h-3 w-3 mr-1.5" /> {t('superAdmin.newUser')}
            </Button>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-5">
           {/* SEARCH + FILTERS */}
           <div className="flex flex-col gap-3 mb-6">
             {/* Search bar */}
             <div className="relative max-w-sm">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
               <input
                 type="text"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 placeholder={t('superAdmin.userSearchPlaceholder')}
                 className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#111827] border border-[#1e293b] text-xs text-slate-200 placeholder:text-slate-600 outline-none focus:border-cyan-500/50 transition-colors"
               />
               {searchQuery && (
                 <button
                   onClick={() => setSearchQuery('')}
                   className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                 >
                   <X className="h-3 w-3" />
                 </button>
               )}
             </div>
             {/* Tenant tabs with horizontal scroll */}
             <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [scrollbar-color:#1e293b_transparent] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#1e293b] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#2d3748]">
               <div className="flex items-center gap-2 w-max">
                 <button
                   onClick={() => setActiveTab('all')}
                   className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${effectiveTab === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
                   {t('common.all')}
                 </button>
                 {tenantsWithUsers.map((t: any) => (
                   <button
                     key={t.id}
                     onClick={() => setActiveTab(t.id)}
                     className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${effectiveTab === t.id ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
                     {t.name}
                   </button>
                 ))}
               </div>
             </div>
           </div>
           
           <div className="rounded-xl border border-[#1e293b] bg-[#111827] w-full overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-sm">
                 <thead>
                   <tr className="text-[10px] text-slate-500 uppercase tracking-wider bg-[#0d1117] border-b border-[#1e293b]">
                     <th className="px-5 py-3.5 text-left font-semibold">{t('superAdmin.user')}</th>
                     <th className="px-5 py-3.5 text-left font-semibold">{t('superAdmin.tenant')}</th>
                     <th className="px-5 py-3.5 text-left font-semibold">{t('superAdmin.profile')}</th>
                     <th className="px-5 py-3.5 text-left font-semibold">{t('superAdmin.status')}</th>
                     <th className="px-5 py-3.5 text-right font-semibold">{t('common.actions')}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1e293b]">
                    {usersLoading && Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonSuperAdminUserRow key={i} />
                    ))}
                    {!usersLoading && filteredUsers.map((u: any) => (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5">
                           <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 bg-[#0d121c] text-cyan-500 border border-cyan-500/20">
                               {u.name?.[0]?.toUpperCase() || '?'}
                             </div>
                             <div>
                               <div className="text-[13px] font-medium text-slate-200">{u.name}</div>
                               <div className="text-[11px] text-slate-500">{u.email}</div>
                             </div>
                           </div>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-slate-400">
                          {getTenantName(u.tenantId)}
                        </td>
                        <td className="px-5 py-3.5">
                          {u.role === UserRole.PLATFORM_ADMIN ? (
                              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-red-500">
                                {t('superAdmin.roles.' + u.role)}
                              </span>
                          ) : (
                              <select
                                  value={u.role}
                                  onChange={(e) => requestRoleChange(u, e.target.value as UserRole)}
                                  className="bg-transparent text-[11px] font-semibold outline-none cursor-pointer border border-transparent hover:border-[#2d3748] rounded px-1 -ml-1 py-0.5 transition-colors max-w-[120px]"
                                  style={{
                                      color: u.role === UserRole.TENANT_OWNER ? '#0ea5e9' : (u.role === UserRole.TENANT_ADMIN ? '#8b5cf6' : (u.role === UserRole.EDITOR ? '#f59e0b' : '#64748b'))
                                  }}
                              >
                                  <option className="text-slate-900" value={UserRole.TENANT_OWNER}>{t('superAdmin.roles.tenant_owner')}</option>
                                  <option className="text-slate-900" value={UserRole.TENANT_ADMIN}>{t('superAdmin.roles.tenant_admin')}</option>
                                  <option className="text-slate-900" value={UserRole.EDITOR}>{t('superAdmin.roles.editor')}</option>
                                  <option className="text-slate-900" value={UserRole.USER}>{t('superAdmin.roles.user')}</option>
                              </select>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                           <span className="text-[10px] uppercase font-bold text-emerald-500">{t('superAdmin.active')}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                           <button onClick={() => handleDeleteUser(u.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1" title={t('superAdmin.deleteUserTooltip')}>
                             <Trash2 className="h-4 w-4" />
                           </button>
                        </td>
                      </tr>
                    ))}
                    {!usersLoading && filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500 text-sm">
                           {t('superAdmin.noUsersFound')}
                        </td>
                      </tr>
                    )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      </div>

      {/* ── Role change confirmation modal ── */}
      {pendingRoleChange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setPendingRoleChange(null)}
          />
          <div className="relative w-full max-w-sm bg-[#111827] border border-[#1e293b] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden">
            {/* Top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

            <div className="p-6 space-y-4">
              {/* Icon + title */}
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <ShieldAlert className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-100">{t('superAdmin.changeRoleTitle')}</h3>
                  <p className="text-[12px] text-slate-400 mt-0.5">{t('superAdmin.changeRoleBody')}</p>
                </div>
              </div>

              {/* Detail card */}
              <div className="rounded-xl bg-[#0d1117] border border-[#1e293b] p-4 space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t('superAdmin.user')}</span>
                  <span className="text-slate-200 font-medium">{pendingRoleChange.userName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t('superAdmin.currentRole')}</span>
                  <span className="text-slate-400 font-semibold">{t('superAdmin.roles.' + pendingRoleChange.currentRole)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">{t('superAdmin.newRole')}</span>
                  <span className="font-bold text-cyan-400">{t('superAdmin.roles.' + pendingRoleChange.newRole)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setPendingRoleChange(null)}
                  disabled={roleChanging}
                  className="flex-1 h-9 rounded-lg border border-[#2d3748] text-slate-400 hover:text-slate-200 hover:bg-white/5 text-[12px] font-semibold transition-colors disabled:opacity-40"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={confirmRoleChange}
                  disabled={roleChanging}
                  className="flex-1 h-9 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-black text-[12px] font-bold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {roleChanging && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t('superAdmin.yesChangeRole')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProvision && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowProvision(false)} />
          <div className="relative w-full max-w-md bg-[#111827] border-l border-[#1e293b] animate-in slide-in-from-right duration-300">
            <div className="h-full overflow-y-auto p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{t('superAdmin.provisionUser')}</h2>
                  <p className="text-xs mt-0.5 text-slate-500">{t('superAdmin.newUserSubtitle')}</p>
                </div>
                <button onClick={() => setShowProvision(false)} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors">
                  <X className="h-4 w-4 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('superAdmin.fullName')}</Label>
                  <Input required value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                    placeholder={t('superAdmin.fullNamePlaceholder')} className="h-9 bg-[#1e293b] border-[#2d3748] text-slate-200 placeholder:text-slate-600" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('superAdmin.email')}</Label>
                  <Input required type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder={t('superAdmin.emailPlaceholder')} className="h-9 bg-[#1e293b] border-[#2d3748] text-slate-200 placeholder:text-slate-600" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('superAdmin.password')}</Label>
                  <Input required type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                    className="h-9 bg-[#1e293b] border-[#2d3748] text-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('superAdmin.profile')}</Label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                    className="flex h-9 w-full rounded-md px-3 py-1 text-sm outline-none bg-[#1e293b] border border-[#2d3748] text-slate-200 focus:border-cyan-500"
                  >
                    <option value={UserRole.USER}>{t('superAdmin.roles.user')}</option>
                    <option value={UserRole.EDITOR}>{t('superAdmin.roles.editor')}</option>
                    <option value={UserRole.TENANT_ADMIN}>{t('superAdmin.roles.tenant_admin')}</option>
                    <option value={UserRole.TENANT_OWNER}>{t('superAdmin.roles.tenant_owner')}</option>
                    <option value={UserRole.PLATFORM_ADMIN}>{t('superAdmin.roles.platform_admin')}</option>
                  </select>
                </div>

                <div className="rounded-lg p-3 space-y-3 bg-[#1e293b]/60 border border-[#2d3748]">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-cyan-400">{t('superAdmin.organization')}</Label>
                  <select
                    value={userForm.tenantId}
                    onChange={e => setUserForm({ ...userForm, tenantId: e.target.value })}
                    className="flex h-9 w-full rounded-md px-3 py-1 text-sm outline-none bg-[#111827] border border-[#2d3748] text-slate-200"
                  >
                    <option value="new">+ {t('superAdmin.createNewOrg')}</option>
                    {tenants.filter((t: any) => t.slug !== 'system').map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                    ))}
                  </select>
                  {userForm.tenantId === 'new' && (
                    <div className="grid gap-3 pt-2 border-t border-[#2d3748]">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('superAdmin.orgNameField')}</Label>
                        <Input required value={userForm.newTenantName} onChange={e => setUserForm({ ...userForm, newTenantName: e.target.value })}
                          placeholder={t('superAdmin.orgNameFieldPlaceholder')} className="h-8 text-sm bg-[#111827] border-[#2d3748] text-slate-200 placeholder:text-slate-600" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t('superAdmin.urlSlug')}</Label>
                        <Input required value={userForm.newTenantSlug} onChange={e => setUserForm({ ...userForm, newTenantSlug: e.target.value })}
                          placeholder={t('superAdmin.urlSlugPlaceholder')} className="h-8 text-sm bg-[#111827] border-[#2d3748] text-slate-200 placeholder:text-slate-600" />
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-700 text-white h-9 text-sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> {t('superAdmin.provisionUser')}
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
