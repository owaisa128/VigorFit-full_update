import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Plus, Trash2, Utensils } from '../icons';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';

const initialMeal = {
  mealType: 'breakfast',
  foodName: '',
  quantity: '1 serving',
  calories: '',
  protein: '0',
  carbs: '0',
  fat: '0',
  notes: '',
};

export default function TrainerMealPlans() {
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [mealPlans, setMealPlans] = useState([]);
  const [form, setForm] = useState(initialMeal);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/memberships/assigned-clients');
      if (!Array.isArray(data?.clients)) throw new Error('Assigned clients were not returned.');
      setClients(data.clients);
      setSelectedClientId((current) => (
        data.clients.some((client) => client._id === current) ? current : data.clients[0]?._id || ''
      ));
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load your clients.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMealPlans = useCallback(async () => {
    if (!selectedClientId) {
      setMealPlans([]);
      return;
    }
    setError('');
    try {
      const { data } = await api.get('/trainer-workspace/meal-plans', {
        params: { clientId: selectedClientId },
      });
      if (!Array.isArray(data?.mealPlans)) throw new Error('Meal plans were not returned.');
      setMealPlans(data.mealPlans);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load this client’s meal plan.');
    }
  }, [selectedClientId]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    loadMealPlans();
  }, [loadMealPlans]);

  const addMeal = async (event) => {
    event.preventDefault();
    if (!selectedClientId) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        clientId: selectedClientId,
        calories: Number(form.calories),
        protein: Number(form.protein),
        carbs: Number(form.carbs),
        fat: Number(form.fat),
      };
      const { data } = await api.post('/trainer-workspace/meal-plans', payload);
      if (!data?.mealPlan) throw new Error('The new meal was not returned.');
      setMealPlans((current) => [data.mealPlan, ...current]);
      setForm(initialMeal);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to add this meal.');
    } finally {
      setSaving(false);
    }
  };

  const removeMeal = async (mealPlan) => {
    setDeletingId(mealPlan._id);
    setError('');
    try {
      await api.delete(`/trainer-workspace/meal-plans/${mealPlan._id}`);
      setMealPlans((current) => current.filter(({ _id }) => _id !== mealPlan._id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove this meal.');
    } finally {
      setDeletingId('');
    }
  };

  const fieldClass = 'mt-1 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500';

  return (
    <section className="vf-theme-page mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 to-[#111111] p-6">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300"><Utensils className="h-4 w-4" />Trainer workspace</p>
        <h1 className="mt-2 text-3xl font-black text-white">Client Meal Plans</h1>
        <p className="mt-2 text-sm text-gray-400">Add nutrition recommendations that your active assigned clients can view and log themselves.</p>
      </PageHeader>

      {error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}

      {loading ? (
        <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin" />Loading clients…</div>
      ) : clients.length === 0 ? (
        <EmptyState
          type="clients"
          sentence="Your assigned clients will appear here once they choose you as their coach."
          actionLabel="View clients"
          to="/trainer/clients"
        />
      ) : (
        <>
          <label className="block max-w-xl text-sm font-semibold text-gray-300">
            Select client
            <select value={selectedClientId} onChange={(event) => setSelectedClientId(event.target.value)} className={fieldClass}>
              {clients.map((client) => <option key={client._id} value={client._id}>{client.name} · {client.email}</option>)}
            </select>
          </label>

          <form id="meal-form" onSubmit={addMeal} className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
            <h2 className="text-xl font-black text-white">Add a meal recommendation</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-xs font-semibold text-gray-300">Meal
                <select value={form.mealType} onChange={(event) => setForm((current) => ({ ...current, mealType: event.target.value }))} className={fieldClass}>
                  <option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-300 sm:col-span-2">Food
                <input required maxLength={120} value={form.foodName} onChange={(event) => setForm((current) => ({ ...current, foodName: event.target.value }))} className={fieldClass} placeholder="e.g. Chicken and rice" />
              </label>
              <label className="text-xs font-semibold text-gray-300">Serving size
                <input maxLength={80} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} className={fieldClass} />
              </label>
              {[
                ['calories', 'Calories (kcal)', 10000],
                ['protein', 'Protein (g)', 1000],
                ['carbs', 'Carbs (g)', 1000],
                ['fat', 'Fat (g)', 1000],
              ].map(([key, label, max]) => (
                <label key={key} className="text-xs font-semibold text-gray-300">{label}
                  <input required={key === 'calories'} type="number" min="0" max={max} step="0.1" value={form[key]} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} className={fieldClass} />
                </label>
              ))}
              <label className="text-xs font-semibold text-gray-300 sm:col-span-2 lg:col-span-4">Notes
                <textarea maxLength={500} rows={2} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className={fieldClass} placeholder="Preparation or nutrition guidance" />
              </label>
            </div>
            <button type="submit" disabled={saving || !selectedClientId} className="vf-meal-plan-submit mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add to meal plan
            </button>
          </form>

          <section className="space-y-3">
            <h2 className="text-xl font-black text-white">Current recommendations</h2>
            {mealPlans.length === 0 ? (
              <EmptyState
                type="meals"
                sentence="No meals recommended for this client yet. Build their first meal guidance."
                actionLabel="Add meal recommendation"
                onAction={() => document.getElementById('meal-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              />
            ) : mealPlans.map((meal) => (
              <article key={meal._id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">{meal.mealType}</p>
                  <h3 className="mt-1 font-bold text-white">{meal.foodName}</h3>
                  <p className="mt-1 text-xs text-gray-400">{meal.quantity} · {meal.calories} kcal · P {meal.protein}g / C {meal.carbs}g / F {meal.fat}g</p>
                  {meal.notes && <p className="mt-2 text-sm text-gray-300">{meal.notes}</p>}
                </div>
                <button type="button" onClick={() => removeMeal(meal)} disabled={Boolean(deletingId)} aria-label={`Remove ${meal.foodName}`} className="self-start rounded-xl border border-red-500/20 p-2 text-red-300 hover:bg-red-500/10 disabled:opacity-50 sm:self-auto">
                  {deletingId === meal._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </article>
            ))}
          </section>
        </>
      )}
    </section>
  );
}
