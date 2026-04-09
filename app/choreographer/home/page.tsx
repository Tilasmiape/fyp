"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ChoreographerNavbar from '@/components/ChoreographerNavbar';
import EditProfileModal from '@/components/EditProfileModal';
import StripeConnectModal from '@/components/StripeConnectModal';
import { DateAvailability } from '@/lib/availability';
import BarChart from '@/components/charts/BarChart';
import PieChart from '@/components/charts/PieChart';

interface Booking {
  id: string;
  clientName: string;
  clientId?: string;
  date: string;
  time: string;
  duration?: number;
  status: 'pending' | 'accepted' | 'confirmed' | 'booked' | 'rejected' | 'completed' | 'cancelled';
  danceStyle: string;
  sessionType: string;
  location?: string;
  sessionCategory?: 'individual' | 'group';
  participantCount?: number;
  notes?: string;
  total?: number;
  paymentStatus?: 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
  choreographerEarnings?: number;
  platformFee?: number;
  decisionReason?: string;
}

interface FeedbackItem {
  feedback_id: string;
  comment: string;
  rating?: number;
  created_at: string;
}

interface DanceVideo {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  description?: string;
  uploadedAt: string;
  status?: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

const MAX_VIDEOS = 3;
const MAX_VIDEO_SIZE_MB = 3;

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

interface ChoreographerData {
  name: string;
  email: string;
  phone: string;
  bio: string;
  location?: string;
  pricePerSession: number;
  danceStyles: string[];
  videos: DanceVideo[];
  profileImage?: string;
  availability?: DateAvailability[];
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

interface NotificationItem {
  id: string;
  type: 'approved' | 'rejected' | 'pending' | 'info';
  title: string;
  message: string;
  date?: string;
}

interface APINotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface StripeStatus {
  connected: boolean;
  onboarded: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

export default function ChoreographerHome() {
  const router = useRouter();
  const postVideoRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'bookings' | 'profile' | 'posts' | 'availability'>('bookings');
  const [bookingTab, setBookingTab] = useState<'pending' | 'upcoming' | 'history'>('pending');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editAvailabilityOnly, setEditAvailabilityOnly] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const [postVideoPreview, setPostVideoPreview] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postError, setPostError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [apiNotifications, setApiNotifications] = useState<APINotification[]>([]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState<Booking | null>(null);

  // ── STRIPE STATE ──────────────────────────────────────────────────────────
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState('');
  const [showStripeConnectModal, setShowStripeConnectModal] = useState(false);
  // ─────────────────────────────────────────────────────────────────────────

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState('');
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);

  const [choreographerData, setChoreographerData] = useState<ChoreographerData>({
    name: 'Tilasmi Subedi',
    email: 'tilasmi@example.com',
    phone: '9876543210',
    bio: 'Professional choreographer with 5+ years of experience in Bollywood, Hip Hop, and Contemporary dance styles.',
    location: 'Kathmandu, Nepal',
    pricePerSession: 2000,
    danceStyles: ['Bollywood', 'Hip Hop', 'Contemporary'],
    videos: [],
    profileImage: '',
    availability: [],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/choreographer/profile', {
          method: 'GET',
          credentials: 'include',
        });
        const result = await response.json();
        if (!response.ok) return;

        const profile = result?.profile;
        if (!profile) return;

        setChoreographerData((prev) => ({
          ...prev,
          name: profile.name ?? prev.name,
          email: profile.email ?? prev.email,
          phone: profile.phone ?? prev.phone,
          bio: profile.bio ?? prev.bio,
          location: profile.location ?? prev.location,
          pricePerSession: Number(profile.pricePerSession ?? prev.pricePerSession),
          danceStyles: Array.isArray(profile.danceStyles) ? profile.danceStyles : prev.danceStyles,
          videos: Array.isArray(profile.videos) ? profile.videos : prev.videos,
          profileImage: profile.profileImage ?? prev.profileImage,
          availability: Array.isArray(profile.availabilityTimes) ? profile.availabilityTimes : prev.availability,
          approvalStatus: profile.approvalStatus ?? prev.approvalStatus,
        }));

        // ── Fetch Stripe status ──
        try {
          const sRes = await fetch('/api/choreographer/stripe-connect/status', { credentials: 'include' });
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
        // ────────────────────────

      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setProfileLoaded(true);
      }
    };

