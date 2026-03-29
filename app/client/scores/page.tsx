'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ScoreItem {
  score_id: string;
  score: number;
  given_at: string;
  booking_id?: string;
  choreographer?: {
    id: string;
    name: string;
    profileImage?: string;
  };
}

export default function ClientScoresPage() {
  const router = useRouter();
  const [scores, setScores] = useState<ScoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/client/scores', { method: 'GET', credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          throw new Error(data?.error || 'Failed to load scores');
        }
        setScores(Array.isArray(data?.scores) ? data.scores : []);
      } catch (err: any) {
        setError(err.message || 'Failed to load scores');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const average = useMemo(() => {
    if (scores.length === 0) return 0;
    const total = scores.reduce((sum, s) => sum + (Number(s.score) || 0), 0);
    return Math.round((total / scores.length) * 10) / 10;
  }, [scores]);

  return (
    <div className="scores-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Manrope:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .scores-root { min-height: 100vh; background: #f6f7fb; font-family: 'Manrope', sans-serif; color: #0f172a; }
        .topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 40px; background: #fff; border-bottom: 1px solid #e7e9f0; }
        .brand { display: flex; align-items: center; gap: 10px; }
        .brand-badge { width: 48px; height: 48px; border-radius: 999px; background: #fff; overflow: hidden; box-shadow: 0 8px 18px rgba(0,0,0,0.18); display: grid; place-items: center; }
        .brand-badge img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.2); }
        .brand-name { font-weight: 700; letter-spacing: 0.4px; }
        .brand-sub { font-size: 10px; color: #f4b63a; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
        .nav-links { display: flex; gap: 18px; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
        .page { max-width: 1000px; margin: 0 auto; padding: 32px 36px 60px; }
        .hero { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .hero h1 { font-family: 'Playfair Display', serif; font-size: 32px; margin: 0; }
        .avg-card { background: #fff; border: 1px solid #e7e9f0; border-radius: 18px; padding: 16px 20px; box-shadow: 0 10px 20px rgba(17,24,39,0.06); text-align: right; }
        .avg-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #9ca3af; font-weight: 700; }
        .avg-value { font-size: 26px; font-weight: 800; color: #111827; }
        .card { background: #fff; border: 1px solid #e7e9f0; border-radius: 18px; padding: 18px; margin-top: 24px; box-shadow: 0 8px 18px rgba(17,24,39,0.05); }
        .row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #eef1f7; }
        .row:last-child { border-bottom: none; }
        .left { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 42px; height: 42px; border-radius: 14px; background: #111827; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 14px; overflow: hidden; }
        .avatar img { width: 100%; height: 100%; object-fit: cover; }
        .name { font-weight: 700; }
        .date { font-size: 12px; color: #94a3b8; margin-top: 4px; }
        .score { font-weight: 800; font-size: 18px; }
        .empty { color: #9ca3af; font-size: 13px; }
        .error { color: #ef4444; font-size: 13px; }
        @media (max-width: 760px) {
          .topbar { padding: 14px 18px; }
          .nav-links { display: none; }
          .page { padding: 24px 18px 50px; }
          .hero { flex-direction: column; align-items: flex-start; }
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
        <div className="hero">
          <h1>Performance Scores</h1>
          <div className="avg-card">
            <div className="avg-label">Average Score</div>
            <div className="avg-value">{average || 0} / 10</div>
          </div>
        </div>

        {loading ? (
          <div className="empty" style={{ marginTop: '20px' }}>Loading scores...</div>
        ) : error ? (
          <div className="error" style={{ marginTop: '20px' }}>{error}</div>
        ) : scores.length === 0 ? (
          <div className="empty" style={{ marginTop: '20px' }}>No scores yet.</div>
        ) : (
          <div className="card">
            {scores.map(score => (
              <div key={score.score_id} className="row">
                <div className="left">
                  <div className="avatar">
                    {score.choreographer?.profileImage
                      ? <img src={score.choreographer.profileImage} alt={score.choreographer.name} />
                      : (score.choreographer?.name || 'C').charAt(0)}
                  </div>
                  <div>
                    <div className="name">{score.choreographer?.name || 'Choreographer'}</div>
                    <div className="date">{new Date(score.given_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="score">{score.score} / 10</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
