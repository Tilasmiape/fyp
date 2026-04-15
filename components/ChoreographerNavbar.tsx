'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ThemeModeButton from '@/components/ThemeModeButton';

const links = [
  { label: 'Home', path: '/choreographer/home' },
  { label: 'Sessions', path: '/choreographer/sessions' },
  { label: 'Inbox', path: '/choreographer/inbox' },
  { label: 'Attendance', path: '/choreographer/attendance' },
  { label: 'Reviews', path: '/choreographer/reviews' },
  { label: 'Notifications', path: '/choreographer/notifications' },
];

interface ChoreographerNavbarProps {
  subtitle?: string;
}

export default function ChoreographerNavbar({ subtitle = 'Choreographer' }: ChoreographerNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<{id: string, title: string, message: string} | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          if (data?.notifications) {
            const unread = data.notifications.filter((n: any) => !n.read);
            setUnreadCount(unread.length);
            
            if (unread.length > 0) {
              const latest = unread[0];
              const lastSeenId = localStorage.getItem('lastSeenNotificationId');
              if (latest.id !== lastSeenId) {
                setLatestNotification(latest);
                setToastVisible(true);
                localStorage.setItem('lastSeenNotificationId', latest.id);
                setTimeout(() => setToastVisible(false), 8000);
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch notifications', err);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <>
    <style>{`
      .toast-popup {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #fff;
        border-radius: 12px;
        padding: 16px 20px;
        border-left: 4px solid #f4b63a;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        z-index: 9999;
        transform: translateY(150%);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        max-width: 320px;
      }
      .toast-popup.show {
        transform: translateY(0);
        opacity: 1;
      }
      .toast-title { font-weight: 800; font-size: 14px; margin-bottom: 4px; color: #0f172a; }
      .toast-message { font-size: 12px; color: #64748b; line-height: 1.4; }
      .toast-close { position: absolute; top: 10px; right: 12px; background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 16px; }
      .toast-close:hover { color: #0f172a; }
    `}</style>
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        background: '#fff',
        borderBottom: '1px solid #e7e9f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '999px',
            overflow: 'hidden',
            boxShadow: '0 8px 18px rgba(0,0,0,0.16)',
            background: '#fff',
          }}
        >
          <img src="/images/logo.png" alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2)' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a', letterSpacing: '0.3px' }}>Step Out Studio</div>
          <div style={{ fontSize: '10px', color: '#f4b63a', letterSpacing: '1.8px', textTransform: 'uppercase' }}>{subtitle}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <ThemeModeButton />
        {links.map((l) => {
          const active = pathname === l.path;
          const isNotifications = l.label === 'Notifications';
          return (
            <button
              key={l.path}
              onClick={() => router.push(l.path)}
              style={{
                position: 'relative',
                border: active ? '1px solid #cbd5e1' : '1px solid #e7e9f0',
                background: active ? '#eef2ff' : '#fff',
                color: active ? '#334155' : '#6b7280',
                padding: '7px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.9px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {l.label}
              {isNotifications && unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 800,
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    boxShadow: '0 2px 4px rgba(239,68,68,0.4)'
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={() => router.push('/signin')}
          style={{
            border: '1px solid #e7e9f0',
            background: '#fff',
            color: '#6b7280',
            padding: '7px 12px',
            borderRadius: '999px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.9px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </nav>

    <div className={`toast-popup ${toastVisible ? 'show' : ''}`} onClick={() => router.push('/choreographer/notifications')}>
      <button className="toast-close" onClick={(e) => { e.stopPropagation(); setToastVisible(false); }}>&times;</button>
      <div className="toast-title">{latestNotification?.title || 'New Notification'}</div>
      <div className="toast-message">{latestNotification?.message}</div>
    </div>
    </>
  );
}
