import type { ReactNode } from 'react';

interface CardProps {
  eyebrow: string;
  title: string;
  desc?: string;
  children?: ReactNode;
}

/** Bento-grid card primitive. Eyebrow + title + optional description + slot. */
export function Card({ eyebrow, title, desc, children }: CardProps) {
  return (
    <div className="h-full flex flex-col rounded-[14px] border border-white/[0.06] bg-[#0e0e12] p-6 transition-colors hover:border-white/[0.12]">
      <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-violet-300 mb-3">{eyebrow}</div>
      <h3 className="text-[20px] md:text-[22px] font-medium leading-[1.2] tracking-[-0.015em] text-white mb-2">{title}</h3>
      {desc && <p className="text-[14px] text-zinc-400 leading-[1.55]">{desc}</p>}
      {children}
    </div>
  );
}
