'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface RoomInfo {
    id: string;
    code: string;
    hasPin: boolean;
}

export default function AddUserToRoom() {
    const params = useParams();
    const roomCode = params.code as string;

    const [room, setRoom] = useState<RoomInfo | null>(null);
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchRoom = async () => {
            const res = await fetch(`/api/rooms?code=${roomCode}`);
            if (res.ok) {
                const data = await res.json();
                setRoom(data.room);
            }
        };
        fetchRoom();
    }, [roomCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    displayName: displayName.trim(),
                    roomId: room?.id,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to add user');
            }

            setSuccess(true);
            setUsername('');
            setDisplayName('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <Link href={`/room/${roomCode}`} className="back-link">← Back to Room</Link>

            <div className="header">
                <h1 className="title">ADD USER</h1>
                <p className="subtitle">room: {roomCode}</p>
            </div>

            <form onSubmit={handleSubmit} className="form-container">
                <div className="form-group">
                    <label htmlFor="username">LeetCode Username</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g., leetcoder123"
                        className="form-input"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="displayName">Display Name</label>
                    <input
                        type="text"
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g., John"
                        className="form-input"
                        required
                    />
                </div>

                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">User added successfully!</div>}

                <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? 'Adding...' : 'Add User'}
                </button>
            </form>
        </div>
    );
}
