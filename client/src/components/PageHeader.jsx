import React from 'react';

const elements = {
  div: 'div',
  header: 'header',
  section: 'section',
};

export default function PageHeader({
  as = 'header',
  title,
  subtitle,
  icon: Icon,
  children,
  className = '',
}) {
  const Element = elements[as];
  if (!Element) throw new Error(`Unsupported page header element: ${as}`);

  return (
    <Element className={`vf-page-header ${className}`.trim()}>
      {title && (
        <div className="vf-page-header-copy">
          <h1>{title}</h1>
          {subtitle && <p className="vf-secondary">{subtitle}</p>}
        </div>
      )}
      {Icon && (
        <span className="vf-page-header-icon" aria-hidden="true">
          <Icon size={24} />
        </span>
      )}
      {children}
    </Element>
  );
}
