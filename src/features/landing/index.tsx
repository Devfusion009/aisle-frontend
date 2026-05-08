'use client';

import { BentoFeatures } from './sections/bento-features';
import { CtaBand } from './sections/cta-band';
import { Footer } from './sections/footer';
import { Hero } from './sections/hero';
import { HeroPreview } from './sections/hero-preview';
import { HowItWorks } from './sections/how-it-works';
import { Nav } from './sections/nav';
import { Stats } from './sections/stats';

/**
 * LandingPage — composes the public marketing page from independent sections.
 *
 * Sections live in `./sections/`, animations in `./animations/`, and shared
 * primitives in `./components/`. Section order here is the only place that
 * defines page flow, so re-arranging is a one-liner.
 */
export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#07070a] text-white font-sans overflow-x-hidden antialiased">
      <BackgroundGrid />
      <Nav />
      <Hero />
      <HeroPreview />
      <BentoFeatures />
      <HowItWorks />
      <Stats />
      <CtaBand />
      <Footer />
    </div>
  );
}

/**
 * Static dotted-grid backdrop (CSS-only). Masked with a radial gradient so
 * dots fade out toward the page edges — same look as the inspiration design.
 */
function BackgroundGrid() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none z-0 opacity-60"
      style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 20%, black, transparent 75%)',
      }}
    />
  );
}
