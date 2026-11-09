import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, Clock3, Flag, Loader2, MapPin, Pause, Play, Route, ShieldCheck, Square, Timer, Wind } from '../icons';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import RunMap from '../components/RunMap';
import useLiveSocket from '../hooks/useLiveSocket';
import { hasFeature } from '../utils/membershipAccess';

const MAX_ROUTE_POINTS = 5000;

const haversineMeters = (first, second) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const summarize = (points) => {
  let meters = 0;
  let movingSeconds = 0;
  let maxSpeed = 0;
  for (let index = 1; index < points.length; index += 1) {
    const before = points[index - 1];
    const current = points[index];
    if (before.segment !== current.segment) continue;
    const seconds = (new Date(current.recordedAt) - new Date(before.recordedAt)) / 1000;
    const segmentMeters = haversineMeters(before, current);
    if (seconds > 0 && seconds <= 120 && segmentMeters >= 2 && segmentMeters / seconds <= 15) {
      meters += segmentMeters;
      movingSeconds += seconds;
      maxSpeed = Math.max(maxSpeed, (segmentMeters / seconds) * 3.6);
    }
  }
  const km = meters / 1000;
  return {
    meters,
    km,
    movingSeconds: Math.round(movingSeconds),
    averageSpeed: movingSeconds > 0 ? km / (movingSeconds / 3600) : 0,
    maxSpeed,
    pace: km > 0 ? (movingSeconds / 60) / km : 0,
  };
};

const formatDuration = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  return [Math.floor(seconds / 3600), Math.floor((seconds % 3600) / 60), seconds % 60]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
};

