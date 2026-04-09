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

interface ReviewItem {
  feedback_id: string;
  comment: string;
  created_at: string;
  rating?: number;
  sender?: {
    id: string;
    name: string;
    profileImage?: string;
  };
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

interface StripeStatus {
  connected: boolean;
  onboarded: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

export default function ChoreographerProfilePage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();
  const [profile, setProfile] = useState<ChoreographerProfile | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveDate, setReserveDate] = useState('');
  const [reserveTime, setReserveTime] = useState<string>('');
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
  const [now, setNow] = useState<Date | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reservedSet = useMemo(() => new Set(reservedTimes), [reservedTimes]);

  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [viewerRole, setViewerRole] = useState<string>('');
  const [viewerId, setViewerId] = useState<string>('');

  const futureAvailability = useMemo(() => {
    const availability = Array.isArray(profile?.availabilityTimes) ? profile.availabilityTimes : [];
    if (!now) return [];
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const toDateTime = (dateStr: string, timeStr: string) => {
      const trimmed = timeStr.trim();
      const match12 = trimmed.match(/^(0?[1-9]|1[0-2]):[0-5][0-9]\\s*(AM|PM)$/i);
      const match24 = trimmed.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/);
      if (!match12 && !match24) return null;
      let hour = 0;
      let minute = 0;
      if (match12) {
        hour = parseInt(match12[1], 10);
        minute = parseInt(match12[2], 10);
        const ampm = match12[3].toUpperCase();
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
      } else if (match24) {
        hour = parseInt(match24[1], 10);
        minute = parseInt(match24[2], 10);
      }
      const dt = new Date(`${dateStr}T00:00:00`);
      if (Number.isNaN(dt.getTime())) return null;
      dt.setHours(hour, minute, 0, 0);
      return dt;
    };

    return availability
      .map((dateEntry) => {
        const dateOnly = new Date(`${dateEntry.date}T00:00:00`);
        if (Number.isNaN(dateOnly.getTime())) return null;
        if (dateOnly < todayStart) return null;
        if (dateOnly > todayStart) return dateEntry;
        const nowRounded = new Date(now);
        nowRounded.setSeconds(0, 0);
        const futureSlots = (dateEntry.timeSlots || []).filter((slot) => {
          const slotTime = toDateTime(dateEntry.date, slot.time);
          return slotTime ? slotTime.getTime() >= nowRounded.getTime() : false;
        });
        if (futureSlots.length === 0) return null;
        return { ...dateEntry, timeSlots: futureSlots };
      })
      .filter(Boolean) as DateAvailability[];
  }, [profile?.availabilityTimes, now]);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const hasPresetSlots = useMemo(() => {
    if (!futureAvailability || !reserveDate) return false;
    const dateAvailability = futureAvailability.find((a: any) => a.date === reserveDate);
    return dateAvailability && dateAvailability.timeSlots && dateAvailability.timeSlots.length > 0;
  }, [futureAvailability, reserveDate]);

  const timeSlots = useMemo(
    () => {
      if (!futureAvailability || !reserveDate || !hasPresetSlots) return [];
      return getAvailabilityForDate(futureAvailability, reserveDate);
    },
    [futureAvailability, reserveDate, hasPresetSlots]
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/choreographers/${id}`);
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load profile');
        setProfile(data.choreographer);
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProfile();
  }, [id]);

  useEffect(() => {
    const loadViewerAndStripe = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/auth/me', { headers });
        const data = await res.json();
        if (res.ok && data?.success) {
          setViewerRole(data.user.role || '');
          setViewerId(data.user.id || '');
          if (data.user.role === 'choreographer' && data.user.id === id) {
            const sRes = await fetch('/api/choreographer/stripe-connect/status', { headers });
            const sData = await sRes.json();
            if (sRes.ok && sData?.success) {
              setStripeStatus({
                connected: sData.connected,
                onboarded: sData.onboarded,
                chargesEnabled: sData.chargesEnabled,
                payoutsEnabled: sData.payoutsEnabled,
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to load viewer/stripe info:', err);
      }
    };
    if (id) loadViewerAndStripe();
  }, [id]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const stripeParam = sp.get('stripe');
    if (stripeParam === 'success' || stripeParam === 'refresh') {
      const refetch = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const sRes = await fetch('/api/choreographer/stripe-connect/status', { headers });
          const sData = await sRes.json();
          if (sRes.ok && sData?.success) {
            setStripeStatus({
              connected: sData.connected,
              onboarded: sData.onboarded,
              chargesEnabled: sData.chargesEnabled,
              payoutsEnabled: sData.payoutsEnabled,
            });
          }
        } catch {}
        window.history.replaceState({}, '', window.location.pathname);
      };
      refetch();
    }
  }, []);

  const handleConnectStripe = async () => {
    try {
      setStripeLoading(true);
      setStripeError('');
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/choreographer/stripe-connect', { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Failed to start Stripe onboarding');
      window.location.href = data.url;
    } catch (err: any) {
      setStripeError(err.message || 'Failed to connect Stripe');
    } finally {
      setStripeLoading(false);
    }
  };

  const averageRating = useMemo(() => {
    if (!reviews.length) return 0;
    const total = reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0);
    return Math.round((total / reviews.length) * 10) / 10;
  }, [reviews]);

  useEffect(() => {
    if (!activeVideo || !videoRef.current) return;
    const el = videoRef.current;
    el.play().catch(() => {});
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
        const p = new URLSearchParams({ choreographerId: profile.id, date: reserveDate });
        const res = await fetch(`/api/reservations?${p.toString()}`);
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to check availability');
        const times = Array.isArray(data?.reservedTimes) ? data.reservedTimes.map(String) : [];
        setReservedTimes(times);
        if (reserveTime && times.includes(reserveTime)) {
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
    const timeString = hasPresetSlots ? reserveTime : customTime;
    const selectedSlot = hasPresetSlots ? timeSlots.find(s => s.time === reserveTime) : null;
    const duration = hasPresetSlots ? (selectedSlot?.duration || 60) : customDuration;
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
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to reserve');
      setReserveOpen(false);
      alert('Reservation request submitted successfully!');
    } catch (err: any) {
      setReserveError(err.message || 'Failed to reserve');
    } finally {
      setReserveLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading profile...</div>;
  if (error) return <div style={{ padding: '40px', textAlign: 'center', color: '#b91c1c' }}>{error}</div>;
  if (!profile) return null;

  const isOwner = viewerRole === 'choreographer' && viewerId === id;

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
        .hero-cta { margin-top: 12px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .btn { padding: 10px 16px; border-radius: 999px; border: none; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; font-size: 11px; cursor: pointer; }
        .btn.primary { background: #fff; color: #111827; }
        .btn.dark { background: #111827; color: #fff; }
        .btn.stripe { background: #635bff; color: #fff; display: inline-flex; align-items: center; gap: 6px; }
        .btn.stripe-connected { background: #10b981; color: #fff; display: inline-flex; align-items: center; gap: 6px; }
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
        .stripe-banner { border-radius: 20px; padding: 20px 24px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .stripe-banner.warn { background: linear-gradient(135deg, #fffbeb, #fef3c7); border: 1.5px solid #fcd34d; }
        .stripe-banner.ok { background: linear-gradient(135deg, #ecfdf5, #f0fdf4); border: 1.5px solid #6ee7b7; }
        .stripe-banner-left { display: flex; flex-direction: column; gap: 4px; }
        .stripe-banner-title { font-size: 13px; font-weight: 800; color: #111827; }
        .stripe-banner-sub { font-size: 11px; color: #6b7280; }
        .stripe-connect-btn { padding: 11px 20px; border-radius: 14px; border: none; background: #635bff; color: #fff; font-weight: 800; font-size: 12px; letter-spacing: 0.8px; text-transform: uppercase; cursor: pointer; display: flex; align-items: center; gap: 8px; white-space: nowrap; transition: background 0.2s; }
        .stripe-connect-btn:hover:not(:disabled) { background: #4f46e5; }
        .stripe-connect-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .stripe-connected-badge { padding: 11px 20px; border-radius: 14px; background: #d1fae5; color: #047857; font-weight: 800; font-size: 12px; letter-spacing: 0.8px; text-transform: uppercase; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .stripe-card { border-radius: 20px; padding: 20px; margin-top: 20px; border: 1px solid #e7e9f0; }
        .stripe-card.connected { background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border-color: #6ee7b7; }
        .stripe-card.disconnected { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-color: #fcd34d; }
        .stripe-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
        .stripe-badge.green { background: rgba(16,185,129,0.15); color: #047857; }
        .stripe-badge.amber { background: rgba(245,158,11,0.15); color: #92400e; }
        .reservation-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); display: grid; place-items: center; z-index: 9999; padding: 24px; overflow-y: auto; }
        .modal-inner { width: min(1000px, 95vw); background: #0b1220; border-radius: 18px; overflow: hidden; position: relative; margin: auto; }
        .modal video { width: 100%; height: 70vh; object-fit: contain; background: #000; }
        .close-btn { position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.1); color: #fff; border: none; padding: 8px 12px; border-radius: 999px; cursor: pointer; z-index: 10; }
        .reservation-modal-card { width: min(600px, 95vw); background: #fff; border-radius: 32px; padding: 32px; box-shadow: 0 40px 100px rgba(0,0,0,0.5); position: relative; margin: auto; animation: modalAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalAppear { from { transform: scale(0.95) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .reservation-modal-close { position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border-radius: 999px; border: 1px solid #e7e9f0; background: #f8fafc; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; z-index: 10; }
        .reservation-modal-title { font-family: 'Playfair Display', serif; font-size: 22px; margin: 0 0 4px; }
        .reservation-modal-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #f4b63a; font-weight: 700; }
        .reservation-modal-field { margin-top: 18px; }
        .reservation-modal-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #9ca3af; font-weight: 700; margin-bottom: 8px; display: block; }
        .input { width: 100%; padding: 10px 12px; border-radius: 12px; border: 1px solid #e7e9f0; background: #fafbff; font-size: 13px; outline: none; }
        .input:focus { border-color: #f4b63a; background: #fffbf0; }
        .toggle-group { display: flex; gap: 10px; margin-bottom: 12px; }
        .toggle-btn { flex: 1; padding: 10px; border: 1px solid #e7e9f0; border-radius: 12px; background: #f8fafc; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .toggle-btn.active { background: #111827; color: #fff; border-color: #111827; }
        .time-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; margin-top: 12px; }
        .time-btn { border: 1px solid #edf1f7; background: #f8fafc; padding: 10px 0; border-radius: 14px; font-size: 12px; font-weight: 700; cursor: pointer; color: #64748b; }
        .time-btn.active { background: #111827; color: #fff; border-color: #111827; }
        .time-btn.disabled, .time-btn:disabled { background: #eef2f7; color: #a1a1aa; border-color: #e5e7eb; cursor: not-allowed; }
        .helper-text { font-size: 11px; color: #64748b; margin-top: 6px; }
        .summary { margin-top: 24px; padding: 24px; border-radius: 24px; background: #0f172a; color: #fff; box-shadow: 0 10px 25px rgba(15,23,42,0.2); }
        .summary-row { display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px; }
        .summary-total { font-size: 24px; font-weight: 800; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); color: #f4b63a; }
        .summary-highlight { background: rgba(244,182,58,0.1); padding: 10px; border-radius: 12px; margin-top: 12px; border: 1px solid rgba(244,182,58,0.3); }
        .error-text { color: #b91c1c; font-size: 12px; margin-top: 10px; }
        .group-info { background: rgba(244,182,58,0.05); padding: 12px; border-radius: 12px; border-left: 3px solid #f4b63a; font-size: 12px; color: #664d03; margin-top: 8px; }
        @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .hero-inner { padding: 50px 28px; } .hero-name { font-size: 36px; } }
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

        {/* ── STRIPE BANNER (owner only, full width, above everything) ── */}
        {isOwner && (
          <div className={`stripe-banner ${stripeStatus?.onboarded ? 'ok' : 'warn'}`} style={{ marginTop: 26 }}>
            <div className="stripe-banner-left">
              <div className="stripe-banner-title">
                {stripeStatus === null && 'Checking payment setup...'}
                {stripeStatus !== null && stripeStatus.onboarded && 'Stripe Payments Active'}
                {stripeStatus !== null && !stripeStatus.onboarded && 'Connect Stripe to Receive Payments'}
              </div>
              <div className="stripe-banner-sub">
                {stripeStatus?.onboarded
                  ? 'You receive 88% of each session fee. Platform retains 12%.'
                  : 'Clients cannot pay you until your Stripe account is connected and verified.'}
              </div>
              {stripeError && (
                <div style={{ fontSize: '11px', color: '#b91c1c', marginTop: 4 }}>{stripeError}</div>
              )}
            </div>
            {stripeStatus !== null && (
              stripeStatus.onboarded ? (
                <div className="stripe-connected-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.92 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                  Connected
                </div>
              ) : (
                <button
                  className="stripe-connect-btn"
                  onClick={handleConnectStripe}
                  disabled={stripeLoading}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.92 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                  {stripeLoading ? 'Connecting...' : 'Connect Stripe Account'}
                </button>
              )
            )}
          </div>
        )}
        {/* ── END STRIPE BANNER ── */}

        <div className="hero" style={{ ...heroStyles, marginTop: isOwner ? 0 : 26 }}>
          <div className="hero-inner">
            <div className="hero-loc">{profile.location || 'Nepal Hub'}</div>
            <div className="hero-name">{profile.name}</div>
            <div className="hero-tags">
              {(profile.danceStyles || []).slice(0, 3).map(s => (
                <span key={s} className="hero-tag">{s}</span>
              ))}
            </div>
            <div className="hero-cta">
              <button className="btn primary" onClick={openReserve}>Reserve</button>
              {/* Also show inline in hero for owner */}
              {isOwner && stripeStatus !== null && !stripeStatus.onboarded && (
                <button
                  className="btn stripe"
                  onClick={handleConnectStripe}
                  disabled={stripeLoading}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.92 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                  </svg>
                  {stripeLoading ? 'Connecting...' : 'Connect Stripe'}
                </button>
              )}
              {isOwner && stripeStatus?.onboarded && (
                <button className="btn stripe-connected" disabled>
                  Stripe Connected
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid">
          {/* ── Left column ── */}
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

            <div className="section-title" style={{ marginTop: 24 }}>Client Reviews</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: 10 }}>
              Average rating: {averageRating || 0} / 5
            </div>
            {reviews.length === 0 ? (
              <div style={{ color: '#6b7280', fontSize: '13px' }}>No reviews yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {reviews.map((review) => (
                  <div key={review.feedback_id} style={{ background: '#fff', border: '1px solid #e7e9f0', borderRadius: '14px', padding: '12px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{review.sender?.name || 'Client'}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: 4 }}>
                      {new Date(review.created_at).toLocaleDateString()}
                      {review.rating !== undefined && ` · ${review.rating}/5`}
                    </div>
                    <div style={{ fontSize: '13px', color: '#374151', marginTop: 6 }}>{review.comment}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right column ── */}
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

            {/* ── Stripe detail card in sidebar ── */}
            {isOwner && stripeStatus !== null && (
              <div className={`stripe-card ${stripeStatus.onboarded ? 'connected' : 'disconnected'}`}>
                <div className="section-title" style={{ marginBottom: 8 }}>Payment Setup</div>
                {stripeStatus.onboarded ? (
                  <>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div style={{ flex: 1, background: 'rgba(16,185,129,0.1)', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#047857' }}>88%</div>
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Your Earnings</div>
                      </div>
                      <div style={{ flex: 1, background: 'rgba(100,116,139,0.08)', borderRadius: 12, padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#475569' }}>12%</div>
                        <div style={{ fontSize: '10px', color: '#6b7280', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>Platform Fee</div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '12px', color: '#92400e', lineHeight: 1.6, marginBottom: 12 }}>
                      Connect your Stripe account to receive payments. <strong>88%</strong> of each session fee goes directly to your bank.
                    </div>
                    <button
                      className="stripe-connect-btn"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={handleConnectStripe}
                      disabled={stripeLoading}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.92 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
                      </svg>
                      {stripeLoading ? 'Connecting...' : 'Connect Stripe Account'}
                    </button>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: 8, textAlign: 'center' }}>
                      Secured by Stripe · Takes ~2 minutes
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="section-title" style={{ marginTop: 18 }}>Available Dates & Times</div>
            {futureAvailability && futureAvailability.length > 0 ? (
              futureAvailability.map((dateEntry: any) => (
                <div key={dateEntry.date} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(244,182,58,0.05)', borderRadius: '8px', border: '1px solid rgba(244,182,58,0.2)' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#f4b63a', marginBottom: '8px' }}>
                    {new Date(dateEntry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    {dateEntry.timeSlots.map((slot: any, index: number) => (
                      <div
                        key={`${slot.time}-${slot.duration}-${index}`}
                        style={{ padding: '8px 10px', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #f4b63a', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#f4b63a' }}
                      >
                        {slot.time}
                        <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>{slot.duration} min</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(244,182,58,0.7)', marginTop: '8px' }}>
                    {dateEntry.timeSlots.length} slot(s) available
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(244,182,58,0.5)', fontSize: '14px' }}>
                No upcoming slots right now — feel free to request your preferred time.
              </div>
            )}

            <div style={{ fontSize: '20px', fontWeight: 800, marginBottom: 12 }}>
              NPR {profile.pricePerSession.toLocaleString()} / session
            </div>
            <button className="btn dark" style={{ width: '100%' }} onClick={openReserve}>Reserve</button>
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
        <div className="reservation-backdrop" onClick={() => setReserveOpen(false)}>
          <div className="reservation-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="reservation-modal-close" onClick={() => setReserveOpen(false)}>X</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}>
                {profile.profileImage && (
                  <img src={profile.profileImage} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div>
                <div className="reservation-modal-title">{profile.name}</div>
                <div className="reservation-modal-sub">Artist Reservation</div>
              </div>
            </div>

            <div className="reservation-modal-field">
              <label className="reservation-modal-label">1. Session Type</label>
              <div className="toggle-group">
                <button className={`toggle-btn ${sessionCategory === 'individual' ? 'active' : ''}`} onClick={() => setSessionCategory('individual')}>Individual</button>
                <button className={`toggle-btn ${sessionCategory === 'group' ? 'active' : ''}`} onClick={() => setSessionCategory('group')}>Group</button>
              </div>
              {sessionCategory === 'group' && (
                <div>
                  <label className="reservation-modal-label" style={{ marginTop: 12 }}>Number of Participants</label>
                  <input type="number" className="input" min="2" max="100" value={participantCount} onChange={(e) => setParticipantCount(Math.max(2, parseInt(e.target.value) || 2))} />
                  <div className="group-info">💡 Group sessions are {Math.round(((profile.groupSessionPriceMultiplier || 1.3) - 1) * 100)}% more expensive</div>
                </div>
              )}
            </div>

            <div className="reservation-modal-field">
              <label className="reservation-modal-label">2. Session Location</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className={`toggle-btn ${reserveType === 'studio' ? 'active' : ''}`} onClick={() => setReserveType('studio')}>Studio</button>
                <button className={`toggle-btn ${reserveType === 'in-house' ? 'active' : ''}`} onClick={() => setReserveType('in-house')}>In-House</button>
              </div>
              {reserveType === 'in-house' && (
                <input className="input" style={{ marginTop: '10px' }} type="text" placeholder="Enter your location" value={reserveLocation} onChange={(e) => setReserveLocation(e.target.value)} />
              )}
            </div>

            <div className="reservation-modal-field">
              <label className="reservation-modal-label">3. Session Date</label>
              <input type="date" className="input" value={reserveDate} onChange={(e) => { setReserveDate(e.target.value); setReserveTime(''); setCustomTime(''); setReserveError(''); setAvailabilityError(''); }} min={new Date().toISOString().split('T')[0]} />
              {profile.availabilityTimes && profile.availabilityTimes.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <label className="reservation-modal-label" style={{ fontSize: '9px', color: '#f4b63a', marginBottom: '4px' }}>💡 Choreographer's Preferred Dates</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {profile.availabilityTimes
                      .filter(dateEntry => new Date(dateEntry.date) >= new Date(new Date().setHours(0, 0, 0, 0)))
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map(dateEntry => (
                        <button
                          key={dateEntry.date}
                          type="button"
                          style={{ fontSize: '10px', padding: '6px 10px', flex: 'none', backgroundColor: reserveDate === dateEntry.date ? '#f4b63a' : '#f8fafc', color: reserveDate === dateEntry.date ? '#fff' : '#64748b', borderColor: reserveDate === dateEntry.date ? '#f4b63a' : '#e7e9f0', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', border: '1px solid' }}
                          onClick={() => { setReserveDate(dateEntry.date); setReserveTime(''); setCustomTime(''); setReserveError(''); setAvailabilityError(''); }}
                        >
                          {new Date(dateEntry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {hasPresetSlots ? (
              <div className="reservation-modal-field">
                <label className="reservation-modal-label">4. Artist Availability</label>
                {availabilityLoading && <div className="helper-text">Checking availability...</div>}
                {availabilityError && <div className="error-text">{availabilityError}</div>}
                {!reserveDate ? (
                  <div className="helper-text">Please select a date first.</div>
                ) : timeSlots.length === 0 ? (
                  <div className="helper-text">No available slots for this date.</div>
                ) : (
                  <div className="time-grid">
                    {timeSlots.map(slot => {
                      const isReserved = reservedSet.has(slot.time);
                      return (
                        <button
                          key={`${slot.time}-${slot.duration}`}
                          className={`time-btn ${reserveTime === slot.time ? 'active' : ''} ${isReserved ? 'disabled' : ''}`}
                          onClick={() => setReserveTime(slot.time)}
                          disabled={isReserved}
                          title={isReserved ? 'Already booked' : 'Select time'}
                        >
                          {slot.time}
                          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px', fontWeight: 'normal' }}>{slot.duration} min</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="reservation-modal-field">
                <label className="reservation-modal-label">4. Custom Time & Duration</label>
                <input type="time" className="input" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
                <div style={{ marginTop: 10 }}>
                  <label className="reservation-modal-label">Duration</label>
                  <select className="input" value={customDuration} onChange={(e) => setCustomDuration(parseInt(e.target.value))}>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>
            )}

            <div className="reservation-modal-field">
              <label className="reservation-modal-label">5. Additional Notes</label>
              <textarea className="input" style={{ minHeight: 60, fontFamily: 'inherit', resize: 'vertical' }} placeholder="Any special requests..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

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
                  Group Rate: {Math.round(((profile.groupSessionPriceMultiplier || 1.3) - 1) * 100)}% premium applied
                </div>
              )}
              <div className="summary-total">
                NPR {(Math.round((profile.pricePerSession * (sessionCategory === 'group' ? (profile.groupSessionPriceMultiplier || 1.3) : 1) + 50) * 100) / 100).toLocaleString()}
              </div>
            </div>

            {reserveError && <div className="error-text">{reserveError}</div>}
            <button className="btn dark" style={{ width: '100%', marginTop: '16px' }} onClick={submitReservation} disabled={reserveLoading}>
              {reserveLoading ? 'Reserving...' : 'Finalize Reservation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}