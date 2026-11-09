import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  X,
} from '../icons';
import { Button, Card, Field } from '../components/ui';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { hasMinimumPlan } from '../utils/membershipAccess';

const getTodayDateKey = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const createEmptyForm = () => ({
  date: getTodayDateKey(),
  weight: '',
  chest: '',
  waist: '',
  hips: '',
  biceps: '',
  thighs: '',
  bodyFatPercentage: '',
  benchPressMax: '',
  squatMax: '',
  deadliftMax: '',
  notes: '',
});

const measurementFields = [
  { key: 'chest', label: 'Chest', unit: 'cm' },
  { key: 'waist', label: 'Waist', unit: 'cm' },
  { key: 'hips', label: 'Hips', unit: 'cm' },
  { key: 'biceps', label: 'Biceps', unit: 'cm' },
  { key: 'thighs', label: 'Thighs', unit: 'cm' },
  { key: 'bodyFatPercentage', label: 'Body fat', unit: '%', max: 100 },
];

const strengthFields = [
  { key: 'benchPressMax', label: 'Bench press', unit: 'kg' },
  { key: 'squatMax', label: 'Squat', unit: 'kg' },
  { key: 'deadliftMax', label: 'Deadlift', unit: 'kg' },
];

const isValidDateKey = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};

const formatProgressDate = (value, options = { year: 'numeric', month: 'short', day: 'numeric' }) =>
  new Date(`${value}T12:00:00`).toLocaleDateString(undefined, options);

function TrendChart({ logs, targetWeight, onAddCheckIn }) {
  const validLogs = logs
    .map((log, index) => ({ ...log, chartWeight: Number(log.weight), originalIndex: index }))
    .filter((log) => Number.isFinite(log.chartWeight) && log.chartWeight > 0 && isValidDateKey(log.date))
    .sort((first, second) => first.date.localeCompare(second.date)
      || new Date(first.createdAt || 0) - new Date(second.createdAt || 0)
      || first.originalIndex - second.originalIndex);

  if (!validLogs.length) {
    return <EmptyState type="progress" sentence="No check-ins yet. Add your first measurement to see your trend." actionLabel="Add a check-in" onAction={onAddCheckIn} />;
  }

  const target = Number(targetWeight);
  const hasTarget = Number.isFinite(target) && target > 0;
  const weights = validLogs.map((log) => log.chartWeight);
  const minimumWeight = Math.min(...weights, ...(hasTarget ? [target] : []));
  const maximumWeight = Math.max(...weights, ...(hasTarget ? [target] : []));
  const padding = Math.max((maximumWeight - minimumWeight) * 0.14, 1);
  const min = minimumWeight - padding;
  const max = maximumWeight + padding;
  const height = 220;
  const left = 54;
  const right = 18;
  const top = 18;
  const bottom = 40;
  const plotHeight = height - top - bottom;
  const plotWidth = 620 - left - right;
  const yFor = (value) => top + ((max - value) / (max - min)) * plotHeight;
  const points = validLogs.map((log, index) => ({
    x: left + (validLogs.length === 1 ? plotWidth / 2 : (index / (validLogs.length - 1)) * plotWidth),
    y: yFor(log.chartWeight),
    weight: log.chartWeight,
    date: log.date,
  }));
  const path = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const labelIndexes = new Set([0, points.length - 1]);
  if (points.length > 3) labelIndexes.add(Math.floor((points.length - 1) / 2));
  const weightChange = validLogs[validLogs.length - 1].chartWeight - validLogs[0].chartWeight;

  return (
    <div className="forma-app__trend">
      <div className="forma-app__trend-summary">
        <p>{formatProgressDate(validLogs[0].date)} <span>to</span> {formatProgressDate(validLogs[validLogs.length - 1].date)}</p>
        {validLogs.length > 1 && (
          <p className="forma-app__trend-change">
            {weightChange > 0 ? <ArrowUpRight aria-hidden="true" /> : weightChange < 0 ? <ArrowDownRight aria-hidden="true" /> : null}
            {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg overall
          </p>
        )}
      </div>
      <svg viewBox={`0 0 620 ${height}`} role="img" aria-label={`${validLogs.length} weight check-ins, from ${validLogs[0].chartWeight.toFixed(1)} kg to ${validLogs[validLogs.length - 1].chartWeight.toFixed(1)} kg`}>
        {[top, top + plotHeight / 2, height - bottom].map((y) => <line key={y} className="forma-app__chart-gridline" x1={left} y1={y} x2={620 - right} y2={y} />)}
        {[max, (max + min) / 2, min].map((value, index) => (
          <text key={index} className="forma-app__chart-axis" x={left - 8} y={[top, top + plotHeight / 2, height - bottom][index] + 4} textAnchor="end">{value.toFixed(1)}</text>
        ))}
        {hasTarget && <line className="forma-app__chart-target" x1={left} y1={yFor(target)} x2={620 - right} y2={yFor(target)} />}
        {points.length > 1 && <path className="forma-app__trend-line" d={path} />}
        {points.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle className="forma-app__trend-point" cx={point.x} cy={point.y} r="4.5" />
            <title>{`${formatProgressDate(point.date)}: ${point.weight.toFixed(1)} kg`}</title>
            {labelIndexes.has(index) && <text className="forma-app__trend-value" x={point.x} y={Math.max(point.y - 11, 12)} textAnchor="middle">{point.weight.toFixed(1)}</text>}
            {labelIndexes.has(index) && <text className="forma-app__chart-axis" x={point.x} y={height - 12} textAnchor="middle">{formatProgressDate(point.date, { month: 'short', day: 'numeric' })}</text>}
          </g>
        ))}
      </svg>
      <div className="forma-app__chart-legend">
        <span><i className="is-ember" />Recorded weight</span>
        {hasTarget && <span><i className="is-teal" />Weight goal</span>}
      </div>
    </div>
  );
}

