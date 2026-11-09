import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  Calendar,
  Dumbbell,
  Flame,
  Plus,
  RefreshCw,
  TrendingUp,
  Utensils,
} from '../icons';
import { Button, Card } from '../components/ui';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(Math.round(Number(value) || 0));
const toDateKey = (date) => date.toISOString().slice(0, 10);
const formatDay = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

const getLastSevenDays = () => Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (6 - index));
  return toDateKey(date);
});

function Skeleton({ className = '' }) {
  return <span className={`forma-app__skeleton ${className}`.trim()} aria-hidden="true" />;
}

function MetricCard({ label, value, detail, icon: Icon, prominent = false, loading = false }) {
  return (
    <Card className={`forma-app__metric${prominent ? ' is-prominent' : ''}`}>
      <div className="forma-app__metric-heading">
        <p>{label}</p>
        <Icon aria-hidden="true" />
      </div>
      {loading ? (
        <Skeleton className="forma-app__metric-skeleton" />
      ) : (
        <p className="forma-app__metric-value">{value}</p>
      )}
      <p className="forma-app__metric-detail">{loading ? <Skeleton className="forma-app__detail-skeleton" /> : detail}</p>
    </Card>
  );
}

function GoalRing({ value, goal, loading }) {
  const percent = goal > 0 ? Math.min((value / goal) * 100, 100) : 0;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dash = (percent / 100) * circumference;

  if (loading) return <Skeleton className="forma-app__goal-skeleton" />;

  return (
    <div className="forma-app__goal-visual">
      <svg viewBox="0 0 100 100" role="img" aria-label={goal > 0 ? `${Math.round(percent)} percent of daily calorie goal` : 'Daily calorie goal is not set'}>
        <circle className="forma-app__ring-track" cx="50" cy="50" r={radius} />
        {goal > 0 && (
          <circle
            className="forma-app__ring-value"
            cx="50"
            cy="50"
            r={radius}
            strokeDasharray={`${dash} ${circumference - dash}`}
            transform="rotate(-90 50 50)"
          />
        )}
        <text className="forma-app__ring-number" x="50" y="48">{goal > 0 ? `${Math.round(percent)}%` : '—'}</text>
        <text className="forma-app__ring-label" x="50" y="62">{goal > 0 ? 'OF GOAL' : 'NO GOAL'}</text>
      </svg>
    </div>
  );
}

function WeeklyCaloriesChart({ days, goal, loading, error }) {
  if (loading) return <div className="forma-app__chart-skeleton" role="status"><Skeleton /><span>Loading calorie history…</span></div>;
  if (error) return <p className="forma-app__inline-state is-error" role="alert">Calorie history could not be loaded.</p>;
  if (!days.some((day) => Number(day.summary?.mealCount) > 0)) {
    return <EmptyState type="meals" sentence="No meals logged this week. Log a meal to see your nutrition trend." actionLabel="Log a meal" to="/nutrition" />;
  }

  const values = days.map((day) => day.summary ? Number(day.summary.totalCalories) || 0 : null);
  const maxValue = Math.max(...values.filter((value) => value !== null), goal || 0, 1);
  const chartTop = 20;
  const chartBottom = 148;
  const points = values.map((value, index) => value === null ? null : ({
    x: 54 + index * 84,
    y: chartBottom - (value / maxValue) * (chartBottom - chartTop),
    value,
    date: days[index].date,
  }));
  const segments = [];
  let segment = [];
  points.forEach((point) => {
    if (point) segment.push(point);
    else if (segment.length) {
      segments.push(segment);
      segment = [];
    }
  });
  if (segment.length) segments.push(segment);
  const targetY = goal > 0 ? chartBottom - (goal / maxValue) * (chartBottom - chartTop) : null;

  return (
    <div className="forma-app__chart-wrap">
      <svg viewBox="0 0 620 190" role="img" aria-label="Calories logged per day for the last seven days">
        <g className="forma-app__chart-grid">
          {[chartTop, (chartTop + chartBottom) / 2, chartBottom].map((y) => <line key={y} x1="48" y1={y} x2="592" y2={y} />)}
        </g>
        {targetY !== null && <line className="forma-app__chart-target" x1="48" y1={targetY} x2="592" y2={targetY} />}
        {segments.map((pointsInSegment, index) => (
          <polyline
            key={index}
            className="forma-app__chart-line"
            points={pointsInSegment.map((point) => `${point.x},${point.y}`).join(' ')}
          />
        ))}
        {points.map((point, index) => point && (
          <g key={point.date}>
            <circle className="forma-app__chart-point" cx={point.x} cy={point.y} r="4" />
            <title>{`${formatDay(point.date)}: ${formatNumber(point.value)} kcal`}</title>
            <text className="forma-app__chart-axis" x={point.x} y="177" textAnchor="middle">{formatDay(point.date)}</text>
          </g>
        ))}
      </svg>
      <div className="forma-app__chart-legend">
        <span><i className="is-ember" />Calories</span>
        {goal > 0 && <span><i className="is-teal" />Daily target</span>}
      </div>
    </div>
  );
}

