'use client';

import { useEffect, useRef, useState } from 'react';

interface CounterProps {
  end: number;
  label: string;
  suffix?: string;
}

/** Animated 0→N counter that triggers when the element scrolls into view. */
export function Counter({ end, label, suffix = '' }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        let start = 0;
        const step = (ts: number) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / 2000, 1);
          setCount(Math.round((1 - Math.pow(1 - p, 3)) * end));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <div ref={ref}>
      <div className="text-5xl md:text-6xl font-medium tracking-[-0.04em] text-white tabular-nums leading-none flex items-baseline gap-1">
        <span>{count.toLocaleString()}</span>
        {suffix && <sup className="text-base text-zinc-500 font-normal">{suffix}</sup>}
      </div>
      <div className="text-[11px] mt-3.5 uppercase tracking-[0.1em] text-zinc-600 font-mono">{label}</div>
    </div>
  );
}
