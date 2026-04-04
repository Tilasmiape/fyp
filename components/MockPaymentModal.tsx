'use client';

import { useState } from 'react';

interface MockPaymentModalProps {
  sessionId: string;
  amount: number;
  choreographerName: string;
  sessionDate: string;
  sessionTime: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MockPaymentModal({
  sessionId,
  amount,
  choreographerName,
  sessionDate,
  sessionTime,
  onClose,
  onSuccess,
}: MockPaymentModalProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [nameOnCard, setNameOnCard] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const validate = () => {
    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 13) return 'Please enter a valid card number.';
    if (!expiry || expiry.length < 5) return 'Please enter a valid expiry date (MM/YY).';
    if (!cvv || cvv.length < 3) return 'Please enter a valid CVV.';
    if (!nameOnCard.trim()) return 'Name on card is required.';
    if (!email.trim() || !email.includes('@')) return 'Please enter a valid email address.';
    return '';
  };

  const handlePay = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Payment failed');
      setSuccess(true);
      setTimeout(() => onSuccess(), 1800);
    } catch (err: any) {
      setError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mp-overlay" onClick={onClose}>
      <style>{`
        .mp-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px;
        }
        .mp-box {
          width: min(480px, 96vw); background: #fff; border-radius: 24px; overflow: hidden;
          box-shadow: 0 30px 60px rgba(0,0,0,0.3);
        }
        .mp-header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 28px;
          color: #fff;
        }
        .mp-header-top { display: flex; justify-content: space-between; align-items: center; }
        .mp-title { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; }
        .mp-close {
          background: rgba(255,255,255,0.12); border: none; color: #fff; width: 32px; height: 32px;
          border-radius: 999px; display: grid; place-items: center; cursor: pointer; font-size: 16px;
        }
        .mp-session-info {
          margin-top: 14px; display: flex; justify-content: space-between; align-items: flex-end;
        }
        .mp-session-detail { font-size: 13px; color: rgba(255,255,255,0.6); }
        .mp-session-detail strong { color: #fff; }
        .mp-amount {
          font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #f4b63a;
        }

        .mp-body { padding: 24px 28px; }
        .mp-field { margin-bottom: 16px; }
        .mp-label {
          display: block; font-size: 11px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: #9ca3af; margin-bottom: 6px;
        }
        .mp-input {
          width: 100%; padding: 13px 14px; background: #f8f9fc; border: 1px solid #e5e7eb;
          border-radius: 12px; color: #0f172a; font-size: 15px; font-family: 'Manrope', sans-serif;
          outline: none; transition: border-color 0.2s;
        }
        .mp-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        .mp-input::placeholder { color: #c8cbd0; }
        .mp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .mp-card-icons {
          display: flex; gap: 6px; margin-bottom: 16px;
        }
        .mp-card-icon {
          width: 42px; height: 28px; border-radius: 6px; border: 1px solid #e5e7eb;
          display: grid; place-items: center; font-size: 10px; font-weight: 800; color: #6b7280;
          background: #fff;
        }
        .mp-card-icon.active { border-color: #6366f1; background: #eef2ff; color: #4f46e5; }

        .mp-error {
          background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; border-radius: 10px;
          padding: 10px 14px; font-size: 13px; margin-bottom: 14px;
        }
        .mp-btn-pay {
          width: 100%; background: #111827; color: #fff; border: none; padding: 15px;
          border-radius: 14px; font-size: 15px; font-weight: 800; cursor: pointer;
          font-family: 'Manrope', sans-serif; display: flex; align-items: center;
          justify-content: center; gap: 8px; transition: all 0.3s; letter-spacing: 0.5px;
        }
        .mp-btn-pay:hover { background: #1f2937; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(17,24,39,0.25); }
        .mp-btn-pay:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .mp-secure {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          font-size: 10px; color: #9ca3af; letter-spacing: 0.5px; padding: 12px 0 4px;
        }

        .mp-success-overlay {
          position: absolute; inset: 0; background: rgba(255,255,255,0.96);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          border-radius: 24px; z-index: 10;
        }
        .mp-success-check {
          width: 64px; height: 64px; border-radius: 999px; background: #10b981;
          display: grid; place-items: center; font-size: 28px; color: #fff;
          animation: mpPop 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes mpPop { 0% { transform: scale(0); } 100% { transform: scale(1); } }
        .mp-success-text {
          font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700;
          color: #0f172a; margin-top: 16px;
        }
        .mp-success-sub { font-size: 13px; color: #6b7280; margin-top: 6px; }
      `}</style>

      <div className="mp-box" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        {success && (
          <div className="mp-success-overlay">
            <div className="mp-success-check">✓</div>
            <div className="mp-success-text">Payment Successful!</div>
            <div className="mp-success-sub">Your session is now confirmed.</div>
          </div>
        )}

        <div className="mp-header">
          <div className="mp-header-top">
            <div className="mp-title">💳 Secure Payment</div>
            <button className="mp-close" onClick={onClose}>✕</button>
          </div>
          <div className="mp-session-info">
            <div className="mp-session-detail">
              <div>Session with <strong>{choreographerName}</strong></div>
              <div style={{ marginTop: 4 }}>{sessionDate} at {sessionTime}</div>
            </div>
            <div className="mp-amount">NPR {amount.toLocaleString()}</div>
          </div>
        </div>

        <div className="mp-body">
          {error && <div className="mp-error">✗ {error}</div>}

          <div className="mp-card-icons">
            <div className={`mp-card-icon ${cardNumber.startsWith('4') ? 'active' : ''}`}>VISA</div>
            <div className={`mp-card-icon ${cardNumber.startsWith('5') ? 'active' : ''}`}>MC</div>
            <div className={`mp-card-icon ${cardNumber.startsWith('3') ? 'active' : ''}`}>AMEX</div>
          </div>

          <div className="mp-field">
            <label className="mp-label">Email</label>
            <input className="mp-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" />
          </div>

          <div className="mp-field">
            <label className="mp-label">Card Number</label>
            <input
              className="mp-input"
              value={cardNumber}
              onChange={e => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="4242 4242 4242 4242"
              maxLength={19}
              inputMode="numeric"
            />
          </div>

          <div className="mp-row">
            <div className="mp-field">
              <label className="mp-label">Expiry</label>
              <input
                className="mp-input"
                value={expiry}
                onChange={e => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/YY"
                maxLength={5}
                inputMode="numeric"
              />
            </div>
            <div className="mp-field">
              <label className="mp-label">CVV</label>
              <input
                className="mp-input"
                value={cvv}
                onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                maxLength={4}
                type="password"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="mp-field">
            <label className="mp-label">Name on Card</label>
            <input className="mp-input" value={nameOnCard} onChange={e => setNameOnCard(e.target.value)} placeholder="Full name as shown on card" />
          </div>

          <button className="mp-btn-pay" onClick={handlePay} disabled={loading}>
            {loading ? '⏳ Processing...' : `🔒 Pay NPR ${amount.toLocaleString()}`}
          </button>

          <div className="mp-secure">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>
            Encrypted & secure · 256-bit SSL
          </div>
        </div>
      </div>
    </div>
  );
}
