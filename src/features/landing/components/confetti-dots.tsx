'use client';

import { useEffect, useRef } from 'react';

/**
 * Subtle multi-color dot field rendered to a canvas. Fixed-position children
 * fill the parent (`absolute inset-0`) and pull `pointer-events-none` so they
 * never intercept clicks.
 */
export function ConfettiDots() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const COLORS = ['#a78bfa', '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#f43f5e', '#818cf8'];

    const resize = () => {
      c.width = c.offsetWidth;
      c.height = c.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const dots: { x: number; y: number; r: number; color: string }[] = [];
    for (let i = 0; i < 120; i++) {
      dots.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 2.5 + 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const d of dots) {
        ctx.beginPath();
        ctx.arc(d.x * c.width, d.y * c.height, d.r, 0, Math.PI * 2);
        ctx.fillStyle = d.color + '18';
        ctx.fill();
      }
    };
    draw();
    window.addEventListener('resize', draw);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', draw);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}
