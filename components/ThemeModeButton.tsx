'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'stepout_panel_theme';

function setTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.body.setAttribute('data-theme', theme);
}

export default function ThemeModeButton() {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const nextTheme: ThemeMode = stored === 'dark' ? 'dark' : 'light';
    setThemeState(nextTheme);
    setTheme(nextTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setThemeState(nextTheme);
    setTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: theme === 'dark' ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(148,163,184,0.45)',
        color: theme === 'dark' ? '#f8fafc' : '#0f172a',
        fontSize: '11px',
        fontWeight: 700,
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: '999px',
        textTransform: 'uppercase',
        letterSpacing: '0.8px',
        whiteSpace: 'nowrap',
      }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
