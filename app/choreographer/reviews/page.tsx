"use client";

import { useEffect, useState } from 'react';
import ChoreographerNavbar from '@/components/ChoreographerNavbar';

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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .reviews-root { min-height: 100vh; background: #f6f7fb; color: #0f172a; font-family: 'Manrope', sans-serif; }
        .page { max-width: 980px; margin: 0 auto; padding: 34px; }
        .title { font-family: 'Playfair Display', serif; font-size: 26px; font-weight: 700; margin-bottom: 18px; }
        .card {
          background: #fff;
          border: 1px solid #e7e9f0;
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 12px 28px rgba(15,23,42,0.08);
        }
        .row { display: grid; grid-template-columns: 160px 1fr; gap: 16px; padding: 14px 0; border-top: 1px solid #edf2f7; }
        .row:first-child { border-top: none; }
        .label { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #94a3b8; font-weight: 700; }
        .value { font-size: 14px; color: #334155; }
        .empty { font-size: 13px; color: #94a3b8; }
        .error { color: #f87171; font-size: 13px; margin-top: 12px; }
        @media (max-width: 800px) {
          .page { padding: 24px; }
          .row { grid-template-columns: 1fr; }
        }
      `}</style>

      <ChoreographerNavbar subtitle="Reviews" />

      <div className="page">
        <div className="title">Client Reviews</div>
        <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '12px' }}>
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

