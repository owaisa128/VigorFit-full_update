import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui';

const illustrations = {
  workouts: (
    <>
      <path d="M62 60h36M56 49v22M104 49v22" />
      <rect x="44" y="42" width="12" height="36" rx="4" />
      <rect x="104" y="42" width="12" height="36" rx="4" />
    </>
  ),
  meals: (
    <>
      <path d="M44 62h72c0 18-15 30-36 30S44 80 44 62z" />
      <path d="M80 58c-1-14 6-22 20-24 1 14-6 22-20 24zM80 58c2-8 6-13 12-17" />
    </>
  ),
  clients: (
    <>
      <circle cx="64" cy="48" r="10" />
      <path d="M44 88c0-12 9-20 20-20s20 8 20 20" />
      <circle cx="108" cy="46" r="14" />
      <path d="M108 39v14M101 46h14" />
    </>
  ),
  messages: (
    <>
      <path d="M48 38h64a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H78L62 90V76H48a6 6 0 0 1-6-6V44a6 6 0 0 1 6-6z" />
      <circle cx="66" cy="57" r="3.5" />
      <circle cx="80" cy="57" r="3.5" />
      <circle cx="94" cy="57" r="3.5" />
    </>
  ),
  membership: (
    <>
      <path d="M48 40h64v48H48zM60 40v48M100 40v48" />
      <circle cx="80" cy="64" r="8" />
    </>
  ),
  notifications: (
    <>
      <path d="M58 80h44l-6-9V57a16 16 0 0 0-32 0v14zM75 87a5 5 0 0 0 10 0" />
    </>
  ),
  water: (
    <>
      <path d="M80 30S55 58 55 74a25 25 0 0 0 50 0c0-16-25-44-25-44zM68 73c0 8 5 13 12 13 3 0 6-1 8-3-7 0-13-4-16-10z" />
    </>
  ),
  progress: (
    <>
      <path d="M46 88V42M46 88h68M58 88V66h12v22M78 88V54h12v34M98 88V42h12v46" />
    </>
  ),
};

export default function EmptyState({
  type = 'workouts',
  sentence,
  title,
  description,
  actionLabel,
  to,
  onAction,
  className = '',
}) {
  const illustrationRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const element = illustrationRef.current;
    if (!element) return undefined;

    let isInView = false;
    const updateAnimation = () => setIsAnimating(isInView && document.visibilityState === 'visible');
    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
        isInView = entry.isIntersecting;
        updateAnimation();
      }, { threshold: 0.1 });

    if (observer) observer.observe(element);
    else isInView = true;

    document.addEventListener('visibilitychange', updateAnimation);
    updateAnimation();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updateAnimation);
    };
  }, []);

  const illustrationKey = illustrations[type] ? type : 'workouts';
  const humanSentence = (typeof sentence === 'string' && sentence.trim())
    || (typeof description === 'string' && description.trim())
    || (typeof title === 'string' && title.trim())
    || 'Get started by creating your first entry.';

  const resolvedActionLabel = actionLabel || (to ? 'Get started' : 'Refresh');

  const action = to
    ? <Button as={Link} to={to} variant="primary">{resolvedActionLabel}</Button>
    : <Button type="button" variant="primary" onClick={onAction || (() => window.location.reload())}>{resolvedActionLabel}</Button>;

  return (
    <section className={`vf-empty${isAnimating ? ' is-animating' : ''} ${className}`.trim()}>
      <svg ref={illustrationRef} className="vf-empty-illustration" viewBox="0 0 160 120" aria-hidden="true">
        <circle cx="80" cy="56" r="46" />
        {illustrations[illustrationKey]}
      </svg>
      <p className="vf-empty-sentence">{humanSentence}</p>
      {action}
    </section>
  );
}
