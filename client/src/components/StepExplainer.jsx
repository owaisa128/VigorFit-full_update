import React from 'react';

export default function StepExplainer({ steps, label = 'How it works' }) {
  return (
    <ol className="vf-steps" aria-label={label}>
      {steps.map(({ title, description, Icon }, index) => (
        <li className="vf-step" key={title}>
          <span className="vf-step-number">{index + 1}</span>
          <span className="vf-step-icon">
            <Icon aria-hidden="true" />
          </span>
          <h3>{title}</h3>
          <p className="vf-secondary">{description}</p>
        </li>
      ))}
    </ol>
  );
}
