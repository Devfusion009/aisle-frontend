'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  className?: string;
}

/** Wrapper that fades + slides children in when scrolled into view. */
export function FadeIn({ children, delay = 0, direction = 'up', className = '' }: FadeInProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  let translateClass = '';
  if (direction === 'up') translateClass = 'translate-y-12';
  if (direction === 'down') translateClass = '-translate-y-12';
  if (direction === 'left') translateClass = '-translate-x-12';
  if (direction === 'right') translateClass = 'translate-x-12';

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] ${className} ${
        isVisible ? 'opacity-100 translate-y-0 translate-x-0' : `opacity-0 ${translateClass}`
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
