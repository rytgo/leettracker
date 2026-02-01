'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface User {
    id: string;
    leetcode_username: string;
    display_name: string;
}

export default function RemoveUserPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<string | null>(null);
    const [confirming, setConfirming] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('display_name');

            if (error) throw error;
            setUsers(data || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users');
            setLoading(false);
        }
    };

    const handleRemoveClick = (username: string) => {
        if (confirming === username) {
            handleRemove(username);
        } else {
            setConfirming(username);
            setTimeout(() => setConfirming(null), 3000);
        }
    };

    const handleRemove = async (username: string) => {
        setRemoving(username);
        try {
            const res = await fetch(`/api/users?username=${username}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to remove user');
            }

            setUsers(users.filter(u => u.leetcode_username !== username));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRemoving(null);
            setConfirming(null);
        }
    };

    if (loading) {
        return (
            <div className="container">
                <Link href="/" className="back-link">← Back</Link>
                <div className="header">
                    <h1 className="title">REMOVE USER</h1>
                    <p className="subtitle">stop tracking someone</p>
                </div>
                <div className="loading">
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <Link href="/" className="back-link">← Back</Link>

            <div className="header">
                <h1 className="title">REMOVE USER</h1>
                <p className="subtitle">stop tracking someone</p>
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
                                <p>{user.leetcode_username}</p>
                            </div>
                            <button
                                onClick={() => handleRemoveClick(user.leetcode_username)}
                                disabled={removing === user.leetcode_username}
                                className={`btn-danger ${confirming === user.leetcode_username ? 'confirming' : ''}`}
                            >
                                {removing === user.leetcode_username
                                    ? 'Removing...'
                                    : confirming === user.leetcode_username
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
