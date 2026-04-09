'use client';

import { useEffect, useState } from 'react';
import AdminNavbar from '@/components/AdminNavbar';

interface User {
  _id: string;
  fullName: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  danceStyles?: string[];
  phoneNumber?: string;
  dateOfBirth?: string;
  location?: string;
  bio?: string;
  gender?: string;
  certificatePhoto?: string;
  profileImage?: string;
  pricePerSession?: number;
  createdAt?: string;
}

export default function PendingRequestsPage() {
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchPending = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        if (!data.success) throw new Error('Failed to load users');
        const users: User[] = data.users || [];
        setPending(users.filter(u => u.role === 'choreographer' && u.approvalStatus === 'pending'));
      } catch (err: any) {
        setError(err.message || 'Failed to load requests');
      } finally {
        setLoading(false);
      }
    };
    fetchPending();
  }, []);

  const updateRequest = async (id: string, approvalStatus: 'approved' | 'rejected') => {
    setProcessing(id);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approvalStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update request');
      }
      setPending(prev => prev.filter(u => u._id !== id));
      if (selectedUser?._id === id) setSelectedUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update request');
    } finally {
      setProcessing(null);
    }
  };

  const filtered = pending.filter(u =>
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.danceStyles?.join(' ').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const DetailBox = ({ label, value }: { label: string; value: string }) => (
    <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#64748b', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ marginTop: '4px', fontSize: '15px', color: '#111827', fontWeight: 600 }}>{value || 'Not provided'}</div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <AdminNavbar subtitle="Pending Choreographer Requests" />

      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Pending Requests</p>
            <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>{loading ? '-' : pending.length}</h3>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Showing</p>
            <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#667eea' }}>{loading ? '-' : filtered.length}</h3>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '12px', color: '#991b1b', fontSize: '14px', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '24px 32px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            Search by name, email or dance style
          </label>
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          <h2 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>Choreographer Requests</h2>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0', fontSize: '15px' }}>Loading requests...</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>OK</div>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#6b7280' }}>
                {searchTerm ? 'No requests match your search.' : 'No pending requests.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filtered.map(user => (
                <div key={user._id} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: '#fff' }}>
                      {user.fullName.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>{user.fullName}</p>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', backgroundColor: '#fef3c7', color: '#92400e' }}>Pending</span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: '#6b7280' }}>
                        <span>Email: {user.email}</span>
                        <span>Phone: {user.phoneNumber || 'Not provided'}</span>
                        <span>Date: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      onClick={() => setSelectedUser(user)}
                      style={{ padding: '10px 16px', backgroundColor: '#e0e7ff', color: '#3730a3', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => updateRequest(user._id, 'approved')}
                      disabled={processing === user._id}
                      style={{ padding: '10px 20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: processing === user._id ? 0.5 : 1 }}
                    >
                      {processing === user._id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => updateRequest(user._id, 'rejected')}
                      disabled={processing === user._id}
                      style={{ padding: '10px 20px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: processing === user._id ? 0.5 : 1 }}
                    >
                      {processing === user._id ? '...' : 'Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <div
          onClick={() => setSelectedUser(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', zIndex: 1000 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(920px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: '#fff', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', border: '1px solid #e5e7eb', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '22px', color: '#111827' }}>{selectedUser.fullName}</h3>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#6b7280' }}>Choreographer signup details</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                style={{ width: '34px', height: '34px', borderRadius: '999px', border: '1px solid #d1d5db', background: '#fff', color: '#6b7280', fontSize: '16px', cursor: 'pointer' }}
                aria-label="Close details"
              >
                x
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <DetailBox label="Full Name" value={selectedUser.fullName || '-'} />
              <DetailBox label="Email" value={selectedUser.email || '-'} />
              <DetailBox label="Phone" value={selectedUser.phoneNumber || 'Not provided'} />
              <DetailBox label="Date of Birth" value={selectedUser.dateOfBirth || 'Not provided'} />
              <DetailBox label="Gender" value={selectedUser.gender || 'Not provided'} />
              <DetailBox label="Location" value={selectedUser.location || 'Not provided'} />
              <DetailBox
                label="Price Per Session"
                value={selectedUser.pricePerSession !== undefined ? `NPR ${Number(selectedUser.pricePerSession).toLocaleString()}` : 'Not provided'}
              />
              <DetailBox label="Submitted On" value={selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '-'} />
            </div>

            <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Dance Styles</div>
              {selectedUser.danceStyles && selectedUser.danceStyles.length > 0 ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {selectedUser.danceStyles.map((s) => (
                    <span key={s} style={{ background: '#ede9fe', color: '#7c3aed', padding: '4px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 }}>
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#6b7280' }}>Not provided</div>
              )}
            </div>

            <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Bio</div>
              <div style={{ fontSize: '14px', color: '#1f2937', lineHeight: 1.6 }}>{selectedUser.bio || 'Not provided'}</div>
            </div>

            {selectedUser.certificatePhoto && (
              <div style={{ marginTop: '14px', padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', color: '#64748b', textTransform: 'uppercase', marginBottom: '10px' }}>Certificate Photo</div>
                <img
                  src={selectedUser.certificatePhoto}
                  alt={`${selectedUser.fullName} certificate`}
                  style={{ maxWidth: '100%', maxHeight: '360px', borderRadius: '10px', border: '1px solid #d1d5db', objectFit: 'contain', background: '#fff' }}
                />
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => updateRequest(selectedUser._id, 'rejected')}
                disabled={processing === selectedUser._id}
                style={{ padding: '10px 18px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: processing === selectedUser._id ? 0.5 : 1 }}
              >
                {processing === selectedUser._id ? 'Processing...' : 'Reject Request'}
              </button>
              <button
                onClick={() => updateRequest(selectedUser._id, 'approved')}
                disabled={processing === selectedUser._id}
                style={{ padding: '10px 18px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: processing === selectedUser._id ? 0.5 : 1 }}
              >
                {processing === selectedUser._id ? 'Processing...' : 'Approve Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
