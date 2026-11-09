import React, { useState } from 'react';
import { Eye, EyeOff } from '../icons';

export default function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  required = true,
  minLength,
  autoComplete,
  leadingIcon: LeadingIcon,
  leadingIconClassName = 'text-[var(--muted)]',
  className = '',
  toggleClassName = '',
  style = {},
}) {
  const [visible, setVisible] = useState(false);
  const VisibilityIcon = visible ? EyeOff : Eye;

  return (
    <div className="relative w-full">
      {LeadingIcon && (
        <LeadingIcon
          className={`pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 shrink-0 ${leadingIconClassName}`}
          aria-hidden="true"
        />
      )}
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        style={{
          paddingLeft: LeadingIcon ? '2.75rem' : '1rem',
          paddingRight: '2.75rem',
          ...style,
        }}
        className={`${className} ${LeadingIcon ? '!pl-11' : '!pl-4'} !pr-11`.trim()}
      />
      <VisibilityIcon
        type="button"
        onClick={() => setVisible((current) => !current)}
        onMouseDown={(event) => event.preventDefault()}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        tabIndex={-1}
        className="h-4 w-5 absolute inset-y-0 right-2 my-auto cursor-pointer shrink-0" aria-hidden="true" />
    </div>
  );
}
