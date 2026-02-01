'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface RoomInfo {
    id: string;
    code: string;
    hasPin: boolean;
}

interface User {
    id: string;
    leetcode_username: string;
    display_name: string;
}

export default function RemoveUserFromRoom() {
    const params = useParams();
    const router = useRouter();
    const roomCode = params.code as string;

    const [room, setRoom] = useState<RoomInfo | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const res = await fetch(`/api/rooms?code=${roomCode}`);
            if (res.ok) {
                const data = await res.json();
                setRoom(data.room);
                await fetchUsers(data.room.id);
            }
            setLoading(false);
        };
        init();
    }, [roomCode]);

    const fetchUsers = async (roomId: string) => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('room_id', roomId)
            .order('display_name');

        if (!error && data) {
            setUsers(data);
        }
    };

    const handleRemove = async (username: string) => {
        if (confirmingDelete !== username) {
            setConfirmingDelete(username);
            return;
        }

        setRemoving(username);
        setError(null);

        try {
            const res = await fetch(`/api/users?username=${username}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                throw new Error('Failed to remove user');
            }

            setUsers(users.filter(u => u.leetcode_username !== username));
            setConfirmingDelete(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRemoving(null);
        }
    };

    if (loading) {
        return (
            <div className="container">
                <Link href={`/room/${roomCode}`} className="back-link">← Back</Link>
                <div className="header">
                    <h1 className="title">REMOVE USER</h1>
                    <p className="subtitle">room: {roomCode}</p>
                </div>
                <div className="loading">
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <Link href={`/room/${roomCode}`} className="back-link">← Back</Link>

            <div className="header">
                <h1 className="title">REMOVE USER</h1>
                <p className="subtitle">room: {roomCode}</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {users.length === 0 ? (
                <div className="empty-state">
                    <p>No users to remove.</p>
                </div>
            ) : (
                <div className="user-list">
                    {users.map((user) => (
                        <div key={user.id} className="user-list-item">
                            <div className="user-list-info">
                                <h3>{user.display_name}</h3>
                                <p>@{user.leetcode_username}</p>
                            </div>
                            <button
                                onClick={() => handleRemove(user.leetcode_username)}
                                disabled={removing === user.leetcode_username}
                                className={`btn-danger ${confirmingDelete === user.leetcode_username ? 'confirming' : ''}`}
                            >
                                {removing === user.leetcode_username
                                    ? 'Removing...'
                                    : confirmingDelete === user.leetcode_username
                                        ? 'Confirm?'
                                        : 'Remove'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
