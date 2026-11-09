import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Bell, CheckCheck, Dumbbell, Loader2, Utensils, X } from '../icons';
import api from '../api/axios';
import EmptyState from './EmptyState';

const formatTime = (date) => {
  if (!date) return 'Recently';
  const value = new Date(date);
  return Number.isNaN(value.getTime())
    ? 'Recently'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(value);
};

export default function Notifications({ isOpen, onClose, anchorRef, onUnreadCount }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [position, setPosition] = useState(null);
  const unreadCount = notifications.filter(({ unread }) => unread).length;

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/notifications');
      if (!data?.success || !Array.isArray(data.notifications)) {
        throw new Error(data?.message || 'The notifications response was invalid.');
      }
      setNotifications(data.notifications);
      onUnreadCount?.(Number(data.unreadCount) || 0);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [onUnreadCount]);

  useEffect(() => {
    if (isOpen) void loadNotifications();
  }, [isOpen, loadNotifications]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return undefined;
    }
    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const bounds = anchor.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const gutter = Math.min(16, viewportWidth / 2);
      const width = Math.max(0, Math.min(384, viewportWidth - gutter * 2));
      const top = bounds.bottom + 8;
      setPosition({
        top,
        left: Math.min(Math.max(gutter, bounds.right - width), viewportWidth - width - gutter),
        width,
        maxHeight: Math.max(0, window.innerHeight - top - 16),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, isOpen]);

  const markAllRead = async () => {
    setAction('read-all');
    setError('');
    try {
      const { data } = await api.put('/notifications/mark-all-read');
      if (!data?.success) throw new Error(data?.message || 'Could not update notifications.');
      setNotifications((items) => items.map((item) => ({ ...item, unread: false })));
      onUnreadCount?.(0);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not update notifications.');
    } finally {
      setAction('');
    }
  };

  const dismissNotification = async (notification) => {
    setAction(notification._id);
    setError('');
    try {
      const { data } = await api.delete(`/notifications/${notification._id}`);
      if (!data?.success) throw new Error(data?.message || 'Could not delete this notification.');
      setNotifications((items) => items.filter((item) => item._id !== notification._id));
      if (notification.unread) onUnreadCount?.((count) => Math.max(0, count - 1));
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not delete this notification.');
    } finally {
      setAction('');
    }
  };

  if (!isOpen || !position) return null;

  return createPortal(
    <section
      aria-label="Notifications"
      className="fixed z-[60] overflow-hidden rounded-2xl border border-white/10 bg-[#111214] shadow-2xl"
      style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-[#171819] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#E10600]" />
          <h2 className="text-sm font-bold text-white">Notifications</h2>
          {unreadCount > 0 && <span className="rounded-full bg-[#650000] px-2 py-0.5 text-[10px] font-bold text-white">{unreadCount} new</span>}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button type="button" onClick={markAllRead} disabled={!!action} className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-300 hover:text-white disabled:opacity-50">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close notifications" className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="m-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" onClick={loadNotifications} className="font-semibold underline">Retry</button>
        </div>
      )}

      <div className="overflow-y-auto divide-y divide-white/5" style={{ maxHeight: Math.min(360, Math.max(0, position.maxHeight - 56)) }}>
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-xs text-gray-400"><Loader2 className="h-4 w-4 animate-spin text-[#E10600]" />Loading notifications</div>
        ) : notifications.length === 0 && !error ? (
          <EmptyState
            type="notifications"
            sentence="You’re all caught up; new updates will appear here."
            actionLabel="Notification settings"
            to="/settings"
            className="py-4"
          />
        ) : notifications.map((notification) => {
          const Icon = notification.type === 'workout' ? Dumbbell : notification.type === 'nutrition' ? Utensils : Bell;
          return (
            <article key={notification._id} className={`flex items-start justify-between gap-3 p-3.5 ${notification.unread ? 'bg-red-950/20' : ''}`}>
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-300"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-white">{notification.title}{notification.unread && <span aria-label="Unread" className="h-1.5 w-1.5 rounded-full bg-red-500" />}</h3>
                  <p className="mt-1 break-words text-[11px] leading-relaxed text-gray-400">{notification.message}</p>
                  <time className="mt-1 block text-[10px] text-gray-500">{formatTime(notification.createdAt)}</time>
                </div>
              </div>
              <button type="button" onClick={() => dismissNotification(notification)} disabled={action === notification._id} aria-label={`Delete ${notification.title}`} className="shrink-0 rounded p-1 text-gray-500 hover:bg-white/10 hover:text-white disabled:opacity-50">
                {action === notification._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              </button>
            </article>
          );
        })}
      </div>
    </section>,
    document.body,
  );
}
