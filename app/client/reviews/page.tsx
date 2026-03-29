'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface FeedbackItem {
  feedback_id: string;
  comment: string;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export default function ClientReviewsPage() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/client/feedback', { method: 'GET', credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load feedback');
        }
        setFeedbacks(Array.isArray(data?.feedbacks) ? data.feedbacks : []);
      } catch (err: any) {
        setError(err.message || 'Failed to load feedback');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="reviews-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .reviews-root { min-height: 100vh; background: #f6f7fb; font-family: 'Manrope', sans-serif; color: #0f172a; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 40px; background: #fff; border-bottom: 1px solid #e7e9f0; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-badge { width: 48px; height: 48px; border-radius: 999px; background: #fff; overflow: hidden; box-shadow: 0 8px 18px rgba(0,0,0,0.18); display: grid; place-items: center; }
        .brand-badge img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.2); }
        .brand-name { font-weight: 700; letter-spacing: 0.4px; }
        .brand-sub { font-size: 10px; color: #f4b63a; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
        .nav-links { display: flex; gap: 18px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
        .page { max-width: 1000px; margin: 0 auto; padding: 32px 36px 60px; }
        .title { font-family: 'Playfair Display', serif; font-size: 32px; margin: 0 0 18px; }
        .card { background: #fff; border: 1px solid #e7e9f0; border-radius: 18px; padding: 18px; box-shadow: 0 8px 18px rgba(17,24,39,0.05); }
        .row { display: flex; align-items: flex-start; gap: 12px; padding: 14px 0; border-bottom: 1px solid #eef1f7; }
        .row:last-child { border-bottom: none; }
        .avatar { width: 44px; height: 44px; border-radius: 14px; background: #111827; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 14px; overflow: hidden; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .name { font-weight: 700; }
        .date { font-size: 11px; color: #94a3b8; margin-top: 4px; }
        .comment { font-size: 13px; color: #374151; margin-top: 6px; }
        .empty { color: #9ca3af; font-size: 13px; }
        .error { color: #ef4444; font-size: 13px; }
        @media (max-width: 760px) {
          .topbar { padding: 14px 18px; }
          .nav-links { display: none; }
          .page { padding: 24px 18px 50px; }
        }
      `}</style>

      <nav className="topbar">
        <div className="brand">
          <div className="brand-badge"><img src="/images/logo.png" alt="Logo" /></div>
          <div>
            <div className="brand-name">Step Out</div>
            <div className="brand-sub">Studio Hub</div>
          </div>
        </div>
        <div className="nav-links">
          <span onClick={() => router.push('/client/home')} style={{ cursor: 'pointer' }}>Home</span>
          <span onClick={() => router.push('/client/sessions')} style={{ cursor: 'pointer' }}>Sessions</span>
          <span onClick={() => router.push('/client/notifications')} style={{ cursor: 'pointer' }}>Notifications</span>
        </div>
      </nav>

      <div className="page">
        <h1 className="title">Choreographer Reviews</h1>
        {loading ? (
          <div className="empty">Loading feedback...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : feedbacks.length === 0 ? (
          <div className="empty">No feedback yet.</div>
        ) : (
          <div className="card">
            {feedbacks.map((f) => (
              <div key={f.feedback_id} className="row">
                <div className="avatar">
                  {f.sender?.profileImage
                    ? <img src={f.sender.profileImage} alt={f.sender.name} />
                    : (f.sender?.name || 'C').charAt(0)}
                </div>
                <div>
                  <div className="name">{f.sender?.name || 'Choreographer'}</div>
                  <div className="date">{new Date(f.created_at).toLocaleDateString()}</div>
                  <div className="comment">{f.comment}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
