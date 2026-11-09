import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Card, Button, Field } from '../components/ui';
import PublicIllustration from '../components/ui/PublicIllustration';
import EmptyState from '../components/EmptyState';
import {
  FEATURE_MIN_PLAN,
  TRAINER_FEATURES,
  getMembershipRank,
} from '../utils/membershipAccess';
import {
  AlertCircle,
  CheckCircle2,
  Dumbbell,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  XCircle,
} from '../icons';

const money = (amount) => `PKR ${Number(amount || 0).toLocaleString('en-PK')}`;

function PageShell({ children, className = '' }) {
  return <div className={`forma-public ${className}`.trim()}>{children}</div>;
}

function PageIntro({ title, children, illustration, className = '' }) {
  return (
    <header className={`forma-public__container forma-public__section forma-public__intro ${className}`.trim()}>
      <div>
        <h1 className="forma-public__title">{title}</h1>
        {children && <p className="forma-public__lead">{children}</p>}
      </div>
      {illustration && <PublicIllustration variant={illustration} />}
    </header>
  );
}

export function LandingPage() {
  return (
    <PageShell>
      <section className="forma-public__hero forma-public__container">
        <div>
          <h1 className="forma-public__title">Train with a plan. See what changes.</h1>
          <p className="forma-public__lead">
            Build workouts, log nutrition, follow your progress, and work with a personal coach in one place.
          </p>
          <div className="forma-public__actions">
            <Button as={Link} to="/register" variant="primary">Create account</Button>
            <Button as={Link} to="/features" variant="secondary">Explore the features</Button>
          </div>
        </div>
        <Card className="forma-public__preview">
          <h2 className="forma-public__surface-value">One session at a time</h2>
          <PublicIllustration variant="training" />
        </Card>
      </section>

      <section className="forma-public__container forma-public__section">
        <h2 className="forma-public__section-title">A practical system for your training week</h2>
        <ul className="forma-public__principles">
          <li>
            <PublicIllustration variant="training" className="forma-illustration--compact" />
            <h3>Plan the work</h3>
            <p>Create routines and keep exercise details together.</p>
          </li>
          <li>
            <PublicIllustration variant="nutrition" className="forma-illustration--compact" />
            <h3>Keep a record</h3>
            <p>Log workouts, meals, hydration, and activity as you go.</p>
          </li>
          <li>
            <PublicIllustration variant="progress" className="forma-illustration--compact" />
            <h3>Review what changed</h3>
            <p>Use your own history to follow progress and continue with purpose.</p>
          </li>
        </ul>
      </section>
    </PageShell>
  );
}

const featureGroups = [
  {
    title: 'Training, recorded in detail',
    description: 'Create workouts and log exercises, sets, reps, loads, and completed sessions.',
    details: ['Workout routines and library', 'Session tracking', 'GPS run tracking'],
  },
  {
    title: 'Nutrition that stays connected',
    description: 'Keep food and daily intake alongside the rest of your training record.',
    details: ['Meal and calorie logging', 'Daily calorie and water targets', 'Nutrition summaries'],
  },
  {
    title: 'Progress with context',
    description: 'Review strength benchmarks and body measurements over time.',
    details: ['Progress analytics', 'Private progress-photo journal', 'Data exports'],
  },
  {
    title: 'Coaching in your routine',
    description: 'Work with an assigned trainer, send messages, and join scheduled classes when available on your plan.',
    details: ['Trainer assignment', 'Coach messaging', 'Scheduled online classes'],
  },
];

