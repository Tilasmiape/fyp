'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChoreographerNavbar from '@/components/ChoreographerNavbar';
import StripeConnectModal from '@/components/StripeConnectModal';
import LineChart from '@/components/charts/LineChart';

interface Booking {
  id: string;
  date: string;
  time: string;
  status: 'pending' | 'accepted' | 'confirmed' | 'booked' | 'rejected' | 'completed' | 'cancelled';
  total?: number;
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  choreographerEarnings?: number;
}

interface StripeStatus {
  connected: boolean;
  onboarded: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

export default function EarningsPage() {
  const router = useRouter();
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [showStripeConnectModal, setShowStripeConnectModal] = useState(false);

  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch('/api/choreographer/sessions', {
          credentials: 'include',
        });
        if (!response.ok) {
          setBookingsError('Failed to load bookings');
          return;
        }
        const result = await response.json();
        setBookings(result?.sessions || []);
      } catch (error) {
        console.error('Failed to load bookings:', error);
      } finally {
        setBookingsLoading(false);
      }
    };
    fetchBookings();

    // Fetch stripe status
    const fetchStripeStatus = async () => {
      try {
        const sRes = await fetch('/api/choreographer/stripe-connect/status', { credentials: 'include' });
        const sData = await sRes.json();
        if (sRes.ok && sData?.success) {
          setStripeStatus({
            connected: sData.connected,
            onboarded: sData.onboarded,
            chargesEnabled: sData.chargesEnabled,
            payoutsEnabled: sData.payoutsEnabled,
          });
        }
      } catch (e) {
        console.error('Failed to fetch stripe status:', e);
      }
    };
    fetchStripeStatus();
  }, []);

  const [bookingsError, setBookingsError] = useState('');

  // Calculate earnings metrics
  const totalEarnings = bookings
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((sum, b) => {
      const split = Number(b.choreographerEarnings || 0);
      if (split > 0) return sum + split;
      return sum + Math.round(Number(b.total || 0) * 0.88 * 100) / 100;
    }, 0);

  const monthlyEarningsData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx;
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
      };
    });

    const earnings = new Map<string, number>(months.map((m) => [m.key, 0]));

    bookings
      .filter((b) => b.paymentStatus === 'paid')
      .forEach((b) => {
        const date = new Date(`${b.date}T00:00:00`);
        if (Number.isNaN(date.getTime())) return;
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (earnings.has(key)) {
          const split = Number(b.choreographerEarnings || 0);
          const amount = split > 0 ? split : Math.round(Number(b.total || 0) * 0.88 * 100) / 100;
          earnings.set(key, (earnings.get(key) || 0) + amount);
        }
      });

    return months.map((m) => ({
      label: m.label,
      value: Math.round(earnings.get(m.key) || 0),
    }));
  }, [bookings]);

  const paidSessionsCount = bookings.filter((b) => b.paymentStatus === 'paid').length;
  const pendingPayments = bookings.filter((b) => b.paymentStatus === 'pending').length;

  const handleConnectStripe = () => {
    setShowStripeConnectModal(true);
  };

  const handleStripeConnectComplete = async () => {
    setShowStripeConnectModal(false);
    try {
      const sRes = await fetch('/api/choreographer/stripe-connect/status', { credentials: 'include' });
      const sData = await sRes.json();
      if (sRes.ok && sData?.success) {
        setStripeStatus({
          connected: sData.connected,
          onboarded: sData.onboarded,
          chargesEnabled: sData.chargesEnabled,
          payoutsEnabled: sData.payoutsEnabled,
        });
      }
    } catch {}
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .earnings-root {
          min-height: 100vh;
          background: #f6f7fb;
          font-family: 'Manrope', sans-serif;
          color: #0f172a;
        }
        .earnings-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        .earnings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 40px;
        }
        .earnings-title {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          color: #0f172a;
        }
        .earnings-back {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          font-size: 16px;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .earnings-back:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .earnings-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }
        .earnings-stat-card {
          background: #fff;
          border: 1px solid #e7e9f0;
          border-radius: 16px;
          padding: 22px 24px;
          box-shadow: 0 8px 22px rgba(15,23,42,0.06);
        }
        .earnings-stat-label {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 8px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .earnings-stat-value {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 700;
          color: #f0c040;
        }
        .earnings-chart-section {
          background: #fff;
          border: 1px solid #e7e9f0;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 8px 22px rgba(15,23,42,0.06);
          margin-bottom: 32px;
        }
        .earnings-stripe-section {
          background: linear-gradient(135deg, #635bff 0%, #7c5cff 100%);
          border-radius: 16px;
          padding: 32px;
          color: #fff;
          box-shadow: 0 12px 32px rgba(99,91,255,0.3);
        }
        .earnings-stripe-title {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .earnings-stripe-text {
          font-size: 15px;
          line-height: 1.6;
          opacity: 0.95;
          margin-bottom: 24px;
        }
        .earnings-stripe-status {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: rgba(255,255,255,0.1);
          border-radius: 12px;
          margin-bottom: 20px;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .earnings-stripe-status-text {
          flex: 1;
        }
        .earnings-stripe-status-label {
          font-size: 12px;
          opacity: 0.8;
          text-transform: uppercase;
        }
        .earnings-stripe-status-value {
          font-size: 16px;
          font-weight: 700;
          margin-top: 4px;
        }
        .earnings-stripe-btn {
          background: #fff;
          color: #635bff;
          border: none;
          border-radius: 10px;
          padding: 12px 24px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          font-family: 'Manrope', sans-serif;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .earnings-stripe-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
        .earnings-stripe-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      <ChoreographerNavbar />

      <div className="earnings-root">
        <div className="earnings-container">
          <div className="earnings-header">
            <h1 className="earnings-title">Earnings</h1>
            <button className="earnings-back" onClick={() => router.push('/choreographer/home')}>
              ← Back to Dashboard
            </button>
          </div>

          {/* Stats Cards */}
          <div className="earnings-stats">
            <div className="earnings-stat-card">
              <div className="earnings-stat-label">Total Earnings</div>
              <div className="earnings-stat-value">NPR {totalEarnings.toLocaleString()}</div>
            </div>
            <div className="earnings-stat-card">
              <div className="earnings-stat-label">Paid Sessions</div>
              <div className="earnings-stat-value" style={{ color: '#34d399' }}>{paidSessionsCount}</div>
            </div>
            <div className="earnings-stat-card">
              <div className="earnings-stat-label">Pending Payments</div>
              <div className="earnings-stat-value" style={{ color: '#f59e0b' }}>{pendingPayments}</div>
            </div>
            <div className="earnings-stat-card">
              <div className="earnings-stat-label">Platform Fee</div>
              <div className="earnings-stat-value" style={{ color: '#a78bfa' }}>12%</div>
            </div>
          </div>

          {/* Earnings Chart */}
          <div className="earnings-chart-section">
            <LineChart
              data={monthlyEarningsData}
              title="Monthly Earnings (Last 6 Months)"
              unit="NPR "
              color="#f0c040"
              height={250}
            />
          </div>

          {/* Stripe Connect Section */}
          {stripeStatus === null ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
              Loading payment information...
            </div>
          ) : stripeStatus.onboarded ? (
            <div className="earnings-stripe-section" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <div className="earnings-stripe-title">Stripe Connected</div>
              <div className="earnings-stripe-text">
                Your Stripe account is active and ready to receive payments. You'll earn 88% of each session fee, with 12% going to our platform.
              </div>
              <div className="earnings-stripe-status">
                <div>
                  <input
                    type="checkbox"
                    checked
                    disabled
                    style={{ width: '20px', height: '20px', cursor: 'default' }}
                  />
                </div>
                <div className="earnings-stripe-status-text">
                  <div className="earnings-stripe-status-label">Payment Status</div>
                  <div className="earnings-stripe-status-value">Connected & Active</div>
                </div>
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                Payouts are automatically processed every week to your bank account.
              </div>
            </div>
          ) : (
            <div className="earnings-stripe-section">
              <div className="earnings-stripe-title">Connect Stripe to Receive Payments</div>
              <div className="earnings-stripe-text">
                To receive payments from clients, you need to connect your Stripe account. It's quick, secure, and takes just a few minutes. Once connected, you'll earn 88% of each session fee automatically.
              </div>
              <div className="earnings-stripe-status">
                <div>
                  <input
                    type="checkbox"
                    checked={false}
                    disabled
                    style={{ width: '20px', height: '20px', cursor: 'default' }}
                  />
                </div>
                <div className="earnings-stripe-status-text">
                  <div className="earnings-stripe-status-label">Payment Status</div>
                  <div className="earnings-stripe-status-value">Not Connected</div>
                </div>
              </div>
              <button
                className="earnings-stripe-btn"
                onClick={handleConnectStripe}
                disabled={stripeLoading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.92 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                </svg>
                {stripeLoading ? 'Connecting...' : 'Connect Stripe Account'}
              </button>
            </div>
          )}
        </div>
      </div>

      {showStripeConnectModal && (
        <StripeConnectModal
          onClose={() => setShowStripeConnectModal(false)}
          onComplete={handleStripeConnectComplete}
        />
      )}
    </>
  );
}
