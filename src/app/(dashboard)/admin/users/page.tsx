'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import useSWR, { mutate as globalMutate } from 'swr';
import api from '@/lib/api';
import { UserRole, UserPriority, AccessRequest } from '@/types';
import { useAuthStore } from '@/store/use-auth-store';
import {
  Users, Plus, ChevronUp, Trash2, Loader2, X,
  Shield, Star, Check, AlertTriangle, Crown, ShieldAlert, Bell, ArrowRight,
} from 'lucide-react';
import { SkeletonUserRow } from '@/components/ui/skeleton-loaders';
import { useDialog } from '@/components/ui/app-dialog';
import { PendingRequestsModal } from './pending-requests-modal';

interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  priority: UserPriority;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Dataset {
  id: string;
  name: string;
}

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

const isAdminRole = (role: UserRole) =>
  role === UserRole.TENANT_ADMIN || role === UserRole.TENANT_OWNER;

const isEditorRole = (role: UserRole) => role === UserRole.EDITOR;

function roleBadgeClass(role: UserRole) {
  switch (role) {
    case UserRole.TENANT_OWNER: return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case UserRole.TENANT_ADMIN: return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case UserRole.EDITOR: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
}

function priorityBadgeClass(priority: UserPriority) {
  return priority === UserPriority.HIGH
    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    : 'bg-slate-500/10 text-slate-500 border-slate-500/20';
}

// ── Dataset Access Modal ────────────────────────────────────────────────
function DatasetAccessModal({
  user,
  onClose,
}: {
  user: TenantUser;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const { data: datasets } = useSWR<Dataset[]>('/datasets', fetcher);
  const [accessIds, setAccessIds] = useState<string[]>([]);
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    api.get(`/tenant-users/${user.id}/dataset-access`).then((r) => {
      const ids = r.data.datasetIds || [];
      setAccessIds(ids);
      setOriginalIds(ids);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user.id]);

  const toggle = (id: string) => {
    setAccessIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/tenant-users/${user.id}/dataset-access`, { datasetIds: accessIds });
      globalMutate('/knowledge/my-datasets', undefined, { revalidate: true });
      onClose();
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('users.failedSave'), { variant: 'danger' });
    } finally {
      setSaving(false);
      setShowConfirm(false);
    }
  };

  const added = (datasets || []).filter((d) => accessIds.includes(d.id) && !originalIds.includes(d.id));
  const removed = (datasets || []).filter((d) => !accessIds.includes(d.id) && originalIds.includes(d.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1a1d21] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-100">{t('users.datasetAccess')}</h3>
            <p className="text-[12px] text-slate-400 mt-0.5">{user.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200"><X className="h-4 w-4" /></button>
        </div>

        {showConfirm ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-500 mx-auto mb-2" />
              <p className="text-sm text-slate-200 font-medium">{t('users.confirmAccessChange', 'Confirm Access Change')}</p>
              <p className="text-xs text-slate-400 mt-1">{t('users.confirmAccessUpdate', { name: user.name })}</p>
            </div>
            
            <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
              {added.length > 0 && (
                <div className="text-left bg-[#111315] p-3 rounded-lg border border-emerald-500/20">
                  <p className="text-[12px] font-semibold text-emerald-400 mb-1.5 flex items-center gap-1.5"><Check className="h-3.5 w-3.5" /> {t('users.grantingAccess')}</p>
                  <ul className="text-[12px] text-slate-300 space-y-1 pl-1">
                    {added.map(d => <li key={d.id} className="truncate">• {d.name}</li>)}
                  </ul>
                </div>
              )}
              {removed.length > 0 && (
                <div className="text-left bg-[#111315] p-3 rounded-lg border border-red-500/20">
                  <p className="text-[12px] font-semibold text-red-400 mb-1.5 flex items-center gap-1.5"><X className="h-3.5 w-3.5" /> {t('users.removingAccess')}</p>
                  <ul className="text-[12px] text-slate-300 space-y-1 pl-1">
                    {removed.map(d => <li key={d.id} className="truncate">• {d.name}</li>)}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 rounded-lg border border-slate-700 text-[13px] text-slate-400 hover:border-slate-500 hover:bg-slate-800 transition-colors">
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white text-[13px] font-semibold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {t('common.confirm', 'Confirm')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
            ) : !datasets || datasets.length === 0 ? (
              <p className="text-[13px] text-slate-500 text-center py-8">{t('users.noDatasets')}</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto mb-4">
                {datasets.map((ds) => (
                  <button
                    key={ds.id}
                    onClick={() => toggle(ds.id)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border text-left text-[13px] transition-all ${
                      accessIds.includes(ds.id)
                        ? 'border-[#06d4ef] bg-[#06d4ef]/5 text-slate-100'
                        : 'border-slate-700 bg-[#111315] text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 ${
                      accessIds.includes(ds.id)
                        ? 'bg-[#06d4ef] border-[#06d4ef]'
                        : 'border-slate-600'
                    }`}>
                      {accessIds.includes(ds.id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="truncate">{ds.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-[13px] text-slate-400 hover:border-slate-500 transition-colors">
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  if (added.length === 0 && removed.length === 0) {
                    onClose();
                    return;
                  }
                  setShowConfirm(true);
                }}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-[#06d4ef] text-white text-[13px] font-semibold hover:bg-[#06d4ef]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {t('common.save', 'Save')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const { data: rawUsers, mutate } = useSWR<TenantUser[]>('/tenant-users', fetcher);

  // Pending access requests for this tenant — only for TENANT_OWNER / TENANT_ADMIN.
  // Polled every 5s so admins see new requests without refreshing.
  const canReviewRequests =
    currentUser?.role === UserRole.TENANT_OWNER ||
    currentUser?.role === UserRole.TENANT_ADMIN;
  const { data: pendingRequests, mutate: mutateRequests } = useSWR<AccessRequest[]>(
    canReviewRequests ? '/admin/access-requests' : null,
    fetcher,
    { refreshInterval: 5000 },
  );
  const pendingCount = pendingRequests?.length ?? 0;
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  // Admins cannot see/manage owners; all roles filter out the current user
  const users = rawUsers?.filter((u) => {
    if (u.id === currentUser?.id) return false;
    if (currentUser?.role === UserRole.TENANT_ADMIN && u.role === UserRole.TENANT_OWNER) return false;
    return true;
  });

  // Only one owner is allowed per tenant — check if one already exists
  const ownerExists = rawUsers?.some(
    (u) => u.role === UserRole.TENANT_OWNER && u.id !== currentUser?.id
  ) ?? false;

  const { confirm, showAlert } = useDialog();
  const isOwner = currentUser?.role === UserRole.TENANT_OWNER;
  const isAdmin = currentUser?.role === UserRole.TENANT_ADMIN;
  const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
    { value: UserRole.USER, label: t('users.roleOptions.user') },
    { value: UserRole.EDITOR, label: t('users.roleOptions.editor') },
    { value: UserRole.TENANT_ADMIN, label: t('users.roleOptions.admin') },
    { value: UserRole.TENANT_OWNER, label: t('users.roleOptions.owner') },
  ];
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: UserRole.USER as UserRole, priority: UserPriority.LOW as UserPriority });
  const [emailError, setEmailError] = useState('');
  const [accessModalUser, setAccessModalUser] = useState<TenantUser | null>(null);
  const [confirmPriority, setConfirmPriority] = useState<{ user: TenantUser; newPriority: UserPriority } | null>(null);
  const [updatingPriority, setUpdatingPriority] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return;
    if (!isValidEmail(form.email)) {
      setEmailError(t('users.validateEmail'));
      return;
    }
    setCreating(true);
    try {
      await api.post('/tenant-users', form);
      await mutate();
      setShowCreate(false);
      setEmailError('');
      setForm({ name: '', email: '', password: '', role: UserRole.USER, priority: UserPriority.LOW });
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('users.failedCreate'), { variant: 'danger' });
    } finally {
      setCreating(false);
    }
  };

  const togglePriority = (user: TenantUser) => {
    const newPriority = user.priority === UserPriority.HIGH ? UserPriority.LOW : UserPriority.HIGH;
    setConfirmPriority({ user, newPriority });
  };

  const confirmPriorityAction = async () => {
    if (!confirmPriority) return;
    setUpdatingPriority(true);
    try {
      await api.patch(`/tenant-users/${confirmPriority.user.id}`, { priority: confirmPriority.newPriority });
      mutate();
      setConfirmPriority(null);
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('users.failedUpdate'), { variant: 'danger' });
    } finally {
      setUpdatingPriority(false);
    }
  };

  const toggleActive = async (user: TenantUser) => {
    try {
      await api.patch(`/tenant-users/${user.id}`, { isActive: !user.isActive });
      mutate();
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('users.failedUpdate'), { variant: 'danger' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!await confirm(t('users.deleteConfirm'), { variant: 'danger', title: t('common.delete') })) return;
    try {
      await api.delete(`/tenant-users/${id}`);
      mutate();
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('users.failedDelete'), { variant: 'danger' });
    }
  };

  // RBAC guard — the /admin/users UI is an admin-level control panel with
  // role-change and delete actions. While the `/tenant-users` API is
  // intentionally readable by editors (needed by KB User Access section),
  // the admin shell itself should only be visible to owners/admins.
  if (currentUser && currentUser.role !== UserRole.TENANT_OWNER
      && currentUser.role !== UserRole.TENANT_ADMIN
      && currentUser.role !== UserRole.PLATFORM_ADMIN) {
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
    <div className="flex flex-col h-full overflow-hidden bg-[#111315]">
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 backdrop-blur-xl bg-[#111315]/90">
          <div className="px-6 md:px-8 pt-8 pb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-100">{t('users.title')}</h1>
              <p className="text-[13px] text-slate-400 mt-0.5">{t('users.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              {canReviewRequests && pendingCount > 0 && (
                <button
                  onClick={() => setShowRequestsModal(true)}
                  className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[13px] font-medium transition-colors"
                  aria-label={t('users.pendingRequests.bellAria', { count: pendingCount, defaultValue: '{{count}} pending access requests' })}
                >
                  <Bell className="h-4 w-4" />
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-[10px] font-bold text-slate-900">
                    {pendingCount}
                  </span>
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                </button>
              )}
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#06d4ef] text-white text-[13px] font-semibold hover:bg-[#06d4ef]/90 transition-colors"
              >
                {showCreate ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {t('users.createUser')}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 pb-10 space-y-6">
          {/* Pending access requests banner */}
          {canReviewRequests && pendingCount > 0 && (
            <button
              onClick={() => setShowRequestsModal(true)}
              className="group w-full text-left rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] via-amber-500/[0.05] to-transparent hover:from-amber-500/[0.12] hover:via-amber-500/[0.07] transition-all p-4 flex items-center gap-4"
            >
              <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Bell className="h-[18px] w-[18px] text-amber-400" />
                </div>
                <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-[#111315] animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-amber-200">
                  {t('users.pendingRequests.bannerTitle', {
                    count: pendingCount,
                    defaultValue: '{{count}} pending access request',
                  })}
                </p>
                <p className="text-[12px] text-amber-200/70 mt-0.5">
                  {t('users.pendingRequests.bannerSubtitle', 'Review and approve people requesting to join your organization.')}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-amber-300 group-hover:text-amber-200">
                {t('users.pendingRequests.review', 'Review')}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </button>
          )}
          {/* Create User Panel */}
          {showCreate && (
            <div className="rounded-xl border border-slate-700 bg-[#1a1d21] p-5">
              <h3 className="text-[14px] font-semibold text-slate-100 mb-4">{t('users.createUser')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder={t('users.name')}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-[#111315] border border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#06d4ef]"
                />
                <div className="flex flex-col gap-1">
                  <input
                    placeholder={t('users.email')}
                    type="email"
                    value={form.email}
                    onChange={(e) => { setForm({ ...form, email: e.target.value }); setEmailError(''); }}
                    className={`bg-[#111315] border rounded-lg px-3.5 py-2.5 text-[13px] text-slate-200 placeholder:text-slate-500 outline-none transition-colors ${emailError ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-[#06d4ef]'}`}
                  />
                  {emailError && <p className="text-[11px] text-red-400 px-1">{emailError}</p>}
                </div>
                <input
                  placeholder={t('users.password')}
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="bg-[#111315] border border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-200 placeholder:text-slate-500 outline-none focus:border-[#06d4ef]"
                />
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="bg-[#111315] border border-slate-700 rounded-lg px-3.5 py-2.5 text-[13px] text-slate-200 outline-none focus:border-[#06d4ef]"
                >
                  {ROLE_OPTIONS.filter((r) => {
                    // Admins cannot create owners
                    if (isAdmin && r.value === UserRole.TENANT_OWNER) return false;
                    // Only one owner per tenant — disable if one already exists
                    if (r.value === UserRole.TENANT_OWNER && ownerExists) return false;
                    return true;
                  }).map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {isOwner && ownerExists && (
                  <p className="text-[11px] text-amber-400/80 flex items-center gap-1 col-span-full mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    {t('users.ownerOnlyOne')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 mt-4">
                {!isAdminRole(form.role) && !isEditorRole(form.role) && (
                  <label className="flex items-center gap-2 text-[13px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.priority === UserPriority.HIGH}
                      onChange={(e) => setForm({ ...form, priority: e.target.checked ? UserPriority.HIGH : UserPriority.LOW })}
                      className="accent-amber-500"
                    />
                    <Star className="h-3.5 w-3.5 text-amber-400" />
                    {t('users.highPriority')}
                  </label>
                )}
                {isEditorRole(form.role) && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400">
                    <Shield className="h-3.5 w-3.5" />
                    {t('users.editorsHaveFullAccess')}
                  </span>
                )}
                <div className="flex-1" />
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-[13px] text-slate-400 hover:text-slate-200">
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !form.name || !form.email || !form.password || !isValidEmail(form.email)}
                  className="px-5 py-2 rounded-lg bg-[#06d4ef] text-white text-[13px] font-semibold hover:bg-[#06d4ef]/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('common.create')}
                </button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="rounded-xl border border-slate-800 bg-[#1a1d21] overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-slate-200 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#06d4ef]" />
                {t('users.allUsers')}
              </h2>
              <span className="text-[12px] text-slate-500">{users?.length || 0} {t('users.usersCount')}</span>
            </div>

            {!users ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3">{t('users.user')}</th>
                      <th className="px-5 py-3">{t('users.role')}</th>
                      <th className="px-5 py-3">{t('users.priority')}</th>
                      <th className="px-5 py-3">{t('users.status')}</th>
                      <th className="px-5 py-3">{t('users.lastLogin')}</th>
                      <th className="px-5 py-3 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonUserRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-14 text-slate-500 text-[13px]">{t('users.noUsers')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3">{t('users.user')}</th>
                      <th className="px-5 py-3">{t('users.role')}</th>
                      <th className="px-5 py-3">{t('users.priority')}</th>
                      <th className="px-5 py-3">{t('users.status')}</th>
                      <th className="px-5 py-3">{t('users.lastLogin')}</th>
                      <th className="px-5 py-3 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((u) => {
                    const isRowOwner = u.role === UserRole.TENANT_OWNER;
                    return (
                      <tr key={u.id} className="hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => router.push(`/admin/users/${u.id}`)}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${
                              isRowOwner
                                ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                                : 'bg-gradient-to-br from-[#06d4ef] to-[#06d4ef]/50'
                            }`}>
                              {isRowOwner
                                ? <Crown className="h-4 w-4 text-white" />
                                : (u.name?.[0]?.toUpperCase() || '?')}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-[13px] font-medium text-slate-200">{u.name}</p>
                                {isRowOwner && (
                                  <span className="text-[9px] font-bold bg-purple-500/15 text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/20 uppercase tracking-wide">{t('users.ownerBadge')}</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${roleBadgeClass(u.role)}`}>
                            {t('superAdmin.roles.' + u.role)}
                          </span>
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          {isAdminRole(u.role) ? (
                            <span className="text-[12px] text-slate-600">—</span>
                          ) : isEditorRole(u.role) ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              <Shield className="h-3 w-3" />
                              {t('users.fullAccess')}
                            </span>
                          ) : (
                            <button
                              onClick={() => togglePriority(u)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer hover:opacity-80 transition-opacity ${priorityBadgeClass(u.priority)}`}
                            >
                              {u.priority === UserPriority.HIGH && <Star className="h-3 w-3" />}
                              {u.priority === UserPriority.HIGH ? t('users.highPriority') : t('users.lowPriority')}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleActive(u)}
                            className={`text-[12px] font-medium cursor-pointer hover:opacity-80 ${u.isActive ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            {u.isActive ? t('common.active') : t('common.inactive')}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-slate-500">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {!isAdminRole(u.role) && !isEditorRole(u.role) && u.priority === UserPriority.HIGH && (
                              <button
                                onClick={() => setAccessModalUser(u)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#06d4ef] bg-[#06d4ef]/10 hover:bg-[#06d4ef]/20 transition-colors"
                              >
                                {t('users.manageAccess')}
                              </button>
                            )}
                            {/* Owner cannot be deleted — protected role */}
                            {!isRowOwner && (
                              <button
                                onClick={() => handleDelete(u.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pending Requests Modal */}
      {showRequestsModal && (
        <PendingRequestsModal
          requests={pendingRequests || []}
          onClose={() => setShowRequestsModal(false)}
          onMutate={() => mutateRequests()}
          onUsersChanged={() => mutate()}
        />
      )}

      {/* Dataset Access Modal */}
      {accessModalUser && (
        <DatasetAccessModal
          user={accessModalUser}
          onClose={() => setAccessModalUser(null)}
        />
      )}

      {/* Priority Change Confirmation Modal */}
      {confirmPriority && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#16191e] border border-slate-700/60 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3 mb-4">
              <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                confirmPriority.newPriority === UserPriority.HIGH
                  ? 'bg-amber-500/15 border border-amber-500/30'
                  : 'bg-slate-700/60 border border-slate-600/40'
              }`}>
                <Star className={`h-4 w-4 ${confirmPriority.newPriority === UserPriority.HIGH ? 'text-amber-400' : 'text-slate-400'}`} />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-slate-100">
                  {t('users.confirmPriorityTitle', 'Change Priority')}
                </h3>
                <p className="text-[13px] text-slate-400 mt-1">
                  {confirmPriority.newPriority === UserPriority.HIGH
                    ? t('users.setHighPriorityConfirm', { name: confirmPriority.user.name })
                    : t('users.setLowPriorityConfirm', { name: confirmPriority.user.name })
                  }
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5 border-t border-slate-800 pt-4">
              <button
                onClick={() => setConfirmPriority(null)}
                disabled={updatingPriority}
                className="flex-1 px-4 py-2 rounded-lg text-[13px] font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={confirmPriorityAction}
                disabled={updatingPriority}
                className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-2 ${
                  confirmPriority.newPriority === UserPriority.HIGH
                    ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600'
                }`}
              >
                {updatingPriority
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Check className="h-3.5 w-3.5" />
                }
                {t('common.confirm', 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
