'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Session {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'completed' | 'rejected' | 'cancelled';
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  client: {
    id: string;
    name: string;
    profileImage?: string;
  };
  total: number;
  choreographerEarnings?: number;
  payoutStatus?: string;
}

export default function ChoreographerSessionsPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('Choreographer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeStatus, setStripeStatus] = useState('');
  const [completingId, setComplementingId] = useState<string | null>(null);
  const [pendingPayouts, setPendingPayouts] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data?.success) {
          setUserName(data.user.fullName);
          if (data.user.role !== 'choreographer') {
            router.push('/client/home');
          }
        } else {
          router.push('/signin');
        }
      } catch {
        router.push('/signin');
      }
    };
    loadUser();
  }, [router]);

  useEffect(() => {
    const checkStripeStatus = async () => {
      try {
        const res = await fetch('/api/choreographer/stripe-connect');
        const data = await res.json();
        if (res.ok && data?.connected) {
          setStripeConnected(true);
          setStripeStatus(data.status || 'pending');
        }
      } catch {}
    };
    checkStripeStatus();
  }, []);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/choreographer/sessions', {
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok && data?.sessions) {
          setSessions(data.sessions);
          const pending = data.sessions.filter(
            (s: Session) => s.paymentStatus === 'paid' && s.status !== 'completed'
          ).length;
          setPendingPayouts(pending);
        }
      } catch {}
    };
    loadSessions();
  }, []);

  const connectStripe = async () => {
    try {
      const res = await fetch('/api/choreographer/stripe-connect', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data?.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      }
    } catch (err) {
      setError('Failed to connect Stripe');
    }
  };

  const completeSession = async (sessionId: string) => {
    try {
      setComplementingId(sessionId);
      const res = await fetch('/api/choreographer/sessions/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reservationId: sessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSessions(sessions.map(s => s.id === sessionId ? { ...s, status: 'completed' } : s));
        alert(`Session completed! Payout scheduled for Friday.\n88% of ${data.payout.choreographerEarnings} NPR`);
      } else {
        setError(data?.error || 'Failed to complete session');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete session');
    } finally {
      setComplementingId(null);
    }
  };

  const confirmSessionPast = (date: string, time: string) => {
    const [year, month, day] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    let hours = hh % 12;
    if (time.includes('PM')) hours += 12;
    const sessionTime = new Date(year, month - 1, day, hours, mm);
    return sessionTime < new Date();
  };

  const upcoming = sessions.filter(
    s =>
      (s.status === 'accepted' || s.status === 'confirmed') &&
      s.paymentStatus === 'paid' &&
      !confirmSessionPast(s.date, s.time)
  );

  const completed = sessions.filter(s => s.status === 'completed');

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7fb', fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 40px; background: #fff; border-bottom: 1px solid #e7e9f0; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-name { font-weight: 700; font-size: 18px; }
        .nav-links { display: flex; gap: 18px; font-size: 12px; text-transform: uppercase; font-weight: 600; }
        .nav-links span { cursor: pointer; }
        .user-pill { display: flex; align-items: center; gap: 10px; padding: 6px 14px; border: 1px solid #e7e9f0; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .page { max-width: 1200px; margin: 0 auto; padding: 32px 36px; }
        .hero h1 { font-size: 32px; margin: 0 0 12px; }
        .hero p { color: #6b7280; font-size: 14px; }
        .section-title { font-size: 10px; letter-spacing: 3px; color: #9ca3af; text-transform: uppercase; font-weight: 700; margin: 26px 0 12px; }
        .alert { padding: 14px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 13px; }
        .alert.success { background: #ecfdf5; color: #047857; border: 1px solid #d1fae5; }
        .alert.warning { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }
        .alert.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .btn { border: none; padding: 10px 14px; border-radius: 999px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #111827; color: #fff; }
        .btn-primary:hover { background: #1f2937; }
        .btn-secondary { background: #f3f4f6; color: #111827; }
        .btn-secondary:hover { background: #e5e7eb; }
        .btn-success { background: #047857; color: #fff; }
        .btn-success:hover { background: #065f46; }
        .btn-success[disabled] { opacity: 0.6; cursor: not-allowed; }
        .btn-warning { background: #b45309; color: #fff; }
        .btn-warning:hover { background: #92400e; }
        .card { background: #fff; border: 1px solid #e7e9f0; border-radius: 16px; padding: 18px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .card-left { display: flex; align-items: center; gap: 14px; flex: 1; }
        .avatar { width: 48px; height: 48px; border-radius: 12px; background: #0f172a; overflow: hidden; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .card-info { flex: 1; }
        .label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #f4b63a; font-weight: 700; }
        .name { font-weight: 700; font-size: 16px; margin: 4px 0; }
        .meta { font-size: 12px; color: #6b7280; }
        .price { font-weight: 800; font-size: 16px; margin-right: 16px; }
        .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .status-paid { background: #d1fae5; color: #047857; }
        .status-pending { background: #fef3c7; color: #b45309; }
        .status-completed { background: #d1d5db; color: #374151; }
        .empty { color: #9ca3af; text-align: center; padding: 20px; }
      `}</style>

      <nav className="topbar">
        <div className="brand">
          <div className="brand-name">Step Out</div>
        </div>
        <div className="nav-links">
          <span onClick={() => router.push('/choreographer/home')}>Home</span>
          <span onClick={() => router.push('/choreographer/availability')}>Availability</span>
        </div>
        <div className="user-pill">Hi, {userName}</div>
      </nav>

      <div className="page">
        <div className="hero">
          <h1>Your Sessions</h1>
          <p>Complete sessions and manage your earnings</p>
        </div>

        {!stripeConnected && (
          <div className="alert warning">
            💳 Connect your Stripe account to receive payouts every Friday
            <button className="btn btn-primary" style={{ marginLeft: '12px', padding: '6px 10px' }} onClick={connectStripe}>
              Connect Stripe
            </button>
          </div>
        )}

        {stripeConnected && stripeStatus !== 'verified' && (
          <div className="alert warning">
            ⏳ Your Stripe account is pending verification. Complete bank verification to enable payouts.
          </div>
        )}

        {stripeConnected && stripeStatus === 'verified' && (
          <div className="alert success">
            ✅ Your Stripe account is connected and verified. Ready to receive payouts!
          </div>
        )}

        {error && <div className="alert error">✗ {error}</div>}

        <div className="section-title">Upcoming Sessions (Ready to Complete)</div>
        {upcoming.length === 0 ? (
          <div className="empty">No upcoming paid sessions</div>
        ) : (
          upcoming.map(s => (
            <div key={s.id} className="card">
              <div className="card-left">
                <div className="avatar">{s.client.profileImage && <img src={s.client.profileImage} alt={s.client.name} />}</div>
                <div className="card-info">
                  <div className="label">Individual Session</div>
                  <div className="name">{s.client.name}</div>
                  <div className="meta">{s.date} at {s.time}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="price">NPR {s.total.toLocaleString()}</div>
                <div className="status-badge status-paid" style={{ marginBottom: '8px' }}>✓ Paid</div>
                <button
                  className="btn btn-success"
                  onClick={() => completeSession(s.id)}
                  disabled={completingId === s.id || !stripeConnected}
                  title={!stripeConnected ? 'Connect Stripe first' : 'Mark session complete'}
                >
                  {completingId === s.id ? '⏳ Completing...' : '✓ Mark Complete'}
                </button>
              </div>
            </div>
          ))
        )}

        <div className="section-title">Completed Sessions</div>
        {completed.length === 0 ? (
          <div className="empty">No completed sessions yet</div>
        ) : (
          completed.map(s => (
            <div key={s.id} className="card" style={{ opacity: 0.7 }}>
              <div className="card-left">
                <div className="avatar">{s.client.profileImage && <img src={s.client.profileImage} alt={s.client.name} />}</div>
                <div className="card-info">
                  <div className="label">Completed Session</div>
                  <div className="name">{s.client.name}</div>
                  <div className="meta">{s.date} at {s.time}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="price">NPR {s.total.toLocaleString()}</div>
                <div className="status-badge status-completed">Completed</div>
                {s.choreographerEarnings && (
                  <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, marginTop: '6px' }}>
                    Earning: {(s.choreographerEarnings).toLocaleString()} NPR
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
