import React, { useState } from 'react';

const accents = ['workout', 'cardio', 'hydration', 'milestone', 'success'];

function initialsFor(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts.slice(0, 2).map((part) => Array.from(part)[0]).join('').toLocaleUpperCase();
}

function accentFor(name) {
  let hash = 0;
  for (const character of String(name || '')) {
    hash = (hash * 31 + character.codePointAt(0)) >>> 0;
  }
  return accents[hash % accents.length];
}

export default function InitialsAvatar({ name, avatarUrl, className = '', size = 64 }) {
  const [failedUrl, setFailedUrl] = useState('');
  const hasPhoto = Boolean(avatarUrl) && failedUrl !== avatarUrl;
  const accent = accentFor(name);

  return (
    <span
      className={`vf-initials-avatar ${className}`.trim()}
      style={{ '--avatar-accent': `var(--${accent})`, width: size, height: size }}
      role="img"
      aria-label={`${name || 'Trainer'}${hasPhoto ? ' profile photo' : ' initials'}`}
    >
      {hasPhoto ? (
        <img src={avatarUrl} alt="" onError={() => setFailedUrl(avatarUrl)} />
      ) : (
        <span aria-hidden="true">{initialsFor(name)}</span>
      )}
    </span>
  );
}
