import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Inbox, Loader2, RefreshCw, Search } from '../icons';
import api from '../api/axios';
import EmptyState from '../components/EmptyState';

const statusStyles = {
  pending: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  'in-progress': 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  resolved: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
};

export default function AdminInbox() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: 100 };
      if (status !== 'all') params.status = status;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get('/admin/support', { params });
      if (!Array.isArray(data.tickets)) throw new Error('Inbox response was incomplete.');
      setItems(data.tickets);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to load contact messages.');
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (item, nextStatus) => {
    setBusyId(item._id);
    setError('');
    try {
      const { data } = await api.put(`/admin/support/${item._id}`, { status: nextStatus });
      if (!data?.success) throw new Error(data?.message || 'Unable to update message status.');
      setItems((current) => current.map((record) => record._id === item._id ? { ...record, status: nextStatus } : record));
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to update message status.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <main className="vf-theme-page mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner mb-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/10 bg-[#111115] p-5 sm:p-6">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300"><Inbox className="h-4 w-4" />Admin messages</p><h1 className="mt-2 text-3xl font-black text-white sm:text-4xl">Support inbox</h1><p className="mt-2 text-sm text-gray-400">Member support requests and previously submitted website contact messages.</p></div>
        <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-white/5 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
      </PageHeader>
      <div className="mb-5 grid gap-3 rounded-2xl border border-white/10 bg-[#111111] p-4 sm:grid-cols-[1fr_200px]">
        <label className="relative block"><span className="sr-only">Search inbox</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search sender, email, subject or message" className="w-full rounded-xl border border-white/10 bg-[#080808] py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-red-500" /></label>
        <label className="text-xs font-semibold text-gray-400"><span className="sr-only">Filter by status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-3 text-sm text-white outline-none focus:border-red-500"><option value="all">All statuses</option><option value="pending">Pending</option><option value="in-progress">In progress</option><option value="resolved">Resolved</option></select></label>
      </div>
      {error && <p role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/20 p-4 text-sm text-red-200"><AlertCircle className="h-4 w-4" />{error}</p>}
      {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-red-400" />Loading inbox…</div>
        : items.length === 0 ? <EmptyState
          type="messages"
          sentence={search.trim() || status !== 'all' ? 'No support requests match these filters.' : 'Your support inbox is clear.'}
          actionLabel={search.trim() || status !== 'all' ? 'Clear filters' : 'Refresh inbox'}
          onAction={() => {
            if (search.trim() || status !== 'all') {
              setSearch('');
              setStatus('all');
            } else {
              load();
            }
          }}
        />
          : <div className="space-y-4">{items.map((item) => {
            const name = item.source === 'contact' ? item.senderName : item.user?.name;
            const email = item.source === 'contact' ? item.senderEmail : item.user?.email;
            return (
              <article key={item._id} className="rounded-2xl border border-white/10 bg-[#111111] p-5 sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold text-white">{item.subject}</h2><span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase text-[var(--text)]">{item.source === 'contact' ? 'Website contact' : 'Support ticket'}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${statusStyles[item.status] || ''}`}>{item.status}</span></div>
                    <p className="mt-2 text-sm text-gray-300">{name || 'Unknown sender'}{email && <> · <a href={`mailto:${email}`} className="text-red-200 hover:text-white">{email}</a></>}</p>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">{item.message}</p>
                    <time className="mt-4 block text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()}</time>
                  </div>
                  <label className="shrink-0 text-xs font-semibold text-gray-400">Update status
                    <select value={item.status} disabled={busyId === item._id} onChange={(event) => updateStatus(item, event.target.value)} className="mt-1.5 block w-full rounded-lg border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-red-500 disabled:opacity-50">
                      <option value="pending">Pending</option><option value="in-progress">In progress</option><option value="resolved">Resolved</option>
                    </select>
                    {busyId === item._id && <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500"><Loader2 className="h-3 w-3 animate-spin" />Saving</span>}
                  </label>
                </div>
              </article>
            );
          })}</div>}
    </main>
  );
}
