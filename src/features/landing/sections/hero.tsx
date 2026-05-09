'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { ConfettiDots } from '../components/confetti-dots';
import { FadeIn } from '../components/fade-in';

/** Hero: pill announcement + big italic-gradient headline + CTAs + trust meta. */
export function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-32 pb-16 md:pt-40 md:pb-20 text-center z-10">
      <ConfettiDots />
      <div className="relative z-10">
        <FadeIn direction="up">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md pl-1.5 pr-3 py-1 mb-8">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.06em] bg-violet-400/15 text-violet-300 px-2 py-1 rounded-full">
              {t('landing.heroBadgeNew')}
            </span>
            <span className="text-[12px] text-zinc-400">{t('landing.heroBadgeText')}</span>
            <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </FadeIn>

        <FadeIn delay={100} direction="up">
          <h1 className="text-[clamp(44px,8vw,88px)] font-medium leading-[0.95] tracking-[-0.035em] max-w-[12ch] mx-auto">
            {t('landing.heroLine1')}
            <br />
            <span className="italic font-normal text-zinc-500">
              {t('landing.heroLine2Prefix')}
              <em className="not-italic [font-style:italic] bg-gradient-to-r from-violet-300 via-purple-300 to-cyan-300 bg-clip-text text-transparent">
                {t('landing.heroLine2Emphasis')}
              </em>
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={200} direction="up">
          <p className="mt-7 max-w-[56ch] mx-auto text-zinc-400 text-[15px] md:text-[17px] leading-[1.55]">
            {t('landing.heroSubtitle')}
          </p>
        </FadeIn>

        <FadeIn delay={300} direction="up">
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-[#07070a] font-medium text-[14px] hover:bg-zinc-100 hover:-translate-y-px transition-all shadow-[0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_0_rgba(255,255,255,0.4)]"
            >
              {t('landing.heroStartBuilding')}
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
              </svg>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/[0.1] bg-transparent text-zinc-200 font-medium text-[14px] hover:border-white/30 hover:bg-white/[0.04] transition-all"
            >
              <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
              {t('landing.heroWatchDemo')}
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={400} direction="up">
          <div className="mt-9 inline-flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
              {t('landing.heroTrustSoc')}
            </span>
            <span className="text-zinc-700">·</span>
            <span>{t('landing.heroTrustResidency')}</span>
            <span className="text-zinc-700">·</span>
            <span>{t('landing.heroTrustSelfHost')}</span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
