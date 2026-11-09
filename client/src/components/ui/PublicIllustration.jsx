import React, { useEffect, useRef, useState } from 'react';

const labels = {
  training: 'Workout planning and session tracking',
  nutrition: 'Connected meal, calorie, and hydration tracking',
  progress: 'A timeline of strength and measurement records',
  coaching: 'Trainer messaging and scheduled sessions',
  trainers: 'A trainer profile with listed qualifications',
  plans: 'Training, tracking, and coaching plan access',
  review: 'Trainer application review steps',
  contact: 'A message sent to the FORMA team',
};

export default function PublicIllustration({ variant = 'training', className = '' }) {
  const illustrationRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const illustration = illustrationRef.current;
    if (!illustration) return undefined;

    let isInView = false;
    const updatePlaying = () => setIsPlaying(isInView && !document.hidden);
    if (typeof IntersectionObserver === 'undefined') {
      isInView = true;
      updatePlaying();
      document.addEventListener('visibilitychange', updatePlaying);
      return () => document.removeEventListener('visibilitychange', updatePlaying);
    }

    const observer = new IntersectionObserver(([entry]) => {
      isInView = entry.isIntersecting && entry.intersectionRatio >= 0.15;
      updatePlaying();
    }, { threshold: [0, 0.15] });

    observer.observe(illustration);
    document.addEventListener('visibilitychange', updatePlaying);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', updatePlaying);
    };
  }, []);

  return (
    <figure
      ref={illustrationRef}
      className={`forma-illustration ${className}`.trim()}
      data-playing={isPlaying ? 'true' : 'false'}
      role="img"
      aria-label={labels[variant] || labels.training}
    >
      <svg viewBox="0 0 640 420" aria-hidden="true" focusable="false">
        <rect className="forma-illustration__canvas" x="16" y="16" width="608" height="388" />
        <path className="forma-illustration__rule" d="M16 82H624" />
        <circle className="forma-illustration__ember forma-illustration__pulse" cx="52" cy="50" r="8" />
        <text className="forma-illustration__overline" x="74" y="55">FORMA / {variant.toUpperCase()}</text>
        <path className="forma-illustration__rule" d="M470 16V82" />
        <circle className="forma-illustration__teal" cx="510" cy="49" r="7" />
        <path className="forma-illustration__rule" d="M532 49h58" />

        {variant === 'training' && (
          <>
            <text className="forma-illustration__heading" x="48" y="125">Today's session</text>
            <text className="forma-illustration__muted" x="48" y="151">Routine · exercises · sets</text>
            <path className="forma-illustration__track" d="M72 207H566" />
            <path className="forma-illustration__trace" d="M72 207H566" />
            <g className="forma-illustration__float">
              <circle className="forma-illustration__node-ember" cx="126" cy="207" r="13" />
              <circle className="forma-illustration__node-teal" cx="320" cy="207" r="13" />
              <circle className="forma-illustration__node-outline" cx="514" cy="207" r="13" />
            </g>
            <text className="forma-illustration__label" x="78" y="245">Plan</text>
            <text className="forma-illustration__label" x="268" y="245">Record</text>
            <text className="forma-illustration__label" x="462" y="245">Review</text>
            <rect className="forma-illustration__surface" x="48" y="286" width="544" height="76" />
            <path className="forma-illustration__rule" d="M230 286v76M410 286v76" />
            <text className="forma-illustration__muted" x="70" y="318">WORKOUTS</text>
            <path className="forma-illustration__ember-line" d="M70 340h104" />
            <text className="forma-illustration__muted" x="252" y="318">SETS & REPS</text>
            <path className="forma-illustration__teal-line" d="M252 340h112" />
            <text className="forma-illustration__muted" x="432" y="318">HISTORY</text>
            <path className="forma-illustration__ember-line" d="M432 340h118" />
          </>
        )}

        {variant === 'nutrition' && (
          <>
            <text className="forma-illustration__heading" x="48" y="125">Daily nutrition</text>
            <text className="forma-illustration__muted" x="48" y="151">Meals and hydration, kept together</text>
            <circle className="forma-illustration__plate" cx="210" cy="265" r="102" />
            <circle className="forma-illustration__plate-inner" cx="210" cy="265" r="78" />
            <path className="forma-illustration__teal-line" d="M210 187v78h-78" />
            <path className="forma-illustration__ember-line" d="M210 265h78" />
            <g className="forma-illustration__float">
              <circle className="forma-illustration__node-ember" cx="210" cy="187" r="8" />
              <circle className="forma-illustration__node-teal" cx="288" cy="265" r="8" />
            </g>
            <rect className="forma-illustration__surface" x="382" y="191" width="190" height="52" />
            <rect className="forma-illustration__surface" x="382" y="255" width="190" height="52" />
            <rect className="forma-illustration__surface" x="382" y="319" width="190" height="52" />
            <circle className="forma-illustration__teal" cx="408" cy="217" r="6" />
            <circle className="forma-illustration__ember" cx="408" cy="281" r="6" />
            <circle className="forma-illustration__node-outline" cx="408" cy="345" r="6" />
            <text className="forma-illustration__label" x="428" y="222">Meals</text>
            <text className="forma-illustration__label" x="428" y="286">Daily targets</text>
            <text className="forma-illustration__label" x="428" y="350">Water</text>
          </>
        )}

        {variant === 'progress' && (
          <>
            <text className="forma-illustration__heading" x="48" y="125">Your record, over time</text>
            <text className="forma-illustration__muted" x="48" y="151">Strength and measurements stay in context</text>
            <path className="forma-illustration__track" d="M100 245H540" />
            <path className="forma-illustration__trace" d="M100 245H540" />
            <g className="forma-illustration__float">
              <circle className="forma-illustration__node-ember" cx="130" cy="245" r="14" />
              <circle className="forma-illustration__node-teal" cx="320" cy="245" r="14" />
              <circle className="forma-illustration__node-outline" cx="510" cy="245" r="14" />
            </g>
            <path className="forma-illustration__stem" d="M130 259v38M320 259v38M510 259v38" />
            <text className="forma-illustration__label" x="86" y="326">Strength</text>
            <text className="forma-illustration__label" x="264" y="326">Measurements</text>
            <text className="forma-illustration__label" x="468" y="326">History</text>
            <path className="forma-illustration__ember-line" d="M86 350h92M264 350h116M468 350h84" />
          </>
        )}

        {variant === 'coaching' && (
          <>
            <text className="forma-illustration__heading" x="48" y="125">Coaching in your routine</text>
            <text className="forma-illustration__muted" x="48" y="151">Messages and scheduled classes</text>
            <rect className="forma-illustration__surface" x="54" y="188" width="316" height="76" />
            <circle className="forma-illustration__teal" cx="82" cy="216" r="7" />
            <path className="forma-illustration__rule" d="M104 212h220M104 232h168" />
            <rect className="forma-illustration__surface" x="270" y="278" width="316" height="76" />
            <circle className="forma-illustration__ember" cx="300" cy="306" r="7" />
            <path className="forma-illustration__rule" d="M322 302h230M322 322h178" />
            <g className="forma-illustration__float">
              <circle className="forma-illustration__node-teal" cx="144" cy="303" r="5" />
              <circle className="forma-illustration__node-ember" cx="178" cy="303" r="5" />
              <circle className="forma-illustration__node-outline" cx="212" cy="303" r="5" />
            </g>
          </>
        )}

        {variant === 'trainers' && (
          <>
            <text className="forma-illustration__heading" x="48" y="125">Trainer profile</text>
            <text className="forma-illustration__muted" x="48" y="151">Approved profiles use trainer-listed details</text>
            <rect className="forma-illustration__surface" x="64" y="185" width="512" height="172" />
            <circle className="forma-illustration__portrait" cx="154" cy="263" r="48" />
            <circle className="forma-illustration__portrait-detail" cx="154" cy="247" r="14" />
            <path className="forma-illustration__portrait-detail" d="M126 292c5-18 17-27 28-27s23 9 28 27" />
            <path className="forma-illustration__rule" d="M232 221h282M232 246h206M232 284h250" />
            <text className="forma-illustration__muted" x="232" y="312">SPECIALTY · EXPERIENCE · CERTIFICATIONS</text>
            <g className="forma-illustration__float">
              <circle className="forma-illustration__node-teal" cx="520" cy="312" r="8" />
            </g>
          </>
        )}

        {variant === 'plans' && (
          <>
            <text className="forma-illustration__heading" x="48" y="125">Tools for your training</text>
            <text className="forma-illustration__muted" x="48" y="151">Compare membership access before you choose</text>
            <path className="forma-illustration__track" d="M96 204v138" />
            <path className="forma-illustration__trace" d="M96 204v138" />
            <g className="forma-illustration__float">
              <circle className="forma-illustration__node-ember" cx="96" cy="220" r="9" />
              <circle className="forma-illustration__node-teal" cx="96" cy="273" r="9" />
              <circle className="forma-illustration__node-outline" cx="96" cy="326" r="9" />
            </g>
            <rect className="forma-illustration__surface" x="136" y="194" width="418" height="52" />
            <rect className="forma-illustration__surface" x="136" y="247" width="418" height="52" />
            <rect className="forma-illustration__surface" x="136" y="300" width="418" height="52" />
            <text className="forma-illustration__label" x="164" y="226">Training</text>
            <text className="forma-illustration__label" x="164" y="279">Tracking</text>
            <text className="forma-illustration__label" x="164" y="332">Coaching</text>
            <path className="forma-illustration__ember-line" d="M420 220h96" />
            <path className="forma-illustration__teal-line" d="M365 273h151" />
            <path className="forma-illustration__ember-line" d="M310 326h206" />
          </>
        )}

        {variant === 'review' && (
          <>
            <text className="forma-illustration__heading" x="48" y="125">A considered review</text>
            <text className="forma-illustration__muted" x="48" y="151">Each application moves through clear steps</text>
            <path className="forma-illustration__track" d="M112 238H528" />
            <path className="forma-illustration__trace" d="M112 238H528" />
            <g className="forma-illustration__float">
              <circle className="forma-illustration__node-ember" cx="132" cy="238" r="14" />
              <circle className="forma-illustration__node-teal" cx="320" cy="238" r="14" />
              <circle className="forma-illustration__node-outline" cx="508" cy="238" r="14" />
            </g>
            <text className="forma-illustration__label" x="76" y="285">Email review</text>
            <text className="forma-illustration__label" x="266" y="285">Profile setup</text>
            <text className="forma-illustration__label" x="450" y="285">Admin review</text>
            <text className="forma-illustration__muted" x="100" y="337">Confirm</text>
            <text className="forma-illustration__muted" x="300" y="337">Complete</text>
            <text className="forma-illustration__muted" x="487" y="337">Approve</text>
          </>
        )}

        {variant === 'contact' && (
          <>
            <text className="forma-illustration__heading" x="48" y="125">A clear line to the team</text>
            <text className="forma-illustration__muted" x="48" y="151">Send a question; replies go to your email</text>
            <rect className="forma-illustration__surface" x="58" y="190" width="350" height="72" />
            <circle className="forma-illustration__teal" cx="88" cy="226" r="8" />
            <path className="forma-illustration__rule" d="M116 216h254M116 238h200" />
            <rect className="forma-illustration__surface" x="232" y="282" width="350" height="72" />
            <circle className="forma-illustration__ember" cx="264" cy="318" r="8" />
            <path className="forma-illustration__rule" d="M292 308h248M292 330h174" />
            <path className="forma-illustration__trace" d="M438 226c46 0 42 92 84 92" />
          </>
        )}
      </svg>
    </figure>
  );
}
