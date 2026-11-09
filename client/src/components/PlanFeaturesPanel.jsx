import React, { useEffect, useMemo, useState } from 'react';
import { Check } from '../icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { hasMinimumPlan } from '../utils/membershipAccess';

const PLAN_RANK = { free: 0, basic: 1, elite: 2, premium: 3 };

export default function PlanFeaturesPanel({ category }) {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/memberships/plans')
      .then(({ data }) => {
        if (!Array.isArray(data?.plans)) throw new Error('Plan features were not returned.');
        if (active) {
          setPlans(data.plans);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || requestError.message || 'Could not load plan features.');
        }
      });
    return () => { active = false; };
  }, []);

  const planSlug = hasMinimumPlan(user?.membership, 'premium')
    ? user?.membership?.planSlug || 'premium'
    : hasMinimumPlan(user?.membership, 'elite')
      ? user?.membership?.planSlug || 'elite'
      : hasMinimumPlan(user?.membership, 'basic') ? user?.membership?.planSlug || 'basic' : 'free';
  const plan = plans.find((item) => item.slug === planSlug);
  const planAccessLevel = user?.membership?.accessLevel || plan?.accessLevel || planSlug;
  const features = useMemo(() => {
    const featurePattern = category === 'workouts'
      ? /workout|exercise|training/i
      : /nutrition|meal|calorie|macro|protein|carb|fat|water/i;
    const currentRank = PLAN_RANK[planAccessLevel] || 0;
    return plans
      .filter((item) => {
        const itemRank = PLAN_RANK[item.accessLevel || item.slug] || 0;
        return itemRank < currentRank || item.slug === planSlug;
      })
      .sort((first, second) => PLAN_RANK[first.accessLevel || first.slug] - PLAN_RANK[second.accessLevel || second.slug])
      .flatMap((item) => item.features || [])
      .filter((feature) => !/^everything in /i.test(feature) && featurePattern.test(feature));
  }, [category, planAccessLevel, plans]);

  if (error) {
    return <p role="alert" className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">{error}</p>;
  }
  if (features.length === 0) return null;

  return (
    <section aria-label="Features included in your plan" className="mb-6 rounded-2xl border border-white/10 bg-[#111111] p-4 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 sm:p-5">
      <h2 className="text-sm font-bold text-white">Included in your plan</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {features.map((feature, index) => (
          <li key={`${feature}-${index}`} className="flex items-start gap-2 text-sm leading-relaxed text-gray-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
