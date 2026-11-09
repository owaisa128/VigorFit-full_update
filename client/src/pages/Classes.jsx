import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, CalendarDays, Check, Clock, ExternalLink, Loader2 } from '../icons';
import { Button, Card } from '../components/ui';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';

const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayStart = (value) => {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};
const formatDate = (value, options = { weekday: 'long', month: 'long', day: 'numeric' }) =>
  new Intl.DateTimeFormat(undefined, options).format(new Date(value));
const formatTime = (value) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));

export default function Classes() {
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const loadClasses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/trainer-workspace/classes');
      if (!data?.success || !Array.isArray(data.classes)) throw new Error('Scheduled sessions were not returned.');
      setClasses(data.classes.filter((item) => new Date(item.startsAt) >= new Date()));
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load your trainer’s schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadClasses(); }, [loadClasses]);

  useEffect(() => {
    const requestedId = searchParams.get('classId');
    const requestedClass = classes.find((item) => item._id === requestedId);
    if (!requestedClass) return;
    const date = dayStart(requestedClass.startsAt);
    setSelectedDate(date);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [classes, searchParams]);

  const classesByDay = useMemo(() => classes.reduce((byDay, item) => {
    const key = dateKey(dayStart(item.startsAt));
    byDay.set(key, [...(byDay.get(key) || []), item]);
    return byDay;
  }, new Map()), [classes]);

  const calendarDays = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);

  const selectedClasses = classesByDay.get(dateKey(selectedDate)) || [];
  const updateBooking = async (item) => {
    setBusyId(item._id);
    setError('');
    try {
      if (item.isBooked) {
        await api.delete(`/trainer-workspace/classes/${item._id}/booking`);
      } else {
        await api.post(`/trainer-workspace/classes/${item._id}/book`);
      }
      await loadClasses();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to update your reservation.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="forma-app forma-app-page forma-step6">
      <div className="forma-app__container">
        <header className="forma-app__page-heading">
          <div>
            <h1>Live sessions</h1>
            <p>Browse your assigned trainer’s upcoming classes and reserve a place.</p>
          </div>
          <Button as={Link} to="/my-trainer" variant="secondary"><ArrowLeft aria-hidden="true" /> Your trainer</Button>
        </header>

        {error && (
          <Card className="forma-step6__notice is-error" role="alert">
            <AlertCircle aria-hidden="true" /><p>{error}</p>
            <Button type="button" variant="secondary" onClick={loadClasses}>Try again</Button>
          </Card>
        )}

        {loading ? (
          <Card className="forma-step6__loading" role="status"><Loader2 aria-hidden="true" className="forma-step6__spinner" />Loading your schedule…</Card>
        ) : classes.length === 0 && !error ? (
          <EmptyState type="workouts" sentence="Your trainer has no upcoming sessions scheduled yet." actionLabel="Message your trainer" to="/messages" />
        ) : (
          <div className="forma-step6__calendar-layout">
            <Card className="forma-step6__calendar">
              <div className="forma-step6__calendar-heading">
                <h2>{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)}</h2>
                <div>
                  <Button type="button" variant="ghost" aria-label="Previous month" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ArrowLeft aria-hidden="true" /></Button>
                  <Button type="button" variant="ghost" aria-label="Next month" onClick={() => setMonth((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ArrowRight aria-hidden="true" /></Button>
                </div>
              </div>
              <div className="forma-step6__calendar-grid" role="grid" aria-label="Upcoming class calendar">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span className="forma-step6__weekday" role="columnheader" key={day}>{day}</span>)}
                {calendarDays.map((date) => {
                  const key = dateKey(date);
                  const dayClasses = classesByDay.get(key) || [];
                  const selected = dateKey(selectedDate) === key;
                  return (
                    <button
                      type="button"
                      role="gridcell"
                      key={key}
                      aria-label={`${formatDate(date, { month: 'long', day: 'numeric', year: 'numeric' })}${dayClasses.length ? `, ${dayClasses.length} session${dayClasses.length === 1 ? '' : 's'}` : ''}`}
                      aria-pressed={selected}
                      className={`forma-step6__calendar-day${date.getMonth() !== month.getMonth() ? ' is-outside' : ''}${selected ? ' is-selected' : ''}`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <span>{date.getDate()}</span>
                      {dayClasses.length > 0 && <i aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              <p className="forma-step6__calendar-key"><i aria-hidden="true" />Scheduled session</p>
            </Card>

            <section className="forma-step6__session-list" aria-live="polite">
              <div className="forma-step6__section-heading">
                <h2>{formatDate(selectedDate)}</h2>
                <span>{selectedClasses.length} {selectedClasses.length === 1 ? 'session' : 'sessions'}</span>
              </div>
              {!selectedClasses.length ? (
                <EmptyState type="workouts" sentence="No sessions are scheduled for this day." actionLabel="Show today" onAction={() => setSelectedDate(new Date())} className="forma-step6__day-empty" />
              ) : selectedClasses.map((item) => (
                <Card className="forma-step6__session" key={item._id}>
                  <div className="forma-step6__session-top">
                    <div><span className="forma-step6__tag">{item.category || 'General'}</span><h3>{item.title}</h3></div>
                    {item.isBooked && <span className="forma-step6__reserved"><Check aria-hidden="true" />Reserved</span>}
                  </div>
                  <p className="forma-step6__session-meta"><Clock aria-hidden="true" />{formatTime(item.startsAt)} · {item.durationMinutes} min <span>with {item.trainer?.name || 'your trainer'}</span></p>
                  {item.description && <p className="forma-step6__session-description">{item.description}</p>}
                  <div className="forma-step6__session-actions">
                    {item.isBooked && item.zoomUrl && <Button as="a" href={item.zoomUrl} target="_blank" rel="noreferrer" variant="primary">Join session <ExternalLink aria-hidden="true" /></Button>}
                    <Button type="button" variant={item.isBooked ? 'secondary' : 'primary'} onClick={() => updateBooking(item)} disabled={busyId === item._id}>
                      {busyId === item._id ? <Loader2 aria-hidden="true" className="forma-step6__spinner" /> : null}
                      {item.isBooked ? 'Cancel reservation' : 'Book session'}
                    </Button>
                  </div>
                </Card>
              ))}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
