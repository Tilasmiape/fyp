'use client';

import { useState } from 'react';

interface StripeConnectModalProps {
  onClose: () => void;
  onComplete: () => void;
}

export default function StripeConnectModal({ onClose, onComplete }: StripeConnectModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Personal / Business
  const [businessType, setBusinessType] = useState<'individual' | 'company'>('individual');
  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Nepal');

  // Step 2 — Bank account
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');

  // Step 3 — Verify / agree
  const [agreed, setAgreed] = useState(false);

  const validateStep1 = () => {
    if (!legalName.trim()) return 'Legal name is required.';
    if (!dob) return 'Date of birth is required.';
    if (!address.trim()) return 'Address is required.';
    if (!city.trim()) return 'City is required.';
    return '';
  };

  const validateStep2 = () => {
    if (!bankName.trim()) return 'Bank name is required.';
    if (!accountNumber.trim()) return 'Account number is required.';
    if (!routingNumber.trim()) return 'Routing / Swift code is required.';
    if (!accountHolder.trim()) return 'Account holder name is required.';
    return '';
  };

  const goNext = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) { setError(err); return; }
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!agreed) { setError('You must agree to the terms to continue.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/choreographer/stripe-connect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType,
          legalName,
          dob,
          address,
          city,
          postalCode,
          country,
          bankName,
          accountNumber,
          routingNumber,
          accountHolder,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to connect account');

      // If there's a Stripe onboarding URL — redirect (real mode)
      if (data.url && !data.mock) {
        window.location.href = data.url;
        return;
      }

      // Mock mode — show success
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Personal Info', 'Bank Details', 'Review & Agree'];

  return (
    <div className="sc-overlay" onClick={onClose}>
      <style>{`
        .sc-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px;
        }
        .sc-box {
          width: min(560px, 96vw); background: #111114; border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.5);
        }
        .sc-header {
          padding: 24px 28px 18px; border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex; justify-content: space-between; align-items: center;
        }
        .sc-header-left { display: flex; align-items: center; gap: 12px; }
        .sc-stripe-icon {
          width: 40px; height: 40px; border-radius: 12px; background: #635bff;
          display: grid; place-items: center;
        }
        .sc-stripe-icon svg { width: 20px; height: 20px; }
        .sc-title { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; color: #fff; }
        .sc-subtitle { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .sc-close {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5); width: 32px; height: 32px; border-radius: 999px;
          display: grid; place-items: center; cursor: pointer; font-size: 16px; transition: all 0.2s;
        }
        .sc-close:hover { color: #fff; background: rgba(255,255,255,0.12); }

        .sc-steps {
          display: flex; gap: 0; padding: 0 28px; margin-top: 0;
          border-bottom: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.02);
        }
        .sc-step-item {
          flex: 1; padding: 14px 0; text-align: center; font-size: 11px; font-weight: 700;
          letter-spacing: 0.8px; text-transform: uppercase; color: rgba(255,255,255,0.25);
          border-bottom: 2px solid transparent; transition: all 0.3s;
        }
        .sc-step-item.active { color: #635bff; border-bottom-color: #635bff; }
        .sc-step-item.done { color: rgba(52,211,153,0.8); }

        .sc-body {
          padding: 24px 28px; max-height: 50vh; overflow-y: auto;
        }
        .sc-field { margin-bottom: 16px; }
        .sc-label {
          display: block; font-size: 11px; font-weight: 700; letter-spacing: 1px;
          text-transform: uppercase; color: rgba(255,255,255,0.45); margin-bottom: 6px;
        }
        .sc-input {
          width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; color: #fff;
          font-size: 14px; font-family: 'DM Sans', sans-serif; outline: none; transition: border-color 0.2s;
        }
        .sc-input:focus { border-color: rgba(99,91,255,0.5); }
        .sc-input::placeholder { color: rgba(255,255,255,0.2); }
        .sc-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .sc-radio-row { display: flex; gap: 10px; margin-bottom: 16px; }
        .sc-radio {
          flex: 1; padding: 12px; border-radius: 10px; cursor: pointer; text-align: center;
          font-size: 13px; font-weight: 600; transition: all 0.2s; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.5);
        }
        .sc-radio.active {
          border-color: #635bff; background: rgba(99,91,255,0.12); color: #fff;
        }

        .sc-review-item {
          display: flex; justify-content: space-between; padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 13px;
        }
        .sc-review-label { color: rgba(255,255,255,0.4); }
        .sc-review-value { color: #fff; font-weight: 600; text-align: right; }
        .sc-agree-row {
          display: flex; align-items: flex-start; gap: 10px; margin-top: 16px; padding: 14px;
          background: rgba(99,91,255,0.06); border-radius: 12px; border: 1px solid rgba(99,91,255,0.15);
        }
        .sc-agree-check {
          width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0; cursor: pointer;
          accent-color: #635bff; margin-top: 2px;
        }
        .sc-agree-text { font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.5; }

        .sc-error {
          background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25);
          color: #f87171; border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px;
        }
        .sc-footer {
          padding: 18px 28px; border-top: 1px solid rgba(255,255,255,0.07);
          display: flex; justify-content: space-between; gap: 12px;
        }
        .sc-btn-back {
          background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7); padding: 12px 22px; border-radius: 12px; font-size: 14px;
          font-weight: 600; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s;
        }
        .sc-btn-back:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .sc-btn-next {
          background: #635bff; color: #fff; border: none; padding: 12px 28px; border-radius: 12px;
          font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'DM Sans', sans-serif;
          display: flex; align-items: center; gap: 8px; transition: all 0.2s;
        }
        .sc-btn-next:hover { background: #5548e6; }
        .sc-btn-next:disabled { opacity: 0.5; cursor: not-allowed; }
        .sc-secure {
          display: flex; align-items: center; gap: 6px; font-size: 10px; color: rgba(255,255,255,0.25);
          letter-spacing: 0.6px; padding: 10px 28px 14px; text-align: center; justify-content: center;
        }
      `}</style>

      <div className="sc-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sc-header">
          <div className="sc-header-left">
            <div className="sc-stripe-icon">
              <svg viewBox="0 0 24 24" fill="#fff">
                <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.92 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
              </svg>
            </div>
            <div>
              <div className="sc-title">Connect Your Account</div>
              <div className="sc-subtitle">Powered by Stripe Connect</div>
            </div>
          </div>
          <button className="sc-close" onClick={onClose}>✕</button>
        </div>

        {/* Step indicators */}
        <div className="sc-steps">
          {stepLabels.map((label, i) => (
            <div key={label} className={`sc-step-item ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
              {step > i + 1 ? '✓ ' : `${i + 1}. `}{label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="sc-body">
          {error && <div className="sc-error">✗ {error}</div>}

          {/* STEP 1 */}
          {step === 1 && (
            <>
              <label className="sc-label">Account type</label>
              <div className="sc-radio-row">
                <div className={`sc-radio ${businessType === 'individual' ? 'active' : ''}`} onClick={() => setBusinessType('individual')}>
                  👤 Individual
                </div>
                <div className={`sc-radio ${businessType === 'company' ? 'active' : ''}`} onClick={() => setBusinessType('company')}>
                  🏢 Company
                </div>
              </div>

              <div className="sc-field">
                <label className="sc-label">{businessType === 'company' ? 'Business Name' : 'Legal Full Name'}</label>
                <input className="sc-input" value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="Enter your full legal name" />
              </div>

              <div className="sc-field">
                <label className="sc-label">Date of Birth</label>
                <input className="sc-input" type="date" value={dob} onChange={e => setDob(e.target.value)} />
              </div>

              <div className="sc-field">
                <label className="sc-label">Street Address</label>
                <input className="sc-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street address" />
              </div>

              <div className="sc-row">
                <div className="sc-field">
                  <label className="sc-label">City</label>
                  <input className="sc-input" value={city} onChange={e => setCity(e.target.value)} placeholder="City" />
                </div>
                <div className="sc-field">
                  <label className="sc-label">Postal Code</label>
                  <input className="sc-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="44600" />
                </div>
              </div>

              <div className="sc-field">
                <label className="sc-label">Country</label>
                <input className="sc-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="Nepal" />
              </div>
            </>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <>
              <div className="sc-field">
                <label className="sc-label">Bank Name</label>
                <input className="sc-input" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. Nepal Bank Limited" />
              </div>
              <div className="sc-field">
                <label className="sc-label">Account Holder Name</label>
                <input className="sc-input" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} placeholder="Name as it appears on your bank account" />
              </div>
              <div className="sc-field">
                <label className="sc-label">Account Number</label>
                <input className="sc-input" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="0123456789012345" />
              </div>
              <div className="sc-field">
                <label className="sc-label">Routing / SWIFT Code</label>
                <input className="sc-input" value={routingNumber} onChange={e => setRoutingNumber(e.target.value)} placeholder="NBLNPRKA" />
              </div>
            </>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <>
              <div className="sc-review-item"><span className="sc-review-label">Account Type</span><span className="sc-review-value" style={{textTransform:'capitalize'}}>{businessType}</span></div>
              <div className="sc-review-item"><span className="sc-review-label">Legal Name</span><span className="sc-review-value">{legalName}</span></div>
              <div className="sc-review-item"><span className="sc-review-label">Date of Birth</span><span className="sc-review-value">{dob}</span></div>
              <div className="sc-review-item"><span className="sc-review-label">Address</span><span className="sc-review-value">{address}, {city} {postalCode}</span></div>
              <div className="sc-review-item"><span className="sc-review-label">Country</span><span className="sc-review-value">{country}</span></div>
              <div className="sc-review-item"><span className="sc-review-label">Bank</span><span className="sc-review-value">{bankName}</span></div>
              <div className="sc-review-item"><span className="sc-review-label">Account Holder</span><span className="sc-review-value">{accountHolder}</span></div>
              <div className="sc-review-item"><span className="sc-review-label">Account Number</span><span className="sc-review-value">••••{accountNumber.slice(-4)}</span></div>
              <div className="sc-review-item"><span className="sc-review-label">Routing / SWIFT</span><span className="sc-review-value">{routingNumber}</span></div>
              <div className="sc-review-item" style={{borderBottom:'none'}}><span className="sc-review-label">Payout Split</span><span className="sc-review-value" style={{color:'#34d399'}}>You receive 88%</span></div>

              <div className="sc-agree-row">
                <input type="checkbox" className="sc-agree-check" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <div className="sc-agree-text">
                  I confirm that the information provided is accurate and I agree to Stripe&apos;s
                  <strong style={{color:'#635bff'}}> Connected Account Agreement</strong> and
                  <strong style={{color:'#635bff'}}> Service Agreement</strong>. I authorize
                  Step Out Studio to facilitate payouts to my bank account.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Secure indicator */}
        <div className="sc-secure">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM12 17c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM9 8V6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9z"/></svg>
          Encrypted & secure · Powered by Stripe
        </div>

        {/* Footer */}
        <div className="sc-footer">
          {step > 1 ? (
            <button className="sc-btn-back" onClick={() => { setError(''); setStep(step - 1); }}>← Back</button>
          ) : (
            <button className="sc-btn-back" onClick={onClose}>Cancel</button>
          )}
          {step < 3 ? (
            <button className="sc-btn-next" onClick={goNext}>Continue →</button>
          ) : (
            <button className="sc-btn-next" onClick={handleSubmit} disabled={loading}>
              {loading ? '⏳ Connecting...' : '🔗 Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
