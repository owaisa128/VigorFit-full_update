import PageHeader from '../components/PageHeader';
import React, { useState, useEffect } from 'react';
import { Utensils, Plus, Trash2, Edit2, Search, Calendar, Flame, PieChart, CheckCircle2, AlertCircle } from '../icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { hasMinimumPlan } from '../utils/membershipAccess';
import PlanFeaturesPanel from '../components/PlanFeaturesPanel';
import EmptyState from '../components/EmptyState';
import StatCard from '../components/StatCard';

const getValueForQuantity = (nutrition, quantity, nutrient) => {
  const amount = Number(quantity.trim().match(/(\d+(?:[.,]\d+)?)/)?.[1]?.replace(',', '.'));
  const unit = quantity.trim().toLowerCase();
  const weightMatch = unit.match(/^\s*\d+(?:[.,]\d+)?\s*(kg|g|grams?)\s*$/);
  const per100g = nutrient === 'calories'
    ? nutrition.caloriesPer100g
    : nutrition[`${nutrient}Per100g`];

  if (weightMatch && Number.isFinite(amount)) {
    const grams = weightMatch[1] === 'kg' ? amount * 1000 : amount;
    return (per100g * grams) / 100;
  }

  const perServing = nutrient === 'calories'
    ? nutrition.caloriesPerServing
    : nutrition[`${nutrient}PerServing`];
  if (Number.isFinite(perServing) && Number.isFinite(amount)) {
    return perServing * amount;
  }

  if (nutrition.servingGrams && Number.isFinite(amount)) {
    return (per100g * nutrition.servingGrams * amount) / 100;
  }

  return per100g;
};

const roundNutritionValue = (value, field) => (
  field === 'calories' ? Math.round(value) : Math.round(value * 10) / 10
);

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snacks' },
];

