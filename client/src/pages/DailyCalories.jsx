import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Droplets, Flame, Loader2, Utensils } from '../icons';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const getToday = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const mealNames = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export default function DailyCalories() {
  const [date, setDate] = useState(getToday);
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [summaryResult, settingsResult] = await Promise.allSettled([
      api.get('/nutrition/daily-summary', { params: { date } }),
      api.get('/settings'),
    ]);

    if (summaryResult.status !== 'fulfilled'
      || !summaryResult.value.data?.success
      || !summaryResult.value.data.summary
      || !Array.isArray(summaryResult.value.data.logs)) {
      const requestError = summaryResult.status === 'rejected' ? summaryResult.reason : null;
      setSummary(null);
      setLogs([]);
      setError(requestError?.response?.data?.message || 'Daily calorie data could not be loaded. Please retry.');
      setLoading(false);
      return;
    }

    setSummary(summaryResult.value.data.summary);
    setLogs(summaryResult.value.data.logs);
    if (settingsResult.status === 'fulfilled' && settingsResult.value.data?.success) {
      const dailyGoal = Number(settingsResult.value.data.settings?.dailyCalorieTarget);
      setGoal(Number.isFinite(dailyGoal) && dailyGoal > 0 ? dailyGoal : null);
    } else {
      setGoal(null);
      setError(settingsResult.reason?.response?.data?.message || 'Your saved calorie target is unavailable.');
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  const total = summary?.totalCalories || 0;
  const remaining = goal ? Math.max(goal - total, 0) : null;
  const percent = goal ? Math.min(Math.round((total / goal) * 100), 100) : 0;
  const mealTotals = summary?.byMeal || {};

  return (
    <main className="vf-theme-page mx-auto w-full max-w-5xl space-y-6 px-4 py-8 text-white sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-calories-header flex flex-col gap-4 rounded-2xl border border-red-500/20 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300">
            <Flame className="h-4 w-4" /> Daily tracking
          </p>
          <h1 className="mt-2 text-3xl font-black">Daily Calories</h1>
          <p className="mt-2 text-sm text-gray-400">See how today’s logged meals compare with your calorie target.</p>
        </div>
        <label className="vf-calories-date flex items-center gap-2 rounded-xl border px-3 py-2 text-sm">
          <CalendarDays className="h-4 w-4 text-red-300" />
          <span className="sr-only">Choose a date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="bg-transparent outline-none" />
        </label>
      </PageHeader>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}</span>
          <button type="button" onClick={load} disabled={loading} className="shrink-0 font-bold underline disabled:opacity-50">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-red-400" />Loading calorie summary...
        </div>
      ) : summary && (
        <>
          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]" aria-label="Calorie summary">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Calories consumed</p>
                <p className="mt-2 text-4xl font-black">{total.toLocaleString()} <span className="text-base font-semibold text-gray-400">kcal</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Daily target</p>
                <p className="mt-2 text-xl font-bold">{goal ? `${goal.toLocaleString()} kcal` : 'Not set'}</p>
              </div>
            </div>
            <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-400 transition-all" style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-gray-400">
              <span>{goal ? `${percent}% of target` : 'Set a target in Settings to track progress'}</span>
              {goal && <span>{remaining ? `${remaining.toLocaleString()} kcal remaining` : 'Daily target reached'}</span>}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5 text-sm text-gray-400">
              <span>{summary.mealCount} {summary.mealCount === 1 ? 'meal' : 'meals'} logged</span>
              <div className="flex flex-wrap gap-2">
                <Link to="/nutrition" className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-bold text-white transition hover:bg-red-700">
                  <Utensils className="h-4 w-4" />Log a meal
                </Link>
                <Link to="/water-tracker" className="inline-flex items-center gap-2 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-2.5 font-bold text-sky-100 transition hover:bg-sky-500/20">
                  <Droplets className="h-4 w-4" />Water tracker
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Calories by meal">
            {Object.entries(mealNames).map(([key, label]) => (
              <article key={key} className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{label}</p>
                <p className="mt-2 text-2xl font-black">{Math.round(mealTotals[key] || 0).toLocaleString()} <span className="text-xs font-semibold text-gray-400">kcal</span></p>
              </article>
            ))}
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#111111] p-6">
            <h2 className="text-lg font-bold">Meals for this day</h2>
            {logs.length === 0 ? (
              <EmptyState
                type="meals"
                sentence="No meals logged yet. Add your first meal to track calories and macros."
                to="/nutrition"
                actionLabel="Log meal"
              />
            ) : (
              <ul className="mt-4 divide-y divide-white/10">
                {logs.map((meal) => (
                  <li key={meal._id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-semibold text-white">{meal.foodName}</p>
                      <p className="mt-1 text-xs capitalize text-gray-500">{mealNames[meal.mealType] || meal.mealType}</p>
                    </div>
                    <p className="font-bold text-orange-200">{Math.round(meal.calories || 0).toLocaleString()} kcal</p>
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
