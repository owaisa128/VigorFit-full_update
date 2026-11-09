import { useEffect, useRef, useState } from 'react';

const HOVER_TARGETS = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[tabindex]:not([tabindex="-1"])',
  '[onclick]',
  '.cursor-pointer',
  '[data-cursor-hover]',
].join(', ');

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const primaryRef = useRef(null);
  const trailRef = useRef(null);

  useEffect(() => {
    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateEnabled = () => setEnabled(pointerQuery.matches && !motionQuery.matches);

    updateEnabled();
    pointerQuery.addEventListener('change', updateEnabled);
    motionQuery.addEventListener('change', updateEnabled);
    return () => {
      pointerQuery.removeEventListener('change', updateEnabled);
      motionQuery.removeEventListener('change', updateEnabled);
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      document.documentElement.classList.remove('vf-custom-cursor-enabled');
      return undefined;
    }

    document.documentElement.classList.add('vf-custom-cursor-enabled');
    const position = { x: -100, y: -100 };
    const target = { x: -100, y: -100 };
    const trail = { x: -100, y: -100 };
    let animationFrame = 0;

    const animate = () => {
      position.x += (target.x - position.x) * 0.42;
      position.y += (target.y - position.y) * 0.42;
      trail.x += (target.x - trail.x) * 0.18;
      trail.y += (target.y - trail.y) * 0.18;

      if (primaryRef.current) {
        primaryRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
      }
      if (trailRef.current) {
        trailRef.current.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0)`;
      }

      if (Math.abs(target.x - position.x) + Math.abs(target.y - position.y) > 0.1
        || Math.abs(target.x - trail.x) + Math.abs(target.y - trail.y) > 0.1) {
        animationFrame = window.requestAnimationFrame(animate);
      } else {
        animationFrame = 0;
      }
    };

    const handlePointerMove = (event) => {
      if (event.pointerType === 'touch') return;
      target.x = event.clientX;
      target.y = event.clientY;
      if (animationFrame === 0) animationFrame = window.requestAnimationFrame(animate);

      const isHovering = event.target instanceof Element
        && Boolean(event.target.closest(HOVER_TARGETS));
      primaryRef.current?.classList.toggle('vf-cursor-hovering', isHovering);
      trailRef.current?.classList.toggle('vf-cursor-hovering', isHovering);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.cancelAnimationFrame(animationFrame);
      document.documentElement.classList.remove('vf-custom-cursor-enabled');
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="vf-cursor-layer" aria-hidden="true">
      <div ref={trailRef} className="vf-cursor-trail" />
      <div ref={primaryRef} className="vf-cursor-core" />
    </div>
  );
}
