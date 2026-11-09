import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogIn, Mail, Lock, AlertCircle, Loader2, Dumbbell, Utensils, TrendingUp } from '../icons';
import PasswordField from '../components/PasswordField';
import BrandMark from '../components/BrandMark';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user, login } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const location = useLocation();
  const navigate = useNavigate();
  const requestedLocation = location.state?.from;
  const destinationPath = typeof requestedLocation === 'string'
    ? requestedLocation
    : requestedLocation?.pathname;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    { label: 'Track Workouts', Icon: Dumbbell },
    { label: 'Nutrition Guidance', Icon: Utensils },
    { label: 'Progress Analytics', Icon: TrendingUp },
  ];

  return (
    <section className="relative isolate flex min-h-[68vh] flex-1 items-center overflow-hidden bg-[var(--bg)] px-1 py-0 sm:px-2 sm:py-3">
      <div className="relative mx-auto min-h-[540px] w-full max-w-[1090px] overflow-hidden rounded-xl border border-[var(--border)] sm:rounded-2xl lg:min-h-[min(80vh,530px)]">
        <img
          src="/images/login-hero.jpg"
          alt="Strength training equipment in a modern gym"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/80" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />

        <div className="relative z-10 grid min-h-[540px] items-center gap-8 px-8 py-10 sm:px-12 lg:min-h-[min(80vh,530px)] lg:grid-cols-[1.12fr_0.88fr] lg:gap-5 lg:px-16 xl:px-20">
          <div className="kt-auth-visual flex min-w-0 flex-col justify-between self-stretch py-2 sm:py-4">
            <div className="max-w-lg">
              <p className="hero-enter inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.2em] text-[#FFFFFF]/90 sm:text-[10px]" style={{ animationDelay: '60ms' }}>
                <Dumbbell className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
                Train with purpose
              </p>
              <h1 className="mt-3 text-[1.65rem] font-medium leading-[1.02] tracking-tight text-[#FFFFFF] sm:mt-4 sm:text-4xl lg:text-[2.65rem] xl:text-5xl">
                <span className="hero-enter block" style={{ animationDelay: '120ms' }}>Stronger starts</span>
                <span className="hero-enter block text-[var(--primary)]" style={{ animationDelay: '250ms' }}>Right here.</span>
              </h1>
              <p className="hero-enter mt-3 max-w-sm text-sm leading-relaxed text-[#FFFFFF]/90 sm:mt-4 sm:text-base" style={{ animationDelay: '380ms' }}>
                Your training, nutrition, and progress—all in one place.
              </p>
            </div>

            <div className="mt-9 max-w-[500px] sm:mt-11">
              <span aria-hidden="true" className="mb-5 block h-[2px] w-16 bg-[var(--primary)]" />
              <div className="grid grid-cols-3 gap-3 sm:gap-6">
                {features.map(({ label, Icon }, index) => (
                  <div key={label} className="group flex min-w-0 flex-col items-center gap-2 text-center" style={{ animationDelay: `${580 + index * 100}ms` }}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--primary)] bg-black/35 text-[#FFFFFF] transition-colors duration-180 group-hover:bg-[var(--primary-soft)] group-hover:text-[var(--primary)] sm:h-[52px] sm:w-[52px]">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                    </span>
                    <span className="max-w-[8rem] text-[10px] font-medium leading-snug text-[#FFFFFF] sm:text-xs">{label}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 text-[#FFFFFF]">
                <span className="relative -rotate-6 font-serif text-sm italic sm:text-base">
                  Your Fitness Journey
                  <span aria-hidden="true" className="absolute -bottom-2 left-0 h-[3px] w-full -rotate-3 rounded-full bg-[var(--primary)]" />
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center lg:pl-2">
            <section className={`w-full max-w-[350px] rounded-xl px-5 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-6 sm:py-6 ${isLight ? 'bg-white/25' : 'bg-white/5'}`} aria-label="Sign in">
              <div className="mb-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--forma-border-subtle,#262B30)] bg-[var(--forma-bg-surface-raised,#1D2124)] text-[var(--forma-text-primary,#F4F5F6)]">
                    <BrandMark className="h-6 w-6 text-current" />
                  </span>
                  <span className="font-display text-xl font-bold uppercase tracking-[0.06em] text-white">
                    FORMA
                  </span>
                </div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--forma-brand-ember,#FF6B47)]">Welcome back</p>
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-[1.7rem]">Sign in</h2>
                <p className="mt-1 text-xs leading-relaxed text-white sm:text-sm">Access your FORMA account and keep moving forward.</p>
                {user?.role === 'trainer' && !redirectTo && (
                  <p role="status" className="mt-3 text-sm text-amber-200">
                    Your trainer profile is awaiting final administrator approval. Sign in again after it is approved.
                  </p>
                )}
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-300">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                    <input
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      autoComplete="email"
                      style={{ paddingLeft: '2.75rem', paddingRight: '1rem' }}
                      className={`w-full !pl-11 !pr-4 rounded-xl border py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
                        isLight
                          ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)]'
                          : 'border-white/10 bg-black/40 text-white placeholder-[var(--muted)]'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                    Password
                  </label>
                  <PasswordField
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    leadingIcon={Lock}
                    leadingIconClassName="text-[var(--muted)]"
                    className={`w-full rounded-xl border py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
                      isLight
                        ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)]'
                        : 'border-white/10 bg-black/40 text-white placeholder-[var(--muted)]'
                    }`}
                    toggleClassName="text-[var(--muted)] hover:text-[var(--text)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-3.5 text-sm font-semibold tracking-wide text-[var(--on-primary)] transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5">
                <div className="mb-4 flex items-center gap-3 text-[10px] text-[var(--muted)]">
                  <span className="h-px flex-1 bg-white/15" />
                  OR
                  <span className="h-px flex-1 bg-white/15" />
                </div>
                <p className="text-center text-[11px] text-white">
                  Don&apos;t have an account yet?{' '}
                  <Link to="/register" state={{ from: requestedLocation }} className="font-semibold text-[var(--primary)] hover:underline">
                    Create an account
                  </Link>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
