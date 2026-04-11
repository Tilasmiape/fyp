'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

interface SigninData {
  email: string;
  password: string;
}

export default function SigninPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SigninData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password) newErrors.password = 'Password is required';
    return newErrors;
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const result = await response.json();
        if (response.ok) {
          setAttemptsRemaining(null);
          setLockedUntil(null);
          const userRole = result.user?.role || 'client';
          if (userRole === 'super-admin') {
            router.push('/admin/home');
          } else if (userRole === 'choreographer') {
            router.push('/choreographer/home');
          } else {
            router.push('/client/home');
          }
        } else {
          if (result?.locked) {
            setLockedUntil(result.lockedUntil || null);
            setAttemptsRemaining(0);
            setErrors({ submit: result.error });
          } else if (result?.attemptsRemaining !== undefined) {
            setAttemptsRemaining(result.attemptsRemaining);
            setLockedUntil(null);
            setErrors({ submit: result.error });
          } else if (response.status === 403 && result?.reason) {
            setErrors({ submit: result.reason });
          } else {
            setErrors({ submit: result?.error || 'Invalid email or password!' });
          }
        }
      } catch (error) {
        console.error('Login error:', error);
        setErrors({ submit: 'Error during login.' });
      } finally {
        setLoading(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="auth-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

        .auth-page {
          min-height: 100vh;
          background: #d5d9e8;
          font-family: 'Manrope', sans-serif;
          color: #0f172a;
        }
        .topbar {
          height: 56px;
          background: rgba(255,255,255,0.82);
          border-bottom: 1px solid #dbe1ef;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .topbar-inner {
          width: min(1100px, calc(100% - 28px));
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: inherit;
        }
        .brand-mark {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          background: #fff;
          box-shadow: 0 6px 14px rgba(15, 27, 60, 0.18);
          overflow: hidden;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .brand-mark img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.2);
        }
        .brand-text {
          line-height: 1;
        }
        .brand-title {
          font-weight: 800;
          font-size: 25px;
          letter-spacing: -0.3px;
        }
        .brand-sub {
          margin-top: 2px;
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #f2a900;
          font-weight: 700;
        }
        .top-actions {
          display: flex;
          align-items: center;
          gap: 22px;
        }
        .top-link {
          font-size: 11px;
          letter-spacing: 1px;
          font-weight: 700;
          color: #6b7280;
          text-decoration: none;
          text-transform: uppercase;
        }
        .top-link.active { color: #0f172a; }
        .cta {
          background: #0d1736;
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 8px 18px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          cursor: pointer;
        }

        .shell {
          min-height: calc(100vh - 56px);
          display: grid;
          place-items: center;
          padding: 34px 16px;
        }
        .card {
          width: min(960px, 100%);
          background: #f4f5f7;
          border-radius: 30px;
          overflow: hidden;
          box-shadow: 0 26px 55px rgba(37, 45, 72, 0.25);
          display: grid;
          grid-template-columns: 34% 66%;
          min-height: 560px;
        }
        .visual {
          position: relative;
          background: #7f82b5;
          overflow: hidden;
        }
        .visual img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: saturate(75%) contrast(94%);
          opacity: 0.9;
        }
        .visual::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(62, 59, 128, 0.25) 0%, rgba(49, 50, 98, 0.58) 100%);
        }
        .visual-copy {
          position: absolute;
          left: 28px;
          right: 28px;
          bottom: 26px;
          color: #fff;
          z-index: 2;
        }
        .visual-copy h3 {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: 39px;
          line-height: 1.08;
        }
        .visual-copy p {
          margin: 10px 0 0;
          font-size: 14px;
          line-height: 1.45;
          color: rgba(255,255,255,0.86);
        }

        .form-wrap {
          padding: 38px 34px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .form-inner {
          width: 100%;
          max-width: 395px;
        }
        .heading {
          text-align: center;
          margin-bottom: 22px;
        }
        .heading h1 {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: 47px;
          color: #0f1b3c;
          letter-spacing: -0.6px;
        }
        .heading p {
          margin: 4px 0 0;
          font-size: 10px;
          color: #94a3b8;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-weight: 700;
        }

        .label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.15px;
          color: #94a3b8;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .field {
          width: 100%;
          border-radius: 11px;
          border: 1px solid #d7deea;
          background: #eef2f7;
          padding: 12px 14px;
          font-size: 14px;
          color: #1f2937;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }
        .field:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }
        .field::placeholder { color: #9ca3af; }

        .error-box {
          padding: 10px 12px;
          border-radius: 10px;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #b91c1c;
          font-size: 12px;
          margin-bottom: 12px;
        }
        .error-text {
          margin-top: 4px;
          font-size: 11px;
          color: #b91c1c;
        }

        .role-shell {
          margin-top: 14px;
        }
        .role-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .role-chip {
          border-radius: 11px;
          border: 1px solid #d7deea;
          background: #f8fafc;
          color: #64748b;
          padding: 9px 10px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          font-weight: 800;
          text-align: center;
        }
        .role-chip.active {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff;
          border-color: #4f46e5;
          box-shadow: 0 8px 18px rgba(79, 70, 229, 0.35);
        }

        .meta-row {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #94a3b8;
          font-weight: 700;
        }
        .recovery {
          color: #4f46e5;
          text-decoration: none;
        }

        .submit {
          margin-top: 12px;
          width: 100%;
          border: none;
          border-radius: 15px;
          background: #0d1736;
          color: #fff;
          padding: 13px 16px;
          font-size: 18px;
          text-transform: uppercase;
          letter-spacing: 2px;
          font-weight: 800;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        .submit:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .join-note {
          margin-top: 16px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
        }
        .join-note a {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        @media (max-width: 900px) {
          .card {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .visual { min-height: 260px; }
          .form-wrap { padding: 28px 22px 34px; }
          .heading h1 { font-size: 39px; }
        }
      `}</style>

      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <img src="/images/logo.png" alt="Step Out Logo" />
            </span>
            <span className="brand-text">
              <div className="brand-title">Step Out</div>
              <div className="brand-sub">Studio Hub</div>
            </span>
          </Link>
          <div className="top-actions">
            <Link className="top-link" href="/">Home</Link>
            <Link className="top-link active" href="/signin">Sign In</Link>
            <button className="cta" onClick={() => router.push('/signup')}>Join Now</button>
          </div>
        </div>
      </header>

      <main className="shell">
        <section className="card">
          <aside className="visual">
            <img src="/images/signin.jpg" alt="Step Out" />
            <div className="visual-copy">
              <h3>Master Your Art Form</h3>
              <p>Join Nepal&apos;s most elite collective of artists and enthusiasts.</p>
            </div>
          </aside>

          <div className="form-wrap">
            <div className="form-inner">
              <div className="heading">
                <h1>Welcome Back</h1>
                <p>Step Out Studio Hub</p>
              </div>

              {errors.submit && (
                <div className="error-box">
                  {errors.submit}
                  {attemptsRemaining !== null && attemptsRemaining > 0 && (
                    <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '5px 8px' }}>
                      ⚠️ {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining before lockout
                    </div>
                  )}
                  {lockedUntil && (
                    <div style={{ marginTop: '6px', fontSize: '11px', fontWeight: 700, color: '#991b1b' }}>
                      🔒 Try again after {new Date(lockedUntil).toLocaleTimeString()}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSignin}>
                <label className="label">Email Address</label>
                <input
                  className="field"
                  type="email"
                  name="email"
                  placeholder="name@studio.com"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <div className="error-text">{errors.email}</div>}

                <div style={{ height: 14 }} />

                <label className="label">Password</label>
                <input
                  className="field"
                  type="password"
                  name="password"
                  placeholder="******"
                  value={formData.password}
                  onChange={handleChange}
                />
                {errors.password && <div className="error-text">{errors.password}</div>}

                

                <div className="meta-row">
                  <span>Stay Logged In</span>
                  <Link href="/forgot-password" className="recovery">Forgot Password?</Link>
                </div>

                <button type="submit" className="submit" disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <div className="join-note">
                New to the studio? <Link href="/signup">Join Collective</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
