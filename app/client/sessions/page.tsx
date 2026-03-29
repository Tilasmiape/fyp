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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<ReservationItem | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSaving, setFeedbackSaving] = useState(false);

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

  const isSessionPast = (date: string, time: string) => {
    if (!date || !time) return false;
    const [year, month, day] = date.split('-').map(Number);
    if ([year, month, day].some(n => Number.isNaN(n))) return false;
    const [clock, meridiemRaw] = time.trim().split(' ');
    if (!clock || !meridiemRaw) return false;
    const meridiem = meridiemRaw.toUpperCase();
    const [hh, mm] = clock.split(':').map(Number);
    if ([hh, mm].some(n => Number.isNaN(n))) return false;
    let hours = hh % 12;
    if (meridiem === 'PM') hours += 12;
    const sessionTime = new Date(year, month - 1, day, hours, mm, 0, 0);
    return sessionTime.getTime() < Date.now();
  };

  const requested = reservations.filter(r => r.status === 'pending');
  const upcoming = reservations.filter(r => r.status === 'accepted' && !isSessionPast(r.date, r.time));
  const history = reservations.filter(
    r => (r.status === 'accepted' && isSessionPast(r.date, r.time)) || (r as any).status === 'completed'
  );
  const past = reservations.filter(r => r.status === 'rejected' || r.status === 'cancelled');

  const openFeedback = (reservation: ReservationItem) => {
    setFeedbackTarget(reservation);
    setFeedbackComment('');
    setFeedbackRating(5);
    setFeedbackError('');
    setShowFeedbackModal(true);
  };

  const submitFeedback = async () => {
    if (!feedbackTarget) return;
    if (!feedbackTarget.choreographer?.id) {
      setFeedbackError('Choreographer id is missing for this session.');
      return;
    }
    if (!feedbackComment.trim()) {
      setFeedbackError('Please add your feedback before sending.');
      return;
    }
    try {
      setFeedbackSaving(true);
      setFeedbackError('');
      const res = await fetch('/api/client/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reciver_id: feedbackTarget.choreographer.id,
          booking_id: feedbackTarget.id,
          comment: feedbackComment.trim(),
          rating: feedbackRating,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to send feedback');
      }
      setShowFeedbackModal(false);
      setFeedbackTarget(null);
      setFeedbackComment('');
    } catch (err: any) {
      setFeedbackError(err.message || 'Failed to send feedback');
    } finally {
      setFeedbackSaving(false);
    }
  };

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
        .btn-feedback {
          border: none;
          background: rgba(15,23,42,0.08);
          color: #0f172a;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          padding: 8px 12px;
          border-radius: 999px;
          cursor: pointer;
          margin-top: 8px;
        }
        .btn-feedback:hover { background: rgba(15,23,42,0.14); }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .modal-box {
          width: min(520px, 92vw);
          background: #fff;
          border-radius: 18px;
          padding: 20px;
          border: 1px solid #e7e9f0;
          box-shadow: 0 20px 40px rgba(15,23,42,0.2);
        }
        .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .modal-label { font-size: 11px; letter-spacing: 1.6px; text-transform: uppercase; color: #9ca3af; font-weight: 700; }
        .modal-textarea {
          width: 100%;
          border: 1px solid #e7e9f0;
          border-radius: 12px;
          padding: 10px 12px;
          min-height: 100px;
          font-family: inherit;
          font-size: 13px;
          margin-top: 8px;
        }
        .rating-row { display: flex; gap: 8px; margin-top: 10px; }
        .rating-btn {
          border: 1px solid #e7e9f0;
          background: #fff;
          color: #111827;
          font-weight: 700;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          cursor: pointer;
        }
        .rating-btn.active {
          background: #111827;
          color: #fff;
          border-color: #111827;
        }
        .modal-actions { display: flex; gap: 10px; margin-top: 16px; }
        .modal-btn {
          flex: 1;
          border: none;
          border-radius: 999px;
          padding: 10px 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
        }
        .modal-btn.primary { background: #111827; color: #fff; }
        .modal-btn.ghost { background: #f1f2f7; color: #111827; }
        .modal-error { color: #ef4444; font-size: 12px; margin-top: 8px; }
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
                {/* Reviews only after completion, shown in history section */}
              </div>
            </div>
          ))
        )}

        <div className="section-title">History (Completed Sessions)</div>
        {history.length === 0 ? (
          <div className="empty">No completed sessions yet.</div>
        ) : (
          history.map(r => (
            <div key={r.id} className="card" style={{ marginBottom: '14px', borderLeft: '4px solid #64748b' }}>
              <div className="card-left">
                <div className="avatar">{r.choreographer.profileImage && <img src={r.choreographer.profileImage} alt={r.choreographer.name} />}</div>
                <div>
                  <div className="label">Completed Session</div>
                  <div className="name">{r.choreographer.name}</div>
                  <div className="meta">{r.date} | {r.time}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="status" style={{ background: '#f1f2f7', color: '#6b7280' }}>Completed</div>
                <div className="price" style={{ marginTop: '6px' }}>NPR {r.total.toLocaleString()}</div>
                <button className="btn-feedback" onClick={() => openFeedback(r)}>Send Review</button>
              </div>
            </div>
          ))
        )}

        <div className="section-title">Rejected / Cancelled Sessions</div>
        {past.length === 0 ? (
          <div className="empty">No rejected or cancelled sessions.</div>
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

      {showFeedbackModal && feedbackTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowFeedbackModal(false)}>
          <div className="modal-box">
            <div className="modal-title">Send Review</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>
              {feedbackTarget.choreographer.name} · {feedbackTarget.date} · {feedbackTarget.time}
            </div>
            {feedbackError && <div className="modal-error">{feedbackError}</div>}
            <label className="modal-label">Comment *</label>
            <textarea
              className="modal-textarea"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Share your review for the choreographer..."
            />
            <div className="modal-label" style={{ marginTop: '12px' }}>Rating</div>
            <div className="rating-row">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  className={`rating-btn ${feedbackRating === value ? 'active' : ''}`}
                  onClick={() => setFeedbackRating(value)}
                  type="button"
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button className="modal-btn primary" onClick={submitFeedback} disabled={feedbackSaving}>
                {feedbackSaving ? 'Sending...' : 'Send Review'}
              </button>
              <button
                className="modal-btn ghost"
                onClick={() => {
                  setShowFeedbackModal(false);
                  setFeedbackTarget(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
