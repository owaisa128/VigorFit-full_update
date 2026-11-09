import PageHeader from '../components/PageHeader';
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Bell, CheckCheck, Dumbbell, Loader2, RefreshCw, Trash2, Utensils } from '../icons';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';

const formatTime = (date) => {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? 'Recently' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [announcement, setAnnouncement] = useState({ title: '', message: '', link: '' });
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [announcementNotice, setAnnouncementNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notifications');
      if (!data?.success || !Array.isArray(data.notifications)) throw new Error(data?.message || 'Invalid notifications response.');
      setItems(data.notifications);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    setBusy('all');
    setError('');
    try {
      const { data } = await api.put('/notifications/mark-all-read');
      if (!data?.success) throw new Error(data?.message || 'Unable to mark notifications as read.');
      setItems((current) => current.map((item) => ({ ...item, unread: false })));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to mark notifications as read.');
    } finally {
      setBusy('');
    }
  };

  const markRead = async (item) => {
    if (!item.unread) return;
    setBusy(item._id);
    setError('');
    try {
      const { data } = await api.put(`/notifications/${item._id}/read`);
      if (!data?.success) throw new Error(data?.message || 'Unable to update notification.');
      setItems((current) => current.map((notification) => notification._id === item._id ? data.notification : notification));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to update notification.');
    } finally {
      setBusy('');
    }
  };

  const remove = async (item) => {
    setBusy(item._id);
    setError('');
    try {
      const { data } = await api.delete(`/notifications/${item._id}`);
      if (!data?.success) throw new Error(data?.message || 'Unable to delete notification.');
      setItems((current) => current.filter(({ _id }) => _id !== item._id));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to delete notification.');
    } finally {
      setBusy('');
    }
  };

  const unreadCount = items.filter((item) => item.unread).length;

  const sendAnnouncement = async (event) => {
    event.preventDefault();
    setSendingAnnouncement(true);
    setError('');
    setAnnouncementNotice('');
    try {
      const { data } = await api.post('/notifications/announcements', announcement);
      if (!data?.success) throw new Error(data?.message || 'Unable to send announcement.');
      setAnnouncementNotice(`Announcement delivered to ${data.recipientCount} users.`);
      setAnnouncement({ title: '', message: '', link: '' });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to send announcement.');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  return (
    <section className="vf-theme-page mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader as="header" className="vf-page-banner mb-6 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#171819] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-red-300"><Bell className="h-4 w-4" /> Your activity feed</p>
          <h1 className="text-3xl font-black tracking-tight text-white">Notifications</h1>
          <p className="mt-1 text-sm text-gray-400">{unreadCount ? `${unreadCount} unread` : 'You’re up to date.'}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-200 hover:border-white/20 hover:bg-white/5 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>
          <button type="button" onClick={markAllRead} disabled={loading || !unreadCount || !!busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E10600] to-[#650000] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><CheckCheck className="h-4 w-4" />Mark all read</button>
        </div>
      </PageHeader>

      {isAdmin && (
        <form onSubmit={sendAnnouncement} className="mb-6 rounded-2xl border border-amber-400/20 bg-[#171819] p-5 sm:p-6">
          <div className="mb-4"><h2 className="text-lg font-bold text-white">Send an announcement to everyone</h2><p className="mt-1 text-sm text-gray-400">This creates an unread alert for every registered account.</p></div>
          {announcementNotice && <p role="status" className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 text-sm text-emerald-200">{announcementNotice}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-gray-300">Title
              <input required maxLength={120} value={announcement.title} onChange={(event) => setAnnouncement((current) => ({ ...current, title: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/50" />
            </label>
            <label className="text-xs font-semibold text-gray-300">Optional internal link
              <input maxLength={300} placeholder="/memberships" value={announcement.link} onChange={(event) => setAnnouncement((current) => ({ ...current, link: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/50" />
            </label>
            <label className="text-xs font-semibold text-gray-300 sm:col-span-2">Announcement
              <textarea required maxLength={500} rows={3} value={announcement.message} onChange={(event) => setAnnouncement((current) => ({ ...current, message: event.target.value }))} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#080808] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-400/50" />
            </label>
          </div>
          <button type="submit" disabled={sendingAnnouncement} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-sm font-bold text-black disabled:opacity-50">{sendingAnnouncement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}Send to all users</button>
        </form>
      )}

      {error && <div role="alert" className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-950/30 p-4 text-sm text-red-200"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center gap-3 text-sm text-gray-400"><Loader2 className="h-5 w-5 animate-spin text-red-500" />Loading your notifications…</div>
      ) : items.length === 0 ? (
        <EmptyState type="notifications" sentence="You’re all caught up; new updates will appear here." actionLabel="Message your coach" to="/messages" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const Icon = item.type === 'workout' ? Dumbbell : item.type === 'nutrition' ? Utensils : Bell;
            return (
              <article key={item._id} className={`flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-start sm:p-5 ${item.unread ? 'border-red-500/25 bg-red-950/15' : 'border-white/10 bg-[#171819]'}`}>
                <span className="w-fit rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-300"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-white">{item.link ? <Link to={item.link} className="hover:text-red-200">{item.title}</Link> : item.title}</h2>{item.unread && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-200">New</span>}</div>
                  <p className="mt-1 text-sm leading-relaxed text-gray-300">{item.message}</p>
                  <time className="mt-2 block text-xs text-gray-500">{formatTime(item.createdAt)}</time>
                </div>
                <div className="flex shrink-0 gap-2">
                  {item.unread && <button type="button" onClick={() => markRead(item)} disabled={!!busy} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/5 disabled:opacity-50">{busy === item._id ? 'Saving…' : 'Mark read'}</button>}
                  <button type="button" onClick={() => remove(item)} disabled={!!busy} aria-label={`Delete ${item.title}`} className="rounded-lg border border-white/10 p-2 text-gray-400 hover:border-red-500/30 hover:text-red-300 disabled:opacity-50">{busy === item._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
