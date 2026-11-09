import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserPlus, User, Mail, Lock, AlertCircle, Loader2, Dumbbell, CheckCircle2, ShieldCheck } from '../icons';
import PasswordField from '../components/PasswordField';
import BrandMark from '../components/BrandMark';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { user, register, registerTrainer } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
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

  useEffect(() => {
    if (user) {
      navigate(redirectTo, {
        replace: true,
        state: redirectTo === '/client/complete-profile' ? { from: requestedRedirect } : undefined,
      });
    }
  }, [user, navigate, redirectTo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
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
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClassName = `w-full rounded-xl border py-3 !pl-11 !pr-4 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
    isLight
      ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)]'
      : 'border-white/10 bg-black/40 text-white placeholder-[var(--muted)]'
  }`;
  const passwordClassName = `w-full rounded-xl border py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
    isLight
      ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)] placeholder-[var(--muted)]'
      : 'border-white/10 bg-black/40 text-white placeholder-[var(--muted)]'
  }`;
  const labelClassName = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--text)]';

  return (
    <section className="relative isolate flex flex-1 items-center overflow-hidden bg-[var(--bg)] px-1 py-0 sm:px-2 sm:py-3">
      <div className="relative mx-auto min-h-[540px] w-full max-w-[1090px] overflow-hidden rounded-xl border border-[var(--border)] sm:rounded-2xl">

        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/80" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/15" />

        <div className="relative z-10 grid min-h-[540px] items-center gap-8 px-5 py-8 sm:px-10 sm:py-10 lg:grid-cols-[1.12fr_0.88fr] lg:gap-5 lg:px-14 xl:px-16">
          <div className="kt-auth-visual hidden min-w-0 flex-col justify-center py-2 sm:py-4 lg:flex">
            <div className="max-w-lg">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/35 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.2em] text-[#FFFFFF]/90 sm:text-[10px]">
                <Dumbbell className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
                Train with purpose
              </p>
              <h1 className="mt-3 text-[1.65rem] font-medium leading-[1.02] tracking-tight text-[#FFFFFF] sm:mt-4 sm:text-4xl lg:text-[2.65rem] xl:text-5xl">
                <span className="block">Stronger starts</span>
                <span className="block text-[var(--primary)]">Right here.</span>
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#FFFFFF]/90 sm:mt-4 sm:text-base">
                Create your Kinetide account and bring your training, nutrition, and progress together.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center lg:pl-2">
            <section className={`w-full max-w-[390px] rounded-xl px-5 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:px-6 sm:py-6 ${isLight ? 'border border-white/30 bg-white/25' : 'bg-white/5'}`} aria-label="Create account">
              <div className="mb-5">
                <div className="mb-3 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--primary)] text-[var(--primary)]">
                    <BrandMark className="h-6 w-6" />
                  </span>
                  <span className="font-display text-xl font-medium tracking-tight text-white">
                    Kinetide
                  </span>
                </div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)]">Join Kinetide</p>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-[1.7rem]">Create Account</h2>
                <p className={`mt-1 text-xs leading-relaxed text-white sm:text-sm`}>Join Kinetide to build a rhythm that lasts</p>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm text-rose-700">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <span>{success}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="account-type" className={labelClassName}>Account type</label>
                  <select
                    id="account-type"
                    value={accountType}
                    onChange={(event) => setAccountType(event.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[var(--primary)] ${
                      isLight ? 'border-[var(--border)] bg-[var(--surface)] text-[var(--text)]' : 'border-white/10 bg-black/40 text-white'
                    }`}
                  >
                    <option value="user" className="text-[var(--text)] bg-[var(--surface)]">Fitness member</option>
                    <option value="trainer" className="text-[var(--text)] bg-[var(--surface)]">Apply as a trainer</option>
                  </select>
                  {accountType === 'trainer' && (
                    <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-[var(--muted)]">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                      First, the administrator reviews your application by email. After approval, sign in to complete your profile; trainer-panel access starts after the administrator approves that profile.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="register-name" className={labelClassName}>Full Name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                    <input
                      id="register-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                      autoComplete="name"
                      style={{ paddingLeft: '2.75rem', paddingRight: '1rem' }}
                      className={fieldClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-email" className={labelClassName}>Email Address</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden="true" />
                    <input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      autoComplete="email"
                      style={{ paddingLeft: '2.75rem', paddingRight: '1rem' }}
                      className={fieldClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-password" className={labelClassName}>Password</label>
                  <PasswordField
                    id="register-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    minLength={6}
                    autoComplete="new-password"
                    leadingIcon={Lock}
                    leadingIconClassName="text-[var(--muted)]"
                    className={passwordClassName}
                    toggleClassName="text-[var(--muted)] hover:text-[var(--text)]"
                  />
                </div>

                <div>
                  <label htmlFor="register-confirm-password" className={labelClassName}>Confirm Password</label>
                  <PasswordField
                    id="register-confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    leadingIcon={CheckCircle2}
                    leadingIconClassName="text-[var(--muted)]"
                    className={passwordClassName}
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
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      {accountType === 'trainer' ? 'Apply as Trainer' : 'Register Now'}
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 text-center text-[11px] text-white">
                Already have an account?{' '}
                <Link to="/login" state={{ from: requestedLocation }} className="font-semibold text-[var(--primary)] hover:underline">
                  Sign in here
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
