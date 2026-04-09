'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ClientProfile {
  id: string;
  fullName: string;
  email: string;
  role: string;
  phoneNumber?: string;
  bio?: string;
  location?: string;
  profileImage?: string;
}

export default function ClientPublicProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = String(params?.id || '');

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/client/profile/${clientId}`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load client profile');
        }
        setProfile(data.profile);
      } catch (err: any) {
        setError(err.message || 'Failed to load client profile');
      } finally {
        setLoading(false);
      }
    };
    if (clientId) load();
  }, [clientId]);

  const initials = useMemo(() => {
    const name = profile?.fullName || 'Client';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n.charAt(0).toUpperCase())
      .join('');
  }, [profile?.fullName]);

  return (
    <div className="client-view-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;600;700&family=Playfair+Display:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        .client-view-root { min-height: 100vh; background: #f6f7fb; font-family: 'Manrope', sans-serif; color: #0f172a; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 28px; background: #fff; border-bottom: 1px solid #e7e9f0; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-badge { width: 48px; height: 48px; border-radius: 999px; overflow: hidden; box-shadow: 0 8px 18px rgba(0,0,0,0.16); background: #fff; }
        .brand-badge img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.2); }
        .brand-name { font-weight: 700; letter-spacing: 0.3px; }
        .brand-sub { font-size: 10px; color: #f4b63a; letter-spacing: 1.8px; text-transform: uppercase; }
        .page { max-width: 840px; margin: 0 auto; padding: 28px 20px 56px; }
        .card { background: #fff; border: 1px solid #e7e9f0; border-radius: 18px; padding: 24px; box-shadow: 0 12px 26px rgba(15,23,42,0.07); }
        .header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
        .avatar { width: 72px; height: 72px; border-radius: 16px; overflow: hidden; background: #111827; color: #fff; display: grid; place-items: center; font-size: 24px; font-weight: 800; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .name { margin: 0; font-family: 'Playfair Display', serif; font-size: 30px; }
        .role { margin-top: 4px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #f4b63a; font-weight: 700; }
        .row { display: grid; grid-template-columns: 150px 1fr; gap: 14px; padding: 12px 0; border-bottom: 1px solid #eef1f6; }
        .row:last-child { border-bottom: none; }
        .label { font-size: 11px; letter-spacing: 1.6px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
        .value { font-size: 14px; color: #1f2937; }
        .btn { border: 1px solid #e7e9f0; background: #fff; color: #334155; padding: 9px 14px; border-radius: 999px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.9px; font-weight: 700; cursor: pointer; }
      `}</style>

      <nav className="topbar">
        <div className="brand">
          <div className="brand-badge">
            <img src="/images/logo.png" alt="Logo" />
          </div>
          <div>
            <div className="brand-name">Step Out</div>
            <div className="brand-sub">Studio Hub</div>
          </div>
        </div>
        <button className="btn" onClick={() => router.back()}>
          Back
        </button>
      </nav>

      <div className="page">
        {loading ? (
          <div className="card">Loading client profile...</div>
        ) : error ? (
          <div className="card" style={{ color: '#b91c1c' }}>
            {error}
          </div>
        ) : profile ? (
          <div className="card">
            <div className="header">
              <div className="avatar">
                {profile.profileImage ? <img src={profile.profileImage} alt={profile.fullName} /> : initials || 'C'}
              </div>
              <div>
                <h1 className="name">{profile.fullName || 'Client'}</h1>
                <div className="role">Client</div>
              </div>
            </div>

            <div className="row">
              <div className="label">Email</div>
              <div className="value">{profile.email || 'Not provided'}</div>
            </div>
            <div className="row">
              <div className="label">Phone</div>
              <div className="value">{profile.phoneNumber || 'Not provided'}</div>
            </div>
            <div className="row">
              <div className="label">Location</div>
              <div className="value">{profile.location || 'Not provided'}</div>
            </div>
            <div className="row">
              <div className="label">Bio</div>
              <div className="value">{profile.bio || 'No bio provided.'}</div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
