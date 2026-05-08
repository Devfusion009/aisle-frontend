'use client';

import { useTranslation } from 'react-i18next';

import { AnimatedAuditLog } from '../animations/animated-audit-log';
import { AnimatedRoleAccess } from '../animations/animated-role-access';
import { AnimatedTenantIsolation } from '../animations/animated-tenant-isolation';
import { PipelineVisual } from '../animations/pipeline-visual';
import { Card } from '../components/card';
import { FadeIn } from '../components/fade-in';

/** Bento grid: 4 feature cards (pipeline, isolation, roles, audit log). */
export function BentoFeatures() {
  const { t } = useTranslation();

  return (
    <section id="product" className="relative max-w-7xl mx-auto px-6 lg:px-10 py-24 md:py-32 z-10">
      <FadeIn direction="up" className="text-center max-w-2xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 mb-3 text-[11px] font-mono uppercase tracking-[0.1em] text-violet-300">
          <span className="h-px w-7 bg-white/[0.1]" />
          The platform
          <span className="h-px w-7 bg-white/[0.1]" />
        </div>
        <h2 className="text-3xl md:text-5xl font-medium tracking-[-0.025em] leading-[1.05]">
          Built for the boring parts of{' '}
          <em className="italic font-normal text-zinc-500">real enterprise AI.</em>
        </h2>
        <p className="mt-4 text-zinc-400 text-[15px] md:text-[17px] leading-[1.55]">
          Not a thin wrapper. A whole platform — ingestion, isolation, permissions, audit, and a chat that actually cites its sources.
        </p>
      </FadeIn>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3.5 auto-rows-[minmax(220px,auto)]">
        <FadeIn direction="up" className="md:col-span-3">
          <Card eyebrow={t('landing.feat1Tag')} title={t('landing.feat1Title')} desc={t('landing.feat1Desc')}>
            <PipelineVisual />
          </Card>
        </FadeIn>

        <FadeIn direction="up" delay={100} className="md:col-span-3">
          <Card eyebrow={t('landing.feat2Tag')} title={t('landing.feat2Title')} desc={t('landing.feat2Desc')}>
            <div className="mt-5">
              <AnimatedTenantIsolation />
            </div>
          </Card>
        </FadeIn>

        <FadeIn direction="up" delay={150} className="md:col-span-4">
          <Card eyebrow={t('landing.feat3Tag')} title={t('landing.feat3Title')} desc={t('landing.feat3Desc')}>
            <div className="mt-5">
              <AnimatedRoleAccess />
            </div>
          </Card>
        </FadeIn>

        <FadeIn direction="up" delay={200} className="md:col-span-2">
          <Card eyebrow="Audit log" title="Every query, traceable.">
            <AnimatedAuditLog />
          </Card>
        </FadeIn>
      </div>
    </section>
  );
}
