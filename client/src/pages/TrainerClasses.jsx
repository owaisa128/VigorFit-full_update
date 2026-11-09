import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, Clock, ExternalLink, Loader2, Trash2 } from '../icons';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';

const dateTime = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function TrainerClasses() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/trainer-workspace/classes');
      if (!Array.isArray(data.classes)) throw new Error('Scheduled classes were not returned.');
      setClasses(data.classes);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load your classes.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const remove = async (item) => {
    if (!window.confirm(`Remove "${item.title}"?`)) return;
    setDeleting(item._id);
    setError('');
    try {
      await api.delete(`/trainer-workspace/classes/${item._id}`);
      setClasses((current) => current.filter(({ _id }) => _id !== item._id));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to remove this class.');
    } finally {
      setDeleting('');
    }
  };

  return (
    <section className="vf-theme-page mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#171819] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-300"><CalendarDays className="h-4 w-4" />Trainer workspace</p><h1 className="mt-2 text-3xl font-black text-white">Zoom Classes</h1><p className="mt-1 text-sm text-gray-400">Manage your scheduled Zoom sessions.</p></div>
        <Link to="/trainer/slots" className="rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-4 py-3 text-center text-sm font-bold text-white">Create a slot</Link>
      </PageHeader>
      {error && <p role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-200"><AlertCircle className="h-4 w-4" />{error}</p>}
      {loading ? <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin" />Loading your classes…</div>
        : classes.length === 0 ? (
          <EmptyState
            type="workouts"
            sentence="You haven't scheduled any Zoom classes yet. Create a slot to invite your clients."
            actionLabel="Create a class"
            to="/trainer/slots"
          />
        )
          : <div className="space-y-4">{classes.map((item) => (
            <article key={item._id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#111111] p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><span className="text-xs font-bold uppercase tracking-wider text-red-300">{item.category}</span><h2 className="mt-1 text-lg font-bold text-white">{item.title}</h2>{item.description && <p className="mt-1 text-sm text-gray-400">{item.description}</p>}<p className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-300"><span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-red-300" />{dateTime(item.startsAt)}</span><span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-red-300" />{item.durationMinutes} min</span></p></div>
              <div className="flex shrink-0 gap-2"><a href={item.zoomUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5"><ExternalLink className="h-4 w-4" />Open Zoom</a><button type="button" onClick={() => remove(item)} disabled={!!deleting} aria-label={`Remove ${item.title}`} className="rounded-xl border border-red-500/20 p-2 text-red-300 hover:bg-red-500/10 disabled:opacity-50">{deleting === item._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div>
            </article>
          ))}</div>}
    </section>
  );
}
