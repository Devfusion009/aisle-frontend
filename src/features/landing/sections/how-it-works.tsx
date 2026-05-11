'use client';

import { useTranslation } from 'react-i18next';

import { FadeIn } from '../components/fade-in';

type MockColor = 'signal' | 'positive';
type MockRow = readonly [key: string, value: string, signal: boolean, color?: MockColor];

interface Step {
  num: string;
  heading: string;
  detail: string;
  mock: readonly MockRow[];
}

/**
 * Three-step timeline (Provision → Ingest → Ask). Each step pairs a heading
 * + description with a small mono "API mock" card to ground the abstraction.
 */
export function HowItWorks() {
  const { t } = useTranslation();

  const steps: Step[] = [
    {
      num: t('landing.howStep1Number'),
      heading: t('landing.howStep1Heading'),
      detail: t('landing.step1Detail'),
      mock: [
        ['POST', '/v1/tenants', true],
        ['name', '"Acme Corp"', false],
        ['region', '"sa-east-1"', false],
        ['plan', '"growth"', false],
        ['→ ns_id', 'acme_4f9a', true],
        ['→ status', 'ready 2.4s', false, 'positive'],
      ],
    },
    {
      num: t('landing.howStep2Number'),
      heading: t('landing.step2Action'),
      detail: t('landing.step2Detail'),
      mock: [
        ['handbook', 'PDF · 84 pages', false],
        ['policies', '12 docs · auto-sync', false],
        ['drive', 'connected · /finance', true],
        ['notion', 'connected · 4 spaces', true],
        ['indexed', '347 docs · 28k chunks', false, 'positive'],
      ],
    },
    {
      num: t('landing.howStep3Number'),
      heading: t('landing.step3Action'),
      detail: t('landing.step3Detail'),
      mock: [
        ['→', `"${t('landing.howSampleQuestion')}"`, false],
        ['retrieve', '8 chunks · 312ms', false],
        ['model', 'gpt-4o-mini', false],
        ['cites', 'policies/refund.md, faq.pdf', true],
        ['tokens', 'in 2.1k · out 184', false],
        ['latency', '894ms total', false, 'positive'],
      ],
    },
  ];

  return (
    <section id="how" className="relative max-w-5xl mx-auto px-6 lg:px-10 py-24 md:py-32 z-10">
      <FadeIn direction="up" className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 mb-3 text-[11px] font-mono uppercase tracking-[0.1em] text-violet-300">
          <span className="h-px w-7 bg-white/[0.1]" />
          {t('landing.howEyebrow')}
          <span className="h-px w-7 bg-white/[0.1]" />
        </div>
        <h2 className="text-3xl md:text-5xl font-medium tracking-[-0.025em] leading-[1.05]">
          {t('landing.howTitlePart1')}<em className="italic font-normal text-zinc-500">{t('landing.howTitleEm')}</em>{t('landing.howTitlePart2')}
        </h2>
      </FadeIn>

      <div className="md:pl-10 md:border-l md:border-dashed md:border-white/[0.1] space-y-12 md:space-y-16">
        {steps.map((s, i) => (
          <FadeIn key={s.num} direction="up" delay={i * 80}>
            <div className="relative grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 md:gap-12 items-center">
              {/* Step dot for desktop timeline */}
              <span aria-hidden className="hidden md:block absolute -left-[44px] top-2 w-[18px] h-[18px] rounded-full bg-[#0e0e12] border border-white/10" />
              <span aria-hidden className="hidden md:block absolute -left-[40px] top-[10px] w-[10px] h-[10px] rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.7)]" />

              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-violet-300 mb-2.5">{s.num}</div>
                <h3 className="text-2xl md:text-[26px] font-medium tracking-[-0.02em] leading-[1.2] mb-3">{s.heading}</h3>
                <p className="text-zinc-400 text-[14.5px] leading-[1.55]">{s.detail}</p>
              </div>

              <div className="rounded-lg border border-white/[0.06] bg-[#0e0e12] p-4 font-mono text-[11px]">
                {s.mock.map((row, idx) => {
                  const [k, v, signal, color] = row;
                  const last = idx === s.mock.length - 1;
                  return (
                    <div
                      key={idx}
                      className={`flex gap-3 py-1 ${last && s.mock.length > 4 ? 'mt-1.5 pt-1.5 border-t border-dashed border-white/[0.06]' : ''}`}
                    >
                      <span className="text-zinc-600 w-20 shrink-0">{k}</span>
                      <span
                        className={`flex-1 ${
                          color === 'positive' ? 'text-emerald-400' : signal ? 'text-violet-300' : 'text-zinc-200'
                        }`}
                      >
                        {v}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
