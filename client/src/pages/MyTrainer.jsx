import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Check, Dumbbell, Loader2, Lock, Mail, ShieldCheck, UserRound, Users } from '../icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';
import {
  FEATURE_MIN_PLAN,
  TRAINER_FEATURES,
  hasFeature,
  planTitle,
} from '../utils/membershipAccess';

export default function MyTrainer() {
  const { user, updateUser } = useAuth();
  const [membership, setMembership] = useState(user?.membership || null);
  const [error, setError] = useState('');
  const [trainers, setTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    let active = true;
    api.get('/memberships/current')
      .then(({ data }) => {
        if (!data?.success || !data.membership) throw new Error('Your active membership could not be loaded.');
        if (active) {
          setMembership(data.membership);
          setError('');
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load trainer assignment.');
      });
    return () => { active = false; };
  }, []);

  const trainer = membership?.assignedTrainer;
  const needsTrainer = hasFeature(membership, 'trainer') && !trainer;

  useEffect(() => {
    if (!needsTrainer) return undefined;
    let active = true;
    setLoadingTrainers(true);
    api.get('/memberships/available-trainers')
      .then(({ data }) => {
        if (active) setTrainers((data?.trainers || []).filter((item) => item.remainingSlots > 0));
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Unable to load available trainers.');
      })
      .finally(() => { if (active) setLoadingTrainers(false); });
    return () => { active = false; };
  }, [needsTrainer]);

  const chooseTrainer = useCallback(async () => {
    if (!selectedId) return;
    setAssigning(true);
    setError('');
    try {
      const { data } = await api.post('/memberships/select-trainer', { trainerId: selectedId });
      setMembership(data.membership);
      updateUser((current) => ({ ...current, membership: data.membership }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to assign this trainer.');
    } finally {
      setAssigning(false);
    }
  }, [selectedId, updateUser]);

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/40 to-[#111111] p-6 sm:p-8">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"><ShieldCheck className="h-4 w-4" />{membership?.planName || 'Trainer'} plan</p>
        <h1 className="mt-3 text-3xl font-black text-white">Your Trainer</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">Every paid plan includes a personal trainer. Higher plans unlock more ways to work with them.</p>
      </PageHeader>

      {error && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>}

      {trainer ? (
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            {trainer.avatarUrl
              ? <img src={trainer.avatarUrl} alt={`${trainer.name} profile`} className="h-20 w-20 rounded-2xl border border-emerald-500/20 object-cover" />
              : <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-200"><Dumbbell className="h-8 w-8" /></div>}
            <div className="min-w-0 flex-1">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-300"><BadgeCheck className="h-4 w-4" />Assigned trainer</p>
              <h2 className="mt-1 text-2xl font-black text-white">{trainer.name}</h2>
              <p className="mt-1 text-sm text-gray-400">{trainer.trainerProfile?.specialization || 'Certified Kinetide trainer'}</p>
            </div>
          </div>
          {trainer.trainerProfile?.bio && <p className="mt-5 text-sm leading-relaxed text-gray-300">{trainer.trainerProfile.bio}</p>}
          {trainer.email && (
            <a href={`mailto:${trainer.email}`} className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-gray-200 transition hover:border-emerald-500/30 hover:bg-emerald-500/5">
              <Mail className="h-4 w-4 text-emerald-300" />Contact trainer
            </a>
          )}
          <div className="mt-6 grid gap-4 border-t border-white/10 pt-5 sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.03] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Your goal</p>
              <p className="mt-2 text-sm font-semibold text-white">{user?.fitnessGoal || 'Overall Fitness'}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Training experience</p>
              <p className="mt-2 capitalize text-sm font-semibold text-white">{user?.trainingExperience || 'beginner'}</p>
            </div>
            {user?.fitnessRequirements && (
              <div className="rounded-xl bg-white/[0.03] p-4 sm:col-span-2">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Your requirements</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">{user.fitnessRequirements}</p>
              </div>
            )}
          </div>
        </article>
      ) : needsTrainer ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 sm:p-8">
          <h2 className="flex items-center gap-2 font-bold text-white"><Users className="h-5 w-5 text-amber-300" />Choose your trainer</h2>
          <p className="mt-2 text-sm text-gray-300">Your plan includes a trainer. Pick one with an open slot to get started.</p>
          {loadingTrainers ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" />Loading trainers...</p>
          ) : trainers.length === 0 ? (
            <EmptyState
              type="clients"
              sentence="No trainers have open slots right now. Check back soon or message our team."
              actionLabel="Contact support"
              to="/contact"
            />
          ) : (
            <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Available trainers">
                {trainers.map((item) => (
                  <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${selectedId === item.id ? 'border-emerald-400/60 bg-emerald-500/10' : 'border-white/10 hover:bg-white/5'}`}>
                    <input type="radio" name="trainer" value={item.id} checked={selectedId === item.id} onChange={() => setSelectedId(item.id)} className="accent-emerald-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-white">{item.name}</span>
                      <span className="block truncate text-xs text-gray-400">{item.specialization || 'Certified Kinetide trainer'}</span>
                    </span>
                    <span className="text-[11px] text-emerald-200">{item.remainingSlots} slots</span>
                  </label>
                ))}
              </div>
              <button type="button" onClick={chooseTrainer} disabled={!selectedId || assigning} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 text-sm font-bold text-white disabled:opacity-50">
                {assigning && <Loader2 className="h-4 w-4 animate-spin" />}Assign this trainer
              </button>
            </>
          )}
        </div>
      ) : (
        <EmptyState
          type="clients"
          sentence="You haven't booked a coach yet. Find a trainer who matches your goals."
          actionLabel="Browse trainers"
          to="/my-trainer"
        />
      )}

      <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
        <h2 className="text-lg font-bold text-white">What your plan includes</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {TRAINER_FEATURES.filter((feature) => feature.key !== 'trainer').map((feature) => {
            const unlocked = hasFeature(membership, feature.key);
            return (
              <li key={feature.key}>
                <Link to={unlocked ? feature.to : '/memberships'} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${unlocked ? 'border-emerald-500/20 text-gray-100 hover:bg-emerald-500/5' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}>
                  {unlocked ? <Check className="h-4 w-4 text-emerald-400" /> : <Lock className="h-4 w-4" />}
                  <span className="flex-1">{feature.label}</span>
                  {!unlocked && <span className="text-[10px] font-bold uppercase text-red-300">{planTitle(FEATURE_MIN_PLAN[feature.key])}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}
