'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function LandingPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('Guest');
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (res.ok && data?.success && data?.user?.fullName) {
          setUserName(data.user.fullName);
          setHasUser(true);
        }
      } catch {
        // keep guest
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    document.cookie = 'authToken=; path=/; max-age=0';
    setHasUser(false);
    setUserName('Guest');
    router.push('/signin');
  };

  return (
    <div className="landing-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,600&family=Manrope:wght@300;400;500;600;700;800&display=swap');

        :root {
          --ink: #0b0f1a;
          --nav: #ffffff;
          --accent: #f4b63a;
          --muted: #6b7280;
          --line: #e6e8ef;
          --paper: #f8f5ef;
        }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .landing-root {
          min-height: 100vh;
          background: #fff;
          color: var(--ink);
          font-family: 'Manrope', sans-serif;
        }

        /* NAV */
        .topbar {
          position: sticky;
          top: 0;
          z-index: 20;
          background: var(--nav);
          border-bottom: 1px solid var(--line);
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          padding: 12px 28px;
        }
        .nav-left,
        .nav-right {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .nav-left { justify-content: flex-start; }
        .nav-right { justify-content: flex-end; }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brand-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          
          overflow: hidden;
          display: grid;
          place-items: center;
         
        }
        .brand-badge img {
          width: 120%;
          height: 120%;
          object-fit: contain;
          transform: translateY(-10px);
          transition: scale 1.12s ease;
        }
        .brand-name {
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.5px;
        }
        .brand-sub {
          font-size: 8px;
          letter-spacing: 2px;
          color: var(--accent);
          text-transform: uppercase;
          margin-top: 2px;
        }
        .nav-links {
          display: flex;
          gap: 22px;
          font-size: 11px;
          letter-spacing: 1.4px;
          text-transform: uppercase;
          color: #6b7280;
          font-weight: 700;
        }
        .user-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
          font-weight: 700;
          color: #111827;
        }
        .user-role {
          font-size: 8px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: var(--accent);
        }
        .logout-btn {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: #f4f5f9;
          color: #6b7280;
          cursor: pointer;
        }
        .auth-actions {
          display: flex;
          gap: 10px;
        }
        .auth-btn {
          border: 1px solid var(--line);
          background: #f4f5f9;
          color: #111827;
          font-weight: 700;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
        }
        .auth-btn.primary {
          background: #111827;
          color: #fff;
          border-color: #111827;
        }

        /* HERO */
        .hero {
          position: relative;
          min-height: 78vh;
          display: grid;
          place-items: center;
          text-align: center;
          color: #fff;
          background: radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1), transparent 55%),
                      linear-gradient(180deg, rgba(8,16,30,0.35) 0%, rgba(8,16,30,0.92) 60%),
                      url('/images/main.png') center/cover no-repeat;
        }
        .hero-inner {
          max-width: 760px;
          padding: 20px 24px 40px;
        }
        .hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.25);
          background: rgba(0,0,0,0.35);
          font-size: 9px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #f6d372;
          font-weight: 700;
        }
        .hero-title {
          font-family: 'Playfair Display', serif;
          font-size: 64px;
          line-height: 1.02;
          margin: 22px 0 12px;
        }
        .hero-title em {
          font-style: italic;
          font-weight: 600;
        }
        .hero-sub {
          color: rgba(255,255,255,0.72);
          font-size: 14px;
          line-height: 1.7;
          max-width: 520px;
          margin: 0 auto 26px;
        }
        .hero-actions {
          display: flex;
          justify-content: center;
          gap: 14px;
        }
        .hero-btn {
          border-radius: 999px;
          padding: 10px 22px;
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 800;
          border: 1px solid rgba(255,255,255,0.4);
          background: transparent;
          color: #fff;
          cursor: pointer;
        }
        .hero-btn.primary {
          background: #fff;
          color: #0b0f1a;
          border-color: #fff;
        }
        .scroll-label {
          position: absolute;
          bottom: 26px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          letter-spacing: 2px;
          color: rgba(255,255,255,0.6);
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
        }

        /* STATS */
        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 26px 16px;
          border-bottom: 1px solid #efedf0;
        }
        .stat { text-align: center; }
        .stat-val {
          font-family: 'Playfair Display', serif;
          font-size: 22px;
          font-weight: 700;
        }
        .stat-label {
          font-size: 8px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #9ca3af;
          margin-top: 4px;
          font-weight: 700;
        }

        /* SECTION */
        .section {
          background: var(--paper);
          padding: 42px 20px 64px;
        }
        .section-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .section-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }
        .section-label {
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #f0b03a;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .section-title {
          font-family: 'Playfair Display', serif;
          font-size: 24px;
          margin: 0;
        }
        .section-title em { font-style: italic; }
        .section-link {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #111827;
          font-weight: 800;
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
        }

        .grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          grid-template-rows: 350px 300px;
          gap: 18px;
        }
        .tile {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          background: #111827;
          min-height: 160px;
          box-shadow: 0 20px 40px rgba(17,24,39,0.15);
          transition: transform 0.35s ease, box-shadow 0.35s ease;
        }
        .tile.big { grid-row: span 1; min-height: 350px; }
        .tile.night { min-height: 350px; }
        .tile.dark { min-height: 350px; }
        .tile.big img { object-position: 25% 50%; }
        .tile.night img { object-position: 15% 30%; }
        .tile.dark img { object-position: 15% 30%; }
        .tile img {
          position: absolute;
          inset: 0;
          z-index: 1;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 20%;
          display: block;
          transition: transform 0.5s ease, filter 0.5s ease;
        }
        .tile-overlay {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 2;
          padding: 14px;
          background: linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.85) 100%);
          color: #fff;
          transition: transform 0.35s ease, background 0.35s ease;
        }
        .tile:hover {
          transform: translateY(-6px);
          box-shadow: 0 26px 50px rgba(17,24,39,0.22);
        }
        .tile:hover img {
          transform: scale(1.05);
          filter: saturate(1.1);
        }
        .tile:hover .tile-overlay {
          transform: translateY(-4px);
          background: linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.95) 100%);
        }
        .tile-kicker {
          font-size: 9px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #f5c56b;
          font-weight: 800;
        }
        .tile-title {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 700;
          margin-top: 4px;
          text-shadow: 0 6px 12px rgba(0,0,0,0.35);
        }
        .tile.big .tile-title {
          font-size: 20px;
        }

        .tile.gray { background: linear-gradient(180deg, #ededed 0%, #c9c9c9 100%); }
        .tile.dark { background: linear-gradient(135deg, #0b1325 0%, #1f2937 100%); }
        .tile.night { background: linear-gradient(135deg, #0f172a 0%, #111827 60%); }

        /* FOOTER */
        .footer {
          background: #0b1325;
          color: rgba(255,255,255,0.5);
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          padding: 16px 20px;
          text-align: center;
        }

        @media (max-width: 900px) {
          .hero-title { font-size: 46px; }
          .stats { grid-template-columns: repeat(2, 1fr); }
          .grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .topbar { grid-template-columns: 1fr; gap: 10px; }
          .nav-left, .nav-right { justify-content: center; }
          .nav-links { display: none; }
          .hero-title { font-size: 38px; }
          .hero-actions { flex-direction: column; }
        }
      `}</style>

      <nav className="topbar">
        <div className="nav-left">
          <div className="brand">
            <div className="brand-badge">
              <img src="/images/logo.png" alt="Step Out" />
            </div>
            <div>
              <div className="brand-name">Step Out</div>
              <div className="brand-sub">Studio Hub</div>
            </div>
          </div>
        </div>

        <div className="nav-links">
          <span>Home</span>
          <span>Dashboard</span>
        </div>

        <div className="nav-right">
          {hasUser ? (
            <>
              <div className="user-pill">
                <span>{userName}</span>
                <span className="user-role">Client</span>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout">&gt;</button>
            </>
          ) : (
            <div className="auth-actions">
              <button className="auth-btn" onClick={() => router.push('/signin')}>Sign In</button>
              <button className="auth-btn primary" onClick={() => router.push('/signup')}>Sign Up</button>
            </div>
          )}
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-inner">
          <div className="hero-pill">Nepal's Premier Dance Collective</div>
          <div className="hero-title">Step Out<br />The World is<br />Your <em>Stage</em></div>
          <p className="hero-sub">
            Experience elite choreography. From cultural heritage to contemporary pulse,
            master the art of movement with Nepal's finest artists.
          </p>
          <div className="hero-actions">
            <button className="hero-btn primary" onClick={() => router.push('/signup')}>Sign Up</button>
            <button className="hero-btn" onClick={() => router.push('/signin')}>Sign In</button>
          </div>
        </div>
        <button
          className="scroll-label"
          type="button"
          onClick={() => document.getElementById('tiles')?.scrollIntoView({ behavior: 'smooth' })}
        >
          Scroll
        </button>
      </section>

      <section className="stats">
        <div className="stat">
          <div className="stat-val">150+</div>
          <div className="stat-label">Elite Artists</div>
        </div>
        <div className="stat">
          <div className="stat-val">25+</div>
          <div className="stat-label">Curated Styles</div>
        </div>
        <div className="stat">
          <div className="stat-val">8k+</div>
          <div className="stat-label">Moments Created</div>
        </div>
        <div className="stat">
          <div className="stat-val">12</div>
          <div className="stat-label">City Hubs</div>
        </div>
      </section>

      <section className="section" id="tiles">
        <div className="section-inner">
          <div className="section-top">
            <div>
              <div className="section-label">Creative Styles</div>
              <h2 className="section-title">Artistry in Every <em>Step</em></h2>
            </div>
            <button
              className="section-link"
              type="button"
              onClick={() => document.getElementById('top')?.scrollIntoView({ behavior: 'smooth' })}
            >
              View All Disciplines
            </button>
          </div>

          <div className="grid">
            <div className="tile big">
              <img src="/images/bollywood.jpg" alt="Bollywood Gold" />
              <div className="tile-overlay">
                <div className="tile-kicker">Energy & Soul</div>
                <div className="tile-title">Bollywood Gold</div>
              </div>
            </div>
            <div className="tile gray">
              <img src="/images/cultural.jpg" alt="Cultural Pulse" />
              <div className="tile-overlay">
                <div className="tile-kicker">Ancient Rhythm</div>
                <div className="tile-title">Cultural Pulse</div>
              </div>
            </div>
            <div className="tile night">
              <img src="/images/modern.jpg" alt="Urban Flow" />
              <div className="tile-overlay">
                <div className="tile-kicker">Modern Beat</div>
                <div className="tile-title">Urban Flow</div>
              </div>
            </div>
            <div className="tile dark">
              <img src="/images/contemporary.jpg" alt="Contemporary Noir" />
              <div className="tile-overlay">
                <div className="tile-kicker">Pure Emotion</div>
                <div className="tile-title">Contemporary Noir</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">Instagram · Facebook · YouTube</footer>
    </div>
  );
}
