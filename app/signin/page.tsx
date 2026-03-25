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
        
        if (response.ok) {
          const result = await response.json();
          if (result.token) {
            document.cookie = `authToken=${result.token}; path=/; max-age=86400`;
          }
          const userRole = result.user?.role || 'client';
          if (userRole === 'super-admin') {
            router.push('/admin/home');
          } else if (userRole === 'choreographer') {
            router.push('/choreographer/home');
          } else {
            router.push('/client/home');
          }
        } else {
          setErrors({ submit: 'Invalid email or password!' });
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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        display: 'flex',
        backgroundColor: 'rgba(20, 20, 35, 0.95)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        maxWidth: '1000px',
        width: '100%',
        minHeight: '550px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
      }}>
       {/* LEFT SIDE - BACKGROUND IMAGE */}
<div style={{
  flex: 1.5,
  position: 'relative',
  background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '30px',
  overflow: 'hidden',
}}>
  {/* Background Image */}
  <img 
    src="/images/signin.png"
    alt="dancers"
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '110%',
      height: '100%',
      objectFit: 'cover',
      zIndex: 1,
    }}
  />

  {/* Logo Badge (On Top!) */}
  <div style={{
    position: 'absolute',
    top: 30,
    left: 30,
    width: '70px',
    height: '70px',
    borderRadius: '50%',
    backgroundColor: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid rgba(251, 191, 36, 0.5)',
    boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    zIndex: 10,  // ← IMPORTANT!
  }}>
    <img 
      src="/images/logo.png"
      alt="Logo"
      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2)' }}
    />
  </div>
</div>

        {/* RIGHT SIDE - FORM CARD */}
        <div style={{
          flex: 1,
          padding: '50px 45px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          color: 'white',
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '6px',
            color: '#fbbf24',
          }}>
            Sign In
          </h1>
          
          <p style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '28px',
          }}>
            Enter your credentials to continue
          </p>

          {/* Error Message */}
          {errors.submit && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: 'rgba(255, 107, 107, 0.2)',
              border: '1px solid rgba(255, 107, 107, 0.5)',
              borderRadius: '6px',
              color: '#ff6b6b',
              fontSize: '12px',
              marginBottom: '16px',
            }}>
              {errors.submit}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignin} style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* Email */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '6px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}>
                Email
              </label>
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${errors.email ? '#ff6b6b' : 'rgba(255, 255, 255, 0.2)'}`,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#333',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.6)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.email ? '#ff6b6b' : 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {errors.email && <p style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '3px' }}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '6px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}>
                Password
              </label>
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '6px',
                  border: `1px solid ${errors.password ? '#ff6b6b' : 'rgba(255, 255, 255, 0.2)'}`,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#333',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.3s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(251, 191, 36, 0.6)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251, 191, 36, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.password ? '#ff6b6b' : 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              {errors.password && <p style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '3px' }}>{errors.password}</p>}
            </div>

            {/* Forgot Password Link */}
            <div style={{ textAlign: 'right' }}>
              <Link href="/forgot-password" style={{
                fontSize: '12px',
                color: '#fbbf24',
                textDecoration: 'none',
                fontWeight: '600',
                transition: 'color 0.3s',
              }}>
                Forgot Password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#999' : '#fbbf24',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
                transition: 'all 0.3s',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#f59e0b';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#fbbf24';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <p style={{
            textAlign: 'center',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: '20px',
          }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{
              color: '#fbbf24',
              textDecoration: 'none',
              fontWeight: '700',
            }}>
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

