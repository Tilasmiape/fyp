'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    createdAt: string;
}

export default function UsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                if (!res.ok) {
                    throw new Error('Failed to fetch users');
                }
                const data = await res.json();
                if (data.success) {
                    setUsers(data.users);
                } else {
                    setError('Failed to load users');
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white">
                        Users Management 👥
                    </h1>
                    <button
                        onClick={() => router.back()}
                        className="text-gray-300 hover:text-white transition"
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading users...</div>
                    ) : error ? (
                        <div className="p-8 text-center text-red-500">{error}</div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No users found.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-gray-300">
                                <thead className="bg-gray-700 text-gray-100 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Full Name</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Phone</th>
                                        <th className="px-6 py-4">Joined At</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {users.map((user) => (
                                        <tr key={user._id} className="hover:bg-gray-700/50 transition">
                                            <td className="px-6 py-4 font-medium text-white">{user.fullName}</td>
                                            <td className="px-6 py-4">{user.email}</td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === 'admin'
                                                            ? 'bg-purple-900 text-purple-200'
                                                            : user.role === 'choreographer'
                                                                ? 'bg-blue-900 text-blue-200'
                                                                : 'bg-green-900 text-green-200'
                                                        }`}
                                                >
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">{user.phoneNumber || '-'}</td>
                                            <td className="px-6 py-4">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
