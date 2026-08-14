'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, Bell, CheckCheck, LoaderCircle, X } from 'lucide-react';
import type { AgentNotification } from '@/lib/intelligence/agentNotificationContract';
import { subscribeToEvents, supabase } from '@/lib/supabase';

type InboxPayload = {
  ok?: boolean;
  notifications?: AgentNotification[];
  unreadCount?: number;
};

export default function NotificationInbox() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AgentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  const hydrate = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const response = await fetch('/api/admin/agent-leads/notifications?limit=20', { cache: 'no-store' });
      const payload = await response.json().catch(() => null) as InboxPayload | null;
      if (!response.ok || !payload?.ok) throw new Error('Inbox hydration failed.');
      setNotifications(payload.notifications || []);
      setUnreadCount(payload.unreadCount || 0);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  const mutate = useCallback(async (body: Record<string, string>) => {
    const response = await fetch('/api/admin/agent-leads/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Inbox update failed.');
  }, []);

  useEffect(() => {
    void hydrate();
    const subscription = subscribeToEvents(() => void hydrate());
    const poll = window.setInterval(() => void hydrate(), 30_000);
    return () => {
      window.clearInterval(poll);
      if (subscription) void supabase.removeChannel(subscription);
    };
  }, [hydrate]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  const markAllRead = async () => {
    const previous = notifications;
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await mutate({ action: 'mark_all_read' });
    } catch {
      setNotifications(previous);
      setUnreadCount(previous.filter((item) => !item.read_at).length);
      setError(true);
    }
  };

  const openNotification = async (notification: AgentNotification) => {
    if (notification.read_at) return;
    setNotifications((current) => current.map((item) => item.id === notification.id
      ? { ...item, read_at: new Date().toISOString() }
      : item));
    setUnreadCount((current) => Math.max(0, current - 1));
    try {
      await mutate({ action: 'mark_read', notificationId: notification.id });
    } catch {
      void hydrate();
    }
  };

  const archive = async (notification: AgentNotification) => {
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    if (!notification.read_at) setUnreadCount((current) => Math.max(0, current - 1));
    try {
      await mutate({ action: 'archive', notificationId: notification.id });
    } catch {
      void hydrate();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative inline-flex h-10 w-10 items-center justify-center border border-white/10 bg-white/[0.06] text-cyan-200 transition hover:bg-white/10 hover:text-white"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
      >
        <Bell size={18} />
        {unreadCount ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center bg-cyan-300 px-1 text-[9px] font-black text-slate-950">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section className="absolute right-0 z-50 mt-2 w-[min(92vw,390px)] border border-cyan-300/20 bg-slate-950 shadow-2xl shadow-black/50" aria-label="Notifications panel">
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <h2 className="text-sm font-black text-white">Notifications</h2>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{unreadCount} unread</p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount ? (
                <button type="button" onClick={() => void markAllRead()} className="p-2 text-slate-400 transition hover:text-cyan-200" aria-label="Mark all notifications read" title="Mark all read">
                  <CheckCheck size={16} />
                </button>
              ) : null}
              <button type="button" onClick={() => setOpen(false)} className="p-2 text-slate-400 transition hover:text-white" aria-label="Close notifications">
                <X size={16} />
              </button>
            </div>
          </header>

          <div className="max-h-[min(65vh,520px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500"><LoaderCircle className="animate-spin" size={20} /></div>
            ) : error && !notifications.length ? (
              <button type="button" onClick={() => void hydrate()} className="w-full px-5 py-12 text-center text-sm text-red-200">Inbox unavailable. Retry</button>
            ) : notifications.length ? notifications.map((notification) => (
              <article key={notification.id} className={`border-b border-white/[0.07] px-4 py-4 ${notification.read_at ? 'bg-slate-950' : 'bg-cyan-300/[0.055]'}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-1 h-2 w-2 shrink-0 ${notification.read_at ? 'bg-slate-700' : notification.priority === 'high' ? 'bg-rose-300' : 'bg-cyan-300'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={notification.action_href} onClick={() => void openNotification(notification)} className="min-w-0 text-sm font-black leading-5 text-white hover:text-cyan-100">
                        {notification.title}
                      </Link>
                      <button type="button" onClick={() => void archive(notification)} className="shrink-0 p-1 text-slate-600 transition hover:text-white" aria-label={`Archive ${notification.title}`} title="Archive">
                        <Archive size={14} />
                      </button>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{notification.body}</p>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.1em]">
                      <span className="text-slate-600">{formatNotificationTime(notification.last_seen_at)}</span>
                      <Link href={notification.action_href} onClick={() => void openNotification(notification)} className="text-cyan-200 hover:text-cyan-100">{notification.action_label}</Link>
                    </div>
                  </div>
                </div>
              </article>
            )) : (
              <p className="px-5 py-14 text-center text-sm text-slate-600">No notifications yet.</p>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Recently';
}
