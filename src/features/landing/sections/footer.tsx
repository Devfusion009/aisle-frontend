'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { VerseLogoBoxed } from '@/components/brand/verse-logo';

/**
 * Minimal footer — only links to things that actually exist (in-page section
 * anchors and the two real auth routes). No fake "Docs / Careers / DPA"
 * link columns; those would lead to 404s.
 */
export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-12 pb-8 border-t border-white/[0.06] z-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <Link href="/" className="flex items-start gap-3 group">
          <VerseLogoBoxed className="h-8 w-8" iconClassName="w-5 h-5" />
          <div>
            <div className="text-[15px] font-semibold tracking-tight leading-tight group-hover:text-violet-300 transition-colors">
              Verse AI
              <span className="ml-2 text-[11px] font-normal tracking-wide text-zinc-500">by Moovehub</span>
            </div>
            <p className="mt-0.5 text-[12px] text-zinc-500 leading-[1.5] max-w-[34ch]">
              {t('landing.footerTagline')}
            </p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-zinc-400">
          <a href="#product" className="hover:text-white transition-colors">{t('landing.navProduct')}</a>
          <a href="#how" className="hover:text-white transition-colors">{t('landing.navHowItWorks')}</a>
          <a href="#security" className="hover:text-white transition-colors">{t('landing.navSecurity')}</a>
          <span aria-hidden className="hidden sm:inline-block h-3 w-px bg-white/[0.1]" />
          <Link href="/login" className="hover:text-white transition-colors">{t('landing.navLogin')}</Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1 text-white hover:text-violet-300 transition-colors"
          >
            {t('landing.navGetStarted')}
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </nav>
      </div>

      <div className="mt-10 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-[11px] text-zinc-600">
        <span>{t('landing.footerCopyright', { year: new Date().getFullYear() })}</span>
      </div>
    </footer>
  );
}
