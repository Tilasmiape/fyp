'use client';

import { usePathname, useRouter } from 'next/navigation';
import ThemeModeButton from '@/components/ThemeModeButton';

const links = [
  { label: 'Home', path: '/choreographer/home' },
  { label: 'Sessions', path: '/choreographer/sessions' },
  { label: 'Inbox', path: '/choreographer/inbox' },
  { label: 'Attendance', path: '/choreographer/attendance' },
  { label: 'Reviews', path: '/choreographer/reviews' },
  { label: 'Notifications', path: '/choreographer/notifications' },
];

interface ChoreographerNavbarProps {
  subtitle?: string;
}

export default function ChoreographerNavbar({ subtitle = 'Choreographer' }: ChoreographerNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        background: '#fff',
        borderBottom: '1px solid #e7e9f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '999px',
            overflow: 'hidden',
            boxShadow: '0 8px 18px rgba(0,0,0,0.16)',
            background: '#fff',
          }}
        >
          <img src="/images/logo.png" alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2)' }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#0f172a', letterSpacing: '0.3px' }}>Step Out Studio</div>
          <div style={{ fontSize: '10px', color: '#f4b63a', letterSpacing: '1.8px', textTransform: 'uppercase' }}>{subtitle}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <ThemeModeButton />
        {links.map((l) => {
          const active = pathname === l.path;
          return (
            <button
              key={l.path}
              onClick={() => router.push(l.path)}
              style={{
                border: active ? '1px solid #cbd5e1' : '1px solid #e7e9f0',
                background: active ? '#eef2ff' : '#fff',
                color: active ? '#334155' : '#6b7280',
                padding: '7px 12px',
                borderRadius: '999px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.9px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {l.label}
            </button>
          );
        })}
        <button
          onClick={() => router.push('/signin')}
          style={{
            border: '1px solid #e7e9f0',
            background: '#fff',
            color: '#6b7280',
            padding: '7px 12px',
            borderRadius: '999px',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.9px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
