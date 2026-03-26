'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ReservationItem {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  sessionCategory: 'individual' | 'group';
  participantCount: number;
  notes?: string;
  total: number;
  choreographer: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export default function ClientSessionsPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState<'client' | 'choreographer' | 'super-admin' | ''>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reservations, setReservations] = useState<ReservationItem[]>([]);

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
          setError('Please sign in to view sessions.');
          setLoading(false);
        }
      } catch {}
    };
    loadUser();
  }, [router]);

  useEffect(() => {
    const load = async () => {
      try {
        if (userRole !== 'client') return;
        setLoading(true);
        setError('');
        const res = await fetch('/api/reservations');
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load sessions');
        setReservations(Array.isArray(data?.reservations) ? data.reservations : []);
      } catch (err: any) {
        setError(err.message || 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userRole]);

  const requested = reservations.filter(r => r.status === 'pending');
  const upcoming = reservations.filter(r => r.status === 'accepted');
  const past = reservations.filter(r => r.status === 'rejected' || r.status === 'cancelled');

  return (
    <div className="sessions-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .sessions-root { min-height: 100vh; background: #f6f7fb; font-family: 'Manrope', sans-serif; color: #0f172a; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 40px; background: #fff; border-bottom: 1px solid #e7e9f0; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-badge { width: 48px; height: 48px; border-radius: 999px; background: #fff; overflow: hidden; box-shadow: 0 8px 18px rgba(0,0,0,0.18); display: grid; place-items: center; }
        .brand-badge img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.2); }
        .brand-name { font-weight: 700; letter-spacing: 0.4px; }
        .brand-sub { font-size: 10px; color: #f4b63a; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
        .nav-links { display: flex; gap: 18px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
        .user-pill { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border: 1px solid #e7e9f0; border-radius: 999px; background: #fff; font-size: 12px; font-weight: 600; }
        .user-role { color: #f4b63a; text-transform: uppercase; font-size: 9px; letter-spacing: 1.2px; margin-left: 6px; }
        .page { max-width: 1100px; margin: 0 auto; padding: 32px 36px 60px; }
        .portal-label { font-size: 10px; letter-spacing: 3px; color: #f4b63a; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
        .hero h1 { font-family: 'Playfair Display', serif; font-size: 32px; margin: 0 0 12px; }
        .section-title { font-size: 10px; letter-spacing: 3px; color: #9ca3af; text-transform: uppercase; font-weight: 700; margin: 26px 0 12px; }
        .card { background: #fff; border: 1px solid #e7e9f0; border-radius: 20px; padding: 16px 18px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 10px 24px rgba(17,24,39,0.06); }
        .card-left { display: flex; align-items: center; gap: 14px; }
        .avatar { width: 52px; height: 52px; border-radius: 14px; overflow: hidden; background: #0f172a; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #f4b63a; font-weight: 700; }
        .name { font-weight: 700; font-size: 16px; }
        .meta { font-size: 12px; color: #6b7280; margin-top: 4px; }
        .status { padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; background: #eef2ff; color: #4f46e5; text-transform: uppercase; }
        .price { font-weight: 800; }
        .empty { color: #9ca3af; font-size: 13px; }
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
          <span onClick={() => router.push('/client/sessions')} style={{ cursor: 'pointer' }}>Dashboard</span>
        </div>
        <div className="user-pill">
          <span>Hi, {userName}</span>
          <span className="user-role">Client</span>
        </div>
      </nav>

      <div className="page">
        <div className="portal-label">Member Portal</div>
        <div className="hero">
          <h1>Namaste, {userName}</h1>
          <div className="section-title">Your Itinerary</div>
          <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px' }}>The Movement Log</div>
        </div>

        <div className="section-title">Pending Requests</div>
        {loading ? (
          <div className="empty">Loading sessions...</div>
        ) : error ? (
          <div className="empty">{error}</div>
        ) : requested.length === 0 ? (
          <div className="empty">No pending requests.</div>
        ) : (
          requested.map(r => (
            <div key={r.id} className="card" style={{ marginBottom: '14px', borderLeft: '4px solid #f4b63a' }}>
              <div className="card-left">
                <div className="avatar">{r.choreographer.profileImage && <img src={r.choreographer.profileImage} alt={r.choreographer.name} />}</div>
                <div>
                  <div className="label">{r.sessionCategory === 'group' ? `Group (${r.participantCount} people)` : 'Individual'} Session</div>
                  <div className="name">{r.choreographer.name}</div>
                  <div className="meta">{r.date} | {r.time}</div>
                  {r.notes && <div className="meta" style={{ fontStyle: 'italic' }}>"{r.notes}"</div>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="status" style={{ background: '#fff7ed', color: '#c2410c' }}>Requested</div>
                <div className="price" style={{ marginTop: '6px' }}>NPR {r.total.toLocaleString()}</div>
              </div>
            </div>
          ))
        )}

        <div className="section-title">Upcoming Sessions</div>
        {loading ? null : upcoming.length === 0 ? (
          <div className="empty">No upcoming sessions yet.</div>
        ) : (
          upcoming.map(r => (
            <div key={r.id} className="card" style={{ marginBottom: '14px', borderLeft: '4px solid #10b981' }}>
              <div className="card-left">
                <div className="avatar">{r.choreographer.profileImage && <img src={r.choreographer.profileImage} alt={r.choreographer.name} />}</div>
                <div>
                  <div className="label">{r.sessionCategory === 'group' ? `Group (${r.participantCount} people)` : 'Individual'} Session</div>
                  <div className="name">{r.choreographer.name}</div>
                  <div className="meta">{r.date} | {r.time}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="status" style={{ background: '#ecfdf5', color: '#047857' }}>Confirmed</div>
                <div className="price" style={{ marginTop: '6px' }}>NPR {r.total.toLocaleString()}</div>
              </div>
            </div>
          ))
        )}

        <div className="section-title">Past / Rejected Sessions</div>
        {past.length === 0 ? (
          <div className="empty">No past sessions yet.</div>
        ) : (
          past.map(r => (
            <div key={r.id} className="card" style={{ marginBottom: '14px', opacity: 0.7 }}>
              <div className="card-left">
                <div className="avatar">{r.choreographer.profileImage && <img src={r.choreographer.profileImage} alt={r.choreographer.name} />}</div>
                <div>
                  <div className="label">Session</div>
                  <div className="name">{r.choreographer.name}</div>
                  <div className="meta">{r.date} | {r.time}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="status" style={{ background: '#f1f2f7', color: '#6b7280' }}>{r.status === 'rejected' ? 'Rejected' : 'Cancelled'}</div>
                <div className="price" style={{ marginTop: '6px' }}>NPR {r.total.toLocaleString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
