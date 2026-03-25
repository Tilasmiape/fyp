'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  _id: string;
  fullName: string;
  email: string;
  role: 'client' | 'choreographer' | 'super-admin';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  danceStyles?: string[];
  phoneNumber?: string;
  createdAt?: string;
}

export default function PendingRequestsPage() {
  const router = useRouter();
  const [pending, setPending] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
            width: '48px', height: '48px', borderRadius: '50%',
            backgroundColor: '#fff',
            border: '2px solid #fcd34d',
            boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src="/images/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2)' }} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>Step Out Studio</h2>
            <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>Pending Choreographer Requests</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/admin/home')}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', fontSize: '14px', fontWeight: '600',
            cursor: 'pointer', padding: '8px 20px', borderRadius: '8px',
            transition: 'all 0.3s',
          }}
        >
          ← Back to Dashboard
        </button>
      </nav>

      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Pending Requests</p>
            <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
              {loading ? '—' : pending.length}
            </h3>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '16px', padding: '24px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <p style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>Showing</p>
            <h3 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#667eea' }}>
              {loading ? '—' : filtered.length}
            </h3>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px', backgroundColor: '#fee2e2',
            border: '1px solid #ef4444', borderRadius: '12px',
            color: '#991b1b', fontSize: '14px', marginBottom: '24px',
          }}>
            {error}
          </div>
        )}

        {/* Search */}
        <div style={{
          background: 'rgba(255,255,255,0.95)', borderRadius: '16px',
          padding: '24px 32px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          marginBottom: '24px',
        }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
            Search by name, email or dance style
          </label>
          <input
            type="text"
            placeholder="Search requests..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px',
              border: '2px solid #e5e7eb', borderRadius: '10px',
              fontSize: '14px', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        {/* Main Card */}
        <div style={{
          background: 'rgba(255,255,255,0.95)', borderRadius: '16px',
          padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }}>
          <h2 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>
            Choreographer Requests
          </h2>

          {loading ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: '60px 0', fontSize: '15px' }}>
              Loading requests...
            </p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#6b7280' }}>
                {searchTerm ? 'No requests match your search.' : 'No pending requests.'}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '13px' }}>
                {!searchTerm && 'All choreographer requests have been reviewed.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filtered.map(user => (
                <div key={user._id} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  transition: 'box-shadow 0.2s',
                }}>
                  {/* Avatar + Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px', fontWeight: '700', color: '#fff',
                    }}>
                      {user.fullName.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
                          {user.fullName}
                        </p>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
                          backgroundColor: '#fef3c7', color: '#92400e',
                        }}>
                          Pending
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: '#6b7280' }}>
                        <span>✉️ {user.email}</span>
                        <span>📞 {user.phoneNumber || 'Not provided'}</span>
                        <span>📅 {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
                      </div>
                      {/* Dance style tags */}
                      {user.danceStyles && user.danceStyles.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                          {user.danceStyles.map(s => (
                            <span key={s} style={{
                              background: '#ede9fe', color: '#7c3aed',
                              padding: '3px 10px', borderRadius: '20px',
                              fontSize: '12px', fontWeight: '600',
                            }}>{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      onClick={() => updateRequest(user._id, 'approved')}
                      disabled={processing === user._id}
                      style={{
                        padding: '10px 20px', backgroundColor: '#10b981',
                        color: '#fff', border: 'none', borderRadius: '8px',
                        fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                        opacity: processing === user._id ? 0.5 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {processing === user._id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => updateRequest(user._id, 'rejected')}
                      disabled={processing === user._id}
                      style={{
                        padding: '10px 20px', backgroundColor: '#ef4444',
                        color: '#fff', border: 'none', borderRadius: '8px',
                        fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                        opacity: processing === user._id ? 0.5 : 1,
                        transition: 'all 0.2s',
                      }}
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
    </div>
  );
}

