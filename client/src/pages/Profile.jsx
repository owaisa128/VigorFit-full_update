import PageHeader from '../components/PageHeader';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, CheckCircle2, Loader2, LogOut, Save, ShieldCheck, User } from '../icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const initialForm = (user) => ({
  name: user?.name || '',
  bio: user?.bio || '',
  fitnessGoal: user?.fitnessGoal || 'Overall Fitness',
  fitnessRequirements: user?.fitnessRequirements || '',
  trainingExperience: user?.trainingExperience || 'beginner',
  height: user?.height ?? '',
  weight: user?.weight ?? '',
  targetWeight: user?.targetWeight ?? '',
});

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => initialForm(user));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    let active = true;
    api.get('/auth/profile')
      .then(({ data }) => {
        if (!data?.success || !data.user) throw new Error(data?.message || 'Profile response was invalid.');
        if (active) {
          updateUser(data.user);
          setForm(initialForm(data.user));
        }
      })
      .catch((error) => {
        if (active) setMessage({ type: 'error', text: error.response?.data?.message || error.message || 'Unable to load your profile.' });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [updateUser]);

  const handleSave = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setMessage({ type: 'error', text: 'Enter your name before saving.' });
      return;
    }
    for (const [label, value] of [['Height', form.height], ['Weight', form.weight], ['Target weight', form.targetWeight]]) {
      if (value !== '' && (!Number.isFinite(Number(value)) || Number(value) <= 0)) {
        setMessage({ type: 'error', text: `${label} must be a number greater than zero.` });
        return;
      }
    }

    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const payload = {
        name,
        bio: form.bio,
        fitnessGoal: form.fitnessGoal,
        fitnessRequirements: form.fitnessRequirements,
        trainingExperience: form.trainingExperience,
        ...(['height', 'weight', 'targetWeight'].reduce((fields, field) => {
          if (form[field] !== '') fields[field] = Number(form[field]);
          return fields;
        }, {})),
      };
      const { data } = await api.put('/auth/profile', payload);
      if (!data?.success || !data.user) throw new Error(data?.message || 'Profile update was unsuccessful.');
      updateUser(data.user);
      setForm(initialForm(data.user));
      setMessage({ type: 'success', text: data.message || 'Profile saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || error.message || 'Unable to save your profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  return (
    <section className="vf-theme-page mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner mb-6 flex flex-col gap-5 rounded-2xl border border-white/10 bg-[#171819] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E10600] to-[#650000] text-2xl font-black text-white">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div className="min-w-0">
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-300"><ShieldCheck className="h-4 w-4" /> Kinetide member</p>
            <h1 className="truncate text-2xl font-black text-white">{user?.name || 'Your profile'}</h1>
            <p className="truncate text-sm text-gray-400">{user?.email}</p>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="vf-profile-signout inline-flex items-center justify-center gap-2 self-start rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-bold text-red-200 hover:bg-red-500/20 sm:self-auto"><LogOut className="h-4 w-4" />Sign out</button>
      </PageHeader>

      {message.text && (
        <div role={message.type === 'error' ? 'alert' : 'status'} className={`mb-5 flex items-start gap-2 rounded-xl border p-4 text-sm ${message.type === 'success' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200' : 'border-red-500/25 bg-red-950/30 text-red-200'}`}>
          {message.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}{message.text}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <form onSubmit={handleSave} className="rounded-2xl border border-white/10 bg-[#171819] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)] sm:p-7">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-bold text-white"><User className="h-5 w-5 text-[#E10600]" />Personal details</h2>
          {loading ? <div className="flex items-center gap-2 py-10 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" />Loading your profile…</div> : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-300 sm:col-span-2">Full name
                  <input value={form.name} maxLength={100} onChange={(event) => setForm({ ...form, name: event.target.value })} autoComplete="name" className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none transition focus:border-red-500" required />
                </label>
                <label className="text-sm font-medium text-gray-300 sm:col-span-2">Email
                  <input value={user?.email || ''} readOnly className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-white/10 bg-[#101112] px-3.5 py-3 text-sm text-gray-500" />
                  <span className="mt-1 block text-xs text-gray-500">Email address changes are not available in the current API.</span>
                </label>
                <label className="text-sm font-medium text-gray-300 sm:col-span-2">About you
                  <textarea value={form.bio} maxLength={500} rows={3} onChange={(event) => setForm({ ...form, bio: event.target.value })} className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none transition focus:border-red-500" placeholder="Share a little about your fitness journey" />
                </label>
                <label className="text-sm font-medium text-gray-300 sm:col-span-2">Fitness goal
                  <select value={form.fitnessGoal} onChange={(event) => setForm({ ...form, fitnessGoal: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none focus:border-red-500">
                    {['Overall Fitness', 'Weight Loss', 'Muscle Gain', 'Endurance', 'Strength Training'].map((goal) => <option key={goal}>{goal}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-300">Training experience
                  <select value={form.trainingExperience} onChange={(event) => setForm({ ...form, trainingExperience: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none focus:border-red-500">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-gray-300 sm:col-span-2">Fitness requirements
                  <textarea value={form.fitnessRequirements} maxLength={1000} rows={4} onChange={(event) => setForm({ ...form, fitnessRequirements: event.target.value })} className="mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none transition focus:border-red-500" placeholder="Tell us what you want help with, your preferred workouts, schedule, equipment, or limitations" />
                </label>
                {[['height', 'Height (cm)'], ['weight', 'Current weight (kg)'], ['targetWeight', 'Target weight (kg)']].map(([field, label]) => (
                  <label key={field} className="text-sm font-medium text-gray-300">{label}
                    <input type="number" min="0.1" step="0.1" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none focus:border-red-500" />
                  </label>
                ))}
              </div>
              <button type="submit" disabled={saving} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:shadow-red-950/60 disabled:cursor-wait disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Saving…' : 'Save profile'}
              </button>
            </>
          )}
        </form>

        <aside className="h-fit space-y-4 rounded-2xl border border-white/10 bg-[#171819] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)] sm:p-6">
          <h2 className="text-base font-bold text-white">Account details</h2>
          <p className="break-all text-sm text-gray-400"><span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Account ID</span>{user?.id || user?._id || 'Not available'}</p>
          <p className="flex items-center gap-2 text-sm text-gray-400"><Calendar className="h-4 w-4 text-red-300" />Member since {formattedDate}</p>
          <p className="border-t border-white/10 pt-4 text-xs leading-relaxed text-gray-500">Your profile is saved to your Kinetide account. Password changes and preferences are available in Settings.</p>
        </aside>
      </div>
    </section>
  );
}
