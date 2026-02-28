'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import EditProfileModal from '@/components/EditProfileModal';

interface Booking {
  id: string;
  clientName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  danceStyle: string;
  sessionType: string;
  location?: string;
}

interface DanceVideo {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  description?: string;
  uploadedAt: string;
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
  pricePerSession: number;
  danceStyles: string[];
  videos: DanceVideo[];
  profileImage?: string;
  totalEarnings: number;
  totalSessions: number;
  rating: number;
}

export default function ChoreographerHome() {
  const router = useRouter();
  const postVideoRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'bookings' | 'profile' | 'posts'>('bookings');
  const [bookingTab, setBookingTab] = useState<'pending' | 'upcoming' | 'history'>('pending');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);

  const [postVideoPreview, setPostVideoPreview] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postCaption, setPostCaption] = useState('');
  const [postError, setPostError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);


  const [bookings, setBookings] = useState<Booking[]>([
    {
      id: '1',
      clientName: 'John Doe',
      date: '2025-02-25',
      time: '10:00 AM',
      status: 'pending',
      danceStyle: 'Bollywood',
      sessionType: 'studio',
    },
    {
      id: '2',
      clientName: 'Jane Smith',
      date: '2025-02-26',
      time: '2:00 PM',
      status: 'confirmed',
      danceStyle: 'Hip Hop',
      sessionType: 'in-house',
      location: 'Kathmandu Valley',
    },
    {
      id: '3',
      clientName: 'Mike Johnson',
      date: '2025-02-20',
      time: '4:00 PM',
      status: 'completed',
      danceStyle: 'Contemporary',
      sessionType: 'studio',
    },
  ]);

  const [choreographerData, setChoreographerData] = useState<ChoreographerData>({
    name: 'Tilasmi Subedi',
    email: 'tilasmi@example.com',
    phone: '9876543210',
    bio: 'Professional choreographer with 5+ years of experience in Bollywood, Hip Hop, and Contemporary dance styles. I believe dance is a language that transcends barriers — my sessions focus on technique, expression, and joy. Based in Kathmandu, available for studio and in-house sessions.',
    pricePerSession: 2000,
    danceStyles: ['Bollywood', 'Hip Hop', 'Contemporary'],
    videos: [],
    profileImage: '',
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
          pricePerSession: Number(profile.pricePerSession ?? prev.pricePerSession),
          danceStyles: Array.isArray(profile.danceStyles) ? profile.danceStyles : prev.danceStyles,
          videos: Array.isArray(profile.videos) ? profile.videos : prev.videos,
          profileImage: profile.profileImage ?? prev.profileImage,
        }));
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };

    fetchProfile();
  }, []);

  const handleAcceptBooking = (id: string) => {
    setBookings(prev => prev.map(b =>
      b.id === id ? { ...b, status: 'confirmed' as const } : b
    ));
  };

  const handleRejectBooking = (id: string) => {
    setBookings(prev => prev.map(b =>
      b.id === id ? { ...b, status: 'cancelled' as const } : b
    ));
  };

  const handleSaveProfile = async (updatedData: Partial<ChoreographerData>) => {
    setProfileError('');
    setIsSavingProfile(true);
    try {
      const response = await fetch('/api/choreographer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatedData),
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
          pricePerSession: Number(profile.pricePerSession ?? prev.pricePerSession),
          danceStyles: Array.isArray(profile.danceStyles) ? profile.danceStyles : prev.danceStyles,
          videos: Array.isArray(profile.videos) ? profile.videos : prev.videos,
          profileImage: profile.profileImage ?? prev.profileImage,
        }));
      } else {
        setChoreographerData((prev) => ({ ...prev, ...updatedData }));
      }
      setShowEditProfile(false);
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

  const filteredBookings = bookings.filter(b => {
    if (bookingTab === 'pending') return b.status === 'pending';
    if (bookingTab === 'upcoming') return b.status === 'confirmed';
    if (bookingTab === 'history') return b.status === 'completed' || b.status === 'cancelled';
    return false;
  });

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 22px;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #f0c040 0%, #e07b20 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
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
      `}</style>

      <div className="dash-root">
        {/* NAV */}
        <nav className="nav">
          <span className="nav-logo">Step Out Studio</span>
          <div className="nav-right">
            <button className="nav-btn-post" onClick={handleOpenPost}>
              ＋ Post
            </button>
            <button className="nav-btn" onClick={() => setShowEditProfile(true)}>Edit Profile</button>
            <button className="nav-btn">Availability</button>
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
                    <div className="stat-value" style={{ color: '#a78bfa' }}>{choreographerData.videos.length}</div>
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

                {filteredBookings.length === 0
                  ? <div className="empty">No bookings in this category</div>
                  : filteredBookings.map(b => (
                    <div key={b.id} className="booking-card">
                      <div>
                        <div className="booking-name">{b.clientName}</div>
                        <div className="booking-meta">
                          <span>📅 {b.date}</span>
                          <span>🕐 {b.time}</span>
                          <span>💃 {b.danceStyle}</span>
                          <span>📍 {b.sessionType === 'in-house' ? b.location : 'Studio'}</span>
                        </div>
                      </div>
                      <div className="booking-actions">
                        {b.status === 'pending' && (<>
                          <button className="btn-accept" onClick={() => handleAcceptBooking(b.id)}>Accept</button>
                          <button className="btn-reject" onClick={() => handleRejectBooking(b.id)}>Reject</button>
                        </>)}
                        {b.status === 'confirmed' && <span className="badge badge-confirmed">Confirmed</span>}
                        {b.status === 'completed' && <span className="badge badge-completed">Completed</span>}
                        {b.status === 'cancelled' && <span className="badge badge-cancelled">Cancelled</span>}
                      </div>
                    </div>
                  ))
                }
              </>
            )}

            {/* ── PROFILE TAB ── */}
            {activeTab === 'profile' && (
              <>
                <div className="section-header">
                  <h2 className="section-title">My Profile</h2>
                  <button className="btn-edit-profile" style={{ width: 'auto', padding: '10px 20px' }} onClick={() => setShowEditProfile(true)}>
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
                    <button className="btn-edit-profile" onClick={() => setShowEditProfile(true)}>✏️ Edit Profile</button>
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
                      </div>
                    </div>

                    {/* Videos from Edit Profile */}
                    <div className="profile-section">
                      <div className="profile-section-title">Dance Videos ({choreographerData.videos.length}/3)</div>
                      {choreographerData.videos.length === 0
                        ? <div className="no-videos">
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎬</div>
                            No videos uploaded yet.<br />
                            <span style={{ fontSize: '12px' }}>Go to Edit Profile → add up to 3 demo videos.</span>
                          </div>
                        : <div className="video-grid">
                            {choreographerData.videos.map(v => (
                              <div key={v.id} className="video-item">
                                {v.url
                                  ? <video src={v.url} controls style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                                  : <div className="video-placeholder">🎥</div>
                                }
                                <div className="video-info">
                                  <div className="video-title">{v.title}</div>
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

                {choreographerData.videos.length === 0
                  ? <div className="empty">
                      <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                      No posts yet. Share your first dance video!
                    </div>
                  : <div className="posts-grid">
                      {choreographerData.videos.map(v => (
                        <div key={v.id} className="post-card">
                          <div className="post-video-area">
                            {v.url
                              ? <video src={v.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : <span>🎬</span>
                            }
                          </div>
                          <div className="post-body">
                            <div className="post-title">{v.title}</div>
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
          </main>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        choreographerData={choreographerData}
        onSave={handleSaveProfile}
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
    </>
  );
}





