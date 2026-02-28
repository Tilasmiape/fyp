'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  email: string;
  role: 'admin' | 'choreographer' | 'client';
  fullName: string;
}

export default function Navbar() {
  const [user, setUser] = useState<DecodedToken | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Get token from cookies
    const tokenString = document.cookie
      .split('; ')
      .find((row) => row.startsWith('authToken='))
      ?.split('=')[1];

    if (tokenString) {
      try {
        // Note: This is a client-side decode (not secure for sensitive data)
        // In production, fetch user data from an API endpoint
        const decoded = jwt.decode(tokenString) as unknown as DecodedToken;
        setUser(decoded);
      } catch (error) {
        console.error('Failed to decode token');
      }
    }
  }, []);

  const handleLogout = async () => {
    // Call logout API
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/sign-in');
  };

  const getDashboardLink = (role: string) => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'choreographer':
        return '/choreographer';
      case 'client':
        return '/client';
      default:
        return '/';
    }
  };

  return (
    <nav className="bg-white shadow-md p-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          Step Out
        </Link>

        <div className="flex gap-4">
          {user ? (
            <>
              <span className="text-gray-700">
                {user.fullName} ({user.role})
              </span>
              <Link
                href={getDashboardLink(user.role)}
                className="text-blue-500 hover:underline"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-blue-500 hover:underline">
                Sign In
              </Link>
              <Link href="/sign-up" className="text-blue-500 hover:underline">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