function MetricCard({ label, value, detail, prominent = false }) {
  return (
    <Card className={`forma-app__metric${prominent ? ' is-prominent' : ''}`}>
      <div className="forma-app__metric-heading"><p>{label}</p></div>
      <p className="forma-app__metric-value">{value}</p>
      <p className="forma-app__metric-detail">{detail}</p>
    </Card>
  );
}

function ProgressField({ field, value, onChange, required = false, ...props }) {
  return (
    <Field
      id={`progress-${field.key}`}
      label={`${field.label}${field.unit ? ` (${field.unit})` : ''}`}
      name={field.key}
      type={field.type || 'number'}
      min={field.min ?? 0}
      max={field.max}
      step={field.step || '0.1'}
      value={value}
      onChange={(event) => onChange(field.key, event.target.value)}
      required={required}
      {...props}
    />
  );
}

export default function Progress() {
  const { user } = useAuth();
  const canTrackStrengthPRs = user?.role !== 'user' || hasMinimumPlan(user?.membership, 'basic');
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchProgressData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [logsRes, summaryRes] = await Promise.all([
        api.get('/progress'),
        api.get('/progress/summary'),
      ]);
      if (!logsRes.data.success || !summaryRes.data.success) throw new Error('Progress records could not be loaded.');
      setLogs(Array.isArray(logsRes.data.progress) ? logsRes.data.progress : []);
      setSummary(summaryRes.data.summary || null);
    } catch (error) {
      setLoadError(error.response?.data?.message || error.message || 'Unable to load progress records. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProgressData(); }, [fetchProgressData]);

  const closeForm = () => {
    setShowForm(false);
    setEditingRecord(null);
    setFormError('');
  };

  const openCreateForm = () => {
    setEditingRecord(null);
    setFormData(createEmptyForm());
    setFormError('');
    setShowForm(true);
    window.setTimeout(() => document.getElementById('progress-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const openEditForm = (log) => {
    setEditingRecord(log);
    setFormData({
      date: log.date,
      weight: log.weight ?? '',
      chest: log.chest ?? '',
      waist: log.waist ?? '',
      hips: log.hips ?? '',
      biceps: log.biceps ?? '',
      thighs: log.thighs ?? '',
      bodyFatPercentage: log.bodyFatPercentage ?? '',
      benchPressMax: log.benchPressMax ?? '',
      squatMax: log.squatMax ?? '',
      deadliftMax: log.deadliftMax ?? '',
      notes: log.notes ?? '',
    });
    setFormError('');
    setShowForm(true);
    window.setTimeout(() => document.getElementById('progress-entry')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const updateFormField = (key, value) => setFormData((current) => ({ ...current, [key]: value }));

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    const weight = Number(formData.weight);
    if (!formData.weight || !Number.isFinite(weight) || weight <= 0) {
      setFormError('Enter a body weight greater than zero.');
      return;
    }
    if (!isValidDateKey(formData.date)) {
      setFormError('Enter a valid check-in date.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const response = editingRecord
        ? await api.put(`/progress/${editingRecord._id}`, formData)
        : await api.post('/progress', formData);
      if (!response.data?.success) throw new Error(response.data?.message || 'The progress record could not be saved.');
      closeForm();
      setFormData(createEmptyForm());
      await fetchProgressData();
    } catch (error) {
      setFormError(error.response?.data?.message || error.message || 'Could not save this check-in. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this progress check-in?')) return;
    setActionError('');
    try {
      await api.delete(`/progress/${id}`);
      await fetchProgressData();
    } catch (error) {
      setActionError(error.response?.data?.message || 'Could not delete the check-in. Please try again.');
    }
  };

  const sortedLogs = useMemo(() => [...logs].sort((first, second) => second.date.localeCompare(first.date)), [logs]);
  const hasRecords = logs.length > 0;
  const currentWeight = hasRecords && Number(summary?.totalLogs) > 0
    ? summary.currentWeight
    : sortedLogs[0]?.weight;
  const weightChange = hasRecords && Number(summary?.totalLogs) > 1
    ? Number(summary.weightChange)
    : null;

  return (
    <main className="forma-app forma-app-page forma-app-page--progress">
      <div className="forma-app__container">
        <header className="forma-app__page-heading">
          <div>
            <h1>Body progress</h1>
            <p>{canTrackStrengthPRs ? 'Record body measurements and strength benchmarks, then review how they change.' : 'Record body measurements, then review how they change.'}</p>
          </div>
          <Button type="button" variant="primary" onClick={openCreateForm} aria-expanded={showForm} aria-controls="progress-entry">
            <Plus aria-hidden="true" /> Log a check-in
          </Button>
        </header>

        {(loadError || actionError) && (
          <Card className="forma-app__alert is-error" role="alert">
            <div><AlertCircle aria-hidden="true" /><p>{actionError || loadError}</p></div>
            {loadError && <Button type="button" variant="secondary" onClick={fetchProgressData}><TrendingUp aria-hidden="true" /> Retry</Button>}
          </Card>
        )}

        {showForm && (
          <Card as="section" id="progress-entry" className="forma-app__entry">
            <div className="forma-app__section-heading">
              <div><h2>{editingRecord ? 'Edit check-in' : 'Log a body check-in'}</h2><p>Save a date and weight; add any other measurements you want to track.</p></div>
              <Button type="button" variant="ghost" onClick={closeForm} aria-label="Close check-in form"><X aria-hidden="true" /></Button>
            </div>
            {formError && <p className="forma-app__form-error" role="alert"><AlertCircle aria-hidden="true" />{formError}</p>}
            <form className="forma-app__progress-form" onSubmit={handleFormSubmit}>
              <div className="forma-app__form-grid forma-app__form-grid--two">
                <Field id="progress-date" label="Check-in date" name="date" type="date" value={formData.date} onChange={(event) => updateFormField('date', event.target.value)} required />
                <ProgressField field={{ key: 'weight', label: 'Body weight', unit: 'kg', step: '0.1' }} value={formData.weight} onChange={updateFormField} required />
              </div>
              <fieldset className="forma-app__field-group">
                <legend>Body measurements</legend>
                <div className="forma-app__form-grid">
                  {measurementFields.map((field) => <ProgressField key={field.key} field={field} value={formData[field.key]} onChange={updateFormField} />)}
                </div>
              </fieldset>
              {canTrackStrengthPRs && (
                <fieldset className="forma-app__field-group">
                  <legend>Strength benchmarks</legend>
                  <div className="forma-app__form-grid">
                    {strengthFields.map((field) => <ProgressField key={field.key} field={field} value={formData[field.key]} onChange={updateFormField} />)}
                  </div>
                </fieldset>
              )}
              <Field
                as="textarea"
                id="progress-notes"
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={(event) => updateFormField('notes', event.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Optional context for this check-in"
              />
              <div className="forma-app__form-actions">
                <Button type="button" variant="secondary" onClick={closeForm} disabled={submitting}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting && <Loader2 aria-hidden="true" className="forma-app__spinner" />}
                  {submitting ? 'Saving…' : editingRecord ? 'Save changes' : 'Save check-in'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        <section className={`forma-app__metric-grid${canTrackStrengthPRs ? ' has-strength' : ''}`} aria-label="Progress summary">
          <MetricCard label="Current weight" value={loading ? '—' : currentWeight != null ? `${Number(currentWeight).toFixed(1)} kg` : '—'} detail={loading ? 'Loading check-ins' : hasRecords ? 'Latest recorded body weight' : 'No check-ins recorded'} prominent />
          <MetricCard
            label="Overall change"
            value={loading || weightChange === null ? '—' : `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`}
            detail={weightChange === null ? 'Needs two or more check-ins' : 'Since your first check-in'}
          />
          {canTrackStrengthPRs && (
            <MetricCard label="Bench press" value={loading || !summary?.maxBench ? '—' : `${summary.maxBench} kg`} detail="Best recorded lift" />
          )}
          {canTrackStrengthPRs && (
            <MetricCard label="Squat" value={loading || !summary?.maxSquat ? '—' : `${summary.maxSquat} kg`} detail="Best recorded lift" />
          )}
          {canTrackStrengthPRs && (
            <MetricCard label="Deadlift" value={loading || !summary?.maxDeadlift ? '—' : `${summary.maxDeadlift} kg`} detail="Best recorded lift" />
          )}
          <MetricCard label="Check-ins" value={loading ? '—' : summary?.totalLogs ?? logs.length} detail="Saved progress records" />
        </section>

        <Card className="forma-app__section-card">
          <div className="forma-app__section-heading">
            <div><h2>Weight trend</h2><p>Body weight across your saved check-ins</p></div>
            {summary?.totalLogs > 0 && <span className="forma-app__section-total">{summary.totalLogs} check-ins</span>}
          </div>
          {loading ? (
            <div className="forma-app__chart-skeleton" role="status"><span className="forma-app__skeleton" /><span>Loading weight history…</span></div>
          ) : loadError ? (
            <p className="forma-app__inline-state is-error" role="alert">Weight history is unavailable.</p>
          ) : (
            <TrendChart logs={logs} targetWeight={user?.targetWeight} onAddCheckIn={openCreateForm} />
          )}
        </Card>

        <Card as="section" className="forma-app__history">
          <div className="forma-app__section-heading">
            <div><h2>Check-in history</h2><p>Measurements and training benchmarks you’ve recorded</p></div>
            <span className="forma-app__section-total">{loading ? '—' : logs.length}</span>
          </div>
          {loading ? (
            <div className="forma-app__chart-skeleton" role="status"><span className="forma-app__skeleton" /><span>Loading check-ins…</span></div>
          ) : loadError ? (
            <p className="forma-app__inline-state is-error" role="alert">Check-in history is unavailable.</p>
          ) : !hasRecords ? (
            <EmptyState type="progress" sentence="No check-ins yet. Add your first measurement to see your trend." actionLabel="Add a check-in" onAction={openCreateForm} />
          ) : (
            <div className="forma-app__table-wrap">
              <table className="forma-app__table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Weight</th>
                    <th scope="col">Body fat</th>
                    <th scope="col">Waist</th>
                    <th scope="col">Chest</th>
                    {canTrackStrengthPRs && <th scope="col">Bench / squat / deadlift</th>}
                    <th scope="col"><span className="forma-app__visually-hidden">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLogs.map((log) => (
                    <tr key={log._id}>
                      <td><span className="forma-app__date-value"><Calendar aria-hidden="true" />{formatProgressDate(log.date)}</span></td>
                      <td className="is-primary">{log.weight != null ? `${log.weight} kg` : '—'}</td>
                      <td>{log.bodyFatPercentage != null ? `${log.bodyFatPercentage}%` : '—'}</td>
                      <td>{log.waist != null ? `${log.waist} cm` : '—'}</td>
                      <td>{log.chest != null ? `${log.chest} cm` : '—'}</td>
                      {canTrackStrengthPRs && <td>{[log.benchPressMax, log.squatMax, log.deadliftMax].map((value) => value != null ? `${value} kg` : '—').join(' / ')}</td>}
                      <td>
                        <div className="forma-app__row-actions">
                          <Button type="button" variant="ghost" onClick={() => openEditForm(log)} aria-label={`Edit check-in from ${formatProgressDate(log.date)}`}><Pencil aria-hidden="true" /></Button>
                          <Button type="button" variant="ghost" onClick={() => handleDelete(log._id)} aria-label={`Delete check-in from ${formatProgressDate(log.date)}`}><Trash2 aria-hidden="true" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
