'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PayoutStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalPending: number;
  nextPayoutRun: string;
}

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastRun, setLastRun] = useState<any>(null);

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
    const loadStats = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/payouts/process', {
          credentials: 'include',
        });
        const data = await res.json();
        if (res.ok && data?.stats) {
          setStats(data.stats);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load payout stats');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);

  const processPayouts = async () => {
    try {
      setProcessing(true);
      setError('');
      const res = await fetch('/api/admin/payouts/process', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setLastRun(data);
        setStats(data.stats);
        alert(`✓ Payout run completed!\n\nProcessed: ${data.summary?.processed || 0}\nFailed: ${data.summary?.failed || 0}`);
      } else {
        setError(data?.error || 'Payout processing failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process payouts');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7fb', fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 40px; background: #fff; border-bottom: 1px solid #e7e9f0; }
        .brand-name { font-weight: 700; font-size: 18px; }
        .page { max-width: 1000px; margin: 0 auto; padding: 32px 36px; }
        .hero h1 { font-size: 32px; margin: 0 0 12px; }
        .hero p { color: #6b7280; font-size: 14px; }
        .alert { padding: 14px 16px; border-radius: 12px; margin-bottom: 16px; font-size: 13px; }
        .alert.error { background: #fef2f2; color: #b91c1c; border: 1px solid #fee2e2; }
        .alert.success { background: #ecfdf5; color: #047857; border: 1px solid #d1fae5; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin: 24px 0; }
        .stat-card { background: #fff; border: 1px solid #e7e9f0; border-radius: 12px; padding: 20px; text-align: center; }
        .stat-label { font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #9ca3af; font-weight: 700; }
        .stat-value { font-size: 36px; font-weight: 800; margin: 8px 0; }
        .stat-value.success { color: #047857; }
        .stat-value.warning { color: #b45309; }
        .stat-value.pending { color: #2563eb; }
        .stat-value.error { color: #b91c1c; }
        .btn { border: none; padding: 12px 18px; border-radius: 999px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; cursor: pointer; transition: all 0.2s; }
        .btn-primary { background: #111827; color: #fff; }
        .btn-primary:hover { background: #1f2937; transform: translateY(-2px); }
        .btn-primary[disabled] { opacity: 0.6; cursor: not-allowed; transform: none; }
        .section { background: #fff; border: 1px solid #e7e9f0; border-radius: 12px; padding: 20px; margin-top: 20px; }
        .section-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e7e9f0; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #6b7280; font-size: 12px; }
        .info-value { font-weight: 700; }
      `}</style>

      <nav className="topbar">
        <div className="brand-name">Step Out - Admin Payouts</div>
      </nav>

      <div className="page">
        <div className="hero">
          <h1>Payout Management</h1>
          <p>Monitor and process choreographer payouts</p>
        </div>

        {error && <div className="alert error">✗ {error}</div>}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Pending</div>
            <div className="stat-value pending">{loading ? '—' : stats?.pending || 0}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>ready to process</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Processing</div>
            <div className="stat-value warning">{loading ? '—' : stats?.processing || 0}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>in progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value success">{loading ? '—' : stats?.completed || 0}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>this month</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Failed</div>
            <div className="stat-value error">{loading ? '—' : stats?.failed || 0}</div>
            <div style={{ fontSize: '11px', color: '#6b7280' }}>needs review</div>
          </div>
        </div>

        <div className="stat-card" style={{ marginTop: '16px', textAlign: 'left' }}>
          <div className="stat-label" style={{ textAlign: 'center' }}>Total Pending Payouts</div>
          <div style={{ textAlign: 'center', fontSize: '28px', fontWeight: 800, color: '#047857', margin: '12px 0' }}>
            {loading ? '—' : `NPR ${(stats?.totalPending || 0).toLocaleString()}`}
          </div>
          <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
            Scheduled for: {stats?.nextPayoutRun ? new Date(stats.nextPayoutRun).toLocaleDateString() : 'TBD'}
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={processPayouts}
            disabled={processing}
            style={{ padding: '14px 24px', fontSize: '13px' }}
          >
            {processing ? '⏳ Processing Payouts...' : '💰 Process Payouts Now'}
          </button>
        </div>

        {lastRun && (
          <div className="section">
            <div className="section-title">✅ Last Payout Run</div>
            <div className="info-row">
              <span className="info-label">Total Processed</span>
              <span className="info-value">{lastRun.summary?.total}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Successful</span>
              <span className="info-value" style={{ color: '#047857' }}>✓ {lastRun.summary?.processed}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Failed</span>
              <span className="info-value" style={{ color: '#b91c1c' }}>✗ {lastRun.summary?.failed}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Timestamp</span>
              <span className="info-value">{new Date(lastRun.timestamp).toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="section" style={{ marginTop: '24px', background: '#fffbeb', border: '1px solid #fef3c7' }}>
          <div className="section-title">📋 How Payouts Work</div>
          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.6' }}>
            <p>1. <strong>Client pays</strong> for session → Platform's Stripe account (escrow)</p>
            <p>2. <strong>Choreographer completes</strong> session → Payout scheduled for Friday</p>
            <p>3. <strong>Friday 9 AM UTC</strong> (automatic) or click button to manually process</p>
            <p>4. <strong>System transfers</strong> 88% to choreographer's bank via Stripe</p>
            <p>5. <strong>Platform keeps</strong> 12% as revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
