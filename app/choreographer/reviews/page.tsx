"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface FeedbackItem {
  feedback_id: string;
  reciver_id: string;
  sender_id: string;
  sender?: {
    id: string;
    name: string;
    profileImage?: string;
  };
  booking_id?: string;
  comment: string;
  rating?: number;
  created_at: string;
}

export default function ChoreographerReviewsPage() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/choreographer/feedback', {
          method: 'GET',
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load feedback');
        }
        setFeedbacks(Array.isArray(data.feedbacks) ? data.feedbacks : []);
      } catch (err: any) {
        setError(err.message || 'Failed to load feedback');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const averageRating = feedbacks.length
    ? Math.round(
        (feedbacks.reduce((sum, f) => sum + (Number(f.rating) || 0), 0) / feedbacks.length) * 10
      ) / 10
    : 0;

  return (
    <div className="reviews-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .reviews-root { min-height: 100vh; background: #0d0d0f; color: #fff; font-family: 'DM Sans', sans-serif; }
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
          z-index: 10;
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
        .nav-logo img { width: 36px; height: 36px; border-radius: 999px; background: #fff; box-shadow: 0 6px 16px rgba(0,0,0,0.25); object-fit: cover; transform: scale(1.2); }
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
        .page { max-width: 980px; margin: 0 auto; padding: 34px; }
        .title { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; margin-bottom: 18px; }
        .card {
          background: rgba(17,17,20,0.9);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.35);
        }
        .row { display: grid; grid-template-columns: 160px 1fr; gap: 16px; padding: 14px 0; border-top: 1px solid rgba(255,255,255,0.06); }
        .row:first-child { border-top: none; }
        .label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 700; }
        .value { font-size: 14px; color: rgba(255,255,255,0.9); }
        .empty { font-size: 13px; color: rgba(255,255,255,0.5); }
        .error { color: #f87171; font-size: 13px; margin-top: 12px; }
        @media (max-width: 800px) {
          .page { padding: 24px; }
          .row { grid-template-columns: 1fr; }
        }
      `}</style>

      <nav className="nav">
        <span className="nav-logo">
          <img src="/images/logo.png" alt="logo" />
          StepOut
        </span>
        <div>
          <button className="nav-btn" onClick={() => router.push('/choreographer/home')}>Home</button>
          <button className="nav-btn" onClick={() => router.push('/choreographer/attendance')}>Attendance</button>
        </div>
      </nav>

      <div className="page">
        <div className="title">Client Reviews</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '12px' }}>
          Average rating: {averageRating || 0} / 5
        </div>
        {loading ? (
          <div className="empty">Loading feedback...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : feedbacks.length === 0 ? (
          <div className="empty">No feedback sent yet.</div>
        ) : (
          <div className="card">
            {feedbacks.map((item) => (
              <div key={item.feedback_id} className="row">
                <div>
                  <div className="label">Client</div>
                  <div className="value">{item.sender?.name || item.sender_id}</div>
                </div>
                <div>
                  <div className="label">Comment</div>
                  <div className="value">{item.comment}</div>
                  {item.rating !== undefined && (
                    <>
                      <div className="label" style={{ marginTop: '10px' }}>Rating</div>
                      <div className="value">{item.rating} / 5</div>
                    </>
                  )}
                  <div className="label" style={{ marginTop: '10px' }}>Created</div>
                  <div className="value">{new Date(item.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
