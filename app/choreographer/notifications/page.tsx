'use client';

import { useEffect, useMemo, useState } from 'react';
import ChoreographerNavbar from '@/components/ChoreographerNavbar';

interface DanceVideo {
  id: string;
  title: string;
  uploadedAt: string;
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

interface ProfilePayload {
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  videos?: DanceVideo[];
}

interface APINotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  reservationId?: any;
}

interface NotificationItem {
  id: string;
  type: 'approved' | 'rejected' | 'pending' | 'info' | 'session-requested' | 'session-accepted' | 'session-rejected' | 'review-received';
  title: string;
  message: string;
  date?: string;
  read?: boolean;
}

export default function ChoreographerNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<ProfilePayload>({});
  const [apiNotifications, setApiNotifications] = useState<APINotification[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Fetch profile
        const profileRes = await fetch('/api/choreographer/profile', {
          method: 'GET',
          credentials: 'include',
        });
        const profileData = await profileRes.json();
        if (!profileRes.ok || !profileData?.success) {
          throw new Error(profileData?.error || 'Failed to load profile');
        }
        setProfile({
          approvalStatus: profileData?.profile?.approvalStatus,
          videos: Array.isArray(profileData?.profile?.videos)
            ? profileData.profile.videos
            : [],
        });

        // Fetch notifications
        const notifRes = await fetch('/api/notifications', {
          method: 'GET',
          credentials: 'include',
        });
        const notifData = await notifRes.json();
        if (notifRes.ok && notifData?.success) {
          setApiNotifications(Array.isArray(notifData?.notifications) ? notifData.notifications : []);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const markAsRead = async () => {
      try {
        await fetch('/api/notifications', { method: 'PATCH', credentials: 'include' });
      } catch {}
    };
    markAsRead();
  }, []);

  const notifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    // Add API notifications
    apiNotifications.forEach((n: APINotification) => {
      list.push({
        id: n.id,
        type: (n.type as any) || 'info',
        title: n.title,
        message: n.message,
        date: n.createdAt,
        read: n.read,
      });
    });

    // Add profile-based notifications
    if (profile.approvalStatus) {
      if (profile.approvalStatus === 'pending') {
        list.push({
          id: 'account-pending',
          type: 'pending',
          title: 'Account Under Review',
          message: 'Your choreographer account is under review. You will be notified once it is approved.',
        });
      }
      if (profile.approvalStatus === 'rejected') {
        list.push({
          id: 'account-rejected',
          type: 'rejected',
          title: 'Account Rejected',
          message:
            'Your choreographer account was rejected. Update your profile and contact support for review.',
        });
      }
    }

    const rejectedVideos = (profile.videos || []).filter((v) => v.status === 'rejected');
    rejectedVideos.forEach((v) => {
      list.push({
        id: `video-${v.id}`,
        type: 'rejected',
        title: `Video Rejected: ${v.title}`,
        message: v.rejectionReason || 'No reason provided.',
        date: v.uploadedAt,
      });
    });

    return list.sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    });
  }, [profile, apiNotifications]);

  const badgeStyle = (type: NotificationItem['type']) => {
    const map = {
      approved: { bg: 'rgba(16,185,129,0.16)', color: '#34d399', border: 'rgba(16,185,129,0.35)' },
      rejected: { bg: 'rgba(239,68,68,0.16)', color: '#f87171', border: 'rgba(239,68,68,0.35)' },
      pending: { bg: 'rgba(245,158,11,0.16)', color: '#fbbf24', border: 'rgba(245,158,11,0.35)' },
      info: { bg: 'rgba(59,130,246,0.16)', color: '#93c5fd', border: 'rgba(59,130,246,0.35)' },
      'session-requested': { bg: 'rgba(168, 85, 247, 0.16)', color: '#d8b4fe', border: 'rgba(168, 85, 247, 0.35)' },
      'session-accepted': { bg: 'rgba(16,185,129,0.16)', color: '#34d399', border: 'rgba(16,185,129,0.35)' },
      'session-rejected': { bg: 'rgba(239,68,68,0.16)', color: '#f87171', border: 'rgba(239,68,68,0.35)' },
      'review-received': { bg: 'rgba(59,130,246,0.16)', color: '#93c5fd', border: 'rgba(59,130,246,0.35)' },
    } as const;
    return map[type] || map.info;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f6f7fb',
      color: '#0f172a',
      fontFamily: '"Manrope", sans-serif',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      <ChoreographerNavbar subtitle="Notifications" />

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '36px 40px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, fontFamily: '"Playfair Display", serif' }}>Notifications</h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '14px' }}>
            Approval updates and rejection messages will appear here.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '12px',
            color: '#fca5a5',
            fontSize: '14px',
            marginBottom: '20px',
          }}>
            {error}
          </div>
        )}

        <div style={{
          background: '#fff',
          border: '1px solid #e7e9f0',
          borderRadius: '18px',
          padding: '24px',
        }}>
          {loading ? (
            <div style={{ color: '#94a3b8', padding: '30px 0', textAlign: 'center' }}>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ color: '#94a3b8', padding: '30px 0', textAlign: 'center' }}>
              No notifications yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {notifications.map(n => {
                const badge = badgeStyle(n.type);
                return (
                  <div key={n.id} style={{
                    background: '#f8fafc',
                    border: '1px solid #e7e9f0',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    gap: '14px',
                    alignItems: 'flex-start',
                  }}>
                    <div style={{
                      padding: '6px 10px',
                      borderRadius: '999px',
                      background: badge.bg,
                      color: badge.color,
                      fontSize: '11px',
                      fontWeight: 700,
                      border: `1px solid ${badge.border}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      whiteSpace: 'nowrap',
                    }}>
                      {n.type}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>{n.title}</div>
                      <div style={{ color: '#6b7280', fontSize: '13px', lineHeight: '1.5' }}>
                        {n.message}
                      </div>
                      {n.date && (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: '#94a3b8' }}>
                          {new Date(n.date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

