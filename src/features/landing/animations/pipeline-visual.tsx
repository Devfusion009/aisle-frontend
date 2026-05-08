'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Four-step ingestion pipeline. Steps progressively turn "done" while the
 * last one stays "live" — keeps the card alive without being noisy.
 */
export function PipelineVisual() {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        let i = 0;
        const tick = () => {
          if (i >= 3) return;
          i += 1;
          setProgress(i);
          setTimeout(tick, 700);
        };
        setTimeout(tick, 400);
        obs.disconnect();
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const steps = [
    { n: '1', label: 'upload  →  /handbook.pdf', status: 'indexed' },
    { n: '2', label: 'chunk(512)  →  84 chunks', status: 'done' },
    { n: '3', label: 'embed(text-3-large)  →  3072d', status: 'done' },
    { n: '4', label: 'retrieve(top_k=8)  +  cite', status: 'live' },
  ];

  return (
    <div ref={ref} className="mt-5 space-y-2 font-mono text-[11px]">
      {steps.map((s, i) => {
        const done = i <= progress && i < 3;
        const live = i === 3 && progress >= 3;
        const pending = i > progress;
        return (
          <div
            key={s.n}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md border transition-all duration-500 ${
              live
                ? 'border-violet-500/40 bg-violet-500/5 text-white'
                : done
                ? 'border-white/[0.06] bg-[#07070a] text-zinc-300'
                : 'border-white/[0.04] bg-[#07070a]/60 text-zinc-600'
            }`}
            style={{ opacity: pending ? 0.4 : 1 }}
          >
            <span
              className={`w-[18px] h-[18px] rounded grid place-items-center text-[10px] shrink-0 ${
                live ? 'bg-violet-400/20 text-violet-300' : 'bg-white/[0.04] text-zinc-400'
              }`}
            >
              {s.n}
            </span>
            <span className="flex-1 truncate">{s.label}</span>
            <span
              className={`text-[10px] uppercase tracking-wider ${
                live ? 'text-violet-300' : done ? 'text-emerald-400' : 'text-zinc-700'
              }`}
            >
              {pending ? '…' : s.status}
            </span>
          </div>
        );
      })}
    </div>
  );
}
