'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChoreographerNavbar from '@/components/ChoreographerNavbar';

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
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeStatus, setStripeStatus] = useState('');
  const [completingId, setComplementingId] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Session | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

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
        const res = await fetch('/api/choreographer/sessions', {
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok && data?.sessions) {
          setSessions(data.sessions);
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
    } catch {
      setError('Failed to connect Stripe');
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      setCancelling(true);
      setCancelError('');
      
      const res = await fetch(`/api/sessions/${cancelTarget.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to cancel session');
      
      setShowCancelModal(false);
      setCancelTarget(null);
      
      // Refresh list
      const sRes = await fetch('/api/choreographer/sessions', { credentials: 'include' });
      const sData = await sRes.json();
      if (sRes.ok && sData?.sessions) {
        setSessions(sData.sessions);
      }
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
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
        setSessions(sessions.map((s) => (s.id === sessionId ? { ...s, status: 'completed' } : s)));
        alert(`Session completed. Payout scheduled for Friday.\n88% of ${data.payout.choreographerEarnings} NPR`);
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
    (s) =>
      (s.status === 'accepted' || s.status === 'confirmed') &&
      s.paymentStatus === 'paid' &&
      !confirmSessionPast(s.date, s.time)
  );

  const reserved = sessions.filter(
    (s) =>
      s.status === 'accepted' &&
      s.paymentStatus !== 'paid' &&
      !confirmSessionPast(s.date, s.time)
  );

  const completed = sessions.filter((s) => s.status === 'completed');
  const cancelled = sessions.filter((s) => s.status === 'cancelled');

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7fb', fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        .page { max-width: 1200px; margin: 0 auto; padding: 32px 36px; }
        .hero h1 { font-size: 32px; margin: 0 0 12px; }
        .hero p { color: #6b7280; font-size: 14px; }
        .section-title { font-size: 10px; letter-spacing: 3px; color: #9ca3af; text-transform: uppercase; font-weight: 700; margin: 26px 0 12px; }
        .alert { padding: 14px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 13px; }
        .alert.success { background: #ecfdf5; color: #047857; border: 1px solid #d1fae5; }
        .alert.warning { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }
        .alert.info { background: #eff6ff; color: #3b82f6; border: 1px solid #dbeafe; }
        .alert.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .btn { border: none; padding: 10px 14px; border-radius: 999px; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #111827; color: #fff; }
        .btn-primary:hover { background: #1f2937; }
        .btn-secondary { background: #f3f4f6; color: #111827; }
        .btn-secondary:hover { background: #e5e7eb; }
        .btn-success { background: #047857; color: #fff; }
        .btn-success:hover { background: #065f46; }
        .btn-success[disabled] { opacity: 0.6; cursor: not-allowed; }
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
        .status-reserved { background: #eff6ff; color: #3b82f6; }
        .status-completed { background: #d1d5db; color: #374151; }
        .status-cancelled { background: #fef2f2; color: #b91c1c; }
        .empty { color: #9ca3af; text-align: center; padding: 20px; }
      `}</style>

      <ChoreographerNavbar subtitle="Choreographer" />

      <div className="page">
        <div className="hero">
          <h1>Your Sessions</h1>
          <p>Complete sessions and manage your earnings</p>
        </div>

        {!stripeConnected && (
          <div className="alert warning">
            Connect your Stripe account to receive payouts every Friday
            <button className="btn btn-primary" style={{ marginLeft: '12px', padding: '6px 10px' }} onClick={connectStripe}>
              Connect Stripe
            </button>
          </div>
        )}

        {stripeConnected && stripeStatus !== 'verified' && (
          <div className="alert warning">Your Stripe account is pending verification. Complete bank verification to enable payouts.</div>
        )}

        {stripeConnected && stripeStatus === 'verified' && (
          <div className="alert success">Your Stripe account is connected and verified. Ready to receive payouts.</div>
        )}

        {error && <div className="alert error">{error}</div>}

        <div className="section-title">Upcoming (Booked & Ready)</div>
        {upcoming.length === 0 ? (
          <div className="empty">No upcoming booked sessions</div>
        ) : (
          upcoming.map((s) => (
            <div key={s.id} className="card">
              <div className="card-left">
                <div className="avatar">{s.client.profileImage && <img src={s.client.profileImage} alt={s.client.name} />}</div>
                <div className="card-info">
                  <div className="label">Confirmed Session</div>
                  <div className="name">{s.client.name}</div>
                  <div className="meta">{s.date} at {s.time}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="price">NPR {s.total.toLocaleString()}</div>
                <div className="status-badge status-paid" style={{ marginBottom: '8px' }}>Booked</div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <button className="btn btn-secondary" onClick={() => router.push(`/client/${s.client.id}`)}>
                    View Client
                  </button>
                  <button className="btn btn-secondary" onClick={() => router.push(`/choreographer/inbox?userId=${s.client.id}`)}>
                    Chat
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ borderColor: '#ef4444', color: '#ef4444' }} 
                    onClick={() => {
                      setCancelTarget(s);
                      setShowCancelModal(true);
                    }}
                  >
                    Cancel
                  </button>
                </div>
                <button
                  className="btn btn-success"
                  onClick={() => completeSession(s.id)}
                  disabled={completingId === s.id || !stripeConnected}
                  title={!stripeConnected ? 'Connect Stripe first' : 'Mark session complete'}
                >
                  {completingId === s.id ? 'Completing...' : 'Mark Complete'}
                </button>
              </div>
            </div>
          ))
        )}

        <div className="section-title">Reserved (Awaiting Client Payment)</div>
        {reserved.length === 0 ? (
          <div className="empty">No reservations awaiting payment</div>
        ) : (
          reserved.map((s) => (
            <div key={s.id} className="card">
              <div className="card-left">
                <div className="avatar">{s.client.profileImage && <img src={s.client.profileImage} alt={s.client.name} />}</div>
                <div className="card-info">
                  <div className="label">Reserved Slot</div>
                  <div className="name">{s.client.name}</div>
                  <div className="meta">{s.date} at {s.time}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="price">NPR {s.total.toLocaleString()}</div>
                <div className="status-badge status-reserved" style={{ marginBottom: '8px' }}>Reserved</div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <button className="btn btn-secondary" onClick={() => router.push(`/client/${s.client.id}`)}>
                    View Client
                  </button>
                  <button className="btn btn-secondary" onClick={() => router.push(`/choreographer/inbox?userId=${s.client.id}`)}>
                    Chat
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    style={{ borderColor: '#ef4444', color: '#ef4444' }} 
                    onClick={() => {
                      setCancelTarget(s);
                      setShowCancelModal(true);
                    }}
                  >
                    Cancel
                  </button>
                </div>
                <button
                  className="btn btn-success"
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                  disabled
                  title="Session must be paid before completion"
                >
                  Waiting for Payment
                </button>
              </div>
            </div>
          ))
        )}

        <div className="section-title">Completed Sessions</div>
        {completed.length === 0 ? (
          <div className="empty">No completed sessions yet</div>
        ) : (
          completed.map((s) => (
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
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button className="btn btn-secondary" onClick={() => router.push(`/client/${s.client.id}`)}>
                    View Client
                  </button>
                  <button className="btn btn-secondary" onClick={() => router.push(`/choreographer/inbox?userId=${s.client.id}`)}>
                    Chat
                  </button>
                </div>
                {s.choreographerEarnings && (
                  <div style={{ fontSize: '11px', color: '#047857', fontWeight: 700, marginTop: '6px' }}>
                    Earning: {s.choreographerEarnings.toLocaleString()} NPR
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        <div className="section-title">Cancelled Sessions</div>
        {cancelled.length === 0 ? (
          <div className="empty">No cancelled sessions</div>
        ) : (
          cancelled.map((s) => (
            <div key={s.id} className="card" style={{ opacity: 0.6 }}>
              <div className="card-left">
                <div className="avatar">{s.client.profileImage && <img src={s.client.profileImage} alt={s.client.name} />}</div>
                <div className="card-info">
                  <div className="label" style={{ color: '#ef4444' }}>Cancelled Session</div>
                  <div className="name">{s.client.name}</div>
                  <div className="meta">{s.date} at {s.time}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="price">NPR {s.total.toLocaleString()}</div>
                <div className="status-badge status-cancelled">Cancelled</div>
                {s.paymentStatus === 'partially-refunded' && s.choreographerEarnings ? (
                  <div style={{ fontSize: '11px', color: '#b45309', fontWeight: 700, marginTop: '6px' }}>
                    Penalty Earned: {s.choreographerEarnings.toLocaleString()} NPR
                  </div>
                ) : (
                  <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: 700, marginTop: '6px' }}>
                    Refunded
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {showCancelModal && cancelTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justify: 'center', zIndex: 100 }} onClick={(e) => e.target === e.currentTarget && setShowCancelModal(false)}>
          <div style={{ width: 'min(520px, 92vw)', background: '#fff', borderRadius: '18px', padding: '24px', border: '1px solid #e7e9f0', boxShadow: '0 20px 40px rgba(15,23,42,0.2)' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>Cancel Session</div>
            <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '16px' }}>
              Are you sure you want to cancel the session with <strong>{cancelTarget.client.name}</strong> on {cancelTarget.date}?
            </div>
            
            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px', color: '#b91c1c' }}>
              <strong>Important:</strong> Cancelling as a choreographer will trigger a 100% refund for the client.
            </div>

            {cancelError && <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>{cancelError}</div>}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" style={{ flex: 1, background: '#ef4444' }} onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowCancelModal(false)}>Keep Session</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
