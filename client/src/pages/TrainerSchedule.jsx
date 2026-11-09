import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarDays, Clock, ExternalLink, Loader2, Trash2 } from '../icons';
import { Button, Card } from '../components/ui';
import EmptyState from '../components/EmptyState';
import api from '../api/axios';

const formatDate = (value) => new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(value));
const formatTime = (value) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value));

export default function TrainerSchedule() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/trainer-workspace/classes');
      if (!Array.isArray(data.classes)) throw new Error('Scheduled classes were not returned.');
      setClasses(data.classes);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load your schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (item) => {
    if (!window.confirm(`Remove "${item.title}" from your schedule?`)) return;
    setDeletingId(item._id);
    setError('');
    try {
      await api.delete(`/trainer-workspace/classes/${item._id}`);
      setClasses((current) => current.filter(({ _id }) => _id !== item._id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove this class.');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <main className="forma-app forma-app-page forma-step6">
      <div className="forma-app__container">
        <header className="forma-app__page-heading">
          <div><h1>Class schedule</h1><p>Manage your upcoming Zoom sessions and the links shared with clients.</p></div>
          <Button as={Link} to="/trainer/slots" variant="primary"><CalendarDays aria-hidden="true" /> Create a class</Button>
        </header>
        {error && <Card className="forma-step6__notice is-error" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p><Button type="button" variant="secondary" onClick={load}>Retry</Button></Card>}
        {loading ? <Card className="forma-step6__loading" role="status"><Loader2 aria-hidden="true" className="forma-step6__spinner" />Loading schedule…</Card>
          : !classes.length && !error ? <EmptyState type="workouts" sentence="Your schedule is clear. Create a class to add your first session." actionLabel="Create a class" to="/trainer/slots" />
            : <section className="forma-step6__trainer-schedule" aria-label="Scheduled classes">{classes.map((item) => (
              <Card className="forma-step6__session" key={item._id}>
                <div className="forma-step6__session-top">
                  <div><span className="forma-step6__tag">{item.category || 'General'}</span><h2>{item.title}</h2></div>
                  <span className="forma-step6__session-duration"><Clock aria-hidden="true" />{item.durationMinutes} min</span>
                </div>
                {item.description && <p className="forma-step6__session-description">{item.description}</p>}
                <p className="forma-step6__session-meta"><CalendarDays aria-hidden="true" />{formatDate(item.startsAt)} · {formatTime(item.startsAt)}</p>
                <div className="forma-step6__session-actions">
                  <Button as="a" href={item.zoomUrl} target="_blank" rel="noreferrer" variant="secondary"><ExternalLink aria-hidden="true" /> Open Zoom</Button>
                  <Button type="button" variant="ghost" aria-label={`Remove ${item.title}`} disabled={!!deletingId} onClick={() => remove(item)}>{deletingId === item._id ? <Loader2 aria-hidden="true" className="forma-step6__spinner" /> : <Trash2 aria-hidden="true" />} Remove</Button>
                </div>
              </Card>
            ))}</section>}
        </div>
      </main>
  );
}