function ActivityChart({ days, loading, error }) {
  if (loading) return <div className="forma-app__chart-skeleton" role="status"><Skeleton /><span>Loading weekly activity…</span></div>;
  if (error) return <p className="forma-app__inline-state is-error" role="alert">Activity history could not be loaded.</p>;
  const total = days.reduce((sum, day) => sum + day.count, 0);
  if (!total) return <EmptyState type="workouts" sentence="No workouts logged this week. Log a workout to see your activity." actionLabel="Log a workout" to="/workout-tracker" />;
  const max = Math.max(...days.map((day) => day.count), 1);

  return (
    <div className="forma-app__activity-chart" role="img" aria-label={`${total} workouts in the last seven days`}>
      {days.map((day) => (
        <div className="forma-app__activity-day" key={day.date} aria-label={`${formatDay(day.date)}: ${day.count} workouts`}>
          <span>{day.count || ''}</span>
          <div className="forma-app__activity-track">
            <i style={{ height: `${day.count ? Math.max((day.count / max) * 100, 8) : 0}%` }} />
          </div>
          <small>{formatDay(day.date)}</small>
        </div>
      ))}
    </div>
  );
}

function CategoryBreakdown({ workouts, loading, error }) {
  if (loading) return <div className="forma-app__chart-skeleton" role="status"><Skeleton /><span>Loading workout categories…</span></div>;
  if (error) return <p className="forma-app__inline-state is-error" role="alert">Workout categories could not be loaded.</p>;

  const categories = workouts.reduce((counts, workout) => {
    const category = workout.category?.trim() || 'General';
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  const rows = Object.entries(categories).sort((first, second) => second[1] - first[1]);
  const max = Math.max(...rows.map(([, count]) => count), 1);
  if (!rows.length) return <EmptyState type="workouts" sentence="Your training mix will appear after you save a workout plan." actionLabel="Create a workout" to="/workouts/create" />;

  return (
    <ul className="forma-app__category-list">
      {rows.slice(0, 5).map(([category, count]) => (
        <li key={category}>
          <div><span>{category}</span><strong>{count}</strong></div>
          <span className="forma-app__category-track"><i style={{ width: `${(count / max) * 100}%` }} /></span>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const { user: authUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [nutritionWeek, setNutritionWeek] = useState([]);
  const [progressSummary, setProgressSummary] = useState(null);
  const [assistantStatus, setAssistantStatus] = useState(null);
  const [requestErrors, setRequestErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const dates = useMemo(getLastSevenDays, [refreshKey]);

  useEffect(() => {
    let active = true;
    const fetchDashboardData = async () => {
      setLoading(true);
      const requests = [
        { key: 'profile', request: api.get('/auth/profile') },
        { key: 'workouts', request: api.get('/workouts') },
        { key: 'sessions', request: api.get('/workout-sessions/mine') },
        { key: 'progress', request: api.get('/progress/summary') },
        { key: 'assistant', request: api.get('/chat/status') },
        ...dates.map((date) => ({ key: 'nutrition', date, request: api.get(`/nutrition/daily-summary?date=${date}`) })),
      ];
      const results = await Promise.allSettled(requests.map(({ request }) => request));
      if (!active) return;

      const errors = {};
      const nutritionByDate = new Map();
      let profile = null;
      let workoutRecords = [];
      let sessionRecords = [];
      let progress = null;
      let assistant = null;

      results.forEach((result, index) => {
        const entry = requests[index];
        if (result.status === 'rejected' || result.value.data?.success === false) {
          errors[entry.key] = true;
          return;
        }
        const data = result.value.data;
        if (entry.key === 'profile' && data?.success && data.user) profile = data.user;
        else if (entry.key === 'workouts') {
          const records = Array.isArray(data) ? data : data?.workouts || data?.data;
          if (Array.isArray(records)) workoutRecords = records;
          else errors.workouts = true;
        } else if (entry.key === 'sessions') {
          if (Array.isArray(data?.sessions)) sessionRecords = data.sessions;
          else errors.sessions = true;
        } else if (entry.key === 'progress' && data?.success) progress = data.summary || null;
        else if (entry.key === 'assistant' && data?.success) assistant = { configured: data.configured === true };
        else if (entry.key === 'nutrition' && data?.success && data.summary) nutritionByDate.set(entry.date, data.summary);
        else errors[entry.key] = true;
      });

      setUserProfile(profile);
      setWorkouts(workoutRecords);
      setSessions(sessionRecords);
      setProgressSummary(progress);
      setAssistantStatus(assistant);
      setNutritionWeek(dates.map((date) => ({ date, summary: nutritionByDate.get(date) || null })));
      setRequestErrors(errors);
      setLoading(false);
    };

    fetchDashboardData();
    return () => { active = false; };
  }, [dates]);

  const profile = userProfile || authUser;
  const userName = profile?.name || 'Athlete';
  const targetCalories = Number(profile?.targetCalories);
  const hasCalorieGoal = Number.isFinite(targetCalories) && targetCalories > 0;
  const today = toDateKey(new Date());
  const todayNutrition = nutritionWeek.find((day) => day.date === today)?.summary || null;
  const currentWeight = progressSummary?.totalLogs > 0 ? progressSummary.currentWeight : profile?.weight;
  const weeklyActivity = dates.map((date) => ({
    date,
    count: sessions.filter((session) => session.status === 'completed' && session.startedAt && toDateKey(new Date(session.startedAt)) === date).length,
  }));
  const weeklyWorkoutCount = weeklyActivity.reduce((total, day) => total + day.count, 0);
  const completedWorkoutCount = sessions.filter((session) => session.status === 'completed').length;
  const recentSessions = [...sessions]
    .filter((session) => !['active', 'paused'].includes(session.status))
    .sort((first, second) => new Date(second.startedAt || 0) - new Date(first.startedAt || 0))
    .slice(0, 4);
  const macroTotals = todayNutrition ? [
    { label: 'Protein', value: todayNutrition.totalProtein },
    { label: 'Carbs', value: todayNutrition.totalCarbs },
    { label: 'Fat', value: todayNutrition.totalFat },
  ] : [];
  const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  const hasErrors = Object.keys(requestErrors).length > 0;

  return (
    <main className="forma-app forma-app-page forma-app-page--dashboard">
      <div className="forma-app__container">
        <Card as="header" className="forma-app__welcome">
          <div>
            <p className="forma-app__eyebrow">{dateLabel}</p>
            <h1>Welcome back, {userName}</h1>
            <p>Your training, nutrition, and progress in one view.</p>
            {profile?.fitnessGoal && <span className="forma-app__goal-note">Current focus: {profile.fitnessGoal}</span>}
          </div>
          <div className="forma-app__actions">
            <Button as={Link} to="/workout-tracker" variant="primary"><Plus aria-hidden="true" /> Log workout</Button>
            <Button as={Link} to="/nutrition" variant="secondary"><Utensils aria-hidden="true" /> Log meal</Button>
          </div>
        </Card>

        {hasErrors && (
          <Card className="forma-app__alert" role="status">
            <div><AlertCircle aria-hidden="true" /><p>Some dashboard data could not be loaded. Affected sections are marked unavailable.</p></div>
            <Button type="button" variant="secondary" onClick={() => setRefreshKey((value) => value + 1)}><RefreshCw aria-hidden="true" /> Retry</Button>
          </Card>
        )}

        <section className="forma-app__metric-grid" aria-label="Training summary">
          <MetricCard label="Completed workouts" value={requestErrors.sessions ? 'Unavailable' : completedWorkoutCount} detail="Tracked sessions" icon={Dumbbell} loading={loading} />
          <MetricCard label="Calories today" value={todayNutrition ? `${formatNumber(todayNutrition.totalCalories)} kcal` : '—'} detail={hasCalorieGoal ? `Daily target ${formatNumber(targetCalories)} kcal` : 'Set a goal in your profile'} icon={Flame} loading={loading} />
          <MetricCard label="Current weight" value={currentWeight != null ? `${formatNumber(currentWeight)} kg` : '—'} detail={profile?.targetWeight != null ? `Target ${formatNumber(profile.targetWeight)} kg` : 'No weight goal set'} icon={TrendingUp} prominent loading={loading} />
          <MetricCard label="This week" value={requestErrors.workouts ? 'Unavailable' : `${weeklyWorkoutCount} sessions`} detail="Workout sessions · 7 days" icon={Activity} loading={loading} />
          <MetricCard label="AI assistant" value={requestErrors.assistant ? 'Unavailable' : assistantStatus?.configured ? 'Ready' : 'Not configured'} detail="Service availability" icon={Bot} loading={loading} />
        </section>

        <section className="forma-app__dashboard-grid" aria-label="Training and nutrition activity">
          <Card className="forma-app__section-card forma-app__calorie-card">
            <div className="forma-app__section-heading">
              <div><h2>Calories this week</h2><p>Daily intake · last seven days</p></div>
              <Link to="/nutrition">Nutrition <ArrowRight aria-hidden="true" /></Link>
            </div>
            <WeeklyCaloriesChart days={nutritionWeek} goal={hasCalorieGoal ? targetCalories : 0} loading={loading} error={requestErrors.nutrition} />
          </Card>

          <Card className="forma-app__section-card forma-app__goal-card">
            <div className="forma-app__section-heading">
              <div><h2>Today’s target</h2><p>Calorie goal completion</p></div>
            </div>
            <div className="forma-app__goal-content">
              <GoalRing value={Number(todayNutrition?.totalCalories) || 0} goal={hasCalorieGoal ? targetCalories : 0} loading={loading} />
              <div className="forma-app__goal-copy">
                <strong>{todayNutrition ? `${formatNumber(todayNutrition.totalCalories)} kcal` : 'No intake logged'}</strong>
                <span>{hasCalorieGoal ? `of ${formatNumber(targetCalories)} kcal` : 'Set a daily target to track completion.'}</span>
                <Button as={Link} to="/nutrition" variant="ghost">View nutrition <ArrowRight aria-hidden="true" /></Button>
              </div>
            </div>
            {todayNutrition && macroTotals.length > 0 && (
              <ul className="forma-app__macro-list">
                {macroTotals.map((macro) => <li key={macro.label}><span>{macro.label}</span><strong>{formatNumber(macro.value)} g</strong></li>)}
              </ul>
            )}
          </Card>

          <Card className="forma-app__section-card">
            <div className="forma-app__section-heading">
              <div><h2>Workout activity</h2><p>Sessions by day · last seven days</p></div>
              <span className="forma-app__section-total">{loading ? '—' : requestErrors.sessions ? '—' : weeklyWorkoutCount}</span>
            </div>
            <ActivityChart days={weeklyActivity} loading={loading} error={requestErrors.sessions} />
          </Card>

          <Card className="forma-app__section-card">
            <div className="forma-app__section-heading">
              <div><h2>Training mix</h2><p>Saved workouts by category</p></div>
              <Link to="/workouts">Workouts <ArrowRight aria-hidden="true" /></Link>
            </div>
            <CategoryBreakdown workouts={workouts} loading={loading} error={requestErrors.workouts} />
          </Card>
        </section>

        <Card className="forma-app__section-card forma-app__recent">
          <div className="forma-app__section-heading">
            <div><h2>Recent sessions</h2><p>Your latest tracked workouts</p></div>
            <Button as={Link} to="/workout-tracker" variant="ghost">Session player <ArrowRight aria-hidden="true" /></Button>
          </div>
          {loading ? (
            <div className="forma-app__list-skeleton" role="status"><Skeleton /><Skeleton /><Skeleton /><span>Loading recent workouts…</span></div>
          ) : requestErrors.sessions ? (
            <p className="forma-app__inline-state is-error" role="alert">Workout session history could not be loaded. Use Retry above to try again.</p>
          ) : recentSessions.length ? (
            <ul className="forma-app__workout-list">
              {recentSessions.map((session) => (
                <li key={session._id}>
                  <Link to="/workout-tracker">
                    <span className="forma-app__workout-icon"><Dumbbell aria-hidden="true" /></span>
                    <span className="forma-app__workout-details">
                      <strong>{session.title}</strong>
                      <span>{session.completedExercises || 0} of {session.totalExercises || 0} exercises · {session.status}</span>
                    </span>
                    <time>{session.startedAt ? new Date(session.startedAt).toLocaleDateString() : 'Date unavailable'}</time>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState type="workouts" sentence="Your training log is empty — log your first workout to start tracking progress." actionLabel="Log a workout" to="/workout-tracker" />
          )}
        </Card>

        <nav className="forma-app__shortcuts" aria-label="Quick links">
          <Button as={Link} to="/progress" variant="secondary"><TrendingUp aria-hidden="true" /> Body progress</Button>
          <Button as={Link} to="/workouts" variant="secondary"><Dumbbell aria-hidden="true" /> Workout library</Button>
          <Button as={Link} to="/nutrition" variant="secondary"><Utensils aria-hidden="true" /> Nutrition log</Button>
          <Button as={Link} to="/workout-tracker" variant="secondary"><Calendar aria-hidden="true" /> Start a session</Button>
        </nav>
      </div>
    </main>
  );
}
