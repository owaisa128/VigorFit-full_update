import React, { useId } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  Dumbbell,
  LayoutDashboard,
  MessageCircle,
  UserRound,
} from 'lucide-react';
import './components.css';

const buttonVariants = new Set(['primary', 'secondary', 'ghost']);

export function Button({
  as: Element = 'button',
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) {
  const safeVariant = buttonVariants.has(variant) ? variant : 'primary';
  const nativeButtonProps = Element === 'button' ? { type } : {};
  return (
    <Element
      {...props}
      {...nativeButtonProps}
      className={`forma-button forma-button--${safeVariant} ${className}`.trim()}
    />
  );
}

export function Card({ as: Element = 'article', className = '', ...props }) {
  return <Element {...props} className={`forma-card ${className}`.trim()} />;
}

export function Field({
  as: Element = 'input',
  id,
  label,
  hint,
  error,
  success,
  icon,
  children,
  className = '',
  ...inputProps
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const message = error || success || hint;
  const messageId = message ? `${fieldId}-message` : undefined;
  const Icon = icon;
  const controlProps = {
    ...inputProps,
    id: fieldId,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': messageId,
    className: `forma-field__input${Icon ? ' has-icon' : ''}${Element === 'select' ? ' forma-field__input--select' : ''}${error ? ' is-error' : ''}${success && !error ? ' is-success' : ''}`,
  };

  return (
    <div className={`forma-field${Element === 'select' ? ' forma-field--select' : ''} ${className}`.trim()}>
      <label className="forma-field__label" htmlFor={fieldId}>{label}</label>
      <div className={`forma-field__control${Element === 'select' ? ' forma-field__control--select' : ''}`}>
        {Icon && (
          <span className="forma-field__icon" aria-hidden="true">
            <Icon />
          </span>
        )}
        {Element === 'input' ? (
          <Element {...controlProps} />
        ) : (
          <Element {...controlProps}>{children}</Element>
        )}
      </div>
      {message && (
        <p
          id={messageId}
          className={`forma-field__message${error ? ' is-error' : ''}${success && !error ? ' is-success' : ''}`}
          role={error ? 'alert' : undefined}
        >
          {message}
        </p>
      )}
    </div>
  );
}

const destinations = [
  { label: 'Dashboard', to: '/dashboard', Icon: LayoutDashboard },
  { label: 'Train', to: '/workouts', Icon: Dumbbell },
  { label: 'Track', to: '/workout-tracker', Icon: Activity },
  { label: 'Coach', to: '/my-trainer', Icon: MessageCircle },
  { label: 'Profile', to: '/profile', Icon: UserRound },
];

const publicDestinations = [
  { label: 'Home', to: '/' },
  { label: 'Features', to: '/features' },
  { label: 'Pricing', to: '/memberships' },
  { label: 'Trainers', to: '/trainers' },
  { label: 'About', to: '/about' },
];

export function PrimaryNavigation({ publicMode = false }) {
  if (publicMode) {
    return (
      <nav className="forma-navigation forma-navigation--public" aria-label="Public navigation">
        {publicDestinations.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `forma-navigation__link${isActive ? ' is-active' : ''}`}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <nav className="forma-navigation" aria-label="Primary">
      {destinations.map(({ label, to, Icon }) => (
        <NavLink
          key={label}
          to={to}
          end={to === '/dashboard'}
          className={({ isActive }) => `forma-navigation__link${isActive ? ' is-active' : ''}`}
        >
          <Icon className="forma-navigation__icon" aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function MessageBubble({
  children,
  variant = 'received',
  sender,
  timestamp,
  timestampLabel,
  className = '',
}) {
  const isSent = variant === 'sent';
  return (
    <article
      className={`forma-message forma-message--${isSent ? 'sent' : 'received'} ${className}`.trim()}
      aria-label={sender || (isSent ? 'Your message' : 'Coach message')}
    >
      {!isSent && sender && <p className="forma-message__sender">{sender}</p>}
      <p className="forma-message__content">{children}</p>
      {timestamp && <time className="forma-message__time" dateTime={timestamp}>{timestampLabel || timestamp}</time>}
    </article>
  );
}
