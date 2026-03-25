'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_TIME_SLOTS, DateAvailability, getAvailabilityForDate } from '@/lib/availability';
import { useParams, useRouter } from 'next/navigation';

interface Video {
  id: string;
  url: string;
  title: string;
  description?: string;
  uploadedAt: string;
}

interface AvailabilitySlot {
  time: string;
  duration: number;
}

interface ChoreographerProfile {
  id: string;
  name: string;
  email: string;
  bio?: string;
  location?: string;
  pricePerSession: number;
  danceStyles: string[];
  profileImage?: string;
  videos: Video[];
  availability?: DateAvailability[];
}

export default function ChoreographerProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [profile, setProfile] = useState<ChoreographerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveDate, setReserveDate] = useState('');
  const [reserveTime, setReserveTime] = useState<AvailabilitySlot | ''>('');
  const [reserveType, setReserveType] = useState<'studio' | 'in-house'>('studio');
  const [reserveLocation, setReserveLocation] = useState('');
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveError, setReserveError] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [reservedTimes, setReservedTimes] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reservedSet = useMemo(() => new Set(reservedTimes), [reservedTimes]);
  const timeSlots = useMemo(
    () => {
      if (!profile?.availability || !reserveDate) return [];
      return getAvailabilityForDate(profile.availability, reserveDate);
    },
    [profile?.availability, reserveDate]
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/choreographers/${id}`);
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load profile');
        }
        setProfile(data.choreographer);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProfile();
  }, [id]);

  useEffect(() => {
    if (!activeVideo || !videoRef.current) return;
    const el = videoRef.current;
    const play = async () => {
      try { await el.play(); } catch {}
    };
    play();
  }, [activeVideo]);

  useEffect(() => {
    const loadAvailability = async () => {
      if (!reserveOpen || !profile || !reserveDate) {
        setReservedTimes([]);
        setAvailabilityError('');
        setAvailabilityLoading(false);
        return;
      }
      setAvailabilityLoading(true);
      setAvailabilityError('');
      try {
        const params = new URLSearchParams({
          choreographerId: profile.id,
          date: reserveDate,
        });
        const res = await fetch(`/api/reservations?${params.toString()}`);
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to check availability');
        }
        const times = Array.isArray(data?.reservedTimes) ? data.reservedTimes.map(String) : [];
        setReservedTimes(times);
        const currentTimeString = typeof reserveTime === 'string' ? reserveTime : reserveTime?.time;
        if (currentTimeString && times.includes(currentTimeString)) {
          setReserveTime('');
          setReserveError('Selected time is no longer available.');
        }
      } catch (err: any) {
        setAvailabilityError(err.message || 'Failed to check availability');
      } finally {
        setAvailabilityLoading(false);
      }
    };
    loadAvailability();
  }, [reserveOpen, profile?.id, reserveDate]);

  const heroStyles = useMemo(() => {
    if (!profile?.profileImage) return {};
    return {
      backgroundImage: `linear-gradient(180deg, rgba(10,10,15,0.15) 0%, rgba(10,10,15,0.8) 70%), url(${profile.profileImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    } as const;
  }, [profile?.profileImage]);

  const handleFullscreen = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
  };

  const openReserve = () => {
    setReserveDate('');
    setReserveTime('');
    setReserveType('studio');
    setReserveLocation('');
    setReserveError('');
    setAvailabilityError('');
    setReservedTimes([]);
    setReserveOpen(true);
  };

  const submitReservation = async () => {
    if (!profile) return;
    if (!reserveDate) { setReserveError('Please select a date.'); return; }
    if (!reserveTime) { setReserveError('Please select a time.'); return; }
    const timeString = typeof reserveTime === 'string' ? reserveTime : reserveTime.time;
    if (reservedSet.has(timeString)) { setReserveError('Selected time is no longer available.'); return; }
    if (reserveType === 'in-house' && !reserveLocation.trim()) {
      setReserveError('Please add your location for in-house sessions.');
      return;
    }
    setReserveLoading(true);
    setReserveError('');
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          choreographerId: profile.id,
          date: reserveDate,
          time: timeString,
          duration: typeof reserveTime === 'object' ? reserveTime.duration : 60,
          sessionType: reserveType,
          location: reserveType === 'in-house' ? reserveLocation.trim() : '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to reserve');
      }
      setReserveOpen(false);
    } catch (err: any) {
      setReserveError(err.message || 'Failed to reserve');
    } finally {
      setReserveLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading profile...</div>;
  }
  if (error) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#b91c1c' }}>{error}</div>;
  }
  if (!profile) return null;

  return (
    <div className="profile-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .profile-root { min-height: 100vh; font-family: 'Manrope', sans-serif; color: #0f172a; background: #f6f7fb; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 40px; background: #fff; border-bottom: 1px solid #e7e9f0; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-badge { width: 48px; height: 48px; border-radius: 999px; background: #fff; overflow: hidden; box-shadow: 0 8px 18px rgba(0,0,0,0.18); display: grid; place-items: center; }
        .brand-badge img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.2); }
        .brand-name { font-weight: 700; letter-spacing: 0.4px; }
        .brand-sub { font-size: 10px; color: #f4b63a; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
        .nav-links { display: flex; gap: 18px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
        .page { max-width: 1200px; margin: 0 auto; padding: 0 36px 60px; }
        .hero { margin: 26px 0 30px; border-radius: 28px; overflow: hidden; background: #0b1220; color: #fff; position: relative; }
        .hero-inner { padding: 70px 60px; min-height: 360px; }
        .hero-loc { font-size: 10px; letter-spacing: 3px; color: #f4b63a; text-transform: uppercase; font-weight: 700; }
        .hero-name { font-family: 'Playfair Display', serif; font-size: 48px; margin: 8px 0 8px; }
        .hero-tags { display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 18px; }
        .hero-tag { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: rgba(255,255,255,0.12); letter-spacing: 1px; text-transform: uppercase; }
        .hero-cta { margin-top: 12px; }
        .btn { padding: 10px 16px; border-radius: 999px; border: none; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; font-size: 11px; cursor: pointer; }
        .btn.primary { background: #fff; color: #111827; }
        .section { background: #fff; border: 1px solid #e7e9f0; border-radius: 24px; padding: 28px; box-shadow: 0 14px 30px rgba(17,24,39,0.08); }
        .grid { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; margin-top: 26px; }
        .section-title { font-size: 10px; letter-spacing: 3px; color: #f4b63a; text-transform: uppercase; font-weight: 800; margin-bottom: 12px; }
        .statement { font-family: 'Playfair Display', serif; font-size: 22px; line-height: 1.4; color: #111827; }
        .video-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 18px; }
        .video-card { border-radius: 18px; overflow: hidden; background: #0f172a; color: #fff; position: relative; }
        .video-card video { width: 100%; height: 160px; object-fit: cover; display: block; background: #0b1220; }
        .video-title { padding: 10px 12px; font-size: 12px; font-weight: 700; }
        .fullscreen-btn { position: absolute; right: 10px; bottom: 10px; background: rgba(0,0,0,0.6); color: #fff; border: none; padding: 6px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; cursor: pointer; }
        .modal { position: fixed; inset: 0; background: rgba(10,10,15,0.8); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
        .modal-inner { width: min(1000px, 95vw); background: #0b1220; border-radius: 18px; overflow: hidden; position: relative; }
        .modal video { width: 100%; height: 70vh; object-fit: contain; background: #000; }
        .close-btn { position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 8px 12px; border-radius: 999px; cursor: pointer; }
        .modal {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.7);
          display: grid;
          place-items: center;
          min-height: 100vh;
          z-index: 60;
          padding: 20px;
        }
        .modal-card {
          width: min(420px, 92vw);
          background: #fff;
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 30px 70px rgba(0,0,0,0.35);
          position: relative;
          margin: 0 auto;
        }
        .modal-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          border: 1px solid #e7e9f0;
          background: #f8fafc;
          cursor: pointer;
        }
        .modal-title {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          margin: 0 0 4px;
        }
        .modal-sub {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #f4b63a;
          font-weight: 700;
        }
        .modal-field { margin-top: 18px; }
        .modal-label {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: 700;
          margin-bottom: 8px;
          display: block;
        }
        .input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #e7e9f0;
          background: #fafbff;
          font-size: 13px;
          outline: none;
        }
        .time-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .time-btn {
          border: 1px solid #edf1f7;
          background: #f8fafc;
          padding: 10px 0;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          color: #64748b;
        }
        .time-btn.active { background: #111827; color: #fff; border-color: #111827; }
        .time-btn.disabled,
        .time-btn:disabled {
          background: #eef2f7;
          color: #a1a1aa;
          border-color: #e5e7eb;
          cursor: not-allowed;
        }
        .helper-text { font-size: 11px; color: #64748b; margin-top: 6px; }
        .summary {
          margin-top: 18px;
          padding: 16px;
          border-radius: 18px;
          background: #0b1220;
          color: #fff;
        }
        .summary-row { display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.7); }
        .summary-total { font-size: 20px; font-weight: 800; margin-top: 6px; }
        .error-text { color: #b91c1c; font-size: 12px; margin-top: 10px; }
        @media (max-width: 900px) {
          .grid { grid-template-columns: 1fr; }
          .hero-inner { padding: 50px 28px; }
          .hero-name { font-size: 36px; }
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
          <span onClick={() => router.push('/client/home')} style={{ cursor: 'pointer' }}>Dashboard</span>
        </div>
      </nav>

      <div className="page">
        <div className="hero" style={heroStyles}>
          <div className="hero-inner">
            <div className="hero-loc">{profile.location || 'Nepal Hub'}</div>
            <div className="hero-name">{profile.name}</div>
            <div className="hero-tags">
              {(profile.danceStyles || []).slice(0, 3).map(s => (
                <span key={s} className="hero-tag">{s}</span>
              ))}
            </div>
            <div className="hero-cta">
              <button className="btn primary" onClick={openReserve}>Reserve Session</button>
            </div>
          </div>
        </div>

        <div className="grid">
          <div className="section">
            <div className="section-title">Artist Statement</div>
            <div className="statement">
              {profile.bio || 'Professional choreographer focused on expressive storytelling and rhythmic precision.'}
            </div>

            <div className="section-title" style={{ marginTop: 24 }}>Portfolio Gallery</div>
            {profile.videos.length === 0 ? (
              <div style={{ color: '#6b7280', fontSize: '13px' }}>No approved videos yet.</div>
            ) : (
              <div className="video-grid">
                {[...profile.videos]
                  .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
                  .map(v => (
                  <div key={v.id} className="video-card">
                    <video src={v.url} controls />
                    <div className="video-title">{v.title}</div>
                    <button className="fullscreen-btn" onClick={() => setActiveVideo(v)}>Full screen</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="section">
            <div className="section-title">Professional Accolades</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#111827', fontSize: '13px', lineHeight: 1.8 }}>
              <li>Masters in Performing Arts - Mumbai University</li>
              <li>Lead Choreographer for Himalayan Awards 2022</li>
              <li>Certified International Hip Hop Instructor</li>
              <li>12+ Years Professional Experience</li>
            </ul>
            <div style={{ height: 16 }} />
            <div className="section-title">Interested in a Collaboration?</div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: 12 }}>
              Book a consultation session or private class with {profile.name}.
            </div>

            <div className="section-title" style={{ marginTop: 18 }}>📅 Available Dates & Times</div>
            {profile.availability && profile.availability.length > 0 ? (
              profile.availability.map((dateEntry) => (
                <div key={dateEntry.date} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(244, 182, 58, 0.05)', borderRadius: '8px', border: '1px solid rgba(244, 182, 58, 0.2)' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#f4b63a', marginBottom: '8px' }}>
                    {new Date(dateEntry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {dateEntry.timeSlots.map((slot, index) => (
                      <div
                        key={`${slot.time}-${slot.duration}-${index}`}
                        style={{
                          padding: '8px 10px',
                          backgroundColor: '#0f172a',
                          borderRadius: '6px',
                          border: '1px solid #f4b63a',
                          textAlign: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                          color: '#f4b63a',
                        }}
                      >
                        {slot.time}
                        <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                          {slot.duration} min
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(244, 182, 58, 0.7)', marginTop: '8px' }}>
                    {dateEntry.timeSlots.length} slot(s) available
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(244, 182, 58, 0.5)', fontSize: '14px' }}>
                No availability dates set yet
              </div>
            )}

            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: 12 }}>
              NPR {profile.pricePerSession.toLocaleString()} / session
            </div>
            <button className="btn primary" style={{ width: '100%' }}>Reserve Session</button>
          </div>
        </div>
      </div>

      {activeVideo && (
        <div className="modal" onClick={() => setActiveVideo(null)}>
          <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setActiveVideo(null)}>Close</button>
            <video ref={videoRef} src={activeVideo.url} controls />
            <button className="close-btn" style={{ right: '90px' }} onClick={handleFullscreen}>Fullscreen</button>
          </div>
        </div>
      )}

      {reserveOpen && (
        <div className="modal" onClick={() => setReserveOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setReserveOpen(false)}>X</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}>
                {profile.profileImage && (
                  <img src={profile.profileImage} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div>
                <div className="modal-title">{profile.name}</div>
                <div className="modal-sub">Artist Reservation</div>
              </div>
            </div>

            <div className="modal-field">
              <label className="modal-label">1. Session Date</label>
              {profile.availability && profile.availability.length > 0 ? (
                <select
                  className="input"
                  value={reserveDate}
                  onChange={(e) => {
                    setReserveDate(e.target.value);
                    setReserveTime('');
                    setReserveError('');
                    setAvailabilityError('');
                  }}
                >
                  <option value="">Select a date</option>
                  {profile.availability
                    .filter(dateEntry => new Date(dateEntry.date) >= new Date())
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(dateEntry => (
                      <option key={dateEntry.date} value={dateEntry.date}>
                        {new Date(dateEntry.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        {' '}({dateEntry.timeSlots.length} slots)
                      </option>
                    ))}
                </select>
              ) : (
                <div style={{ padding: '12px', backgroundColor: '#fee2e2', borderRadius: '8px', color: '#b91c1c', fontSize: '14px' }}>
                  No available dates. The choreographer hasn't set their availability yet.
                </div>
              )}
            </div>

            <div className="modal-field">
              <label className="modal-label">2. Artist Availability</label>
              {!reserveDate && <div className="helper-text">Select a date first to see available time slots</div>}
              {reserveDate && availabilityLoading && <div className="helper-text">Checking availability for {reserveDate}...</div>}
              {availabilityError && <div className="error-text">{availabilityError}</div>}
              {reserveDate && (
                <>
                  <div className="helper-text" style={{ marginBottom: '10px', fontSize: '12px', color: '#6b7280' }}>
                    {reservedSet.size > 0 ? `${timeSlots.length - reservedSet.size} of ${timeSlots.length} slots available on ${reserveDate}` : `All ${timeSlots.length} slots available on ${reserveDate}`}
                  </div>
                  <div className="time-grid">
                    {timeSlots.map((slot, index) => {
                      const slotKey = typeof slot === 'string' ? slot : `${slot.time}-${slot.duration}`;
                      const slotTime = typeof slot === 'string' ? slot : slot.time;
                      const isReserved = reservedSet.has(slotTime);
                      const isSelected = reserveTime && (typeof reserveTime === 'string' ? reserveTime === slotTime : reserveTime.time === slot.time && reserveTime.duration === slot.duration);
                      return (
                        <button
                          key={slotKey}
                          className={`time-btn ${isSelected ? 'active' : ''} ${isReserved ? 'disabled' : ''}`}
                          onClick={() => setReserveTime(slot)}
                          disabled={isReserved}
                          title={isReserved ? 'Already booked' : `Select ${slotTime}${typeof slot === 'object' && slot.duration ? ` (${slot.duration} min)` : ''}`}
                        >
                          {slotTime}
                          {typeof slot === 'object' && slot.duration && (
                            <span style={{ fontSize: '10px', display: 'block', opacity: 0.7 }}>
                              {slot.duration} min
                            </span>
                          )}
                          {isReserved && <span style={{ fontSize: '10px', display: 'block', opacity: 0.6 }}>Booked</span>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="modal-field">
              <label className="modal-label">3. Session Type</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className={`time-btn ${reserveType === 'studio' ? 'active' : ''}`} onClick={() => setReserveType('studio')}>Studio</button>
                <button className={`time-btn ${reserveType === 'in-house' ? 'active' : ''}`} onClick={() => setReserveType('in-house')}>In-House</button>
              </div>
              {reserveType === 'in-house' && (
                <input
                  className="input"
                  style={{ marginTop: '10px' }}
                  type="text"
                  placeholder="Enter your location"
                  value={reserveLocation}
                  onChange={(e) => setReserveLocation(e.target.value)}
                />
              )}
            </div>

            <div className="summary">
              <div className="summary-row">
                <span>Private Session</span>
                <span>NPR {profile.pricePerSession.toLocaleString()}</span>
              </div>
              <div className="summary-row" style={{ marginTop: '6px' }}>
                <span>Studio Access Fee</span>
                <span>NPR 50</span>
              </div>
              <div className="summary-total">NPR {(profile.pricePerSession + 50).toLocaleString()}</div>
            </div>

            {reserveError && <div className="error-text">{reserveError}</div>}

            <button
              className="btn primary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={submitReservation}
              disabled={reserveLoading}
            >
              {reserveLoading ? 'Reserving...' : 'Finalize Reservation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
