'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PaymentModal from '@/components/PaymentModal';
import MockPaymentModal from '@/components/MockPaymentModal';

interface ReservationItem {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'completed' | 'rejected' | 'cancelled';
  sessionCategory: 'individual' | 'group';
  participantCount: number;
  notes?: string;
  total: number;
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  mustPayBy?: string;
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
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [paymentErrorId, setPaymentErrorId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentClientSecret, setPaymentClientSecret] = useState('');
  const [mockPaymentTarget, setMockPaymentTarget] = useState<ReservationItem | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/auth/me', { headers });
        const data = await res.json();
        if (res.ok && data?.success) {
          setUserName(data.user.fullName);
          setUserRole(data.user.role || 'client');
          if (data.user.role && data.user.role !== 'client') {
            router.push('/choreographer/home');
          }
        } else {
          const searchParams = new URLSearchParams(window.location.search);
          if (searchParams.get('payment_complete') === 'true' || searchParams.get('payment') === 'success') {
            console.log('Returning from Stripe, waiting for confirmation...');
            return;
          }
          
          setUserRole('');
          setError('Please sign in to view sessions.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading user:', err);
      }
    };
    loadUser();
  }, [router]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isSuccess = searchParams.get('payment') === 'success' || searchParams.get('payment_complete') === 'true';
    
    if (isSuccess) {
      const sessionId = searchParams.get('session_id');
      
      const confirmPayment = async () => {
        try {
          if (sessionId) {
            const token = localStorage.getItem('authToken');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/stripe/confirm-payment', {
              method: 'POST',
              headers,
              credentials: 'include',
              body: JSON.stringify({ sessionId }),
            });

            // ✅ Guard against empty or non-JSON responses
            const text = await res.text();
            const data = text ? JSON.parse(text) : {};

            if (res.ok && data?.success) {
              setPaymentSuccess(true);
              // Small delay before refreshing data to ensure DB consistency
              setTimeout(async () => {
                try {
                  const userRes = await fetch('/api/auth/me', { headers });
                  const userData = await userRes.json();
                  if (userRes.ok && userData?.success) {
                    setUserName(userData.user.fullName);
                    setUserRole(userData.user.role || 'client');
                  }
                } catch (e) {
                  console.warn('Silent session refresh failed:', e);
                }
                
                // Reload sessions to get the updated status
                const sHeaders = { ...headers };
                const sRes = await fetch('/api/sessions', { headers: sHeaders });
                const sData = await sRes.json();
                if (sRes.ok && sData?.sessions) {
                  setReservations(sData.sessions);
                }
              }, 800);
            } else {
              console.error('Confirm payment failed:', data?.error);
              setError(data?.error || 'Payment confirmation failed.');
            }
          }
          setTimeout(() => setPaymentSuccess(false), 5000);
        } catch (err) {
          console.error('Error confirming payment:', err);
        } finally {
          // Remove search params only after a short delay so loadUser doesn't see us as logged out
          setTimeout(() => {
            window.history.replaceState({}, '', '/client/sessions');
          }, 1500);
        }
      };
      
      confirmPayment();
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        if (!userRole || userRole !== 'client') return;
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/sessions', { headers });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load sessions');
        setReservations(Array.isArray(data?.sessions) ? data.sessions : []);
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
  
  const booked = reservations.filter(
    r => (r.status === 'confirmed' || r.paymentStatus === 'paid') && !isSessionPast(r.date, r.time)
  );

  const reserved = reservations.filter(
    r => r.status === 'accepted' && r.paymentStatus !== 'paid' && !isSessionPast(r.date, r.time)
  );

  const history = reservations.filter(
    r => ((r.status === 'accepted' || r.status === 'confirmed') && isSessionPast(r.date, r.time)) || r.status === 'completed'
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
          sessionId: feedbackTarget.id,
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

  const startPayment = async (reservationId: string) => {
    try {
      setPaymentLoadingId(reservationId);
      setPaymentError('');
      setPaymentErrorId(null);

      const reservation = reservations.find(r => r.id === reservationId);
      if (!reservation) throw new Error('Reservation not found');
      if (reservation.status !== 'accepted' && reservation.status !== 'confirmed') {
        throw new Error('Session must be accepted before payment');
      }
      if (reservation.paymentStatus === 'paid') throw new Error('This session is already paid');

      // Open MockPaymentModal — it will handle the API call after the user fills the card form
      setMockPaymentTarget(reservation);
    } catch (err: any) {
      const errorMsg = err.message || 'Payment initialization failed';
      setPaymentError(errorMsg);
      setPaymentErrorId(reservationId);
      console.error('Payment error:', err);
    } finally {
      setPaymentLoadingId(null);
    }
  };

  const handleMockPaymentSuccess = async () => {
    setMockPaymentTarget(null);
    setPaymentSuccess(true);
    // Refresh sessions
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const sRes = await fetch('/api/sessions', { headers });
      const sData = await sRes.json();
      if (sRes.ok && sData?.sessions) {
        setReservations(sData.sessions);
      }
    } catch {}
    setTimeout(() => setPaymentSuccess(false), 5000);
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
          background: rgba(15,23,42,0.08); color: #0f172a; font-weight: 700; font-size: 11px;
          letter-spacing: 0.8px; text-transform: uppercase; padding: 8px 12px; border-radius: 999px; cursor: pointer; margin-top: 8px;
        }
        .btn-chat {
          border: 1px solid #dbe3f3;
          background: #fff;
          color: #1f2937;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          padding: 8px 12px;
          border-radius: 999px;
          cursor: pointer;
          margin-top: 8px;
          margin-left: 8px;
        }
        .btn-pay {
          border: none; background: #111827; color: #fff; font-weight: 800; font-size: 11px;
          letter-spacing: 0.8px; text-transform: uppercase; padding: 8px 14px; border-radius: 999px; cursor: pointer; margin-top: 10px; transition: all 0.3s ease;
        }
        .btn-pay:hover { background: #1f2937; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(17,24,39,0.15); }
        .btn-pay[disabled] { opacity: 0.6; cursor: not-allowed; transform: none; }
        .success-toast {
          position: fixed; top: 20px; right: 20px; background: #047857; color: #fff; padding: 14px 20px;
          border-radius: 12px; box-shadow: 0 10px 25px rgba(4,120,87,0.2); font-size: 13px; font-weight: 600;
          animation: slideIn 0.3s ease-out; z-index: 200;
        }
        @keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .payment-pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .payment-pill.paid { background: rgba(16,185,129,0.15); color: #047857; }
        .payment-pill.pending { background: rgba(245,158,11,0.12); color: #b45309; }
        .payment-pill.failed { background: rgba(239,68,68,0.12); color: #b91c1c; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
        .modal-box { width: min(520px, 92vw); background: #fff; border-radius: 18px; padding: 20px; border: 1px solid #e7e9f0; box-shadow: 0 20px 40px rgba(15,23,42,0.2); }
        .modal-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .modal-label { font-size: 11px; letter-spacing: 1.6px; text-transform: uppercase; color: #9ca3af; font-weight: 700; }
        .modal-textarea { width: 100%; border: 1px solid #e7e9f0; border-radius: 12px; padding: 10px 12px; min-height: 100px; font-family: inherit; font-size: 13px; margin-top: 8px; }
        .rating-row { display: flex; gap: 8px; margin-top: 10px; }
        .rating-btn { border: 1px solid #e7e9f0; background: #fff; color: #111827; font-weight: 700; font-size: 12px; padding: 6px 10px; border-radius: 999px; cursor: pointer; }
        .rating-btn.active { background: #111827; color: #fff; border-color: #111827; }
        .modal-actions { display: flex; gap: 10px; margin-top: 16px; }
        .modal-btn { flex: 1; border: none; border-radius: 999px; padding: 10px 12px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; }
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
          <span onClick={() => router.push('/client/inbox')} style={{ cursor: 'pointer' }}>Inbox</span>
        </div>
        <div className="user-pill">
          <span>Hi, {userName}</span>
          <span className="user-role">Client</span>
        </div>
      </nav>

      {paymentSuccess && (
        <div className="success-toast">
          Payment successful! Your session is now confirmed.
        </div>
      )}

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
                <button className="btn-chat" onClick={() => router.push(`/client/inbox?userId=${r.choreographer.id}`)}>Chat</button>
              </div>
            </div>
          ))
        )}

        <div className="section-title">Confirmed Bookings</div>
        {loading ? null : booked.length === 0 ? (
          <div className="empty">No confirmed bookings yet.</div>
        ) : (
          booked.map(r => (
            <div key={r.id} className="card" style={{ marginBottom: '14px', borderLeft: '4px solid #10b981' }}>
              <div className="card-left">
                <div className="avatar">{r.choreographer.profileImage && <img src={r.choreographer.profileImage} alt={r.choreographer.name} />}</div>
                <div>
                  <div className="label">Confirmed Session</div>
                  <div className="name">{r.choreographer.name}</div>
                  <div className="meta">{r.date} | {r.time}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="status" style={{ background: '#ecfdf5', color: '#047857' }}>Booked</div>
                <div className="price" style={{ marginTop: '6px' }}>NPR {r.total.toLocaleString()}</div>
                <button className="btn-chat" onClick={() => router.push(`/client/inbox?userId=${r.choreographer.id}`)}>Chat</button>
                <div className="payment-pill paid" style={{ marginTop: '8px' }}>Paid</div>
              </div>
            </div>
          ))
        )}

        <div className="section-title">Reserved (Awaiting Payment)</div>
        {loading ? null : reserved.length === 0 ? (
          <div className="empty">No sessions awaiting payment.</div>
        ) : (
          reserved.map(r => (
            <div key={r.id} className="card" style={{ marginBottom: '14px', borderLeft: '4px solid #3b82f6' }}>
              <div className="card-left">
                <div className="avatar">{r.choreographer.profileImage && <img src={r.choreographer.profileImage} alt={r.choreographer.name} />}</div>
                <div>
                  <div className="label">Reserved Slot</div>
                  <div className="name">{r.choreographer.name}</div>
                  <div className="meta">{r.date} | {r.time}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="status" style={{ background: '#eff6ff', color: '#3b82f6' }}>Reserved</div>
                <div className="price" style={{ marginTop: '6px' }}>NPR {r.total.toLocaleString()}</div>
                <button className="btn-chat" onClick={() => router.push(`/client/inbox?userId=${r.choreographer.id}`)}>Chat</button>
                <div style={{ marginTop: '10px' }}>
                  <button className="btn-pay" onClick={() => startPayment(r.id)} disabled={paymentLoadingId === r.id}>
                    {paymentLoadingId === r.id ? 'Initializing...' : 'Pay Now'}
                  </button>
                  {r.mustPayBy && (
                    <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '6px', fontWeight: '800' }}>
                      Deadline: {new Date(r.mustPayBy).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  {paymentError && paymentErrorId === r.id && (
                    <div className="meta" style={{ color: '#ef4444', marginTop: '6px', fontSize: '11px' }}>
                      {paymentError}
                    </div>
                  )}
                </div>
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
                <button className="btn-chat" onClick={() => router.push(`/client/inbox?userId=${r.choreographer.id}`)}>Chat</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showFeedbackModal && feedbackTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowFeedbackModal(false)}>
          <div className="modal-box">
            <div className="modal-title">Send Review</div>
            {feedbackError && <div className="modal-error">{feedbackError}</div>}
            <label className="modal-label">Comment *</label>
            <textarea className="modal-textarea" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder="Share your review..." />
            <div className="modal-actions">
              <button className="modal-btn primary" onClick={submitFeedback} disabled={feedbackSaving}>{feedbackSaving ? 'Sending...' : 'Send Review'}</button>
              <button className="modal-btn ghost" onClick={() => setShowFeedbackModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {paymentModalOpen && (
        <PaymentModal clientSecret={paymentClientSecret} onClose={() => setPaymentModalOpen(false)} />
      )}

      {mockPaymentTarget && (
        <MockPaymentModal
          sessionId={mockPaymentTarget.id}
          amount={mockPaymentTarget.total}
          choreographerName={mockPaymentTarget.choreographer?.name || 'Choreographer'}
          sessionDate={mockPaymentTarget.date}
          sessionTime={mockPaymentTarget.time}
          onClose={() => setMockPaymentTarget(null)}
          onSuccess={handleMockPaymentSuccess}
        />
      )}
    </div>
  );
}
