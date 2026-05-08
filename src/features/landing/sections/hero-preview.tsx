'use client';

import { AnimatedChatDemo } from '../animations/animated-chat-demo';
import { FadeIn } from '../components/fade-in';

/** Browser-window mockup wrapping the chat demo, with a violet glow behind. */
export function HeroPreview() {
  return (
    <section className="relative max-w-5xl mx-auto px-6 lg:px-10 mb-32 z-10">
      {/* Violet glow behind the window */}
      <div
        aria-hidden
        className="absolute inset-x-[-10%] -top-10 bottom-1/3 rounded-full blur-[60px] opacity-50 pointer-events-none -z-10"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(167,139,250,0.20), transparent 60%)' }}
      />
      <FadeIn direction="up" delay={500}>
        <div className="rounded-xl border border-white/[0.08] bg-[#0e0e12] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6),0_30px_60px_-30px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.04)]">
          {/* Browser chrome */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-2 bg-[#07070a] border border-white/[0.05] rounded-md px-3 py-1 font-mono text-[11px] text-zinc-500 max-w-[280px]">
                <svg className="w-2.5 h-2.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                acme.verse.ai/chat
              </div>
            </div>
          </div>
          <AnimatedChatDemo />
        </div>
      </FadeIn>
    </section>
  );
}
