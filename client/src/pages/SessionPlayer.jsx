import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Circle, Dumbbell, Flag, Loader2, Pause, Play, ShieldCheck, Square, Timer } from '../icons';
import { Button, Card, Field } from '../components/ui';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { hasFeature } from '../utils/membershipAccess';

const formatDuration = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((value) => String(value).padStart(2, '0')).join(':');
};

export const activeSecondsAt = (session, now) => {
  if (!session) return 0;
  if (!['active', 'paused'].includes(session.status)) return session.activeSeconds || 0;
  const elapsed = (now - new Date(session.startedAt).getTime()) / 1000;
  const pausedNow = session.pausedAt ? (now - new Date(session.pausedAt).getTime()) / 1000 : 0;
  return Math.max(0, elapsed - (session.totalPausedSeconds || 0) - pausedNow);
};

export default function SessionPlayer() {
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
    const { data } = await api.get('/workout-sessions/mine');
    if (!Array.isArray(data.sessions)) throw new Error('Workout history was not returned.');
    setHistory(data.sessions);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([api.get('/workouts'), api.get('/workout-sessions/current'), api.get('/workout-sessions/mine')])
      .then(([workoutResponse, currentResponse, historyResponse]) => {
        if (!active) return;
        if (!Array.isArray(workoutResponse.data?.workouts) || !Array.isArray(historyResponse.data?.sessions)) {
          throw new Error('Workout session data was incomplete.');
        }
        setWorkouts(workoutResponse.data.workouts);
        setSession(currentResponse.data.session || null);
        setHistory(historyResponse.data.sessions);
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load your workouts.'); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const startWorkout = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!workoutId && !customTitle.trim()) {
      setError('Choose a saved workout or enter a name for your session.');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post('/workout-sessions', {
        ...(workoutId ? { workoutId } : { title: customTitle.trim() }),
      });
      setSession(data.session);
      setNotice(data.session.shareWithTrainer ? 'Session started. Your trainer can see it live.' : 'Session started.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to start your workout.');
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
        setNotice(status === 'completed' ? `Workout saved: ${formatDuration(data.session.activeSeconds)} active time.` : 'Workout cancelled.');
        await loadHistory();
      } else {
        setSession(data.session);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update this workout.');
    } finally {
      setBusy(false);
    }
  };

  const toggleExercise = async (index) => {
    if (!session) return;
    const completed = !session.exercises[index].completed;
    setSession((current) => ({ ...current, exercises: current.exercises.map((exercise, position) => (position === index ? { ...exercise, completed } : exercise)) }));
    try {
      const { data } = await api.patch(`/workout-sessions/${session._id}/exercise`, { index, completed });
      setSession(data.session);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update this exercise.');
      setSession((current) => ({ ...current, exercises: current.exercises.map((exercise, position) => (position === index ? { ...exercise, completed: !completed } : exercise)) }));
    }
  };

  const paused = session?.status === 'paused';
  const doneCount = session?.exercises?.filter((exercise) => exercise.completed).length || 0;
  const totalCount = session?.exercises?.length || 0;
  const finishedHistory = history.filter((item) => item.status !== 'active' && item.status !== 'paused').slice(0, 10);

  return (
    <main className="forma-app forma-app-page forma-step6">
      <div className="forma-app__container">
        <header className="forma-app__page-heading">
          <div><h1>Session player</h1><p>Start a saved plan or create an untitled session. Track time and mark each movement as you go.</p></div>
          <Dumbbell aria-hidden="true" />
        </header>

        {error && <Card className="forma-step6__notice is-error" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p></Card>}
        {notice && <Card className="forma-step6__notice is-success" role="status"><CheckCircle2 aria-hidden="true" /><p>{notice}</p></Card>}

        {!loaded ? (
          <Card className="forma-step6__loading" role="status"><Loader2 aria-hidden="true" className="forma-step6__spinner" />Loading your session…</Card>
        ) : !session ? (
          <Card as="form" id="session-start" className="forma-step6__start-form" onSubmit={startWorkout}>
            <h2>Start a workout</h2>
            <p>Choose a saved routine or name a session you’re tracking on your own.</p>
            <Field id="session-workout" as="select" label="Saved workout" value={workoutId} onChange={(event) => setWorkoutId(event.target.value)}>
              <option value="">Choose a routine…</option>
              {workouts.map((workout) => <option value={workout._id} key={workout._id}>{workout.title}{workout.isTrainerAssigned ? ` · from ${workout.assignedByTrainer}` : ''}</option>)}
            </Field>
            {!workoutId && <Field id="session-title" label="Or name your workout" value={customTitle} maxLength={120} onChange={(event) => setCustomTitle(event.target.value)} placeholder="For example, morning cardio" />}
            {assignedTrainerName && hasFeature(user?.membership, 'liveTracking')
              ? <p className="forma-step6__trainer-note"><ShieldCheck aria-hidden="true" />Your trainer {assignedTrainerName} will see this session live.</p>
              : <p className="forma-step6__trainer-note">Live sharing is unavailable for this account; this session remains private.</p>}
            <Button type="submit" variant="primary" disabled={busy}>{busy ? <Loader2 aria-hidden="true" className="forma-step6__spinner" /> : <Play aria-hidden="true" />} Start workout</Button>
          </Card>
        ) : (
          <Card className="forma-step6__active-session">
            <div className="forma-step6__session-top">
              <div><span className="forma-step6__tag">{paused ? 'Paused' : 'In progress'}</span><h2>{session.title}</h2><p>Started {new Date(session.startedAt).toLocaleTimeString()}</p></div>
              <span className={`forma-step6__session-state${paused ? ' is-paused' : ''}`}><i aria-hidden="true" />{paused ? 'Paused' : 'Active'}</span>
            </div>
            <div className="forma-step6__session-clock">
              <span><Timer aria-hidden="true" />Active time</span>
              <strong>{formatDuration(activeSecondsAt(session, now))}</strong>
              {totalCount > 0 && <p>{doneCount} of {totalCount} exercises complete</p>}
            </div>
            <div className="forma-step6__session-controls">
              <Button type="button" variant="secondary" disabled={busy} onClick={() => changeStatus(paused ? 'active' : 'paused')}>{paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{paused ? 'Resume' : 'Pause'}</Button>
              <Button type="button" variant="primary" disabled={busy} onClick={() => changeStatus('completed')}><Flag aria-hidden="true" />Finish session</Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => changeStatus('cancelled')}><Square aria-hidden="true" />Cancel</Button>
            </div>
            {session.shareWithTrainer && <p className="forma-step6__trainer-note"><ShieldCheck aria-hidden="true" />Live sharing with {assignedTrainerName || 'your trainer'} is on.</p>}
            {!!totalCount && (
              <ul className="forma-step6__session-exercises">
                {session.exercises.map((exercise, index) => (
                  <li key={`${exercise.name}-${index}`}>
                    <button type="button" onClick={() => toggleExercise(index)} aria-pressed={exercise.completed} disabled={busy}>
                      {exercise.completed ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
                      <span><strong>{exercise.name}</strong><small>{exercise.sets} sets × {exercise.reps} reps{exercise.weight ? ` · ${exercise.weight} kg` : ''}</small></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <section className="forma-step6__history">
          <div className="forma-step6__section-heading"><div><h2>Recent sessions</h2><p>Completed and cancelled sessions from your training record.</p></div><CalendarDays aria-hidden="true" /></div>
          {!loaded ? <Card className="forma-step6__loading"><Loader2 aria-hidden="true" className="forma-step6__spinner" />Loading history…</Card>
            : !finishedHistory.length ? <EmptyState type="workouts" sentence="Your training log is empty — log your first workout to start tracking progress." actionLabel="Start a workout" onAction={() => document.getElementById('session-start')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} />
              : <div className="forma-step6__history-list">{finishedHistory.map((item) => (
                <Card className="forma-step6__history-item" key={item._id}>
                  <div><h3>{item.title}</h3><p>{new Date(item.startedAt).toLocaleString()} · <span className={`is-${item.status}`}>{item.status}</span></p></div>
                  <div><strong>{formatDuration(item.activeSeconds)}</strong><small>{item.completedExercises}/{item.totalExercises} movements</small></div>
                </Card>
              ))}</div>}
        </section>
      </div>
    </main>
  );
}
