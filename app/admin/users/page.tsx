'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface User {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    bio?: string;
    danceStyles?: string[];
    pricePerSession?: number;
    createdAt: string;
}

export default function UsersPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roleFilter = searchParams?.get('role') || null;
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        role: roleFilter || 'client',
        phoneNumber: '',
        bio: '',
        danceStyles: [] as string[],
        pricePerSession: 0,
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (roleFilter) {
            setFilteredUsers(users.filter(user => user.role === roleFilter));
        } else {
            setFilteredUsers(users);
        }
    }, [users, roleFilter]);

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

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to add user');
            }

            const data = await res.json();
            if (data.success) {
                setUsers([...users, data.user]);
                setShowAddModal(false);
                resetForm();
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;

        try {
            const { password, ...updateData } = formData; // Exclude password from update

            const res = await fetch('/api/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: editingUser._id, ...updateData }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to update user');
            }

            const data = await res.json();
            if (data.success) {
                setUsers(users.map(user => user._id === editingUser._id ? data.user : user));
                setShowEditModal(false);
                setEditingUser(null);
                resetForm();
            }
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const res = await fetch('/api/users', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id: userId }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to delete user');
            }

            setUsers(users.filter(user => user._id !== userId));
        } catch (err: any) {
            setError(err.message);
        }
    };

    const resetForm = () => {
        setFormData({
            fullName: '',
            email: '',
            password: '',
            role: roleFilter || 'client',
            phoneNumber: '',
            bio: '',
            danceStyles: [],
            pricePerSession: 0,
        });
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            fullName: user.fullName,
            email: user.email,
            password: '', // Don't populate password
            role: user.role,
            phoneNumber: user.phoneNumber || '',
            bio: user.bio || '',
            danceStyles: user.danceStyles || [],
            pricePerSession: user.pricePerSession || 0,
        });
        setShowEditModal(true);
    };

    const handleDanceStyleChange = (style: string) => {
        setFormData(prev => ({
            ...prev,
            danceStyles: prev.danceStyles.includes(style)
                ? prev.danceStyles.filter(s => s !== style)
                : [...prev.danceStyles, style]
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white">
                        {roleFilter ? `${roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}s Management` : 'Users Management'} 👥
                    </h1>
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                        >
                            Add {roleFilter ? roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1) : 'User'}
                        </button>
                        <button
                            onClick={() => router.push('/admin/home')}
                            className="text-gray-300 hover:text-white transition"
                        >
                            ← Back to Dashboard
                        </button>
                    </div>
                </div>

                {/* Role Filter */}
                <div className="mb-6 flex space-x-2">
                    <button
                        onClick={() => router.push('/admin/users')}
                        className={`px-4 py-2 rounded-lg transition ${!roleFilter ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                        All Users
                    </button>
                    <button
                        onClick={() => router.push('/admin/users?role=choreographer')}
                        className={`px-4 py-2 rounded-lg transition ${roleFilter === 'choreographer' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                        Choreographers
                    </button>
                    <button
                        onClick={() => router.push('/admin/users?role=client')}
                        className={`px-4 py-2 rounded-lg transition ${roleFilter === 'client' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                        Clients
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No {roleFilter ? roleFilter + 's' : 'users'} found.</div>
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
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {filteredUsers.map((user) => (
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
                                            <td className="px-6 py-4">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user._id)}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Add User Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
                            <h2 className="text-2xl font-bold text-white mb-4">Add New User</h2>
                            <form onSubmit={handleAddUser}>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                                        required
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                                        required
                                    />
                                    <input
                                        type="password"
                                        placeholder="Password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                                        required
                                    />
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                    >
                                        <option value="client">Client</option>
                                        <option value="choreographer">Choreographer</option>
                                        <option value="super-admin">Super Admin</option>
                                    </select>
                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                                    />
                                    <textarea
                                        placeholder="Bio"
                                        value={formData.bio}
                                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                                        rows={3}
                                    />
                                    {formData.role === 'choreographer' && (
                                        <>
                                            <input
                                                type="number"
                                                placeholder="Price per Session"
                                                value={formData.pricePerSession}
                                                onChange={(e) => setFormData({...formData, pricePerSession: parseFloat(e.target.value)})}
                                                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                                            />
                                            <div>
                                                <label className="block text-white mb-2">Dance Styles</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Hip Hop', 'Ballet', 'Jazz', 'Contemporary', 'Tap', 'Breakdance'].map(style => (
                                                        <label key={style} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.danceStyles.includes(style)}
                                                                onChange={() => handleDanceStyleChange(style)}
                                                                className="mr-2"
                                                            />
                                                            <span className="text-white">{style}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="flex space-x-4 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => { setShowAddModal(false); resetForm(); }}
                                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition"
                                    >
                                        Add User
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit User Modal */}
                {showEditModal && editingUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
                            <h2 className="text-2xl font-bold text-white mb-4">Edit User</h2>
                            <form onSubmit={handleEditUser}>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                                        required
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                                        required
                                    />
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white"
                                    >
                                        <option value="client">Client</option>
                                        <option value="choreographer">Choreographer</option>
                                        <option value="super-admin">Super Admin</option>
                                    </select>
                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                                    />
                                    <textarea
                                        placeholder="Bio"
                                        value={formData.bio}
                                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                                        rows={3}
                                    />
                                    {formData.role === 'choreographer' && (
                                        <>
                                            <input
                                                type="number"
                                                placeholder="Price per Session"
                                                value={formData.pricePerSession}
                                                onChange={(e) => setFormData({...formData, pricePerSession: parseFloat(e.target.value)})}
                                                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                                            />
                                            <div>
                                                <label className="block text-white mb-2">Dance Styles</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['Hip Hop', 'Ballet', 'Jazz', 'Contemporary', 'Tap', 'Breakdance'].map(style => (
                                                        <label key={style} className="flex items-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={formData.danceStyles.includes(style)}
                                                                onChange={() => handleDanceStyleChange(style)}
                                                                className="mr-2"
                                                            />
                                                            <span className="text-white">{style}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="flex space-x-4 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => { setShowEditModal(false); setEditingUser(null); resetForm(); }}
                                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition"
                                    >
                                        Update User
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