export default function Nutrition() {
  const { user } = useAuth();
  const canTrackMacros = user?.role !== 'user' || hasMinimumPlan(user?.membership, 'basic');
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [summary, setSummary] = useState({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, mealCount: 0 });
  const [logs, setLogs] = useState([]);
  const [trainerMealPlans, setTrainerMealPlans] = useState([]);
  const [trainerMealsError, setTrainerMealsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [actionError, setActionError] = useState('');
  const [calorieGoal, setCalorieGoal] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedMealFilter, setSelectedMealFilter] = useState('all');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    date: selectedDate,
    mealType: 'breakfast',
    foodName: '',
    quantity: '1 serving',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    notes: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [foodLookup, setFoodLookup] = useState({ status: 'idle', match: null });
  const calorieManuallyEdited = React.useRef(false);
  const manuallyEditedFields = React.useRef(new Set());

  const fetchNutritionData = async () => {
    setLoading(true);
    setLoadError('');
    const [summaryResult, settingsResult, trainerMealsResult] = await Promise.allSettled([
      api.get('/nutrition/daily-summary', { params: { date: selectedDate } }),
      api.get('/settings'),
      api.get('/trainer-workspace/meal-plans'),
    ]);

    if (
      summaryResult.status === 'fulfilled'
      && summaryResult.value.data?.success
      && summaryResult.value.data.summary
      && Array.isArray(summaryResult.value.data.logs)
    ) {
      setSummary(summaryResult.value.data.summary);
      setLogs(summaryResult.value.data.logs);
    } else {
      const error = summaryResult.status === 'rejected' ? summaryResult.reason : null;
      setSummary({ totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, mealCount: 0 });
      setLogs([]);
      setLoadError(error?.response?.data?.message || 'Nutrition data could not be loaded. Please retry.');
    }

    if (settingsResult.status === 'fulfilled' && settingsResult.value.data?.success) {
      const goal = Number(settingsResult.value.data.settings?.dailyCalorieTarget);
      setCalorieGoal(Number.isFinite(goal) && goal > 0 ? goal : null);
      setSettingsError('');
    } else {
      setCalorieGoal(null);
      setSettingsError('Your saved calorie target is unavailable.');
    }
    if (trainerMealsResult.status === 'fulfilled' && Array.isArray(trainerMealsResult.value.data?.mealPlans)) {
      setTrainerMealPlans(trainerMealsResult.value.data.mealPlans);
      setTrainerMealsError('');
    } else {
      setTrainerMealPlans([]);
      setTrainerMealsError(
        trainerMealsResult.status === 'rejected'
          ? trainerMealsResult.reason.response?.data?.message || 'Your trainer meal plan could not be loaded.'
          : 'Your trainer meal plan response was invalid.',
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNutritionData();
  }, [selectedDate]);

  const handleOpenModal = (item = null) => {
    calorieManuallyEdited.current = Boolean(item);
    manuallyEditedFields.current = new Set(item ? ['calories', 'protein', 'carbs', 'fat'] : []);
    setFoodLookup({ status: 'idle', match: null });
    if (item) {
      setEditingItem(item);
      setFormData({
        date: item.date,
        mealType: item.mealType,
        foodName: item.foodName,
        quantity: item.quantity || '1 serving',
        calories: item.calories,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        notes: item.notes || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        date: selectedDate,
        mealType: 'breakfast',
        foodName: '',
        quantity: '1 serving',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        notes: '',
      });
    }
    setFormError('');
    setShowModal(true);
  };

  const handleLogTrainerMeal = (item) => {
    calorieManuallyEdited.current = true;
    manuallyEditedFields.current = new Set(['calories', 'protein', 'carbs', 'fat']);
    setFoodLookup({ status: 'idle', match: null });
    setEditingItem(null);
    setFormData({
      date: selectedDate,
      mealType: item.mealType,
      foodName: item.foodName,
      quantity: item.quantity || '1 serving',
      calories: item.calories,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
      notes: item.notes || '',
    });
    setFormError('');
    setShowModal(true);
  };

  useEffect(() => {
    const foodName = formData.foodName.trim();
    if (!showModal || calorieManuallyEdited.current || foodName.length < 2) {
      setFoodLookup({ status: 'idle', match: null });
      return undefined;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setFoodLookup({ status: 'loading', match: null });
      try {
        const { data } = await api.get('/nutrition/lookup', {
          params: { name: foodName },
          signal: controller.signal,
        });
        if (data?.success && data.nutrition) {
          setFoodLookup({ status: 'matched', match: data.nutrition });
        } else {
          setFoodLookup({ status: 'not-found', match: null });
        }
      } catch (error) {
        if (error.code !== 'ERR_CANCELED') {
          setFoodLookup({
            status: error.response?.status === 404 ? 'not-found' : 'error',
            match: null,
          });
        }
      }
    }, 500);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [formData.foodName, showModal]);

  useEffect(() => {
    if (foodLookup.match) {
      setFormData((current) => {
        const updated = { ...current };
        ['calories', 'protein', 'carbs', 'fat'].forEach((field) => {
          if (manuallyEditedFields.current.has(field)) return;
          const value = getValueForQuantity(foodLookup.match, current.quantity, field);
          if (Number.isFinite(value)) {
            updated[field] = String(roundNutritionValue(value, field));
          }
        });
        return updated;
      });
    }
  }, [foodLookup, formData.quantity]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.foodName.trim()) {
      setFormError('Food name is required');
      return;
    }
    const numericValues = ['calories', 'protein', 'carbs', 'fat']
      .map((field) => formData[field] === '' ? 0 : Number(formData[field]));
    if (formData.calories === '' || numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
      setFormError('Please enter a valid calorie count');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const nutritionData = {
        ...formData,
        calories: numericValues[0],
        protein: numericValues[1],
        carbs: numericValues[2],
        fat: numericValues[3],
      };
      if (editingItem) {
        await api.put(`/nutrition/${editingItem._id}`, nutritionData);
      } else {
        await api.post('/nutrition', nutritionData);
      }
      setShowModal(false);
      setActionError('');
      await fetchNutritionData();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save meal record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this meal record?')) return;
    setActionError('');
    try {
      await api.delete(`/nutrition/${id}`);
      await fetchNutritionData();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not delete the meal. Please try again.');
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesMeal = selectedMealFilter === 'all' || log.mealType === selectedMealFilter;
    const matchesSearch = log.foodName.toLowerCase().includes(search.toLowerCase());
    return matchesMeal && matchesSearch;
  });

  return (
    <div className="vf-theme-page min-h-screen bg-[#080808] py-8 px-4 text-white sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Bar */}
        <PageHeader as="div" className="vf-page-banner flex flex-col gap-4 rounded-2xl border border-[#E10600]/20 bg-[#171819] p-6 shadow-xl sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="min-w-0 flex flex-wrap items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              <Utensils className="h-8 w-8 shrink-0 text-[#E10600]" />
              {canTrackMacros ? 'Nutrition & Macro Tracker' : 'Nutrition Tracker'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">{canTrackMacros ? 'Track daily meals, calories, and macronutrient balance' : 'Daily calorie tracking and meal logging are included in the Free plan.'}</p>
          </div>

          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 bg-[#181824] border border-white/10 px-3 py-2 rounded-xl text-sm">
              <Calendar className="w-4 h-4 text-[#E10600]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white focus:outline-none"
              />
            </div>

            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 rounded-xl bg-[#E10600] px-5 py-2.5 font-semibold text-white shadow-[0_0_20px_rgba(225,6,0,0.4)] transition-all hover:scale-105 hover:bg-[#650000]"
            >
              <Plus className="w-5 h-5" />
              <span>Log Your Own Meal</span>
            </button>
          </div>
        </PageHeader>

        <PlanFeaturesPanel category="nutrition" />

        {(loadError || actionError || settingsError || trainerMealsError) && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{actionError || loadError || settingsError || trainerMealsError}</span>
            {loadError && <button type="button" onClick={fetchNutritionData} className="rounded-lg border border-rose-300/30 px-3 py-1.5 font-semibold hover:bg-rose-500/10">Retry</button>}
          </div>
        )}

        <section className="rounded-2xl border border-emerald-500/20 bg-[#111115] p-5 sm:p-6" aria-label="Trainer meal plan">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Your coach’s recommendations</p>
              <h2 className="mt-1 text-xl font-black text-white">Trainer meal plan</h2>
              <p className="mt-1 text-sm text-gray-400">Meals added by your assigned trainer. Log one to include it in your daily totals.</p>
            </div>
          </div>
          {trainerMealPlans.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-sm text-gray-400">Your trainer has not added any meal recommendations yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {trainerMealPlans.map((item) => (
                <article key={item._id} className="rounded-xl border border-white/10 bg-black/20 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] hover:shadow-lg hover:shadow-emerald-500/10">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">{item.mealType} · {item.trainer?.name || 'Your trainer'}</p>
                      <h3 className="mt-1 font-bold text-white">{item.foodName}</h3>
                      <p className="mt-1 text-xs text-gray-400">{item.quantity || '1 serving'}{item.notes ? ` · ${item.notes}` : ''}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-orange-200">{Math.round(item.calories || 0)} kcal</p>
                  </div>
                  {canTrackMacros && <p className="mt-3 text-xs text-gray-400">Protein {item.protein || 0}g · Carbs {item.carbs || 0}g · Fat {item.fat || 0}g</p>}
                  <button type="button" onClick={() => handleLogTrainerMeal(item)} className="mt-3 rounded-lg border border-emerald-500/25 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/10">
                    Log this meal
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Daily Calorie & Macro Progress Summary Cards */}
        <div className={`grid grid-cols-1 min-[420px]:grid-cols-2 gap-4 ${canTrackMacros ? 'lg:grid-cols-4' : 'lg:grid-cols-1'}`}>
          <StatCard
            label="Calories"
            value={summary.totalCalories}
            unit="kcal"
            icon={Flame}
            tone="workout"
            detail={calorieGoal ? `Daily goal: ${calorieGoal} kcal` : 'Daily goal not set'}
          />
          {canTrackMacros && (
            <>
              <StatCard label="Protein" value={summary.totalProtein} unit="g" icon={Utensils} tone="nutrition" detail="From logged meals" />
              <StatCard label="Carbohydrates" value={summary.totalCarbs} unit="g" icon={Utensils} tone="nutrition" detail="From logged meals" />
              <StatCard label="Fats" value={summary.totalFat} unit="g" icon={PieChart} tone="nutrition" detail="From logged meals" />
            </>
          )}
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0F0F14] p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
            <button
              onClick={() => setSelectedMealFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedMealFilter === 'all'
                  ? 'bg-[#E10600] text-white shadow-[0_0_15px_rgba(225, 6, 0,0.4)]'
                  : 'bg-[#181824] text-gray-400 hover:-translate-y-0.5 hover:border hover:border-[#E10600]/40 hover:bg-[#E10600]/10 hover:text-white'
              }`}
            >
              All Meals ({logs.length})
            </button>
            {MEAL_TYPES.map((meal) => (
              <button
                key={meal.id}
                onClick={() => setSelectedMealFilter(meal.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  selectedMealFilter === meal.id
                    ? 'bg-[#E10600] text-white shadow-[0_0_15px_rgba(225, 6, 0,0.4)]'
                    : 'bg-[#181824] text-gray-400 hover:-translate-y-0.5 hover:border hover:border-[#E10600]/40 hover:bg-[#E10600]/10 hover:text-white'
                }`}
              >
                <span>{meal.icon}</span>
                <span>{meal.label}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search food entries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#181824] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E10600]"
            />
          </div>
        </div>

        {/* Meal Logs Display */}
        {loading ? (
          <div className="text-center py-16 bg-[#0F0F14] rounded-2xl border border-white/5">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#E10600] mb-3"></div>
            <p className="text-sm text-gray-400">Loading nutrition entries...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState type="meals" sentence={`No meals logged for ${selectedDate}. Add a meal to begin tracking.`} actionLabel="Add meal" onAction={() => handleOpenModal()} />
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((item) => {
              const mealConfig = MEAL_TYPES.find((m) => m.id === item.mealType) || MEAL_TYPES[0];
              return (
                <div
                  key={item._id}
                  className="border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <Utensils className="h-5 w-5 shrink-0 text-[var(--nutrition)]" aria-hidden="true" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-white text-base">{item.foodName}</h4>
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-white/10 rounded-md text-gray-300">
                          {item.mealType}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Quantity: <span className="text-gray-200">{item.quantity}</span> {item.notes && `• ${item.notes}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-white/10">
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[10px]">Calories</span>
                        <span className="font-extrabold text-[#FF6B63] text-sm">{item.calories} kcal</span>
                      </div>
                      {canTrackMacros && <div>
                        <span className="text-gray-400 block text-[10px]">P / C / F</span>
                        <span className="font-semibold text-gray-200">
                          {item.protein}g / {item.carbs}g / {item.fat}g
                        </span>
                      </div>}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded-lg transition-colors"
                        title="Edit Meal"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Delete Meal"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal for Log / Edit Meal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 bg-black/80 backdrop-blur-sm animate-in fade-in sm:p-4">
            <div className="bg-[#0F0F16] border border-[#E10600]/30 w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl shadow-2xl p-4 relative sm:max-h-[calc(100dvh-2rem)] sm:p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-[#E10600]" />
                {editingItem ? 'Edit Meal Record' : 'Log New Meal'}
              </h3>

              {formError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 p-3 rounded-xl flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E10600]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Meal Type</label>
                    <select
                      value={formData.mealType}
                      onChange={(e) => setFormData({ ...formData, mealType: e.target.value })}
                      className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E10600]"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Food Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Grilled Chicken Salad"
                    value={formData.foodName}
                    onChange={(e) => {
                      calorieManuallyEdited.current = false;
                      manuallyEditedFields.current.clear();
                      setFoodLookup({ status: 'idle', match: null });
                      setFormData({
                        ...formData,
                        foodName: e.target.value,
                        calories: '',
                        protein: '',
                        carbs: '',
                        fat: '',
                      });
                    }}
                    className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E10600]"
                    required
                  />
                  {foodLookup.status === 'loading' && (
                    <p className="mt-1 text-xs text-gray-400">Looking up nutrition...</p>
                  )}
                  {foodLookup.status === 'matched' && (
                    <p className="mt-1 text-xs text-emerald-300">
                      {canTrackMacros ? 'Calories and available macros' : 'Calories'} matched to {foodLookup.match.foodName} ({foodLookup.match.source}).
                      Values are per 100 g unless serving details are available; gram quantities scale automatically.
                    </p>
                  )}
                  {foodLookup.status === 'not-found' && (
                    <p className="mt-1 text-xs text-amber-300">
                      No matching food found. Enter nutrition values manually.
                    </p>
                  )}
                  {foodLookup.status === 'error' && (
                    <p className="mt-1 text-xs text-amber-300">
                      Nutrition lookup is unavailable. Enter values manually.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Quantity</label>
                    <input
                      type="text"
                      placeholder="e.g. 200g or 1 bowl"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E10600]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Calories (kcal) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 450"
                      value={formData.calories}
                      onChange={(e) => {
                        calorieManuallyEdited.current = true;
                        manuallyEditedFields.current.add('calories');
                        setFormData({ ...formData, calories: e.target.value });
                      }}
                      className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E10600]"
                      required
                    />
                  </div>
                </div>

                {canTrackMacros && <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Protein (g)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.protein}
                      onChange={(e) => {
                        manuallyEditedFields.current.add('protein');
                        setFormData({ ...formData, protein: e.target.value });
                      }}
                      className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E10600]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.carbs}
                      onChange={(e) => {
                        manuallyEditedFields.current.add('carbs');
                        setFormData({ ...formData, carbs: e.target.value });
                      }}
                      className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E10600]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Fat (g)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.fat}
                      onChange={(e) => {
                        manuallyEditedFields.current.add('fat');
                        setFormData({ ...formData, fat: e.target.value });
                      }}
                      className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E10600]"
                    />
                  </div>
                </div>}

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. High protein meal after workout"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-[#181824] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E10600]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#E10600] hover:bg-[#650000] text-white font-semibold rounded-xl text-xs disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : editingItem ? 'Update Meal' : 'Save Meal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
