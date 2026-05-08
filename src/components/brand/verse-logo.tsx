import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Verse AI brand logo + text. Three exports:
 *
 *   <VerseLogo />            ← bare SVG (V chevron + AI accent dot)
 *   <VerseLogoBoxed />       ← SVG inside a dark rounded square (app-icon look)
 *   <VerseBrand />           ← boxed logo + "Verse AI" wordmark
 *
 * The mark itself is meaning-loaded:
 *   • A chevron V         → the brand letter; converging lines = "many sources"
 *   • Violet→cyan gradient → the brand palette established on the landing page
 *   • The accent dot      → AI synthesis (the answer that comes out)
 *
 * Each instance generates a unique gradient ID via useId so multiple logos
 * on the same page never collide.
 */

interface VerseLogoProps {
  className?: string;
  /** Override the gradient. Defaults to brand violet→cyan. */
  fromColor?: string;
  toColor?: string;
  /** Color of the AI accent dot. Defaults to brand violet. */
  dotColor?: string;
  /** Hide the AI accent dot (useful for monochrome contexts). */
  hideDot?: boolean;
}

export function VerseLogo({
  className,
  fromColor = '#c4b5fd',
  toColor = '#67e8f9',
  dotColor = '#a78bfa',
  hideDot = false,
}: VerseLogoProps) {
  const gradId = useId();
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('block', className)}
      role="img"
      aria-label="Verse AI"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={fromColor} />
          <stop offset="100%" stopColor={toColor} />
        </linearGradient>
      </defs>
      {/* V chevron */}
      <path
        d="M5 7 L16 25 L27 7"
        stroke={`url(#${gradId})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* AI accent dot (top-right) */}
      {!hideDot && <circle cx="24" cy="9" r="2" fill={dotColor} />}
    </svg>
  );
}

interface VerseLogoBoxedProps {
  /** Container size classes (h-X w-X). Defaults to h-9 w-9. */
  className?: string;
  /** Inner icon size classes. Defaults to w-5 h-5. */
  iconClassName?: string;
  /** Container background tint. Defaults to a dark glass tile. */
  boxClassName?: string;
}

export function VerseLogoBoxed({
  className,
  iconClassName = 'w-5 h-5',
  boxClassName,
}: VerseLogoBoxedProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-lg bg-[#0e0e12] ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] shrink-0',
        'h-9 w-9',
        boxClassName,
        className,
      )}
    >
      <VerseLogo className={iconClassName} />
    </span>
  );
}

interface VerseBrandProps {
  className?: string;
  /** Wordmark CSS classes. Override e.g. text color/size. */
  textClassName?: string;
  /** Size preset. */
  size?: 'sm' | 'md' | 'lg';
  /** Show only the boxed logo, no text. */
  iconOnly?: boolean;
}

const SIZE_CLASSES = {
  sm: { box: 'h-7 w-7', icon: 'w-4 h-4', text: 'text-[13px]' },
  md: { box: 'h-9 w-9', icon: 'w-5 h-5', text: 'text-[15px]' },
  lg: { box: 'h-12 w-12', icon: 'w-7 h-7', text: 'text-[18px]' },
} as const;

export function VerseBrand({
  className,
  textClassName,
  size = 'md',
  iconOnly = false,
}: VerseBrandProps) {
  const s = SIZE_CLASSES[size];
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <VerseLogoBoxed className={s.box} iconClassName={s.icon} />
      {!iconOnly && (
        <span className={cn('font-semibold tracking-tight', s.text, textClassName)}>
          Verse AI
        </span>
      )}
    </span>
  );
}
