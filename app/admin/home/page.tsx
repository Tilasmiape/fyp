'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  fullName: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
  createdAt: string;
  danceStyles?: string[];
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  status?: 'active' | 'suspended' | 'deleted';
  statusReason?: string;
}

interface Stats {
  totalUsers: number;
  totalClients: number;
  totalChoreographers: number;
  pendingApprovals: number;
  totalBookings: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'clients' | 'choreographers' | 'videos'>('clients');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [danceStyleFilter, setDanceStyleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'deleted' | 'pending' | 'approved' | 'rejected'>('all');
  
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalClients: 0,
    totalChoreographers: 0,
    pendingApprovals: 0,
    totalBookings: 0,
    totalRevenue: 0,
  });

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

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [users, searchTerm, danceStyleFilter, statusFilter, activeTab]);

  const computeStats = (list: User[]) => ({
    totalUsers: list.length,
    totalClients: list.filter(u => u.role === 'client').length,
    totalChoreographers: list.filter(u => u.role === 'choreographer').length,
    pendingApprovals: list.filter(u => u.role === 'choreographer' && u.approvalStatus === 'pending').length,
    totalBookings: 0,
    totalRevenue: 0,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/users');
      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      if (!data.success) {
        throw new Error('Failed to load users');
      }
      setUsers(data.users);
      setStats(computeStats(data.users));
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = users.filter(u => 
      activeTab === 'clients' ? u.role === 'client' : u.role === 'choreographer'
    );

    // Search by name
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by dance style (choreographers only)
    if (danceStyleFilter && activeTab === 'choreographers') {
      filtered = filtered.filter(u =>
        u.danceStyles?.includes(danceStyleFilter)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      if (activeTab === 'choreographers' && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
        filtered = filtered.filter(u => u.approvalStatus === statusFilter);
      } else if (['active', 'suspended', 'deleted'].includes(statusFilter)) {
        filtered = filtered.filter(u => u.status === statusFilter);
      }
    }

    setFilteredUsers(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDanceStyleFilter('');
    setStatusFilter('all');
  };

  const updateUser = async (userId: string, update: Partial<User>) => {
    const res = await fetch('/api/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, ...update }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to update user');
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error('Failed to update user');
    }
    setUsers(prev => {
      const next = prev.map(u => (u._id === userId ? data.user : u));
      setStats(computeStats(next));
      return next;
    });
  };

  const handleApproveChoreographer = async (userId: string) => {
    try {
      await updateUser(userId, { approvalStatus: 'approved' });
      alert('Choreographer approved successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to approve choreographer');
    }
  };

  const handleRejectChoreographer = async (userId: string) => {
    try {
      await updateUser(userId, { approvalStatus: 'rejected' });
      alert('Choreographer rejected.');
    } catch (err: any) {
      alert(err.message || 'Failed to reject choreographer');
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      const reason = window.prompt('Reason for suspension?', '') || '';
      await updateUser(userId, { status: 'suspended', statusReason: reason });
      alert('User suspended.');
    } catch (err: any) {
      alert(err.message || 'Failed to suspend user');
    }
  };

  const handleRestoreUser = async (userId: string) => {
    try {
      await updateUser(userId, { status: 'active', statusReason: '' });
      alert('User restored.');
    } catch (err: any) {
      alert(err.message || 'Failed to restore user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const reason = window.prompt('Reason for deletion?', '') || '';
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      setUsers(prev => {
        const next = prev.filter(u => u._id !== userId);
        setStats(computeStats(next));
        return next;
      });
      alert('User deleted successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
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
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img src="/images/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2)' }} />
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
          <button
            onClick={() => router.push('/admin/requests')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: '8px',
            }}>
            Pending Requests
          </button>
          <button 
            onClick={() => router.push('/admin/videos')}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '8px 16px',
              borderRadius: '8px',
            }}>
            📹 Manage Videos
          </button>
          <button 
            onClick={() => router.push('/signin')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: '8px 20px',
              borderRadius: '8px',
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Users</p>
            <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#1e3a8a' }}>
              {stats.totalUsers}
            </h3>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#666', marginBottom: '8px' }}>Total Clients</p>
            <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
              {stats.totalClients}
            </h3>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#666', marginBottom: '8px' }}>Choreographers</p>
            <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#8b5cf6' }}>
              {stats.totalChoreographers}
            </h3>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#666', marginBottom: '8px' }}>Pending Approvals</p>
            <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
              {stats.pendingApprovals}
            </h3>
          </div>
        </div>

          {error && (
            <div style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '14px',
              fontWeight: '600',
            }}>
              {error}
            </div>
          )}

          {/* User Management Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          }}>
          <h2 style={{ margin: 0, marginBottom: '24px', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
            User Management
          </h2>

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: '16px',
            marginBottom: '24px',
            borderBottom: '2px solid #e5e7eb',
          }}>
            {(['clients', 'choreographers', 'videos'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab as any);
                  if (tab === 'videos') router.push('/admin/videos');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: activeTab === tab ? '#1e3a8a' : '#6b7280',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab ? '3px solid #1e3a8a' : '3px solid transparent',
                  marginBottom: '-2px',
                  textTransform: 'capitalize',
                  transition: 'all 0.3s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Filters Panel */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '24px',
            border: '1px solid #e5e7eb',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>Filters</h3>
              <button
                onClick={clearFilters}
                style={{
                  fontSize: '13px',
                  color: '#6b7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear All
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: activeTab === 'choreographers' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '16px' }}>
              
              {/* Search by Name */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Search by Name
                </label>
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Dance Style Filter (Choreographers only) */}
              {activeTab === 'choreographers' && (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                    Filter by Dance Style
                  </label>
                  <select
                    value={danceStyleFilter}
                    onChange={(e) => setDanceStyleFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  >
                    <option value="">All Dance Styles</option>
                    {availableDanceStyles.map(style => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                  Filter by Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="deleted">Deleted</option>
                  {activeTab === 'choreographers' && (
                    <>
                      <option value="pending">Pending Approval</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
              Showing {filteredUsers.length} of {users.filter(u => activeTab === 'clients' ? u.role === 'client' : u.role === 'choreographer').length} {activeTab}
            </div>
          </div>

          {/* User Table */}
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                Loading users...
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Name</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Email</th>
                      {activeTab === 'choreographers' && (
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Dance Styles</th>
                      )}
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Joined</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>{user.fullName}</td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>{user.email}</td>
                        {activeTab === 'choreographers' && (
                          <td style={{ padding: '16px', fontSize: '12px', color: '#6b7280' }}>
                            {user.danceStyles?.join(', ') || '-'}
                          </td>
                        )}
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {user.role === 'choreographer' && user.approvalStatus && (
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                backgroundColor: user.approvalStatus === 'approved' ? '#d1fae5' : user.approvalStatus === 'rejected' ? '#fee2e2' : '#fef3c7',
                                color: user.approvalStatus === 'approved' ? '#065f46' : user.approvalStatus === 'rejected' ? '#991b1b' : '#92400e',
                                display: 'inline-block',
                              }}>
                                {user.approvalStatus}
                              </span>
                            )}
                            <span style={{
                              padding: '4px 12px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: user.status === 'suspended' ? '#fee2e2' : '#d1fae5',
                              color: user.status === 'suspended' ? '#991b1b' : '#065f46',
                              display: 'inline-block',
                            }}>
                              {user.status || 'active'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', color: '#6b7280' }}>
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {user.role === 'choreographer' && user.approvalStatus === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveChoreographer(user._id)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#10b981',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectChoreographer(user._id)}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#ef4444',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {user.status === 'active' ? (
                              <button
                                onClick={() => handleSuspendUser(user._id)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#f59e0b',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRestoreUser(user._id)}
                                style={{
                                  padding: '6px 12px',
                                  backgroundColor: '#10b981',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                }}
                              >
                                Restore
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user._id)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#6b7280',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredUsers.length === 0 && (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
                    No {activeTab} found matching your filters.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