const formatPace = (pace) => {
  if (!Number.isFinite(pace) || pace <= 0) return '--:--';
  const seconds = Math.round(pace * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const locationError = (error) => {
  if (error.code === 1) return 'Location permission was denied. Allow location access in your browser settings to start a GPS workout.';
  if (error.code === 2) return 'Your location is unavailable. Check that location services are enabled and try again.';
  if (error.code === 3) return 'GPS could not get a fix in time. Move to an area with a clearer signal and try again.';
  return error.message || 'Unable to read your location.';
};

function StatCard({ label, value, detail, icon: Icon }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#111111] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
      <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
        <span>{label}</span><Icon className="h-4 w-4 text-red-300" />
      </div>
      <p className="mt-3 text-xl font-black text-white">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-gray-500">{detail}</p>}
    </article>
  );
}

export default function GpsRunTracker() {
  const { user } = useAuth();
  const [activityType, setActivityType] = useState('running');
  const [goal, setGoal] = useState(null);
  const [session, setSession] = useState(null);
  const [points, setPoints] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const watchId = useRef(null);
  const timerId = useRef(null);
  const trackRef = useRef({ session: null, points: [], queue: [], status: null, pausedSeconds: 0, pausedAt: null, routeSegment: 0 });
  const uploadInProgress = useRef(false);
  const uploadPromise = useRef(null);

  const loadGoal = useCallback(() => {
    api.get('/goals/mine', { params: { tz: new Date().getTimezoneOffset() } })
      .then(({ data }) => setGoal(data.goal || null))
      .catch(() => {});
  }, []);
  useEffect(() => { loadGoal(); }, [loadGoal]);
  useLiveSocket({ 'goal:assigned': loadGoal });

  useEffect(() => {
    let active = true;
    api.get('/gps-sessions/mine', { params: { page: historyPage } })
      .then(async ({ data }) => {
        if (!active || !Array.isArray(data.sessions)) return;
        setHistory(data.sessions);
        setHistoryPages(data.pages || 1);
        const ongoing = data.sessions.find((item) => ['active', 'paused'].includes(item.status));
        if (!ongoing) {
          setHistoryLoaded(true);
          return;
        }
        try {
          let { data: detailData } = await api.get(`/gps-sessions/${ongoing._id}`);
          let restored = detailData.session;
          if (restored.status === 'active') {
            try {
              const pausedResponse = await api.patch(`/gps-sessions/${restored._id}/status`, { status: 'paused' });
              restored = pausedResponse.data.session;
            } catch (pauseError) {
              if (pauseError.response?.status !== 409) throw pauseError;
              detailData = await api.get(`/gps-sessions/${restored._id}`);
              restored = detailData.data.session;
            }
          }
          if (!active) return;
          const restoredPoints = restored.route || [];
          trackRef.current = {
            session: restored,
            points: restoredPoints,
            queue: [],
            status: restored.status,
            pausedSeconds: restored.totalPausedSeconds || 0,
            pausedAt: restored.pausedAt ? new Date(restored.pausedAt).getTime() : null,
            routeSegment: restored.routeSegment || 0,
          };
          setSession(restored);
          setPoints(restoredPoints);
          setGpsAccuracy(restoredPoints.length ? restoredPoints[restoredPoints.length - 1].accuracy : null);
          setHistory((existing) => existing.map((item) => (item._id === restored._id ? restored : item)));
          setHistoryLoaded(true);
          setNotice(restored.status === 'paused'
            ? 'An unfinished workout was recovered and paused. Resume it or finish it before starting another.'
            : 'An unfinished workout was recovered.');
        } catch (requestError) {
          if (active) setError(requestError.response?.data?.message || 'Unable to recover your unfinished GPS workout.');
        }
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load GPS workout history.'); });
    return () => { active = false; };
  }, [historyPage]);

  useEffect(() => {
    timerId.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timerId.current);
  }, []);

  const stopWatching = () => {
    if (watchId.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  };

  const flushPoints = async () => {
    if (!trackRef.current.session || !trackRef.current.queue.length) return true;
    if (uploadInProgress.current) return uploadPromise.current;
    uploadInProgress.current = true;
    uploadPromise.current = (async () => {
      while (trackRef.current.queue.length) {
        const batch = trackRef.current.queue.slice(0, 50);
        try {
          await api.post(`/gps-sessions/${trackRef.current.session._id}/points`, { points: batch });
          trackRef.current.queue.splice(0, batch.length);
        } catch (requestError) {
          setError(requestError.response?.data?.message || 'GPS route points could not be saved. Keep this page open and retry.');
          return false;
        }
      }
      return true;
    })();
    try {
      return await uploadPromise.current;
    } finally {
      uploadInProgress.current = false;
      uploadPromise.current = null;
    }
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (trackRef.current.status === 'active' && trackRef.current.queue.length) flushPoints();
    }, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const stopWorkout = async (status) => {
    stopWatching();
    if (status === 'completed' && !(await flushPoints())) {
      setBusy(false);
      return;
    }
    try {
      const { data } = await api.patch(`/gps-sessions/${trackRef.current.session._id}/status`, { status, tz: new Date().getTimezoneOffset() });
      trackRef.current.status = status;
      trackRef.current.session = data.session;
      setSession(data.session);
      setHistoryPage(1);
      setHistory((existing) => [data.session, ...existing.filter((item) => item._id !== data.session._id)]);
      if (status === 'completed') loadGoal();
      const progress = data.goalProgress;
      setNotice(status === 'completed'
        ? (progress ? (progress.met ? 'Workout saved. Daily goal completed!' : `Workout saved. Daily goal progress: ${progress.percent}%.`) : 'Workout completed and saved.')
        : 'Workout cancelled.');
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to finish the GPS workout.');
    } finally {
      setBusy(false);
    }
  };

  const onPosition = (position) => {
    const current = trackRef.current;
    const candidate = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      recordedAt: new Date(position.timestamp).toISOString(),
      segment: current.routeSegment,
    };
    setGpsAccuracy(candidate.accuracy);
    if (candidate.accuracy > 100) return;
    const previous = current.points[current.points.length - 1];
    if (previous) {
      const seconds = (new Date(candidate.recordedAt) - new Date(previous.recordedAt)) / 1000;
      const meters = haversineMeters(previous, candidate);
      if (seconds <= 0) return;
      if (seconds > 120) {
        current.routeSegment += 1;
        candidate.segment = current.routeSegment;
      } else if (previous.segment === candidate.segment && (meters < 2 || meters / seconds > 15)) return;
    }
    if (current.points.length >= MAX_ROUTE_POINTS) {
      stopWatching();
      setNotice('GPS route reached the 5,000-point storage limit. Finish the workout to save your route.');
      return;
    }
    current.points = [...current.points, candidate];
    current.queue.push(candidate);
    setPoints(current.points);
    if (current.queue.length >= 10) flushPoints();
  };

  const startWatching = () => {
    if (!navigator.geolocation) {
      setError('This browser does not support GPS location. Try a current browser on a device with location services.');
      return;
    }
    watchId.current = navigator.geolocation.watchPosition(
      onPosition,
      (gpsError) => setError(locationError(gpsError)),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  };

  const retryLocation = () => {
    setError('');
    stopWatching();
    startWatching();
  };

  const startWorkout = async () => {
    setError('');
    setNotice('');
    if (!navigator.geolocation) {
      setError('This browser does not support GPS location. Try a current browser on a device with location services.');
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { data } = await api.post('/gps-sessions', {
          activityType,
          startedAt: new Date(position.timestamp).toISOString(),
        });
        const firstPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          recordedAt: new Date(position.timestamp).toISOString(),
          segment: 0,
        };
        trackRef.current = {
          session: data.session,
          points: [firstPoint],
          queue: [firstPoint],
          status: 'active',
          pausedSeconds: 0,
          pausedAt: null,
          routeSegment: 0,
        };
        setSession(data.session);
        setPoints([firstPoint]);
        setGpsAccuracy(firstPoint.accuracy);
        setBusy(false);
        setNotice('Workout started. GPS is recording while this page is open.');
        startWatching();
      } catch (requestError) {
        setBusy(false);
        setError(requestError.response?.data?.message || 'Unable to start the GPS workout.');
      }
    }, (gpsError) => {
      setBusy(false);
      setError(locationError(gpsError));
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  };

  const changeStatus = async (status) => {
    if (status === 'completed' && !window.confirm('Finish and save this running workout?')) return;
    if (status === 'cancelled' && !window.confirm('Cancel and discard this running workout?')) return;
    setBusy(true);
    setError('');
    if (status === 'paused') stopWatching();
    if (status === 'active' && !navigator.geolocation) {
      setBusy(false);
      setError('This browser does not support GPS location.');
      return;
    }
    if (status === 'active' && trackRef.current.status === 'paused') {
      try {
        const { data } = await api.patch(`/gps-sessions/${trackRef.current.session._id}/status`, { status });
        trackRef.current.status = 'active';
        trackRef.current.session = data.session;
        trackRef.current.routeSegment += 1;
        trackRef.current.pausedSeconds += Math.max(0, Math.floor((Date.now() - trackRef.current.pausedAt) / 1000));
        trackRef.current.pausedAt = null;
        setSession(data.session);
        startWatching();
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to resume this GPS workout.');
      } finally {
        setBusy(false);
      }
      return;
    }
    if (status === 'paused') trackRef.current.pausedAt = Date.now();
    await stopWorkout(status);
  };

  useEffect(() => () => {
    stopWatching();
    if (trackRef.current.status === 'active' && trackRef.current.session) {
      flushPoints()
        .then((saved) => saved && api.patch(`/gps-sessions/${trackRef.current.session._id}/status`, { status: 'paused' }))
        .catch((requestError) => console.warn('Unable to pause GPS tracking after leaving tracker:', requestError.response?.data?.message || requestError.message));
    }
  }, []);

  const openHistoryItem = async (id) => {
    try {
      const { data } = await api.get(`/gps-sessions/${id}`);
      setSelectedHistory(data.session);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load this GPS route.');
    }
  };

  const active = session && ['active', 'paused'].includes(session.status);
  const currentStatus = trackRef.current.status;
  const routeSummary = summarize(points);
  const startTime = session?.startedAt ? new Date(session.startedAt).getTime() : now;
  const currentPaused = currentStatus === 'paused' && trackRef.current.pausedAt
    ? Math.floor((now - trackRef.current.pausedAt) / 1000)
    : 0;
  const elapsedSeconds = session
    ? Math.max(0, Math.floor((now - startTime) / 1000))
    : 0;
  const currentSpeed = points.length > 1 && currentStatus === 'active'
    ? (() => {
      const previous = points[points.length - 2];
      const latest = points[points.length - 1];
      const seconds = (new Date(latest.recordedAt) - new Date(previous.recordedAt)) / 1000;
      return previous.segment === latest.segment && seconds > 0 && now - new Date(latest.recordedAt).getTime() <= 15000
        ? (haversineMeters(previous, latest) / seconds) * 3.6
        : 0;
    })()
    : 0;
  const latestPointAge = points.length ? now - new Date(points[points.length - 1].recordedAt).getTime() : Infinity;
  const gpsStatus = latestPointAge > 30000
    ? 'Unavailable'
    : gpsAccuracy === null ? 'Waiting for fix' : gpsAccuracy <= 25 ? 'Strong' : 'Weak';
  const estimatedCalories = session?.estimatedCalories
    || Math.round(routeSummary.km * (user?.weight || 70) * ((session?.activityType || activityType) === 'walking' ? 0.5 : 1));
  const assignedTrainer = user?.membership?.assignedTrainer;
  const assignedTrainerName = assignedTrainer && typeof assignedTrainer === 'object'
    ? assignedTrainer.name
    : null;

  return (
    <section className="vf-theme-page mx-auto w-full max-w-7xl space-y-6 px-4 py-7 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner rounded-3xl border border-red-500/20 bg-gradient-to-br from-[#211010] via-[#111111] to-[#0b0b0b] p-6 sm:p-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-red-300"><MapPin className="h-4 w-4" />GPS workout</p>
        <h1 className="mt-2 text-3xl font-black text-white">Run Tracker</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-400">Track an outdoor run using your device GPS. GPS is collected only during a workout you start, saved to your workout history, and shared live with your assigned trainer while the workout is running, as part of your training plan.</p>
      </PageHeader>

      {goal && (
        <section className="rounded-2xl border border-white/10 bg-[#111111] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-300">Today&apos;s goal from {goal.trainer?.name || 'your trainer'}</p>
          <p className="mt-2 text-sm capitalize text-white">{goal.activityTypes.join(' / ')}: {[goal.targetDistanceKm > 0 && `${goal.targetDistanceKm} km`, goal.targetMinutes > 0 && `${goal.targetMinutes} min`].filter(Boolean).join(' + ')}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full ${goal.today.met ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, goal.today.percent)}%` }} /></div>
          <p className="mt-2 text-xs text-gray-400">{goal.today.met ? 'Goal completed for today' : `${goal.today.percent}% done`} · {goal.today.distanceKm} km · {goal.today.minutes} min</p>
          {goal.note && <p className="mt-2 text-xs text-gray-500">Trainer note: {goal.note}</p>}
        </section>
      )}

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-sm text-emerald-200"><CheckCircle2 className="h-4 w-4" />{notice}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)] sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-bold text-white">Live route</h2><p className="mt-1 text-xs text-gray-500">Map tiles by OpenStreetMap contributors.</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-gray-400'}`}>
              {active ? (currentStatus === 'paused' ? 'Paused' : 'GPS active') : 'Not tracking'}
            </span>
          </div>
          <RunMap
            points={points}
            height="min(55vh, 460px)"
            sentence={!active ? 'Start a GPS workout to record your route here.' : 'GPS has not recorded a location yet.'}
            actionLabel={!active ? `Start ${activityType === 'walking' ? 'walk' : 'run'}` : currentStatus === 'paused' ? 'Resume GPS tracking' : 'Retry GPS location'}
            onAction={!active ? startWorkout : currentStatus === 'paused' ? () => changeStatus('active') : retryLocation}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {!active && (
              <>
                <label className="text-xs font-semibold text-gray-400">
                  Workout type
                  <select value={activityType} onChange={(event) => setActivityType(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#080808] px-3 text-sm text-white">
                    <option value="walking">Walking</option><option value="running">Running</option><option value="jogging">Jogging</option>
                  </select>
                </label>
                {assignedTrainerName && hasFeature(user?.membership, 'liveTracking')
                  ? <p className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200"><ShieldCheck className="h-4 w-4 shrink-0" />Your trainer {assignedTrainerName} will see this workout live, from start to finish.</p>
                  : <p className="rounded-xl border border-white/10 px-3 py-2 text-xs text-gray-400">{assignedTrainerName ? 'Live tracking with your trainer is included in the Premium plan, so this workout stays private.' : 'No trainer assigned, so this workout stays private.'}</p>}
              </>
            )}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              {!active ? (
                <button type="button" disabled={busy || !historyLoaded} onClick={startWorkout} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 font-bold text-white disabled:opacity-60">
                  {busy || !historyLoaded ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}{historyLoaded ? `Start ${activityType === 'walking' ? 'Walk' : 'Run'}` : 'Checking workout…'}
                </button>
              ) : (
                <>
                  {currentStatus === 'active'
                    ? <button type="button" disabled={busy} onClick={() => changeStatus('paused')} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 font-bold text-white disabled:opacity-50"><Pause className="h-5 w-5" />Pause</button>
                    : <button type="button" disabled={busy} onClick={() => changeStatus('active')} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 font-bold text-white disabled:opacity-50"><Play className="h-5 w-5" />Resume</button>}
                  <button type="button" disabled={busy} onClick={() => changeStatus('completed')} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-4 font-bold text-white disabled:opacity-50"><Flag className="h-5 w-5" />Finish</button>
                  <button type="button" disabled={busy} onClick={() => changeStatus('cancelled')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 font-semibold text-gray-300 disabled:opacity-50"><Square className="h-4 w-4" />Cancel</button>
                </>
              )}
            </div>
          </div>
          {active && <p className="text-xs leading-relaxed text-gray-500">Keep this page open while tracking. GPS can become less reliable or stop when the screen is locked or this browser tab is in the background. Background tracking is not supported.</p>}
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-[#111111] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)] sm:p-5">
            <h2 className="mb-4 text-lg font-bold text-white">Workout statistics</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Distance" value={`${routeSummary.km.toFixed(2)} km`} detail={routeSummary.meters < 1000 ? `${Math.round(routeSummary.meters)} m` : `${Math.round(routeSummary.meters)} m`} icon={Route} />
              <StatCard label="Elapsed time" value={formatDuration(elapsedSeconds)} detail={currentStatus === 'paused' ? 'Paused' : 'Workout time'} icon={Clock3} />
              <StatCard label="Moving time" value={formatDuration(routeSummary.movingSeconds)} detail={`Paused ${formatDuration(trackRef.current.pausedSeconds + currentPaused)}`} icon={Timer} />
              <StatCard label="Current speed" value={`${currentSpeed.toFixed(1)} km/h`} icon={Wind} />
              <StatCard label="Average speed" value={`${routeSummary.averageSpeed.toFixed(1)} km/h`} icon={Activity} />
              <StatCard label="Max speed" value={`${routeSummary.maxSpeed.toFixed(1)} km/h`} icon={Flag} />
              <StatCard label="Average pace" value={`${formatPace(routeSummary.pace)} /km`} icon={Clock3} />
              <StatCard label="Calories" value={`${estimatedCalories} kcal`} detail="Estimate" icon={Activity} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3 border-t border-white/10 pt-4 text-xs text-gray-400">
              <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-red-300" />{points.length} GPS points</span>
              <span>GPS: {gpsStatus}{gpsAccuracy !== null && ` (${Math.round(gpsAccuracy)} m)`}</span>
              {session?.startedAt && <span>Started {new Date(session.startedAt).toLocaleTimeString()}</span>}
            </div>
            {session?.shareWithTrainer && <p className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-xs text-emerald-200"><ShieldCheck className="h-4 w-4 shrink-0" />{assignedTrainerName || 'Your assigned trainer'} is watching this workout live.</p>}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#111111] p-5">
        <h2 className="text-lg font-bold text-white">Recent GPS workouts</h2>
        {!historyLoaded ? <p className="mt-3 text-sm text-gray-500">Loading GPS workouts…</p>
          : !history.length ? <EmptyState type="workouts" sentence="Your GPS workout history is empty." actionLabel="Start a GPS workout" onAction={startWorkout} />
            : (
          <div className="mt-4 divide-y divide-white/10">
            {history.slice(0, 8).map((item) => (
              <button key={item._id} type="button" onClick={() => openHistoryItem(item._id)} className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-left text-sm">
                <div><p className="font-semibold capitalize text-white">{item.activityType} · {item.status}</p><p className="mt-1 text-xs text-gray-500">{new Date(item.startedAt).toLocaleString()}</p></div>
                <div className="text-right"><p className="font-bold text-gray-200">{Number(item.distanceKm || 0).toFixed(2)} km</p><p className="mt-1 text-xs text-gray-500">{formatDuration(item.durationSeconds)}</p></div>
              </button>
            ))}
          </div>
        )}
        {selectedHistory && (
          <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
            <h3 className="font-bold capitalize text-white">{selectedHistory.activityType} route · {new Date(selectedHistory.startedAt).toLocaleDateString()}</h3>
            <RunMap
              points={selectedHistory.route || []}
              height="min(45vh, 380px)"
              sentence="This workout has no saved GPS route."
              actionLabel="Back to GPS history"
              onAction={() => setSelectedHistory(null)}
            />
            <p className="text-xs text-gray-400">{Number(selectedHistory.distanceKm || 0).toFixed(2)} km · {formatDuration(selectedHistory.durationSeconds)} elapsed · {formatDuration(selectedHistory.movingSeconds)} moving · {formatDuration(selectedHistory.pausedDurationSeconds)} paused · {selectedHistory.route?.length || 0} GPS points</p>
            <p className="text-xs text-gray-500">Started {new Date(selectedHistory.startedAt).toLocaleString()}{selectedHistory.endedAt ? ` · Ended ${new Date(selectedHistory.endedAt).toLocaleString()}` : ''}</p>
          </div>
        )}
        {historyPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
            <button type="button" disabled={historyPage <= 1} onClick={() => setHistoryPage((page) => page - 1)} className="rounded-lg border border-white/10 px-3 py-2 text-gray-300 disabled:opacity-40">Previous</button>
            <span className="text-xs text-gray-500">Page {historyPage} of {historyPages}</span>
            <button type="button" disabled={historyPage >= historyPages} onClick={() => setHistoryPage((page) => page + 1)} className="rounded-lg border border-white/10 px-3 py-2 text-gray-300 disabled:opacity-40">Next</button>
          </div>
        )}
      </section>
    </section>
  );
}
