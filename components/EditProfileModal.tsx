'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_TIME_SLOTS, formatTimeSlot, normalizeAvailability, validateAvailabilityTimes, AvailabilitySlot, DateAvailability } from '@/lib/availability';

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
    location?: string;
    pricePerSession: number;
    danceStyles: string[];
    videos: DanceVideo[];
    profileImage?: string;
    availability?: DateAvailability[];
  };
  onSave: (updatedData: any) => void | Promise<void>;
  onAutoSaveAvailability?: (availability: DateAvailability[]) => void;
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

export default function EditProfileModal({ isOpen, onClose, choreographerData, onSave, onAutoSaveAvailability }: EditProfileModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({ ...choreographerData });
  const [selectedStyles, setSelectedStyles] = useState<string[]>(choreographerData.danceStyles);
  const [videos, setVideos] = useState<DanceVideo[]>(choreographerData.videos);
  const [uploadError, setUploadError] = useState('');
  const [profileImagePreview, setProfileImagePreview] = useState(choreographerData.profileImage || '');
  const [availability, setAvailability] = useState<DateAvailability[]>(
    choreographerData.availability || []
  );
  const [selectedDate, setSelectedDate] = useState('');
  const [availabilityInput, setAvailabilityInput] = useState('');
  const [availabilityDuration, setAvailabilityDuration] = useState(60);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilitySuccess, setAvailabilitySuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData({ ...choreographerData });
    setSelectedStyles(choreographerData.danceStyles || []);
    setVideos(choreographerData.videos || []);
    setProfileImagePreview(choreographerData.profileImage || '');
    setAvailability(choreographerData.availability || []);
    setSelectedDate('');
    setAvailabilityInput('');
    setAvailabilityError('');
    setAvailabilitySuccess('');
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

  const autoSaveAvailabilityToBackend = async (newAvailability: DateAvailability[]) => {
    setAvailabilitySuccess('');
    setAvailabilityError('');
    try {
      const validation = validateAvailabilityTimes(newAvailability);
      if (validation.invalid.length > 0) return;
      
      const res = await fetch('/api/choreographer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ availabilityTimes: newAvailability }),
      });
      
      if (res.ok) {
        if (onAutoSaveAvailability) {
          onAutoSaveAvailability(newAvailability);
        }
        setAvailabilitySuccess('Availability automatically saved!');
      } else {
        setAvailabilityError('Failed to sync availability');
      }
    } catch {
      setAvailabilityError('Network error while saving availability');
    }
  };

  const addDateAvailability = () => {
    if (!selectedDate) {
      setAvailabilityError('Please select a date');
      return;
    }

    if (availability.some(entry => entry.date === selectedDate)) {
      setAvailabilityError('Availability for this date is already added');
      return;
    }

    const newAvail = [...availability, { date: selectedDate, timeSlots: [] }];
    setAvailability(newAvail);
    setSelectedDate('');
    setAvailabilityError('');
    autoSaveAvailabilityToBackend(newAvail);
  };

  const removeDateAvailability = (date: string) => {
    const newAvail = availability.filter(entry => entry.date !== date);
    setAvailability(newAvail);
    autoSaveAvailabilityToBackend(newAvail);
  };

  const toggleTimeSlot = (date: string, slot: AvailabilitySlot) => {
    const slotKey = `${slot.time}-${slot.duration}`;
    const newAvail = availability.map(entry => {
      if (entry.date === date) {
        const existingIndex = entry.timeSlots.findIndex(s => `${s.time}-${s.duration}` === slotKey);
        if (existingIndex >= 0) {
          return {
            ...entry,
            timeSlots: entry.timeSlots.filter((_, index) => index !== existingIndex)
          };
        } else {
          return {
            ...entry,
            timeSlots: [...entry.timeSlots, slot]
          };
        }
      }
      return entry;
    });
    setAvailability(newAvail);
    autoSaveAvailabilityToBackend(newAvail);
  };

  const addCustomTimeSlot = (date: string) => {
    if (!availabilityInput) {
      setAvailabilityError('Please select a time');
      return;
    }

    // Convert 24-hour time to 12-hour format
    const [hours, minutes] = availabilityInput.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const formatted = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;

    const newSlot: AvailabilitySlot = { time: formatted, duration: availabilityDuration };

    let duplicate = false;
    const newAvail = availability.map(entry => {
      if (entry.date === date) {
        if (entry.timeSlots.some(slot => slot.time === formatted && slot.duration === availabilityDuration)) {
          duplicate = true;
          return entry;
        }
        return {
          ...entry,
          timeSlots: [...entry.timeSlots, newSlot]
        };
      }
      return entry;
    });

    if (duplicate) {
      setAvailabilityError('That time slot is already added for this date');
      return;
    }

    setAvailability(newAvail);
    setAvailabilityInput('');
    setAvailabilityError('');
    autoSaveAvailabilityToBackend(newAvail);
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
    setAvailabilitySuccess('');
    try {
      const validation = validateAvailabilityTimes(availability);
      if (validation.invalid.length > 0) {
        setAvailabilityError(`Invalid availability: ${validation.invalid.join(', ')}`);
        return;
      }

      const updatedData = {
        ...formData,
        danceStyles: selectedStyles,
        availability: validation.valid,
        videos: videos.map((video) => ({
          ...video,
          title: video.title.trim(),
          description: (video.description || '').trim(),
          uploadedAt: video.uploadedAt || new Date().toISOString(),
        })),
        profileImage: profileImagePreview,
      };
      await onSave(updatedData);
      setAvailabilitySuccess(`✓ Successfully saved availability for ${validation.valid.length} date(s)`);
      setTimeout(() => onClose(), 800);
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Kathmandu, Nepal"
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
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Availability</label>
              <div style={{ border: '2px solid #e5e7eb', borderRadius: '12px', padding: '16px' }}>

                {/* Add new date */}
                <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add Available Date</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value);
                        if (availabilityError) setAvailabilityError('');
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      style={{ flex: 1, padding: '10px 12px', borderRadius: '10px', border: '2px solid #e5e7eb', fontSize: '13px' }}
                    />
                    <button
                      type="button"
                      onClick={addDateAvailability}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#111827',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Add Date
                    </button>
                  </div>
                </div>

                {/* Existing dates */}
                {availability.map((dateEntry) => (
                  <div key={dateEntry.date} style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                        {new Date(dateEntry.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDateAvailability(dateEntry.date)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #ef4444',
                          backgroundColor: '#fef2f2',
                          color: '#ef4444',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Remove
                      </button>
                    </div>

                    {/* Default time slots */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Times</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {DEFAULT_TIME_SLOTS.map((slot) => {
                          const isSelected = dateEntry.timeSlots.some(s => s.time === slot.time && s.duration === slot.duration);
                          return (
                            <button
                              key={`${slot.time}-${slot.duration}`}
                              type="button"
                              onClick={() => toggleTimeSlot(dateEntry.date, slot)}
                              style={{
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: `2px solid ${isSelected ? '#111827' : '#e5e7eb'}`,
                                backgroundColor: isSelected ? '#111827' : '#fff',
                                color: isSelected ? '#fff' : '#374151',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              {slot.time}
                              <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
                                {slot.duration} min
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom time slots for this date */}
                    {dateEntry.timeSlots.filter((slot) => !DEFAULT_TIME_SLOTS.some(defaultSlot => defaultSlot.time === slot.time && defaultSlot.duration === slot.duration)).length > 0 && (
                      <div style={{ marginBottom: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custom Times Added</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {dateEntry.timeSlots
                            .filter((slot) => !DEFAULT_TIME_SLOTS.some(defaultSlot => defaultSlot.time === slot.time && defaultSlot.duration === slot.duration))
                            .map((slot) => (
                              <button
                                key={`${slot.time}-${slot.duration}`}
                                type="button"
                                onClick={() => toggleTimeSlot(dateEntry.date, slot)}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '999px',
                                  border: '2px solid #10b981',
                                  backgroundColor: '#ecfdf5',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  color: '#10b981',
                                }}
                              >
                                ✓ {slot.time} ({slot.duration}min) ×
                              </button>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Add custom time for this date */}
                    <div style={{ paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Add Custom Time</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="time"
                          value={availabilityInput}
                          onChange={(e) => {
                            setAvailabilityInput(e.target.value);
                            if (availabilityError) setAvailabilityError('');
                          }}
                          style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '2px solid #e5e7eb', fontSize: '12px' }}
                        />
                        <select
                          value={availabilityDuration}
                          onChange={(e) => setAvailabilityDuration(Number(e.target.value))}
                          style={{ padding: '8px 10px', borderRadius: '8px', border: '2px solid #e5e7eb', fontSize: '12px', minWidth: '90px' }}
                        >
                          <option value={30}>30 min</option>
                          <option value={45}>45 min</option>
                          <option value={60}>1 hour</option>
                          <option value={90}>1.5 hours</option>
                          <option value={120}>2 hours</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => addCustomTimeSlot(dateEntry.date)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#111827',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#6b7280' }}>
                      <strong>Selected Times:</strong> {dateEntry.timeSlots.length > 0 ? `${dateEntry.timeSlots.length} slot(s)` : 'None selected'}
                    </div>
                  </div>
                ))}

                {availability.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '14px' }}>
                    No dates added yet. Add a date above to set your availability.
                  </div>
                )}

                {availabilityError && (
                  <div style={{ marginTop: '12px', fontSize: '11px', color: '#b91c1c', fontWeight: '600', backgroundColor: '#fef2f2', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                    ⚠️ {availabilityError}
                  </div>
                )}
                {availabilitySuccess && (
                  <div style={{ marginTop: '12px', fontSize: '11px', color: '#10b981', fontWeight: '600', backgroundColor: '#ecfdf5', padding: '8px 10px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                    {availabilitySuccess}
                  </div>
                )}
              </div>
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












