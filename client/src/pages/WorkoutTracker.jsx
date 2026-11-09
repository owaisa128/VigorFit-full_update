import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Circle, Dumbbell, Flag, Loader2, Pause, Play, ShieldCheck, Square, Timer } from '../icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { hasFeature } from '../utils/membershipAccess';

const formatDuration = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
};

// Active (not paused) seconds of a workout session at time `now`.
export const activeSecondsAt = (session, now) => {
  if (!session) return 0;
  if (!['active', 'paused'].includes(session.status)) return session.activeSeconds || 0;
  const elapsed = (now - new Date(session.startedAt).getTime()) / 1000;
  const pausedNow = session.pausedAt ? (now - new Date(session.pausedAt).getTime()) / 1000 : 0;
  return Math.max(0, elapsed - (session.totalPausedSeconds || 0) - pausedNow);
};

export default function WorkoutTracker() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [workoutId, setWorkoutId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const assignedTrainer = user?.membership?.assignedTrainer;
  const assignedTrainerName = assignedTrainer && typeof assignedTrainer === 'object' ? assignedTrainer.name : null;

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/workout-sessions/mine');
      setHistory(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load workout history.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/workouts'),
      api.get('/workout-sessions/current'),
      api.get('/workout-sessions/mine'),
    ]).then(([workoutResponse, currentResponse, historyResponse]) => {
      if (!active) return;
      setWorkouts(workoutResponse.data.workouts || []);
      setSession(currentResponse.data.session || null);
      setHistory(historyResponse.data.sessions || []);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load your workouts.');
    }).finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const startWorkout = async () => {
    setError('');
    setNotice('');
    if (!workoutId && !customTitle.trim()) {
      setError('Choose one of your workouts or type a workout name.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/workout-sessions', {
        ...(workoutId ? { workoutId } : { title: customTitle.trim() }),
      });
      setSession(data.session);
      setNotice(data.session.shareWithTrainer ? 'Workout started. Your trainer can see it live.' : 'Workout started.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to start the workout.');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status) => {
    if (status === 'completed' && !window.confirm('Finish and save this workout?')) return;
    if (status === 'cancelled' && !window.confirm('Cancel and discard this workout?')) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.patch(`/workout-sessions/${session._id}/status`, { status });
      if (['completed', 'cancelled'].includes(status)) {
        setSession(null);
        setWorkoutId('');
        setCustomTitle('');
        setNotice(status === 'completed'
          ? `Workout saved: ${formatDuration(data.session.activeSeconds)} active time.`
          : 'Workout cancelled.');
        await loadHistory();
      } else {
        setSession(data.session);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update the workout.');
    } finally {
      setBusy(false);
    }
  };

  const toggleExercise = async (index) => {
    if (!session) return;
    const completed = !session.exercises[index].completed;
    setSession((current) => ({
      ...current,
      exercises: current.exercises.map((exercise, position) => (position === index ? { ...exercise, completed } : exercise)),
    }));
    try {
      const { data } = await api.patch(`/workout-sessions/${session._id}/exercise`, { index, completed });
      setSession(data.session);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update the exercise.');
      setSession((current) => ({
        ...current,
        exercises: current.exercises.map((exercise, position) => (position === index ? { ...exercise, completed: !completed } : exercise)),
      }));
    }
  };


  const paused = session?.status === 'paused';
  const doneCount = session?.exercises?.filter((exercise) => exercise.completed).length || 0;
  const totalCount = session?.exercises?.length || 0;

  return (
    <section className="vf-theme-page mx-auto w-full max-w-5xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner rounded-3xl border border-red-500/20 bg-gradient-to-br from-[#211010] via-[#111111] to-[#0b0b0b] p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300"><Dumbbell className="h-4 w-4" />Workout session</p>
        <h1 className="mt-2 text-3xl font-black text-white">Workout Tracker</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">Start your workout, track the time and tick off exercises. If you choose to share, your assigned trainer sees your progress live.</p>
      </PageHeader>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4" />{notice}</p>}

      {!loaded ? (
        <p className="flex items-center gap-2 text-sm text-gray-400"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
      ) : !session ? (
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-5">
          <h2 className="text-lg font-bold text-white">Start a workout</h2>
          <label className="block text-xs font-semibold text-gray-400">Choose a workout
            <select value={workoutId} onChange={(event) => setWorkoutId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#080808] px-3 text-sm text-white">
              <option value="">Custom workout (type a name)</option>
              {workouts.map((workout) => (
                <option key={workout._id} value={workout._id}>
                  {workout.title}{workout.isTrainerAssigned ? ` (from ${workout.assignedByTrainer})` : ''}
                </option>
              ))}
            </select>
          </label>
          {!workoutId && (
            <label className="block text-xs font-semibold text-gray-400">Workout name
              <input value={customTitle} maxLength={120} onChange={(event) => setCustomTitle(event.target.value)} placeholder="e.g. Morning cardio" className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#080808] px-3 text-sm text-white" />
            </label>
          )}
          {assignedTrainerName && hasFeature(user?.membership, 'liveTracking')
            ? <p className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200"><ShieldCheck className="h-4 w-4 shrink-0" />Your trainer {assignedTrainerName} will see this workout live, from start to finish.</p>
            : <p className="rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-400">{assignedTrainerName ? 'Live tracking with your trainer is included in the Premium plan, so this workout stays private.' : 'No trainer assigned, so this workout stays private.'}</p>}
          <button type="button" disabled={busy} onClick={startWorkout} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 font-bold text-white disabled:opacity-60">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}Start Workout
          </button>
        </section>
      ) : (
        <section className="space-y-5 rounded-2xl border border-white/10 bg-[#111111] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white">{session.title}</h2>
              <p className="mt-1 text-xs text-gray-500">Started {new Date(session.startedAt).toLocaleTimeString()}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${paused ? 'bg-amber-500/10 text-amber-200' : 'bg-emerald-500/10 text-emerald-300'}`}>{paused ? 'Paused' : 'In progress'}</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#080808] p-6 text-center">
            <p className="flex items-center justify-center gap-2 text-xs text-gray-400"><Timer className="h-4 w-4 text-red-300" />Workout time</p>
            <p className="mt-2 text-5xl font-black tabular-nums text-white">{formatDuration(activeSecondsAt(session, now))}</p>
            {totalCount > 0 && <p className="mt-2 text-xs text-gray-500">{doneCount} of {totalCount} exercises done</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            {paused
              ? <button type="button" disabled={busy} onClick={() => changeStatus('active')} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 font-bold text-white disabled:opacity-50"><Play className="h-5 w-5" />Resume</button>
              : <button type="button" disabled={busy} onClick={() => changeStatus('paused')} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 font-bold text-white disabled:opacity-50"><Pause className="h-5 w-5" />Pause</button>}
            <button type="button" disabled={busy} onClick={() => changeStatus('completed')} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-4 font-bold text-white disabled:opacity-50"><Flag className="h-5 w-5" />Finish</button>
            <button type="button" disabled={busy} onClick={() => changeStatus('cancelled')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 font-semibold text-gray-300 disabled:opacity-50"><Square className="h-4 w-4" />Cancel</button>
          </div>
          {session.shareWithTrainer && <p className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-xs text-emerald-200"><ShieldCheck className="h-4 w-4 shrink-0" />Sharing with {assignedTrainerName || 'your assigned trainer'} is on.</p>}

          {totalCount > 0 && (
            <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
              {session.exercises.map((exercise, index) => (
                <li key={`${exercise.name}-${index}`}>
                  <button type="button" onClick={() => toggleExercise(index)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    {exercise.completed ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" /> : <Circle className="h-5 w-5 shrink-0 text-gray-600" />}
                    <span className="flex-1">
                      <span className={`block text-sm font-semibold ${exercise.completed ? 'text-gray-500 line-through' : 'text-white'}`}>{exercise.name}</span>
                      <span className="text-xs text-gray-500">{exercise.sets} sets × {exercise.reps} reps{exercise.weight ? ` · ${exercise.weight} kg` : ''}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
        <h2 className="text-lg font-bold text-white">Recent workouts</h2>
        {!history.length ? <p className="mt-3 text-sm text-gray-500">Your finished workouts will appear here.</p> : (
          <div className="mt-4 divide-y divide-white/10">
            {history.filter((item) => item.status !== 'active' && item.status !== 'paused').slice(0, 10).map((item) => (
              <div key={item._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div>
                  <p className="font-semibold text-white">{item.title} · <span className="capitalize text-gray-400">{item.status}</span></p>
                  <p className="mt-1 text-xs text-gray-500">{new Date(item.startedAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-200">{formatDuration(item.activeSeconds)}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.completedExercises}/{item.totalExercises} exercises</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
