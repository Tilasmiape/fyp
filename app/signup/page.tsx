'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import Link from 'next/link';

interface SignupData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: string;
  dob: string;
  phoneNumber: string;
  role: string;
  danceStyles: string[];
}

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<SignupData>({
    role: 'client',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    gender: '',
    dob: '',
    phoneNumber: '',
    danceStyles: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const availableDanceStyles = [
    'Bollywood',
    'Hip Hop',
    'Contemporary',
    'Classical',
    'Folk',
    'Jazz',
    'Salsa',
    'Kathak',
    'Bharatanatyam',
    'Break Dance',
    'Freestyle',
  ];

  const handleDanceStyleToggle = (style: string) => {
    setFormData((prev) => ({
      ...prev,
      danceStyles: prev.danceStyles.includes(style)
        ? prev.danceStyles.filter((s) => s !== style)
        : [...prev.danceStyles, style],
    }));
    // Clear error when user selects a style
    if (errors.danceStyles) {
      setErrors((prev) => ({ ...prev, danceStyles: '' }));
    }
  };

  const validateField = useCallback((name: string, value: string | string[]) => {
    let error = '';

    switch (name) {
      case 'fullName':
        const strValue = value as string;
        if (!strValue.trim()) error = 'Full name is required';
        else if (strValue.trim().length < 2) error = 'Name must be at least 2 characters';
        else if (strValue.trim().length > 50) error = 'Name must be less than 50 characters';
        else if (!/^[a-zA-Z\s\-']+$/.test(strValue.trim())) error = 'Only letters, spaces, hyphens, and apostrophes allowed';
        break;

      case 'email':
        const emailValue = value as string;
        if (!emailValue) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) error = 'Invalid email format';
        else if (emailValue.length > 100) error = 'Email too long (max 100 chars)';
        break;

      case 'password':
        const passValue = value as string;
        if (!passValue) error = 'Password is required';
        else if (passValue.length < 8) error = 'Password must be at least 8 characters';
        else if (!/[A-Z]/.test(passValue)) error = 'Password must contain uppercase letter';
        else if (!/[a-z]/.test(passValue)) error = 'Password must contain lowercase letter';
        else if (!/[0-9]/.test(passValue)) error = 'Password must contain number';
        else if (!/[!@#$%^&*(),.?":{}|<>]/.test(passValue)) error = 'Password must contain special character';
        break;

      case 'confirmPassword':
        const confirmValue = value as string;
        if (!confirmValue) error = 'Please confirm your password';
        else if (confirmValue !== formData.password) error = 'Passwords do not match';
        break;

      case 'gender':
        if (!value) error = 'Please select your gender';
        break;

      case 'dob':
        const dobValue = value as string;
        if (!dobValue) error = 'Date of birth is required';
        else {
          const birthDate = new Date(dobValue);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          if (age < 16) error = 'Must be at least 16 years old';
          else if (age > 130) error = 'Invalid birth date';
        }
        break;

      case 'phoneNumber':
        const phoneValue = value as string;
        const cleanedPhone = phoneValue.replace(/\D/g, '');
        if (!phoneValue.trim()) error = 'Phone number is required';
        else if (cleanedPhone.length !== 10) error = 'Must be exactly 10 digits';
        else if (!cleanedPhone.startsWith('98')) error = 'Must start with 98 (Nepali format)';
        break;

      case 'danceStyles':
        const stylesArray = value as string[];
        if (formData.role === 'choreographer' && stylesArray.length === 0) {
          error = 'Please select at least one dance style';
        }
        break;
    }

    return error;
  }, [formData.password, formData.role]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (touched[name as keyof SignupData]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach(key => {
      if (key === 'role') return; // role has default
      if (key === 'danceStyles') {
        const error = validateField(key, formData.danceStyles);
        if (error) newErrors[key] = error;
      } else {
        const error = validateField(key, formData[key as keyof SignupData] as string);
        if (error) newErrors[key] = error;
      }
    });
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            role: formData.role,
            fullName: formData.fullName.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            gender: formData.gender,
            dateOfBirth: formData.dob,
            phoneNumber: formData.phoneNumber.replace(/\D/g, ''),
            danceStyles: formData.role === 'choreographer' ? formData.danceStyles : [],
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.token) {
            document.cookie = `authToken=${result.token}; path=/; max-age=86400`;
          }
          router.push(formData.role === 'choreographer' ? '/choreographer/home' : '/client/home');
        } else {
          const errorData = await response.json();
          setErrors({ submit: errorData.message || 'Signup failed!' });
        }
      } catch (error) {
        console.error('Signup error:', error);
        setErrors({ submit: 'Network error. Please try again.' });
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
      background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 50%, #6c3483 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '1400px',
        minHeight: '900px',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
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
            src="/images/signup.png"
            alt="dancers"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '110%',
              objectFit: 'cover',
              zIndex: 1,
            }}
          />

          {/* Logo Badge */}
          <div style={{
            position: 'absolute',
            top: 30,
            left: 30,
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            backgroundColor: 'rgba(251, 191, 36, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(251, 191, 36, 0.5)',
            boxShadow: '0 10px 25px rgba(251, 191, 36, 0.2)',
            overflow: 'hidden',
            zIndex: 10,
          }}>
            <img
              src="/images/logo.png"
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* RIGHT SIDE - FORM */}
        <div style={{
          flex: 1,
          padding: '50px 40px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          backgroundColor: 'rgba(20, 20, 35, 0.95)',
          position: 'relative',
          color: 'white',
          overflowY: 'auto',
          maxHeight: '900px',
        }}>


          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '8px',
          }}>
            Create Account
          </h1>
          <p style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '24px',
          }}>
            Book Choreography Classes
          </p>

          {/* Role Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '10px',
              color: 'rgba(255, 255, 255, 0.95)',
            }}>
              Choose Role *
            </label>
            <div style={{ display: 'flex', gap: '20px' }}>
              {(['client', 'choreographer'] as const).map(role => (
                <label key={role} style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '6px',
                }}>
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={formData.role === role}
                    onChange={handleChange}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                      accentColor: '#fbbf24',
                    }}
                  />
                  <span style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    textTransform: 'capitalize',
                  }}>
                    {role}
                  </span>
                </label>
              ))}
            </div>
          </div>

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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Full Name */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: 'rgba(255, 255, 255, 0.95)', display: 'block' }}>
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="Enter full name"
                value={formData.fullName}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: errors.fullName ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#333',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              {errors.fullName && <span style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.fullName}</span>}
            </div>

            {/* Email */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: 'rgba(255, 255, 255, 0.95)', display: 'block' }}>
                Email *
              </label>
              <input
                type="email"
                name="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: errors.email ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#333',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              {errors.email && <span style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.email}</span>}
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: 'rgba(255, 255, 255, 0.95)', display: 'block' }}>
                Password *
              </label>
              <input
                type="password"
                name="password"
                placeholder="Create strong password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: errors.password ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#333',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              {errors.password && <span style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.password}</span>}
              <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px' }}>
                Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: 'rgba(255, 255, 255, 0.95)', display: 'block' }}>
                Confirm Password *
              </label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: errors.confirmPassword ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#333',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              {errors.confirmPassword && <span style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.confirmPassword}</span>}
            </div>

            {/* Gender */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: 'rgba(255, 255, 255, 0.95)', display: 'block' }}>
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: errors.gender ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#333',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                }}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <span style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.gender}</span>}
            </div>

            {/* Date of Birth */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: 'rgba(255, 255, 255, 0.95)', display: 'block' }}>
                Date of Birth *
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                onBlur={handleBlur}
                max={new Date().toISOString().split('T')[0]}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: errors.dob ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#333',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              {errors.dob && <span style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.dob}</span>}
            </div>

            {/* Phone Number */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: 'rgba(255, 255, 255, 0.95)', display: 'block' }}>
                Phone Number *
              </label>
              <input
                type="tel"
                name="phoneNumber"
                placeholder="98XXXXXXXX"
                value={formData.phoneNumber}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: errors.phoneNumber ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  color: '#333',
                  fontSize: '13px',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              {errors.phoneNumber && <span style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.phoneNumber}</span>}
            </div>

            {/* Dance Styles - Only for Choreographer */}
            {formData.role === 'choreographer' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '5px', color: 'rgba(255, 255, 255, 0.95)', display: 'block' }}>
                  Dance Styles * (Select all that apply)
                </label>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: errors.danceStyles ? '1px solid #ff6b6b' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '12px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {availableDanceStyles.map((style) => (
                      <label
                        key={style}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '4px',
                          transition: 'background-color 0.2s',
                          fontSize: '13px',
                          color: 'rgba(255, 255, 255, 0.9)',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <input
                          type="checkbox"
                          checked={formData.danceStyles.includes(style)}
                          onChange={() => handleDanceStyleToggle(style)}
                          style={{
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer',
                            accentColor: '#fbbf24',
                          }}
                        />
                        {style}
                      </label>
                    ))}
                  </div>
                </div>
                {errors.danceStyles && <span style={{ color: '#ff6b6b', fontSize: '11px', marginTop: '3px', display: 'block' }}>{errors.danceStyles}</span>}
                {formData.danceStyles.length > 0 && (
                  <p style={{ fontSize: '11px', color: '#4ade80', marginTop: '6px' }}>
                    Selected: {formData.danceStyles.join(', ')}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '11px 20px',
                backgroundColor: loading ? '#999' : '#fbbf24',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
                width: '100%',
              }}
            >
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginTop: '16px',
          }}>
            Already have an account?{' '}
            <Link href="/signin" style={{
              color: '#fbbf24',
              textDecoration: 'none',
              fontWeight: '700',
            }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}