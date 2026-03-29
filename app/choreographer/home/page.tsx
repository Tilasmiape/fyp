"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import EditProfileModal from '@/components/EditProfileModal';
import { DateAvailability } from '@/lib/availability';

interface Booking {
  id: string;
  clientName: string;
  clientId?: string;
  date: string;
  time: string;
  duration?: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  danceStyle: string;
  sessionType: string;
  location?: string;
  sessionCategory?: 'individual' | 'group';
  participantCount?: number;
  notes?: string;
  total?: number;
  decisionReason?: string;
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
  totalEarnings: number;
  totalSessions: number;
  rating: number;
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


  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState('');

  const [choreographerData, setChoreographerData] = useState<ChoreographerData>({
    name: 'Tilasmi Subedi',
    email: 'tilasmi@example.com',
    phone: '9876543210',
    bio: 'Professional choreographer with 5+ years of experience in Bollywood, Hip Hop, and Contemporary dance styles. I believe dance is a language that transcends barriers — my sessions focus on technique, expression, and joy. Based in Kathmandu, available for studio and in-house sessions.',
    location: 'Kathmandu, Nepal',
    pricePerSession: 2000,
    danceStyles: ['Bollywood', 'Hip Hop', 'Contemporary'],
    videos: [],
    profileImage: '',
    availability: [],
    totalEarnings: 45000,
    totalSessions: 28,
    rating: 4.8,
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
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setProfileLoaded(true);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notifRes = await fetch('/api/notifications', {
          method: 'GET',
          credentials: 'include',
        });
        const notifData = await notifRes.json();
        if (notifRes.ok && notifData?.success) {
          setApiNotifications(Array.isArray(notifData?.notifications) ? notifData.notifications : []);
        }
      } catch {
        // silent
      }
    };
    loadNotifications();
  }, []);

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setBookingsLoading(true);
        setBookingsError('');
        const res = await fetch('/api/choreographer/reservations', { method: 'GET', credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load bookings');
        }
        const items = Array.isArray(data?.reservations) ? data.reservations : [];
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
    if (!profileLoaded || !choreographerData.email) return;

    const notifications: NotificationItem[] = [];
    if (choreographerData.approvalStatus === 'approved') {
      notifications.push({
        id: 'account-approved',
        type: 'approved',
        title: 'Account Approved',
        message: 'Your choreographer account has been approved. You are now visible to clients.',
      });
    }
    if (choreographerData.approvalStatus === 'pending') {
      notifications.push({
        id: 'account-pending',
        type: 'pending',
        title: 'Account Under Review',
        message: 'Your choreographer account is under review. You will be notified once it is approved.',
      });
    }
    if (choreographerData.approvalStatus === 'rejected') {
      notifications.push({
        id: 'account-rejected',
        type: 'rejected',
        title: 'Account Rejected',
        message: 'Your choreographer account was rejected. Update your profile and contact support for review.',
      });
    }

    const rejectedVideos = (choreographerData.videos || []).filter(v => v.status === 'rejected');
    rejectedVideos.forEach(v => {
      notifications.push({
        id: `video-${v.id}`,
        type: 'rejected',
        title: `Video Rejected: ${v.title}`,
        message: v.rejectionReason || 'No reason provided.',
        date: v.uploadedAt,
      });
    });

    const unreadReviews = apiNotifications.filter(
      (n) => !n.read && n.type === 'review-received'
    );

    if (notifications.length === 0 && unreadReviews.length === 0) return;

    const key = `choreoNotificationsPopupShown:${choreographerData.email}`;
    const alreadyShown = sessionStorage.getItem(key);
    if (!alreadyShown) {
      setShowNotificationPopup(true);
      sessionStorage.setItem(key, '1');
    }
  }, [profileLoaded, choreographerData, apiNotifications]);

  const updateBookingStatus = async (id: string, action: 'accept' | 'reject') => {
    const promptLabel = action === 'accept'
      ? 'Add a reason for accepting this session'
      : 'Add a reason for rejecting this session';
    const reason = window.prompt(promptLabel, '');
    if (!reason || !reason.trim()) {
      alert('A reason is required.');
      return;
    }

    try {
      const res = await fetch(`/api/choreographer/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to update booking');
      }
      setBookings(prev => prev.map(b => (
        b.id === id
          ? { ...b, status: data.status as Booking['status'], decisionReason: reason.trim() }
          : b
      )));
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
    if (!feedbackTarget.clientId) {
      setFeedbackError('Client id is missing for this booking.');
      return;
    }
    if (!feedbackComment.trim()) {
      setFeedbackError('Please add a comment before sending.');
      return;
    }
    try {
      setFeedbackSaving(true);
      setFeedbackError('');
      const res = await fetch('/api/choreographer/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reciver_id: feedbackTarget.clientId || '',
          booking_id: feedbackTarget.id,
          comment: feedbackComment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to send feedback');
      }
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
      if (!response.ok) {
        setProfileError(result?.error || 'Failed to save profile');
        return;
      }

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

    const updatedData: Partial<ChoreographerData> = {
      ...choreographerData,
      videos: [newVideo, ...choreographerData.videos],
    };

    const response = await fetch('/api/choreographer/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(updatedData),
    });

    const result = await response.json();
    if (!response.ok) {
      setPostError(result?.error || 'Failed to save video');
      return;
    }

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
    if (bookingTab === 'upcoming') {
      return b.status === 'accepted' && !isPastSession(b.date, b.time);
    }
    if (bookingTab === 'history') {
      return (b.status === 'accepted' && isPastSession(b.date, b.time)) || b.status === 'completed';
    }
    return false;
  });

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const approvedVideos = choreographerData.videos.filter(v => v.status === 'approved');
  const pendingVideos = choreographerData.videos.filter(v => v.status === 'pending');
  const rejectedVideos = choreographerData.videos.filter(v => v.status === 'rejected');
  const unreadReviewCount = apiNotifications.filter(
    (n) => !n.read && n.type === 'review-received'
  ).length;
  const totalNotifications =
    (choreographerData.approvalStatus ? 1 : 0) + rejectedVideos.length + unreadReviewCount;
  const postsEmptyMessage =
    pendingVideos.length > 0
      ? 'Your videos are pending review. Approved videos will appear here.'
      : rejectedVideos.length > 0
        ? 'Your videos were rejected. Update and re-upload to get approved.'
        : 'No posts yet. Share your first dance video!';

  const renderAvailabilitySection = () => (
    <div className="profile-section">
      <div className="profile-section-title">📅 Available Dates & Times</div>
      {choreographerData.availability && choreographerData.availability.length > 0 ? (
        <>
          {choreographerData.availability.map((dateEntry) => (
            <div
              key={dateEntry.date}
              style={{
                marginBottom: '16px',
                padding: '12px',
                backgroundColor: 'rgba(251, 191, 36, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(251, 191, 36, 0.2)',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fbbf24', marginBottom: '8px' }}>
                {new Date(dateEntry.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {dateEntry.timeSlots.map((slot, index) => (
                  <div
                    key={`${slot.time}-${slot.duration}-${index}`}
                    style={{
                      padding: '8px 10px',
                      backgroundColor: 'rgba(251, 191, 36, 0.1)',
                      borderRadius: '6px',
                      border: '1px solid rgba(251, 191, 36, 0.3)',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#fbbf24',
                    }}
                  >
                    {slot.time}
                    <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                      {slot.duration} min
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '8px' }}>
                {dateEntry.timeSlots.length} slot(s) available on this date
              </div>
            </div>
          ))}
          <div
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.6)',
              padding: '8px 12px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            ✓ {choreographerData.availability.length} date(s) with availability set. Clients can book these time slots.
          </div>
        </>
      ) : (
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>No availability dates set yet</span>
      )}
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; }

        .dash-root {
          min-height: 100vh;
          background: #0d0d0f;
          font-family: 'DM Sans', sans-serif;
          color: #fff;
        }

        /* NAV */
        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 48px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          position: sticky;
          top: 0;
          background: rgba(13,13,15,0.92);
          backdrop-filter: blur(12px);
          z-index: 100;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 22px;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #f0c040 0%, #e07b20 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .nav-logo img {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 6px 16px rgba(0,0,0,0.25);
          object-fit: cover;
          transform: scale(1.2);
        }
        .nav-right { display: flex; align-items: center; gap: 8px; }
        .nav-btn {
          background: none;
          border: none;
          color: rgba(255,255,255,0.6);
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.2s;
        }
        .nav-btn:hover { color: #fff; background: rgba(255,255,255,0.07); }
        .nav-btn-post {
          background: linear-gradient(135deg, #f0c040 0%, #e07b20 100%);
          color: #0d0d0f;
          font-weight: 700;
          border: none;
          padding: 10px 22px;
          border-radius: 10px;
          font-size: 14px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: opacity 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .nav-btn-post:hover { opacity: 0.88; }
        .nav-btn-logout {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .nav-btn-logout:hover { background: rgba(255,255,255,0.1); color: #fff; }

        /* BODY LAYOUT */
        .body {
          display: flex;
          min-height: calc(100vh - 65px);
        }

        /* SIDEBAR */
        .sidebar {
          width: 240px;
          border-right: 1px solid rgba(255,255,255,0.07);
          padding: 32px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex-shrink: 0;
        }
        .sidebar-label {
          font-size: 11px;
          font-weight: 600;
          color: rgba(255,255,255,0.3);
          letter-spacing: 1.2px;
          text-transform: uppercase;
          padding: 0 12px;
          margin-bottom: 8px;
          margin-top: 16px;
        }
        .sidebar-label:first-child { margin-top: 0; }
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          transition: all 0.2s;
          border: none;
          background: none;
          font-family: 'DM Sans', sans-serif;
          width: 100%;
          text-align: left;
        }
        .sidebar-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); }
        .sidebar-item.active {
          background: rgba(240,192,64,0.12);
          color: #f0c040;
          font-weight: 600;
        }
        .sidebar-icon { font-size: 16px; width: 20px; text-align: center; }

        /* MAIN */
        .main { flex: 1; padding: 40px 48px; overflow-y: auto; }

        /* STATS ROW */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 40px;
        }
        .stat-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 22px 24px;
          transition: border-color 0.2s;
        }
        .stat-card:hover { border-color: rgba(255,255,255,0.14); }
        .stat-label { font-size: 12px; color: rgba(255,255,255,0.45); margin-bottom: 8px; font-weight: 500; }
        .stat-value { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 700; }

        /* SECTION HEADER */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .section-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #fff;
        }

        /* TABS */
        .tabs {
          display: flex;
          gap: 4px;
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 24px;
          width: fit-content;
        }
        .tab {
          padding: 8px 20px;
          border-radius: 8px;
          border: none;
          background: none;
          color: rgba(255,255,255,0.5);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
          text-transform: capitalize;
        }
        .tab.active {
          background: rgba(255,255,255,0.1);
          color: #fff;
        }

        /* BOOKING CARD */
        .booking-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          transition: border-color 0.2s, background 0.2s;
        }
        .booking-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.13); }
        .booking-name { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 6px; }
        .booking-meta { display: flex; gap: 18px; font-size: 13px; color: rgba(255,255,255,0.5); flex-wrap: wrap; }
        .booking-actions { display: flex; gap: 10px; align-items: center; }
        .btn-accept {
          background: rgba(16,185,129,0.15);
          color: #10b981;
          border: 1px solid rgba(16,185,129,0.3);
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .btn-accept:hover { background: rgba(16,185,129,0.25); }
        .btn-reject {
          background: rgba(239,68,68,0.12);
          color: #ef4444;
          border: 1px solid rgba(239,68,68,0.25);
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .btn-reject:hover { background: rgba(239,68,68,0.22); }
        .btn-feedback {
          background: rgba(96,165,250,0.15);
          color: #93c5fd;
          border: 1px solid rgba(96,165,250,0.3);
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .btn-feedback:hover { background: rgba(96,165,250,0.25); }
        .badge {
          padding: 6px 14px;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 600;
        }
        .badge-confirmed { background: rgba(59,130,246,0.15); color: #60a5fa; }
        .badge-completed { background: rgba(16,185,129,0.15); color: #34d399; }
        .badge-cancelled { background: rgba(239,68,68,0.12); color: #f87171; }

        /* PROFILE VIEW */
        .profile-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 32px;
        }
        .profile-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 32px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
          height: fit-content;
        }
        .profile-avatar {
          width: 120px;
          height: 120px;
          border-radius: 20px;
          object-fit: cover;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Syne', sans-serif;
          font-size: 48px;
          font-weight: 800;
          color: #fff;
          overflow: hidden;
          flex-shrink: 0;
          border: 2px solid rgba(240,192,64,0.2);
        }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-name { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 800; color: #fff; }
        .profile-styles {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: center;
        }
        .style-tag {
          background: rgba(240,192,64,0.12);
          color: #f0c040;
          border: 1px solid rgba(240,192,64,0.2);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }
        .profile-price {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #f0c040;
        }
        .profile-price-label { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: -10px; }
        .profile-stat-row {
          display: flex;
          gap: 16px;
          width: 100%;
        }
        .profile-mini-stat {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 12px 8px;
          text-align: center;
        }
        .profile-mini-val { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 700; }
        .profile-mini-label { font-size: 11px; color: rgba(255,255,255,0.4); margin-top: 2px; }
        .btn-edit-profile {
          width: 100%;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
          padding: 12px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .btn-edit-profile:hover { background: rgba(255,255,255,0.12); }

        /* PROFILE RIGHT */
        .profile-right { display: flex; flex-direction: column; gap: 28px; }
        .profile-section {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 28px;
        }
        .profile-section-title {
          font-family: 'Syne', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.8px;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .bio-text {
          font-size: 15px;
          line-height: 1.75;
          color: rgba(255,255,255,0.75);
        }
        .contact-row { display: flex; gap: 24px; flex-wrap: wrap; }
        .contact-item { font-size: 14px; color: rgba(255,255,255,0.6); display: flex; align-items: center; gap: 8px; }
        .contact-item span:first-child { font-size: 16px; }

        /* VIDEO GRID */
        .video-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .video-item {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          overflow: hidden;
        }
        .video-item video {
          width: 100%;
          height: 140px;
          object-fit: cover;
          display: block;
        }
        .video-placeholder {
          width: 100%;
          height: 140px;
          background: rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
        }
        .video-info { padding: 12px 14px; }
        .video-title { font-size: 13px; font-weight: 600; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .no-videos {
          text-align: center;
          padding: 40px 0;
          color: rgba(255,255,255,0.3);
          font-size: 14px;
        }

        /* POSTS GRID */
        .posts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 20px;
        }
        .post-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .post-card:hover { border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
        .post-video-area {
          height: 200px;
          background: rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          position: relative;
          overflow: hidden;
        }
        .post-video-area video { width: 100%; height: 100%; object-fit: cover; }
        .post-body { padding: 18px 20px; }
        .post-title { font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; margin-bottom: 8px; }
        .post-caption { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.6; margin-bottom: 14px; }
        .post-footer { display: flex; justify-content: space-between; align-items: center; }
        .post-stats { display: flex; gap: 14px; font-size: 13px; color: rgba(255,255,255,0.4); }
        .post-date { font-size: 12px; color: rgba(255,255,255,0.3); }

        /* EMPTY STATE */
        .empty { text-align: center; padding: 60px 0; color: rgba(255,255,255,0.3); font-size: 14px; }

        /* MODAL OVERLAY */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          backdrop-filter: blur(4px);
        }
        .modal-box {
          background: #141416;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 36px;
          max-width: 560px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; margin-bottom: 24px; }
        .modal-label { display: block; font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.5); letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 8px; }
        .modal-input {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 12px 14px;
          color: #fff;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.2s;
        }
        .modal-input:focus { border-color: rgba(240,192,64,0.5); }
        .modal-textarea {
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 10px;
          padding: 12px 14px;
          color: #fff;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          resize: vertical;
          min-height: 100px;
          transition: border-color 0.2s;
        }
        .modal-textarea:focus { border-color: rgba(240,192,64,0.5); }
        .upload-zone {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 2px dashed rgba(255,255,255,0.15);
          border-radius: 14px;
          padding: 40px 20px;
          text-align: center;
          cursor: pointer;
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          transition: all 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .upload-zone:hover { border-color: rgba(240,192,64,0.4); color: rgba(255,255,255,0.7); background: rgba(240,192,64,0.04); }
        .modal-actions { display: flex; gap: 12px; margin-top: 8px; }
        .btn-post {
          flex: 1;
          background: linear-gradient(135deg, #f0c040 0%, #e07b20 100%);
          color: #0d0d0f;
          border: none;
          border-radius: 12px;
          padding: 14px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: opacity 0.2s;
        }
        .btn-post:hover { opacity: 0.88; }
        .btn-cancel {
          flex: 1;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.7);
          border-radius: 12px;
          padding: 14px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
        }
        .btn-cancel:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .error-msg {
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.25);
          color: #f87171;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .field-gap { display: flex; flex-direction: column; gap: 16px; }
        .divider { width: 100%; height: 1px; background: rgba(255,255,255,0.06); margin: 4px 0; }
        .notice {
          padding: 14px 18px;
          border-radius: 12px;
          border: 1px solid transparent;
          font-size: 14px;
          margin-bottom: 20px;
        }
        .notice-pending {
          background: rgba(245,158,11,0.12);
          border-color: rgba(245,158,11,0.35);
          color: #fbbf24;
        }
        .notice-approved {
          background: rgba(16,185,129,0.12);
          border-color: rgba(16,185,129,0.35);
          color: #34d399;
        }
        .notice-rejected {
          background: rgba(239,68,68,0.12);
          border-color: rgba(239,68,68,0.35);
          color: #f87171;
        }
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .pill-pending { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.35); }
        .pill-approved { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.35); }
        .pill-rejected { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.35); }
      `}</style>

      <div className="dash-root">
        {/* NAV */}
        <nav className="nav">
          <span className="nav-logo">
            <img src="/images/logo.png" alt="Logo" />
            Step Out Studio
          </span>
          <div className="nav-right">
            <button className="nav-btn-post" onClick={handleOpenPost}>
              ＋ Post
            </button>
            <button className="nav-btn" onClick={() => { setEditAvailabilityOnly(false); setShowEditProfile(true); }}>Edit Profile</button>
            <button className="nav-btn" onClick={() => setActiveTab('availability')}>Availability</button>
            <button className="nav-btn-logout" onClick={() => router.push('/signin')}>Logout</button>
          </div>
        </nav>

        <div className="body">
          {/* SIDEBAR */}
          <aside className="sidebar">
            <span className="sidebar-label">Dashboard</span>
            <button className={`sidebar-item ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
              <span className="sidebar-icon">📋</span> Bookings
            </button>
            <button className={`sidebar-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              <span className="sidebar-icon">👤</span> My Profile
            </button>
            <button className={`sidebar-item ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>
              <span className="sidebar-icon">🎬</span> My Posts
            </button>
            <button className={`sidebar-item ${activeTab === 'availability' ? 'active' : ''}`} onClick={() => setActiveTab('availability')}>
              <span className="sidebar-icon">📅</span> Availability
            </button>
            <button className="sidebar-item" onClick={() => router.push('/choreographer/attendance')}>
              <span className="sidebar-icon">📝</span> Attendance
            </button>
            <button className="sidebar-item" onClick={() => router.push('/choreographer/reviews')}>
              <span className="sidebar-icon">💬</span> Reviews
            </button>
            <button className="sidebar-item" onClick={() => router.push('/choreographer/notifications')}>
              <span className="sidebar-icon">🔔</span> Notifications
              {totalNotifications > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'rgba(240,192,64,0.2)',
                  color: '#f0c040',
                  border: '1px solid rgba(240,192,64,0.35)',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}>
                  {totalNotifications}
                </span>
              )}
            </button>
            <div className="divider" style={{ margin: '12px 0' }} />
            <span className="sidebar-label">Overview</span>
            <div style={{ padding: '8px 14px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>Earnings</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: '700', color: '#f0c040' }}>
                NPR {choreographerData.totalEarnings.toLocaleString()}
              </div>
            </div>
            <div style={{ padding: '8px 14px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>Rating</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: '700' }}>⭐ {choreographerData.rating}</div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="main">
            {choreographerData.approvalStatus && (
              <div
                className={`notice ${
                  choreographerData.approvalStatus === 'approved'
                    ? 'notice-approved'
                    : choreographerData.approvalStatus === 'rejected'
                      ? 'notice-rejected'
                      : 'notice-pending'
                }`}
              >
                {choreographerData.approvalStatus === 'approved' && 'Your choreographer account has been approved. You are now visible to clients.'}
                {choreographerData.approvalStatus === 'rejected' && 'Your choreographer account was rejected. Update your profile and contact support for review.'}
                {choreographerData.approvalStatus === 'pending' && 'Your choreographer account is under review. You will be notified once it is approved.'}
              </div>
            )}
            {approvedVideos.length > 0 && (
              <div className="notice notice-approved">
                {approvedVideos.length} video{approvedVideos.length === 1 ? '' : 's'} approved and visible on your profile.
              </div>
            )}
            {rejectedVideos.length > 0 && (
              <div className="notice notice-rejected">
                {rejectedVideos.length} video{rejectedVideos.length === 1 ? '' : 's'} rejected. Update and re-upload if needed.
                {rejectedVideos.some(v => v.rejectionReason) && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                    {rejectedVideos.map(v => v.rejectionReason ? (
                      <div key={v.id}><strong>{v.title}:</strong> {v.rejectionReason}</div>
                    ) : null)}
                  </div>
                )}
              </div>
            )}
            {pendingVideos.length > 0 && (
              <div className="notice notice-pending">
                {pendingVideos.length} video{pendingVideos.length === 1 ? '' : 's'} pending review.
              </div>
            )}

            {/* ── BOOKINGS TAB ── */}
            {activeTab === 'bookings' && (
              <>
                {/* Stats */}
                <div className="stats-row">
                  <div className="stat-card">
                    <div className="stat-label">Total Earnings</div>
                    <div className="stat-value" style={{ color: '#f0c040' }}>NPR {choreographerData.totalEarnings.toLocaleString()}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Sessions</div>
                    <div className="stat-value" style={{ color: '#34d399' }}>{choreographerData.totalSessions}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Avg Rating</div>
                    <div className="stat-value" style={{ color: '#f59e0b' }}>⭐ {choreographerData.rating}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Posts</div>
                    <div className="stat-value" style={{ color: '#a78bfa' }}>{approvedVideos.length}</div>
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
                        <div className="booking-name">{b.clientName}</div>
                        <div className="booking-meta">
                          <span>📅 {b.date}</span>
                          <span>🕐 {b.time}</span>
                          <span>⏱️ {b.duration}min</span>
                          <span>💃 {b.sessionCategory === 'group' ? `Group (${b.participantCount} people)` : 'Individual'}</span>
                          <span>📍 {b.sessionType === 'in-house' ? b.location : 'Studio'}</span>
                        </div>
                        {b.notes && (
                          <div className="booking-meta" style={{ marginTop: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '13px' }}>
                            💬 Notes: {b.notes}
                          </div>
                        )}
                        {b.decisionReason && b.status !== 'pending' && (
                          <div className="booking-meta" style={{ marginTop: '6px', color: 'rgba(255,255,255,0.55)' }}>
                            Reason: {b.decisionReason}
                          </div>
                        )}
                      </div>
                      <div className="booking-actions">
                        {b.status === 'pending' && (<>
                          <button className="btn-accept" onClick={() => updateBookingStatus(b.id, 'accept')}>Accept</button>
                          <button className="btn-reject" onClick={() => updateBookingStatus(b.id, 'reject')}>Reject</button>
                        </>)}
                        {((b.status === 'completed') || (b.status === 'accepted' && isPastSession(b.date, b.time))) && (
                          <button className="btn-feedback" onClick={() => openFeedbackModal(b)}>
                            Send Feedback
                          </button>
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

            {/* ── PROFILE TAB ── */}
            {activeTab === 'profile' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">My Profile</h2>
                  <button className="btn-edit-profile" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => { setEditAvailabilityOnly(false); setShowEditProfile(true); }}>
                    ✏️ Edit Profile
                  </button>
                </div>
                {profileError && <div className="error-msg" style={{ marginBottom: '16px' }}>{profileError}</div>}
                {isSavingProfile && <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.55)', marginBottom: '16px' }}>Saving profile...</div>}

                <div className="profile-layout">
                  {/* Left Card */}
                  <div className="profile-card">
                    <div className="profile-avatar">
                      {choreographerData.profileImage
                        ? <img src={choreographerData.profileImage} alt="profile" />
                        : choreographerData.name.charAt(0)
                      }
                    </div>
                    <div className="profile-name">{choreographerData.name}</div>
                    <div className="profile-styles">
                      {choreographerData.danceStyles.map(s => <span key={s} className="style-tag">{s}</span>)}
                    </div>
                    <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.07)' }} />
                    <div className="profile-price">NPR {choreographerData.pricePerSession.toLocaleString()}</div>
                    <div className="profile-price-label">per session</div>
                    <div className="profile-stat-row">
                      <div className="profile-mini-stat">
                        <div className="profile-mini-val" style={{ color: '#34d399' }}>{choreographerData.totalSessions}</div>
                        <div className="profile-mini-label">Sessions</div>
                      </div>
                      <div className="profile-mini-stat">
                        <div className="profile-mini-val" style={{ color: '#f59e0b' }}>⭐{choreographerData.rating}</div>
                        <div className="profile-mini-label">Rating</div>
                      </div>
                    </div>
                    <button className="btn-edit-profile" onClick={() => { setEditAvailabilityOnly(false); setShowEditProfile(true); }}>✏️ Edit Profile</button>
                  </div>

                  {/* Right sections */}
                  <div className="profile-right">
                    {/* Bio */}
                    <div className="profile-section">
                      <div className="profile-section-title">About</div>
                      <p className="bio-text">
                        {choreographerData.bio || <span style={{ color: 'rgba(255,255,255,0.3)' }}>No bio added yet. Click Edit Profile to add one.</span>}
                      </p>
                    </div>

                    {/* Contact */}
                    <div className="profile-section">
                      <div className="profile-section-title">Contact</div>
                      <div className="contact-row">
                        <div className="contact-item"><span>✉️</span><span>{choreographerData.email}</span></div>
                        <div className="contact-item"><span>📞</span><span>{choreographerData.phone || 'Not provided'}</span></div>
                        <div className="contact-item"><span>📍</span><span>{choreographerData.location || 'Location not set'}</span></div>
                      </div>
                    </div>

                    {/* Availability */}
                    {renderAvailabilitySection()}

                    {/* Videos from Edit Profile */}
                    <div className="profile-section">
                    <div className="profile-section-title">Dance Videos ({approvedVideos.length}/3)</div>
                      {approvedVideos.length === 0
                        ? <div className="no-videos">
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎬</div>
                            No videos uploaded yet.<br />
                            <span style={{ fontSize: '12px' }}>Go to Edit Profile → add up to 3 demo videos.</span>
                          </div>
                        : <div className="video-grid">
                            {approvedVideos.map(v => (
                              <div key={v.id} className="video-item">
                                {v.url
                                  ? <video src={v.url} controls style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                                  : <div className="video-placeholder">🎥</div>
                                }
                                <div className="video-info">
                                  <div className="video-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                    <span>{v.title}</span>
                                    {v.status && (
                                      <span
                                        className={`status-pill ${
                                          v.status === 'approved'
                                            ? 'pill-approved'
                                            : v.status === 'rejected'
                                              ? 'pill-rejected'
                                              : 'pill-pending'
                                        }`}
                                      >
                                        {v.status}
                                      </span>
                                    )}
                                  </div>
                                  {v.description && <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '6px' }}>{v.description}</div>}
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

            {/* ── POSTS TAB ── */}
            {activeTab === 'posts' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">My Posts</h2>
                  <button className="nav-btn-post" onClick={handleOpenPost}>＋ New Post</button>
                </div>

                {approvedVideos.length === 0
                  ? <div className="empty">
                      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                      {postsEmptyMessage}
                    </div>
                  : <div className="posts-grid">
                      {approvedVideos.map(v => (
                        <div key={v.id} className="post-card">
                          <div className="post-video-area">
                            {v.url
                              ? <video src={v.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span>🎬</span>
                            }
                          </div>
                          <div className="post-body">
                            <div className="post-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <span>{v.title}</span>
                              {v.status && (
                                <span
                                  className={`status-pill ${
                                    v.status === 'approved'
                                      ? 'pill-approved'
                                      : v.status === 'rejected'
                                        ? 'pill-rejected'
                                        : 'pill-pending'
                                  }`}
                                >
                                  {v.status}
                                </span>
                              )}
                            </div>
                            <div className="post-caption">{v.description || 'No description added.'}</div>
                            <div className="post-footer">
                              <div className="post-date">{formatDate(v.uploadedAt)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </>
            )}

            {/* â”€â”€ AVAILABILITY TAB â”€â”€ */}
            {activeTab === 'availability' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">Availability</h2>
                  <button className="btn-edit-profile" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => { setEditAvailabilityOnly(true); setShowEditProfile(true); }}>
                    âœï¸ Edit Availability
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
              {/* Video Upload */}
              <div>
                <label className="modal-label">Video *</label>
                <input ref={postVideoRef} type="file" accept="video/*" onChange={handlePostVideoSelect} style={{ display: 'none' }} />
                {!postVideoPreview
                  ? <button className="upload-zone" onClick={() => postVideoRef.current?.click()}>
                      <div style={{ fontSize: '28px', marginBottom: '8px' }}>📹</div>
                      Click to upload a video<br />
                      <span style={{ fontSize: '12px' }}>Max 3MB</span>
                    </button>
                  : <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden' }}>
                      <video src={postVideoPreview} controls style={{ width: '100%', height: '220px', objectFit: 'cover', display: 'block', borderRadius: '14px' }} />
                      <button
                        onClick={() => { setPostVideoPreview(''); }}
                        style={{ position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >✕</button>
                    </div>
                }
              </div>

              {/* Title */}
              <div>
                <label className="modal-label">Title *</label>
                <input
                  className="modal-input"
                  type="text"
                  value={postTitle}
                  onChange={e => setPostTitle(e.target.value)}
                  placeholder="Give your post a title..."
                />
              </div>

              {/* Caption */}
              <div>
                <label className="modal-label">Caption</label>
                <textarea
                  className="modal-textarea"
                  value={postCaption}
                  onChange={e => setPostCaption(e.target.value)}
                  placeholder="Share something about this video — the story, the style, the vibe..."
                />
              </div>

              <div className="modal-actions">
                <button className="btn-post" onClick={handleSubmitPost}>Post</button>
                <button className="btn-cancel" onClick={() => setShowPostModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFeedbackModal && feedbackTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowFeedbackModal(false)}>
          <div className="modal-box">
            <div className="modal-title">Send Feedback</div>

            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
              {feedbackTarget.clientName} · {feedbackTarget.date} · {feedbackTarget.time}
            </div>

            {feedbackError && <div className="error-msg" style={{ marginBottom: '12px' }}>{feedbackError}</div>}

            <div className="field-gap">
              <div>
                <label className="modal-label">Comment *</label>
                <textarea
                  className="modal-textarea"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Share your feedback for the client..."
                />
              </div>
              <div className="modal-actions">
                <button className="btn-post" onClick={submitFeedback} disabled={feedbackSaving}>
                  {feedbackSaving ? 'Sending...' : 'Send Feedback'}
                </button>
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setShowFeedbackModal(false);
                    setFeedbackTarget(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNotificationPopup && (
        <div
          style={{
            position: 'fixed',
            right: '24px',
            bottom: '24px',
            width: '320px',
            background: 'rgba(20,20,22,0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            padding: '16px 16px 14px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
            zIndex: 1000,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '16px', fontWeight: 700 }}>Notifications</div>
            <button
              onClick={() => setShowNotificationPopup(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                fontSize: '16px',
                lineHeight: 1,
              }}
              aria-label="Dismiss notifications"
            >
              ×
            </button>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '10px' }}>
            You have {totalNotifications} notification{totalNotifications === 1 ? '' : 's'}.
            {unreadReviewCount > 0 && (
              <span style={{ display: 'block', marginTop: '6px', color: 'rgba(255,255,255,0.7)' }}>
                {unreadReviewCount} new client review{unreadReviewCount === 1 ? '' : 's'}.
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setShowNotificationPopup(false);
              fetch('/api/notifications', { method: 'PATCH', credentials: 'include' })
                .catch(() => {});
              router.push('/choreographer/notifications');
            }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #f0c040 0%, #e07b20 100%)',
              border: 'none',
              color: '#0d0d0f',
              fontWeight: 700,
              padding: '10px 12px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            View Notifications
          </button>
        </div>
      )}
    </>
  );
}






