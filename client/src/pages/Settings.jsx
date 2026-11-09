import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileText, Loader2, Lock, Save, Settings as SettingsIcon } from '../icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { exportToCSV, exportToPDFReport } from '../utils/exportUtils';
import { hasMinimumPlan } from '../utils/membershipAccess';
import PasswordField from '../components/PasswordField';

const defaultSettings = {
  preferredUnit: 'metric',
  dailyCalorieTarget: 2200,
  dailyStepGoal: 10000,
  dailyWaterGoal: 2500,
  dailyWorkoutGoal: 45,
  notificationsEnabled: true,
  emailNotifications: false,
  weeklySummary: true,
};

export default function Settings() {
  const { user, updateUser } = useAuth();
  const canAccessBasicFeatures = user?.role !== 'user' || hasMinimumPlan(user?.membership, 'basic');
  const [settings, setSettings] = useState(defaultSettings);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.get('/settings');
      if (!data?.success || !data.settings) throw new Error(data?.message || 'Settings response was invalid.');
      setSettings({ ...defaultSettings, ...data.settings });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || error.message || 'Unable to load settings.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving('settings');
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.put('/settings', {
        preferredUnit: settings.preferredUnit,
        dailyCalorieTarget: Number(settings.dailyCalorieTarget),
        dailyStepGoal: Number(settings.dailyStepGoal),
        dailyWaterGoal: Number(settings.dailyWaterGoal),
        dailyWorkoutGoal: Number(settings.dailyWorkoutGoal),
        notificationsEnabled: Boolean(settings.notificationsEnabled),
        emailNotifications: Boolean(settings.emailNotifications),
        weeklySummary: Boolean(settings.weeklySummary),
      });
      if (!data?.success || !data.settings) throw new Error(data?.message || 'Settings update was unsuccessful.');
      setSettings({ ...defaultSettings, ...data.settings });
      setMessage({ type: 'success', text: data.message || 'Preferences saved.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || error.message || 'Unable to save preferences.' });
    } finally {
      setSaving('');
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (password.length < 6) {
      setMessage({ type: 'error', text: 'Password must contain at least 6 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'The passwords do not match.' });
      return;
    }
    setSaving('password');
    setMessage({ type: '', text: '' });
    try {
      const { data } = await api.put('/auth/profile', { password });
      if (!data?.success) throw new Error(data?.message || 'Password update was unsuccessful.');
      if (data.user) updateUser(data.user);
      setPassword('');
      setConfirmPassword('');
      setMessage({ type: 'success', text: data.message || 'Password updated.' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || error.message || 'Unable to update your password.' });
    } finally {
      setSaving('');
    }
  };

  const runExport = async (label, createFile) => {
    setSaving(label);
    setMessage({ type: '', text: '' });
    try {
      await createFile();
      setMessage({ type: 'success', text: `${label} export downloaded.` });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || error.message || `Unable to export ${label.toLowerCase()}.` });
    } finally {
      setSaving('');
    }
  };

  const exportWorkouts = () => runExport('Workout', async () => {
    const { data } = await api.get('/workouts');
    const records = Array.isArray(data) ? data : data?.workouts;
    if (!Array.isArray(records)) throw new Error('The workout export response was invalid.');
    exportToCSV(records.map((workout) => ({
      ID: workout._id,
      Title: workout.title,
      Category: workout.category || 'General',
      ExercisesCount: workout.exercises?.length || 0,
      CreatedAt: workout.createdAt ? new Date(workout.createdAt).toLocaleDateString() : '',
    })), 'kinetide_workouts.csv');
  });

  const exportNutrition = () => runExport('Nutrition', async () => {
    const { data } = await api.get('/nutrition');
    if (!Array.isArray(data?.nutrition)) throw new Error('The nutrition export response was invalid.');
    exportToCSV(data.nutrition.map((entry) => ({
      Date: entry.date,
      MealType: entry.mealType,
      FoodName: entry.foodName,
      Quantity: entry.quantity,
      Calories: entry.calories,
      Protein_g: entry.protein,
      Carbs_g: entry.carbs,
      Fat_g: entry.fat,
    })), 'kinetide_nutrition.csv');
  });

  const exportProgress = () => runExport('Progress', async () => {
    const { data } = await api.get('/progress');
    if (!Array.isArray(data?.progress)) throw new Error('The progress export response was invalid.');
    exportToCSV(data.progress.map((entry) => ({
      Date: entry.date,
      Weight_kg: entry.weight,
      BodyFat_Percent: entry.bodyFatPercentage,
      BenchMax_kg: entry.benchPressMax,
      SquatMax_kg: entry.squatMax,
      DeadliftMax_kg: entry.deadliftMax,
    })), 'kinetide_progress.csv');
  });

  const exportReport = () => runExport('Fitness report', async () => {
    const [workoutsResponse, nutritionResponse, progressResponse] = await Promise.all([
      api.get('/workouts'),
      api.get('/nutrition'),
      api.get('/progress/summary'),
    ]);
    const workouts = Array.isArray(workoutsResponse.data) ? workoutsResponse.data : workoutsResponse.data?.workouts;
    if (!Array.isArray(workouts) || !Array.isArray(nutritionResponse.data?.nutrition) || !progressResponse.data?.summary) {
      throw new Error('One or more fitness report responses were invalid.');
    }
    const summary = progressResponse.data.summary;
    exportToPDFReport('Kinetide Fitness Summary', `User: ${user?.name || ''} (${user?.email || ''})`, ['Metric', 'Value', 'Status'], [
      ['Total workouts', `${workouts.length}`, 'Recorded'],
      ['Nutrition entries', `${nutritionResponse.data.nutrition.length}`, 'Recorded'],
      ['Current body weight', `${summary.currentWeight ?? '--'} kg`, 'Latest'],
      ['Bench press record', `${summary.maxBench ?? 0} kg`, 'Personal record'],
      ['Squat record', `${summary.maxSquat ?? 0} kg`, 'Personal record'],
      ['Deadlift record', `${summary.maxDeadlift ?? 0} kg`, 'Personal record'],
    ]);
  });

  const updateField = (field, value) => setSettings((current) => ({ ...current, [field]: value }));

  return (
    <section className="vf-theme-page mx-auto w-full max-w-5xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner rounded-2xl border border-white/10 bg-[#171819] p-5 sm:p-7">
        <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-300"><SettingsIcon className="h-4 w-4" /> Account preferences</p>
        <h1 className="text-3xl font-black text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">Manage saved fitness targets, measurement units, notifications, and account security.</p>
      </PageHeader>

      {message.text && <div role={message.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-4 text-sm ${message.type === 'success' ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200' : 'border-red-500/25 bg-red-950/30 text-red-200'}`}>{message.type === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}{message.text}</div>}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-red-500" />Loading saved settings…</div>
      ) : (
        <>
          <form onSubmit={saveSettings} className="rounded-2xl border border-white/10 bg-[#171819] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)] sm:p-7">
            <h2 className="mb-5 text-lg font-bold text-white">Fitness goals & preferences</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-300">Measurement units
                <select value={settings.preferredUnit} onChange={(event) => updateField('preferredUnit', event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 text-sm text-white outline-none focus:border-red-500"><option value="metric">Metric (kg, cm)</option><option value="imperial">Imperial (lb, in)</option></select>
              </label>
              {[
                ...(canAccessBasicFeatures ? [['dailyCalorieTarget', 'Daily calorie target', 500, 'kcal']] : []),
                ['dailyStepGoal', 'Daily step goal', 0, 'steps'],
                ...(canAccessBasicFeatures ? [['dailyWaterGoal', 'Daily water goal', 250, 'ml', 10000]] : []),
                ['dailyWorkoutGoal', 'Daily workout goal', 0, 'minutes'],
              ].map(([field, label, min, unit, max]) => (
                <label key={field} className="text-sm font-medium text-gray-300">{label}
                  <div className="relative mt-1.5"><input type="number" min={min} max={max} step="1" required value={settings[field]} onChange={(event) => updateField(field, event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#080808] px-3.5 py-3 pr-20 text-sm text-white outline-none focus:border-red-500" /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-gray-500">{unit}</span></div>
                </label>
              ))}
            </div>
            <fieldset className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
              {[['notificationsEnabled', 'In-app notifications'], ['emailNotifications', 'Email notifications'], ['weeklySummary', 'Weekly summary']].map(([field, label]) => (
                <label key={field} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#101112] p-3 text-sm text-gray-300"><input type="checkbox" checked={Boolean(settings[field])} onChange={(event) => updateField(field, event.target.checked)} className="h-4 w-4 accent-red-600" />{label}</label>
              ))}
            </fieldset>
            <button type="submit" disabled={!!saving} className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{saving === 'settings' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving === 'settings' ? 'Saving…' : 'Save preferences'}</button>
          </form>

          <form onSubmit={savePassword} className="rounded-2xl border border-white/10 bg-[#171819] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)] sm:p-7">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-white"><Lock className="h-5 w-5 text-red-300" />Account security</h2>
            <p className="mb-4 break-words text-sm text-gray-400">Update the password for {user?.email || 'your account'}.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label htmlFor="settings-new-password" className="text-sm font-medium text-gray-300">New password
                <PasswordField id="settings-new-password" minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] py-3 pl-3.5 pr-12 text-sm text-white outline-none focus:border-red-500" toggleClassName="text-gray-400 hover:bg-white/5 hover:text-white" />
              </label>
              <label htmlFor="settings-confirm-password" className="text-sm font-medium text-gray-300">Confirm new password
                <PasswordField id="settings-confirm-password" minLength={6} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] py-3 pl-3.5 pr-12 text-sm text-white outline-none focus:border-red-500" toggleClassName="text-gray-400 hover:bg-white/5 hover:text-white" />
              </label>
            </div>
            <button type="submit" disabled={!!saving} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:opacity-60">{saving === 'password' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}{saving === 'password' ? 'Updating…' : 'Update password'}</button>
          </form>
        </>
      )}

      {canAccessBasicFeatures && <section className="rounded-2xl border border-white/10 bg-[#171819] p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-2"><Download className="h-5 w-5 text-red-300" /><div><h2 className="text-lg font-bold text-white">Export your fitness data</h2><p className="text-sm text-gray-400">Exports use records returned by your account’s API endpoints.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Workouts CSV', FileSpreadsheet, exportWorkouts],
            ['Nutrition CSV', FileSpreadsheet, exportNutrition],
            ['Progress CSV', FileSpreadsheet, exportProgress],
            ['Fitness report PDF', FileText, exportReport],
          ].map(([label, Icon, handler]) => (
            <button key={label} type="button" onClick={handler} disabled={!!saving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-[#101112] px-4 py-3 text-sm font-semibold text-gray-200 transition hover:border-red-500/30 hover:bg-red-950/20 disabled:opacity-50"><Icon className="h-4 w-4 text-red-300" />{saving === label.replace(/ (CSV|PDF)$/, '') ? 'Preparing…' : label}</button>
          ))}
        </div>
      </section>}
      <button type="button" onClick={loadSettings} disabled={loading || !!saving} className="text-xs font-semibold text-gray-400 underline decoration-white/20 underline-offset-4 hover:text-white disabled:opacity-50">Reload saved settings</button>
    </section>
  );
}
