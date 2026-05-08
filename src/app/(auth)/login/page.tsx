'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Eye, EyeOff, Zap, ShieldCheck, MessagesSquare, ArrowRight, Lock } from 'lucide-react';
import { VerseBrand } from '@/components/brand/verse-logo';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/store/use-auth-store';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Demo accounts configuration — role labels resolved via t() inside the component
const DEMO_ACCOUNTS_BASE = [
  { roleKey: 'platform_admin', email: 'platform@verse.ai', color: '#00E5CC', icon: '🌐' },
  { roleKey: 'tenant_owner', email: 'carlos@acme.com', color: '#4ADE80', icon: '👤' },
  { roleKey: 'tenant_admin', email: 'admin@acme.com', color: '#FACC15', icon: '🔒' },
  { roleKey: 'editor', email: 'maria@acme.com', color: '#FB923C', icon: '✏️' },
  { roleKey: 'user', email: 'joao@acme.com', color: '#A78BFA', icon: '👤' },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const authError = useAuthStore((state) => state.error);
  const setError = useAuthStore((state) => state.setError);
  const { t } = useTranslation();

  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onLogin(values: z.infer<typeof loginSchema>) {
    try {
      setError(null);
      await login(values);
      const loggedInUser = useAuthStore.getState().user;
      if (loggedInUser?.role === 'platform_admin') {
        router.push('/super-admin');
      } else if (loggedInUser?.role === 'tenant_admin' || loggedInUser?.role === 'tenant_owner') {
        router.push('/admin/dashboard');
      } else {
        router.push('/chat');
      }
    } catch { }
  }

  function fillDemoCredentials(email: string) {
    form.setValue('email', email);
    form.setValue('password', 'password123');
    setError(null);
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row">
      {/* ─── Left Panel: Full-bleed image with text overlay ──── */}
      <div className="hidden lg:flex lg:w-[54%] relative overflow-hidden">
        {/* Background image */}
        <img
          src="/knowledge-hero.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark overlay gradients — professional fade between panels */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-[#030712]" />
        {/* Extra right-edge fade for seamless blend into the form panel */}
        <div className="absolute top-0 bottom-0 right-0 w-[30%] bg-gradient-to-r from-transparent to-[#030712]" />

        {/* Content layer */}
        <div className="relative z-10 flex flex-col justify-between w-full h-full p-10 lg:p-12">
          {/* Top: Logo */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <VerseBrand textClassName="text-white" />
          </Link>

          {/* Middle: Hero text */}
          <div className="space-y-5 max-w-[480px]">
            <h1 className="text-[2.8rem] font-bold leading-[1.1] tracking-tight text-white drop-shadow-lg">
              {t('login.heroTitle')}
            </h1>
            <p className="text-[15px] text-white/70 leading-relaxed max-w-[400px]">
              {t('login.heroDesc')}
            </p>
          </div>

          {/* Bottom: Feature pills + social proof */}
          <div className="space-y-6">
            {/* Feature pills */}
            <div className="flex flex-wrap gap-2.5">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] text-[13px] text-white/80">
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
                {t('login.instantAnswers')}
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] text-[13px] text-white/80">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                {t('login.tenantIsolation')}
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/[0.1] text-[13px] text-white/80">
                <MessagesSquare className="h-3.5 w-3.5 text-cyan-400" />
                {t('login.conversationalAI')}
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-white/[0.06] backdrop-blur-md rounded-2xl border border-white/[0.08] p-5">
              <p className="text-[13px] text-white/70 leading-relaxed italic">
                &ldquo;{t('login.testimonialQuote')}&rdquo;
              </p>
              <div className="flex items-center gap-3 mt-3.5">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-400/40 to-teal-400/40 flex items-center justify-center text-[10px] font-semibold text-white">
                  RC
                </div>
                <div>
                  <p className="text-[12px] font-medium text-white/80">{t('login.testimonialAuthor')}</p>
                  <p className="text-[11px] text-white/40">{t('login.testimonialRole')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Right Panel: Login Form ───────────────────────────── */}
      <div className="flex-1 flex flex-col bg-gray-950 text-white min-h-screen relative overflow-hidden">
        {/* Ambient glow decorations */}
        <div className="absolute top-[10%] right-[-5%] w-[300px] h-[300px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #22d3ee 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-[15%] left-[-8%] w-[250px] h-[250px] rounded-full opacity-[0.03]"
          style={{ background: 'radial-gradient(circle, #a78bfa 0%, transparent 70%)' }}
        />

        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 relative z-10">
          <div className="w-full max-w-[400px]">
            {/* Mobile-only logo */}
            <Link href="/" className="lg:hidden mb-6 inline-block hover:opacity-80 transition-opacity">
              <VerseBrand textClassName="text-white" />
            </Link>

            {/* Glassmorphic form card */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-7 sm:p-8 space-y-6 backdrop-blur-sm">
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">{t('login.title')}</h2>
                <p className="text-[13px] text-gray-500 mt-1.5">
                  {t('login.welcomeBack')}
                </p>
              </div>

              {/* Login Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-400 text-[13px] font-normal">{t('login.emailLabel')}</FormLabel>
                        <FormControl>
                          <Input
                            className="h-11 bg-white/[0.04] border-white/[0.08] rounded-[10px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-cyan-400/40 focus-visible:border-cyan-400/30 transition-all text-[14px]"
                            placeholder={t('login.emailPlaceholder')}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-gray-400 text-[13px] font-normal">{t('login.passwordLabel')}</FormLabel>
                          <button
                            type="button"
                            className="text-[12px] text-gray-500 hover:text-cyan-400 transition-colors"
                          >
                            {t('login.forgotPassword')}
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Input
                              className="h-11 bg-white/[0.04] border-white/[0.08] rounded-[10px] text-white placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-cyan-400/40 focus-visible:border-cyan-400/30 pr-11 transition-all text-[14px]"
                              type={showPassword ? 'text' : 'password'}
                              placeholder={t('login.passwordPlaceholder')}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {authError && (
                    <div className="text-[13px] text-red-400 bg-red-950/30 px-4 py-2.5 rounded-[10px] border border-red-900/30">
                      {authError}
                    </div>
                  )}

                  <Button
                    className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-gray-950 font-semibold rounded-[10px] transition-all shadow-lg shadow-cyan-400/15 hover:shadow-cyan-400/25 cursor-pointer text-[14px] group"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('login.submitButton')}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />}
                  </Button>
                </form>
              </Form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.06]" />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="bg-transparent px-4 text-gray-600" style={{ textShadow: '0 0 8px #030712, 0 0 16px #030712' }}>{t('login.or')}</span>
                </div>
              </div>

              {/* Google Login */}
              <button
                type="button"
                className="w-full h-11 flex items-center justify-center gap-3 rounded-[10px] border border-white/[0.08] bg-white/[0.03] text-gray-300 text-[13px] font-medium hover:bg-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {t('login.googleButton')}
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-5 mt-5">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400/50" />
                <span>{t('login.encrypted')}</span>
              </div>
              <div className="w-px h-3 bg-white/[0.08]" />
              <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                <Lock className="h-3.5 w-3.5 text-cyan-400/50" />
                <span>{t('login.lgpd')}</span>
              </div>
            </div>

            {/* Demo Accounts Section */}
            <div className="mt-6 pt-4 border-t border-white/[0.04]">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-600 mb-3">
                {t('login.demoAccounts')}
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_ACCOUNTS_BASE.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemoCredentials(account.email)}
                    className="flex items-center gap-2 py-2 group cursor-pointer text-left hover:bg-white/[0.03] rounded-lg px-2.5 transition-colors"
                  >
                    <span
                      className="flex h-5 w-5 items-center justify-center rounded text-[9px] shrink-0"
                      style={{ backgroundColor: `${account.color}15`, color: account.color }}
                    >
                      {account.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-gray-400 group-hover:text-gray-300 transition-colors truncate">{t(`superAdmin.roles.${account.roleKey}`)}</p>
                      <p className="text-[10px] text-gray-600 group-hover:text-gray-500 transition-colors truncate">{account.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-[11px] text-gray-700">
              {t('login.copyright')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
