'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDialog } from '@/components/ui/app-dialog';
import Link from 'next/link';
import useSWR from 'swr';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/use-auth-store';
import { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft, Building2, Crown, Users, CalendarDays, Shield, Search, X,
    Loader2, Globe, Edit2, Check, AlertTriangle, User, Clock,
    MoreVertical, Mail, Activity, Trash2, ExternalLink, ShieldAlert,
    CheckCircle2, Save,
} from 'lucide-react';
import api from '@/lib/api';
import { AuthedImage } from '@/components/ui/authed-image';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

function formatDate(d: string | null | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatRelative(d: string | null | undefined, t: (key: string, opts?: any) => string): string {
    if (!d) return t('superAdmin.never');
    const now = Date.now();
    const then = new Date(d).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('superAdmin.justNow');
    if (mins < 60) return t('superAdmin.minutesAgo', { mins });
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return t('superAdmin.hoursAgo', { hrs });
    const days = Math.floor(hrs / 24);
    if (days < 7) return t('superAdmin.daysAgo', { days });
    return formatDate(d);
}

export default function OrganizationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { confirm: confirmDialog, showAlert } = useDialog();
    const { user, logoVersion } = useAuthStore();
    const { t } = useTranslation();
    const orgId = params?.id as string;

    const { data: tenants = [], mutate: mutateTenants } = useSWR(
        user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/tenants' : null,
        fetcher, { refreshInterval: 10000 }
    );
    const { data: allUsers = [], mutate: mutateUsers } = useSWR(
        user?.role === UserRole.PLATFORM_ADMIN ? '/super-admin/users' : null,
        fetcher, { refreshInterval: 10000 }
    );

    const tenant = useMemo(
        () => (tenants as any[]).find((t: any) => t.id === orgId),
        [tenants, orgId]
    );

    const orgUsers = useMemo(() => {
        return (allUsers as any[]).filter((u: any) => u.tenantId === orgId);
    }, [allUsers, orgId]);

    const adminsCount = orgUsers.filter((u: any) => u.role === UserRole.TENANT_OWNER || u.role === UserRole.TENANT_ADMIN).length;
    const membersCount = orgUsers.length - adminsCount;

    const [search, setSearch] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', slug: '' });
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const filteredMembers = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return orgUsers;
        return orgUsers.filter(
            (u: any) =>
                u.name?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q)
        );
    }, [orgUsers, search]);

    if (user?.role !== UserRole.PLATFORM_ADMIN) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center p-8 text-center">
                <ShieldAlert className="h-12 w-12 text-red-500 mb-4 opacity-80" />
                <h2 className="text-xl font-semibold text-slate-100">{t('superAdmin.accessRestricted')}</h2>
                <p className="text-slate-500 mt-2 text-sm">{t('superAdmin.viewNotPermitted')}</p>
            </div>
        );
    }

    const isLoading = !tenants.length && !tenant;

    if (isLoading) {
        return (
            <div className="flex h-screen bg-[#0a0e1a] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
        );
    }

    if (!tenant && tenants.length > 0) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center p-8 text-center bg-[#0a0e1a]">
                <Building2 className="h-12 w-12 text-slate-600 mb-4" />
                <h2 className="text-xl font-semibold text-slate-100">{t('superAdmin.orgNotFound')}</h2>
                <p className="text-slate-500 mt-2 text-sm">{t('superAdmin.orgNotFoundDesc')}</p>
                <Link href="/super-admin/tenants" className="mt-6 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium">
                    <ArrowLeft className="h-4 w-4" /> {t('superAdmin.backToTenants')}
                </Link>
            </div>
        );
    }

    // ── Handlers ─────────────────────────────────────────
    const startEdit = () => {
        setEditForm({ name: tenant?.name || '', slug: tenant?.slug || '' });
        setEditMode(true);
        setSaveSuccess(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch(`/super-admin/tenants/${orgId}`, editForm);
            await mutateTenants();
            setEditMode(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            showAlert(err?.response?.data?.message || err.message, { variant: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/super-admin/tenants/${orgId}`);
            router.push('/super-admin/tenants');
        } catch (err: any) {
            showAlert(err?.response?.data?.message || err.message, { variant: 'danger' });
            setDeleting(false);
            setDeleteConfirm(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: UserRole) => {
        try {
            await api.patch(`/super-admin/users/${userId}/role`, { role: newRole });
            await mutateUsers();
        } catch (err: any) {
            showAlert(err?.response?.data?.message || err.message, { variant: 'danger' });
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!await confirmDialog(t('superAdmin.deleteUserConfirm'), { variant: 'danger', title: t('superAdmin.deleteUserTitle') })) return;
        try {
            await api.delete(`/super-admin/users/${userId}`);
            await mutateUsers();
        } catch (err: any) {
            showAlert(err?.response?.data?.message || err.message, { variant: 'danger' });
        }
    };

    const hasLogo = tenant?.settings?.branding?.logoUrl;
    const initials = tenant?.name
        ?.split(' ')
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';

    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#0a0e1a] text-slate-100">
            <div className="flex-1 overflow-y-auto w-full pb-10">
                {/* ── Top bar ─────────────────────────────────────── */}
                <div className="sticky top-0 z-20 backdrop-blur-xl bg-[#0a0e1a]/90 border-b border-[#1e293b]">
                    <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link
                                href="/super-admin/tenants"
                                className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200"
                            >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <div className="h-4 w-px bg-[#1e293b]" />
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                                <Shield className="h-3.5 w-3.5 text-white" />
                            </div>
                            <span className="text-sm text-slate-400">{t('superAdmin.adminConsole')}</span>
                            <span className="text-slate-600">/</span>
                            <span className="text-sm font-semibold text-slate-100 truncate max-w-[200px]">
                                {tenant?.name || 'Organization'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {saveSuccess && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 animate-in fade-in">
                                <CheckCircle2 className="h-3 w-3" /> {t('superAdmin.savedBadge')}
                            </div>
                        )}
                        {!editMode ? (
                            <Button
                                size="sm"
                                onClick={startEdit}
                                className="h-8 text-xs px-3 bg-transparent border border-[#1e293b] hover:bg-white/5 text-slate-300"
                            >
                                <Edit2 className="h-3 w-3 mr-1.5" /> {t('superAdmin.editInfo')}
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                onClick={() => setEditMode(false)}
                                className="h-8 text-xs px-3 bg-transparent border border-[#1e293b] hover:bg-white/5 text-slate-400"
                            >
                                <X className="h-3 w-3 mr-1" /> {t('common.cancel')}
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={() => setDeleteConfirm(true)}
                            className="h-8 text-xs px-3 bg-transparent border border-red-500/20 hover:bg-red-500/10 text-red-400"
                        >
                            <Trash2 className="h-3 w-3 mr-1.5" /> {t('superAdmin.deleteOrg')}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">

                {/* ── Hero card ────────────────────────────────── */}
                <div className="rounded-2xl overflow-hidden border border-[#1e293b] bg-[#111827]">
                    {/* Gradient banner */}
                    <div
                        className="h-24 w-full"
                        style={{
                            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 40%, #134e4a 100%)',
                        }}
                    />

                    <div className="px-8 pb-8">
                        {/* Avatar overlapping banner */}
                        <div className="-mt-10 mb-5 flex items-end gap-5">
                            <div className="h-20 w-20 rounded-2xl border-4 border-[#111827] overflow-hidden bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-xl">
                                {hasLogo ? (
                                    <AuthedImage
                                        src={`/tenant/logo/${tenant.id}?v=${logoVersion}`}
                                        alt={tenant.name}
                                        className="h-full w-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    initials
                                )}
                            </div>

                            {/* Stat chips */}
                            <div className="flex items-center gap-2 flex-wrap pb-1">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    <Crown className="h-3 w-3" />
                                    {adminsCount} {adminsCount !== 1 ? t('superAdmin.adminsLabel') : t('superAdmin.adminLabel')}
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/50">
                                    <Users className="h-3 w-3" />
                                    {membersCount} {membersCount !== 1 ? t('superAdmin.membersLabel') : t('superAdmin.memberLabel')}
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-slate-800/80 text-slate-400 border border-slate-700/50">
                                    <CalendarDays className="h-3 w-3" />
                                    {t('superAdmin.createdOn', { date: formatDate(tenant?.createdAt) })}
                                </div>
                            </div>
                        </div>

                        {/* Org info — view or edit */}
                        {!editMode ? (
                            <div>
                                <h1 className="text-2xl font-bold text-slate-100 mb-1">{tenant?.name}</h1>
                                <div className="flex items-center gap-2">
                                    <Globe className="h-3.5 w-3.5 text-slate-500" />
                                    <code className="text-sm font-mono text-slate-400">{tenant?.slug}</code>
                                    <span className="text-slate-700">·</span>
                                    <code className="text-[11px] font-mono text-slate-600 select-all">{tenant?.id}</code>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-4 max-w-md">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('superAdmin.orgName')}</Label>
                                    <Input
                                        required
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        placeholder="e.g. Acme Corporation"
                                        className="h-9 bg-[#1e293b] border-[#2d3748] text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t('superAdmin.urlSlug')}</Label>
                                    <Input
                                        required
                                        value={editForm.slug}
                                        onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                        placeholder="e.g. acme"
                                        className="h-9 bg-[#1e293b] border-[#2d3748] text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500/40"
                                    />
                                </div>
                                <div className="flex gap-2 pt-1">
                                    <Button
                                        type="submit"
                                        disabled={saving}
                                        className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm"
                                    >
                                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                                        {t('superAdmin.saveChanges')}
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setEditMode(false)}
                                        className="h-9 px-4 bg-transparent border border-[#2d3748] text-slate-400 hover:bg-white/5 text-sm"
                                    >
                                        {t('common.cancel')}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* ── Members table ────────────────────────────── */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                            {t('superAdmin.allMembers')}
                            <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono normal-case tracking-normal">
                                {orgUsers.length}
                            </span>
                        </h2>
                        {/* Search */}
                        <div className="relative w-52">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('superAdmin.searchMembersPlaceholder')}
                                className="w-full h-8 pl-8 pr-7 rounded-lg text-sm outline-none bg-[#111827] border border-[#1e293b] text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/40 transition-all"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                                    <X className="h-3.5 w-3.5 text-slate-500" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="rounded-xl border border-[#1e293b] bg-[#111827] overflow-hidden">
                        {filteredMembers.length === 0 ? (
                            <div className="py-16 text-center">
                                <Users className="h-8 w-8 mx-auto mb-3 text-slate-700" />
                                <p className="text-sm text-slate-500">
                                    {search ? t('superAdmin.noMembersMatch') : t('superAdmin.noMembersYet')}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-[10px] text-slate-500 uppercase tracking-wider bg-[#0d1117] border-b border-[#1e293b]">
                                            <th className="px-5 py-3 text-left font-semibold">{t('superAdmin.memberCol')}</th>
                                            <th className="px-5 py-3 text-left font-semibold">{t('superAdmin.email')}</th>
                                            <th className="px-5 py-3 text-left font-semibold">{t('superAdmin.roleCol')}</th>
                                            <th className="px-5 py-3 text-left font-semibold">{t('superAdmin.joinedCol')}</th>
                                            <th className="px-5 py-3 text-left font-semibold">{t('superAdmin.lastSeenCol')}</th>
                                            <th className="px-5 py-3 text-right font-semibold">{t('common.actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#1e293b]/60">
                                        {filteredMembers.map((u: any) => {
                                            const isOnline = u.lastLoginAt && (Date.now() - new Date(u.lastLoginAt).getTime()) < 86400000;
                                            return (
                                                <tr key={u.id} className="hover:bg-white/[0.015] transition-colors">
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white border border-slate-700`}
                                                                style={{
                                                                    background: '#0d121c',
                                                                    color: '#06b6d4',
                                                                    borderColor: 'rgba(6, 182, 212, 0.2)'
                                                                }}
                                                            >
                                                                {u.name?.[0]?.toUpperCase() || '?'}
                                                            </div>
                                                            <span className="text-[13px] font-medium text-slate-200 truncate">{u.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-[12px] text-slate-400">{u.email}</td>
                                                    <td className="px-5 py-3">
                                                        <select
                                                            value={u.role}
                                                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                                                            className="bg-transparent text-[10px] uppercase font-bold outline-none cursor-pointer border border-transparent hover:border-[#2d3748] rounded px-1 -ml-1 py-0.5 transition-colors max-w-[120px]"
                                                            style={{
                                                                color: u.role === UserRole.TENANT_OWNER ? '#0ea5e9' : (u.role === UserRole.TENANT_ADMIN ? '#8b5cf6' : (u.role === UserRole.EDITOR ? '#f59e0b' : '#64748b'))
                                                            }}
                                                        >
                                                            <option className="text-slate-900" value={UserRole.TENANT_OWNER}>TENANT OWNER</option>
                                                            <option className="text-slate-900" value={UserRole.TENANT_ADMIN}>TENANT ADMIN</option>
                                                            <option className="text-slate-900" value={UserRole.EDITOR}>EDITOR</option>
                                                            <option className="text-slate-900" value={UserRole.USER}>USER</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-5 py-3 text-[12px] text-slate-500">{formatDate(u.createdAt)}</td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                                            <span className="text-[12px] text-slate-500">{formatRelative(u.lastLoginAt, t)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <button 
                                                            onClick={() => handleDeleteUser(u.id)}
                                                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
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

                {/* ── Danger zone ──────────────────────────────── */}
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-red-400">{t('superAdmin.dangerZone')}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {t('superAdmin.dangerZoneDesc')}
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setDeleteConfirm(true)}
                            className="h-8 text-xs px-3 bg-transparent border border-red-500/30 hover:bg-red-500/10 text-red-400 shrink-0"
                        >
                            <Trash2 className="h-3 w-3 mr-1.5" /> {t('superAdmin.deleteOrganization')}
                        </Button>
                    </div>
                </div>

            </div>
          </div>

            {/* ── Delete confirmation modal ─────────────────── */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => !deleting && setDeleteConfirm(false)}
                    />
                    <div className="relative w-full max-w-sm rounded-2xl border border-[#1e293b] bg-[#111827] p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-slate-100">{t('superAdmin.deleteOrganization')}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{t('superAdmin.deleteOrgModalDesc')}</p>
                            </div>
                        </div>
                        <p className="text-sm text-slate-400 mb-6">
                            {t('superAdmin.deleteOrgConfirm', { name: tenant?.name })}
                        </p>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 h-9 bg-red-600 hover:bg-red-700 text-white text-sm"
                            >
                                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                                {deleting ? t('superAdmin.deletingEllipsis') : t('superAdmin.yesDelete')}
                            </Button>
                            <Button
                                onClick={() => setDeleteConfirm(false)}
                                disabled={deleting}
                                className="flex-1 h-9 bg-transparent border border-[#2d3748] text-slate-300 hover:bg-white/5 text-sm"
                            >
                                {t('common.cancel')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
