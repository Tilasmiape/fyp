'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Video {
  id: string;
  url: string;
  title: string;
  description?: string;
  uploadedAt: string;
  status: string;
  choreographerName: string;
  choreographerEmail: string;
  choreographerId: string;
}

export default function VideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [view, setView] = useState<'cards' | 'table'>('cards');

  const [searchTerm, setSearchTerm] = useState('');
  const [choreographerFilter, setChoreographerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const uniqueChoreographers = Array.from(new Set(videos.map(v => v.choreographerName))).sort();

  useEffect(() => { fetchVideos(); }, []);

  useEffect(() => {
    let filtered = videos;
    if (searchTerm) filtered = filtered.filter(v => v.title.toLowerCase().includes(searchTerm.toLowerCase()));
    if (choreographerFilter) filtered = filtered.filter(v => v.choreographerName === choreographerFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(v => v.status === statusFilter);
    setFilteredVideos(filtered);
  }, [videos, searchTerm, choreographerFilter, statusFilter]);

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/admin/videos');
      if (!res.ok) throw new Error('Failed to fetch videos');
      const data = await res.json();
      if (data.success) setVideos(data.videos);
      else setError('Failed to load videos');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoAction = async (choreographerId: string, videoId: string, action: 'approve' | 'reject') => {
    setProcessing(videoId);
    try {
      const res = await fetch('/api/admin/videos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choreographerId, videoId, action }),
      });
      if (!res.ok) throw new Error('Failed to update video status');
      const data = await res.json();
      if (data.success) {
        setVideos(videos.map(v =>
          v.id === videoId ? { ...v, status: action === 'approve' ? 'approved' : 'rejected' } : v
        ));
      } else setError('Failed to update video status');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(null);
    }
  };

  const clearAllFilters = () => { setSearchTerm(''); setChoreographerFilter(''); setStatusFilter('all'); };

  const totalPending = videos.filter(v => v.status === 'pending').length;
  const totalApproved = videos.filter(v => v.status === 'approved').length;
  const totalRejected = videos.filter(v => v.status === 'rejected').length;

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      pending:  { bg: '#fef3c7', color: '#92400e' },
      approved: { bg: '#d1fae5', color: '#065f46' },
      rejected: { bg: '#fee2e2', color: '#991b1b' },
    };
    const s = map[status] || map['pending'];
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: s.bg,
        color: s.color,
      }}>
        {status || 'pending'}
      </span>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Nav */}
      <nav style={{
        backgroundColor: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '45px', height: '45px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: '700', fontSize: '18px', color: '#000',
          }}>S</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>Step Out Studio</h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Video Management</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Cards / Table toggle */}
          <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '4px' }}>
            {(['cards', 'table'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                background: view === v ? 'rgba(255,255,255,0.2)' : 'none',
                border: 'none', color: '#fff', fontSize: '13px', fontWeight: '600',
                cursor: 'pointer', padding: '7px 16px', borderRadius: '7px',
                transition: 'all 0.2s', textTransform: 'capitalize',
              }}>{v}</button>
            ))}
          </div>

          <button
            onClick={() => router.back()}
            style={{
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
              padding: '8px 20px', borderRadius: '8px', transition: 'all 0.3s',
            }}
          >
            ← Back
          </button>
        </div>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {[
            { label: 'Total Videos',  value: videos.length,  color: '#667eea' },
            { label: 'Pending',       value: totalPending,   color: '#f59e0b' },
            { label: 'Approved',      value: totalApproved,  color: '#10b981' },
            { label: 'Rejected',      value: totalRejected,  color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
              <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>{s.label}</p>
              <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: s.color }}>
                {loading ? '—' : s.value}
              </h3>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '12px', color: '#991b1b', fontSize: '14px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {/* Filters */}
        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '28px 32px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>Filters</h3>
            <button
              onClick={clearAllFilters}
              style={{ background: 'none', border: 'none', fontSize: '13px', color: '#6b7280', cursor: 'pointer', fontWeight: '600', padding: '4px 8px', borderRadius: '6px', transition: 'color 0.2s' }}
            >
              Clear All
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            {/* Search */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Search by Video Title
              </label>
              <input
                type="text"
                placeholder="Enter video title..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }}
              />
            </div>

            {/* Choreographer dropdown */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                Filter by Choreographer
              </label>
              <select
                value={choreographerFilter}
                onChange={e => setChoreographerFilter(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box' }}
              >
                <option value="">All Choreographers</option>
                {uniqueChoreographers.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
              Filter by Status
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {([
                { key: 'all',      label: `All (${videos.length})`,           active: '#667eea', inactive: '#fff', border: '#e5e7eb' },
                { key: 'pending',  label: `Pending (${totalPending})`,        active: '#f59e0b', inactive: '#fff', border: '#e5e7eb' },
                { key: 'approved', label: `Approved (${totalApproved})`,      active: '#10b981', inactive: '#fff', border: '#e5e7eb' },
                { key: 'rejected', label: `Rejected (${totalRejected})`,      active: '#ef4444', inactive: '#fff', border: '#e5e7eb' },
              ] as const).map(btn => (
                <button
                  key={btn.key}
                  onClick={() => setStatusFilter(btn.key)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '20px',
                    border: `2px solid ${statusFilter === btn.key ? btn.active : btn.border}`,
                    backgroundColor: statusFilter === btn.key ? btn.active : btn.inactive,
                    color: statusFilter === btn.key ? '#fff' : '#6b7280',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <p style={{ margin: '16px 0 0', fontSize: '13px', color: '#9ca3af' }}>
            Showing {filteredVideos.length} of {videos.length} videos
          </p>
        </div>

        {/* Content */}
        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0', fontSize: '15px' }}>Loading videos...</p>
          ) : filteredVideos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎬</div>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#6b7280' }}>
                {searchTerm || choreographerFilter || statusFilter !== 'all' ? 'No videos match your filters.' : 'No videos to review.'}
              </p>
            </div>
          ) : view === 'cards' ? (

            /* ── CARDS VIEW ── */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {filteredVideos.map(video => (
                <div key={video.id} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  backgroundColor: '#fff',
                  transition: 'box-shadow 0.2s',
                }}>
                  {/* Video */}
                  <div style={{ position: 'relative' }}>
                    <video
                      src={video.url}
                      controls
                      style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block', backgroundColor: '#f3f4f6' }}
                    />
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      {statusBadge(video.status)}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '16px 18px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '700', color: '#1f2937' }}>{video.title}</p>
                    <p style={{ margin: '0 0 10px', fontSize: '12px', color: '#9ca3af' }}>
                      Uploaded {new Date(video.uploadedAt).toLocaleDateString()}
                    </p>
                    {video.description && (
                      <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#6b7280', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {video.description}
                      </p>
                    )}
                    <div style={{ marginBottom: '14px' }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#374151' }}>{video.choreographerName}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>{video.choreographerEmail}</p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={() => handleVideoAction(video.choreographerId, video.id, 'approve')}
                        disabled={processing === video.id || video.status === 'approved'}
                        style={{
                          flex: 1, padding: '10px', backgroundColor: '#10b981', color: '#fff',
                          border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                          cursor: processing === video.id || video.status === 'approved' ? 'not-allowed' : 'pointer',
                          opacity: video.status === 'approved' ? 0.5 : 1, transition: 'all 0.2s',
                        }}
                      >
                        {processing === video.id ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleVideoAction(video.choreographerId, video.id, 'reject')}
                        disabled={processing === video.id || video.status === 'rejected'}
                        style={{
                          flex: 1, padding: '10px', backgroundColor: '#ef4444', color: '#fff',
                          border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                          cursor: processing === video.id || video.status === 'rejected' ? 'not-allowed' : 'pointer',
                          opacity: video.status === 'rejected' ? 0.5 : 1, transition: 'all 0.2s',
                        }}
                      >
                        {processing === video.id ? '...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          ) : (

            /* ── TABLE VIEW ── */
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    {['Video', 'Title', 'Choreographer', 'Status', 'Description', 'Uploaded', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredVideos.map((video, i) => (
                    <tr key={video.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <video
                          src={video.url}
                          controls
                          style={{ width: '96px', height: '64px', objectFit: 'cover', borderRadius: '8px', backgroundColor: '#f3f4f6' }}
                        />
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: '#1f2937', maxWidth: '160px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {video.title}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <p style={{ margin: 0, fontWeight: '600', color: '#1f2937' }}>{video.choreographerName}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>{video.choreographerEmail}</p>
                      </td>
                      <td style={{ padding: '14px 16px' }}>{statusBadge(video.status)}</td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {video.description || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {new Date(video.uploadedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleVideoAction(video.choreographerId, video.id, 'approve')}
                            disabled={processing === video.id || video.status === 'approved'}
                            style={{
                              padding: '8px 14px', backgroundColor: '#10b981', color: '#fff',
                              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                              cursor: processing === video.id || video.status === 'approved' ? 'not-allowed' : 'pointer',
                              opacity: video.status === 'approved' ? 0.5 : 1, transition: 'all 0.2s',
                            }}
                          >
                            {processing === video.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleVideoAction(video.choreographerId, video.id, 'reject')}
                            disabled={processing === video.id || video.status === 'rejected'}
                            style={{
                              padding: '8px 14px', backgroundColor: '#ef4444', color: '#fff',
                              border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600',
                              cursor: processing === video.id || video.status === 'rejected' ? 'not-allowed' : 'pointer',
                              opacity: video.status === 'rejected' ? 0.5 : 1, transition: 'all 0.2s',
                            }}
                          >
                            {processing === video.id ? '...' : 'Reject'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}