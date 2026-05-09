'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sidebar } from '@/components/layout/sidebar';
import { useAuthStore } from '@/store/use-auth-store';
import { useSidebarStore } from '@/store/use-sidebar-store';
import { UserRole } from '@/types';
import { RouteGuard } from '@/components/auth/route-guard';
import {
  Loader2, PanelLeft, Menu,
  LayoutDashboard, Bot, MessageSquare, MessageCircle, Database,
  FlaskConical, BarChart3, TrendingUp, Users, Settings,
  Building2, LogOut, Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { AppDialogProvider } from '@/components/ui/app-dialog';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { VerseLogoBoxed } from '@/components/brand/verse-logo';
import { LogoutDialog } from '@/components/auth/logout-dialog';
import useSWR from 'swr';
import api from '@/lib/api';

// ── Icon nav item ────────────────────────────────────────────────────────
function NavIcon({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={label}
      className={cn(
        'p-2.5 rounded-xl transition-colors',
        active
          ? 'bg-[#06d4ef]/15 text-[#06d4ef]'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-200'
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user, logout } = useAuthStore();
  const { isCollapsed, toggle } = useSidebarStore();
  const router = useRouter();
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { t } = useTranslation();

  // Tenant name for the mobile top bar (mirrors what the sidebar shows).
  // Fetched lightly via SWR; the sidebar itself does the same fetch so this
  // shares cache.
  const { data: tenantInfo } = useSWR<{ name: string }>(
    isAuthenticated && user?.role !== UserRole.PLATFORM_ADMIN ? '/tenant/info' : null,
    (url: string) => api.get(url).then((r: any) => r.data),
  );

  // Close the mobile drawer whenever the route changes — clicking a nav link
  // shouldn't leave the drawer open over the destination page.
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const isTenantAdmin =
    user?.role === UserRole.TENANT_ADMIN || user?.role === UserRole.TENANT_OWNER;
  const isSuperAdmin = user?.role === UserRole.PLATFORM_ADMIN;
  const isEditor = user?.role === UserRole.EDITOR;

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Delay enabling the sidebar transition until after the first paint,
  // so Zustand's persist rehydration doesn't trigger the slide animation.
  useEffect(() => {
    if (!isClient) return;
    const id = requestAnimationFrame(() => setSidebarReady(true));
    return () => cancelAnimationFrame(id);
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    const token = localStorage.getItem('accessToken');
    if (!token && !isAuthenticated && !isLoading) {
      router.push('/login');
    }
  }, [isClient, isLoading, isAuthenticated, router]);

  const handleLogoutConfirm = () => {
    logout();
    router.push('/login');
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#0d0f12]">
        {/* Placeholder for Expanded Sidebar */}
        <div className="hidden md:flex w-[280px] shrink-0 border-r border-slate-200 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-950/60 flex-col">
          {/* Header Skeleton */}
          <div className="flex h-14 items-center justify-between border-b border-slate-200/60 dark:border-slate-800 px-4 shrink-0">
            <div className="flex items-center gap-2 w-full">
               <div className="skeleton rounded-lg h-8 w-8 shrink-0" />
               <div className="skeleton rounded-md h-5 w-[140px]" />
            </div>
            <div className="skeleton rounded-lg h-7 w-7 shrink-0 ml-auto" />
          </div>

          {/* Menu Items Skeleton based on role */}
          <div className="flex-1 p-3 flex flex-col gap-1.5 mt-2">
            {!user || user?.role === UserRole.TENANT_ADMIN || user?.role === UserRole.TENANT_OWNER ? (
              [...Array(12)].map((_, i) => (
                <div key={i} className="skeleton h-9 w-full rounded-lg opacity-40" style={{ animationDelay: `${i * 50}ms` }} />
              ))
            ) : user?.role === UserRole.USER ? (
              <>
                <div className="px-3 pt-3 pb-1 space-y-2 w-full">
                  {/* New Chat Button */}
                  <div className="h-9 w-full rounded-lg bg-[#06d4ef]/20 animate-pulse" />
                  {/* Search Bar */}
                  <div className="h-[34px] w-full rounded-lg bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
                </div>
                <div className="px-5 pt-3 pb-1">
                  {/* Recent Chats Label */}
                  <div className="h-3 w-20 rounded bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
                </div>
                <div className="px-2 pt-1 flex flex-col gap-0.5">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex items-center w-full rounded-lg px-2.5 py-2.5">
                      <div className="skeleton rounded h-3.5 w-[75%] opacity-30" style={{ animationDelay: `${i * 50}ms` }} />
                    </div>
                  ))}
                </div>
              </>
            ) : (
              [...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-9 w-full rounded-lg opacity-40" style={{ animationDelay: `${i * 50}ms` }} />
              ))
            )}
          </div>
        </div>
        {/* Placeholder for Main Content */}
        <div className="flex-1 overflow-hidden bg-slate-50 dark:bg-[#111315] p-6 md:p-8">
           <div className="skeleton" style={{ height: 28, width: '25%', marginBottom: 8 }} />
           <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 32 }} />
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
             <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
             <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
             <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
           </div>
           
           <div className="skeleton" style={{ height: 300, borderRadius: 12 }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <AppDialogProvider>
    <div className="flex h-screen overflow-hidden">
      {/* ── Logout Confirmation Dialog ──────────────────────────── */}
      <LogoutDialog
        open={showLogoutDialog}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutDialog(false)}
      />

      {/* ── Expanded Sidebar ───────────────────────────────────── */}
      <div className={cn(
        "hidden md:flex shrink-0 overflow-hidden",
        sidebarReady && "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-0" : "w-[280px]"
      )}>
        <div className={cn(
          sidebarReady && "transition-all duration-300 ease-in-out",
          isCollapsed ? "w-0 opacity-0" : "w-[280px] opacity-100"
        )}>
          <Sidebar />
        </div>
      </div>

      {/* ── Collapsed Icon Strip ────────────────────────────────── */}
      {isCollapsed && (
        <div className="hidden md:flex w-[52px] flex-col items-center py-3 border-r border-slate-800 bg-[#0d0f12] shrink-0">
          {/* Expand toggle */}
          <button
            onClick={toggle}
            title={t('common.openSidebar')}
            className="p-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer mb-2"
          >
            <PanelLeft className="h-[18px] w-[18px]" />
          </button>

          {/* ── Tenant Admin nav icons ── */}
          {isTenantAdmin && (
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <NavIcon href="/admin/dashboard" icon={LayoutDashboard} label={t('sidebar.dashboard')} active={pathname === '/admin/dashboard'} />
              <NavIcon href="/assistants" icon={Bot} label={t('sidebar.assistants')} active={pathname === '/assistants'} />
              <NavIcon href="/admin/conversations" icon={MessageSquare} label={t('sidebar.conversations')} active={pathname === '/admin/conversations'} />
              <NavIcon href="/chat" icon={MessageCircle} label={t('sidebar.chat')} active={pathname === '/chat'} />
              <NavIcon href="/knowledge" icon={Database} label={t('sidebar.knowledgeBase')} active={pathname === '/knowledge'} />
              <NavIcon href="/admin/playground" icon={FlaskConical} label={t('sidebar.playground')} active={pathname === '/admin/playground'} />
              {/* API Keys and Integrations hidden — not yet implemented */}
              <NavIcon href="/admin/billing" icon={BarChart3} label={t('sidebar.billing')} active={pathname === '/admin/billing'} />
              <NavIcon href="/admin/analytics" icon={TrendingUp} label={t('sidebar.analytics')} active={pathname === '/admin/analytics'} />
              <NavIcon href="/admin/users" icon={Users} label={t('sidebar.users')} active={pathname === '/admin/users'} />
              <NavIcon href="/settings" icon={Settings} label={t('sidebar.settings')} active={pathname === '/settings'} />
            </div>
          )}

          {/* ── Platform Admin nav icons ── */}
          {isSuperAdmin && (
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <NavIcon href="/super-admin" icon={LayoutDashboard} label={t('sidebar.panel')} active={pathname === '/super-admin'} />
              <NavIcon href="/super-admin/tenants" icon={Building2} label={t('sidebar.tenants')} active={pathname === '/super-admin/tenants'} />
              <NavIcon href="/super-admin/plans" icon={Crown} label={t('sidebar.plansAndPricing')} active={pathname === '/super-admin/plans'} />
              <NavIcon href="/super-admin/users" icon={Users} label={t('sidebar.users')} active={pathname === '/super-admin/users'} />
              <NavIcon href="/super-admin/assistants" icon={Bot} label={t('sidebar.assistants')} active={pathname === '/super-admin/assistants'} />
              <NavIcon href="/super-admin/databases" icon={Database} label={t('sidebar.databases')} active={pathname === '/super-admin/databases'} />
              <NavIcon href="/settings" icon={Settings} label={t('sidebar.settings')} active={pathname === '/settings'} />
            </div>
          )}

          {/* ── Editor nav icons ── */}
          {/* Editors and regular users don't manage assistants — the page is
              admin-only. Removed the Bot icon from both strips so non-admins
              can't navigate there from the collapsed sidebar. */}
          {isEditor && (
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <NavIcon href="/knowledge" icon={Database} label={t('sidebar.knowledgeBase')} active={pathname === '/knowledge'} />
              <NavIcon href="/chat" icon={MessageCircle} label={t('sidebar.chat')} active={pathname === '/chat'} />
              <NavIcon href="/admin/playground" icon={FlaskConical} label={t('sidebar.playground')} active={pathname === '/admin/playground'} />
            </div>
          )}

          {/* ── Regular user nav icons ── */}
          {!isTenantAdmin && !isSuperAdmin && !isEditor && (
            <div className="flex flex-col items-center gap-0.5 flex-1">
              <NavIcon href="/chat" icon={MessageCircle} label={t('sidebar.newChat')} active={pathname === '/chat'} />
              <NavIcon href="/settings" icon={Settings} label={t('sidebar.settings')} active={pathname === '/settings'} />
            </div>
          )}

          {/* ── Logout at bottom ── */}
          <button
            title={t('layout.logoutButton')}
            onClick={() => setShowLogoutDialog(true)}
            className="p-2.5 rounded-xl text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors cursor-pointer mt-auto"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      )}

      {/* ── Mobile Drawer — only renders on small screens ─────────
           Holds the same <Sidebar /> the desktop view does. Auto-closes on
           pathname change (see useEffect above). The desktop sidebars are
           still rendered (md:flex) so larger screens are unaffected. */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="p-0 w-[280px] sm:max-w-[280px] bg-slate-50 dark:bg-[#0d0f12] border-r border-slate-200 dark:border-slate-800/60"
        >
          <SheetTitle className="sr-only">{t('sidebar.dashboard')}</SheetTitle>
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* ── Main column (mobile top bar + page content) ─────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile-only top bar — hidden on md+ where the persistent
            sidebar provides navigation. */}
        <header className="md:hidden flex items-center justify-between h-14 px-3 border-b border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-[#0d0f12]/95 backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label={t('common.openNavigation')}
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href={user ? '/' : '/login'} className="flex items-center gap-2 min-w-0">
            <VerseLogoBoxed className="h-7 w-7" iconClassName="w-4 h-4" />
            <span className="font-semibold text-[14px] tracking-tight text-slate-800 dark:text-slate-100 truncate max-w-[180px]">
              {isSuperAdmin ? t('common.verseAi') : (tenantInfo?.name || t('common.verseAi'))}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setShowLogoutDialog(true)}
            aria-label={t('layout.logoutButton')}
            className="h-10 w-10 inline-flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-red-400 transition-colors active:scale-95"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {/* ── Main Content ───────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white dark:bg-gray-950">
          <RouteGuard>{children}</RouteGuard>
        </main>
      </div>
    </div>
    </AppDialogProvider>
  );
}
