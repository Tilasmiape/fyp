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
  groupSessionPriceMultiplier?: number;
  danceStyles: string[];
  profileImage?: string;
  videos: Video[];
  availabilityTimes?: DateAvailability[];
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
  const [sessionCategory, setSessionCategory] = useState<'individual' | 'group'>('individual');
  const [participantCount, setParticipantCount] = useState(2);
  const [customTime, setCustomTime] = useState('');
  const [customDuration, setCustomDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [reservedTimes, setReservedTimes] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reservedSet = useMemo(() => new Set(reservedTimes), [reservedTimes]);
  
  // Determine if choreographer has preset time slots for selected date
  const hasPresetSlots = useMemo(() => {
    if (!profile?.availabilityTimes || !reserveDate) return false;
    const dateAvailability = profile.availabilityTimes.find((a: any) => a.date === reserveDate);
    return dateAvailability && dateAvailability.timeSlots && dateAvailability.timeSlots.length > 0;
  }, [profile?.availabilityTimes, reserveDate]);
  
  const timeSlots = useMemo(
    () => {
      if (!profile?.availabilityTimes || !reserveDate || !hasPresetSlots) return [];
      return getAvailabilityForDate(profile.availabilityTimes, reserveDate);
    },
    [profile?.availabilityTimes, reserveDate, hasPresetSlots]
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
    setSessionCategory('individual');
    setParticipantCount(2);
    setCustomTime('');
    setCustomDuration(60);
    setNotes('');
    setReserveOpen(true);
  };

  const submitReservation = async () => {
    if (!profile) return;
    if (!reserveDate) { setReserveError('Please select a date.'); return; }
    
    if (hasPresetSlots) {
      if (!reserveTime) { setReserveError('Please select a time slot.'); return; }
    } else {
      if (!customTime) { setReserveError('Please enter a time.'); return; }
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(customTime)) {
        setReserveError('Invalid time format. Use HH:MM (e.g., 14:30).');
        return;
      }
      if (customDuration < 30 || customDuration > 120) {
        setReserveError('Duration must be between 30 and 120 minutes.');
        return;
      }
    }
    
    if (sessionCategory === 'group' && participantCount < 2) {
      setReserveError('Group sessions require at least 2 participants.');
      return;
    }
    
    const timeString = hasPresetSlots 
      ? (typeof reserveTime === 'string' ? reserveTime : reserveTime?.time)
      : customTime;
    const duration = hasPresetSlots
      ? (typeof reserveTime === 'object' ? reserveTime.duration : 60)
      : customDuration;
    
    if (hasPresetSlots && reservedSet.has(timeString)) { 
      setReserveError('Selected time is no longer available.'); 
      return; 
    }
    
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
          duration,
          sessionType: reserveType,
          location: reserveType === 'in-house' ? reserveLocation.trim() : '',
          sessionCategory,
          participantCount: sessionCategory === 'group' ? participantCount : 1,
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to reserve');
      }
      setReserveOpen(false);
      alert('Reservation request submitted successfully!');
    } catch (err: any) {
      setReserveError(err.message || 'Failed to reserve');
    } finally {
      setReserveLoading(false);
    }
  };

  const calculatePrice = () => {
    if (!profile) return 0;
    const multiplier = sessionCategory === 'group' 
      ? (profile.groupSessionPriceMultiplier || 1.3)
      : 1;
    return Math.round((profile.pricePerSession * multiplier + 50) * 100) / 100;
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
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
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
          overflow-y: auto;
        }
        .modal-card {
          width: min(500px, 92vw);
          background: #fff;
          border-radius: 28px;
          padding: 24px;
          box-shadow: 0 30px 70px rgba(0,0,0,0.35);
          position: relative;
          margin: 20px auto;
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
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
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
        .input:focus { border-color: #f4b63a; background: #fffbf0; }
        .toggle-group {
          display: flex;
          gap: 10px;
          margin-bottom: 12px;
        }
        .toggle-btn {
          flex: 1;
          padding: 10px;
          border: 1px solid #e7e9f0;
          border-radius: 12px;
          background: #f8fafc;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .toggle-btn.active {
          background: #111827;
          color: #fff;
          border-color: #111827;
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
        .summary-highlight { background: rgba(244, 182, 58, 0.1); padding: 10px; border-radius: 12px; margin-top: 12px; border: 1px solid rgba(244, 182, 58, 0.3); }
        .error-text { color: #b91c1c; font-size: 12px; margin-top: 10px; }
        .group-info { background: rgba(244, 182, 58, 0.05); padding: 12px; border-radius: 12px; border-left: 3px solid #f4b63a; font-size: 12px; color: #664d03; margin-top: 8px; }
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
            {profile.availabilityTimes && profile.availabilityTimes.length > 0 ? (
              profile.availabilityTimes.map((dateEntry: any) => (
                <div key={dateEntry.date} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(244, 182, 58, 0.05)', borderRadius: '8px', border: '1px solid rgba(244, 182, 58, 0.2)' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#f4b63a', marginBottom: '8px' }}>
                    {new Date(dateEntry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {dateEntry.timeSlots.map((slot: any, index: number) => (
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
                Flexible availability - request your preferred time!
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
            <button className="modal-close" onClick={() => setReserveOpen(false)}>×</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}>
                {profile.profileImage && (
                  <img src={profile.profileImage} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div>
                <div className="modal-title">{profile.name}</div>
                <div className="modal-sub">Book a Session</div>
              </div>
            </div>

            {/* Session Category Selector */}
            <div className="modal-field">
              <label className="modal-label">1. Session Type</label>
              <div className="toggle-group">
                <button 
                  className={`toggle-btn ${sessionCategory === 'individual' ? 'active' : ''}`}
                  onClick={() => setSessionCategory('individual')}
                >
                  Individual
                </button>
                <button 
                  className={`toggle-btn ${sessionCategory === 'group' ? 'active' : ''}`}
                  onClick={() => setSessionCategory('group')}
                >
                  Group
                </button>
              </div>
              {sessionCategory === 'group' && (
                <div>
                  <label className="modal-label" style={{ marginTop: 12 }}>Number of Participants</label>
                  <input 
                    type="number" 
                    className="input" 
                    min="2" 
                    max="100"
                    value={participantCount}
                    onChange={(e) => setParticipantCount(Math.max(2, parseInt(e.target.value) || 2))}
                  />
                  <div className="group-info">
                    💡 Group sessions are {Math.round((profile.groupSessionPriceMultiplier || 1.3 - 1) * 100)}% more expensive per person
                  </div>
                </div>
              )}
            </div>

            {/* Session Location */}
            <div className="modal-field">
              <label className="modal-label">2. Session Location</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className={`toggle-btn ${reserveType === 'studio' ? 'active' : ''}`} onClick={() => setReserveType('studio')} style={{ flex: 1 }}>Studio</button>
                <button className={`toggle-btn ${reserveType === 'in-house' ? 'active' : ''}`} onClick={() => setReserveType('in-house')} style={{ flex: 1 }}>In-House</button>
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

            {/* Date Selection */}
            <div className="modal-field">
              <label className="modal-label">3. Session Date</label>
              <input 
                type="date"
                className="input"
                value={reserveDate}
                onChange={(e) => {
                  setReserveDate(e.target.value);
                  setReserveTime('');
                  setCustomTime('');
                  setReserveError('');
                  setAvailabilityError('');
                }}
                min={new Date().toISOString().split('T')[0]}
              />
              
              {profile.availabilityTimes && profile.availabilityTimes.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <label className="modal-label" style={{ fontSize: '9px', color: '#f4b63a', marginBottom: '4px' }}>
                    💡 Choreographer's Preferred Dates
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {profile.availabilityTimes
                      .filter(dateEntry => new Date(dateEntry.date) >= new Date())
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(dateEntry => (
                        <button
                          key={dateEntry.date}
                          type="button"
                          className={`toggle-btn ${reserveDate === dateEntry.date ? 'selected-pref' : ''}`}
                          style={{ 
                            fontSize: '10px', 
                            padding: '6px 10px', 
                            flex: 'none',
                            backgroundColor: reserveDate === dateEntry.date ? '#f4b63a' : '#f8fafc',
                            color: reserveDate === dateEntry.date ? '#fff' : '#64748b',
                            borderColor: reserveDate === dateEntry.date ? '#f4b63a' : '#e7e9f0',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setReserveDate(dateEntry.date);
                            setReserveTime('');
                            setCustomTime('');
                            setReserveError('');
                            setAvailabilityError('');
                          }}
                        >
                          {new Date(dateEntry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Time Selection - Preset Slots */}
            {hasPresetSlots && (
              <div className="modal-field">
                <label className="modal-label">4. Time Slot</label>
                {!reserveDate && <div className="helper-text">Select a date first to see available time slots</div>}
                {reserveDate && availabilityLoading && <div className="helper-text">Checking availability...</div>}
                {availabilityError && <div className="error-text">{availabilityError}</div>}
                {reserveDate && (
                  <>
                    <div className="helper-text" style={{ marginBottom: '10px', fontSize: '12px', color: '#6b7280' }}>
                      {reservedSet.size > 0 ? `${timeSlots.length - reservedSet.size} of ${timeSlots.length} slots available` : `All ${timeSlots.length} slots available`}
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
            )}

            {/* Time Selection - Custom Time */}
            {!hasPresetSlots && (
              <div className="modal-field">
                <label className="modal-label">4. Custom Time & Duration</label>
                <input 
                  type="time"
                  className="input"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                  placeholder="HH:MM"
                />
                <div style={{ marginTop: 10 }}>
                  <label className="modal-label">Duration (minutes)</label>
                  <select className="input" value={customDuration} onChange={(e) => setCustomDuration(parseInt(e.target.value))}>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>
            )}

            {/* Notes Field */}
            <div className="modal-field">
              <label className="modal-label">5. Additional Notes</label>
              <textarea 
                className="input"
                style={{ minHeight: 80, fontFamily: 'inherit', resize: 'vertical' }}
                placeholder="Any special requests or notes about your session..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <div className="helper-text">Optional: Let the choreographer know about your experience level or specific requirements</div>
            </div>

            {/* Price Summary */}
            <div className="summary">
              <div className="summary-row">
                <span>{sessionCategory === 'individual' ? 'Individual' : `Group (${participantCount} people)`} Session</span>
                <span>NPR {(profile.pricePerSession * (sessionCategory === 'group' ? (profile.groupSessionPriceMultiplier || 1.3) : 1)).toLocaleString()}</span>
              </div>
              <div className="summary-row" style={{ marginTop: '6px' }}>
                <span>Studio Access Fee</span>
                <span>NPR 50</span>
              </div>
              {sessionCategory === 'group' && (
                <div className="summary-highlight">
                  Group Rate: {Math.round((profile.groupSessionPriceMultiplier || 1.3 - 1) * 100)}% premium applied
                </div>
              )}
              <div className="summary-total">NPR {calculatePrice().toLocaleString()}</div>
            </div>

            {reserveError && <div className="error-text">{reserveError}</div>}

            <button
              className="btn primary"
              style={{ width: '100%', marginTop: '16px' }}
              onClick={submitReservation}
              disabled={reserveLoading}
            >
              {reserveLoading ? 'Submitting...' : 'Submit Reservation Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
