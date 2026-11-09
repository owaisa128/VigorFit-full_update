import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Target, Trash2 } from '../icons';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const ACTIVITIES = ['walking', 'jogging', 'running'];
const tz = () => new Date().getTimezoneOffset();

export default function TrainerGoals() {
  const [clients, setClients] = useState([]);
  const [goals, setGoals] = useState([]);
  const [clientId, setClientId] = useState('');
  const [activityTypes, setActivityTypes] = useState(['walking']);
  const [targetDistanceKm, setTargetDistanceKm] = useState('');
  const [targetMinutes, setTargetMinutes] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadGoals = useCallback(async () => {
    try {
      const { data } = await api.get('/goals/trainer', { params: { tz: tz() } });
      setGoals(Array.isArray(data.goals) ? data.goals : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load goals.');
    }
  }, []);

  useEffect(() => {
    api.get('/memberships/assigned-clients')
      .then(({ data }) => setClients((Array.isArray(data.clients) ? data.clients : []).filter((client) => client.membership?.accessLevel === 'premium' || client.membership?.planSlug === 'premium')))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load assigned clients.'));
    loadGoals();
    const interval = window.setInterval(loadGoals, 30000);
    return () => window.clearInterval(interval);
  }, [loadGoals]);

  const toggleActivity = (type) => setActivityTypes((current) => (
    current.includes(type) ? current.filter((item) => item !== type) : [...current, type]
  ));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      await api.post('/goals', {
        clientId,
        activityTypes,
        targetDistanceKm: Number(targetDistanceKm) || 0,
        targetMinutes: Number(targetMinutes) || 0,
        note,
      });
      setNotice('Daily goal assigned. The client has been notified.');
      setTargetDistanceKm('');
      setTargetMinutes('');
      setNote('');
      await loadGoals();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to assign the goal.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Remove this daily goal?')) return;
    try {
      await api.delete(`/goals/${id}`);
      await loadGoals();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove the goal.');
    }
  };

  const input = 'mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#080808] px-3 text-sm text-white';

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader as="header" className="rounded-3xl border border-red-500/20 bg-gradient-to-br from-[#211010] via-[#111111] to-[#0b0b0b] p-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300"><Target className="h-4 w-4" />Daily goals</p>
        <h1 className="mt-2 text-3xl font-black text-white">Assign a daily target</h1>
        <p className="mt-2 text-sm text-gray-400">Daily goals and live tracking are part of the Premium plan. Set a daily walking, jogging or running target for a Premium client; they record it with the GPS tracker and you follow it live.</p>
      </PageHeader>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4" />{notice}</p>}

      <form id="goal-assignment-form" onSubmit={submit} className="grid gap-4 rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)] sm:grid-cols-2">
        <label className="text-xs font-semibold text-gray-400 sm:col-span-2">
          Client
          <select required value={clientId} onChange={(event) => setClientId(event.target.value)} className={input}>
            <option value="">{clients.length ? 'Select a Premium client' : 'No Premium clients yet'}</option>
            {clients.map((client) => <option key={client._id} value={client._id}>{client.name}</option>)}
          </select>
        </label>
        <div className="sm:col-span-2">
          <p className="text-xs font-semibold text-gray-400">Allowed activities</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ACTIVITIES.map((type) => (
              <button key={type} type="button" onClick={() => toggleActivity(type)}
                className={`min-h-10 rounded-xl border px-4 text-sm font-semibold capitalize ${activityTypes.includes(type) ? 'border-red-500/50 bg-red-500/10 text-red-200' : 'border-white/10 text-gray-400'}`}>
                {type}
              </button>
            ))}
          </div>
        </div>
        <label className="text-xs font-semibold text-gray-400">
          Distance per day (km)
          <input type="number" min="0" max="200" step="0.1" value={targetDistanceKm} onChange={(event) => setTargetDistanceKm(event.target.value)} className={input} placeholder="e.g. 3" />
        </label>
        <label className="text-xs font-semibold text-gray-400">
          Moving time per day (minutes)
          <input type="number" min="0" max="1440" step="1" value={targetMinutes} onChange={(event) => setTargetMinutes(event.target.value)} className={input} placeholder="e.g. 30" />
        </label>
        <label className="text-xs font-semibold text-gray-400 sm:col-span-2">
          Note for the client (optional)
          <input maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} className={input} />
        </label>
        <p className="text-xs text-gray-500 sm:col-span-2">If you set both distance and time, the client must reach both. Assigning a new goal replaces the client&apos;s previous one.</p>
        <button type="submit" disabled={busy || !clientId || !activityTypes.length || (!Number(targetDistanceKm) && !Number(targetMinutes))}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 font-bold text-white disabled:opacity-50 sm:col-span-2">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Target className="h-5 w-5" />}Assign goal
        </button>
      </form>

      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
        <h2 className="text-lg font-bold text-white">Today&apos;s progress</h2>
        {!goals.length ? <EmptyState
          type="progress"
          sentence="Your clients’ daily progress will appear here after you assign a goal."
          actionLabel={clients.length ? 'Assign a goal' : 'View eligible clients'}
          {...(clients.length
            ? { onAction: () => document.getElementById('goal-assignment-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
            : { to: '/trainer/clients' })}
        /> : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {goals.map((goal) => (
              <article key={goal._id} className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-white">{goal.client?.name || 'Client'}</p>
                    <p className="mt-1 text-xs capitalize text-gray-400">
                      {goal.activityTypes.join(', ')} · {[goal.targetDistanceKm > 0 && `${goal.targetDistanceKm} km`, goal.targetMinutes > 0 && `${goal.targetMinutes} min`].filter(Boolean).join(' + ')} / day
                    </p>
                  </div>
                  <button type="button" onClick={() => remove(goal._id)} aria-label="Remove goal" className="rounded-lg border border-white/10 p-2 text-gray-400 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className={`h-full ${goal.today.met ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, goal.today.percent)}%` }} />
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  {goal.today.met ? 'Goal completed today' : `${goal.today.percent}% done`} · {goal.today.distanceKm} km · {goal.today.minutes} min · {goal.today.sessions} session{goal.today.sessions === 1 ? '' : 's'}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
