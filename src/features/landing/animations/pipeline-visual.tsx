'use client';

import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'processing' | 'done' | 'live';

const STEPS = [
  { cmd: 'upload',   arg: '/handbook.pdf',  result: '4.2 MB → indexed',   badge: 'INDEXED', ms: 900  },
  { cmd: 'chunk',    arg: 'stride=512',      result: '84 chunks',          badge: 'DONE',    ms: 700  },
  { cmd: 'embed',    arg: 'text-3-large',    result: '84 × 3 072d',        badge: 'DONE',    ms: 1000 },
  { cmd: 'retrieve', arg: 'top_k=8 + cite',  result: 'streaming answer…',  badge: 'LIVE',    ms: 0    },
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
      <polyline points="2,6 5,9 10,3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 14 14" fill="none" className="w-3 h-3 animate-spin">
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 14" strokeLinecap="round" />
    </svg>
  );
}

export function PipelineVisual() {
  const ref  = useRef<HTMLDivElement>(null);
  const [phases, setPhases] = useState<Phase[]>(['idle', 'idle', 'idle', 'idle']);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();

      let delay = 150;
      STEPS.forEach((step, i) => {
        setTimeout(() => setPhases(p => p.map((v, j) => j === i ? 'processing' : v)), delay);

        if (i < 3) {
          setTimeout(
            () => setPhases(p => p.map((v, j) => j === i ? 'done' : v)),
            delay + step.ms,
          );
        } else {
          setTimeout(
            () => setPhases(p => p.map((v, j) => j === i ? 'live' : v)),
            delay + 500,
          );
        }

        delay += step.ms + 350;
      });
    }, { threshold: 0.25 });

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-5 space-y-[7px] font-mono text-[11px] select-none">
      {STEPS.map((step, i) => {
        const phase   = phases[i];
        const isIdle  = phase === 'idle';
        const isProc  = phase === 'processing';
        const isDone  = phase === 'done';
        const isLive  = phase === 'live';

        /* row colours */
        const rowCls = isLive
          ? 'border-violet-500/40 bg-violet-950/25 shadow-[inset_0_0_20px_rgba(139,92,246,0.06)]'
          : isDone
          ? 'border-emerald-500/[0.18] bg-emerald-950/[0.12]'
          : isProc
          ? 'border-white/[0.09] bg-white/[0.025]'
          : 'border-white/[0.04] bg-transparent';

        return (
          <div
            key={i}
            style={{
              opacity:   isIdle ? 0 : 1,
              transform: isIdle ? 'translateX(-10px)' : 'translateX(0)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}
          >
            <div className={`relative overflow-hidden flex items-center gap-3 px-3 py-[9px] rounded-xl border transition-colors duration-500 ${rowCls}`}>

              {/* ── scan-line on processing ── */}
              {isProc && (
                <span
                  className="pointer-events-none absolute inset-y-0 w-[1.5px] bg-gradient-to-b from-transparent via-cyan-400/70 to-transparent"
                  style={{ animation: `pv-scan ${step.ms}ms ease-in-out forwards` }}
                />
              )}

              {/* ── progress fill on processing ── */}
              {isProc && (
                <span
                  className="pointer-events-none absolute inset-0 origin-left bg-gradient-to-r from-white/[0.015] to-white/[0.04]"
                  style={{ animation: `pv-fill ${step.ms}ms ease-out forwards` }}
                />
              )}

              {/* ── step badge ── */}
              <span className={`relative z-10 w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all duration-400 ${
                isLive ? 'bg-violet-400/20 text-violet-300' :
                isDone ? 'bg-emerald-500/20 text-emerald-400' :
                isProc ? 'bg-white/[0.06] text-zinc-400' :
                         'bg-white/[0.03] text-zinc-700'
              }`}>
                {isDone ? <CheckIcon /> : isProc ? <Spinner /> : isLive
                  ? <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
                  : <span className="text-[10px] font-bold">{i + 1}</span>
                }
              </span>

              {/* ── command text ── */}
              <div className="relative z-10 flex-1 flex items-baseline gap-1 min-w-0 overflow-hidden">
                <span className={`font-bold transition-colors duration-300 ${
                  isLive ? 'text-violet-200' :
                  isDone ? 'text-white' :
                  isProc ? 'text-zinc-100' : 'text-zinc-600'
                }`}>
                  {step.cmd}
                </span>
                <span className="text-zinc-700">(</span>
                <span className={`transition-colors duration-300 ${
                  isLive ? 'text-cyan-300' :
                  isDone ? 'text-emerald-300/80' :
                  isProc ? 'text-zinc-400' : 'text-zinc-700'
                }`}>
                  {step.arg}
                </span>
                <span className="text-zinc-700">)</span>

                {/* result appears on done/live */}
                {(isDone || isLive) && (
                  <span
                    className={`ml-1 shrink-0 ${isLive ? 'text-violet-300/80' : 'text-zinc-500'}`}
                    style={{ animation: 'pv-fadein 0.35s ease forwards' }}
                  >
                    → <span className={isLive ? 'text-violet-200' : 'text-zinc-400'}>{step.result}</span>
                  </span>
                )}
              </div>

              {/* ── status chip ── */}
              <div className="relative z-10 flex items-center gap-1.5 shrink-0">
                {isLive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_rgba(167,139,250,0.9)]" />
                )}
                <span className={`text-[9px] tracking-[0.12em] uppercase font-semibold transition-colors duration-300 ${
                  isLive ? 'text-violet-400' :
                  isDone ? 'text-emerald-400' :
                  isProc ? 'text-zinc-500' : 'text-zinc-800'
                }`}>
                  {isProc ? 'running' : isIdle ? '···' : step.badge}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* connector line + bottom hint */}
      <div className="flex items-center gap-2 pt-1 pl-1 opacity-40">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
        <span className="text-emerald-400/80 text-[10px] tracking-wide">pipeline active · 0 ms avg latency</span>
      </div>

      <style>{`
        @keyframes pv-scan {
          from { left: 0%;   opacity: 0.9; }
          to   { left: 100%; opacity: 0;   }
        }
        @keyframes pv-fill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes pv-fadein {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
    </div>
  );
}
