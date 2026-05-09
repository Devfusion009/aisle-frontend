'use client';

import { useTranslation } from 'react-i18next';

import { Counter } from '../components/counter';
import { FadeIn } from '../components/fade-in';

/** Stats strip — 4 animated counters on a thin horizontal divider. */
export function Stats() {
  const { t } = useTranslation();

  const stats = [
    { end: 99,  suffix: '%',  label: t('landing.statsUptime'),       note: t('landing.statsUptimeNote') },
    { end: 894, suffix: 'ms', label: t('landing.statsLatency'),      note: t('landing.statsLatencyNote') },
    { end: 28,  suffix: 'k+', label: t('landing.statsVectorDBs'),    note: t('landing.statsVectorDBsNote') },
    { end: 0,   suffix: '',   label: t('landing.statsCrossTenant'),  note: t('landing.statsCrossTenantNote') },
  ];

  return (
    <section id="security" className="relative max-w-7xl mx-auto px-6 lg:px-10 py-20 z-10">
      <FadeIn direction="up">
        <div className="border-y border-white/[0.06] grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`p-7 md:p-9 ${i < 3 ? 'md:border-r border-white/[0.06]' : ''} ${
                i < 2 ? 'border-r border-white/[0.06] md:border-r' : ''
              } ${i < 2 ? 'border-b md:border-b-0 border-white/[0.06]' : ''}`}
            >
              <Counter end={s.end} label={s.label} suffix={s.suffix} />
              <p className="mt-2 text-[12px] text-zinc-500">{s.note}</p>
            </div>
          ))}
        </div>
      </FadeIn>
    </section>
  );
}
