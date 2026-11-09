import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  BadgeDollarSign,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Users,
} from '../icons';
import api from '../api/axios';
import { MEMBERSHIP_FEATURES } from '../utils/membershipFeatures';
import EmptyState from '../components/EmptyState';

const inputClass = 'mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-red-500';
export default function AdminMemberships() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState('');
  const [creating, setCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({
    slug: '',
    accessLevel: 'basic',
    name: '',
    badge: '',
    description: '',
    monthlyPrice: 0,
    annualPrice: 0,
    features: '',
    featureKeys: [],
    highlight: false,
    trainerIncluded: false,
    active: true,
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: planResponse } = await api.get('/admin/membership-plans');
      if (!Array.isArray(planResponse?.plans)) throw new Error('Membership plans were not returned.');
      setPlans(planResponse.plans);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load membership management data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updatePlan = (slug, key, value) => {
    setPlans((current) => current.map((plan) => (
      plan.slug === slug ? { ...plan, [key]: value } : plan
    )));
  };

  const savePlan = async (plan) => {
    setSavingSlug(plan.slug);
    setError('');
    setNotice('');
    try {
      const { data } = await api.put(`/admin/membership-plans/${plan.slug}`, {
        ...plan,
        features: Array.isArray(plan.features) ? plan.features : [],
        featureKeys: Array.isArray(plan.featureKeys) ? plan.featureKeys : [],
      });
      setPlans((current) => current.map((item) => (item.slug === plan.slug ? data.plan : item)));
      setNotice(`${plan.name} plan saved.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save this plan.');
    } finally {
      setSavingSlug('');
    }
  };

  const createPlan = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        ...newPlan,
        slug: newPlan.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        features: newPlan.features.split('\n').map((feature) => feature.trim()).filter(Boolean),
      };
      const { data } = await api.post('/admin/membership-plans', payload);
      setPlans((current) => [...current, data.plan].sort((first, second) => first.sortOrder - second.sortOrder));
      setNewPlan({
        slug: '', accessLevel: 'basic', name: '', badge: '', description: '',
        monthlyPrice: 0, annualPrice: 0, features: '', highlight: false,
        featureKeys: [], trainerIncluded: false, active: true,
      });
      setNotice(`${data.plan.name} plan created.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create this plan.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="vf-theme-page mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner mb-8 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/10 bg-[#111115] p-5 sm:p-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300"><BadgeDollarSign className="h-4 w-4" />Admin management</p>
          <h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Membership plans</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">Manage plan names, PKR prices, features, and availability. FORMA does not process real payments yet.</p>
        </div>
        <button type="button" onClick={loadData} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
        </button>
      </PageHeader>

      {error && <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      {notice && <p role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</p>}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-red-400" />Loading plans...</div>
      ) : (
        <>
          <form id="create-membership-plan" onSubmit={createPlan} className="mb-8 rounded-2xl border border-red-500/20 bg-[#111111] p-5 sm:p-6">
            <h2 className="text-xl font-black text-white">Create a membership plan</h2>
            <p className="mt-1 text-sm text-gray-400">Choose an access tier to control which existing app features this plan unlocks.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold text-gray-300">Plan name
                <input required maxLength={80} value={newPlan.name} onChange={(event) => setNewPlan((current) => ({ ...current, name: event.target.value }))} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-gray-300">Plan slug (unique)
                <input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={48} placeholder="e.g. student-plus" value={newPlan.slug} onChange={(event) => setNewPlan((current) => ({ ...current, slug: event.target.value.toLowerCase().replace(/\s+/g, '-') }))} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-gray-300">Feature access tier
                <select value={newPlan.accessLevel} onChange={(event) => setNewPlan((current) => ({ ...current, accessLevel: event.target.value }))} className={inputClass}>
                  <option value="free">Free</option><option value="basic">Basic</option><option value="elite">Elite</option><option value="premium">Premium</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-300">Badge
                <input maxLength={60} value={newPlan.badge} onChange={(event) => setNewPlan((current) => ({ ...current, badge: event.target.value }))} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-gray-300">Monthly price (PKR)
                <input type="number" min="0" max="10000000" required value={newPlan.monthlyPrice} onChange={(event) => setNewPlan((current) => ({ ...current, monthlyPrice: Number(event.target.value) }))} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-gray-300">Annual equivalent / month (PKR)
                <input type="number" min="0" max="10000000" required value={newPlan.annualPrice} onChange={(event) => setNewPlan((current) => ({ ...current, annualPrice: Number(event.target.value) }))} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-gray-300 sm:col-span-2 lg:col-span-3">Description
                <textarea required rows={2} maxLength={500} value={newPlan.description} onChange={(event) => setNewPlan((current) => ({ ...current, description: event.target.value }))} className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-gray-300 sm:col-span-2 lg:col-span-3">Features (one per line)
                <textarea rows={4} value={newPlan.features} onChange={(event) => setNewPlan((current) => ({ ...current, features: event.target.value }))} className={inputClass} />
              </label>
            </div>
            <fieldset className="mt-5">
              <legend className="text-xs font-semibold text-gray-300">Included client features</legend>
              <p className="mt-1 text-xs text-gray-500">Only checked features are available to clients on this plan.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {MEMBERSHIP_FEATURES.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg border border-white/5 px-3 py-2 text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={newPlan.featureKeys.includes(key)}
                      onChange={(event) => setNewPlan((current) => ({
                        ...current,
                        featureKeys: event.target.checked
                          ? [...current.featureKeys, key]
                          : current.featureKeys.filter((item) => item !== key),
                      }))}
                      className="h-4 w-4 accent-red-500"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-4 flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-300"><input type="checkbox" checked={newPlan.active} onChange={(event) => setNewPlan((current) => ({ ...current, active: event.target.checked }))} className="h-4 w-4 accent-red-500" />Available to clients</label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-300"><input type="checkbox" checked={newPlan.highlight} onChange={(event) => setNewPlan((current) => ({ ...current, highlight: event.target.checked }))} className="h-4 w-4 accent-red-500" />Highlight plan</label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-300"><input type="checkbox" checked={newPlan.accessLevel !== 'free' || newPlan.trainerIncluded} disabled={newPlan.accessLevel !== 'free'} onChange={(event) => setNewPlan((current) => ({ ...current, trainerIncluded: event.target.checked }))} className="h-4 w-4 accent-red-500 disabled:opacity-50" />Include a trainer{newPlan.accessLevel !== 'free' ? ' (automatic for Basic and above)' : ''}</label>
            </div>
            <button type="submit" disabled={creating} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Create plan</button>
          </form>

          <section aria-label="Edit membership plans" className="grid gap-5 xl:grid-cols-2">
            {plans.length ? plans.map((plan) => (
              <article key={plan.slug} className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-red-300">{plan.slug}</p>
                    <h2 className="mt-1 text-xl font-black text-white">{plan.name}</h2>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-300">
                    <input type="checkbox" checked={plan.active} onChange={(event) => updatePlan(plan.slug, 'active', event.target.checked)} className="h-4 w-4 accent-red-500" />
                    Available to clients
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-gray-300">Plan name
                    <input value={plan.name} maxLength={80} onChange={(event) => updatePlan(plan.slug, 'name', event.target.value)} className={inputClass} />
                  </label>
                  <label className="text-xs font-semibold text-gray-300">Badge
                    <input value={plan.badge || ''} maxLength={60} onChange={(event) => updatePlan(plan.slug, 'badge', event.target.value)} className={inputClass} />
                  </label>
                  <label className="text-xs font-semibold text-gray-300">Feature access tier
                    <select value={plan.slug === 'premium' ? 'premium' : plan.accessLevel || plan.slug} disabled={plan.slug === 'free' || plan.slug === 'premium'} onChange={(event) => updatePlan(plan.slug, 'accessLevel', event.target.value)} className={`${inputClass} disabled:opacity-50`}>
                      <option value="free">Free</option><option value="basic">Basic</option><option value="elite">Elite</option><option value="premium">Premium</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-gray-300">Monthly price (PKR)
                    <input type="number" min="0" max="10000000" value={plan.monthlyPrice} disabled={plan.slug === 'free'} onChange={(event) => updatePlan(plan.slug, 'monthlyPrice', Number(event.target.value))} className={`${inputClass} disabled:opacity-50`} />
                  </label>
                  <label className="text-xs font-semibold text-gray-300">Annual equivalent / month (PKR)
                    <input type="number" min="0" max="10000000" value={plan.annualPrice} disabled={plan.slug === 'free'} onChange={(event) => updatePlan(plan.slug, 'annualPrice', Number(event.target.value))} className={`${inputClass} disabled:opacity-50`} />
                  </label>
                  <label className="text-xs font-semibold text-gray-300 sm:col-span-2">Description
                    <textarea rows={2} maxLength={500} value={plan.description} onChange={(event) => updatePlan(plan.slug, 'description', event.target.value)} className={inputClass} />
                  </label>
                  <label className="text-xs font-semibold text-gray-300 sm:col-span-2">Features (one per line)
                    <textarea rows={6} value={plan.features.join('\n')} onChange={(event) => updatePlan(plan.slug, 'features', event.target.value.split('\n').slice(0, 30))} className={inputClass} />
                  </label>
                </div>
                <fieldset className="mt-5">
                  <legend className="text-xs font-semibold text-gray-300">Included client features</legend>
                  <p className="mt-1 text-xs text-gray-500">Changes apply to active memberships on this plan.</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {MEMBERSHIP_FEATURES.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 rounded-lg border border-white/5 px-3 py-2 text-xs text-gray-300">
                        <input
                          type="checkbox"
                          checked={(plan.featureKeys || []).includes(key)}
                          onChange={(event) => updatePlan(
                            plan.slug,
                            'featureKeys',
                            event.target.checked
                              ? [...(plan.featureKeys || []), key]
                              : (plan.featureKeys || []).filter((item) => item !== key),
                          )}
                          className="h-4 w-4 accent-red-500"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-4 flex flex-wrap gap-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-300"><input type="checkbox" checked={plan.highlight} onChange={(event) => updatePlan(plan.slug, 'highlight', event.target.checked)} className="h-4 w-4 accent-red-500" />Highlight plan</label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-300"><input type="checkbox" checked={(plan.accessLevel || plan.slug) !== 'free' || plan.trainerIncluded} disabled={(plan.accessLevel || plan.slug) !== 'free'} onChange={(event) => updatePlan(plan.slug, 'trainerIncluded', event.target.checked)} className="h-4 w-4 accent-red-500 disabled:opacity-50" />Assign a trainer{(plan.accessLevel || plan.slug) !== 'free' ? ' (included from Basic up)' : ''}</label>
                </div>
                <button type="button" onClick={() => savePlan(plan)} disabled={savingSlug === plan.slug} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                  {savingSlug === plan.slug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save {plan.slug} plan
                </button>
              </article>
            )) : <EmptyState type="membership" sentence="No membership plans are configured yet." actionLabel="Create the first plan" onAction={() => document.getElementById('create-membership-plan')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />}
          </section>

          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-black text-white">Purchase history</h2>
            <EmptyState
              type="membership"
              sentence="Real purchase history will be available when payment processing is connected."
              actionLabel="Configure membership plans"
              onAction={() => document.getElementById('create-membership-plan')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            />
          </section>
        </>
      )}
    </main>
  );
}
