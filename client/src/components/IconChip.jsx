import React from 'react';

const tones = new Set(['workout', 'cardio', 'nutrition', 'hydration', 'milestone']);

export default function IconChip({ icon: Icon, tone = 'workout', size = 20, className = '' }) {
  if (!Icon) throw new Error('IconChip requires an icon component.');
  if (!tones.has(tone)) throw new Error(`Unsupported icon tone: ${tone}`);

  return (
    <span
      className={`vf-icon-chip inline-flex shrink-0 items-center justify-center ${className}`.trim()}
      data-tone={tone}
      aria-hidden="true"
    >
      <Icon size={size} />
    </span>
  );
}
