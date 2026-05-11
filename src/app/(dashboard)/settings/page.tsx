'use client';

import { useState, useRef } from 'react';
import useSWR from 'swr';
import { useAuthStore } from '@/store/use-auth-store';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useDialog } from '@/components/ui/app-dialog';
import api from '@/lib/api';
import { useAuthedImage } from '@/components/ui/authed-image';
import { UserRole, TenantInfo } from '@/types';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { LogoutDialog } from '@/components/auth/logout-dialog';
import {
  LogOut, Building2, Upload, Loader2, Camera, CheckCircle2, Globe, Trash2,
} from 'lucide-react';
import { SkeletonSettingsOrgSection } from '@/components/ui/skeleton-loaders';

const fetcher = (url: string) => api.get(url).then((r: any) => r.data);

export default function SettingsPage() {
  const { user, logout, logoVersion, bumpLogoVersion, bumpAvatarVersion } = useAuthStore();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoDeleting, setPhotoDeleting] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();
  const { confirm, showAlert } = useDialog();

  const isAdmin =
    user?.role === UserRole.TENANT_OWNER ||
    user?.role === UserRole.TENANT_ADMIN ||
    user?.role === UserRole.PLATFORM_ADMIN;

  const { data: tenantInfo, mutate: mutateTenant, isLoading: tenantLoading } = useSWR<TenantInfo>(
    user ? '/tenant/info' : null,
    fetcher,
  );

  const handleLogout = () => setShowLogoutDialog(true);

  const handleLogoutConfirm = () => {
    setShowLogoutDialog(false);
    logout();
    router.push('/login');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadSuccess(false);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      await api.post('/tenant/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      bumpLogoVersion();
      mutateTenant();
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('settings.uploadLogoFailed'), { variant: 'danger' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await api.post('/tenant/profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      bumpAvatarVersion();
      if (user) {
        useAuthStore.setState({
          user: { ...user, profilePhotoUrl: 'updated' },
        });
      }
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('settings.uploadPhotoFailed'), { variant: 'danger' });
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const handlePhotoDelete = async () => {
    if (!await confirm(t('settings.deletePhotoConfirm'), { variant: 'danger', title: t('settings.deletePhotoTitle') })) return;
    setPhotoDeleting(true);
    try {
      await api.delete('/tenant/profile-photo');
      bumpAvatarVersion();
      if (user) {
        useAuthStore.setState({
          user: { ...user, profilePhotoUrl: null },
        });
      }
    } catch (err: any) {
      showAlert(err.response?.data?.message || t('settings.deletePhotoFailed'), { variant: 'danger' });
    } finally {
      setPhotoDeleting(false);
    }
  };

  const logoSrc = useAuthedImage(
    tenantInfo?.logoUrl ? `/tenant/logo/${tenantInfo.id}?v=${logoVersion}` : null,
  );

  const { avatarVersion } = useAuthStore();
  const profilePhotoSrc = useAuthedImage(
    user?.profilePhotoUrl ? `/tenant/profile-photo/${user.id}?v=${avatarVersion}` : null,
  );

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';

  const roleBadge = (role: string) => {
    const label = t('superAdmin.roles.' + role);
    return (
      <span className="px-2.5 py-1 rounded-full bg-[#06d4ef]/10 text-[#06d4ef] text-[11px] font-semibold tracking-wide border border-[#06d4ef]/20">
        {label}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#111315]">
      <LogoutDialog
        open={showLogoutDialog}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutDialog(false)}
      />
      {/* Sticky header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/90 dark:bg-[#111315]/90 border-b border-slate-200 dark:border-slate-800/50">
        <div className="max-w-3xl mx-auto px-6 md:px-10 pt-8 pb-5">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('settings.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('settings.subtitle')}</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 md:px-10 py-8 space-y-6">

          {/* ── Profile ── */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#16191e] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/60">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-500">
                {t('settings.profile')}
              </p>
            </div>

            {/* Avatar hero row */}
            <div className="px-6 py-6 flex items-center gap-5 border-b border-slate-200 dark:border-slate-800/40">
              <div className="relative group shrink-0">
                <div className="h-16 w-16 rounded-full overflow-hidden ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-[#06d4ef]/40 transition-all">
                  {profilePhotoSrc ? (
                    <img src={profilePhotoSrc} alt={t('settings.profileAlt')} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#06d4ef] to-[#6366f1] flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{initials}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                >
                  {photoUploading
                    ? <Loader2 className="h-4 w-4 animate-spin text-white" />
                    : <Camera className="h-4 w-4 text-white" />}
                </button>
                <input
                  type="file"
                  ref={photoInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{user?.name || '-'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email || '-'}</p>
              </div>

              {profilePhotoSrc && (
                <button
                  onClick={handlePhotoDelete}
                  disabled={photoDeleting}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                  title={t('settings.removePhoto')}
                >
                  {photoDeleting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* Info rows */}
            <div className="divide-y divide-slate-200 dark:divide-slate-800/50">
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {t('settings.role')}
                </span>
                {user?.role ? roleBadge(user.role) : <span className="text-sm text-slate-400">-</span>}
              </div>
              <div className="flex items-center justify-between px-6 py-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {t('settings.organization')}
                </span>
                <div className="flex items-center gap-2.5">
                  {logoSrc && (
                    <img src={logoSrc} alt={t('settings.orgLogoAlt')} className="h-5 w-5 rounded object-cover" />
                  )}
                  <span className="text-sm text-slate-700 dark:text-slate-200">{tenantInfo?.name || '-'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Organization (admin only) ── */}
          {isAdmin && tenantLoading && <SkeletonSettingsOrgSection />}
          {isAdmin && !tenantLoading && (
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#16191e] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/60">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  {t('settings.organizationManage')}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {t('settings.organizationDesc')}
                </p>
              </div>
              <div className="px-6 py-6">
                <div className="flex items-start gap-6">
                  {/* Logo preview */}
                  <div className="relative group shrink-0">
                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 group-hover:border-[#06d4ef]/50 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#111315] transition-all">
                      {logoSrc ? (
                        <img src={logoSrc} alt={t('settings.orgLogoAlt')} className="h-full w-full object-cover rounded-xl" />
                      ) : (
                        <Building2 className="h-9 w-9 text-slate-400 dark:text-slate-600" />
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer"
                    >
                      <Camera className="h-5 w-5 text-white" />
                    </button>
                  </div>

                  {/* Upload info */}
                  <div className="flex-1 space-y-3 pt-1">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{tenantInfo?.name || t('settings.yourOrganization')}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t('settings.logoFormatsHint')}</p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all bg-[#06d4ef]/10 border border-[#06d4ef]/30 text-[#06d4ef] hover:bg-[#06d4ef]/20 disabled:opacity-40"
                      >
                        {uploading
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Upload className="h-3.5 w-3.5" />}
                        {uploading ? t('settings.uploading') : t('settings.uploadLogo')}
                      </button>
                      {uploadSuccess && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t('settings.saved')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ── Appearance ── */}
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#16191e] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800/60">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                {t('settings.appearance')}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {t('settings.appearanceDesc')}
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Globe className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('settings.language')}</p>
                    <p className="text-xs text-slate-500">{t('settings.languageDisplayDesc')}</p>
                  </div>
                </div>
                <LanguageSwitcher />
              </div>
            </div>
          </section>

          {/* ── Danger Zone ── */}
          <section className="rounded-2xl border border-red-500/20 dark:border-red-900/30 bg-red-50/50 dark:bg-[#16191e] overflow-hidden">
            <div className="px-6 py-4 border-b border-red-500/10 dark:border-red-900/20">
              <p className="text-xs font-semibold uppercase tracking-widest text-red-600 dark:text-red-500">
                {t('settings.dangerZone')}
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t('settings.signOut')}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-500 mt-0.5">{t('settings.signOutDesc')}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {t('settings.signOutButton')}
                </button>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
