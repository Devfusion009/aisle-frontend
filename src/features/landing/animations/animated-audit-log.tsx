'use client';

import { useEffect, useRef, useState } from 'react';

type ActionType = 'query' | 'upload' | 'invite' | 'revoke' | 'export' | 'login';

interface LogEntry {
  id: number;
  time: string;
  user: string;
  action: ActionType;
  detail: string;
  isNew?: boolean;
}

const SEED_ENTRIES: Omit<LogEntry, 'id'>[] = [
  { time: '14:32', user: 'jm@acme',  action: 'query',  detail: '"Q3 revenue" · 3 cites' },
  { time: '14:31', user: 'ad@acme',  action: 'upload', detail: '/board.pdf · 412 kb'    },
  { time: '14:29', user: 'md@acme',  action: 'invite', detail: '+2 members'              },
  { time: '14:25', user: 'jm@acme',  action: 'query',  detail: '"PTO policy" · 1 cite'  },
  { time: '14:18', user: 'ad@acme',  action: 'revoke', detail: 'api-key #4'              },
];

const LIVE_POOL: Omit<LogEntry, 'id' | 'time'>[] = [
  { user: 'sr@acme',  action: 'query',  detail: '"vendor contract" · 5 cites' },
  { user: 'nt@acme',  action: 'export', detail: 'audit-log-may.csv · 88 kb'   },
  { user: 'ad@acme',  action: 'upload', detail: '/q2-report.pdf · 1.1 mb'    },
  { user: 'jm@acme',  action: 'query',  detail: '"headcount 2025" · 2 cites'  },
  { user: 'md@acme',  action: 'login',  detail: 'new device · NYC'            },
  { user: 'sr@acme',  action: 'invite', detail: '+1 member'                   },
  { user: 'nt@acme',  action: 'revoke', detail: 'api-key #7'                  },
  { user: 'ad@acme',  action: 'query',  detail: '"compliance report" · 4 cites'},
];

const ACTION_STYLES: Record<ActionType, { label: string; cls: string }> = {
  query:  { label: 'query',  cls: 'text-cyan-400'    },
  upload: { label: 'upload', cls: 'text-violet-400'  },
  invite: { label: 'invite', cls: 'text-emerald-400' },
  revoke: { label: 'revoke', cls: 'text-red-400'     },
  export: { label: 'export', cls: 'text-orange-400'  },
  login:  { label: 'login',  cls: 'text-yellow-400'  },
};

function padTime(h: number, m: number) {
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

let _id = 0;
function makeId() { return ++_id; }

export function AnimatedAuditLog() {
  const ref     = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<LogEntry[]>(() =>
    SEED_ENTRIES.map(e => ({ ...e, id: makeId() }))
  );
  const [totalCount, setTotalCount] = useState(SEED_ENTRIES.length);
  const poolRef = useRef(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting || started.current) return;
      started.current = true;
      obs.disconnect();

      let iteration = 0;
      const tick = () => {
        const src = LIVE_POOL[poolRef.current % LIVE_POOL.length];
        poolRef.current++;

        const now  = new Date();
        const newEntry: LogEntry = {
          ...src,
          id:   makeId(),
          time: padTime(now.getHours(), now.getMinutes()),
          isNew: true,
        };

        setEntries(prev => [newEntry, ...prev].slice(0, 7));
        setTotalCount(c => c + 1);

        /* clear isNew after flash */
        setTimeout(() => {
          setEntries(prev => prev.map(e => e.id === newEntry.id ? { ...e, isNew: false } : e));
        }, 900);

        iteration++;
        const nextDelay = iteration < 3 ? 1800 : 2800 + Math.random() * 1400;
        setTimeout(tick, nextDelay);
      };

      setTimeout(tick, 1200);
    }, { threshold: 0.2 });

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="mt-4 select-none">

      {/* ── live header ── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
          <span className="font-mono text-[9px] text-emerald-400 tracking-[0.12em] uppercase">Live</span>
        </div>
        <span className="font-mono text-[9px] text-zinc-600 tabular-nums">
          {totalCount} events
        </span>
      </div>

      {/* ── log entries ── */}
      <div className="space-y-[5px] overflow-hidden">
        {entries.map((e, idx) => {
          const style = ACTION_STYLES[e.action];
          const isFresh = e.isNew;
          const dimmed  = idx >= 4;

          return (
            <div
              key={e.id}
              className="relative flex items-center gap-2 font-mono text-[10px] rounded-lg px-2.5 py-[7px] border transition-all duration-500"
              style={{
                opacity:   dimmed ? 0.35 : 1,
                borderColor: isFresh ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                background:  isFresh ? 'rgba(255,255,255,0.04)' : 'transparent',
                transform:   'translateY(0)',
                animation:   idx === 0 ? 'al-slidein 0.35s ease forwards' : 'none',
              }}
            >
              {/* flash bar */}
              {isFresh && (
                <span
                  className="absolute inset-0 rounded-lg"
                  style={{ animation: 'al-flash 0.9s ease forwards' }}
                />
              )}

              {/* new badge */}
              {isFresh && (
                <span
                  className="absolute -top-1 -right-1 text-[8px] font-bold bg-emerald-500 text-black px-1 rounded"
                  style={{ animation: 'al-newbadge 0.9s ease forwards' }}
                >
                  NEW
                </span>
              )}

              {/* timestamp */}
              <span className="text-zinc-600 shrink-0 tabular-nums w-[28px]">{e.time}</span>

              {/* dot separator */}
              <span className="text-zinc-800 shrink-0">·</span>

              {/* user */}
              <span className="text-zinc-400 shrink-0 truncate max-w-[70px]">{e.user}</span>

              {/* dot */}
              <span className="text-zinc-800 shrink-0">·</span>

              {/* action */}
              <span className={`${style.cls} font-semibold shrink-0`}>{style.label}</span>

              {/* dot + detail */}
              <span className="text-zinc-800 shrink-0">·</span>
              <span className="text-zinc-500 truncate">{e.detail}</span>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes al-slidein {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0);     }
        }
        @keyframes al-flash {
          0%   { background: rgba(255,255,255,0.06); }
          100% { background: transparent; }
        }
        @keyframes al-newbadge {
          0%   { opacity: 1; transform: scale(1);    }
          70%  { opacity: 1; transform: scale(1.1);  }
          100% { opacity: 0; transform: scale(0.8);  }
        }
      `}</style>
    </div>
  );
}
