'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { VerseBrand } from '@/components/brand/verse-logo';

/**
 * Sticky top nav. Picks up a subtle border once the page has been scrolled
 * a bit — same pattern as the inspiration design.
 */
export function Nav() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 backdrop-blur-xl transition-colors duration-300 ${
        scrolled ? 'bg-[#07070a]/80 border-b border-white/[0.06]' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link href="/">
          <VerseBrand size="sm" />
        </Link>

        <div className="hidden md:flex items-center gap-7 text-[13px] text-zinc-400">
          <a href="#product" className="hover:text-white transition-colors">{t('landing.navProduct')}</a>
          <a href="#how" className="hover:text-white transition-colors">{t('landing.navHowItWorks')}</a>
          <a href="#security" className="hover:text-white transition-colors">{t('landing.navSecurity')}</a>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-[13px] text-zinc-400 hover:text-white transition-colors px-3 py-2 hidden sm:inline-block"
          >
            {t('landing.navLogin')}
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-[13px] font-medium bg-white text-[#07070a] px-4 py-2 rounded-full hover:bg-zinc-100 hover:-translate-y-px transition-all"
          >
            {t('landing.navGetStarted')}
          </Link>
        </div>
      </div>
    </nav>
  );
}
