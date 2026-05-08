'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const TENANTS = [
  { org: 'Acme Corp',  color: '#a78bfa', docs: ['Employee Handbook', 'Q3 Report'] },
  { org: 'Globex Inc', color: '#38bdf8', docs: ['Sales Playbook', 'Brand Guide'] },
  { org: 'Initech',    color: '#34d399', docs: ['API Docs', 'Security Protocols'] },
];

/**
 * Animation: three tenants light up in sequence; periodically a "🚫 blocked"
 * cross-tenant access attempt flashes red on the active row.
 */
export function AnimatedTenantIsolation() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState<boolean[]>([false, false, false]);
  const [active, setActive] = useState(0);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    TENANTS.forEach((_, i) => {
      setTimeout(
        () => setEntered((prev) => { const n = [...prev]; n[i] = true; return n; }),
        i * 300 + 200,
      );
    });
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setBlocked(true);
      setTimeout(() => {
        setBlocked(false);
        setActive((a) => (a + 1) % TENANTS.length);
      }, 800);
    }, 2400);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <div ref={ref} className="space-y-2.5">
      {TENANTS.map((tenant, i) => {
        const isActive = active === i;
        return (
          <div
            key={tenant.org}
            className="rounded-lg border p-3 flex items-center justify-between transition-all duration-500"
            style={{
              transform: entered[i] ? 'translateX(0)' : 'translateX(-28px)',
              opacity: entered[i] ? 1 : 0,
              transitionDelay: `${i * 60}ms`,
              borderColor: isActive ? `${tenant.color}40` : 'rgba(255,255,255,0.06)',
              background: isActive ? `${tenant.color}08` : 'rgba(255,255,255,0.02)',
              boxShadow: isActive ? `0 0 20px ${tenant.color}12` : 'none',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-2 h-2 rounded-full transition-all duration-300 shrink-0"
                style={{
                  backgroundColor: tenant.color,
                  boxShadow: isActive ? `0 0 8px ${tenant.color}` : 'none',
                  transform: isActive ? 'scale(1.4)' : 'scale(1)',
                }}
              />
              <span className="text-[12px] font-medium text-zinc-200">{tenant.org}</span>
            </div>
            <span
              className="text-[10px] font-mono uppercase ml-2 transition-all duration-300"
              style={{ color: isActive && blocked ? '#f87171' : isActive ? tenant.color : '#3f3f46' }}
            >
              {isActive && blocked ? `🚫 ${t('landing.tenantBlocked')}` : `🔒 ${t('landing.tenantIsolated')}`}
            </span>
          </div>
        );
      })}
      <div className="pt-1 h-5 flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 transition-all duration-400"
          style={{ opacity: blocked ? 1 : 0, transform: blocked ? 'translateY(0)' : 'translateY(4px)' }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span className="text-[10px] font-mono text-red-400">{t('landing.crossTenantDenied')}</span>
        </div>
      </div>
    </div>
  );
}
