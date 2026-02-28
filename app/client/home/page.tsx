'use client';

import { useRouter } from 'next/navigation';

export default function ClientDashboard() {
  const router = useRouter();

  const handleLogout = () => {
    // Clear auth cookie (client-side)
    document.cookie = 'authToken=; path=/; max-age=0';
    router.push('/signin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Welcome, Client! 👨‍🎓
          </h1>
          <p className="text-gray-600 mb-8">
            Find and book the perfect choreographer for your event.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Browse Choreographers</h3>
              <p className="text-blue-700">Find talented choreographers by dance style and location.</p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-xl font-semibold text-green-900 mb-2">Book Sessions</h3>
              <p className="text-green-700">Check availability and book your choreography lessons.</p>
            </div>

            <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
              <h3 className="text-xl font-semibold text-purple-900 mb-2">View Bookings</h3>
              <p className="text-purple-700">Manage and track all your upcoming sessions.</p>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg border border-orange-200">
              <h3 className="text-xl font-semibold text-orange-900 mb-2">Leave Reviews</h3>
              <p className="text-orange-700">Rate and review choreographers after your sessions.</p>
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
