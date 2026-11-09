import PageHeader from '../components/PageHeader';
import React, { useEffect, useState } from 'react';
import { AlertCircle, CalendarPlus, Loader2 } from '../icons';
import api from '../api/axios';

const initialForm = {
  title: '',
  description: '',
  category: 'Strength',
  startsAt: '',
  durationMinutes: '45',
  zoomUrl: '',
};

export default function TrainerSlots() {
  const [form, setForm] = useState(initialForm);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get('/memberships/assigned-clients')
      .then(({ data }) => setClients(Array.isArray(data.clients) ? data.clients : []))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to check your assigned clients.'))
      .finally(() => setLoadingClients(false));
  }, []);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const startsAt = new Date(form.startsAt);
      if (Number.isNaN(startsAt.getTime())) throw new Error('Choose a valid date and time for the class.');
      const { data } = await api.post('/trainer-workspace/classes', {
        ...form,
        startsAt: startsAt.toISOString(),
        durationMinutes: Number(form.durationMinutes),
      });
      setSuccess(data.message || 'Class slot created. Your assigned clients have been notified.');
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to create the class slot.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="vf-theme-page mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner mb-6 rounded-2xl border border-white/10 bg-[#171819] p-6">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-300"><CalendarPlus className="h-4 w-4" />Trainer workspace</p>
        <h1 className="mt-2 text-3xl font-black text-white">Create a Class Slot</h1>
        <p className="mt-1 text-sm text-gray-400">Scheduled slots appear in your Zoom Classes and notify only your active assigned Premium clients.</p>
      </PageHeader>
      {(error || success) && <p role={error ? 'alert' : 'status'} className={`mb-4 flex items-center gap-2 rounded-xl border p-4 text-sm ${error ? 'border-red-500/20 bg-red-950/20 text-red-200' : 'border-emerald-500/20 bg-emerald-950/20 text-emerald-200'}`}>{error ? <AlertCircle className="h-4 w-4 shrink-0" /> : null}{error || success}</p>}
      {!loadingClients && clients.length === 0 && !error && <p className="mb-4 rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-sm text-amber-200">You need an active assigned Premium client to schedule a class.</p>}
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)] sm:p-7">
        <label className="block text-sm font-semibold text-gray-300">Class title
          <input name="title" value={form.title} onChange={update} maxLength={120} required className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-red-500" placeholder="e.g. Full-body strength training" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-gray-300">Category
            <input name="category" value={form.category} onChange={update} maxLength={50} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-red-500" />
          </label>
          <label className="block text-sm font-semibold text-gray-300">Date and time
            <input type="datetime-local" name="startsAt" value={form.startsAt} onChange={update} required className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-red-500" />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-gray-300">Duration (minutes)
            <input type="number" name="durationMinutes" value={form.durationMinutes} onChange={update} min="10" max="240" required className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-red-500" />
          </label>
          <label className="block text-sm font-semibold text-gray-300">Zoom meeting URL
            <input type="url" name="zoomUrl" value={form.zoomUrl} onChange={update} required placeholder="https://zoom.us/j/..." className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-red-500" />
          </label>
        </div>
        <label className="block text-sm font-semibold text-gray-300">Description (optional)
          <textarea name="description" value={form.description} onChange={update} rows={4} maxLength={1000} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-red-500" placeholder="What should clients prepare?" />
        </label>
        <button type="submit" disabled={submitting || loadingClients || clients.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />}Create slot and notify clients
        </button>
      </form>
    </section>
  );
}
