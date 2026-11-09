import PageHeader from '../components/PageHeader';
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, AlertCircle, CheckCircle2, Loader2, Save, UserRound } from '../icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const goalOptions = ['Overall Fitness', 'Weight Loss', 'Muscle Gain', 'Endurance', 'Strength Training'];

export default function ClientProfileSetup() {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fitnessGoal: user?.fitnessGoal || 'Overall Fitness',
    fitnessRequirements: user?.fitnessRequirements || '',
    trainingExperience: user?.trainingExperience || 'beginner',
    height: user?.height || '',
    weight: user?.weight || '',
    targetWeight: user?.targetWeight || '',
    bio: user?.bio || '',
    preferredUnit: user?.preferredUnit || 'metric',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (form.fitnessRequirements.trim().length < 10) {
      setError('Please describe your fitness requirements in at least 10 characters.');
      return;
    }

    for (const [label, value, min, max] of [
      ['Height', form.height, 50, 300],
      ['Current weight', form.weight, 20, 500],
      ['Target weight', form.targetWeight, 20, 500],
    ]) {
      if (value !== '' && (!Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max)) {
        setError(`${label} must be between ${min} and ${max}.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        fitnessGoal: form.fitnessGoal,
        fitnessRequirements: form.fitnessRequirements.trim(),
        trainingExperience: form.trainingExperience,
        bio: form.bio.trim(),
        preferredUnit: form.preferredUnit,
        profileComplete: true,
      };
      ['height', 'weight', 'targetWeight'].forEach((field) => {
        if (form[field] !== '') payload[field] = Number(form[field]);
      });

      const { data } = await api.put('/auth/profile', payload);
      if (!data?.success || !data.user) {
        throw new Error(data?.message || 'Your fitness profile could not be saved.');
      }

      updateUser(data.user);
      const requestedDestination = location.state?.from;
      const destinationPath = typeof requestedDestination === 'string'
        ? requestedDestination
        : requestedDestination?.pathname;
      const target = destinationPath?.startsWith('/') && !destinationPath.startsWith('//')
        ? `${destinationPath}${typeof requestedDestination === 'object' ? (requestedDestination.search || '') + (requestedDestination.hash || '') : ''}`
        : '/dashboard';
      navigate(target, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save your fitness profile.');
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = 'mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none transition focus:border-red-500';

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <PageHeader as="header" className="mb-6 rounded-2xl border border-red-500/20 bg-[#171819] p-6 sm:p-8">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300">
          <Activity className="h-4 w-4" /> Personal fitness profile
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">Tell us what you need</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">
          Share your goals and requirements so Kinetide can shape your fitness experience around you.
        </p>
      </PageHeader>

      {error && (
        <p role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-8">
        <div className="flex items-center gap-2 border-b border-white/10 pb-4">
          <UserRound className="h-5 w-5 text-red-300" />
          <h2 className="text-lg font-bold text-white">Your fitness details</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-300">
            Main fitness goal
            <select value={form.fitnessGoal} onChange={(event) => setForm({ ...form, fitnessGoal: event.target.value })} className={fieldClass}>
              {goalOptions.map((goal) => <option key={goal}>{goal}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-300">
            Training experience
            <select value={form.trainingExperience} onChange={(event) => setForm({ ...form, trainingExperience: event.target.value })} className={fieldClass}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-300">
            Height (cm) <span className="text-gray-500">· optional</span>
            <input type="number" min="50" max="300" step="0.1" value={form.height} onChange={(event) => setForm({ ...form, height: event.target.value })} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-300">
            Current weight (kg) <span className="text-gray-500">· optional</span>
            <input type="number" min="20" max="500" step="0.1" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-300">
            Target weight (kg) <span className="text-gray-500">· optional</span>
            <input type="number" min="20" max="500" step="0.1" value={form.targetWeight} onChange={(event) => setForm({ ...form, targetWeight: event.target.value })} className={fieldClass} />
          </label>
          <label className="text-sm font-medium text-gray-300">
            Measurement units
            <select value={form.preferredUnit} onChange={(event) => setForm({ ...form, preferredUnit: event.target.value })} className={fieldClass}>
              <option value="metric">Metric (kg, cm)</option>
              <option value="imperial">Imperial (lb, in)</option>
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium text-gray-300">
          What are your fitness requirements? <span className="text-red-300">*</span>
          <textarea
            value={form.fitnessRequirements}
            onChange={(event) => setForm({ ...form, fitnessRequirements: event.target.value })}
            minLength={10}
            maxLength={1000}
            rows={4}
            required
            className={`${fieldClass} resize-y`}
            placeholder="Tell us what you want help with, your preferred workouts, schedule, equipment, or any limitations we should consider."
          />
          <span className="mt-1 block text-xs text-gray-500">Up to 1,000 characters. Only share information relevant to your fitness plan.</span>
        </label>

        <label className="block text-sm font-medium text-gray-300">
          A little about you <span className="text-gray-500">· optional</span>
          <textarea value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} maxLength={500} rows={3} className={`${fieldClass} resize-y`} placeholder="Your routine, interests, or fitness background" />
        </label>

        <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-2 text-xs text-gray-500"><CheckCircle2 className="h-4 w-4 text-emerald-400" />Your profile details can be updated later.</p>
          <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving your profile…' : 'Save and continue'}
          </button>
        </div>
      </form>
    </section>
  );
}
