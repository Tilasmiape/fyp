'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Video {
    id: string;
    url: string;
    title: string;
    description?: string;
    uploadedAt: string;
    status: string;
    choreographerName: string;
    choreographerEmail: string;
    choreographerId: string;
}

export default function VideosPage() {
    const router = useRouter();
    const [videos, setVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        try {
            const res = await fetch('/api/admin/videos');
            if (!res.ok) {
                throw new Error('Failed to fetch videos');
            }
            const data = await res.json();
            if (data.success) {
                setVideos(data.videos);
            } else {
                setError('Failed to load videos');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVideoAction = async (choreographerId: string, videoId: string, action: 'approve' | 'reject') => {
        setProcessing(videoId);
        try {
            const res = await fetch('/api/admin/videos', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ choreographerId, videoId, action }),
            });

            if (!res.ok) {
                throw new Error('Failed to update video status');
            }

            const data = await res.json();
            if (data.success) {
                // Remove the video from the list since it's no longer pending
                setVideos(videos.filter(video => video.id !== videoId));
            } else {
                setError('Failed to update video status');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-white">
                        Video Management 🎥
                    </h1>
                    <button
                        onClick={() => router.back()}
                        className="text-gray-300 hover:text-white transition"
                    >
                        ← Back to Dashboard
                    </button>
                </div>

                {error && (
                    <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
                        {error}
                    </div>
                )}

                <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400">Loading videos...</div>
                    ) : videos.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">No pending videos to review.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-gray-300">
                                <thead className="bg-gray-700 text-gray-100 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4">Video</th>
                                        <th className="px-6 py-4">Choreographer</th>
                                        <th className="px-6 py-4">Title</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4">Uploaded</th>
                                        <th className="px-6 py-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {videos.map((video) => (
                                        <tr key={video.id} className="hover:bg-gray-700/50 transition">
                                            <td className="px-6 py-4">
                                                <video
                                                    src={video.url}
                                                    className="w-24 h-16 object-cover rounded"
                                                    controls
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-white">{video.choreographerName}</div>
                                                <div className="text-sm text-gray-400">{video.choreographerEmail}</div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-white">{video.title}</td>
                                            <td className="px-6 py-4 max-w-xs truncate">{video.description || '-'}</td>
                                            <td className="px-6 py-4">
                                                {new Date(video.uploadedAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleVideoAction(video.choreographerId, video.id, 'approve')}
                                                        disabled={processing === video.id}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition disabled:opacity-50"
                                                    >
                                                        {processing === video.id ? 'Processing...' : 'Approve'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleVideoAction(video.choreographerId, video.id, 'reject')}
                                                        disabled={processing === video.id}
                                                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition disabled:opacity-50"
                                                    >
                                                        {processing === video.id ? 'Processing...' : 'Reject'}
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
            </div>
        </div>
    );
}