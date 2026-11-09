import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Circle, Clock3, Dumbbell, LocateFixed, MapPin, RefreshCw, Route, ShieldCheck, Users } from '../icons';
import api from '../api/axios';
import RunMap from '../components/RunMap';
import EmptyState from '../components/EmptyState';
import useLiveSocket from '../hooks/useLiveSocket';
import { activeSecondsAt } from './WorkoutTracker';

const duration = (seconds = 0) => {
  const value = Math.max(0, Math.floor(seconds));
  return [Math.floor(value / 3600), Math.floor((value % 3600) / 60), value % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
};

const displayName = (client) => typeof client === 'object' ? client?.name || 'Client' : 'Client';
const signalStatus = (session) => {
  const latest = session.route?.[session.route.length - 1];
  if (!latest || Date.now() - new Date(latest.recordedAt).getTime() > 30000) return 'Unavailable';
  return latest.accuracy <= 25 ? 'Active' : 'Weak';
};
const currentSpeed = (session) => {
  const points = session.route || [];
  if (points.length < 2) return 0;
  const previous = points[points.length - 2];
  const latest = points[points.length - 1];
  const seconds = (new Date(latest.recordedAt) - new Date(previous.recordedAt)) / 1000;
  if (previous.segment !== latest.segment || seconds <= 0
    || Date.now() - new Date(latest.recordedAt).getTime() > 15000) return 0;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(latest.latitude - previous.latitude);
  const longitudeDelta = radians(latest.longitude - previous.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(previous.latitude)) * Math.cos(radians(latest.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  const meters = 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  return meters / seconds * 3.6;
};

export default function TrainerTracking() {
  const [liveSessions, setLiveSessions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState({ activeSessions: 0, clientTotals: [], recentSessions: [] });
  const [assignedClients, setAssignedClients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [clientId, setClientId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [liveWorkouts, setLiveWorkouts] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [summaryFrom, setSummaryFrom] = useState('');
  const [summaryTo, setSummaryTo] = useState('');
  const [tick, setTick] = useState(Date.now());
  const [liveNotice, setLiveNotice] = useState('');

  const loadWorkoutLive = useCallback(async () => {
    try {
      const { data } = await api.get('/workout-sessions/trainer/live');
      setLiveWorkouts(Array.isArray(data.sessions) ? data.sessions : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to refresh live client workouts.');
    }
  }, []);

  const loadLive = useCallback(async () => {
    try {
      const { data } = await api.get('/gps-sessions/trainer/live');
      const nextSessions = Array.isArray(data.sessions) ? data.sessions : [];
      setLiveSessions(nextSessions);
      setSelected((current) => {
        if (!current || !['active', 'paused'].includes(current.status)) return current;
        const latest = nextSessions.find((item) => item._id === current._id);
        return latest ? { ...current, ...latest, route: current.route } : current;
      });
      setSummary((current) => ({ ...current, activeSessions: nextSessions.length }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to refresh live client tracking.');
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/gps-sessions/trainer', {
        params: {
          ...(clientId ? { clientId } : {}),
          page,
          ...(from ? { from: new Date(`${from}T00:00:00`).toISOString() } : {}),
          ...(to ? { to: new Date(`${to}T23:59:59`).toISOString() } : {}),
        },
      });
      if (!Array.isArray(data.sessions)) throw new Error('GPS session history was not returned.');
      setSessions(data.sessions);
      setPages(data.pages || 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load GPS sessions.');
    } finally {
      setLoading(false);
    }
  }, [clientId, from, to, page]);

  const liveFields = (payload) => ({
    status: payload.status,
    durationSeconds: payload.durationSeconds,
    movingSeconds: payload.movingSeconds,
    distanceKm: payload.distanceKm,
    averageSpeedKmh: payload.averageSpeedKmh,
    averagePaceMinutesPerKm: payload.averagePaceMinutesPerKm,
    estimatedCalories: payload.estimatedCalories,
    updatedAt: payload.updatedAt,
  });

  const applyLive = useCallback((payload) => {
    const newPoints = Array.isArray(payload.newPoints) ? payload.newPoints : [];
    setLiveSessions((current) => current.map((item) => (item._id === payload.sessionId
      ? { ...item, ...liveFields(payload), route: [...(item.route || []), ...newPoints].slice(-2) }
      : item)));
    setSelected((current) => (current && current._id === payload.sessionId
      ? { ...current, ...liveFields(payload), route: [...(current.route || []), ...newPoints] }
      : current));
  }, []);

  const connected = useLiveSocket({
    'gps:started': (payload) => {
      setLiveNotice(`${payload.clientName} started a ${payload.activityType} workout.`);
      loadLive();
    },
    'gps:update': applyLive,
    'gps:status': applyLive,
    'gps:ended': async (payload) => {
      const goal = payload.goalProgress;
      setLiveNotice(payload.status === 'cancelled'
        ? `${payload.clientName} cancelled the workout.`
        : `${payload.clientName} finished: ${Number(payload.distanceKm || 0).toFixed(2)} km in ${Math.round((payload.movingSeconds || 0) / 60)} min.${goal ? (goal.met ? ' Daily goal completed.' : ` Daily goal: ${goal.percent}%.`) : ''}`);
      setLiveSessions((current) => current.filter((item) => item._id !== payload.sessionId));
      try {
        const { data } = await api.get(`/gps-sessions/${payload.sessionId}`);
        setSelected((current) => (current && current._id === payload.sessionId ? data.session : current));
      } catch (requestError) { /* history list below still refreshes */ }
      loadLive();
      loadSessions();
    },
  });

  useEffect(() => {
    let active = true;
    api.get('/memberships/assigned-clients')
      .then(({ data }) => { if (active && Array.isArray(data.clients)) setAssignedClients(data.clients); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load assigned clients.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api.get('/gps-sessions/trainer/summary')
      .then(({ data }) => {
        if (active) setSummary((current) => ({
          ...data,
          activeSessions: current.activeSessions,
        }));
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load GPS workout summary.'); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    loadLive();
    const interval = window.setInterval(loadLive, connected ? 30000 : 10000);
    return () => window.clearInterval(interval);
  }, [loadLive, connected]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    loadWorkoutLive();
    const interval = window.setInterval(loadWorkoutLive, 10000);
    return () => window.clearInterval(interval);
  }, [loadWorkoutLive]);

  useEffect(() => {
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    if (summaryFrom && summaryTo && summaryFrom > summaryTo) {
      setError('The "From" date must be before the "To" date.');
      return undefined;
    }
    api.get('/workout-sessions/trainer/summary', {
      params: {
        ...(summaryFrom ? { from: new Date(`${summaryFrom}T00:00:00`).toISOString() } : {}),
        ...(summaryTo ? { to: new Date(`${summaryTo}T23:59:59`).toISOString() } : {}),
      },
    })
      .then(({ data }) => { if (active && Array.isArray(data.clients)) setWeekly(data.clients); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load the client summary.'); });
    return () => { active = false; };
  }, [summaryFrom, summaryTo]);

  const toInputDate = (date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const applyPreset = (days) => {
    const end = new Date();
    const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    setError('');
    setSummaryFrom(toInputDate(start));
    setSummaryTo(toInputDate(end));
  };
  const resetSummaryRange = () => { setError(''); setSummaryFrom(''); setSummaryTo(''); };

  useEffect(() => {
    if (!selected || !['active', 'paused'].includes(selected.status)) return undefined;
    let active = true;
    const pollSelected = async () => {
      try {
        const { data } = await api.get(`/gps-sessions/${selected._id}`);
        if (active) setSelected(data.session);
      } catch (requestError) {
        if (active && requestError.response?.status === 403) {
          setSelected(null);
          setError('Location sharing was stopped or this client is no longer assigned to you.');
        } else if (active) {
          setError(requestError.response?.data?.message || 'Unable to refresh this live route.');
        }
      }
    };
    const interval = window.setInterval(pollSelected, connected ? 30000 : 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selected?._id, selected?.status, connected]);

  const openSession = async (id) => {
    try {
      const { data } = await api.get(`/gps-sessions/${id}`);
      setSelected(data.session);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load this GPS route.');
    }
  };

  const clients = assignedClients.length ? assignedClients.map((client) => ({ id: client._id, name: client.name })) : Array.from(new Map(sessions.map((item) => [
    typeof item.client === 'object' ? item.client._id : item.client,
    { id: typeof item.client === 'object' ? item.client._id : item.client, name: displayName(item.client) },
  ])).values());
  const displayedSessions = selected
    ? [selected]
    : sessions.filter((item) => item.status === 'completed' || item.status === 'cancelled');

  return (
    <section className="vf-theme-page mx-auto w-full max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner rounded-3xl border border-red-500/20 bg-gradient-to-br from-[#211010] via-[#111111] to-[#0b0b0b] p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300"><LocateFixed className="h-4 w-4" />Trainer workspace</p>
        <h1 className="mt-2 text-3xl font-black text-white">Live Client Tracking</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-400">Only current assigned clients who explicitly shared their route are shown. Live sessions refresh every ten seconds.</p>
      </PageHeader>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}

      <section aria-label="GPS workout overview" className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]"><p className="text-sm text-gray-400">Active sharing sessions</p><p className="mt-3 text-2xl font-black text-white">{summary.activeSessions}</p></article>
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]"><p className="text-sm text-gray-400">Shared completed workouts</p><p className="mt-3 text-2xl font-black text-white">{summary.clientTotals.reduce((count, item) => count + item.completedSessions, 0)}</p></article>
        <article className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]"><p className="text-sm text-gray-400">Total distance shared</p><p className="mt-3 text-2xl font-black text-white">{summary.clientTotals.reduce((total, item) => total + item.totalDistanceKm, 0).toFixed(2)} km</p></article>
      </section>

      {liveNotice && <p role="status" onClick={() => setLiveNotice('')} className="cursor-pointer rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-sm text-emerald-200">{liveNotice}</p>}

      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-lg font-bold text-white"><MapPin className="h-5 w-5 text-emerald-300" />Live sessions</h2><p className="mt-1 text-xs text-gray-500">{liveSessions.length} client{liveSessions.length === 1 ? '' : 's'} currently live · <span className={connected ? 'text-emerald-300' : 'text-amber-300'}>{connected ? 'Real-time connected' : 'Reconnecting… (refreshing every 10s)'}</span></p></div>
          <button type="button" onClick={loadLive} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-semibold text-gray-300 hover:bg-white/5"><RefreshCw className="h-4 w-4" />Refresh</button>
        </div>
        {!liveSessions.length ? <EmptyState type="clients" sentence="No assigned clients are sharing a GPS workout right now." actionLabel="Refresh live sessions" onAction={loadLive} /> : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {liveSessions.map((item) => (
              <button key={item._id} type="button" onClick={() => openSession(item._id)} className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-left transition hover:border-emerald-400/40">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-bold text-white">{displayName(item.client)}</p><p className="mt-1 text-xs capitalize text-gray-400">{item.activityType} · {item.status}</p></div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-200">Sharing</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <span><b className="block text-white">{Number(item.distanceKm || 0).toFixed(2)} km</b><i className="not-italic text-gray-500">Distance</i></span>
                  <span><b className="block text-white">{duration(item.durationSeconds)}</b><i className="not-italic text-gray-500">Duration</i></span>
                  <span><b className="block text-white">{currentSpeed(item).toFixed(1)} km/h</b><i className="not-italic text-gray-500">Current speed</i></span>
                  <span><b className="block text-white">{Number(item.averageSpeedKmh || 0).toFixed(1)} km/h</b><i className="not-italic text-gray-500">Avg speed</i></span>
                </div>
                <p className="mt-3 text-[11px] text-gray-500">GPS {signalStatus(item)} · Last update {new Date(item.updatedAt).toLocaleTimeString()}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="flex items-center gap-2 text-lg font-bold text-white"><Dumbbell className="h-5 w-5 text-red-300" />Live gym workouts</h2><p className="mt-1 text-xs text-gray-500">{liveWorkouts.length} client{liveWorkouts.length === 1 ? '' : 's'} working out now</p></div>
          <button type="button" onClick={loadWorkoutLive} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-sm font-semibold text-gray-300 hover:bg-white/5"><RefreshCw className="h-4 w-4" />Refresh</button>
        </div>
        {!liveWorkouts.length ? <EmptyState type="workouts" sentence="No assigned clients are sharing a gym workout right now." actionLabel="Refresh live workouts" onAction={loadWorkoutLive} /> : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {liveWorkouts.map((item) => {
              const total = item.exercises?.length || 0;
              const done = item.exercises?.filter((exercise) => exercise.completed).length || 0;
              return (
                <article key={item._id} className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="font-bold text-white">{displayName(item.client)}</p><p className="mt-1 text-xs text-gray-400">{item.title}</p></div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${item.status === 'paused' ? 'bg-amber-500/10 text-amber-200' : 'bg-emerald-500/10 text-emerald-200'}`}>{item.status === 'paused' ? 'Paused' : 'Working out'}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <span><b className="block text-lg text-white tabular-nums">{duration(activeSecondsAt(item, tick))}</b><i className="not-italic text-gray-500">Workout time</i></span>
                    <span><b className="block text-lg text-white">{done}/{total}</b><i className="not-italic text-gray-500">Exercises done</i></span>
                  </div>
                  {total > 0 && (
                    <ul className="mt-3 space-y-1">
                      {item.exercises.map((exercise, index) => (
                        <li key={`${exercise.name}-${index}`} className="flex items-center gap-2 text-xs">
                          {exercise.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <Circle className="h-3.5 w-3.5 text-gray-600" />}
                          <span className={exercise.completed ? 'text-gray-500 line-through' : 'text-gray-200'}>{exercise.name}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-[11px] text-gray-500">Started {new Date(item.startedAt).toLocaleTimeString()} · Last update {new Date(item.updatedAt).toLocaleTimeString()}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">{summaryFrom || summaryTo ? 'Client summary' : 'Last 7 days by client'}</h2>
            <p className="mt-1 text-xs text-gray-500">Only workouts and walks/runs that clients shared with you.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs font-semibold text-gray-400">From<input type="date" value={summaryFrom} max={summaryTo || undefined} onChange={(event) => setSummaryFrom(event.target.value)} className="mt-1 block min-h-10 rounded-lg border border-white/10 bg-[#080808] px-2 text-sm text-white" /></label>
            <label className="text-xs font-semibold text-gray-400">To<input type="date" value={summaryTo} min={summaryFrom || undefined} onChange={(event) => setSummaryTo(event.target.value)} className="mt-1 block min-h-10 rounded-lg border border-white/10 bg-[#080808] px-2 text-sm text-white" /></label>
            <button type="button" onClick={() => applyPreset(7)} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold text-gray-300 hover:bg-white/5">7 days</button>
            <button type="button" onClick={() => applyPreset(30)} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold text-gray-300 hover:bg-white/5">30 days</button>
            <button type="button" onClick={() => applyPreset(90)} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold text-gray-300 hover:bg-white/5">90 days</button>
            {(summaryFrom || summaryTo) && <button type="button" onClick={resetSummaryRange} className="min-h-10 rounded-lg border border-amber-500/20 px-3 text-xs font-semibold text-amber-200">Reset</button>}
          </div>
        </div>
        {!weekly.length ? <EmptyState type="clients" sentence="Weekly client activity will appear here when clients record shared workouts." actionLabel="View assigned clients" to="/trainer/clients" /> : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-gray-500"><tr><th className="pb-2 font-semibold">Client</th><th className="pb-2 font-semibold">Gym workouts</th><th className="pb-2 font-semibold">Workout time</th><th className="pb-2 font-semibold">Walking</th><th className="pb-2 font-semibold">Running/Jogging</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {weekly.map((row) => (
                  <tr key={row.clientId}>
                    <td className="py-3 font-semibold text-white">{row.clientName}</td>
                    <td className="py-3 text-gray-200">{row.workouts}</td>
                    <td className="py-3 text-gray-200">{duration(row.workoutSeconds)}</td>
                    <td className="py-3 text-gray-200">{Number(row.walkingKm || 0).toFixed(2)} km <span className="text-xs text-gray-500">· {duration(row.walkingSeconds)}</span></td>
                    <td className="py-3 text-gray-200">{Number(row.runningKm || 0).toFixed(2)} km <span className="text-xs text-gray-500">· {duration(row.runningSeconds)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
        <h2 className="text-lg font-bold text-white">Total distance by client</h2>
        {!summary.clientTotals.length
          ? <EmptyState type="progress" sentence="Shared run totals will appear after your clients complete GPS workouts." actionLabel="View assigned clients" to="/trainer/clients" />
          : <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summary.clientTotals.map((item) => (
              <article key={item.clientId} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">{item.clientName}</p>
                <p className="mt-2 text-xl font-black text-red-200">{Number(item.totalDistanceKm || 0).toFixed(2)} km</p>
                <p className="mt-1 text-xs text-gray-500">{item.completedSessions} shared completed workouts</p>
              </article>
            ))}
          </div>}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(250px,0.75fr)_minmax(0,1.5fr)]">
        <div id="trainer-workout-history" className="rounded-2xl border border-white/10 bg-[#111111] p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white"><Users className="h-5 w-5 text-red-300" />Workout history</h2>
          <div className="mt-4 grid gap-3">
            <label className="text-xs font-semibold text-gray-400">Client
              <select value={clientId} onChange={(event) => { setClientId(event.target.value); setPage(1); setSelected(null); }} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#080808] px-3 text-sm text-white">
                <option value="">All assigned clients</option>
                {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-gray-400">From<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); setSelected(null); }} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#080808] px-2 text-sm text-white" /></label>
              <label className="text-xs font-semibold text-gray-400">To<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); setSelected(null); }} className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-[#080808] px-2 text-sm text-white" /></label>
            </div>
          </div>
          <div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto">
            {loading ? <p className="py-6 text-center text-sm text-gray-500">Loading workout history…</p>
              : !displayedSessions.length ? <EmptyState
                type="workouts"
                sentence={clientId || from || to ? 'No sessions match these history filters.' : 'No shared completed sessions have been recorded yet.'}
                actionLabel={clientId || from || to ? 'Clear filters' : 'View assigned clients'}
                {...(clientId || from || to
                  ? { onAction: () => { setClientId(''); setFrom(''); setTo(''); setPage(1); setSelected(null); } }
                  : { to: '/trainer/clients' })}
                className="px-2 py-4"
              />
                : displayedSessions.map((item) => (
                  <button key={item._id} type="button" onClick={() => openSession(item._id)} className={`w-full rounded-xl border p-3 text-left ${selected?._id === item._id ? 'border-red-500/40 bg-red-500/10' : 'border-white/10 bg-black/20 hover:bg-white/5'}`}>
                    <p className="font-semibold capitalize text-white">{displayName(item.client)} · {item.activityType}</p>
                    <p className="mt-1 text-xs text-gray-500">{new Date(item.startedAt).toLocaleDateString()} · {Number(item.distanceKm || 0).toFixed(2)} km · {item.status}</p>
                  </button>
                ))}
          </div>
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
              <button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-white/10 px-3 py-2 text-gray-300 disabled:opacity-40">Previous</button>
              <span className="text-xs text-gray-500">Page {page} of {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-white/10 px-3 py-2 text-gray-300 disabled:opacity-40">Next</button>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-4 sm:p-5">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="text-lg font-bold capitalize text-white">{displayName(selected.client)} · {selected.activityType}</h2><p className="mt-1 text-xs text-gray-500">{new Date(selected.startedAt).toLocaleString()}</p></div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold capitalize text-gray-200">{selected.status}</span>
              </div>
              <RunMap
                points={selected.route || []}
                height="min(50vh, 430px)"
                sentence="This shared workout has no saved GPS route."
                actionLabel="Back to session list"
                onAction={() => setSelected(null)}
              />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Distance', `${Number(selected.distanceKm || 0).toFixed(2)} km`],
                  ['Total time', duration(selected.durationSeconds)],
                  ['Moving time', duration(selected.movingSeconds)],
                  ['Paused time', duration(selected.pausedDurationSeconds)],
                  ['Avg speed', `${Number(selected.averageSpeedKmh || 0).toFixed(1)} km/h`],
                  ['Max speed', `${Number(selected.maximumSpeedKmh || 0).toFixed(1)} km/h`],
                  ['Pace', `${Number(selected.averagePaceMinutesPerKm || 0).toFixed(1)} min/km`],
                  ['Calories', `${selected.estimatedCalories || 0} est.`],
                  ['GPS points', selected.route?.length || 0],
                ].map(([label, value]) => <article key={label} className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[11px] text-gray-500">{label}</p><p className="mt-1 font-bold text-white">{value}</p></article>)}
              </div>
              <p className="flex items-center gap-2 text-xs text-emerald-200"><ShieldCheck className="h-4 w-4" />Client consented to sharing this GPS route.</p>
              {selected.endedAt && <p className="flex items-center gap-2 text-xs text-gray-500"><Clock3 className="h-4 w-4" />Finished {new Date(selected.endedAt).toLocaleString()}</p>}
            </>
          ) : (
            <EmptyState type="workouts" sentence="Choose a shared session or completed route to review its details." actionLabel="View session history" onAction={() => document.getElementById('trainer-workout-history')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} className="min-h-72" />
          )}
        </div>
      </section>
    </section>
  );
}
