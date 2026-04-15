'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';

interface SessionStats {
  total: number;
  booked: number;
  reserved: number;
  failed: number;
  totalPaymentAmount: number;
  totalChoreographerEarnings: number;
  totalPlatformFees: number;
}

interface Session {
  id: string;
  date: string;
  time: string;
  status: string;
  paymentStatus: string;
  payoutStatus: string;
  client: {
    id: string;
    name: string;
    email: string;
  };
  choreographer: {
    id: string;
    name: string;
    email: string;
  };
  total: number;
  choreographerEarnings: number;
  platformFee: number;
  sessionStatus: 'reserved' | 'booked';
  attendance?: {
    status: 'unmarked' | 'present' | 'absent';
    score?: number | null;
  } | null;
  paidAt?: string;
  createdAt: string;
}

export default function AdminSessionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filterPayment, setFilterPayment] = useState('');
  const [filterPayout, setFilterPayout] = useState('');
  const [filterSession, setFilterSession] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!res.ok || data?.user?.role !== 'super-admin') {
          router.push('/unauthorized');
        }
      } catch {
        router.push('/signin');
      }
    };
    checkAuth();
  }, [router]);

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filterPayment) params.append('paymentStatus', filterPayment);
        if (filterPayout) params.append('payoutStatus', filterPayout);
        if (filterSession) params.append('sessionStatus', filterSession);

        const res = await fetch(`/api/admin/sessions?${params.toString()}`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok) {
          setStats(data.stats);
          setSessions(data.sessions);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [filterPayment, filterPayout, filterSession]);

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#047857';
      case 'pending':
        return '#b45309';
      case 'unpaid':
        return '#2563eb';
      case 'failed':
        return '#b91c1c';
      default:
        return '#6b7280';
    }
  };

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#047857';
      case 'processing':
        return '#b45309';
      case 'scheduled':
        return '#2563eb';
      case 'failed':
        return '#b91c1c';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7fb', fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 40px; background: #fff; border-bottom: 1px solid #e7e9f0; }
        .brand-name { font-weight: 700; font-size: 18px; }
        .page { max-width: 1400px; margin: 0 auto; padding: 32px 36px; }
        .hero h1 { font-size: 32px; margin: 0 0 12px; }
        .hero p { color: #6b7280; font-size: 14px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin: 24px 0; }
        .stat-card { background: #fff; border: 1px solid #e7e9f0; border-radius: 12px; padding: 18px; text-align: center; }
        .stat-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #9ca3af; font-weight: 700; }
        .stat-value { font-size: 32px; font-weight: 800; margin: 8px 0; }
        .stat-value.success { color: #047857; }
        .stat-value.warning { color: #b45309; }
        .stat-value.info { color: #2563eb; }
        .stat-value.error { color: #b91c1c; }
        .filters { display: flex; gap: 12px; margin: 20px 0; flex-wrap: wrap; }
        .filter-group { display: flex; gap: 8px; align-items: center; }
        .filter-group label { font-size: 12px; font-weight: 700; color: #6b7280; }
        .filter-group select { padding: 6px 10px; border: 1px solid #e7e9f0; border-radius: 6px; font-size: 12px; }
        .alert { padding: 14px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 13px; }
        .alert.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .table-container { background: #fff; border: 1px solid #e7e9f0; border-radius: 12px; overflow: hidden; }
        .table-header { display: grid; grid-template-columns: 140px 140px 140px 80px 100px 100px 100px 100px 100px 100px 80px; gap: 12px; padding: 16px; background: #f9fafb; border-bottom: 1px solid #e7e9f0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; }
        .table-row { display: grid; grid-template-columns: 140px 140px 140px 80px 100px 100px 100px 100px 100px 100px 80px; gap: 12px; padding: 14px 16px; border-bottom: 1px solid #e7e9f0; align-items: center; font-size: 11px; }
        .table-row:last-child { border-bottom: none; }
        .table-row:hover { background: #f9fafb; }
        .name { font-weight: 700; }
        .email { color: #6b7280; font-size: 11px; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
        .empty { text-align: center; padding: 40px 20px; color: #9ca3af; }
        .loading { text-align: center; padding: 40px 20px; color: #6b7280; }
      `}</style>

      <AdminNavbar subtitle="Session Payment Tracking" />

      <div className="page">
        <div className="hero">
          <h1>Session Payment Tracking</h1>
          <p>Monitor payment status and choreographer earnings</p>
        </div>

        {error && <div className="alert error">{error}</div>}

        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Sessions</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Booked Sessions</div>
              <div className="stat-value success">{stats.booked}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Reserved Sessions</div>
              <div className="stat-value info">{stats.reserved}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Failed Payments</div>
              <div className="stat-value error">{stats.failed}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Collected</div>
              <div className="stat-value success">NPR {stats.totalPaymentAmount.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Choreographer Earnings (88%)</div>
              <div className="stat-value success">NPR {stats.totalChoreographerEarnings.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Platform Fees (12%)</div>
              <div className="stat-value success">NPR {stats.totalPlatformFees.toLocaleString()}</div>
            </div>
          </div>
        )}

        <div className="filters">
          <div className="filter-group">
            <label>Payment Status:</label>
            <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}>
              <option value="">All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="unpaid">Unpaid</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Payout Status:</label>
            <select value={filterPayout} onChange={(e) => setFilterPayout(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Scheduled</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Session Status:</label>
            <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)}>
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="empty">No sessions found</div>
        ) : (
          <div className="table-container">
            <div className="table-header">
              <div>Client</div>
              <div>Choreographer</div>
              <div>Date & Time</div>
              <div>Cost</div>
              <div>Payment</div>
              <div>Status</div>
              <div>Attendance</div>
              <div>Score</div>
              <div>Earnings</div>
              <div>Platform Fee</div>
              <div>Action</div>
            </div>
            {sessions.map((session) => (
              <div key={session.id} className="table-row">
                <div>
                  <div className="name">{session.client.name}</div>
                  <div className="email">{session.client.email}</div>
                </div>
                <div>
                  <div className="name">{session.choreographer.name}</div>
                  <div className="email">{session.choreographer.email}</div>
                </div>
                <div>{session.date ? session.date.split('T')[0] : '—'} {session.time || '—'}</div>
                <div style={{ fontWeight: 700 }}>NPR {(session.total || 0).toLocaleString()}</div>
                <div>
                  <span
                    className="badge"
                    style={{
                      background: getPaymentStatusColor(session.paymentStatus) + '20',
                      color: getPaymentStatusColor(session.paymentStatus),
                    }}
                  >
                    {session.paymentStatus}
                  </span>
                </div>
                <div>
                  <span
                    className="badge"
                    style={{
                      background: session.sessionStatus === 'booked' ? '#dcfce7' : '#eff6ff',
                      color: session.sessionStatus === 'booked' ? '#16a34a' : '#3b82f6',
                    }}
                  >
                    {session.sessionStatus || 'reserved'}
                  </span>
                  <div style={{ fontSize: '9px', marginTop: '2px', color: '#94a3b8' }}>{session.status}</div>
                </div>
                <div>
                  <span
                    className="badge"
                    style={{
                      background: session.attendance?.status === 'present' ? '#dcfce7' : session.attendance?.status === 'absent' ? '#fee2e2' : '#f3f4f6',
                      color: session.attendance?.status === 'present' ? '#16a34a' : session.attendance?.status === 'absent' ? '#ef4444' : '#94a3b8',
                    }}
                  >
                    {session.attendance?.status || 'Unmarked'}
                  </span>
                </div>
                <div style={{ fontWeight: 800 }}>
                  {session.attendance?.score !== undefined && session.attendance?.score !== null ? (
                    <span style={{ color: '#0f172a' }}>{session.attendance.score} <small style={{ fontWeight: 400, color: '#94a3b8' }}>/ 10</small></span>
                  ) : '—'}
                </div>
                <div style={{ fontWeight: 700, color: '#047857' }}>
                  NPR {(session.choreographerEarnings || 0).toLocaleString()}
                </div>
                <div style={{ fontWeight: 700, color: '#2563eb' }}>NPR {(session.platformFee || 0).toLocaleString()}</div>
                <div>
                  <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '9px' }} onClick={() => router.push(`/admin/sessions/${session.id}`)}>
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

