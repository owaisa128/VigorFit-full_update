import React from 'react';
import { Moon, Sun } from '../icons';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ compact = false, vertical = false }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`vf-theme-toggle ${compact ? 'vf-theme-toggle-compact' : ''} ${vertical ? 'vf-theme-toggle-vertical' : ''}`} role="group" aria-label="Color theme">
      <button
        type="button"
        className={`vf-theme-option ${theme === 'light' ? 'is-active' : ''}`}
        onClick={() => setTheme('light')}
        aria-pressed={theme === 'light'}
        aria-label="Light theme"
        title="Light theme"
      >
        <Sun aria-hidden="true" />
        {!compact && <span>Light</span>}
      </button>
      <button
        type="button"
        className={`vf-theme-option ${theme === 'dark' ? 'is-active' : ''}`}
        onClick={() => setTheme('dark')}
        aria-pressed={theme === 'dark'}
        aria-label="Dark theme"
        title="Dark theme"
      >
        <Moon aria-hidden="true" />
        {!compact && <span>Dark</span>}
      </button>
    </div>
  );
}
