'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  type: 'session-accepted' | 'session-rejected' | string;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

interface ReservationItem {
  id: string;
  date: string;
  time: string;
  status: 'accepted' | 'confirmed' | 'rejected' | 'cancelled';
  choreographer: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export default function ClientNotificationsPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState<'client' | 'choreographer' | 'super-admin' | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsError, setNotificationsError] = useState('');
  const [reminderNotifications, setReminderNotifications] = useState<NotificationItem[]>([]);

  const parseSessionDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return null;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null;
    const [year, month, day] = parts;

    const timeParts = timeStr.trim().split(' ');
    if (timeParts.length < 2) return null;
    const [clock, meridiemRaw] = timeParts;
    const meridiem = meridiemRaw.toUpperCase();
    const [hh, mm] = clock.split(':').map(Number);
    if ([hh, mm].some(n => Number.isNaN(n))) return null;

    let hours = hh % 12;
    if (meridiem === 'PM') hours += 12;
    return new Date(year, month - 1, day, hours, mm, 0, 0);
  };

  const splitReason = (message: string) => {
    const marker = 'Reason:';
    const idx = message.indexOf(marker);
    if (idx === -1) return { base: message, reason: '' };
    const base = message.slice(0, idx).trim();
    const reason = message.slice(idx + marker.length).trim();
    return { base, reason };
  };

  const combinedNotifications = useMemo(() => {
    const all = [...reminderNotifications, ...notifications];
    const seen = new Set<string>();
    return all.filter(n => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [reminderNotifications, notifications]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data?.success) {
          setUserName(data.user.fullName);
          setUserRole(data.user.role || 'client');
          if (data.user.role && data.user.role !== 'client') {
            router.push('/choreographer/home');
          }
        } else {
          setUserRole('');
          setError('Please sign in to view notifications.');
          setLoading(false);
        }
      } catch {}
    };
    loadUser();
  }, [router]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (userRole !== 'client') return;
        setNotificationsError('');
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load notifications');
        setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      } catch (err: any) {
        setNotificationsError(err.message || 'Failed to load notifications');
      }
    };
    loadNotifications();
  }, [userRole]);

  useEffect(() => {
    const markAsRead = async () => {
      try {
        if (userRole !== 'client') return;
        await fetch('/api/notifications', { method: 'PATCH' });
      } catch {}
    };
    markAsRead();
  }, [userRole]);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        if (userRole !== 'client') return;
        const res = await fetch('/api/reservations');
        const data = await res.json();
        if (!res.ok || !data?.success) return;
        const items: ReservationItem[] = Array.isArray(data?.reservations) ? data.reservations : [];
        const now = new Date();
        const cutoff = 24 * 60 * 60 * 1000;

        const reminders = items
          .map(r => {
            const sessionTime = parseSessionDateTime(r.date, r.time);
            if (!sessionTime) return null;
            const diff = sessionTime.getTime() - now.getTime();
            if (diff <= 0 || diff > cutoff) return null;
            const hours = Math.max(1, Math.ceil(diff / (60 * 60 * 1000)));
            return {
              id: `reminder-${r.id}`,
              type: 'session-reminder',
              title: 'Session Reminder',
              message: `You have a session with ${r.choreographer?.name || 'your choreographer'} in about ${hours} hour${hours === 1 ? '' : 's'} (${r.date} at ${r.time}).`,
              createdAt: now.toISOString(),
            } as NotificationItem;
          })
          .filter(Boolean) as NotificationItem[];

        setReminderNotifications(reminders);
      } catch {
        setReminderNotifications([]);
      }
    };
    loadReminders();
  }, [userRole]);

  useEffect(() => {
    if (userRole === 'client') setLoading(false);
  }, [userRole]);

  return (
    <div className="notifications-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .notifications-root { min-height: 100vh; background: #f6f7fb; font-family: 'Manrope', sans-serif; color: #0f172a; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 40px; background: #fff; border-bottom: 1px solid #e7e9f0; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-badge { width: 48px; height: 48px; border-radius: 999px; background: #fff; overflow: hidden; box-shadow: 0 8px 18px rgba(0,0,0,0.18); display: grid; place-items: center; }
        .brand-badge img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.2); }
        .brand-name { font-weight: 700; letter-spacing: 0.4px; }
        .brand-sub { font-size: 10px; color: #f4b63a; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
        .nav-links { display: flex; gap: 18px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
        .user-pill { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border: 1px solid #e7e9f0; border-radius: 999px; background: #fff; font-size: 12px; font-weight: 600; }
        .user-role { color: #f4b63a; text-transform: uppercase; font-size: 9px; letter-spacing: 1.2px; margin-left: 6px; }
        .page { max-width: 1000px; margin: 0 auto; padding: 32px 36px 60px; }
        .portal-label { font-size: 10px; letter-spacing: 3px; color: #f4b63a; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
        .hero h1 { font-family: 'Playfair Display', serif; font-size: 32px; margin: 0 0 12px; }
        .section-title { font-size: 10px; letter-spacing: 3px; color: #9ca3af; text-transform: uppercase; font-weight: 700; margin: 26px 0 12px; }
        .empty { color: #9ca3af; font-size: 13px; }
        .notice-card { background: #fff; border: 1px solid #e7e9f0; border-radius: 16px; padding: 14px 16px; box-shadow: 0 8px 18px rgba(17,24,39,0.05); }
        .notice-item { padding: 12px 0; border-bottom: 1px solid #eef1f7; }
        .notice-item:last-child { border-bottom: none; }
        .notice-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #f4b63a; letter-spacing: 1.4px; }
        .notice-message { font-size: 13px; color: #374151; margin-top: 4px; }
        .notice-date { font-size: 11px; color: #9ca3af; margin-top: 6px; }
        @media (max-width: 760px) {
          .topbar { padding: 14px 18px; }
          .nav-links { display: none; }
          .page { padding: 24px 18px 50px; }
        }
      `}</style>

      <nav className="topbar">
        <div className="brand">
          <div className="brand-badge"><img src="/images/logo.png" alt="Logo" /></div>
          <div>
            <div className="brand-name">Step Out</div>
            <div className="brand-sub">Studio Hub</div>
          </div>
        </div>
        <div className="nav-links">
          <span onClick={() => router.push('/client/home')} style={{ cursor: 'pointer' }}>Home</span>
          <span onClick={() => router.push('/client/sessions')} style={{ cursor: 'pointer' }}>Sessions</span>
        </div>
        <div className="user-pill">
          <span>Hi, {userName}</span>
          <span className="user-role">Client</span>
        </div>
      </nav>

      <div className="page">
        <div className="portal-label">Member Portal</div>
        <div className="hero">
          <h1>Notifications</h1>
          <div className="section-title">Updates & Reminders</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px' }}>Your Session Alerts</div>
        </div>

        {loading ? (
          <div className="empty">Loading notifications...</div>
        ) : error ? (
          <div className="empty">{error}</div>
        ) : notificationsError ? (
          <div className="empty">{notificationsError}</div>
        ) : combinedNotifications.length === 0 ? (
          <div className="empty">No notifications yet.</div>
        ) : (
          <div className="notice-card">
            {combinedNotifications.map(n => {
              const { base, reason } = splitReason(n.message || '');
              const dateValue = n.createdAt ? new Date(n.createdAt).toLocaleDateString() : '';
              return (
                <div key={n.id} className="notice-item">
                  <div className="notice-label">{n.title}</div>
                  <div className="notice-message">{base}</div>
                  {reason && <div className="notice-message">Reason: {reason}</div>}
                  {dateValue && <div className="notice-date">{dateValue}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
