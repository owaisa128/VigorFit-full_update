import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, LifeBuoy, Loader2, MessageSquareText, Send } from '../icons';
import api from '../api/axios';

const categories = [
  { value: 'general', label: 'General' },
  { value: 'bug', label: 'Technical issue' },
  { value: 'feature', label: 'Feature request' },
  { value: 'billing', label: 'Billing' },
  { value: 'account', label: 'Account' },
];

const statusStyles = {
  pending: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  'in-progress': 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  resolved: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
};

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/feedback/my-feedback');
      if (!data?.success || !Array.isArray(data.feedback)) throw new Error('Support history response was incomplete.');
      setTickets(data.feedback);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load your support history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const submitTicket = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    if (!subject.trim() || !message.trim()) {
      setError('Enter a subject and describe how we can help.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/feedback', { subject: subject.trim(), category, message: message.trim() });
      if (!data?.success || !data.feedback) throw new Error('Support request was not saved.');
      setTickets((current) => [data.feedback, ...current]);
      setSubject('');
      setCategory('general');
      setMessage('');
      setNotice('Your support request has been submitted.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to submit your support request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="vf-theme-page mx-auto w-full max-w-5xl space-y-6 px-4 py-8 text-white sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner vf-support-header rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-950/30 to-[#111111] p-6 sm:p-8">
        <p className="vf-support-accent inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-sky-300"><LifeBuoy className="h-4 w-4" /> Member support</p>
        <h1 className="mt-2 text-3xl font-black">How can we help?</h1>
        <p className="mt-2 text-sm text-gray-400">Send a request to the Kinetide team and follow its status here.</p>
      </PageHeader>

      {error && <p role="alert" className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</p>}

      <form onSubmit={submitTicket} className="space-y-4 rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)] sm:p-7">
        <h2 className="text-lg font-bold">Create a support request</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-gray-400">Subject
            <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={150} required className="vf-support-input mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-3 text-sm text-white outline-none focus:border-sky-500" />
          </label>
          <label className="text-xs font-semibold text-gray-400">Category
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="vf-support-input mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-3 text-sm text-white outline-none focus:border-sky-500">
              {categories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs font-semibold text-gray-400">Message
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} rows={5} required className="vf-support-input mt-1.5 w-full resize-y rounded-xl border border-white/10 bg-[#080808] px-3 py-3 text-sm text-white outline-none focus:border-sky-500" />
          <span className="mt-1 block text-right text-[11px] text-gray-600">{message.length}/5000</span>
        </label>
        <button type="submit" disabled={submitting} className="vf-support-submit inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-5 py-3 text-sm font-bold text-white shadow-md shadow-[#E10600]/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit request
        </button>
      </form>

      <section className="space-y-4">
        <div className="flex items-center gap-2"><MessageSquareText className="vf-support-accent h-5 w-5 text-sky-300" /><h2 className="text-xl font-bold">Your requests</h2></div>
        {loading ? (
          <div className="flex min-h-32 items-center justify-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin" />Loading support history...</div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#111111] p-8 text-center text-sm text-gray-400">You haven’t submitted a support request yet.</div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <article key={ticket._id} className="rounded-2xl border border-white/10 bg-[#111111] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_rgba(225,6,0,0.16)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-bold text-white">{ticket.subject}</h3>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusStyles[ticket.status] || ''}`}>{ticket.status}</span>
                </div>
                <p className="mt-2 text-xs capitalize text-gray-500">{ticket.category} · {new Date(ticket.createdAt).toLocaleString()}</p>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">{ticket.message}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
