'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_TIME_SLOTS, DateAvailability, getFutureAvailability } from '@/lib/availability';
import MockPaymentModal from '@/components/MockPaymentModal';

interface Video {
  id: string;
  url: string;
  title: string;
  description?: string;
  uploadedAt: string;
}

interface Choreographer {
  id: string;
  name: string;
  email: string;
  bio?: string;
  location?: string;
  pricePerSession: number;
  groupSessionPriceMultiplier?: number;
  danceStyles: string[];
  profileImage?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  videos: Video[];
  availabilityTimes?: DateAvailability[];
}

interface NotificationItem {
  id: string;
  type: 'session-accepted' | 'session-rejected' | string;
  title: string;
  message: string;
  createdAt: string;
  read?: boolean;
}

interface ReservationItem {
  id: string;
  date: string;
  time: string;
  status: 'accepted' | 'confirmed' | 'rejected' | 'cancelled';
  choreographer: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export default function ClientDashboard() {
  const router = useRouter();
  const [choreographers, setChoreographers] = useState<Choreographer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('User');
  const [userId, setUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveFor, setReserveFor] = useState<Choreographer | null>(null);
  const [reserveDate, setReserveDate] = useState('');
  const [reserveTime, setReserveTime] = useState('');
  const [reserveType, setReserveType] = useState<'studio' | 'in-house'>('studio');
  const [reserveLocation, setReserveLocation] = useState('');
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveError, setReserveError] = useState('');
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [reservedTimes, setReservedTimes] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsError, setNotificationsError] = useState('');
  const [reminderNotifications, setReminderNotifications] = useState<NotificationItem[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'collective' | 'favorites'>('collective');
  const [sessionCategory, setSessionCategory] = useState<'individual' | 'group'>('individual');
  const [participantCount, setParticipantCount] = useState(2);
  const [customTime, setCustomTime] = useState('');
  const [customDuration, setCustomDuration] = useState(60);
  const [notes, setNotes] = useState('');
  const [hasPresetSlots, setHasPresetSlots] = useState(false);
  const [mockPaymentTarget, setMockPaymentTarget] = useState<any>(null);
  const reservedSet = useMemo(() => new Set(reservedTimes), [reservedTimes]);
  const timeSlots = useMemo(() => {
    if (!reserveFor || !reserveDate) return [];
    
    // Use the helper to filter future slots (with 5h buffer)
    const availabilityTimes = reserveFor.availabilityTimes || [];
    const futureAvailability = getFutureAvailability(availabilityTimes, 5);
    
    if (futureAvailability.length > 0) {
      const entry = futureAvailability.find(a => a.date === reserveDate);
      return entry ? entry.timeSlots : [];
    }
    
    // For default slots, we should also apply the 5h buffer logic if the date is today
    const today = new Date().toISOString().split('T')[0];
    if (reserveDate === today) {
      return DEFAULT_TIME_SLOTS.filter(slot => 
        getFutureAvailability([{ date: today, timeSlots: [slot] as any }], 5).length > 0
      );
    }
    
    return DEFAULT_TIME_SLOTS;
  }, [reserveFor, reserveDate]);
  const combinedNotifications = useMemo(() => {
    const all = [...reminderNotifications, ...notifications];
    const seen = new Set<string>();
    return all.filter(n => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  }, [reminderNotifications, notifications]);
  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );
  const latestUnreadKey = useMemo(() => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return '';
    const latest = unread.reduce((acc, n) => {
      const t = new Date(n.createdAt).getTime();
      const accT = acc ? new Date(acc.createdAt).getTime() : 0;
      return t > accT ? n : acc;
    }, unread[0]);
    return `${latest.id}:${latest.createdAt}`;
  }, [notifications]);

  const markNotificationsRead = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/notifications', { method: 'PATCH', headers });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const parseSessionDateTime = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return null;
    const parts = dateStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return null;
    const [year, month, day] = parts;

    // Handle HH:MM (24h) or HH:MM AM/PM format
    const timeParts = timeStr.trim().split(' ');
    let hours = 0;
    let mins = 0;

    if (timeParts.length === 2) {
      // 12h format: "10:30 AM"
      const [clock, meridiemRaw] = timeParts;
      const meridiem = meridiemRaw.toUpperCase();
      const [hh, mm] = clock.split(':').map(Number);
      if ([hh, mm].some(n => Number.isNaN(n))) return null;
      hours = hh % 12;
      if (meridiem === 'PM') hours += 12;
      mins = mm;
    } else {
      // 24h format: "14:30"
      const [hh, mm] = timeStr.split(':').map(Number);
      if ([hh, mm].some(n => Number.isNaN(n))) return null;
      hours = hh;
      mins = mm;
    }
    
    return new Date(year, month - 1, day, hours, mins, 0, 0);
  };

  const getDiffInHours = () => {
    if (!reserveDate) return Infinity;
    const timeToUse = hasPresetSlots ? reserveTime : customTime;
    if (!timeToUse) return Infinity;
    
    const sessionDate = parseSessionDateTime(reserveDate, timeToUse);
    if (!sessionDate) return Infinity;
    
    const now = new Date();
    const diffMs = sessionDate.getTime() - now.getTime();
    return diffMs / (1000 * 60 * 60);
  };
  const splitReason = (message: string) => {
    const marker = 'Reason:';
    const idx = message.indexOf(marker);
    if (idx === -1) return { base: message, reason: '' };
    const base = message.slice(0, idx).trim();
    const reason = message.slice(idx + marker.length).trim();
    return { base, reason };
  };

  const uniqueLocations = useMemo(() => {
    const items = choreographers
      .map(c => (c.location || '').trim())
      .filter(Boolean);
    return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));
  }, [choreographers]);

  const uniqueStyles = useMemo(() => {
    const items = choreographers.flatMap(c => c.danceStyles || []).map(s => s.trim()).filter(Boolean);
    return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));
  }, [choreographers]);

  const handleLogout = () => {
    document.cookie = 'authToken=; path=/; max-age=0';
    localStorage.removeItem('authToken');
    router.push('/signin');
  };

  const openReserve = (c: Choreographer) => {
    setReserveFor(c);
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
    setHasPresetSlots(false);
    setReserveOpen(true);
  };

  const submitReservation = async (manualPayNow?: boolean) => {
    if (!reserveFor) return;
    if (!reserveDate) { setReserveError('Please select a date.'); return; }
    
    let timeString = '';
    let duration = 60;
    
    if (hasPresetSlots) {
      if (!reserveTime) { setReserveError('Please select a time slot.'); return; }
      const slot = (reserveFor.availabilityTimes?.find(a => a.date === reserveDate)?.timeSlots || []).find(s => s.time === reserveTime);
      timeString = reserveTime;
      duration = slot?.duration || 60;
      if (reservedSet.has(timeString)) { setReserveError('Selected time is no longer available.'); return; }
    } else {
      if (!customTime) { setReserveError('Please enter a time.'); return; }
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(customTime)) {
        setReserveError('Invalid time format. Use HH:MM format.');
        return;
      }
      timeString = customTime;
      duration = customDuration;
    }

    if (sessionCategory === 'group' && participantCount < 2) {
      setReserveError('Group sessions require at least 2 participants.');
      return;
    }
    
    if (reserveType === 'in-house' && !reserveLocation.trim()) {
      setReserveError('Please add your location for in-house sessions.');
      return;
    }
    
    setReserveLoading(true);
    setReserveError('');
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const diff = getDiffInHours();
      const needsImmediatePay = hasPresetSlots && diff < 24;
      const payNow = manualPayNow !== undefined ? manualPayNow : needsImmediatePay;

      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          choreographerId: reserveFor.id,
          date: reserveDate,
          time: timeString,
          duration,
          sessionType: reserveType,
          location: reserveType === 'in-house' ? reserveLocation.trim() : '',
          sessionCategory,
          participantCount: sessionCategory === 'group' ? participantCount : 1,
          notes: notes.trim(),
          payNow, // Tell backend this is an immediate payment attempt
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to reserve');
      }

      if (payNow && hasPresetSlots) {
        // Trigger immediate payment modal
        setMockPaymentTarget({
          id: data.sessionId,
          total: (Math.round((reserveFor.pricePerSession * (sessionCategory === 'group' ? (reserveFor.groupSessionPriceMultiplier || 1.3) : 1) + 50) * 100) / 100),
          choreographer: { name: reserveFor.name },
          date: reserveDate,
          time: timeString
        });
        setReserveOpen(false);
      } else {
        setReserveOpen(false);
        const autoAccepted = hasPresetSlots;
        alert(autoAccepted 
          ? 'Slot Reserved! You can complete payment anytime from your Dashboard.' 
          : 'Reservation request submitted! Waiting for choreographer approval.');
      }
    } catch (err: any) {
      setReserveError(err.message || 'Failed to reserve');
    } finally {
      setReserveLoading(false);
    }
  };

  const fetchChoreographers = async (searchValue = '', styleValue = '', locationValue = '') => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (searchValue.trim()) params.set('search', searchValue.trim());
      if (styleValue.trim()) params.set('style', styleValue.trim());
      if (locationValue.trim()) params.set('location', locationValue.trim());
      const qs = params.toString();
      const res = await fetch(qs ? `/api/choreographers?${qs}` : '/api/choreographers');
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load choreographers');
      }
      setChoreographers(Array.isArray(data?.choreographers) ? data.choreographers : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load choreographers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChoreographers();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/auth/me', { headers });
        const data = await res.json();
        if (res.ok && data?.success && data?.user?.fullName) {
          setUserName(data.user.fullName);
          setUserId(data.user.id || '');
        }
      } catch {
        // keep fallback name
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        if (!userId) return;
        setNotificationsError('');
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/notifications', { headers });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load notifications');
        const items = Array.isArray(data?.notifications) ? data.notifications : [];
        setNotifications(items);
      } catch (err: any) {
        setNotificationsError(err.message || 'Failed to load notifications');
      }
    };
    loadNotifications();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (unreadCount === 0 && reminderNotifications.length === 0) return;
    const key = `clientNotificationsPopupShown:${userId}`;
    const lastKey = sessionStorage.getItem(key);
    const currentKey = latestUnreadKey || `reminders:${reminderNotifications.length}`;
    if (currentKey && lastKey !== currentKey) {
      setShowNotificationPopup(true);
      sessionStorage.setItem(key, currentKey);
    }
  }, [userId, unreadCount, reminderNotifications.length, latestUnreadKey]);

  useEffect(() => {
    const loadReminders = async () => {
      try {
        if (!userId) return;
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/sessions', { headers });
        const data = await res.json();
        if (!res.ok || !data?.success) return;
        const items: ReservationItem[] = Array.isArray(data?.sessions) ? data.sessions : [];
        const now = new Date();
        const cutoff = 24 * 60 * 60 * 1000;

        const reminders = items
          .map(r => {
            const sessionTime = parseSessionDateTime(r.date, r.time);
            if (!sessionTime) return null;
            const diff = sessionTime.getTime() - now.getTime();
            if (diff <= 0 || diff > cutoff) return null;
            const hours = Math.max(1, Math.ceil(diff / (60 * 60 * 1000)));
            return {
              id: `reminder-${r.id}`,
              type: 'session-reminder',
              title: 'Session Reminder',
              message: `You have a session with ${r.choreographer?.name || 'your choreographer'} in about ${hours} hour${hours === 1 ? '' : 's'} (${r.date} at ${r.time}).`,
              createdAt: now.toISOString(),
            } as NotificationItem;
          })
          .filter(Boolean) as NotificationItem[];

        setReminderNotifications(reminders);
      } catch {
        setReminderNotifications([]);
      }
    };
    loadReminders();
  }, [userId]);


  useEffect(() => {
    const key = `favorites:${userId || 'guest'}`;
    try {
      // Migrate any pre-login guest favorites into the logged-in user's bucket once.
      if (userId) {
        const guestRaw = localStorage.getItem('favorites:guest');
        const userRaw = localStorage.getItem(key);
        if (guestRaw && !userRaw) {
          localStorage.setItem(key, guestRaw);
        }
      }
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) {
        setFavorites(new Set(ids.map(String)));
      }
    } catch {
      // ignore invalid storage
    }
  }, [userId]);

  const toggleFavorite = (id: string) => {
    const key = `favorites:${userId || 'guest'}`;
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem(key, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchChoreographers(searchTerm, styleFilter, locationFilter);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, styleFilter, locationFilter]);

  useEffect(() => {
    const loadAvailability = async () => {
      if (!reserveOpen || !reserveFor || !reserveDate) {
        setReservedTimes([]);
        setAvailabilityError('');
        setAvailabilityLoading(false);
        setHasPresetSlots(false);
        return;
      }
      
      const dateEntry = reserveFor.availabilityTimes?.find(a => a.date === reserveDate);
      const preset = !!(dateEntry && dateEntry.timeSlots && dateEntry.timeSlots.length > 0);
      setHasPresetSlots(preset);
      
      setAvailabilityLoading(true);
      setAvailabilityError('');
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const params = new URLSearchParams({
          choreographerId: reserveFor.id,
          date: reserveDate,
        });
        const res = await fetch(`/api/sessions?${params.toString()}`, { headers });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to check availability');
        }
        const times = Array.isArray(data?.reservedTimes) ? data.reservedTimes.map(String) : [];
        setReservedTimes(times);
        if (times.includes(reserveTime)) {
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
  }, [reserveOpen, reserveFor?.id, reserveDate]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const style = styleFilter.trim().toLowerCase();
    const location = locationFilter.trim().toLowerCase();
    return choreographers.filter(c => {
      const matchesName = !term || c.name.toLowerCase().includes(term);
      const matchesStyle = !style || c.danceStyles.some(s => s.toLowerCase().includes(style));
      const matchesLocation = !location || (c.location || '').toLowerCase().includes(location);
      const matchesView = viewMode !== 'favorites' || favorites.has(c.id);
      return matchesName && matchesStyle && matchesLocation && matchesView;
    });
  }, [choreographers, searchTerm, styleFilter, locationFilter, viewMode, favorites]);

  return (
    <div className="client-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap');

        :root {
          --bg: #f6f7fb;
          --ink: #101114;
          --muted: #6b7280;
          --line: #e7e9f0;
          --pill: #f1f2f7;
          --accent: #f4b63a;
          --navy: #111827;
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .client-root {
          min-height: 100vh;
          background: var(--bg);
          color: var(--ink);
          font-family: 'Manrope', sans-serif;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 40px;
          border-bottom: 1px solid var(--line);
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 5;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brand-badge {
          width: 48px;
          height: 48px;
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 8px 18px rgba(0,0,0,0.18);
          overflow: hidden;
          display: grid;
          place-items: center;
        }
        .brand-badge img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.2); }
        .brand-name {
          font-weight: 700;
          letter-spacing: 0.4px;
        }
        .brand-sub {
          font-size: 10px;
          color: var(--accent);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: 2px;
        }
        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .nav-links {
          display: flex;
          gap: 18px;
          font-size: 12px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #6b7280;
          font-weight: 600;
        }
        .user-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 10px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: #fff;
          font-size: 12px;
          font-weight: 600;
        }
        .user-role {
          color: var(--accent);
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 1.2px;
          margin-left: 6px;
        }
        .logout-btn {
          border: none;
          background: #f1f2f7;
          color: #111827;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 8px;
          cursor: pointer;
        }
        .page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px 36px 60px;
        }
        .portal-label {
          font-size: 10px;
          letter-spacing: 3px;
          color: var(--accent);
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 22px;
        }
        .hero h1 {
          font-family: 'Playfair Display', serif;
          font-size: 34px;
          margin: 0;
        }
        .segmented {
          display: flex;
          gap: 6px;
          padding: 6px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 999px;
          font-size: 11px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .segmented button {
          border: none;
          background: transparent;
          padding: 7px 12px;
          border-radius: 999px;
          font-weight: 700;
          color: #6b7280;
          cursor: pointer;
        }
        .segmented button.active {
          background: var(--pill);
          color: #111827;
        }
        .notif-badge {
          margin-left: 8px;
          background: #111827;
          color: #fff;
          border-radius: 999px;
          padding: 2px 6px;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.6px;
        }
        .filters {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 18px;
          box-shadow: 0 10px 30px rgba(17, 24, 39, 0.06);
          margin-bottom: 24px;
        }
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .filter-label {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: 700;
          margin-bottom: 6px;
          display: block;
        }
        .input, .select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--line);
          background: #fafbff;
          font-size: 13px;
          outline: none;
        }
        .cards {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 28px;
        }
        @media (max-width: 1400px) {
          .cards { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 1024px) {
          .cards { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .cards { grid-template-columns: 1fr; }
        }
        .card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 30px;
          overflow: hidden;
          box-shadow: 0 18px 40px rgba(17, 24, 39, 0.15);
          transition: all 0.3s ease;
        }
        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 24px 56px rgba(17, 24, 39, 0.22);
        }
        .card-media {
          position: relative;
          height: 280px;
          background: linear-gradient(180deg, #1f2937 0%, #0f172a 100%);
        }
        .card-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .card-badge {
          position: absolute;
          top: 10px;
          left: 18px;
          background: #f59e0b;
          color: #111827;
          font-size: 9px;
          font-weight: 800;
          padding: 5px 6px;
          border-radius: 999px;
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
        }
        .card-rating {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(17,24,39,0.8);
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
          letter-spacing: 0.5px;
        }
        .card-fav {
          position: absolute;
          left: 10px;
          top: 44px;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: rgba(17,24,39,0.6);
          border: 1px solid rgba(255,255,255,0.35);
          color: #fff;
          display: grid;
          place-items: center;
          font-size: 17px;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
          user-select: none;
        }
        .card-fav.active {
          background: #fff;
          color: #e11d48;
          border-color: #fff;
          transform: scale(1.08);
        }
        .card-overlay {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          padding: 14px 14px 12px;
          background: linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.9) 100%);
          color: #fff;
        }
        .card-overlay .overlay-loc {
          font-size: 8px;
          letter-spacing: 1.8px;
          text-transform: uppercase;
          color: rgba(255,255,255,0.75);
          font-weight: 800;
        }
        .card-overlay .overlay-name {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          margin-top: 3px;
        }
        .card-body {
          padding: 14px 14px 18px;
        }
        .card-bio {
          font-size: 10.5px;
          color: #6b7280;
          line-height: 1.6;
          font-style: italic;
          min-height: 42px;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .tag-row {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
          margin: 10px 0 12px;
        }
        .tag {
          font-size: 7.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 3px 7px;
          border-radius: 999px;
          background: #f7f7fb;
          color: #6b7280;
        }
        .price-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 14px;
        }
        .price {
          font-weight: 800;
          font-size: 14px;
        }
        .price small {
          display: block;
          font-size: 8px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: #9ca3af;
        }
        .actions {
          display: flex;
          gap: 8px;
        }
        .btn {
          flex: 1;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid #e6e8ef;
          background: #fff;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn:hover {
          background: #fafbff;
        }
        .btn.primary {
          background: var(--navy);
          color: #fff;
          border-color: var(--navy);
        }
        .reservation-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          display: grid;
          place-items: center;
          z-index: 9999;
          padding: 24px;
          overflow-y: auto;
        }
        .reservation-modal-card {
          width: min(600px, 95vw);
          background: #fff;
          border-radius: 32px;
          padding: 32px;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);
          position: relative;
          margin: auto;
          animation: modalAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes modalAppear {
          from { transform: scale(0.95) translateY(20px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .reservation-modal-close {
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
          z-index: 10;
        }
        .reservation-modal-title {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          margin: 0 0 4px;
        }
        .reservation-modal-sub {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #f4b63a;
          font-weight: 700;
        }
        .modal-field { margin-top: 18px; }
        .reservation-modal-label {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #9ca3af;
          font-weight: 700;
          margin-bottom: 8px;
          display: block;
        }
        .time-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); 
          gap: 12px; 
          margin-top: 12px;
        }
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
          margin-top: 24px;
          padding: 24px;
          border-radius: 24px;
          background: #0f172a;
          color: #fff;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.2);
        }
        .summary-row { 
          display: flex; 
          justify-content: space-between; 
          font-size: 13px; 
          color: rgba(255,255,255,0.7); 
          margin-bottom: 8px;
        }
        .summary-total { 
          font-size: 24px; 
          font-weight: 800; 
          margin-top: 12px; 
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.1);
          color: var(--accent);
        }
        .summary-highlight { background: rgba(244, 182, 58, 0.1); padding: 10px; border-radius: 12px; margin-top: 12px; border: 1px solid rgba(244, 182, 58, 0.3); }
        .error-text { color: #b91c1c; font-size: 12px; margin-top: 10px; }
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
        .group-info { background: rgba(244, 182, 58, 0.05); padding: 12px; border-radius: 12px; border-left: 3px solid #f4b63a; font-size: 12px; color: #664d03; margin-top: 8px; }
        .btn.primary:hover {
          background: #1f2937;
        }
        .state {
          text-align: center;
          color: #6b7280;
          padding: 40px 0;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 16px;
        }
        .notif-popup {
          position: fixed;
          right: 24px;
          bottom: 24px;
          width: min(360px, 92vw);
          background: #0b1220;
          color: #fff;
          border-radius: 18px;
          padding: 16px;
          box-shadow: 0 20px 60px rgba(15,23,42,0.4);
          z-index: 60;
        }
        .notif-title {
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.6px;
        }
        .notif-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.6);
          margin: 6px 0 10px;
        }
        .notif-item {
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 10px;
          margin-top: 10px;
        }
        .notif-item:first-of-type {
          border-top: none;
          padding-top: 0;
          margin-top: 0;
        }
        .notif-item-title {
          font-size: 12px;
          font-weight: 700;
        }
        .notif-item-message {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          margin-top: 4px;
        }
        .notif-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }
        .notif-btn {
          flex: 1;
          border: none;
          border-radius: 999px;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          cursor: pointer;
        }
        .notif-btn.primary {
          background: var(--accent);
          color: #111827;
        }
        .notif-btn.ghost {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }
        @media (max-width: 760px) {
          .topbar { padding: 14px 18px; }
          .nav-links { display: none; }
          .page { padding: 24px 18px 50px; }
          .hero { flex-direction: column; align-items: flex-start; }
          .segmented { flex-wrap: wrap; }
        }
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
        <div className="topbar-actions">
          <div className="nav-links">
            <span onClick={() => router.push('/client/home')} style={{ cursor: 'pointer' }}>Home</span>
            <span onClick={() => router.push('/client/sessions')} style={{ cursor: 'pointer' }}>Sessions</span>
            <span onClick={() => router.push('/client/inbox')} style={{ cursor: 'pointer' }}>Inbox</span>
            <span onClick={() => router.push('/client/notifications')} style={{ cursor: 'pointer' }}>Notifications</span>
            <span onClick={() => router.push('/client/reviews')} style={{ cursor: 'pointer' }}>Reviews</span>
            <span onClick={() => router.push('/client/scores')} style={{ cursor: 'pointer' }}>Scores</span>
            <span onClick={() => router.push('/client/profile')} style={{ cursor: 'pointer' }}>Profile</span>
          </div>
          <div className="user-pill">
            <span>Hi, {userName}</span>
            <span className="user-role">Client</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="page">
        <div className="portal-label">Member Portal</div>
        <div className="hero">
          <h1>Namaste, {userName}</h1>
          <div className="segmented">
            <button
              className={viewMode === 'collective' ? 'active' : ''}
              onClick={() => setViewMode('collective')}
            >
              Collective
            </button>
            <button onClick={() => router.push('/client/sessions')}>Sessions</button>
            <button onClick={() => router.push('/client/inbox')}>Inbox</button>
            <button
              className={viewMode === 'favorites' ? 'active' : ''}
              onClick={() => setViewMode('favorites')}
            >
              Favorites
            </button>
            <button onClick={() => router.push('/client/notifications')}>
              Notifications
              {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
            </button>
            <button onClick={() => router.push('/client/reviews')}>Reviews</button>
            <button onClick={() => router.push('/client/scores')}>Scores</button>
            <button onClick={() => router.push('/client/profile')}>Profile</button>
          </div>
        </div>

        <div className="filters">
          <div className="filter-grid">
            <div>
              <label className="filter-label">Genre</label>
              <select
                className="select"
                value={styleFilter}
                onChange={e => setStyleFilter(e.target.value)}
              >
                <option value="">All Disciplines</option>
                {uniqueStyles.map(style => (
                  <option key={style} value={style}>{style}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="filter-label">Location</label>
              <select
                className="select"
                value={locationFilter}
                onChange={e => setLocationFilter(e.target.value)}
              >
                <option value="">Across Nepal</option>
                {uniqueLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="filter-label">Search Artists</label>
              <input
                className="input"
                type="text"
                placeholder="Artist name, style or studio..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && <div className="state">{error}</div>}

        {loading ? (
          <div className="state">Loading choreographers...</div>
        ) : filtered.length === 0 ? (
          <div className="state">
            {viewMode === 'favorites'
              ? 'No favorite choreographers yet. Tap the heart icon on any card to add favorites.'
              : 'No choreographers match your filters.'}
          </div>
        ) : (
          <div className="cards">
            {filtered.map(c => {
              const styles = (c.danceStyles || []).slice(0, 2);
              return (
                <div key={c.id} className="card">
                  <div className="card-media">
                    {c.profileImage && <img src={c.profileImage} alt={c.name} />}
                
                    
                    <div
                      className={`card-fav ${favorites.has(c.id) ? 'active' : ''}`}
                      onClick={() => toggleFavorite(c.id)}
                      role="button"
                      aria-pressed={favorites.has(c.id)}
                      title={favorites.has(c.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favorites.has(c.id) ? '♥' : '♡'}
                    </div>
                    <div className="card-overlay">
                      <div className="overlay-loc">{(c.location || 'Nepal').toUpperCase()}</div>
                      <div className="overlay-name">{c.name}</div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="card-bio">{c.bio || 'Specialist in diverse dance forms and modern choreography.'}</div>
                    <div className="tag-row">
                      {styles.map(s => (
                        <span key={s} className="tag">{s}</span>
                      ))}
                    </div>
                    <div className="price-row">
                      <div className="price">
                        NPR {c.pricePerSession.toLocaleString()}
                        <small>Per Session</small>
                      </div>
                    </div>
                    <div className="actions">
                      <button className="btn" onClick={() => router.push(`/choreographer/${c.id}`)}>View Profile</button>
                      <button className="btn primary" onClick={() => openReserve(c)}>Reserve</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {reserveOpen && reserveFor && (
        <div className="reservation-backdrop" onClick={() => setReserveOpen(false)}>
          <div className="reservation-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="reservation-modal-close" onClick={() => setReserveOpen(false)}>X</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}>
                {reserveFor.profileImage && (
                  <img src={reserveFor.profileImage} alt={reserveFor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div>
                <div className="reservation-modal-title">{reserveFor.name}</div>
                <div className="reservation-modal-sub">Artist Reservation</div>
              </div>
            </div>

            <div className="reservation-modal-field">
              <label className="reservation-modal-label">1. Session Type</label>
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
                  <label className="reservation-modal-label" style={{ marginTop: 12 }}>Number of Participants</label>
                  <input 
                    type="number" 
                    className="input" 
                    min="2" 
                    max="100"
                    value={participantCount}
                    onChange={(e) => setParticipantCount(Math.max(2, parseInt(e.target.value) || 2))}
                  />
                  <div className="group-info">
                    💡 Group sessions are {Math.round(((reserveFor.groupSessionPriceMultiplier || 1.3) - 1) * 100)}% more expensive
                  </div>
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

            <div className="reservation-modal-field">
              <label className="reservation-modal-label">3. Session Date</label>
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
              
              {reserveFor.availabilityTimes && reserveFor.availabilityTimes.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <label className="reservation-modal-label" style={{ fontSize: '9px', color: '#f4b63a', marginBottom: '4px' }}>
                    💡 Choreographer's Preferred Dates
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {getFutureAvailability(reserveFor.availabilityTimes || [], 5)
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
                      const t = slot.time;
                      const duration = slot.duration;
                      const isReserved = reservedSet.has(t);
                      return (
                        <button
                          key={`${t}-${duration}`}
                          className={`time-btn ${reserveTime === t ? 'active' : ''} ${isReserved ? 'disabled' : ''}`}
                          onClick={() => setReserveTime(t)}
                          disabled={isReserved}
                          title={isReserved ? 'Already booked' : 'Select time'}
                        >
                          {t}
                          <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px', fontWeight: 'normal' }}>
                            {duration} min
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="reservation-modal-field">
                <label className="reservation-modal-label">4. Custom Time & Duration</label>
                <input 
                  type="time"
                  className="input"
                  value={customTime}
                  onChange={(e) => setCustomTime(e.target.value)}
                />
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
              <textarea 
                className="input"
                style={{ minHeight: 60, fontFamily: 'inherit', resize: 'vertical' }}
                placeholder="Any special requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="summary">
              <div className="summary-row">
                <span>{sessionCategory === 'individual' ? 'Individual' : `Group (${participantCount} people)`} Session</span>
                <span>NPR {(reserveFor.pricePerSession * (sessionCategory === 'group' ? (reserveFor.groupSessionPriceMultiplier || 1.3) : 1)).toLocaleString()}</span>
              </div>
              <div className="summary-row" style={{ marginTop: '6px' }}>
                <span>Studio Access Fee</span>
                <span>NPR 50</span>
              </div>
              {sessionCategory === 'group' && (
                <div className="summary-highlight">
                  Group Rate: {Math.round(((reserveFor.groupSessionPriceMultiplier || 1.3) - 1) * 100)}% premium applied
                </div>
              )}
              <div className="summary-total">NPR {(Math.round((reserveFor.pricePerSession * (sessionCategory === 'group' ? (reserveFor.groupSessionPriceMultiplier || 1.3) : 1) + 50) * 100) / 100).toLocaleString()}</div>
            </div>

            {reserveError && <div className="error-text">{reserveError}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
              {getDiffInHours() < 24 && hasPresetSlots ? (
                /* URGENT PRESET SLOT: Force Pay */
                <button
                  className="btn primary"
                  style={{ width: '100%' }}
                  onClick={() => submitReservation(true)}
                  disabled={reserveLoading}
                >
                  {reserveLoading ? 'Processing...' : 'Pay & Book Now'}
                </button>
              ) : getDiffInHours() < 24 && !hasPresetSlots ? (
                /* URGENT CUSTOM TIME: Request Approval */
                <button
                  className="btn primary"
                  style={{ width: '100%' }}
                  onClick={() => submitReservation(false)}
                  disabled={reserveLoading}
                >
                  {reserveLoading ? 'Sending Request...' : 'Request Approval'}
                </button>
              ) : hasPresetSlots ? (
                /* PRESET SLOT (>24h): Dual Option */
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn"
                    style={{ flex: 1, background: '#f1f2f7', color: '#111827', border: '1px solid #e7e9f0' }}
                    onClick={() => submitReservation(false)}
                    disabled={reserveLoading}
                  >
                    Reserve Only
                  </button>
                  <button
                    className="btn primary"
                    style={{ flex: 1, background: '#f4b63a' }}
                    onClick={() => submitReservation(true)}
                    disabled={reserveLoading}
                  >
                    Pay & Book Now
                  </button>
                </div>
              ) : (
                /* CUSTOM TIME (>24h): Request Only */
                <button
                  className="btn primary"
                  style={{ width: '100%' }}
                  onClick={() => submitReservation(false)}
                  disabled={reserveLoading}
                >
                  {reserveLoading ? 'Sending Request...' : 'Request Reservation'}
                </button>
              )}
            </div>

            {getDiffInHours() < 24 && hasPresetSlots && (
              <div style={{ fontSize: '10px', color: '#ef4444', textAlign: 'center', marginTop: '8px', fontWeight: 'bold' }}>
                ⚠️ Sessions within 24 hours require immediate payment to secure.
              </div>
            )}
            {getDiffInHours() < 24 && !hasPresetSlots && (
              <div style={{ fontSize: '10px', color: '#f59e0b', textAlign: 'center', marginTop: '8px', fontWeight: 'bold' }}>
                ⚠️ Custom time sessions need choreographer approval first, even within 24 hours.
              </div>
            )}
            {hasPresetSlots && getDiffInHours() >= 24 && (
              <div style={{ fontSize: '10px', color: '#059669', textAlign: 'center', marginTop: '8px' }}>
                ✅ This slot is auto-accepted. Reserve now, pay later!
              </div>
            )}
          </div>
        </div>
      )}

      {mockPaymentTarget && (
        <MockPaymentModal
          sessionId={mockPaymentTarget.id}
          amount={mockPaymentTarget.total}
          choreographerName={mockPaymentTarget.choreographer?.name || 'Choreographer'}
          sessionDate={mockPaymentTarget.date}
          sessionTime={mockPaymentTarget.time}
          onClose={() => setMockPaymentTarget(null)}
          onSuccess={() => {
            setMockPaymentTarget(null);
            alert('Payment successful! Your session is now booked.');
            fetchChoreographers(searchTerm, styleFilter, locationFilter);
          }}
        />
      )}

          {showNotificationPopup && combinedNotifications.length > 0 && (
        <div className="notif-popup" role="status" aria-live="polite">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div className="notif-title">Session Notifications</div>
              <div className="notif-sub">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread update${unreadCount === 1 ? '' : 's'}.`
                  : 'You have session reminders.'}
              </div>
            </div>
            <button
              className="notif-btn ghost"
              style={{ flex: '0 0 auto', padding: '6px 10px' }}
              onClick={() => setShowNotificationPopup(false)}
              aria-label="Dismiss notifications"
            >
              Dismiss
            </button>
          </div>
          {combinedNotifications.slice(0, 3).map(n => {
            const { base, reason } = splitReason(n.message || '');
            return (
            <div key={n.id} className="notif-item">
              <div className="notif-item-title">{n.title}</div>
              <div className="notif-item-message">{base}</div>
              {reason && <div className="notif-item-message">Reason: {reason}</div>}
            </div>
            );
          })}
          {notificationsError && <div className="notif-sub">{notificationsError}</div>}
          <div className="notif-actions">
            <button
              className="notif-btn primary"
              onClick={() => {
                setShowNotificationPopup(false);
                markNotificationsRead();
                router.push('/client/notifications');
              }}
            >
              View Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
