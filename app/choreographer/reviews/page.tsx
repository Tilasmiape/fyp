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

  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} style={{ color: i < rating ? '#FCD34D' : '#E5E7EB', marginRight: '2px' }}>
          ★
        </span>
      );
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  return (
    <div className="reviews-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        
        * { box-sizing: border-box; }
        
        .reviews-root {
          min-height: 100vh;
          background: #f6f7fb;
          color: #0f172a;
          font-family: 'Manrope', sans-serif;
        }
        
        body[data-theme='dark'] .reviews-root {
          background: #0a0f1c;
          color: #e8eef7;
        }
        
        .page {
          max-width: 1200px;
          margin: 0 auto;
          padding: 40px 30px;
        }
        
        .page-header {
          margin-bottom: 40px;
        }
        
        .page-title {
          font-family: 'Playfair Display', serif;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 12px;
          color: #0f172a;
        }
        
        body[data-theme='dark'] .page-title {
          color: #f8fafc;
        }
        
        .average-rating-container {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding: 18px;
          background: #ffffff;
          border-radius: 12px;
          border: 1px solid #e7e9f0;
          width: fit-content;
        }
        
        body[data-theme='dark'] .average-rating-container {
          background: #131d2f;
          border-color: #3f4a63;
        }
        
        .rating-value {
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }
        
        body[data-theme='dark'] .rating-value {
          color: #f8fafc;
        }
        
        .rating-label {
          font-size: 12px;
          color: #64748b;
        }
        
        body[data-theme='dark'] .rating-label {
          color: #cbd5e1;
        }
        
        .reviews-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
          margin-top: 24px;
        }
        
        .review-card {
          background: #ffffff;
          border: 1px solid #e7e9f0;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
        }
        
        body[data-theme='dark'] .review-card {
          background: #131d2f;
          border-color: #3f4a63;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .review-card:hover {
          box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
          transform: translateY(-2px);
        }
        
        body[data-theme='dark'] .review-card:hover {
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
        }
        
        .review-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }
        
        .reviewer-info {
          flex: 1;
        }
        
        .reviewer-name {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }
        
        body[data-theme='dark'] .reviewer-name {
          color: #f8fafc;
        }
        
        .review-date {
          font-size: 12px;
          color: #94a3b8;
        }
        
        body[data-theme='dark'] .review-date {
          color: #cbd5e1;
        }
        
        .stars-container {
          font-size: 18px;
          letter-spacing: 2px;
          margin-top: 4px;
        }
        
        .review-comment {
          font-size: 14px;
          line-height: 1.6;
          color: #334155;
          margin: 18px 0;
          font-style: italic;
          flex: 1;
        }
        
        body[data-theme='dark'] .review-comment {
          color: #cbd5e1;
        }
        
        .review-badge {
          display: inline-block;
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          font-weight: 700;
          color: #3b82f6;
          padding: 6px 12px;
          background: #dbeafe;
          border-radius: 6px;
          margin-top: 12px;
        }
        
        body[data-theme='dark'] .review-badge {
          color: #60a5fa;
          background: rgba(96, 165, 250, 0.15);
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 30px;
          color: #94a3b8;
        }
        
        body[data-theme='dark'] .empty-state {
          color: #cbd5e1;
        }
        
        .empty-icon {
          font-size: 48px;
          margin-bottom: 12px;
          opacity: 0.5;
        }
        
        .error-message {
          color: #ef4444;
          background: #fee2e2;
          padding: 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-top: 12px;
        }
        
        body[data-theme='dark'] .error-message {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #94a3b8;
        }
        
        @media (max-width: 800px) {
          .reviews-grid {
            grid-template-columns: 1fr;
            gap: 18px;
          }
          
          .page {
            padding: 24px 16px;
          }
          
          .page-title {
            font-size: 24px;
          }
          
          .review-header {
            flex-direction: column;
          }
        }
      `}</style>

      <ChoreographerNavbar subtitle="Reviews" />

      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Client Reviews</h1>
          
          {!loading && feedbacks.length > 0 && (
            <div className="average-rating-container">
              <div>
                <div className="stars-container">{renderStars(Math.round(averageRating))}</div>
              </div>
              <div>
                <div className="rating-value">{averageRating}</div>
                <div className="rating-label">Average Rating</div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="loading">Loading reviews...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : feedbacks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⭐</div>
            <div>No reviews yet. Start accepting bookings to receive feedback!</div>
          </div>
        ) : (
          <div className="reviews-grid">
            {feedbacks.map((item) => (
              <div key={item.feedback_id} className="review-card">
                <div className="review-header">
                  <div className="reviewer-info">
                    <div className="reviewer-name">{item.sender?.name || 'Anonymous'}</div>
                    <div className="review-date">{formatDate(item.created_at)}</div>
                  </div>
                  {item.rating && (
                    <div className="stars-container">{renderStars(item.rating)}</div>
                  )}
                </div>
                
                <div className="review-comment">"{item.comment}"</div>
                
                <div className="review-badge">Verified Student Feedback</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

