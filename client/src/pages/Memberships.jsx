import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Check,
  Crown,
  Dumbbell,
  Loader2,
  Minus,
  Sparkles,
  TrendingUp,
  UserRound,
} from '../icons';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import StepExplainer from '../components/StepExplainer';
import EmptyState from '../components/EmptyState';
import { FEATURE_MIN_PLAN, PLAN_RANK, TRAINER_FEATURES, getMembershipRank } from '../utils/membershipAccess';

const money = (amount) => `PKR ${Number(amount || 0).toLocaleString('en-PK')}`;
const TIERS = [
  { slug: 'basic', label: 'Basic' },
  { slug: 'elite', label: 'Elite' },
  { slug: 'premium', label: 'Premium' },
];

export default function Memberships() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [membership, setMembership] = useState(user?.membership || null);
  const [annualBilling, setAnnualBilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadMembershipData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const plansResponse = await api.get('/memberships/plans');
      if (!Array.isArray(plansResponse.data?.plans)) throw new Error('Membership plans response was invalid.');
      setPlans(plansResponse.data.plans);
      if (user) {
        const currentResponse = await api.get('/memberships/current');
        setMembership(currentResponse.data.membership || null);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load plans.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMembershipData();
  }, [loadMembershipData]);

  const switchToFree = async () => {
    setProcessing(true);
    setError('');
    try {
      const { data } = await api.post('/memberships/purchase', { planSlug: 'free', billingInterval: 'monthly', paymentMethod: 'free' });
      setMembership(data.membership);
      updateUser((currentUser) => ({ ...currentUser, membership: data.membership }));
      setNotice(data.message || 'You are now on the Free plan.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to switch plans.');
    } finally {
      setProcessing(false);
    }
  };

  const handleChoosePlan = (plan) => {
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
  const paidActive = getMembershipRank(membership) >= 1 && membership?.endsAt && new Date(membership.endsAt) > new Date();

  return (
    <main className="memberships-page min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <section className="relative isolate overflow-hidden px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
        <div className="relative z-10 mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/30 bg-[var(--surface)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
            <Crown className="h-3.5 w-3.5 text-[var(--primary)]" />Membership plans
          </div>
          <h1 className="mt-6 text-4xl font-black uppercase tracking-tight sm:text-5xl text-[var(--text)]">
            Choose your <span className="text-[var(--primary)]">fitness plan</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-[var(--muted)] sm:text-base">Select a plan, get features enabled for your membership, and change plans whenever you need.</p>

          {user && (
            <div className="mx-auto mt-7 max-w-xl rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-left">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--success)]"><BadgeCheck className="h-4 w-4" />Your membership</div>
              <p className="mt-1 text-lg font-black text-[var(--text)]">{membership?.planName || 'Free Starter'}</p>
              {membership?.endsAt && <p className="mt-1 text-xs text-[var(--muted)]">Renews / ends {new Date(membership.endsAt).toLocaleDateString()}</p>}
              {currentTrainer && (
                <p className="mt-2 text-sm text-[var(--text)]">Assigned trainer: <span className="font-bold text-[var(--primary)]">{currentTrainer.name}</span>{currentTrainer.trainerProfile?.specialization ? ` · ${currentTrainer.trainerProfile.specialization}` : ''}</p>
              )}
            </div>
          )}

          <div className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow)]">
            <button type="button" aria-pressed={!annualBilling} onClick={() => setAnnualBilling(false)} className={`rounded-xl px-5 py-2.5 text-xs font-bold transition ${!annualBilling ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}>Monthly</button>
            <button type="button" aria-pressed={annualBilling} onClick={() => setAnnualBilling(true)} className={`rounded-xl px-5 py-2.5 text-xs font-bold transition ${annualBilling ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'text-[var(--muted)] hover:text-[var(--text)]'}`}>
              Annual <span className="ml-1 text-[var(--success)] font-extrabold">Save up to 20%</span>
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-6 max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <StepExplainer
          label="How Kinetide works"
          steps={[
            { title: 'Log', description: 'Record a workout or meal.', Icon: Dumbbell },
            { title: 'Track', description: 'Follow activity and nutrition.', Icon: Activity },
            { title: 'Improve', description: 'Review progress with your trainer.', Icon: TrendingUp },
          ]}
        />
        {error && <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
        {notice && <p role="status" className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</p>}
        {user?.role === 'user' && paidActive && !currentTrainer && (
          <p className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            <UserRound className="h-4 w-4" />Your plan includes a trainer but you have not chosen one yet.
            <Link to="/my-trainer" className="font-bold text-white underline">Choose your trainer</Link>
          </p>
        )}
        {loading ? (
          <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-red-400" />Loading membership plans...</div>
        ) : plans.length === 0 ? (
          <EmptyState type="membership" sentence="Membership plans are temporarily unavailable." actionLabel="Contact FORMA" to="/contact" />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
              const unitPrice = annualBilling ? plan.annualPrice : plan.monthlyPrice;
              const isCurrentPlan = activePlanSlug === plan.slug;
              return (
                <article
                  key={plan.slug}
                  className={`membership-plan-card relative flex flex-col rounded-3xl border p-6 shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                    plan.highlight
                      ? 'border-[var(--primary)] bg-[var(--surface)] ring-2 ring-[var(--primary)]/20 shadow-[0_16px_36px_rgba(214,63,10,0.12)]'
                      : 'border-[var(--border)] bg-[var(--surface)]'
                  }`}
                >
                  {plan.badge && (
                    <span
                      className={`mb-4 w-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                        plan.highlight ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-black uppercase text-[var(--text)]">{plan.name}</h2>
                    {isCurrentPlan && (
                      <span className="shrink-0 rounded-full border border-[var(--success)]/30 bg-[var(--success)]/10 px-2 py-1 text-[10px] font-bold text-[var(--success)]">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="mt-2 min-h-12 text-xs leading-relaxed text-[var(--muted)]">{plan.description}</p>
                  <div className="mt-6">
                    <span className="text-3xl font-black text-[var(--text)]">{money(unitPrice)}</span>
                    <span className="ml-1 text-xs text-[var(--muted)]">{plan.slug === 'free' ? 'forever' : '/month'}</span>
                    {annualBilling && plan.slug !== 'free' && (
                      <p className="mt-1 text-[11px] font-bold text-[var(--success)]">Billed yearly: {money(unitPrice * 12)}</p>
                    )}
                  </div>
                  <ul className="mt-6 flex-1 space-y-3 text-xs text-[var(--muted)]">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                        <span className="text-[var(--text)]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => handleChoosePlan(plan)}
                    disabled={processing || isCurrentPlan}
                    className={`membership-plan-button ${isCurrentPlan ? 'membership-plan-button-current' : ''} mt-7 w-full rounded-xl py-3 text-xs font-extrabold uppercase tracking-wider transition duration-200 disabled:cursor-default disabled:opacity-50 ${
                      plan.highlight
                        ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-md hover:opacity-90'
                        : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]'
                    }`}
                  >
                    {processing && plan.slug === 'free' ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : isCurrentPlan ? 'Current plan' : plan.slug === 'free' ? 'Switch to Free' : 'Checkout'}
                  </button>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-10 overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="px-5 pt-5 text-left text-base font-black text-[var(--text)]">What each plan unlocks with your trainer</caption>
            <thead>
              <tr className="text-xs uppercase tracking-wider text-[var(--muted)]">
                <th className="px-5 py-3 font-semibold">Feature</th>
                {TIERS.map((tier) => <th key={tier.slug} className="px-3 py-3 text-center font-semibold text-[var(--text)]">{tier.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {TRAINER_FEATURES.map((feature) => (
                <tr key={feature.key} className="border-t border-[var(--border)]">
                  <td className="px-5 py-3 text-[var(--text)]">{feature.label}</td>
                  {TIERS.map((tier) => (
                    <td key={tier.slug} className="px-3 py-3 text-center">
                      {PLAN_RANK[tier.slug] >= PLAN_RANK[FEATURE_MIN_PLAN[feature.key]]
                        ? <Check aria-label="Included" className="mx-auto h-4 w-4 text-[var(--success)]" />
                        : <Minus aria-label="Not included" className="mx-auto h-4 w-4 text-[var(--muted)]" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm leading-relaxed text-amber-100">
          <p className="flex items-center gap-2 font-bold"><Sparkles className="h-4 w-4" />Demo checkout</p>
          <p className="mt-1 text-xs text-amber-100/75">Payment is simulated for this project: full card numbers are never sent to or stored by the server and no real money is charged.</p>
        </div>
      </section>
    </main>
  );
}
