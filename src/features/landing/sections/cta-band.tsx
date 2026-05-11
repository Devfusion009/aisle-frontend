'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { ConfettiDots } from '../components/confetti-dots';
import { FadeIn } from '../components/fade-in';

interface SideCard {
  icon: 'check-circle' | 'check' | 'refresh';
  heading: string;
  copy: string;
}

function SideIcon({ name }: { name: SideCard['icon'] }) {
  const baseSvg = 'w-4 h-4';
  if (name === 'check-circle') {
    return (
      <svg className={baseSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    );
  }
  if (name === 'check') {
    return (
      <svg className={baseSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  return (
    <svg className={baseSvg} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 12a9 9 0 1 0 9-9" />
      <path d="M3 4v5h5" />
    </svg>
  );
}

/** Final CTA band: primary headline + 3 trust cards on the side. */
export function CtaBand() {
  const { t } = useTranslation();

  const SIDE_CARDS: SideCard[] = [
    { icon: 'check-circle', heading: t('landing.ctaSideCard1Title'), copy: t('landing.ctaSideCard1Body') },
    { icon: 'check',        heading: t('landing.ctaSideCard2Title'), copy: t('landing.ctaSideCard2Body') },
    { icon: 'refresh',      heading: t('landing.ctaSideCard3Title'), copy: t('landing.ctaSideCard3Body') },
  ];

  return (
    <section className="relative max-w-7xl mx-auto px-6 lg:px-10 py-24 md:py-32 z-10">
      <FadeIn direction="up">
        <div
          className="relative rounded-3xl border border-white/[0.06] bg-[#0e0e12] p-10 md:p-16 grid md:grid-cols-[1.1fr_1fr] gap-10 items-center overflow-hidden"
          style={{ backgroundImage: 'radial-gradient(ellipse at top right, rgba(167,139,250,0.14), transparent 60%)' }}
        >
          <ConfettiDots />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-[44px] font-medium tracking-[-0.025em] leading-[1.05]">
              {t('landing.ctaH2')}
            </h2>
            <p className="mt-4 text-zinc-400 text-[15px] leading-[1.55] max-w-[44ch]">
              {t('landing.ctaParagraph')}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-[#07070a] font-medium text-[14px] hover:bg-zinc-100 hover:-translate-y-px transition-all"
              >
                {t('landing.ctaStartFree')}
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </div>
          </div>

          <div className="relative z-10 grid gap-3">
            {SIDE_CARDS.map((c) => (
              <div
                key={c.heading}
                className="flex items-start gap-3.5 rounded-xl border border-white/[0.06] bg-black/40 backdrop-blur-md p-4"
              >
                <div className="w-8 h-8 rounded-lg bg-violet-400/15 text-violet-300 flex items-center justify-center shrink-0">
                  <SideIcon name={c.icon} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[14px] font-medium text-white">{c.heading}</h4>
                  <p className="text-[12.5px] text-zinc-400 leading-[1.5] mt-0.5">{c.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>
    </section>
  );
}
