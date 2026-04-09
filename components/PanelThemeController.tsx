'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'stepout_panel_theme';

function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.body.setAttribute('data-theme', theme);
}

export default function PanelThemeController() {
  const pathname = usePathname();
  const isPanelRoute = useMemo(
    () =>
      Boolean(
        pathname &&
          (pathname.startsWith('/client') ||
            pathname.startsWith('/choreographer') ||
            pathname.startsWith('/admin'))
      ),
    [pathname]
  );

  const [theme, setTheme] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.setAttribute('data-user-panel', isPanelRoute ? 'true' : 'false');

    if (!isPanelRoute) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    const nextTheme: ThemeMode = stored === 'dark' ? 'dark' : 'light';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    setReady(true);
  }, [isPanelRoute]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  if (!isPanelRoute || !ready) return null;

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle light and dark mode"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        position: 'fixed',
        right: '18px',
        bottom: '18px',
        zIndex: 9999,
        border: '1px solid rgba(148,163,184,0.45)',
        background: theme === 'dark' ? '#111827' : '#ffffff',
        color: theme === 'dark' ? '#f8fafc' : '#0f172a',
        borderRadius: '999px',
        padding: '10px 14px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.7px',
        textTransform: 'uppercase',
        cursor: 'pointer',
        boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
      }}
    >
      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
    </button>
  );
}
