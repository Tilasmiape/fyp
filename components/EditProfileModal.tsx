'use client';

import { useEffect, useRef, useState } from 'react';

interface DanceVideo {
  id: string;
  url: string;
  title: string;
  description?: string;
  uploadedAt?: string;
}

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  choreographerData: {
    name: string;
    email: string;
    phone: string;
    bio: string;
    pricePerSession: number;
    danceStyles: string[];
    videos: DanceVideo[];
    profileImage?: string;
  };
  onSave: (updatedData: any) => void | Promise<void>;
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

export default function EditProfileModal({ isOpen, onClose, choreographerData, onSave }: EditProfileModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({ ...choreographerData });
  const [selectedStyles, setSelectedStyles] = useState<string[]>(choreographerData.danceStyles);
  const [videos, setVideos] = useState<DanceVideo[]>(choreographerData.videos);
  const [uploadError, setUploadError] = useState('');
  const [profileImagePreview, setProfileImagePreview] = useState(choreographerData.profileImage || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData({ ...choreographerData });
    setSelectedStyles(choreographerData.danceStyles || []);
    setVideos(choreographerData.videos || []);
    setProfileImagePreview(choreographerData.profileImage || '');
    setUploadError('');
  }, [isOpen, choreographerData]);

  const availableDanceStyles = [
    'Bollywood',
    'Hip Hop',
    'Contemporary',
    'Classical',
    'Folk',
    'Jazz',
    'Salsa',
    'Kathak',
    'Bharatanatyam',
    'Break Dance',
    'Freestyle',
  ];

  const handleDanceStyleToggle = (style: string) => {
    setSelectedStyles((prev) => (prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]));
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');

    if (videos.length >= MAX_VIDEOS) {
      setUploadError(`Maximum ${MAX_VIDEOS} videos allowed`);
      return;
    }

    if (!file.type.startsWith('video/')) {
      setUploadError('Please upload a video file');
      return;
    }

    const maxSize = MAX_VIDEO_SIZE_MB * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`Video must be less than ${MAX_VIDEO_SIZE_MB}MB`);
      return;
    }

    try {
      const videoUrl = await toDataUrl(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const newVideo: DanceVideo = {
        id: Date.now().toString(),
        url: videoUrl,
        title: nameWithoutExt || 'Untitled video',
        description: '',
        uploadedAt: new Date().toISOString(),
      };
      setVideos((prev) => [...prev, newVideo]);
    } catch {
      setUploadError('Could not read video file');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteVideo = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    setUploadError('');
  };

  const handleEditVideoField = (id: string, field: 'title' | 'description', value: string) => {
    setVideos((prev) =>
      prev.map((video) => {
        if (video.id !== id) return video;
        return { ...video, [field]: value };
      })
    );
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file');
      return;
    }

    try {
      const imageUrl = await toDataUrl(file);
      setProfileImagePreview(imageUrl);
    } catch {
      setUploadError('Could not read image file');
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    const hasEmptyTitle = videos.some((video) => !video.title.trim());
    if (hasEmptyTitle) {
      setUploadError('Each video needs a title');
      return;
    }

    setIsSaving(true);
    try {
      const updatedData = {
        ...formData,
        danceStyles: selectedStyles,
        videos: videos.map((video) => ({
          ...video,
          title: video.title.trim(),
          description: (video.description || '').trim(),
          uploadedAt: video.uploadedAt || new Date().toISOString(),
        })),
        profileImage: profileImagePreview,
      };
      await onSave(updatedData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '980px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          display: 'flex',
        }}
      >
        <div
          style={{
            width: '350px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderTopLeftRadius: '24px',
            borderBottomLeftRadius: '24px',
            padding: '40px 30px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <div
              style={{
                width: '180px',
                height: '180px',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '4px solid rgba(251, 191, 36, 0.3)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              }}
            >
              {profileImagePreview ? (
                <img src={profileImagePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '64px',
                    fontWeight: '700',
                    color: '#fff',
                  }}
                >
                  {formData.name.charAt(0)}
                </div>
              )}
            </div>

            <button
              onClick={() => profileImageInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#fbbf24',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(251, 191, 36, 0.4)',
                fontSize: '18px',
              }}
            >
              Edit
            </button>
            <input ref={profileImageInputRef} type="file" accept="image/*" onChange={handleProfileImageUpload} style={{ display: 'none' }} />
          </div>

          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: '8px' }}>{formData.name}</h2>

          <div style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', padding: '8px 16px', borderRadius: '20px', marginBottom: '24px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: '#fbbf24', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {selectedStyles.join(' | ') || 'No styles selected'}
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#fff',
              color: '#1a1a2e',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? 'SAVING...' : 'SAVE PROFILE'}
          </button>
        </div>

        <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#f3f4f6',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            X
          </button>

          <h3 style={{ margin: 0, marginBottom: '24px', fontSize: '22px', fontWeight: '700', color: '#1f2937' }}>Edit Profile</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Price Per Session (NPR)</label>
              <input
                type="number"
                value={formData.pricePerSession}
                onChange={(e) => setFormData({ ...formData, pricePerSession: Number(e.target.value) })}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Dance Styles</label>
              <div style={{ border: '2px solid #e5e7eb', borderRadius: '10px', padding: '14px', maxHeight: '160px', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {availableDanceStyles.map((style) => (
                    <label key={style} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}>
                      <input
                        type="checkbox"
                        checked={selectedStyles.includes(style)}
                        onChange={() => handleDanceStyleToggle(style)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>{style}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Dance Videos (Max {MAX_VIDEOS}, up to {MAX_VIDEO_SIZE_MB}MB each)
              </label>

              {uploadError && (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: '#fee2e2',
                    border: '1px solid #ef4444',
                    borderRadius: '8px',
                    color: '#991b1b',
                    fontSize: '13px',
                    marginBottom: '12px',
                  }}
                >
                  {uploadError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
                {videos.map((video) => (
                  <div key={video.id} style={{ border: '2px solid #e5e7eb', borderRadius: '10px', padding: '12px', backgroundColor: '#f9fafb' }}>
                    <video src={video.url} style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} controls />
                    <input
                      type="text"
                      value={video.title}
                      onChange={(e) => handleEditVideoField(video.id, 'title', e.target.value)}
                      placeholder="Video title"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', marginBottom: '8px' }}
                    />
                    <textarea
                      value={video.description || ''}
                      onChange={(e) => handleEditVideoField(video.id, 'description', e.target.value)}
                      placeholder="Video description"
                      rows={3}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', resize: 'vertical', marginBottom: '8px' }}
                    />
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      style={{ width: '100%', padding: '8px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      Delete Video
                    </button>
                  </div>
                ))}
              </div>

              {videos.length < MAX_VIDEOS && (
                <>
                  <input ref={fileInputRef} type="file" accept="video/*" onChange={handleVideoUpload} style={{ display: 'none' }} />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      width: '100%',
                      padding: '14px',
                      backgroundColor: '#667eea',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Upload Video ({videos.length}/{MAX_VIDEOS})
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
