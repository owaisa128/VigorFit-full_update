import React from 'react';
import BrandMark from './BrandMark';

/**
 * FORMA Brand Logo:
 * Pairs the abstract monogram mark with the single-color wordmark
 * set in the display typeface (Fraunces / Cabinet Grotesk).
 *
 * Variants:
 * - 'horizontal' (default): [Mark] FORMA
 * - 'stacked': [Mark] above FORMA
 * - 'mark': standalone mark only
 * - 'wordmark': wordmark only
 *
 * Tone / Theme:
 * - 'auto' (default, inherits currentColor)
 * - 'reversed' (light-on-dark, #F4F5F6)
 * - 'light' (single-color on light, #0B0D0F)
 */
export default function BrandLogo({
  variant = 'horizontal',
  theme = 'auto',
  className = '',
  markClassName = '',
  textClassName = '',
  ariaLabel = 'FORMA',
}) {
  const colorClass =
    theme === 'reversed'
      ? 'text-[#F4F5F6]'
      : theme === 'light'
      ? 'text-[#0B0D0F]'
      : 'text-current';

  if (variant === 'mark') {
    return (
      <BrandMark
        className={`${colorClass} ${markClassName || className || 'h-6 w-6'}`}
        aria-label={ariaLabel}
        role="img"
      />
    );
  }

  if (variant === 'wordmark') {
    return (
      <span
        className={`font-display font-extrabold uppercase tracking-[0.06em] select-none ${colorClass} ${textClassName || className}`}
        aria-label={ariaLabel}
      >
        FORMA
      </span>
    );
  }

  if (variant === 'stacked') {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center gap-2 ${colorClass} ${className}`}
        role="img"
        aria-label={ariaLabel}
      >
        <BrandMark className={markClassName || 'h-8 w-8'} />
        <span
          className={`font-display font-extrabold uppercase tracking-[0.06em] text-base leading-none select-none ${textClassName}`}
        >
          FORMA
        </span>
      </div>
    );
  }

  // Horizontal lockup (default)
  return (
    <div
      className={`inline-flex items-center gap-2.5 ${colorClass} ${className}`}
      role="img"
      aria-label={ariaLabel}
    >
      <BrandMark className={markClassName || 'h-6 w-6 shrink-0'} />
      <span
        className={`font-display font-extrabold uppercase tracking-[0.06em] text-xl leading-none select-none ${textClassName}`}
      >
        FORMA
      </span>
    </div>
  );
}
