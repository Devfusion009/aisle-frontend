'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Animation: cascading role hierarchy. Roles slide in from the right; an
 * "active" highlight cycles through the list to draw the eye down the chain.
 */
export function AnimatedRoleAccess() {
  const { t } = useTranslation();

  const ROLES = [
    { role: t('landing.rolePlatformAdmin'), desc: t('landing.rolePlatformAdminDesc'), hex: '#8b5cf6' },
    { role: t('landing.roleTenantOwner'),   desc: t('landing.roleTenantOwnerDesc'),   hex: '#3b82f6' },
    { role: t('landing.roleTenantAdmin'),   desc: t('landing.roleTenantAdminDesc'),   hex: '#06b6d4' },
    { role: t('landing.roleEditor'),        desc: t('landing.roleEditorDesc'),        hex: '#f59e0b' },
    { role: t('landing.roleUser'),          desc: t('landing.roleUserDesc'),          hex: '#10b981' },
  ];

  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState<boolean[]>([false, false, false, false, false]);
  const [active, setActive] = useState(0);

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
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    ROLES.forEach((_, i) => {
      setTimeout(
        () => setEntered((prev) => { const n = [...prev]; n[i] = true; return n; }),
        i * 130 + 200,
      );
    });
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % ROLES.length);
    }, 1800);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <div ref={ref} className="space-y-2">
      {ROLES.map((r, i) => {
        const isActive = active === i;
        return (
          <div
            key={r.role}
            className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-500"
            style={{
              marginLeft: `${i * 10}px`,
              transform: entered[i] ? 'translateX(0)' : 'translateX(20px)',
              opacity: entered[i] ? 1 : 0,
              transitionDelay: `${i * 40}ms`,
              borderColor: isActive ? `${r.hex}50` : 'rgba(255,255,255,0.05)',
              background: isActive ? `${r.hex}10` : 'rgba(255,255,255,0.02)',
              boxShadow: isActive ? `0 0 16px ${r.hex}14, inset 0 0 0 1px ${r.hex}20` : 'none',
            }}
          >
            <div
              className="w-2 h-2 rounded-full mt-1.5 shrink-0 transition-all duration-300"
              style={{
                background: r.hex,
                boxShadow: isActive ? `0 0 8px ${r.hex}` : 'none',
                transform: isActive ? 'scale(1.5)' : 'scale(1)',
              }}
            />
            <div className="flex-1 min-w-0">
              <span className="text-[12px] font-medium text-zinc-200 block">{r.role}</span>
              <span
                className="text-[10px] transition-colors duration-300 line-clamp-1"
                style={{ color: isActive ? r.hex + 'cc' : '#52525b' }}
              >
                {r.desc}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