export function FeaturesPage() {
  return (
    <PageShell>
      <PageIntro title="The parts of training, connected" illustration="coaching">
        FORMA brings the everyday work of exercise, nutrition, and progress into one fitness workspace.
      </PageIntro>
      <section className="forma-public__container forma-public__section">
        <div className="forma-public__features">
          {featureGroups.map((feature, index) => (
            <article key={feature.title} className={`forma-public__feature${index % 2 ? ' is-reversed' : ''}`}>
              <PublicIllustration variant={['training', 'nutrition', 'progress', 'coaching'][index]} />
              <div>
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>
                <ul>
                  {feature.details.map((detail) => <li key={detail}>{detail}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <div className="forma-public__actions">
          <Button as={Link} to="/register" variant="primary">Create account</Button>
          <Button as={Link} to="/memberships" variant="secondary">Compare plans</Button>
        </div>
      </section>
    </PageShell>
  );
}

export function AboutPage() {
  return (
    <PageShell>
      <PageIntro title="A clearer view of your own work" illustration="progress">
        FORMA is for people who want a structured way to train, keep useful records, and access a personal coach.
      </PageIntro>
      <section className="forma-public__container forma-public__section forma-public__grid forma-public__grid--two">
        <div>
          <h2 className="forma-public__section-title">Make the routine easier to follow</h2>
          <p>
            Training is more than a single session. FORMA brings workout planning, nutrition logs, activity, and
            progress history together so the details are easier to revisit.
          </p>
          <p>
            When your membership includes coaching, you can connect with a trainer through the tools available in
            your account.
          </p>
          <div className="forma-public__actions">
            <Button as={Link} to="/register" variant="primary">Create account</Button>
            <Button as={Link} to="/trainers" variant="secondary">Meet the trainers</Button>
          </div>
        </div>
        <Card>
          <PublicIllustration variant="coaching" />
          <h2>Built around the record</h2>
          <ul>
            <li>Plan and log workouts.</li>
            <li>Keep meals, calories, and hydration in view.</li>
            <li>Review strength and measurement progress.</li>
            <li>Use coach tools available with your account and plan.</li>
          </ul>
        </Card>
      </section>
    </PageShell>
  );
}

export function PricingPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [membership, setMembership] = useState(user?.membership || null);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    const loadPlans = async () => {
      setLoading(true);
      setError('');
      try {
        const plansResponse = await api.get('/memberships/plans');
        if (!Array.isArray(plansResponse.data?.plans)) throw new Error('Membership plans response was invalid.');
        let currentMembership = user?.membership || null;
        if (user) {
          const currentResponse = await api.get('/memberships/current');
          currentMembership = currentResponse.data.membership || null;
        }
        if (active) {
          setPlans(plansResponse.data.plans);
          setMembership(currentMembership);
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load plans.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadPlans();
    return () => { active = false; };
  }, [user]);

  const switchToFree = async () => {
    setProcessing(true);
    setError('');
    try {
      const { data } = await api.post('/memberships/purchase', {
        planSlug: 'free',
        billingInterval: 'monthly',
        paymentMethod: 'free',
      });
      setMembership(data.membership);
      updateUser((currentUser) => ({ ...currentUser, membership: data.membership }));
      setNotice(data.message || 'You are now on the Free plan.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to switch plans.');
    } finally {
      setProcessing(false);
    }
  };

  const choosePlan = (plan) => {
    const interval = annualBilling ? 'annual' : 'monthly';
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/checkout', search: `?plan=${plan.slug}&interval=${interval}` } } });
      return;
    }
    if (user.role !== 'user') {
      setError('Membership plans can only be purchased by client accounts.');
      return;
    }
    setNotice('');
    if (plan.slug === 'free') {
      switchToFree();
      return;
    }
    navigate(`/checkout?plan=${plan.slug}&interval=${interval}`);
  };

  const activePlanSlug = membership?.planSlug || 'free';
  const currentTrainer = membership?.assignedTrainer;
  const paidActive = getMembershipRank(membership) >= 1
    && membership?.endsAt
    && new Date(membership.endsAt) > new Date();
  const accessTiers = ['basic', 'elite', 'premium']
    .map((slug) => ({
      slug,
      name: plans.find((plan) => plan.slug === slug)?.name || `${slug[0].toUpperCase()}${slug.slice(1)}`,
      features: TRAINER_FEATURES.filter((feature) => FEATURE_MIN_PLAN[feature.key] === slug),
    }))
    .filter((tier) => tier.features.length > 0);

  return (
    <PageShell>
      <PageIntro title="Choose the plan that fits your training" illustration="plans" className="forma-public__intro--pricing">
        Plan details and prices below are loaded from FORMA. Compare what each active membership includes.
      </PageIntro>
      <section className="forma-public__container forma-public__section forma-public__pricing" aria-label="Membership plans">
        {user && (
          <Card className="forma-public__membership">
            <div className="forma-public__membership-mark"><ShieldCheck aria-hidden="true" /></div>
            <div>
              <p className="forma-public__surface-label">Your current plan</p>
              <h2>{membership?.planName || 'Free Starter'}</h2>
              {membership?.endsAt && <p>Renews or ends {new Date(membership.endsAt).toLocaleDateString()}.</p>}
              {currentTrainer && <p>Assigned trainer: {currentTrainer.name}</p>}
            </div>
          </Card>
        )}
        {error && <p className="forma-public__status is-error" role="alert">{error}</p>}
        {notice && <p className="forma-public__status is-success" role="status">{notice}</p>}
        {user?.role === 'user' && paidActive && !currentTrainer && (
          <p className="forma-public__status is-warning">Your plan includes a trainer. Choose one from your account when ready.</p>
        )}

        <div className="forma-public__pricing-controls">
          <div>
            <h2>Choose your billing period</h2>
            <p>Switch any time before you continue to checkout.</p>
          </div>
          <div className="forma-public__billing-switch" role="group" aria-label="Billing period">
            <Button type="button" variant={annualBilling ? 'ghost' : 'primary'} aria-pressed={!annualBilling} onClick={() => setAnnualBilling(false)}>Monthly</Button>
            <Button type="button" variant={annualBilling ? 'primary' : 'ghost'} aria-pressed={annualBilling} onClick={() => setAnnualBilling(true)}>Annual</Button>
          </div>
        </div>

        {loading ? (
          <div role="status" className="forma-public__pricing-state">
            <Loader2 aria-hidden="true" />
            <p>Loading available plans…</p>
          </div>
        ) : plans.length === 0 ? (
          <Card className="forma-public__pricing-empty" role="status">
            <PublicIllustration variant="plans" className="forma-illustration--compact" />
            <div>
              <h2>No plans to compare right now</h2>
              <p>Membership options are temporarily unavailable. Please try again later.</p>
            </div>
          </Card>
        ) : (
          <div className="forma-public__plan-grid">
            {plans.map((plan) => {
              const price = annualBilling ? plan.annualPrice : plan.monthlyPrice;
              const isCurrentPlan = activePlanSlug === plan.slug;
              const isHighlighted = Boolean(plan.highlight);
              return (
                <Card key={plan.slug} className={`forma-public__plan${isHighlighted ? ' is-highlighted' : ''}`}>
                  <div className="forma-public__plan-heading">
                    <div className="forma-public__plan-tags">
                      {plan.badge && <span className="forma-public__plan-badge">{plan.badge}</span>}
                      {isCurrentPlan && <span className="forma-public__plan-current">Current plan</span>}
                    </div>
                    <h2>{plan.name}</h2>
                    <p>{plan.description}</p>
                  </div>
                  <div className="forma-public__plan-price">
                    <p>
                      <span className="forma-public__price-amount">{money(price)}</span>
                      <span className="forma-public__price-period">{plan.slug === 'free' ? 'forever' : 'per month'}</span>
                    </p>
                    {annualBilling && plan.slug !== 'free' && (
                      <p className="forma-public__annual-total">
                        {money(price * 12)} billed yearly
                      </p>
                    )}
                  </div>
                  <ul className="forma-public__plan-features">
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <CheckCircle2 aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant={isHighlighted ? 'primary' : 'secondary'}
                    disabled={processing || isCurrentPlan}
                    onClick={() => choosePlan(plan)}
                  >
                    {processing && plan.slug === 'free' ? <Loader2 aria-hidden="true" /> : null}
                    {processing && plan.slug !== 'free' ? 'Continuing…' : isCurrentPlan ? 'Your current plan' : plan.slug === 'free' ? 'Choose free plan' : 'Continue with plan'}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
        <section className="forma-public__access" aria-labelledby="trainer-access-title">
          <div className="forma-public__access-heading">
            <h2 id="trainer-access-title">Coaching tools, tier by tier</h2>
            <p>Trainer access expands with your membership.</p>
          </div>
          <div className="forma-public__access-tiers">
            {accessTiers.map((tier) => (
              <article key={tier.slug} className="forma-public__access-tier">
                <p className="forma-public__access-from">From</p>
                <h3>{tier.name}</h3>
                <ul>
                  {tier.features.map((feature) => (
                    <li key={feature.key}>
                      <CheckCircle2 aria-hidden="true" />
                      <span>{feature.label}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="forma-public__checkout-note">Checkout in this project is simulated; no real payment is processed.</p>
        </section>
      </section>
    </PageShell>
  );
}

export function TrainerDirectoryPage() {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/trainers/directory')
      .then(({ data }) => {
        if (!data?.success || !Array.isArray(data.trainers)) throw new Error('Trainer directory response was invalid.');
        if (active) setTrainers(data.trainers);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load the trainer directory.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  return (
    <PageShell>
      <PageIntro title="Find a coach for your next chapter" illustration="coaching">
        Browse profiles of trainers approved to coach on FORMA. Profile details come from each trainer’s submitted information.
      </PageIntro>
      <section className="forma-public__container forma-public__section">
        {error && <p className="forma-public__status is-error" role="alert">{error}</p>}
        {loading ? (
          <p className="forma-public__lead" role="status">Loading approved trainer profiles…</p>
        ) : trainers.length === 0 && !error ? (
          <EmptyState type="clients" sentence="No approved trainer profiles are available to browse right now." actionLabel="Refresh trainer directory" onAction={() => setRefreshKey((value) => value + 1)} />
        ) : (
          <div className="forma-public__grid forma-public__grid--three">
            {trainers.map((trainer) => (
              <Card key={trainer.id} className="forma-public__trainer">
                <div className="forma-public__trainer-avatar">
                  {trainer.avatarUrl
                    ? <img src={trainer.avatarUrl} alt="" loading="lazy" />
                    : trainer.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}
                </div>
                <h2>{trainer.name}</h2>
                {trainer.specialization && <p className="forma-public__accent">{trainer.specialization}</p>}
                {Number.isFinite(trainer.experienceYears) && (
                  <p>{trainer.experienceYears} {trainer.experienceYears === 1 ? 'year' : 'years'} of experience listed</p>
                )}
                {trainer.bio && <p>{trainer.bio}</p>}
                {trainer.certifications && (
                  <div>
                    <p className="forma-public__surface-label">TRAINER-LISTED CERTIFICATIONS</p>
                    <p>{trainer.certifications}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
        <div className="forma-public__actions">
          <Button as={Link} to="/register" variant="primary">Create account</Button>
          <Button as={Link} to="/memberships" variant="secondary">View plans</Button>
        </div>
      </section>
    </PageShell>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedLocation = location.state?.from;
  const destinationPath = typeof requestedLocation === 'string' ? requestedLocation : requestedLocation?.pathname;
  const requestedRedirect = destinationPath?.startsWith('/') && !destinationPath.startsWith('//')
    ? `${destinationPath}${typeof requestedLocation === 'object' ? (requestedLocation.search || '') + (requestedLocation.hash || '') : ''}`
    : '/dashboard';
  const trainerDestination = (trainer) => {
    if (trainer.trainerApprovalStatus === 'approved') return '/trainer/dashboard';
    if (trainer.trainerApprovalStatus === 'awaiting_profile') return '/trainer/complete-profile';
    return null;
  };
  const redirectTo = user?.role === 'admin'
    ? '/admin/trainers'
    : user?.role === 'trainer' ? trainerDestination(user)
      : user?.profileComplete === false ? '/client/complete-profile' : requestedRedirect;

  useEffect(() => {
    if (user && redirectTo) {
      navigate(redirectTo, {
        replace: true,
        state: redirectTo === '/client/complete-profile' ? { from: requestedRedirect } : undefined,
      });
    }
  }, [user, navigate, redirectTo, requestedRedirect]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (requestError) {
      setError(requestError.message || 'Sign in failed. Check your email and password, then try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <section className="forma-public__container forma-public__section forma-public__auth-layout">
        <aside className="forma-public__auth-aside">
          <h2>Pick up with purpose</h2>
          <p>Keep sessions, progress, and coaching connected in one training record.</p>
          <PublicIllustration variant="training" />
        </aside>
        <Card className="forma-public__auth-card">
          <h1 className="forma-public__section-title">Sign in to FORMA</h1>
          <p>Pick up where your training record left off.</p>
          {user?.role === 'trainer' && !redirectTo && (
            <p className="forma-public__status is-warning" role="status">
              Your trainer profile is awaiting final administrator approval. Sign in again after it is approved.
            </p>
          )}
          {error && <p className="forma-public__status is-error" role="alert">{error}</p>}
          <form className="forma-public__form" onSubmit={submit}>
            <Field
              id="login-email"
              label="Email address"
              name="email"
              type="email"
              icon={Mail}
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <Field
              id="login-password"
              label="Password"
              name="password"
              type="password"
              icon={LockKeyhole}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? <Loader2 aria-hidden="true" /> : null}
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <p>New to FORMA? <Link to="/register">Create an account</Link></p>
        </Card>
      </section>
    </PageShell>
  );
}

export function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, register, registerTrainer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const requestedLocation = location.state?.from;
  const destinationPath = requestedLocation?.pathname;
  const requestedRedirect = destinationPath?.startsWith('/') && !destinationPath.startsWith('//')
    ? `${destinationPath}${requestedLocation.search || ''}${requestedLocation.hash || ''}`
    : '/dashboard';
  const redirectTo = user?.role === 'admin'
    ? '/admin/trainers'
    : user?.role === 'trainer' ? '/trainer/dashboard'
      : user?.profileComplete === false ? '/client/complete-profile' : requestedRedirect;
  const passwordError = password && password.length < 6 ? 'Use at least 6 characters.' : '';
  const confirmError = confirmPassword && password !== confirmPassword ? 'Passwords do not match.' : '';

  useEffect(() => {
    if (user) {
      navigate(redirectTo, {
        replace: true,
        state: redirectTo === '/client/complete-profile' ? { from: requestedRedirect } : undefined,
      });
    }
  }, [user, navigate, redirectTo, requestedRedirect]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (password.length < 6) {
      setError('Use at least 6 characters for your password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      if (accountType === 'trainer') {
        const result = await registerTrainer(name.trim(), email.trim(), password);
        setSuccess(result.message || 'Your trainer application has been submitted for review.');
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      } else {
        await register(name.trim(), email.trim(), password);
      }
    } catch (requestError) {
      setError(requestError.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <section className="forma-public__container forma-public__section forma-public__auth-layout">
        <aside className="forma-public__auth-aside">
          <h2>Start with your own routine</h2>
          <p>Track training and progress, then connect with a trainer through the tools available to your account.</p>
          <PublicIllustration variant="coaching" />
        </aside>
        <Card className="forma-public__auth-card">
          <h1 className="forma-public__section-title">Create your FORMA account</h1>
          <p>Start building a record of your training and progress.</p>
          {error && <p className="forma-public__status is-error" role="alert">{error}</p>}
          {success && <p className="forma-public__status is-success" role="status">{success}</p>}
          <form className="forma-public__form" onSubmit={submit}>
            <Field
              as="select"
              id="account-type"
              label="Account type"
              icon={Dumbbell}
              value={accountType}
              onChange={(event) => setAccountType(event.target.value)}
            >
              <option value="user">Fitness member</option>
              <option value="trainer">Apply as a trainer</option>
            </Field>
            {accountType === 'trainer' && (
              <p className="forma-public__status">
                Trainer applications go through email review, profile completion, and administrator approval.
              </p>
            )}
            <Field
              id="register-name"
              label="Full name"
              name="name"
              type="text"
              icon={UserRound}
              autoComplete="name"
              placeholder="Your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={100}
              required
            />
            <Field
              id="register-email"
              label="Email address"
              name="email"
              type="email"
              icon={Mail}
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />
            <Field
              id="register-password"
              label="Password"
              name="password"
              type="password"
              icon={LockKeyhole}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              error={passwordError}
              required
            />
            <Field
              id="register-confirm-password"
              label="Confirm password"
              name="confirmPassword"
              type="password"
              icon={LockKeyhole}
              autoComplete="new-password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              error={confirmError}
              required
            />
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? <Loader2 aria-hidden="true" /> : null}
              {submitting ? 'Creating account…' : accountType === 'trainer' ? 'Submit trainer application' : 'Create account'}
            </Button>
          </form>
          <p>Already have an account? <Link to="/login" state={{ from: requestedLocation }}>Sign in</Link></p>
        </Card>
      </section>
    </PageShell>
  );
}

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError('');
    setNotice('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/feedback/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      if (!data?.success) throw new Error(data?.message || 'Your message could not be sent.');
      setForm({ name: '', email: '', subject: '', message: '' });
      setNotice(data.message || 'Your message has been sent to the FORMA team.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to send your message right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <PageIntro title="Contact FORMA">Send a question to the team. We’ll reply to the email address you provide.</PageIntro>
      <section className="forma-public__container forma-public__section forma-public__auth-layout">
        <aside className="forma-public__auth-aside">
          <h2>Tell us what you need</h2>
          <p>Your message goes to the FORMA team, with a reply sent to the email address you provide.</p>
          <PublicIllustration variant="contact" />
        </aside>
        <Card className="forma-public__auth-card">
          <h2>Send us a message</h2>
          <p>All fields are required.</p>
          {error && <p className="forma-public__status is-error" role="alert">{error}</p>}
          {notice && <p className="forma-public__status is-success" role="status">{notice}</p>}
          <form className="forma-public__form" onSubmit={submit}>
            <Field id="contact-name" label="Name" name="name" autoComplete="name" value={form.name} onChange={update} minLength={2} maxLength={100} required />
            <Field id="contact-email" label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={update} maxLength={254} required />
            <Field id="contact-subject" label="Subject" name="subject" value={form.subject} onChange={update} maxLength={150} required />
            <Field
              as="textarea"
              id="contact-message"
              label="Message"
              name="message"
              value={form.message}
              onChange={update}
              rows={6}
              maxLength={5000}
              hint={`${form.message.length}/5000 characters`}
              required
            />
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? <Loader2 aria-hidden="true" /> : null}
              {submitting ? 'Sending…' : 'Send message'}
            </Button>
          </form>
        </Card>
      </section>
    </PageShell>
  );
}

export function TrainerEmailReviewPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const requestedAction = searchParams.get('action');
  const [decision, setDecision] = useState(['approve', 'reject'].includes(requestedAction) ? requestedAction : '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    if (!token || !decision) {
      setError('This review link is missing a valid token or decision.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/trainers/email-decision', { token, action: decision });
      setResult(data.message);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to process this trainer review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <section className="forma-public__container forma-public__section forma-public__auth-layout">
        <aside className="forma-public__auth-aside">
          <h2>Review with care</h2>
          <p>Email review, profile completion, and administrator approval are separate steps.</p>
          <PublicIllustration variant="review" />
        </aside>
        <Card className="forma-public__auth-card">
          <h1 className="forma-public__section-title">Trainer application review</h1>
          <p>
            Confirm the decision for this application. Opening the email link alone does not approve or reject it.
            After first-stage approval, the applicant can complete their profile for a separate administrator review.
          </p>
          {result ? (
            <p className="forma-public__status is-success" role="status"><CheckCircle2 aria-hidden="true" /> {result}</p>
          ) : (
            <form className="forma-public__form" onSubmit={submit}>
              {[
                ['approve', 'Approve first stage'],
                ['reject', 'Reject application'],
              ].map(([value, label]) => (
                <label key={value} className="forma-public__choice">
                  <input
                    type="radio"
                    name="trainer-decision"
                    value={value}
                    checked={decision === value}
                    onChange={() => setDecision(value)}
                  />
                  {value === 'approve' ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
                  {label}
                </label>
              ))}
              {error && <p className="forma-public__status is-error" role="alert"><AlertCircle aria-hidden="true" /> {error}</p>}
              <Button type="submit" variant="primary" disabled={submitting || !token || !decision}>
                {submitting ? <Loader2 aria-hidden="true" /> : <ShieldCheck aria-hidden="true" />}
                {submitting ? 'Saving decision…' : 'Confirm decision'}
              </Button>
            </form>
          )}
          {!token && <p className="forma-public__status is-error" role="alert">This review link is invalid because its token is missing.</p>}
          <p><Link to="/">Return to FORMA</Link></p>
        </Card>
      </section>
    </PageShell>
  );
}
