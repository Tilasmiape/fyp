'use client';

import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    document.cookie = 'authToken=; path=/; max-age=0';
    router.push('/signin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-xl shadow-lg p-8 border border-gray-700">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome, Admin! ⚙️
          </h1>
          <p className="text-gray-300 mb-8">
            Manage the platform, users, and bookings.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 hover:border-blue-500 transition cursor-pointer" onClick={() => router.push('/admin/users')}>
              <h3 className="text-xl font-semibold text-white mb-2">Manage Users</h3>
              <p className="text-gray-300">View, edit, or remove user accounts.</p>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg border border-gray-600">
              <h3 className="text-xl font-semibold text-white mb-2">View Analytics</h3>
              <p className="text-gray-300">Track platform usage and revenue metrics.</p>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg border border-gray-600">
              <h3 className="text-xl font-semibold text-white mb-2">Manage Bookings</h3>
              <p className="text-gray-300">Monitor and manage all platform bookings.</p>
            </div>

            <div className="bg-gray-700 p-6 rounded-lg border border-gray-600">
              <h3 className="text-xl font-semibold text-white mb-2">System Settings</h3>
              <p className="text-gray-300">Configure platform-wide settings and policies.</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
