'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';

interface SignupData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: string;
  dob: string;
  phoneNumber: string;
  location: string;
  role: string;
  danceStyles: string[];
  certificatePhoto: string;
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
    location: '',
    danceStyles: [],
    certificatePhoto: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const [availableDanceStyles, setAvailableDanceStyles] = useState<string[]>([]);
  
  useEffect(() => {
    fetch('/api/dance-styles')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.styles) {
          setAvailableDanceStyles(data.styles);
        }
      })
      .catch(err => console.error('Error fetching dance styles', err));
  }, []);
  const handleDanceStyleToggle = (style: string) => {
    setFormData((prev) => ({
      ...prev,
      danceStyles: prev.danceStyles.includes(style)
        ? prev.danceStyles.filter((s) => s !== style)
        : [...prev.danceStyles, style],
    }));
    if (errors.danceStyles) {
      setErrors((prev) => ({ ...prev, danceStyles: '' }));
    }
  };

  const validateField = useCallback((name: string, value: string | string[]) => {
    let error = '';

    switch (name) {
      case 'fullName': {
        const strValue = value as string;
        if (!strValue.trim()) error = 'Full name is required';
        else if (strValue.trim().length < 2) error = 'Name must be at least 2 characters';
        else if (strValue.trim().length > 50) error = 'Name must be less than 50 characters';
        else if (!/^[a-zA-Z\s\-']+$/.test(strValue.trim())) error = 'Only letters, spaces, hyphens, and apostrophes allowed';
        break;
      }
      case 'email': {
        const emailValue = value as string;
        if (!emailValue) error = 'Email is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) error = 'Invalid email format';
        else if (emailValue.length > 100) error = 'Email too long (max 100 chars)';
        break;
      }
      case 'password': {
        const passValue = value as string;
        if (!passValue) error = 'Password is required';
        else if (passValue.length < 8) error = 'Password must be at least 8 characters';
        else if (!/[A-Z]/.test(passValue)) error = 'Password must contain uppercase letter';
        else if (!/[a-z]/.test(passValue)) error = 'Password must contain lowercase letter';
        else if (!/[0-9]/.test(passValue)) error = 'Password must contain number';
        else if (!/[!@#$%^&*(),.?":{}|<>]/.test(passValue)) error = 'Password must contain special character';
        break;
      }
      case 'confirmPassword': {
        const confirmValue = value as string;
        if (!confirmValue) error = 'Please confirm your password';
        else if (confirmValue !== formData.password) error = 'Passwords do not match';
        break;
      }
      case 'gender':
        if (!value) error = 'Please select your gender';
        break;
      case 'dob': {
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
      }
      case 'phoneNumber': {
        const phoneValue = value as string;
        const cleanedPhone = phoneValue.replace(/\D/g, '');
        if (!phoneValue.trim()) error = 'Phone number is required';
        else if (cleanedPhone.length !== 10) error = 'Must be exactly 10 digits';
        else if (!cleanedPhone.startsWith('98')) error = 'Must start with 98 (Nepali format)';
        break;
      }
      case 'location': {
        const locValue = value as string;
        if (locValue && locValue.trim().length > 120) error = 'Address too long (max 120 chars)';
        break;
      }
      case 'danceStyles': {
        const stylesArray = value as string[];
        if (formData.role === 'choreographer' && stylesArray.length === 0) {
          error = 'Please select at least one dance style';
        }
        break;
      }
    }

    return error;
  }, [formData.password, formData.role]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (verificationStep && ['email', 'fullName', 'password', 'phoneNumber', 'role'].includes(name)) {
      setVerificationStep(false);
      setVerificationCode('');
      setSuccessMessage('');
      setErrors((prev) => ({ ...prev, verificationCode: '' }));
    }
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

  const handleCertificatePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, certificatePhoto: reader.result as string }));
      setErrors(prev => ({ ...prev, certificatePhoto: '' }));
    };
    reader.readAsDataURL(file);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    Object.keys(formData).forEach(key => {
      if (key === 'role') return;
      if (key === 'danceStyles') {
        const error = validateField(key, formData.danceStyles);
        if (error) newErrors[key] = error;
      } else {
        const error = validateField(key, formData[key as keyof SignupData] as string);
        if (error) newErrors[key] = error;
      }
    });
    if (formData.role === 'choreographer' && !formData.certificatePhoto) {
      newErrors.certificatePhoto = 'Dance certificate photo is required';
    }
    return newErrors;
  };

  const buildSignupPayload = () => ({
    role: formData.role,
    fullName: formData.fullName.trim(),
    email: formData.email.trim().toLowerCase(),
    password: formData.password,
    gender: formData.gender,
    dateOfBirth: formData.dob,
    phoneNumber: formData.phoneNumber.replace(/\D/g, ''),
    location: formData.location.trim(),
    danceStyles: formData.role === 'choreographer' ? formData.danceStyles : [],
    certificatePhoto: formData.role === 'choreographer' ? formData.certificatePhoto : '',
  });

  const requestVerificationCode = async () => {
    const response = await fetch('/api/auth/signup/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSignupPayload()),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result?.error || result?.message || 'Unable to send verification code.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = verificationStep ? {} : validateForm();
    setSuccessMessage('');

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        if (!verificationStep) {
          await requestVerificationCode();
          setVerificationStep(true);
          setErrors({});
          setSuccessMessage('A verification code has been sent to your email. Enter it below to complete registration.');
          return;
        }

        if (!verificationCode.trim()) {
          setErrors({ verificationCode: 'Verification code is required' });
          return;
        }

        const verifyResponse = await fetch('/api/auth/signup/verify-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
            code: verificationCode.trim(),
          }),
        });
        const verifyResult = await verifyResponse.json();
        if (!verifyResponse.ok) {
          setErrors({ verificationCode: verifyResult?.error || 'Invalid verification code.' });
          return;
        }

        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...buildSignupPayload(),
            verificationToken: verifyResult.verificationToken,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (formData.role === 'choreographer') {
            const confirmationMessage = result.message || 'Your request is sent. Please wait for admin review.';
            setSuccessMessage(confirmationMessage);
            setErrors({});
            alert(confirmationMessage);
            setTimeout(() => router.push('/signin'), 1800);
            return;
          }
          router.push('/client/home');
        } else {
          const errorData = await response.json();
          setErrors({ submit: errorData.error || errorData.message || 'Signup failed!' });
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

  const handleResendCode = async () => {
    setLoading(true);
    setErrors((prev) => ({ ...prev, verificationCode: '' }));
    try {
      await requestVerificationCode();
      setSuccessMessage('A new verification code has been sent to your email.');
    } catch (error: any) {
      setErrors({ submit: error?.message || 'Unable to resend verification code.' });
    } finally {
      setLoading(false);
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
        .brand-title { font-weight: 800; font-size: 25px; letter-spacing: -0.3px; line-height: 1; }
        .brand-sub {
          margin-top: 2px;
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #f2a900;
          font-weight: 700;
          line-height: 1;
        }
        .top-actions { display: flex; align-items: center; gap: 22px; }
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
          width: min(1040px, 100%);
          background: #f4f5f7;
          border-radius: 30px;
          overflow: hidden;
          box-shadow: 0 26px 55px rgba(37, 45, 72, 0.25);
          display: grid;
          grid-template-columns: 32% 68%;
          min-height: 680px;
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
          filter: saturate(76%) contrast(94%);
          opacity: 0.9;
        }
        .visual::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(62, 59, 128, 0.24) 0%, rgba(49, 50, 98, 0.6) 100%);
        }
        .visual-copy {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 24px;
          color: #fff;
          z-index: 2;
        }
        .visual-copy h3 {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: 34px;
          line-height: 1.1;
        }
        .visual-copy p {
          margin: 10px 0 0;
          font-size: 13px;
          line-height: 1.45;
          color: rgba(255,255,255,0.86);
        }

        .form-wrap {
          padding: 34px 32px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .form-inner {
          width: 100%;
          max-width: 470px;
          max-height: 86vh;
          overflow: auto;
          padding-right: 6px;
        }
        .heading {
          text-align: center;
          margin-bottom: 18px;
        }
        .heading h1 {
          margin: 0;
          font-family: 'Playfair Display', serif;
          font-size: 44px;
          color: #0f1b3c;
          letter-spacing: -0.5px;
        }
        .heading p {
          margin: 4px 0 0;
          font-size: 10px;
          color: #94a3b8;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          font-weight: 700;
        }

        .error-box {
          padding: 10px 12px;
          border-radius: 10px;
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #b91c1c;
          font-size: 12px;
          margin-bottom: 12px;
        }
        .success-box {
          padding: 10px 12px;
          border-radius: 10px;
          background: #ecfdf5;
          border: 1px solid #86efac;
          color: #166534;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 1.1px;
          color: #94a3b8;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .field,
        .select {
          width: 100%;
          border-radius: 11px;
          border: 1px solid #d7deea;
          background: #eef2f7;
          padding: 11px 12px;
          font-size: 14px;
          color: #1f2937;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
          font-family: inherit;
        }
        .field:focus,
        .select:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
        }
        .field::placeholder { color: #9ca3af; }
        .field.error,
        .select.error { border-color: #f87171; }

        .error-text {
          margin-top: 4px;
          font-size: 11px;
          color: #b91c1c;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .role-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .role-btn {
          border-radius: 11px;
          border: 1px solid #d7deea;
          background: #f8fafc;
          color: #64748b;
          padding: 10px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.9px;
          font-weight: 800;
          cursor: pointer;
        }
        .role-btn.active {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: #fff;
          border-color: #4f46e5;
          box-shadow: 0 8px 18px rgba(79, 70, 229, 0.35);
        }

        .styles-box {
          border-radius: 11px;
          border: 1px solid #d7deea;
          background: #f8fafc;
          padding: 10px;
          max-height: 170px;
          overflow: auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .style-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #334155;
        }
        .style-item input { accent-color: #4f46e5; }

        .file-shell {
          border-radius: 11px;
          border: 1px solid #d7deea;
          background: #eef2f7;
          padding: 8px 10px;
        }

        .submit {
          margin-top: 12px;
          width: 100%;
          border: none;
          border-radius: 15px;
          background: #0d1736;
          color: #fff;
          padding: 13px 16px;
          font-size: 16px;
          text-transform: uppercase;
          letter-spacing: 1.4px;
          font-weight: 800;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        .submit:disabled { opacity: 0.65; cursor: not-allowed; }

        .signin-note {
          margin-top: 14px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
        }
        .signin-note a {
          color: #4f46e5;
          text-decoration: none;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        @media (max-width: 980px) {
          .card {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .visual { min-height: 240px; }
          .form-wrap { padding: 24px 20px 28px; }
          .heading h1 { font-size: 36px; }
          .form-grid { grid-template-columns: 1fr; }
          .styles-box { grid-template-columns: 1fr; }
        }
      `}</style>

      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <img src="/images/logo.png" alt="Step Out Logo" />
            </span>
            <span>
              <div className="brand-title">Step Out</div>
              <div className="brand-sub">Studio Hub</div>
            </span>
          </Link>
          <div className="top-actions">
            <Link className="top-link" href="/">Home</Link>
            <Link className="top-link" href="/signin">Sign In</Link>
            <button className="cta" onClick={() => router.push('/signup')}>Join Now</button>
          </div>
        </div>
      </header>

      <main className="shell">
        <section className="card">
          <aside className="visual">
            <img src="/images/signup.png" alt="Join Step Out" />
            <div className="visual-copy">
              <h3>Own Your Next Stage</h3>
              <p>Become part of a focused studio collective built for growth and performance.</p>
            </div>
          </aside>

          <div className="form-wrap">
            <div className="form-inner">
              <div className="heading">
                <h1>Join Collective</h1>
                <p>Step Out Studio Hub</p>
              </div>

              {errors.submit && <div className="error-box">{errors.submit}</div>}
              {successMessage && <div className="success-box">{successMessage}</div>}

              <form onSubmit={handleSubmit}>
                <label className="label">I Am Joining As</label>
                <div className="role-row" style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    className={`role-btn ${formData.role === 'client' ? 'active' : ''}`}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, role: 'client' }));
                      setVerificationStep(false);
                      setVerificationCode('');
                      setSuccessMessage('');
                    }}
                  >
                    Client
                  </button>
                  <button
                    type="button"
                    className={`role-btn ${formData.role === 'choreographer' ? 'active' : ''}`}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, role: 'choreographer' }));
                      setVerificationStep(false);
                      setVerificationCode('');
                      setSuccessMessage('');
                    }}
                  >
                    Choreographer
                  </button>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="label">Full Name</label>
                    <input className={`field ${errors.fullName ? 'error' : ''}`} type="text" name="fullName" value={formData.fullName} onChange={handleChange} onBlur={handleBlur} placeholder="Enter full name" />
                    {errors.fullName && <div className="error-text">{errors.fullName}</div>}
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input className={`field ${errors.email ? 'error' : ''}`} type="email" name="email" value={formData.email} onChange={handleChange} onBlur={handleBlur} placeholder="name@studio.com" />
                    {errors.email && <div className="error-text">{errors.email}</div>}
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input className={`field ${errors.password ? 'error' : ''}`} type="password" name="password" value={formData.password} onChange={handleChange} onBlur={handleBlur} placeholder="Create strong password" />
                    {errors.password && <div className="error-text">{errors.password}</div>}
                  </div>
                  <div>
                    <label className="label">Confirm Password</label>
                    <input className={`field ${errors.confirmPassword ? 'error' : ''}`} type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} onBlur={handleBlur} placeholder="Confirm password" />
                    {errors.confirmPassword && <div className="error-text">{errors.confirmPassword}</div>}
                  </div>
                  <div>
                    <label className="label">Gender</label>
                    <select className={`select ${errors.gender ? 'error' : ''}`} name="gender" value={formData.gender} onChange={handleChange} onBlur={handleBlur}>
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.gender && <div className="error-text">{errors.gender}</div>}
                  </div>
                  <div>
                    <label className="label">Date Of Birth</label>
                    <input className={`field ${errors.dob ? 'error' : ''}`} type="date" name="dob" value={formData.dob} onChange={handleChange} onBlur={handleBlur} max={new Date().toISOString().split('T')[0]} />
                    {errors.dob && <div className="error-text">{errors.dob}</div>}
                  </div>
                  <div>
                    <label className="label">Phone Number</label>
                    <input className={`field ${errors.phoneNumber ? 'error' : ''}`} type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} onBlur={handleBlur} placeholder="98XXXXXXXX" />
                    {errors.phoneNumber && <div className="error-text">{errors.phoneNumber}</div>}
                  </div>
                  <div>
                    <label className="label">Address / Location</label>
                    <input className={`field ${errors.location ? 'error' : ''}`} type="text" name="location" value={formData.location} onChange={handleChange} onBlur={handleBlur} placeholder="City, area, or address" />
                    {errors.location && <div className="error-text">{errors.location}</div>}
                  </div>
                </div>

                {formData.role === 'choreographer' && (
                  <>
                    <div style={{ marginTop: 12 }}>
                      <label className="label">Dance Styles</label>
                      <div className="styles-box">
                        {availableDanceStyles.map((style) => (
                          <label key={style} className="style-item">
                            <input type="checkbox" checked={formData.danceStyles.includes(style)} onChange={() => handleDanceStyleToggle(style)} />
                            {style}
                          </label>
                        ))}
                      </div>
                      {errors.danceStyles && <div className="error-text">{errors.danceStyles}</div>}
                    </div>

                    <div style={{ marginTop: 12 }}>
                      <label className="label">Dance Certificate Photo</label>
                      <div className="file-shell">
                        <input type="file" accept="image/*" onChange={handleCertificatePhotoChange} />
                      </div>
                      {formData.certificatePhoto && (
                        <img src={formData.certificatePhoto} alt="Certificate Preview" style={{ marginTop: '8px', maxWidth: '100%', maxHeight: '120px', borderRadius: '10px', border: '1px solid #d1d5db' }} />
                      )}
                      {errors.certificatePhoto && <div className="error-text">{errors.certificatePhoto}</div>}
                    </div>
                  </>
                )}

                {verificationStep && (
                  <div style={{ marginTop: 12 }}>
                    <label className="label">Email Verification Code</label>
                    <input
                      className={`field ${errors.verificationCode ? 'error' : ''}`}
                      type="text"
                      name="verificationCode"
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                        if (errors.verificationCode) {
                          setErrors((prev) => ({ ...prev, verificationCode: '' }));
                        }
                      }}
                      placeholder="Enter 6-digit code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                    />
                    {errors.verificationCode && <div className="error-text">{errors.verificationCode}</div>}
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={loading}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: '#4f46e5',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          padding: 0,
                          textTransform: 'uppercase',
                          letterSpacing: '0.7px',
                        }}
                      >
                        Resend code
                      </button>
                    </div>
                  </div>
                )}

                <button type="submit" className="submit" disabled={loading}>
                  {loading ? 'Processing...' : verificationStep ? 'Verify & Register' : 'Send Verification Code'}
                </button>
              </form>

              <div className="signin-note">
                Already have an account? <Link href="/signin">Sign In</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
