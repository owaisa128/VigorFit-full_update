import React from 'react';
import IconChip from './IconChip';

export default function StatCard({ label, value, unit, icon, tone = 'nutrition', detail }) {
  return (
    <article className="vf-stat-card">
      <div className="vf-stat-card-heading">
        <IconChip icon={icon} tone={tone} />
        <h3>{label}</h3>
      </div>
      <p className="vf-stat-card-value">
        {value}
        {unit && <span>{unit}</span>}
      </p>
      {detail && <p className="vf-secondary">{detail}</p>}
    </article>
  );
}
