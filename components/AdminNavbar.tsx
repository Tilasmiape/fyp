'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ThemeModeButton from '@/components/ThemeModeButton';

interface AdminNavbarProps {
  subtitle?: string;
  actions?: ReactNode;
}

const links = [
  { label: 'Dashboard', path: '/admin/home' },
  { label: 'Requests', path: '/admin/requests' },
  { label: 'Sessions', path: '/admin/sessions' },
  { label: 'Videos', path: '/admin/videos' },
  { label: 'Users', path: '/admin/users' },
];

export default function AdminNavbar({ subtitle = 'Admin Panel', actions }: AdminNavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        padding: '16px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        gap: '20px',
        flexWrap: 'wrap',
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
            backgroundColor: '#fff',
            boxShadow: '0 8px 18px rgba(0,0,0,0.16)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <img
            src="/images/logo.png"
            alt="Logo"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2)' }}
          />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff', letterSpacing: '0.3px' }}>Step Out Studio</h2>
          <p style={{ margin: 0, fontSize: '10px', color: '#f4b63a', letterSpacing: '1.8px', textTransform: 'uppercase' }}>{subtitle}</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <ThemeModeButton />
        {links.map((link) => {
          const isActive = pathname === link.path || pathname?.startsWith(`${link.path}?`);
          return (
            <button
              key={link.path}
              onClick={() => router.push(link.path)}
              style={{
                background: isActive ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '8px 14px',
                borderRadius: '8px',
              }}
            >
              {link.label}
            </button>
          );
        })}

        {actions}

        <button
          onClick={() => router.push('/signin')}
          style={{
            background: 'rgba(255,255,255,0.22)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '8px',
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
