import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
  Smartphone,
  Sparkles,
  Users,
  WalletCards,
} from '../icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { FEATURE_MIN_PLAN, PLAN_RANK, TRAINER_FEATURES } from '../utils/membershipAccess';

const money = (amount) => `PKR ${Number(amount || 0).toLocaleString('en-PK')}`;

const METHODS = [
  { value: 'card', label: 'Card', icon: CreditCard },
  { value: 'jazzcash', label: 'JazzCash', icon: Smartphone },
  { value: 'easypaisa', label: 'Easypaisa', icon: Smartphone },
  { value: 'apple_pay', label: 'Apple Pay', icon: WalletCards },
  { value: 'google_pay', label: 'Google Pay', icon: WalletCards },
];

const luhnValid = (digits) => {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let value = Number(digits[index]);
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return digits.length >= 13 && sum % 10 === 0;
};

const cardBrand = (digits) => {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  return 'other';
};

const formatCardNumber = (value) => value.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

const expiryValid = (value) => {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  return new Date(year, month, 1) > new Date();
};

const fieldClass = 'mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#080808] px-3 text-sm text-white placeholder-gray-600 focus:border-red-500/60 focus:outline-none';

export default function Checkout() {
  const { updateUser } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const planSlug = params.get('plan') || '';
  const interval = params.get('interval') === 'annual' ? 'annual' : 'monthly';

  const [quote, setQuote] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [trainerId, setTrainerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const [method, setMethod] = useState('card');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [walletName, setWalletName] = useState('');
  const [mobile, setMobile] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!planSlug || planSlug === 'free') {
      setError('Choose a paid plan from the Memberships page first.');
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError('');
    api.get('/memberships/quote', { params: { planSlug, billingInterval: interval } })
      .then(async ({ data }) => {
        if (!active) return;
        setQuote(data.quote);
        if (data.quote.trainerIncluded) {
          const trainerResponse = await api.get('/memberships/available-trainers');
          if (!active) return;
          const available = (trainerResponse.data?.trainers || []).filter((trainer) => trainer.remainingSlots > 0);
          setTrainers(available);
          setTrainerId((current) => (available.some((trainer) => trainer.id === current) ? current : ''));
        } else {
          setTrainers([]);
          setTrainerId('');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load this checkout.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [planSlug, interval]);

  const plan = quote?.plan;
  const accessLevel = plan?.accessLevel || plan?.slug;
  const unlocked = useMemo(() => TRAINER_FEATURES.filter(
    (feature) => PLAN_RANK[accessLevel] >= PLAN_RANK[FEATURE_MIN_PLAN[feature.key]],
  ), [accessLevel]);
  const showClasses = PLAN_RANK[accessLevel] >= PLAN_RANK.elite;

  const digits = cardNumber.replace(/\D/g, '');
  const problems = [];
  if (quote?.trainerIncluded && !trainerId) problems.push('Choose your trainer.');
  if (method === 'card') {
    if (cardName.trim().length < 2) problems.push('Enter the card holder name.');
    if (!luhnValid(digits)) problems.push('Enter a valid card number.');
    if (!expiryValid(expiry)) problems.push('Enter a valid expiry date (MM/YY).');
    if (!/^\d{3,4}$/.test(cvc)) problems.push('Enter the 3 or 4 digit security code.');
  }
  if (method === 'jazzcash' || method === 'easypaisa') {
    if (walletName.trim().length < 2) problems.push('Enter the account holder name.');
    if (!/^03\d{9}$/.test(mobile)) problems.push('Enter a valid mobile number (03XXXXXXXXX).');
  }

  const buildDetails = () => {
    if (method === 'card') return { holderName: cardName.trim(), last4: digits.slice(-4), brand: cardBrand(digits) };
    if (method === 'jazzcash' || method === 'easypaisa') return { accountName: walletName.trim(), mobile };
    return undefined;
  };

  const pay = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (problems.length) return;
    setPaying(true);
    setError('');
    try {
      const { data } = await api.post('/memberships/purchase', {
        planSlug,
        billingInterval: interval,
        paymentMethod: method,
        paymentDetails: buildDetails(),
        ...(quote.trainerIncluded ? { trainerId } : {}),
      });
      updateUser((current) => ({ ...current, membership: data.membership }));
      setReceipt(data);
      setCardNumber('');
      setCvc('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Payment could not be completed.');
    } finally {
      setPaying(false);
    }
  };

  if (receipt) {
    const { purchase, membership } = receipt;
    const trainer = membership?.assignedTrainer;
    return (
      <main className="min-h-screen bg-[#080808] px-4 py-12 text-white">
        <section className="mx-auto max-w-2xl rounded-3xl border border-emerald-500/20 bg-[#111111] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300"><CheckCircle2 className="h-7 w-7" /></span>
            <div>
              <h1 className="text-2xl font-black">Payment successful</h1>
              <p className="text-sm text-gray-400">Receipt {purchase?.receiptNo}</p>
            </div>
          </div>
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.03] p-4"><dt className="text-xs uppercase tracking-wider text-gray-500">Plan</dt><dd className="mt-1 font-bold">{purchase?.planName} · {purchase?.billingInterval}</dd></div>
            <div className="rounded-xl bg-white/[0.03] p-4"><dt className="text-xs uppercase tracking-wider text-gray-500">Amount paid</dt><dd className="mt-1 font-bold">{money(purchase?.amount)}</dd></div>
            <div className="rounded-xl bg-white/[0.03] p-4"><dt className="text-xs uppercase tracking-wider text-gray-500">Paid with</dt><dd className="mt-1 break-words font-bold">{purchase?.paymentReference}</dd></div>
            <div className="rounded-xl bg-white/[0.03] p-4"><dt className="text-xs uppercase tracking-wider text-gray-500">Valid until</dt><dd className="mt-1 font-bold">{purchase?.endsAt ? new Date(purchase.endsAt).toLocaleDateString() : '-'}</dd></div>
            {trainer && <div className="rounded-xl bg-white/[0.03] p-4 sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-gray-500">Your trainer</dt><dd className="mt-1 font-bold">{trainer.name}{trainer.trainerProfile?.specialization ? ` · ${trainer.trainerProfile.specialization}` : ''}</dd></div>}
          </dl>
          <h2 className="mt-6 text-sm font-bold uppercase tracking-wider text-emerald-300">Now added to your panel</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {unlocked.map((feature) => (
              <li key={feature.key}>
                <Link to={feature.to} className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-gray-200 hover:border-emerald-500/30 hover:bg-emerald-500/5"><Check className="h-4 w-4 text-emerald-400" />{feature.label}</Link>
              </li>
            ))}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate('/dashboard')} className="min-h-11 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 text-sm font-bold">Go to my dashboard</button>
            <Link to="/my-trainer" className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-5 text-sm font-bold">View my trainer</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <Link to="/memberships" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"><ArrowLeft className="h-4 w-4" />Back to plans</Link>
        <h1 className="mt-4 text-3xl font-black">Checkout</h1>

        {error && <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
        {loading && <div className="mt-10 flex items-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-red-400" />Preparing your order...</div>}

        {!loading && quote && (
          <form onSubmit={pay} noValidate className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              {quote.trainerIncluded && (
                <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-emerald-300" />1. Choose your trainer</h2>
                  <p className="mt-1 text-xs text-gray-400">Your trainer assigns your workouts and meal plans{showClasses ? ', messages you and hosts live Zoom classes' : ''}.</p>
                  {trainers.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">No trainers currently have open client slots. Please try again later.</p>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Available trainers">
                      {trainers.map((trainer) => {
                        const selected = trainerId === trainer.id;
                        return (
                          <label key={trainer.id} className={`flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition ${selected ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 hover:bg-white/5'}`}>
                            <div className="flex items-center gap-3">
                              <input type="radio" name="trainer" value={trainer.id} checked={selected} onChange={() => setTrainerId(trainer.id)} className="accent-emerald-400" />
                              {trainer.avatarUrl
                                ? <img src={trainer.avatarUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                                : <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-200"><BadgeCheck className="h-6 w-6" /></span>}
                              <span className="min-w-0 flex-1">
                                <span className="block truncate font-bold text-white">{trainer.name}</span>
                                <span className="block truncate text-xs text-gray-400">{trainer.specialization || 'Certified Kinetide trainer'}</span>
                              </span>
                            </div>
                            {trainer.bio && <p className="line-clamp-3 text-xs leading-relaxed text-gray-400">{trainer.bio}</p>}
                            <p className="text-[11px] font-semibold text-emerald-200">{trainer.remainingSlots} of {trainer.clientCapacity} client slots open</p>
                            {showClasses && (
                              <div className="border-t border-white/10 pt-3">
                                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500"><CalendarClock className="h-3.5 w-3.5" />Upcoming Zoom classes</p>
                                {trainer.upcomingClasses?.length ? (
                                  <ul className="space-y-1">
                                    {trainer.upcomingClasses.map((item) => (
                                      <li key={`${item.title}-${item.startsAt}`} className="text-xs text-gray-300">{item.title} · {new Date(item.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</li>
                                    ))}
                                  </ul>
                                ) : <p className="text-xs text-gray-500">No classes scheduled yet.</p>}
                              </div>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-lg font-bold"><CreditCard className="h-5 w-5 text-red-300" />{quote.trainerIncluded ? '2. ' : '1. '}Payment method</h2>
                <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Payment methods">
                  {METHODS.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" role="tab" aria-selected={method === value} onClick={() => setMethod(value)}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${method === value ? 'border-red-500/50 bg-red-500/10 text-red-100' : 'border-white/10 text-gray-400 hover:text-white'}`}>
                      <Icon className="h-4 w-4" />{label}
                    </button>
                  ))}
                </div>

                {method === 'card' && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-gray-400 sm:col-span-2">Name on card
                      <input value={cardName} onChange={(event) => setCardName(event.target.value)} autoComplete="cc-name" maxLength={60} className={fieldClass} />
                    </label>
                    <label className="text-xs font-semibold text-gray-400 sm:col-span-2">Card number
                      <input value={cardNumber} onChange={(event) => setCardNumber(formatCardNumber(event.target.value))} inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242" className={fieldClass} />
                    </label>
                    <label className="text-xs font-semibold text-gray-400">Expiry
                      <input value={expiry} onChange={(event) => setExpiry(formatExpiry(event.target.value))} inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY" className={fieldClass} />
                    </label>
                    <label className="text-xs font-semibold text-gray-400">Security code
                      <input value={cvc} onChange={(event) => setCvc(event.target.value.replace(/\D/g, '').slice(0, 4))} inputMode="numeric" autoComplete="cc-csc" placeholder="123" className={fieldClass} />
                    </label>
                  </div>
                )}

                {(method === 'jazzcash' || method === 'easypaisa') && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-gray-400">Account holder name
                      <input value={walletName} onChange={(event) => setWalletName(event.target.value)} maxLength={60} className={fieldClass} />
                    </label>
                    <label className="text-xs font-semibold text-gray-400">{method === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} mobile number
                      <input value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, '').slice(0, 11))} inputMode="numeric" placeholder="03XXXXXXXXX" className={fieldClass} />
                    </label>
                  </div>
                )}

                {(method === 'apple_pay' || method === 'google_pay') && (
                  <p className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-gray-300">You will confirm the payment with {method === 'apple_pay' ? 'Apple Pay' : 'Google Pay'} on your device. No further details are needed.</p>
                )}

                <p className="mt-4 flex items-start gap-2 text-xs text-amber-200/80"><Sparkles className="mt-0.5 h-4 w-4 shrink-0" />Demo payment: nothing is charged and your full card number and security code never leave this page. Only the last 4 digits are saved on the receipt.</p>
              </section>
            </div>

            <aside className="h-fit rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6 lg:sticky lg:top-6">
              <h2 className="text-lg font-bold">Order summary</h2>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-white">{plan.name}</p>
                  <p className="text-xs text-gray-400">{interval === 'annual' ? 'Billed yearly' : 'Billed monthly'}</p>
                </div>
                <div className="flex rounded-xl border border-white/10 p-1 text-xs font-bold">
                  {['monthly', 'annual'].map((value) => (
                    <button key={value} type="button" onClick={() => setParams({ plan: planSlug, interval: value })}
                      className={`rounded-lg px-3 py-1.5 capitalize ${interval === value ? 'bg-red-600 text-white' : 'text-gray-400'}`}>{value}</button>
                  ))}
                </div>
              </div>

              <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-gray-500">You will get</h3>
              <ul className="mt-2 space-y-1.5">
                {unlocked.map((feature) => <li key={feature.key} className="flex items-center gap-2 text-sm text-gray-200"><Check className="h-4 w-4 text-emerald-400" />{feature.label}</li>)}
                {plan.features.filter((feature) => !/^everything in /i.test(feature)).slice(0, 4).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs text-gray-400"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-600" />{feature}</li>
                ))}
              </ul>

              <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
                <div className="flex justify-between"><dt className="text-gray-400">Plan price</dt><dd>{money(quote.cyclePrice)}</dd></div>
                {quote.creditApplied > 0 && <div className="flex justify-between text-emerald-300"><dt>Credit from current plan</dt><dd>- {money(quote.creditApplied)}</dd></div>}
                <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-black"><dt>Total today</dt><dd>{money(quote.amount)}</dd></div>
                <p className="text-xs text-gray-500">Access until {new Date(quote.endsAt).toLocaleDateString()}</p>
              </dl>

              {touched && problems.length > 0 && (
                <ul role="alert" className="mt-4 space-y-1 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
                  {problems.map((problem) => <li key={problem}>{problem}</li>)}
                </ul>
              )}

              <button type="submit" disabled={paying}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 font-bold text-white disabled:opacity-60">
                {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : <LockKeyhole className="h-5 w-5" />}Pay {money(quote.amount)}
              </button>
            </aside>
          </form>
        )}
      </div>
    </main>
  );
}
