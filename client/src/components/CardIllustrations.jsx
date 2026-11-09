import React from 'react';

const Illustration = ({ className = '', children }) => (
  <svg
    viewBox="0 0 320 180"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-full h-full select-none ${className}`}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export function WorkoutIllustration({ className = '' }) {
  return (
    <Illustration className={className}>
      <rect x="34" y="24" width="252" height="132" rx="18" fill="var(--forma-bg-surface)" stroke="var(--forma-border-subtle)" />
      <path d="M92 90h136M105 75v30M118 66v48M202 66v48M215 75v30" stroke="var(--forma-brand-ember)" strokeWidth="5" strokeLinecap="round" />
      <path d="M145 58c-12 8-18 19-18 32s6 24 18 32M175 58c12 8 18 19 18 32s-6 24-18 32" stroke="var(--forma-text-secondary)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="160" cy="90" r="7" fill="var(--forma-brand-teal)" />
    </Illustration>
  );
}

export function NutritionIllustration({ className = '' }) {
  return (
    <Illustration className={className}>
      <rect x="34" y="24" width="252" height="132" rx="18" fill="var(--forma-bg-surface)" stroke="var(--forma-border-subtle)" />
      <circle cx="160" cy="91" r="48" stroke="var(--forma-text-secondary)" strokeWidth="2" />
      <circle cx="160" cy="91" r="36" stroke="var(--forma-border-subtle)" strokeWidth="2" />
      <path d="M160 55c-1-17 8-27 28-29 1 19-8 28-28 29zM160 55c3-10 9-17 18-22" stroke="var(--forma-brand-teal)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M88 64v54M80 64v17a8 8 0 0 0 16 0V64M232 64c-8 7-11 16-11 28v30M232 64v58" stroke="var(--forma-brand-ember)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Illustration>
  );
}

export function ProgressIllustration({ className = '' }) {
  return (
    <Illustration className={className}>
      <rect x="34" y="24" width="252" height="132" rx="18" fill="var(--forma-bg-surface)" stroke="var(--forma-border-subtle)" />
      <path d="M84 126h152M92 120V62M92 120l34-22 34 8 30-34 34 14" stroke="var(--forma-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M160 106V79M148 92h24M222 75l9-3-3 10" stroke="var(--forma-brand-ember)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="160" cy="106" r="6" stroke="var(--forma-brand-teal)" strokeWidth="2.5" />
      <circle cx="190" cy="72" r="5" fill="var(--forma-brand-ember)" />
    </Illustration>
  );
}

export function JournalIllustration({ className = '' }) {
  return (
    <Illustration className={className}>
      <rect x="34" y="24" width="252" height="132" rx="18" fill="var(--forma-bg-surface)" stroke="var(--forma-border-subtle)" />
      <rect x="80" y="48" width="70" height="84" rx="8" stroke="var(--forma-brand-ember)" strokeWidth="2" />
      <rect x="170" y="48" width="70" height="84" rx="8" stroke="var(--forma-brand-teal)" strokeWidth="2" />
      <circle cx="115" cy="76" r="11" stroke="var(--forma-text-secondary)" strokeWidth="2" />
      <path d="M91 119c4-17 13-25 24-25s20 8 24 25M181 119c4-17 13-25 24-25s20 8 24 25" stroke="var(--forma-text-secondary)" strokeWidth="2" strokeLinecap="round" />
      <path d="M150 90h20m-7-7 7 7-7 7" stroke="var(--forma-brand-ember)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Illustration>
  );
}
