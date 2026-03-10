'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

interface Stats {
  totalUsers: number;
  pendingVideos: number;
  choreographers: number;
  clients: number;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'choreographer' | 'client';
  createdAt: string;
  status: 'active' | 'suspended';
}

interface PendingVideo {
  id: string;
  title: string;
  choreographerName: string;
  choreographerId: string;
  uploadedAt: string;
  url: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'users' | 'videos'>('overview');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'choreographer' | 'client'>('all');
  const [loading, setLoading] = useState(true);
  const [watchingVideo, setWatchingVideo] = useState<PendingVideo | null>(null);

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    pendingVideos: 0,
    choreographers: 0,
    clients: 0,
  });

  // Mock data — replace with real API responses
  const [users, setUsers] = useState<User[]>([]);

  const [pendingVideos, setPendingVideos] = useState<PendingVideo[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [usersRes, videosRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/admin/videos'),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        if (usersData.success) {
          setUsers(usersData.users.map((user: any) => ({
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            createdAt: new Date(user.createdAt).toISOString().split('T')[0],
            status: user.status || 'active',
          })));
          setStats(prev => ({
            ...prev,
            totalUsers: usersData.count,
            choreographers: usersData.users.filter((u: any) => u.role === 'choreographer').length,
            clients: usersData.users.filter((u: any) => u.role === 'client').length,
          }));
        }
      }

      if (videosRes.ok) {
        const videosData = await videosRes.json();
        if (videosData.success) {
          setPendingVideos(videosData.videos.map((video: any) => ({
            id: video.id,
            title: video.title,
            choreographerName: video.choreographerName,
            choreographerId: video.choreographerId,
            uploadedAt: new Date(video.uploadedAt).toISOString().split('T')[0],
            url: video.url,
          })));
          setStats(prev => ({ ...prev, pendingVideos: videosData.videos.length }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Keep existing data or show error
      setLoading(false);
    }
  };

  const handleSuspendUser = async (id: string) => {
    try {
      const user = users.find(u => u.id === id);
      if (!user) return;

      const action = user.status === 'active' ? 'suspend' : 'restore';

      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: id, action }),
      });

      if (response.ok) {
        setUsers(prev => prev.map(u =>
          u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u
        ));
        alert(`User ${action}d successfully!`);
      } else {
        const error = await response.json();
        alert(`Failed to ${action} user: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('An error occurred while updating user status');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: id, action: 'delete' }),
      });

      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
        alert('User deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to delete user: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('An error occurred while deleting user');
    }
  };

  const handleApproveVideo = async (id: string) => {
    try {
      const video = pendingVideos.find(v => v.id === id);
      if (!video) return;

      const response = await fetch('/api/admin/videos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          choreographerId: video.choreographerId,
          videoId: id,
          action: 'approve'
        }),
      });

      if (response.ok) {
        setPendingVideos(prev => prev.filter(v => v.id !== id));
        setStats(prev => ({ ...prev, pendingVideos: prev.pendingVideos - 1 }));
        alert('Video approved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to approve video: ${error.error}`);
      }
    } catch (error) {
      console.error('Error approving video:', error);
      alert('An error occurred while approving video');
    }
  };

  const handleRejectVideo = async (id: string) => {
    try {
      const video = pendingVideos.find(v => v.id === id);
      if (!video) return;

      const response = await fetch('/api/admin/videos', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          choreographerId: video.choreographerId,
          videoId: id,
          action: 'reject'
        }),
      });

      if (response.ok) {
        setPendingVideos(prev => prev.filter(v => v.id !== id));
        setStats(prev => ({ ...prev, pendingVideos: prev.pendingVideos - 1 }));
        alert('Video rejected.');
      } else {
        const error = await response.json();
        alert(`Failed to reject video: ${error.error}`);
      }
    } catch (error) {
      console.error('Error rejecting video:', error);
      alert('An error occurred while rejecting video');
    }
  };

  const handleLogout = () => {
    document.cookie = 'authToken=; path=/; max-age=0';
    router.push('/signin');
  };

  const filteredUsers = users.filter(u =>
    userRoleFilter === 'all' ? true : u.role === userRoleFilter
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Top Navigation Bar */}
      <nav style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '18px',
            color: '#000',
          }}>
            S
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>
              Step Out Studio
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
              Admin Dashboard
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Tab Switcher */}
          <div style={{
            display: 'flex',
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '4px',
          }}>
            {(['overview', 'users', 'videos'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveMainTab(tab)}
                style={{
                  background: activeMainTab === tab ? 'rgba(255,255,255,0.2)' : 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: '7px 16px',
                  borderRadius: '7px',
                  transition: 'all 0.2s',
                  textTransform: 'capitalize',
                  position: 'relative',
                }}
              >
                {tab}
                {tab === 'videos' && pendingVideos.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '4px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                    display: 'block',
                  }} />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '8px 20px',
              borderRadius: '8px',
              transition: 'all 0.3s',
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* ── OVERVIEW TAB ── */}
        {activeMainTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '40px',
            }}>
              <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Users</p>
                <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#667eea' }}>
                  {loading ? '—' : stats.totalUsers}
                </h3>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#666', marginBottom: '8px' }}>Pending Videos</p>
                <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
                  {loading ? '—' : stats.pendingVideos}
                </h3>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#666', marginBottom: '8px' }}>Choreographers</p>
                <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
                  {loading ? '—' : stats.choreographers}
                </h3>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#666', marginBottom: '8px' }}>Clients</p>
                <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#8b5cf6' }}>
                  {loading ? '—' : stats.clients}
                </h3>
              </div>
            </div>

            {/* Action Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '20px',
            }}>
              {[
                {
                  icon: '📹',
                  title: 'Manage Videos',
                  desc: 'Approve or reject videos posted by choreographers.',
                  badge: stats.pendingVideos > 0 ? `${stats.pendingVideos} pending` : null,
                  onClick: () => setActiveMainTab('videos'),
                },
                {
                  icon: '💃',
                  title: 'Manage Choreographers',
                  desc: 'View, suspend, or remove choreographer accounts.',
                  badge: null,
                  onClick: () => { setActiveMainTab('users'); setUserRoleFilter('choreographer'); },
                },
                {
                  icon: '👥',
                  title: 'Manage Clients',
                  desc: 'View, suspend, or remove client accounts.',
                  badge: null,
                  onClick: () => { setActiveMainTab('users'); setUserRoleFilter('client'); },
                },
                {
                  icon: '👤',
                  title: 'All Users',
                  desc: 'View and manage every user account on the platform.',
                  badge: null,
                  onClick: () => { setActiveMainTab('users'); setUserRoleFilter('all'); },
                },
                {
                  icon: '📊',
                  title: 'View Analytics',
                  desc: 'Track platform usage and revenue metrics.',
                  badge: null,
                  onClick: () => {},
                },
                {
                  icon: '📅',
                  title: 'Manage Bookings',
                  desc: 'Monitor and manage all platform bookings.',
                  badge: null,
                  onClick: () => {},
                },
              ].map((card, i) => (
                <div
                  key={i}
                  onClick={card.onClick}
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    borderRadius: '16px',
                    padding: '28px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 16px 40px rgba(0,0,0,0.25)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>{card.icon}</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: '700', color: '#1f2937' }}>
                    {card.title}
                  </h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>{card.desc}</p>
                  {card.badge && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '12px',
                      padding: '4px 10px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '700',
                    }}>
                      {card.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── USERS TAB ── */}
        {activeMainTab === 'users' && (
          <>
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                  User Management
                </h2>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>{filteredUsers.length} users</span>
              </div>

              {/* Role Filter Tabs */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb' }}>
                {(['all', 'choreographer', 'client'] as const).map(role => (
                  <button
                    key={role}
                    onClick={() => setUserRoleFilter(role)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: userRoleFilter === role ? '#667eea' : '#6b7280',
                      cursor: 'pointer',
                      borderBottom: userRoleFilter === role ? '3px solid #667eea' : '3px solid transparent',
                      marginBottom: '-2px',
                      textTransform: 'capitalize',
                      transition: 'all 0.3s',
                    }}
                  >
                    {role === 'all' ? 'All Users' : role === 'choreographer' ? '💃 Choreographers' : '👥 Clients'}
                  </button>
                ))}
              </div>

              {/* User Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredUsers.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0' }}>No users found</p>
                ) : (
                  filteredUsers.map(user => (
                    <div key={user.id} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '18px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: user.status === 'suspended' ? '#fef2f2' : '#fff',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Avatar */}
                        <div style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '10px',
                          background: user.role === 'choreographer'
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '18px',
                          color: '#fff',
                          flexShrink: 0,
                        }}>
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>{user.fullName}</p>
                          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#6b7280' }}>{user.email}</p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Role Badge */}
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: user.role === 'choreographer' ? '#ede9fe' : '#d1fae5',
                          color: user.role === 'choreographer' ? '#7c3aed' : '#065f46',
                        }}>
                          {user.role}
                        </span>

                        {/* Status Badge */}
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: user.status === 'active' ? '#dbeafe' : '#fee2e2',
                          color: user.status === 'active' ? '#1e40af' : '#991b1b',
                        }}>
                          {user.status}
                        </span>

                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Joined {user.createdAt}</span>

                        {/* Actions */}
                        <button
                          onClick={() => handleSuspendUser(user.id)}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: user.status === 'active' ? '#fef3c7' : '#d1fae5',
                            color: user.status === 'active' ? '#92400e' : '#065f46',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {user.status === 'active' ? 'Suspend' : 'Restore'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          style={{
                            padding: '8px 14px',
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {/* ── VIDEOS TAB ── */}
        {activeMainTab === 'videos' && (
          <>
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: '16px',
              padding: '32px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
                  Pending Videos
                </h2>
                {pendingVideos.length > 0 && (
                  <span style={{
                    padding: '6px 14px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '700',
                  }}>
                    {pendingVideos.length} awaiting review
                  </span>
                )}
              </div>

              {pendingVideos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#6b7280' }}>All caught up!</p>
                  <p style={{ margin: '6px 0 0', fontSize: '14px' }}>No pending videos to review.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pendingVideos.map(video => (
                    <div key={video.id} style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#fff',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                        {/* Video Thumbnail Placeholder */}
                        <div style={{
                          width: '80px',
                          height: '56px',
                          borderRadius: '8px',
                          backgroundColor: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          flexShrink: 0,
                        }}>
                          {video.url ? (
                            <video src={video.url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                          ) : '🎬'}
                        </div>
                        <div>
                          <p style={{ margin: '0 0 4px', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>{video.title}</p>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                            <span>💃 {video.choreographerName}</span>
                            <span>📅 {video.uploadedAt}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                          onClick={() => setWatchingVideo(video)}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2563eb')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#3b82f6')}
                        >
                          Watch
                        </button>
                        <button
                          onClick={() => handleApproveVideo(video.id)}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectVideo(video.id)}
                          style={{
                            padding: '10px 20px',
                            backgroundColor: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.3s',
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Video Player Modal */}
      {watchingVideo && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            position: 'relative',
            width: '90%',
            maxWidth: '900px',
            backgroundColor: '#000',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Close Button */}
            <button
              onClick={() => setWatchingVideo(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                zIndex: 10001,
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
            >
              ✕
            </button>

            {/* Video Player */}
            <video
              src={watchingVideo.url}
              controls
              autoPlay
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />

            {/* Video Info */}
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              padding: '20px 24px',
              color: '#fff',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700' }}>
                {watchingVideo.title}
              </h3>
              <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)' }}>
                <span>💃 {watchingVideo.choreographerName}</span>
                <span>📅 {watchingVideo.uploadedAt}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}