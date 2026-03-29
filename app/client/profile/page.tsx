'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClientProfile {
  id?: string;
  fullName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  bio?: string;
  location?: string;
  profileImage?: string;
}

export default function ClientProfilePage() {
  const router = useRouter();
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [form, setForm] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const toDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/client/profile', { method: 'GET', credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load profile');
        }
        const nextProfile: ClientProfile = {
          id: data.profile?.id,
          fullName: data.profile?.fullName || 'Client',
          email: data.profile?.email || '',
          role: data.profile?.role || 'client',
          phoneNumber: data.profile?.phoneNumber || '',
          bio: data.profile?.bio || '',
          location: data.profile?.location || '',
          profileImage: data.profile?.profileImage || '',
        };
        setProfile(nextProfile);
        setForm(nextProfile);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const initials = useMemo(() => {
    if (!profile?.fullName) return 'C';
    const parts = profile.fullName.split(' ').filter(Boolean);
    return parts.slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'C';
  }, [profile?.fullName]);

  const handleSave = async () => {
    if (!form) return;
    try {
      setSaving(true);
      setSuccess('');
      setError('');
      const res = await fetch('/api/client/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName: form.fullName,
          phoneNumber: form.phoneNumber || '',
          bio: form.bio || '',
          location: form.location || '',
          profileImage: form.profileImage || '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to save profile');
      }
      const updated: ClientProfile = {
        id: data.profile?.id,
        fullName: data.profile?.fullName || form.fullName,
        email: data.profile?.email || form.email,
        role: data.profile?.role || form.role,
        phoneNumber: data.profile?.phoneNumber || form.phoneNumber || '',
        bio: data.profile?.bio || form.bio || '',
        location: data.profile?.location || form.location || '',
        profileImage: data.profile?.profileImage || form.profileImage || '',
      };
      setProfile(updated);
      setForm(updated);
      setSuccess('Profile updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading profile...</div>;
  }

  if (error && !form) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#b91c1c' }}>{error}</div>;
  }

  if (!profile || !form) return null;

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    try {
      const imageUrl = await toDataUrl(file);
      setForm({ ...form, profileImage: imageUrl });
      setError('');
      setSuccess('Photo selected. Remember to save changes.');
    } catch {
      setError('Could not read image file.');
    } finally {
      if (profileImageInputRef.current) profileImageInputRef.current.value = '';
    }
  };

  return (
    <div className="client-profile-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;600;700&family=Playfair+Display:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        .client-profile-root { min-height: 100vh; background: #f6f7fb; font-family: 'Manrope', sans-serif; color: #0f172a; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 40px; background: #fff; border-bottom: 1px solid #e7e9f0; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-badge { width: 48px; height: 48px; border-radius: 999px; background: #fff; overflow: hidden; box-shadow: 0 8px 18px rgba(0,0,0,0.18); display: grid; place-items: center; }
        .brand-badge img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.2); }
        .brand-name { font-weight: 700; letter-spacing: 0.4px; }
        .brand-sub { font-size: 10px; color: #f4b63a; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
        .nav-links { display: flex; gap: 18px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
        .page { max-width: 900px; margin: 0 auto; padding: 36px; }
        .card { background: #fff; border: 1px solid #e7e9f0; border-radius: 24px; padding: 28px; box-shadow: 0 14px 30px rgba(17,24,39,0.08); }
        .header { display: flex; align-items: center; gap: 16px; margin-bottom: 18px; }
        .avatar { width: 72px; height: 72px; border-radius: 18px; display: grid; place-items: center; background: #0f172a; color: #fff; font-weight: 800; font-size: 24px; overflow: hidden; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-actions { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
        .upload-btn { background: #fff; border: 1px solid #e7e9f0; color: #0f172a; padding: 6px 10px; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; border-radius: 999px; cursor: pointer; font-weight: 700; }
        .name { font-family: 'Playfair Display', serif; font-size: 28px; margin: 0; }
        .role { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #f4b63a; font-weight: 700; margin-top: 4px; }
        .row { display: grid; grid-template-columns: 160px 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid #eef1f6; align-items: center; }
        .row:last-child { border-bottom: none; }
        .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700; }
        .value { font-size: 14px; color: #111827; font-weight: 600; }
        .input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #e7e9f0; background: #fafbff; font-size: 13px; outline: none; }
        .input:focus { border-color: #f4b63a; background: #fffbf0; }
        .textarea { min-height: 90px; resize: vertical; }
        .actions { margin-top: 20px; display: flex; gap: 12px; align-items: center; }
        .btn { padding: 10px 16px; border-radius: 999px; border: none; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; font-size: 11px; cursor: pointer; }
        .btn.primary { background: #111827; color: #fff; }
        .btn.secondary { background: #fff; color: #111827; border: 1px solid #e7e9f0; }
        .hint { font-size: 12px; color: #6b7280; }
        .error { color: #b91c1c; font-size: 12px; margin-top: 8px; }
        .success { color: #10b981; font-size: 12px; margin-top: 8px; }
        @media (max-width: 700px) {
          .page { padding: 22px; }
          .row { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav className="topbar">
        <div className="brand">
          <div className="brand-badge"><img src="/images/logo.png" alt="Logo" /></div>
          <div>
            <div className="brand-name">Step Out</div>
            <div className="brand-sub">Studio Hub</div>
          </div>
        </div>
        <div className="nav-links">
          <span onClick={() => router.push('/client/home')} style={{ cursor: 'pointer' }}>Home</span>
          <span onClick={() => router.push('/client/sessions')} style={{ cursor: 'pointer' }}>Sessions</span>
          <span onClick={() => router.push('/client/notifications')} style={{ cursor: 'pointer' }}>Notifications</span>
        </div>
      </nav>

      <div className="page">
        <div className="card">
          <div className="header">
            <div>
              <div className="avatar">
                {form.profileImage ? <img src={form.profileImage} alt={profile.fullName} /> : initials}
              </div>
              <div className="avatar-actions">
                <button className="upload-btn" onClick={() => profileImageInputRef.current?.click()}>
                  Change Photo
                </button>
                {form.profileImage && (
                  <button
                    className="upload-btn"
                    onClick={() => setForm({ ...form, profileImage: '' })}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={profileImageInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleProfileImageUpload}
              />
            </div>
            <div>
              <h1 className="name">{profile.fullName}</h1>
              <div className="role">{profile.role}</div>
            </div>
          </div>

          <div className="row">
            <div className="label">Full Name</div>
            <input
              className="input"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div className="row">
            <div className="label">Email</div>
            <div className="value">{profile.email || 'Not provided'}</div>
          </div>
          <div className="row">
            <div className="label">Phone</div>
            <input
              className="input"
              value={form.phoneNumber || ''}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              placeholder="Phone number"
            />
          </div>
          <div className="row">
            <div className="label">Location</div>
            <input
              className="input"
              value={form.location || ''}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="City, Country"
            />
          </div>
          <div className="row">
            <div className="label">Bio</div>
            <textarea
              className="input textarea"
              value={form.bio || ''}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Tell us about yourself"
            />
          </div>

          <div className="actions">
            <button className="btn primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button className="btn secondary" onClick={() => router.push('/client/sessions')}>View Sessions</button>
            <span className="hint">Edit directly and save changes.</span>
          </div>

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
        </div>
      </div>
    </div>
  );
}
