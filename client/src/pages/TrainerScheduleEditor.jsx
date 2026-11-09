import React, { useEffect, useState } from 'react';
import { AlertCircle, CalendarPlus, CheckCircle2, Loader2 } from '../icons';
import { Button, Card, Field } from '../components/ui';
import api from '../api/axios';

const initialForm = { title: '', description: '', category: 'Strength', startsAt: '', durationMinutes: '45', zoomUrl: '' };

export default function TrainerScheduleEditor() {
  const [form, setForm] = useState(initialForm);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/memberships/assigned-clients')
      .then(({ data }) => {
        if (!Array.isArray(data.clients)) throw new Error('Assigned clients were not returned.');
        if (active) setClients(data.clients);
      })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || requestError.message || 'Unable to load your assigned clients.'); })
      .finally(() => { if (active) setLoadingClients(false); });
    return () => { active = false; };
  }, []);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const startsAt = new Date(form.startsAt);
    if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
      setError('Choose a future date and time for this class.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/trainer-workspace/classes', { ...form, startsAt: startsAt.toISOString(), durationMinutes: Number(form.durationMinutes) });
      setSuccess(data.message || 'Class scheduled. Your eligible assigned clients have been notified.');
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to schedule this class.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="forma-app forma-app-page forma-step6">
      <div className="forma-app__container forma-step6__schedule-form-wrap">
        <header className="forma-app__page-heading"><div><h1>Create a live session</h1><p>Schedule a Zoom class for eligible assigned clients.</p></div><CalendarPlus aria-hidden="true" /></header>
        {error && <Card className="forma-step6__notice is-error" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p></Card>}
        {success && <Card className="forma-step6__notice is-success" role="status"><CheckCircle2 aria-hidden="true" /><p>{success}</p></Card>}
        {!loadingClients && !clients.length && !error && <Card className="forma-step6__notice is-warning"><AlertCircle aria-hidden="true" /><p>An eligible assigned client is required before you can schedule a class.</p></Card>}
        <Card as="form" className="forma-step6__schedule-form" onSubmit={submit}>
          <div className="forma-step6__form-grid">
            <Field id="class-title" name="title" label="Class title" value={form.title} onChange={update} maxLength={120} required placeholder="Full-body strength" />
            <Field id="class-category" name="category" label="Training category" value={form.category} onChange={update} maxLength={50} required />
            <Field id="class-start" name="startsAt" label="Date and time" type="datetime-local" value={form.startsAt} onChange={update} required />
            <Field id="class-duration" name="durationMinutes" label="Duration (minutes)" type="number" min="10" max="240" value={form.durationMinutes} onChange={update} required />
            <Field id="class-zoom" name="zoomUrl" label="Zoom meeting link" type="url" value={form.zoomUrl} onChange={update} required placeholder="https://zoom.us/j/…" />
          </div>
          <Field as="textarea" id="class-description" name="description" label="Preparation notes" value={form.description} onChange={update} rows={4} maxLength={1000} placeholder="What should clients prepare?" />
          <p className="forma-step6__form-note">The class will appear in the schedule for eligible clients assigned to you.</p>
          <Button type="submit" variant="primary" disabled={submitting || loadingClients || clients.length === 0}>
            {submitting || loadingClients ? <Loader2 aria-hidden="true" className="forma-step6__spinner" /> : <CalendarPlus aria-hidden="true" />}
            Schedule class
          </Button>
        </Card>
      </div>
    </main>
  );
}