    fetchProfile();
  }, []);

  // ── Handle Stripe return from onboarding ─────────────────────────────────
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const stripeParam = sp.get('stripe');
    if (stripeParam === 'success' || stripeParam === 'refresh') {
      const refetch = async () => {
        try {
          const sRes = await fetch('/api/choreographer/stripe-connect/status', { credentials: 'include' });
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
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notifRes = await fetch('/api/notifications', { method: 'GET', credentials: 'include' });
        const notifData = await notifRes.json();
        if (notifRes.ok && notifData?.success) {
          setApiNotifications(Array.isArray(notifData?.notifications) ? notifData.notifications : []);
        }
      } catch {}
    };
    loadNotifications();
  }, []);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setBookingsLoading(true);
        setBookingsError('');
        const res = await fetch('/api/choreographer/sessions', { method: 'GET', credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load bookings');
        const items = Array.isArray(data?.sessions) ? data.sessions : [];
        setBookings(items.map((r: any) => ({
          id: r.id,
          clientName: r.client?.name || 'Client',
          clientId: r.client?.id || '',
          date: r.date,
          time: r.time,
          duration: r.duration || 60,
          status: r.status as Booking['status'],
          danceStyle: 'Session',
          sessionType: r.sessionType,
          location: r.location || '',
          sessionCategory: r.sessionCategory || 'individual',
          participantCount: r.participantCount || 1,
          notes: r.notes || '',
          total: r.total || 0,
          paymentStatus: r.paymentStatus,
          choreographerEarnings: Number(r.choreographerEarnings || 0),
          platformFee: Number(r.platformFee || 0),
          decisionReason: r.decisionReason || '',
        })));
      } catch (error: any) {
        setBookingsError(error.message || 'Failed to load bookings');
      } finally {
        setBookingsLoading(false);
      }
    };
    loadBookings();
  }, []);

  useEffect(() => {
    const loadFeedbacks = async () => {
      try {
        const res = await fetch('/api/choreographer/feedback', { method: 'GET', credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data?.success) return;
        setFeedbacks(Array.isArray(data.feedbacks) ? data.feedbacks : []);
      } catch {}
    };
    loadFeedbacks();
  }, []);

  useEffect(() => {
    if (!profileLoaded || !choreographerData.email) return;
    const notifications: NotificationItem[] = [];
    if (choreographerData.approvalStatus === 'approved') {
      notifications.push({ id: 'account-approved', type: 'approved', title: 'Account Approved', message: 'Your choreographer account has been approved.' });
    }
    if (choreographerData.approvalStatus === 'pending') {
      notifications.push({ id: 'account-pending', type: 'pending', title: 'Account Under Review', message: 'Your choreographer account is under review.' });
    }
    if (choreographerData.approvalStatus === 'rejected') {
      notifications.push({ id: 'account-rejected', type: 'rejected', title: 'Account Rejected', message: 'Your choreographer account was rejected.' });
    }
    const rejectedVideos = (choreographerData.videos || []).filter(v => v.status === 'rejected');
    rejectedVideos.forEach(v => {
      notifications.push({ id: `video-${v.id}`, type: 'rejected', title: `Video Rejected: ${v.title}`, message: v.rejectionReason || 'No reason provided.', date: v.uploadedAt });
    });
    const unreadReviews = apiNotifications.filter(n => !n.read && n.type === 'review-received');
    if (notifications.length === 0 && unreadReviews.length === 0) return;
    const key = `choreoNotificationsPopupShown:${choreographerData.email}`;
    const alreadyShown = sessionStorage.getItem(key);
    if (!alreadyShown) {
      setShowNotificationPopup(true);
      sessionStorage.setItem(key, '1');
    }
  }, [profileLoaded, choreographerData, apiNotifications]);

  // ── Stripe connect handler ────────────────────────────────────────────────
  const handleConnectStripe = () => {
    setShowStripeConnectModal(true);
  };

  const handleStripeConnectComplete = async () => {
    setShowStripeConnectModal(false);
    // Refresh stripe status
    try {
      const sRes = await fetch('/api/choreographer/stripe-connect/status', { credentials: 'include' });
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
  };
  // ─────────────────────────────────────────────────────────────────────────

  const updateBookingStatus = async (id: string, action: 'accept' | 'reject') => {
    const promptLabel = action === 'accept' ? 'Add a reason for accepting this session' : 'Add a reason for rejecting this session';
    const reason = window.prompt(promptLabel, '');
    if (!reason || !reason.trim()) { alert('A reason is required.'); return; }
    try {
      const res = await fetch(`/api/choreographer/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to update booking');
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: data.status as Booking['status'], decisionReason: reason.trim() } : b));
    } catch (error: any) {
      alert(error.message || 'Failed to update booking');
    }
  };

  const openFeedbackModal = (booking: Booking) => {
    setFeedbackTarget(booking);
    setFeedbackComment('');
    setFeedbackError('');
    setShowFeedbackModal(true);
  };

  const submitFeedback = async () => {
    if (!feedbackTarget) return;
    if (!feedbackTarget.clientId) { setFeedbackError('Client id is missing for this booking.'); return; }
    if (!feedbackComment.trim()) { setFeedbackError('Please add a comment before sending.'); return; }
    try {
      setFeedbackSaving(true);
      setFeedbackError('');
      const res = await fetch('/api/choreographer/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reciver_id: feedbackTarget.clientId || '', sessionId: feedbackTarget.id, comment: feedbackComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to send feedback');
      setShowFeedbackModal(false);
      setFeedbackTarget(null);
      setFeedbackComment('');
    } catch (error: any) {
      setFeedbackError(error.message || 'Failed to send feedback');
    } finally {
      setFeedbackSaving(false);
    }
  };

  const handleSaveProfile = async (updatedData: Partial<ChoreographerData>) => {
    setProfileError('');
    setIsSavingProfile(true);
    try {
      const response = await fetch('/api/choreographer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...updatedData, availabilityTimes: updatedData.availability }),
      });
      const result = await response.json();
      if (!response.ok) { setProfileError(result?.error || 'Failed to save profile'); return; }
      const profile = result?.profile;
      if (profile) {
        setChoreographerData((prev) => ({
          ...prev,
          name: profile.name ?? prev.name,
          email: profile.email ?? prev.email,
          phone: profile.phone ?? prev.phone,
          bio: profile.bio ?? prev.bio,
          location: profile.location ?? prev.location,
          pricePerSession: Number(profile.pricePerSession ?? prev.pricePerSession),
          danceStyles: Array.isArray(profile.danceStyles) ? profile.danceStyles : prev.danceStyles,
          videos: Array.isArray(profile.videos) ? profile.videos : prev.videos,
          profileImage: profile.profileImage ?? prev.profileImage,
          availability: Array.isArray(profile.availabilityTimes) ? profile.availabilityTimes : prev.availability,
          approvalStatus: profile.approvalStatus ?? prev.approvalStatus,
        }));
      } else {
        setChoreographerData((prev) => ({ ...prev, ...updatedData }));
      }
      setShowEditProfile(false);
      setEditAvailabilityOnly(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setProfileError('Failed to save profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenPost = () => {
    setShowPostModal(true);
    setPostVideoPreview('');
    setPostTitle('');
    setPostCaption('');
    setPostError('');
  };

  const handlePostVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPostError('');
    if (choreographerData.videos.length >= MAX_VIDEOS) { setPostError(`Maximum ${MAX_VIDEOS} videos allowed`); return; }
    if (!file.type.startsWith('video/')) { setPostError('Please upload a video file'); return; }
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) { setPostError(`Video must be less than ${MAX_VIDEO_SIZE_MB}MB`); return; }
    const dataUrl = await toDataUrl(file);
    setPostVideoPreview(dataUrl);
    if (!postTitle) setPostTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSubmitPost = async () => {
    if (!postVideoPreview) { setPostError('Please select a video'); return; }
    if (!postTitle.trim()) { setPostError('Please enter a title'); return; }
    if (choreographerData.videos.length >= MAX_VIDEOS) { setPostError(`Maximum ${MAX_VIDEOS} videos allowed`); return; }
    const newVideo: DanceVideo = {
      id: Date.now().toString(),
      url: postVideoPreview,
      title: postTitle.trim(),
      description: postCaption.trim(),
      uploadedAt: new Date().toISOString(),
      status: 'pending',
    };
    const updatedData: Partial<ChoreographerData> = { ...choreographerData, videos: [newVideo, ...choreographerData.videos] };
    const response = await fetch('/api/choreographer/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updatedData),
    });
    const result = await response.json();
    if (!response.ok) { setPostError(result?.error || 'Failed to save video'); return; }
    const profile = result?.profile;
    if (profile) {
      setChoreographerData((prev) => ({
        ...prev,
        name: profile.name ?? prev.name,
        email: profile.email ?? prev.email,
        phone: profile.phone ?? prev.phone,
        bio: profile.bio ?? prev.bio,
        location: profile.location ?? prev.location,
        pricePerSession: Number(profile.pricePerSession ?? prev.pricePerSession),
        danceStyles: Array.isArray(profile.danceStyles) ? profile.danceStyles : prev.danceStyles,
        videos: Array.isArray(profile.videos) ? profile.videos : prev.videos,
        profileImage: profile.profileImage ?? prev.profileImage,
      }));
    }
    setShowPostModal(false);
    setPostVideoPreview('');
    setPostTitle('');
    setPostCaption('');
    setPostError('');
  };

  const isPastSession = (date: string, time: string) => {
    if (!date || !time) return false;
    const parts = date.split('-').map(Number);
    if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return false;
    const [year, month, day] = parts;
    const timeParts = time.trim().split(' ');
    if (timeParts.length < 2) return false;
    const [clock, meridiemRaw] = timeParts;
    const meridiem = meridiemRaw.toUpperCase();
    const [hh, mm] = clock.split(':').map(Number);
    if ([hh, mm].some(n => Number.isNaN(n))) return false;
    let hours = hh % 12;
    if (meridiem === 'PM') hours += 12;
    const sessionTime = new Date(year, month - 1, day, hours, mm, 0, 0);
    return sessionTime.getTime() < Date.now();
  };

  const filteredBookings = bookings.filter(b => {
    if (bookingTab === 'pending') return b.status === 'pending';
    if (bookingTab === 'upcoming') return ['accepted', 'confirmed', 'booked'].includes(b.status) && !isPastSession(b.date, b.time);
    if (bookingTab === 'history') return (['accepted', 'confirmed', 'booked'].includes(b.status) && isPastSession(b.date, b.time)) || b.status === 'completed';
    return false;
  });

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const approvedVideos = choreographerData.videos.filter(v => v.status === 'approved');
  const pendingVideos = choreographerData.videos.filter(v => v.status === 'pending');
  const rejectedVideos = choreographerData.videos.filter(v => v.status === 'rejected');
  const ratedFeedbacks = feedbacks.filter(f => Number(f.rating) > 0);

  const averageRating = ratedFeedbacks.length > 0
    ? Math.round((ratedFeedbacks.reduce((sum, f) => sum + Number(f.rating || 0), 0) / ratedFeedbacks.length) * 10) / 10
    : 0;

  const completedSessionCount = bookings.filter((b) => {
    if (b.status === 'completed') return true;
    return (b.status === 'accepted' || b.status === 'confirmed' || b.status === 'booked') && isPastSession(b.date, b.time);
  }).length;

  const totalEarnings = bookings
    .filter((b) => b.paymentStatus === 'paid')
    .reduce((sum, b) => {
      const split = Number(b.choreographerEarnings || 0);
      if (split > 0) return sum + split;
      return sum + Math.round(Number(b.total || 0) * 0.88 * 100) / 100;
    }, 0);

  const bookingStatusPieData = [
    { label: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: '#f0c040' },
    { label: 'Accepted', value: bookings.filter(b => b.status === 'accepted' || b.status === 'confirmed' || b.status === 'booked').length, color: '#34d399' },
    { label: 'Completed', value: bookings.filter(b => b.status === 'completed').length, color: '#60a5fa' },
    { label: 'Rejected/Cancelled', value: bookings.filter(b => b.status === 'rejected' || b.status === 'cancelled').length, color: '#f87171' },
  ];

  const monthlySessionsBarData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx;
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('en-US', { month: 'short' }),
      };
    });

    const counts = new Map<string, number>(months.map((m) => [m.key, 0]));

    bookings.forEach((b) => {
      const date = new Date(`${b.date}T00:00:00`);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (counts.has(key)) counts.set(key, (counts.get(key) || 0) + 1);
    });

    return months.map((m) => ({
      label: m.label,
      value: counts.get(m.key) || 0,
      color: '#a78bfa',
    }));
  }, [bookings]);

  const unreadReviewCount = apiNotifications.filter(n => !n.read && n.type === 'review-received').length;
  const totalNotifications = (choreographerData.approvalStatus ? 1 : 0) + rejectedVideos.length + unreadReviewCount;

  const postsEmptyMessage =
    pendingVideos.length > 0 ? 'Your videos are pending review. Approved videos will appear here.'
    : rejectedVideos.length > 0 ? 'Your videos were rejected. Update and re-upload to get approved.'
    : 'No posts yet. Share your first dance video!';

  const getPaymentBadge = (paymentStatus?: Booking['paymentStatus']) => {
    switch (paymentStatus) {
      case 'paid':
        return { label: 'Paid', className: 'payment-paid' };
      case 'pending':
        return { label: 'Payment Pending', className: 'payment-pending' };
      case 'failed':
        return { label: 'Payment Failed', className: 'payment-failed' };
      case 'refunded':
        return { label: 'Refunded', className: 'payment-refunded' };
      default:
        return { label: 'Not Paid Yet', className: 'payment-unpaid' };
    }
  };

  const renderAvailabilitySection = () => (
    <div className="profile-section">
      <div className="profile-section-title">Available Dates & Times</div>
      {choreographerData.availability && choreographerData.availability.length > 0 ? (
        <>
          {choreographerData.availability.map((dateEntry) => (
            <div key={dateEntry.date} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(251,191,36,0.05)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fbbf24', marginBottom: '8px' }}>
                {new Date(dateEntry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {dateEntry.timeSlots.map((slot, index) => (
                  <div key={`${slot.time}-${slot.duration}-${index}`} style={{ padding: '8px 10px', backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.3)', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#fbbf24' }}>
                    {slot.time}
                    <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>{slot.duration} min</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>{dateEntry.timeSlots.length} slot(s) available on this date</div>
            </div>
          ))}
          <div style={{ fontSize: '12px', color: '#64748b', padding: '8px 12px', backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)' }}>
            {choreographerData.availability.length} date(s) with availability set.
          </div>
        </>
      ) : (
        <span style={{ color: '#94a3b8', fontSize: '13px' }}>No availability dates set yet</span>
      )}
    </div>
  );

  // ── Stripe Banner Component ───────────────────────────────────────────────
  const renderStripeBanner = () => {
    if (stripeStatus === null) return null;
    if (stripeStatus.onboarded) {
      return null;
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '16px 20px', marginBottom: '20px', borderRadius: '14px', background: 'rgba(99,91,255,0.12)', border: '1px solid rgba(99,91,255,0.4)' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', marginBottom: '4px' }}>
            Connect Stripe to Receive Payments
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Clients cannot pay you until your Stripe account is connected. You'll receive <strong style={{ color: '#fff' }}>88%</strong> of each session fee.
          </div>
          {stripeError && <div style={{ fontSize: '12px', color: '#f87171', marginTop: '6px' }}>{stripeError}</div>}
        </div>
        <button
          onClick={handleConnectStripe}
          disabled={stripeLoading}
          style={{ background: '#635bff', color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 20px', fontWeight: 700, fontSize: '13px', cursor: stripeLoading ? 'not-allowed' : 'pointer', opacity: stripeLoading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', fontFamily: 'Manrope, sans-serif' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.92 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
          </svg>
          {stripeLoading ? 'Connecting...' : 'Connect Stripe Account'}
        </button>
      </div>
    );
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .dash-root { min-height: 100vh; background: #f6f7fb; font-family: 'Manrope', sans-serif; color: #0f172a; }
        .nav { display: flex; justify-content: space-between; align-items: center; padding: 18px 48px; border-bottom: 1px solid #e7e9f0; position: sticky; top: 0; background: #fff; backdrop-filter: blur(12px); z-index: 100; }
        .nav-logo { display: flex; align-items: center; gap: 10px; font-family: 'Syne', sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px; background: linear-gradient(135deg, #f0c040 0%, #e07b20 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .nav-logo img { width: 48px; height: 48px; border-radius: 999px; background: #fff; box-shadow: 0 6px 16px rgba(0,0,0,0.25); object-fit: cover; transform: scale(1.2); }
        .nav-right { display: flex; align-items: center; gap: 8px; }
        .nav-btn { background: none; border: none; color: #64748b; font-family: 'Manrope', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; padding: 8px 16px; border-radius: 8px; transition: all 0.2s; }
        .nav-btn:hover { color: #0f172a; background: #f1f5f9; }
        .nav-btn-post { background: linear-gradient(135deg, #f0c040 0%, #e07b20 100%); color: #0d0d0f; font-weight: 700; border: none; padding: 10px 22px; border-radius: 10px; font-size: 14px; cursor: pointer; font-family: 'Manrope', sans-serif; transition: opacity 0.2s; display: flex; align-items: center; gap: 6px; }
        .nav-btn-post:hover { opacity: 0.88; }
        .nav-btn-logout { background: #fff; border: 1px solid #e7e9f0; color: #64748b; padding: 8px 18px; border-radius: 8px; font-size: 14px; cursor: pointer; font-family: 'Manrope', sans-serif; transition: all 0.2s; }
        .nav-btn-logout:hover { background: #f8fafc; color: #0f172a; }
        .body { display: flex; min-height: calc(100vh - 65px); background: #f6f7fb; }
        .sidebar { width: 240px; border-right: 1px solid #e7e9f0; padding: 32px 16px; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; background: #fff; }
        .sidebar-label { font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 1.2px; text-transform: uppercase; padding: 0 12px; margin-bottom: 8px; margin-top: 16px; }
        .sidebar-label:first-child { margin-top: 0; }
        .sidebar-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: #64748b; transition: all 0.2s; border: none; background: none; font-family: 'Manrope', sans-serif; width: 100%; text-align: left; }
        .sidebar-item:hover { background: #f1f5f9; color: #0f172a; }
        .sidebar-item.active { background: #eef2ff; color: #334155; font-weight: 700; }
        .sidebar-icon { font-size: 16px; width: 20px; text-align: center; }
        .main { flex: 1; padding: 40px 48px; overflow-y: auto; }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 40px; }
        .stat-card { background: #fff; border: 1px solid #e7e9f0; border-radius: 16px; padding: 22px 24px; transition: border-color 0.2s; box-shadow: 0 8px 22px rgba(15,23,42,0.06); }
        .stat-card:hover { border-color: #cbd5e1; }
        .stat-label { font-size: 12px; color: #64748b; margin-bottom: 8px; font-weight: 600; }
        .stat-value { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 700; }
        .analytics-grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; margin-bottom: 34px; }
        .analytics-card { background: #fff; border: 1px solid #e7e9f0; border-radius: 16px; padding: 18px; box-shadow: 0 8px 22px rgba(15,23,42,0.06); }
        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
        .section-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; color: #0f172a; }
        .tabs { display: flex; gap: 4px; background: #eef2f7; border-radius: 10px; padding: 4px; margin-bottom: 24px; width: fit-content; }
        .tab { padding: 8px 20px; border-radius: 8px; border: none; background: none; color: #64748b; font-size: 13px; font-weight: 700; cursor: pointer; font-family: 'Manrope', sans-serif; transition: all 0.2s; text-transform: capitalize; }
        .tab.active { background: #0f172a; color: #fff; }
        .booking-card { background: #fff; border: 1px solid #e7e9f0; border-radius: 14px; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; transition: border-color 0.2s, background 0.2s; }
        .booking-card:hover { background: #f8fafc; border-color: #cbd5e1; }
        .booking-name { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 6px; }
        .booking-meta { display: flex; gap: 18px; font-size: 13px; color: #64748b; flex-wrap: wrap; }
        .payment-pill { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.3px; }
        .payment-paid { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.35); }
        .payment-unpaid { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.35); }
        .payment-pending { background: rgba(96,165,250,0.15); color: #93c5fd; border: 1px solid rgba(96,165,250,0.35); }
        .payment-failed { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.35); }
        .payment-refunded { background: rgba(148,163,184,0.2); color: #cbd5e1; border: 1px solid rgba(148,163,184,0.35); }
        .booking-actions { display: flex; gap: 10px; align-items: center; }
        .btn-accept { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Manrope', sans-serif; transition: all 0.2s; }
        .btn-accept:hover { background: rgba(16,185,129,0.25); }
        .btn-reject { background: rgba(239,68,68,0.12); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Manrope', sans-serif; transition: all 0.2s; }
        .btn-reject:hover { background: rgba(239,68,68,0.22); }
        .btn-feedback { background: rgba(96,165,250,0.15); color: #93c5fd; border: 1px solid rgba(96,165,250,0.3); padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Manrope', sans-serif; transition: all 0.2s; }
        .btn-feedback:hover { background: rgba(96,165,250,0.25); }
        .btn-chat { background: rgba(15,23,42,0.12); color: #1f2937; border: 1px solid rgba(148,163,184,0.38); padding: 8px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; font-family: 'Manrope', sans-serif; transition: all 0.2s; }
        .btn-chat:hover { background: rgba(15,23,42,0.2); }
        .badge { padding: 6px 14px; border-radius: 7px; font-size: 12px; font-weight: 600; }
        .badge-confirmed { background: rgba(59,130,246,0.15); color: #60a5fa; }
        .badge-completed { background: rgba(16,185,129,0.15); color: #34d399; }
        .badge-cancelled { background: rgba(239,68,68,0.12); color: #f87171; }
        .profile-layout { display: grid; grid-template-columns: 280px 1fr; gap: 32px; }
        .profile-card { background: #fff; border: 1px solid #e7e9f0; border-radius: 20px; padding: 32px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 16px; height: fit-content; box-shadow: 0 8px 22px rgba(15,23,42,0.06); }
        .profile-avatar { width: 120px; height: 120px; border-radius: 20px; object-fit: cover; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-size: 48px; font-weight: 800; color: #fff; overflow: hidden; flex-shrink: 0; border: 2px solid rgba(240,192,64,0.2); }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-name { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #0f172a; }
        .profile-styles { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
        .style-tag { background: rgba(240,192,64,0.12); color: #f0c040; border: 1px solid rgba(240,192,64,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .profile-price { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700; color: #f0c040; }
        .profile-price-label { font-size: 11px; color: #64748b; margin-top: -10px; }
        .profile-stat-row { display: flex; gap: 16px; width: 100%; }
        .profile-mini-stat { flex: 1; background: #f8fafc; border: 1px solid #e7e9f0; border-radius: 12px; padding: 12px 8px; text-align: center; }
        .profile-mini-val { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; }
        .profile-mini-label { font-size: 11px; color: #64748b; margin-top: 2px; }
        .btn-edit-profile { width: 100%; background: #0f172a; border: 1px solid #0f172a; color: #fff; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Manrope', sans-serif; transition: all 0.2s; }
        .btn-edit-profile:hover { background: #1e293b; }
        .profile-right { display: flex; flex-direction: column; gap: 28px; }
        .profile-section { background: #fff; border: 1px solid #e7e9f0; border-radius: 20px; padding: 28px; box-shadow: 0 8px 22px rgba(15,23,42,0.06); }
        .profile-section-title { font-family: 'Manrope', sans-serif; font-size: 12px; font-weight: 800; color: #64748b; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 16px; }
        .bio-text { font-size: 15px; line-height: 1.75; color: #334155; }
        .contact-row { display: flex; gap: 24px; flex-wrap: wrap; }
        .contact-item { font-size: 14px; color: #475569; display: flex; align-items: center; gap: 8px; }
        .video-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .video-item { background: #fff; border: 1px solid #e7e9f0; border-radius: 14px; overflow: hidden; }
        .video-item video { width: 100%; height: 140px; object-fit: cover; display: block; }
        .video-placeholder { width: 100%; height: 140px; background: #f8fafc; display: flex; align-items: center; justify-content: center; font-size: 32px; }
        .video-info { padding: 12px 14px; }
        .video-title { font-size: 13px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .no-videos { text-align: center; padding: 40px 0; color: #94a3b8; font-size: 14px; }
        .posts-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
        .post-card { background: #fff; border: 1px solid #e7e9f0; border-radius: 18px; overflow: hidden; transition: border-color 0.2s, transform 0.2s; box-shadow: 0 8px 20px rgba(15,23,42,0.06); }
        .post-card:hover { border-color: #cbd5e1; transform: translateY(-2px); }
        .post-video-area { height: 200px; background: #f8fafc; display: flex; align-items: center; justify-content: center; font-size: 40px; position: relative; overflow: hidden; }
        .post-video-area video { width: 100%; height: 100%; object-fit: cover; }
        .post-body { padding: 18px 20px; }
        .post-title { font-family: 'Playfair Display', serif; font-size: 15px; font-weight: 700; margin-bottom: 8px; color: #0f172a; }
        .post-caption { font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 14px; }
        .post-footer { display: flex; justify-content: space-between; align-items: center; }
        .post-date { font-size: 12px; color: #94a3b8; }
        .empty { text-align: center; padding: 60px 0; color: #94a3b8; font-size: 14px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(4px); }
        .modal-box { background: #fff; border: 1px solid #e7e9f0; border-radius: 24px; padding: 36px; max-width: 560px; width: 100%; max-height: 90vh; overflow-y: auto; color: #0f172a; }
        .modal-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 700; margin-bottom: 24px; color: #0f172a; }
        .modal-label { display: block; font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 8px; }
        .modal-input { width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; color: #0f172a; font-size: 14px; font-family: 'Manrope', sans-serif; outline: none; transition: border-color 0.2s; }
        .modal-input:focus { border-color: rgba(240,192,64,0.5); }
        .modal-textarea { width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px; color: #0f172a; font-size: 14px; font-family: 'Manrope', sans-serif; outline: none; resize: vertical; min-height: 100px; transition: border-color 0.2s; }
        .modal-textarea:focus { border-color: rgba(240,192,64,0.5); }
        .upload-zone { width: 100%; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 14px; padding: 40px 20px; text-align: center; cursor: pointer; font-size: 14px; color: #64748b; transition: all 0.2s; font-family: 'Manrope', sans-serif; }
        .upload-zone:hover { border-color: #f4b63a; color: #334155; background: #fff8e8; }
        .modal-actions { display: flex; gap: 12px; margin-top: 8px; }
        .btn-post { flex: 1; background: linear-gradient(135deg, #f0c040 0%, #e07b20 100%); color: #0d0d0f; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; font-family: 'Manrope', sans-serif; transition: opacity 0.2s; }
        .btn-post:hover { opacity: 0.88; }
        .btn-cancel { flex: 1; background: #fff; border: 1px solid #e2e8f0; color: #334155; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 600; cursor: pointer; font-family: 'Manrope', sans-serif; transition: all 0.2s; }
        .btn-cancel:hover { background: #f8fafc; color: #0f172a; }
        .error-msg { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #f87171; border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
        .field-gap { display: flex; flex-direction: column; gap: 16px; }
        .divider { width: 100%; height: 1px; background: #e7e9f0; margin: 4px 0; }
        .notice { padding: 14px 18px; border-radius: 12px; border: 1px solid transparent; font-size: 14px; margin-bottom: 20px; }
        .notice-pending { background: #fffbeb; border-color: #fcd34d; color: #b45309; }
        .notice-approved { background: #ecfdf5; border-color: #6ee7b7; color: #047857; }
        .notice-rejected { background: #fef2f2; border-color: #fca5a5; color: #b91c1c; }
        .status-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
        .pill-pending { background: #fffbeb; color: #b45309; border: 1px solid #fcd34d; }
        .pill-approved { background: #ecfdf5; color: #047857; border: 1px solid #6ee7b7; }
        .pill-rejected { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }
        @media (max-width: 1180px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .analytics-grid { grid-template-columns: 1fr; }
          .profile-layout { grid-template-columns: 1fr; }
        }
        @media (max-width: 900px) {
          .body { flex-direction: column; }
          .sidebar { width: 100%; border-right: none; border-bottom: 1px solid #e7e9f0; }
          .main { padding: 24px 18px; }
          .stats-row { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="dash-root">
        {/* NAV */}
        <ChoreographerNavbar subtitle="Dashboard" />

        <div className="body">
          {/* SIDEBAR */}
          <aside className="sidebar">
            <span className="sidebar-label">Dashboard</span>
            <button className={`sidebar-item ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
              Bookings
            </button>
            <button className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              My Profile
            </button>
            <button className={`sidebar-item ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>
              My Posts
            </button>
            <button className={`sidebar-item ${activeTab === 'availability' ? 'active' : ''}`} onClick={() => setActiveTab('availability')}>
              Availability
            </button>
            <button className="sidebar-item" onClick={() => router.push('/choreographer/attendance')}>
              Attendance
            </button>
            <button className="sidebar-item" onClick={() => router.push('/choreographer/reviews')}>
              Reviews
            </button>
            <button className="sidebar-item" onClick={() => router.push('/choreographer/notifications')}>
              Notifications
              {totalNotifications > 0 && (
                <span style={{ marginLeft: 'auto', background: 'rgba(240,192,64,0.2)', color: '#f0c040', border: '1px solid rgba(240,192,64,0.35)', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700 }}>
                  {totalNotifications}
                </span>
              )}
            </button>
            <button className="sidebar-item" onClick={() => router.push('/choreographer/earnings')}>
              Earnings
            </button>

            <div className="divider" style={{ margin: '12px 0' }} />
            <span className="sidebar-label">Overview</span>
            <div style={{ padding: '8px 14px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>Earnings</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: '700', color: '#f0c040' }}>
                NPR {totalEarnings.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '8px 14px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Rating</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: '700' }}>{averageRating.toFixed(1)}</div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="main">

            {/* Account status notices */}
            {choreographerData.approvalStatus && choreographerData.approvalStatus !== 'approved' && (
              <div className={`notice ${choreographerData.approvalStatus === 'rejected' ? 'notice-rejected' : 'notice-pending'}`}>
                {choreographerData.approvalStatus === 'rejected' && 'Your choreographer account was rejected. Update your profile and contact support for review.'}
                {choreographerData.approvalStatus === 'pending' && 'Your choreographer account is under review. You will be notified once it is approved.'}
              </div>
            )}
            {rejectedVideos.length > 0 && (
              <div className="notice notice-rejected">
                {rejectedVideos.length} video{rejectedVideos.length === 1 ? '' : 's'} rejected. Update and re-upload if needed.
                {rejectedVideos.some(v => v.rejectionReason) && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#475569' }}>
                    {rejectedVideos.map(v => v.rejectionReason ? <div key={v.id}><strong>{v.title}:</strong> {v.rejectionReason}</div> : null)}
                  </div>
                )}
              </div>
            )}
            {pendingVideos.length > 0 && (
              <div className="notice notice-pending">{pendingVideos.length} video{pendingVideos.length === 1 ? '' : 's'} pending review.</div>
            )}

            {/* BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <>
                <div className="stats-row">
                  <div className="stat-card">
                    <div className="stat-label">Total Earnings</div>
                    <div className="stat-value" style={{ color: '#f0c040' }}>NPR {totalEarnings.toLocaleString()}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Completed Sessions</div>
                    <div className="stat-value" style={{ color: '#34d399' }}>{completedSessionCount}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Avg Rating</div>
                    <div className="stat-value" style={{ color: '#f59e0b' }}>{averageRating.toFixed(1)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Posts</div>
                    <div className="stat-value" style={{ color: '#a78bfa' }}>{approvedVideos.length}</div>
                  </div>
                </div>

                <div className="analytics-grid">
                  <div className="analytics-card">
                    <BarChart data={monthlySessionsBarData} title="Sessions (Last 6 Months)" />
                  </div>
                  <div className="analytics-card">
                    <PieChart data={bookingStatusPieData} title="Booking Status Mix" size={190} thickness={34} />
                  </div>
                </div>

                <div className="section-header">
                  <h2 className="section-title">Booking Requests</h2>
                </div>

                <div className="tabs">
                  {(['pending', 'upcoming', 'history'] as const).map(t => (
                    <button key={t} className={`tab ${bookingTab === t ? 'active' : ''}`} onClick={() => setBookingTab(t)}>{t}</button>
                  ))}
                </div>

                {bookingsLoading ? (
                  <div className="empty">Loading bookings...</div>
                ) : bookingsError ? (
                  <div className="empty">{bookingsError}</div>
                ) : filteredBookings.length === 0 ? (
                  <div className="empty">No bookings in this category</div>
                ) : (
                  filteredBookings.map(b => (
                    <div key={b.id} className="booking-card">
                      <div style={{ flex: 1 }}>
                        {(() => {
                          const paymentBadge = getPaymentBadge(b.paymentStatus);
                          return (
                            <div style={{ marginBottom: '8px' }}>
                              <span className={`payment-pill ${paymentBadge.className}`}>{paymentBadge.label}</span>
                            </div>
                          );
                        })()}
                        <div className="booking-name">{b.clientName}</div>
                        <div className="booking-meta">
                          <span>{b.date}</span>
                          <span>{b.time}</span>
                          <span>{b.duration}min</span>
                          <span>{b.sessionCategory === 'group' ? `Group (${b.participantCount} people)` : 'Individual'}</span>
                          <span>{b.sessionType === 'in-house' ? b.location : 'Studio'}</span>
                        </div>
                        {b.notes && (
                          <div className="booking-meta" style={{ marginTop: '8px', color: '#64748b', fontSize: '13px' }}>
                            Notes: {b.notes}
                          </div>
                        )}
                        {b.decisionReason && b.status !== 'pending' && (
                          <div className="booking-meta" style={{ marginTop: '6px', color: '#64748b' }}>
                            Reason: {b.decisionReason}
                          </div>
                        )}
                      </div>
                      <div className="booking-actions">
                        {b.clientId && (
                          <button className="btn-chat" onClick={() => router.push(`/client/${b.clientId}`)}>View Client</button>
                        )}
                        {b.clientId && (
                          <button className="btn-chat" onClick={() => router.push(`/choreographer/inbox?userId=${b.clientId}`)}>Chat</button>
                        )}
                        {b.status === 'pending' && (<>
                          <button className="btn-accept" onClick={() => updateBookingStatus(b.id, 'accept')}>Accept</button>
                          <button className="btn-reject" onClick={() => updateBookingStatus(b.id, 'reject')}>Reject</button>
                        </>)}
                        {((b.status === 'completed') || (b.status === 'accepted' && isPastSession(b.date, b.time))) && (
                          <button className="btn-feedback" onClick={() => openFeedbackModal(b)}>Send Feedback</button>
                        )}
                        {b.status === 'accepted' && <span className="badge badge-confirmed">Accepted</span>}
                        {b.status === 'rejected' && <span className="badge badge-cancelled">Rejected</span>}
                        {b.status === 'completed' && <span className="badge badge-completed">Completed</span>}
                        {b.status === 'cancelled' && <span className="badge badge-cancelled">Cancelled</span>}
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">My Profile</h2>
                  <button className="btn-edit-profile" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => { setEditAvailabilityOnly(false); setShowEditProfile(true); }}>
                    Edit Profile
                  </button>
                </div>
                {profileError && <div className="error-msg" style={{ marginBottom: '16px' }}>{profileError}</div>}
                {isSavingProfile && <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Saving profile...</div>}

                <div className="profile-layout">
                  <div className="profile-card">
                    <div className="profile-avatar">
                      {choreographerData.profileImage ? <img src={choreographerData.profileImage} alt="profile" /> : choreographerData.name.charAt(0)}
                    </div>
                    <div className="profile-name">{choreographerData.name}</div>
                    <div className="profile-styles">
                      {choreographerData.danceStyles.map(s => <span key={s} className="style-tag">{s}</span>)}
                    </div>
                    <div style={{ width: '100%', height: '1px', background: '#e7e9f0' }} />
                    <div className="profile-price">NPR {choreographerData.pricePerSession.toLocaleString()}</div>
                    <div className="profile-price-label">per session</div>
                    <div className="profile-stat-row">
                      <div className="profile-mini-stat">
                        <div className="profile-mini-val" style={{ color: '#34d399' }}>{completedSessionCount}</div>
                        <div className="profile-mini-label">Sessions</div>
                      </div>
                      <div className="profile-mini-stat">
                        <div className="profile-mini-val" style={{ color: '#f59e0b' }}>{averageRating.toFixed(1)}</div>
                        <div className="profile-mini-label">Rating</div>
                      </div>
                    </div>

                    <button className="btn-edit-profile" onClick={() => { setEditAvailabilityOnly(false); setShowEditProfile(true); }}>Edit Profile</button>
                  </div>

                  <div className="profile-right">
                    <div className="profile-section">
                      <div className="profile-section-title">About</div>
                      <p className="bio-text">{choreographerData.bio || <span style={{ color: '#94a3b8' }}>No bio added yet.</span>}</p>
                    </div>
                    <div className="profile-section">
                      <div className="profile-section-title">Contact</div>
                      <div className="contact-row">
                        <div className="contact-item"><span>{choreographerData.email}</span></div>
                        <div className="contact-item"><span>{choreographerData.phone || 'Not provided'}</span></div>
                        <div className="contact-item"><span>{choreographerData.location || 'Location not set'}</span></div>
                      </div>
                    </div>
                    {renderAvailabilitySection()}
                    <div className="profile-section">
                      <div className="profile-section-title">Dance Videos ({approvedVideos.length}/3)</div>
                      {approvedVideos.length === 0
                        ? <div className="no-videos"><div style={{ fontSize: '32px', marginBottom: '8px' }}></div>No videos uploaded yet.</div>
                        : <div className="video-grid">
                            {approvedVideos.map(v => (
                              <div key={v.id} className="video-item">
                                {v.url ? <video src={v.url} controls style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} /> : <div className="video-placeholder"></div>}
                                <div className="video-info">
                                  <div className="video-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <span>{v.title}</span>
                                    {v.status && <span className={`status-pill ${v.status === 'approved' ? 'pill-approved' : v.status === 'rejected' ? 'pill-rejected' : 'pill-pending'}`}>{v.status}</span>}
                                  </div>
                                  {v.description && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>{v.description}</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                      }
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* POSTS TAB */}
            {activeTab === 'posts' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">My Posts</h2>
                  <button className="nav-btn-post" onClick={handleOpenPost}>＋ New Post</button>
                </div>
                {approvedVideos.length === 0
                  ? <div className="empty"><div style={{ fontSize: '40px', marginBottom: '12px' }}></div>{postsEmptyMessage}</div>
                  : <div className="posts-grid">
                      {approvedVideos.map(v => (
                        <div key={v.id} className="post-card">
                          <div className="post-video-area">
                            {v.url ? <video src={v.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span></span>}
                          </div>
                          <div className="post-body">
                            <div className="post-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <span>{v.title}</span>
                              {v.status && <span className={`status-pill ${v.status === 'approved' ? 'pill-approved' : v.status === 'rejected' ? 'pill-rejected' : 'pill-pending'}`}>{v.status}</span>}
                            </div>
                            <div className="post-caption">{v.description || 'No description added.'}</div>
                            <div className="post-footer"><div className="post-date">{formatDate(v.uploadedAt)}</div></div>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </>
            )}

            {/* AVAILABILITY TAB */}
            {activeTab === 'availability' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">Availability</h2>
                  <button className="btn-edit-profile" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => { setEditAvailabilityOnly(true); setShowEditProfile(true); }}>
                    Edit Availability
                  </button>
                </div>
                {renderAvailabilitySection()}
              </>
            )}
          </main>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => { setShowEditProfile(false); setEditAvailabilityOnly(false); }}
        availabilityOnly={editAvailabilityOnly}
        choreographerData={choreographerData}
        onSave={handleSaveProfile}
        onAutoSaveAvailability={(avail) => setChoreographerData(prev => ({ ...prev, availability: avail }))}
      />

      {/* POST MODAL */}
      {showPostModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowPostModal(false)}>
          <div className="modal-box">
            <div className="modal-title">Create a Post</div>
            {postError && <div className="error-msg">{postError}</div>}
            <div className="field-gap">
              <div>
                <label className="modal-label">Video *</label>
                <input ref={postVideoRef} type="file" accept="video/*" onChange={handlePostVideoSelect} style={{ display: 'none' }} />
                {!postVideoPreview
                  ? <button className="upload-zone" onClick={() => postVideoRef.current?.click()}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>📹</div>
                      Click to upload a video<br /><span style={{ fontSize: '12px' }}>Max 3MB</span>
                    </button>
                  : <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden' }}>
                      <video src={postVideoPreview} controls style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block', borderRadius: '14px' }} />
                      <button onClick={() => setPostVideoPreview('')} style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                }
              </div>
              <div>
                <label className="modal-label">Title *</label>
                <input className="modal-input" type="text" value={postTitle} onChange={e => setPostTitle(e.target.value)} placeholder="Give your post a title..." />
              </div>
              <div>
                <label className="modal-label">Caption</label>
                <textarea className="modal-textarea" value={postCaption} onChange={e => setPostCaption(e.target.value)} placeholder="Share something about this video..." />
              </div>
              <div className="modal-actions">
                <button className="btn-post" onClick={handleSubmitPost}>Post</button>
                <button className="btn-cancel" onClick={() => setShowPostModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEEDBACK MODAL */}
      {showFeedbackModal && feedbackTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowFeedbackModal(false)}>
          <div className="modal-box">
            <div className="modal-title">Send Feedback</div>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '12px' }}>
              {feedbackTarget.clientName} · {feedbackTarget.date} · {feedbackTarget.time}
            </div>
            {feedbackError && <div className="error-msg" style={{ marginBottom: '12px' }}>{feedbackError}</div>}
            <div className="field-gap">
              <div>
                <label className="modal-label">Comment *</label>
                <textarea className="modal-textarea" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder="Share your feedback for the client..." />
              </div>
              <div className="modal-actions">
                <button className="btn-post" onClick={submitFeedback} disabled={feedbackSaving}>{feedbackSaving ? 'Sending...' : 'Send Feedback'}</button>
                <button className="btn-cancel" onClick={() => { setShowFeedbackModal(false); setFeedbackTarget(null); }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATION POPUP */}
      {showNotificationPopup && (
        <div style={{ position: 'fixed', right: '24px', bottom: '24px', width: '320px', background: '#ffffff', border: '1px solid #e7e9f0', borderRadius: '14px', padding: '16px 16px 14px', boxShadow: '0 20px 40px rgba(0,0,0,0.35)', zIndex: 1000 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Notifications</div>
            <button onClick={() => setShowNotificationPopup(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '10px' }}>
            You have {totalNotifications} notification{totalNotifications === 1 ? '' : 's'}.
            {unreadReviewCount > 0 && <span style={{ display: 'block', marginTop: '6px', color: '#334155' }}>{unreadReviewCount} new client review{unreadReviewCount === 1 ? '' : 's'}.</span>}
          </div>
          <button
            onClick={() => { setShowNotificationPopup(false); fetch('/api/notifications', { method: 'PATCH', credentials: 'include' }).catch(() => {}); router.push('/choreographer/notifications'); }}
            style={{ width: '100%', background: 'linear-gradient(135deg, #f0c040 0%, #e07b20 100%)', border: 'none', color: '#0d0d0f', fontWeight: 700, padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}
          >
            View Notifications
          </button>
        </div>
      )}

      {/* STRIPE CONNECT MODAL */}
      {showStripeConnectModal && (
        <StripeConnectModal
          onClose={() => setShowStripeConnectModal(false)}
          onComplete={handleStripeConnectComplete}
        />
      )}
    </>
  );
}

