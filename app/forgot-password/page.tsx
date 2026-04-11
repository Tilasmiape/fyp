'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Step = 'email' | 'account' | 'method' | 'code' | 'password' | 'done';
type Method = 'code' | 'password';

interface AccountInfo {
  id: string;
  fullName: string;
  email: string;
  maskedEmail: string;
  profileImage: string | null;
  role: string;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getRoleLabel(role: string) {
  if (role === 'choreographer') return 'Choreographer';
  if (role === 'super-admin') return 'Administrator';
  return 'Client';
}

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [method, setMethod] = useState<Method>('code');

  // Code step
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState('');
  const [codeSending, setCodeSending] = useState(false);
  const [codeVerifying, setCodeVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password step
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Generic
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Step 1: Look up account ────────────────────────────────────────────────
  const handleLookup = async () => {
    setError('');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!data.found) {
        setError('No account found with that email address.');
        return;
      }
      setAccount(data.user);
      setStep('account');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Account confirmed → go to method choice ────────────────────────
  const handleAccountConfirm = () => {
    setError('');
    setStep('method');
  };

  // ── Step 3: Method chosen → send code or go to password ───────────────────
  const handleMethodContinue = async () => {
    if (method === 'password') {
      setStep('password');
      return;
    }
    await sendCode();
  };

  const sendCode = async () => {
    setCodeSending(true);
    setCodeError('');
    try {
      const res = await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account?.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send code');
      setCodeDigits(['', '', '', '', '', '']);
      setStep('code');
      setResendCooldown(60);
    } catch (err: any) {
      setCodeError(err.message);
    } finally {
      setCodeSending(false);
    }
  };

  // Handle 6-digit code input
  const handleCodeDigit = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...codeDigits];
    next[i] = val;
    setCodeDigits(next);
    setCodeError('');
    if (val && i < 5) {
      const el = document.getElementById(`otp-${i + 1}`);
      el?.focus();
    }
  };
  const handleCodeKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !codeDigits[i] && i > 0) {
      const el = document.getElementById(`otp-${i - 1}`);
      el?.focus();
    }
  };

  const handleVerifyCode = async () => {
    const code = codeDigits.join('');
    if (code.length < 6) { setCodeError('Please enter all 6 digits.'); return; }
    setCodeVerifying(true);
    setCodeError('');
    try {
      const res = await fetch('/api/auth/forgot-password/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account?.email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setStep('done');
      // Redirect after 2s
      setTimeout(() => {
        const role = data.user?.role || 'client';
        router.push(role === 'super-admin' ? '/admin/home' : role === 'choreographer' ? '/choreographer/home' : '/client/home');
      }, 2000);
    } catch (err: any) {
      setCodeError(err.message);
    } finally {
      setCodeVerifying(false);
    }
  };

  // ── Password reset flow ────────────────────────────────────────────────────
  const handlePasswordContinue = async () => {
    setPwError('');
    if (!currentPassword.trim()) { setPwError('Password is required.'); return; }
    setPwLoading(true);
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account?.email, password: currentPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.reason || 'Invalid password');
      setStep('done');
      setTimeout(() => {
        const role = data.user?.role || 'client';
        router.push(role === 'super-admin' ? '/admin/home' : role === 'choreographer' ? '/choreographer/home' : '/client/home');
      }, 1200);
    } catch (err: any) {
      setPwError(err.message);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="fp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        .fp-root {
          min-height: 100vh; background: #d5d9e8;
          font-family: 'Manrope', sans-serif; color: #0f172a;
          display: flex; flex-direction: column;
        }
        .fp-topbar {
          height: 56px; background: rgba(255,255,255,0.85);
          border-bottom: 1px solid #dbe1ef; display: flex;
          align-items: center; justify-content: center; flex-shrink: 0;
        }
        .fp-topbar-inner {
          width: min(1100px, calc(100% - 28px));
          display: flex; align-items: center; justify-content: space-between;
        }
        .fp-brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: inherit; }
        .fp-brand-mark { width: 28px; height: 28px; border-radius: 10px; background: #fff;
          box-shadow: 0 6px 14px rgba(15,27,60,0.18); overflow: hidden; display: grid; place-items: center; }
        .fp-brand-mark img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.2); }
        .fp-brand-title { font-weight: 800; font-size: 18px; }
        .fp-brand-sub { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #f2a900; font-weight: 700; }
        .fp-back-link { font-size: 12px; font-weight: 700; color: #4f46e5; text-decoration: none; letter-spacing: 0.5px; }

        .fp-shell { flex: 1; display: grid; place-items: center; padding: 40px 16px; }
        .fp-card {
          width: min(460px, 100%); background: #f4f5f7;
          border-radius: 28px; box-shadow: 0 26px 55px rgba(37,45,72,0.22); overflow: hidden;
        }

        /* Banner */
        .fp-banner {
          background: linear-gradient(135deg, #0d1736 0%, #1e3a8a 100%);
          padding: 28px 32px 24px; color: #fff;
        }
        .fp-banner-row { display: flex; align-items: center; gap: 12px; }
        .fp-banner-icon {
          width: 44px; height: 44px; border-radius: 14px;
          background: rgba(255,255,255,0.12); display: grid; place-items: center; font-size: 20px; flex-shrink: 0;
        }
        .fp-banner-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; }
        .fp-banner-sub { font-size: 12px; color: rgba(255,255,255,0.6); margin-top: 3px; }

        /* Step pills */
        .fp-step-pills {
          display: flex; background: rgba(13,23,54,0.85); border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .fp-pill {
          flex: 1; padding: 9px 0; text-align: center;
          font-size: 9px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
          color: rgba(255,255,255,0.3); border-bottom: 2px solid transparent; transition: all 0.3s;
        }
        .fp-pill.active { color: #f2a900; border-bottom-color: #f2a900; }
        .fp-pill.done { color: rgba(52,211,153,0.8); }

        .fp-body { padding: 28px 32px 30px; }

        .fp-label {
          display: block; font-size: 11px; font-weight: 800;
          letter-spacing: 1.2px; text-transform: uppercase; color: #94a3b8; margin-bottom: 6px;
        }
        .fp-field {
          width: 100%; border-radius: 12px; border: 1.5px solid #d7deea;
          background: #eef2f7; padding: 13px 14px; font-size: 14px; color: #1f2937;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s; font-family: 'Manrope', sans-serif;
        }
        .fp-field:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
        .fp-field::placeholder { color: #9ca3af; }
        .fp-field-wrap { position: relative; }
        .fp-eye {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; font-size: 16px; color: #94a3b8;
        }

        .fp-error {
          background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c;
          border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px;
        }
        .fp-sp { height: 16px; }

        /* Account card */
        .fp-account-card {
          display: flex; align-items: center; gap: 14px; padding: 14px 16px;
          background: #fff; border-radius: 14px; border: 1.5px solid #e2e8f0;
          margin-bottom: 20px; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .fp-account-card:hover { border-color: #6366f1; box-shadow: 0 4px 16px rgba(99,102,241,0.1); }
        .fp-avatar {
          width: 52px; height: 52px; border-radius: 999px; object-fit: cover;
          flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .fp-avatar-placeholder {
          width: 52px; height: 52px; border-radius: 999px; flex-shrink: 0;
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          display: grid; place-items: center; font-size: 18px; font-weight: 800; color: #fff;
        }
        .fp-acc-name { font-weight: 800; font-size: 15px; color: #0f172a; }
        .fp-acc-role { font-size: 11px; color: #94a3b8; margin-top: 2px; }
        .fp-acc-email { font-size: 12px; color: #64748b; margin-top: 3px; }

        /* Method options */
        .fp-method-option {
          display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px;
          background: #fff; border-radius: 14px; border: 2px solid #e2e8f0;
          margin-bottom: 12px; cursor: pointer; transition: all 0.2s;
        }
        .fp-method-option.active { border-color: #4f46e5; background: #f0f0ff; }
        .fp-method-option:hover { border-color: #a5b4fc; }
        .fp-radio {
          width: 20px; height: 20px; border-radius: 999px; border: 2px solid #d7deea;
          display: grid; place-items: center; flex-shrink: 0; margin-top: 1px; transition: all 0.2s;
        }
        .fp-radio.active { border-color: #4f46e5; background: #4f46e5; }
        .fp-radio-dot { width: 8px; height: 8px; border-radius: 999px; background: #fff; }
        .fp-method-title { font-size: 14px; font-weight: 700; color: #0f172a; }
        .fp-method-sub { font-size: 12px; color: #64748b; margin-top: 2px; }

        /* OTP inputs */
        .fp-otp-row { display: flex; gap: 10px; justify-content: center; margin: 12px 0 20px; }
        .fp-otp-input {
          width: 46px; height: 56px; border-radius: 12px; border: 2px solid #d7deea;
          background: #eef2f7; text-align: center; font-size: 22px; font-weight: 800;
          color: #0f172a; outline: none; transition: border-color 0.2s, box-shadow 0.2s;
          font-family: 'Manrope', sans-serif;
        }
        .fp-otp-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }

        /* Buttons */
        .fp-btn {
          width: 100%; border: none; border-radius: 14px; background: #0d1736; color: #fff;
          padding: 14px; font-size: 14px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;
          cursor: pointer; transition: opacity 0.2s, transform 0.2s; font-family: 'Manrope', sans-serif;
        }
        .fp-btn:hover:not(:disabled) { opacity: 0.87; transform: translateY(-1px); }
        .fp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .fp-btn-ghost {
          width: 100%; border: 1.5px solid #d7deea; border-radius: 14px;
          background: transparent; color: #64748b; padding: 12px;
          font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 10px;
          transition: border-color 0.2s, color 0.2s; font-family: 'Manrope', sans-serif;
        }
        .fp-btn-ghost:hover { border-color: #6366f1; color: #4f46e5; }
        .fp-btn-link {
          background: none; border: none; font-size: 13px; font-weight: 700;
          color: #4f46e5; cursor: pointer; font-family: 'Manrope', sans-serif;
          text-decoration: underline; padding: 0;
        }
        .fp-btn-link:disabled { color: #94a3b8; cursor: not-allowed; text-decoration: none; }

        /* Done */
        .fp-done {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; padding: 40px 32px 36px; gap: 14px;
        }
        .fp-done-check {
          width: 72px; height: 72px; border-radius: 999px; background: #10b981;
          display: grid; place-items: center; font-size: 30px; color: #fff;
          Animation: fpPop 0.5s cubic-bezier(0.34,1.56,0.64,1);
          box-shadow: 0 12px 30px rgba(16,185,129,0.35);
        }
        @keyframes fpPop { from { transform: scale(0); } to { transform: scale(1); } }
        .fp-done-title { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 700; }
        .fp-done-sub { font-size: 13px; color: #64748b; line-height: 1.6; }

        .fp-note { margin-top: 18px; text-align: center; font-size: 12px; color: #94a3b8; }
        .fp-note a { color: #4f46e5; text-decoration: none; font-weight: 700; }
      `}</style>

      {/* Topbar */}
      <header className="fp-topbar">
        <div className="fp-topbar-inner">
          <Link href="/" className="fp-brand">
            <span className="fp-brand-mark"><img src="/images/logo.png" alt="Step Out" /></span>
            <span>
              <div className="fp-brand-title">Step Out</div>
              <div className="fp-brand-sub">Studio Hub</div>
            </span>
          </Link>
          <Link className="fp-back-link" href="/signin">← Back to Sign In</Link>
        </div>
      </header>

      <main className="fp-shell">
        <div className="fp-card">
          {/* Banner */}
          <div className="fp-banner">
            <div className="fp-banner-row">
              <div className="fp-banner-icon">🔑</div>
              <div>
                <div className="fp-banner-title">Account Recovery</div>
                <div className="fp-banner-sub">Verify your identity to regain access</div>
              </div>
            </div>
          </div>

          {/* Step pills */}
          {step !== 'done' && (
            <div className="fp-step-pills">
              {(['email','account','method', step === 'code' ? 'code' : 'password'] as const).map((s, i) => {
                const labels = ['Email', 'Account', 'Method', step === 'code' ? 'Verify Code' : 'Password'];
                const stepOrder: Step[] = ['email','account','method', step === 'code' ? 'code' : 'password'];
                const currentIdx = stepOrder.indexOf(step);
                return (
                  <div key={s} className={`fp-pill ${i === currentIdx ? 'active' : i < currentIdx ? 'done' : ''}`}>
                    {i < currentIdx ? `✓ ` : `${i+1}. `}{labels[i]}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="fp-done">
              <div className="fp-done-check">✓</div>
              <div className="fp-done-title">
                Signed In!
              </div>
              <div className="fp-done-sub">
                You have been verified and signed in successfully.
              </div>
              <button className="fp-btn" onClick={() => router.push('/signin')}>
                Go to Dashboard
              </button>
            </div>
          )}

          {/* ── STEP 1: Email ── */}
          {step === 'email' && (
            <div className="fp-body">
              <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
                Enter the email address linked to your account. We'll find your profile.
              </p>
              {error && <div className="fp-error">✗ {error}</div>}
              <label className="fp-label">Email Address</label>
              <input
                className="fp-field" type="email" placeholder="name@studio.com"
                value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLookup()} autoFocus
              />
              <div className="fp-sp" />
              <button className="fp-btn" onClick={handleLookup} disabled={loading}>
                {loading ? '⏳ Searching...' : 'Find Account →'}
              </button>
              <div className="fp-note">Remember your password? <Link href="/signin">Sign In</Link></div>
            </div>
          )}

          {/* ── STEP 2: Account confirm ── */}
          {step === 'account' && account && (
            <div className="fp-body">
              <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b', lineHeight: 1.55 }}>
                We found an account matching that email. Is this you?
              </p>
              <div className="fp-account-card">
                {account.profileImage
                  ? <img className="fp-avatar" src={account.profileImage} alt={account.fullName} />
                  : <div className="fp-avatar-placeholder">{getInitials(account.fullName)}</div>
                }
                <div>
                  <div className="fp-acc-name">{account.fullName}</div>
                  <div className="fp-acc-role">{getRoleLabel(account.role)}</div>
                  <div className="fp-acc-email">{account.maskedEmail}</div>
                </div>
              </div>
              <button className="fp-btn" onClick={handleAccountConfirm}>This is Me →</button>
              <button className="fp-btn-ghost" onClick={() => { setStep('email'); setAccount(null); setError(''); }}>
                Not Me — Try Again
              </button>
            </div>
          )}

          {/* ── STEP 3: Choose method ── */}
          {step === 'method' && account && (
            <div className="fp-body">
              <p style={{ margin: '0 0 18px', fontSize: '14px', color: '#64748b' }}>
                Choose how you'd like to recover your account, <strong style={{color:'#0f172a'}}>{account.fullName.split(' ')[0]}</strong>.
              </p>

              <div className="fp-method-option active"
                onClick={() => setMethod('code')}
                style={method === 'code' ? { borderColor: '#4f46e5', background: '#f0f0ff' } : {}}
              >
                <div className={`fp-radio ${method === 'code' ? 'active' : ''}`}>
                  {method === 'code' && <div className="fp-radio-dot" />}
                </div>
                <div>
                  <div className="fp-method-title">📧 Get code via email</div>
                  <div className="fp-method-sub">{account.maskedEmail}</div>
                  <div className="fp-method-sub" style={{marginTop:2}}>We'll send a 6-digit code to sign you in</div>
                </div>
              </div>

              <div className="fp-method-option"
                onClick={() => setMethod('password')}
                style={method === 'password' ? { borderColor: '#4f46e5', background: '#f0f0ff' } : {}}
              >
                <div className={`fp-radio ${method === 'password' ? 'active' : ''}`}>
                  {method === 'password' && <div className="fp-radio-dot" />}
                </div>
                <div>
                  <div className="fp-method-title">🔑 Continue with password</div>
                  <div className="fp-method-sub">Use your password to continue</div>
                </div>
              </div>

              <div className="fp-sp" />
              <button className="fp-btn" onClick={handleMethodContinue} disabled={codeSending}>
                {codeSending ? '⏳ Sending...' : 'Continue →'}
              </button>
              <button className="fp-btn-ghost" onClick={() => setStep('account')}>← Back</button>
            </div>
          )}

          {/* ── STEP 4a: Enter code ── */}
          {step === 'code' && (
            <div className="fp-body">
              <p style={{ margin: '0 0 6px', fontSize: '14px', color: '#64748b', lineHeight: 1.6 }}>
                We sent a 6-digit code to <strong style={{color:'#0f172a'}}>{account?.maskedEmail}</strong>. Enter it below to sign in.
              </p>

              {codeError && <div className="fp-error">✗ {codeError}</div>}

              <div className="fp-otp-row">
                {codeDigits.map((d, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    className="fp-otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleCodeDigit(i, e.target.value)}
                    onKeyDown={e => handleCodeKeyDown(i, e)}
                  />
                ))}
              </div>

              <button className="fp-btn" onClick={handleVerifyCode} disabled={codeVerifying}>
                {codeVerifying ? '⏳ Verifying...' : '✓ Confirm Code'}
              </button>

              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <button
                  className="fp-btn-link"
                  onClick={sendCode}
                  disabled={resendCooldown > 0 || codeSending}
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't get a code? Resend"}
                </button>
              </div>

              <button className="fp-btn-ghost" onClick={() => setStep('method')}>← Back</button>
            </div>
          )}

          {/* ── STEP 4b: Continue with password ── */}
          {step === 'password' && (
            <div className="fp-body">
              <p style={{ margin: '0 0 18px', fontSize: '14px', color: '#64748b' }}>
                Enter your current password for <strong style={{color:'#0f172a'}}>{account?.fullName}</strong> to continue.
              </p>

              {pwError && <div className="fp-error">✗ {pwError}</div>}

              <label className="fp-label">Password</label>
              <div className="fp-field-wrap">
                <input
                  className="fp-field" type={showPw ? 'text' : 'password'}
                  placeholder="Enter your password" style={{paddingRight:'42px'}}
                  value={currentPassword} onChange={e => { setCurrentPassword(e.target.value); setPwError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handlePasswordContinue()}
                  autoFocus
                />
                <button className="fp-eye" type="button" onClick={() => setShowPw(v => !v)}>{showPw ? '🙈' : '👁️'}</button>
              </div>

              <div className="fp-sp" />
              <button className="fp-btn" onClick={handlePasswordContinue} disabled={pwLoading}>
                {pwLoading ? '⏳ Checking...' : 'Continue →'}
              </button>
              <button className="fp-btn-ghost" onClick={() => setStep('method')}>← Back</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
