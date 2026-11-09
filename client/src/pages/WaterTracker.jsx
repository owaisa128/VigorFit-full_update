import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Droplets, Loader2, Plus, Settings2, Trash2 } from '../icons';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const quickAmounts = [250, 500, 750];

export default function WaterTracker() {
  const [date, setDate] = useState(getToday);
  const [goal, setGoal] = useState(2500);
  const [goalInput, setGoalInput] = useState('2500');
  const [totalMl, setTotalMl] = useState(0);
  const [entries, setEntries] = useState([]);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [waterResponse, settingsResponse] = await Promise.all([
        api.get('/water-intake', { params: { date } }),
        api.get('/settings'),
      ]);
      if (!waterResponse.data?.success || !Array.isArray(waterResponse.data.entries)) {
        throw new Error('Water intake data could not be loaded.');
      }
      if (!settingsResponse.data?.success || !settingsResponse.data.settings) {
        throw new Error('Water target could not be loaded.');
      }
      const dailyGoal = Number(settingsResponse.data.settings.dailyWaterGoal);
      setGoal(Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : 2500);
      setGoalInput(String(Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : 2500));
      setTotalMl(Number(waterResponse.data.totalMl) || 0);
      setEntries(waterResponse.data.entries);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load water tracking.');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const addWater = async (amountMl) => {
    if (!Number.isInteger(amountMl) || amountMl < 1 || amountMl > 10000) {
      setError('Enter a water amount between 1 and 10,000 ml.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.post('/water-intake', { date, amountMl });
      if (!data?.success || !data.entry) throw new Error(data?.message || 'Water intake was not saved.');
      setCustomAmount('');
      setNotice(`${amountMl} ml added to your daily water intake.`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save water intake.');
    } finally {
      setSaving(false);
    }
  };

  const saveGoal = async (event) => {
    event.preventDefault();
    const nextGoal = Number(goalInput);
    if (!Number.isInteger(nextGoal) || nextGoal < 250 || nextGoal > 10000) {
      setError('Set a daily water target between 250 and 10,000 ml.');
      return;
    }
    setSavingGoal(true);
    setError('');
    setNotice('');
    try {
      const { data } = await api.put('/settings', { dailyWaterGoal: nextGoal });
      if (!data?.success) throw new Error(data?.message || 'Water target was not saved.');
      setGoal(nextGoal);
      setGoalInput(String(nextGoal));
      setNotice('Daily water target saved.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to save water target.');
    } finally {
      setSavingGoal(false);
    }
  };

  const deleteEntry = async (entryId) => {
    setDeletingId(entryId);
    setError('');
    setNotice('');
    try {
      await api.delete(`/water-intake/${entryId}`);
      setNotice('Water entry removed.');
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to remove water entry.');
    } finally {
      setDeletingId('');
    }
  };

  const progress = goal > 0 ? Math.min(Math.round((totalMl / goal) * 100), 100) : 0;
  const remaining = Math.max(goal - totalMl, 0);

  return (
    <main className="vf-theme-page mx-auto w-full max-w-4xl space-y-6 px-4 py-8 text-white sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner flex flex-col gap-4 rounded-2xl border border-[#E10600]/20 bg-[#11151A] p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300"><Droplets className="h-4 w-4" />Daily tracking</p>
          <h1 className="mt-2 text-3xl font-black">Water Tracker</h1>
          <p className="mt-2 text-sm text-gray-400">Track water separately from meals and calorie intake.</p>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm">
          <CalendarDays className="h-4 w-4 text-red-300" />
          <span className="sr-only">Choose a date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="bg-transparent outline-none" />
        </label>
      </PageHeader>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}<button type="button" onClick={load} className="ml-auto font-bold underline">Retry</button></div>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-sm text-emerald-200">{notice}</p>}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-red-300" />Loading water tracker…</div>
      ) : (
        <>
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]" aria-label="Daily water progress">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Water consumed</p>
                <p className="mt-2 text-4xl font-black">{totalMl.toLocaleString()} <span className="text-base font-semibold text-gray-400">ml</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Daily target</p>
                <p className="mt-2 text-xl font-bold">{goal.toLocaleString()} ml</p>
              </div>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#E10600] to-[#FCA5A5] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 flex justify-between gap-2 text-xs text-gray-400">
              <span>{progress}% of target</span>
              <span>{remaining ? `${remaining.toLocaleString()} ml remaining` : 'Daily target reached'}</span>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
            <h2 className="text-lg font-bold">Add water</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {quickAmounts.map((amount) => (
                <button key={amount} type="button" disabled={saving} onClick={() => addWater(amount)} className="vf-water-quick-button inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(225,6,0,0.16)] disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{amount} ml
                </button>
              ))}
              <form onSubmit={(event) => { event.preventDefault(); addWater(Number(customAmount)); }} className="flex gap-2">
                <label className="sr-only" htmlFor="custom-water-amount">Custom water amount in milliliters</label>
                <input id="custom-water-amount" type="number" min="1" max="10000" step="1" required value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} placeholder="Custom ml" className="vf-water-input w-32 rounded-xl border border-white/10 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#E10600]" />
                <button type="submit" disabled={saving} className="vf-water-add-button rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-4 py-2 text-sm font-bold text-white shadow-md shadow-[#E10600]/20 transition duration-200 hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_8px_20px_rgba(225,6,0,0.28)] disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}</button>
              </form>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold"><Settings2 className="h-4 w-4 text-red-300" />Water target</h2>
                <p className="mt-1 text-xs text-gray-400">This target is independent from your calorie goal.</p>
              </div>
              <form onSubmit={saveGoal} className="flex items-center gap-2">
                <label htmlFor="water-goal" className="sr-only">Daily water target in milliliters</label>
                <input id="water-goal" type="number" min="250" max="10000" step="50" required value={goalInput} onChange={(event) => setGoalInput(event.target.value)} className="vf-water-input w-32 rounded-xl border border-white/10 bg-[#080808] px-3 py-2 text-sm text-white outline-none focus:border-[#E10600]" />
                <span className="text-xs text-gray-400">ml</span>
                <button type="submit" disabled={savingGoal} className="vf-water-save-button rounded-xl border border-[#E10600]/30 px-3 py-2 text-xs font-bold text-[#FCA5A5] transition hover:bg-[#E10600]/10 disabled:opacity-50">{savingGoal ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save target'}</button>
              </form>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
            <h2 className="text-lg font-bold">Water entries</h2>
            {entries.length === 0 ? (
              <EmptyState type="water" sentence="No water logged yet. Add your first drink to track hydration." actionLabel="Add 250 ml" onAction={() => addWater(250)} />
            ) : (
              <ul className="mt-3 divide-y divide-white/10">
                {entries.map((entry) => (
                  <li key={entry._id} className="flex items-center justify-between gap-3 py-3">
                    <span className="text-sm font-semibold text-white">{entry.amountMl.toLocaleString()} ml</span>
                    <div className="flex items-center gap-3">
                      <time className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                      <button type="button" onClick={() => deleteEntry(entry._id)} disabled={Boolean(deletingId)} aria-label={`Remove ${entry.amountMl} ml water entry`} className="rounded-lg p-2 text-gray-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50">
                        {deletingId === entry._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
