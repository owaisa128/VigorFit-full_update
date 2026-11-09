import React from 'react';

/**
 * FORMA Abstract Monogram:
 * A single-color mark built from three ascending horizontal bars,
 * the top bar extended into an upward momentum stroke.
 * Reads simultaneously as:
 * 1) A bar chart (progress / tracking metrics)
 * 2) A stylized letter "F"
 * 3) An athletic figure mid-stride
 *
 * Strict single flat fill (no gradients, no glow, no shadow).
 * Grid-aligned for high contrast and razor sharpness at 24×24px.
 */
export default function BrandMark({ className = '', ...props }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M 3.5 20.5 L 3.5 3.5 L 16.5 3.5 L 20.5 1.5 L 19 6 L 16.5 6 L 6.5 6 L 6.5 10 L 14.5 10 L 14.5 13.2 L 6.5 13.2 L 6.5 17.3 L 10.2 17.3 L 10.2 20.5 Z" />
    </svg>
  );
}
