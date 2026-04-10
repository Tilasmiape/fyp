'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'stepout_theme';

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.body.setAttribute('data-theme', theme);
}

function getSystemTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export default function PanelThemeController() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Check for saved preference first, then system preference, default to light
    const stored = localStorage.getItem(STORAGE_KEY);
    const nextTheme: ThemeMode = stored ? (stored === 'dark' ? 'dark' : 'light') : getSystemTheme();
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setReady(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  if (!ready) return null;

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: 9999,
        border: 'none',
        background: theme === 'dark' ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        color: theme === 'dark' ? '#60a5fa' : '#3b82f6',
        borderRadius: '50%',
        width: '48px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        cursor: 'pointer',
        boxShadow: theme === 'dark' 
          ? '0 8px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' 
          : '0 8px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'scale(1)',
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.transform = 'scale(1.1)';
        (e.target as HTMLElement).style.boxShadow = theme === 'dark' 
          ? '0 12px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' 
          : '0 12px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.8)';
      }}
      onMouseLeave={(e) => {
        (e.target as HTMLElement).style.transform = 'scale(1)';
        (e.target as HTMLElement).style.boxShadow = theme === 'dark' 
          ? '0 8px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' 
          : '0 8px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)';
      }}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
