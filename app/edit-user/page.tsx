'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface User {
    id: string;
    leetcode_username: string;
    display_name: string;
}

export default function EditUserPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [saving, setSaving] = useState(false);
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

    const handleEdit = (user: User) => {
        setEditing(user.leetcode_username);
        setEditValue(user.display_name);
        setError(null);
    };

    const handleCancel = () => {
        setEditing(null);
        setEditValue('');
    };

    const handleSave = async (username: string) => {
        if (!editValue.trim()) {
            setError('Display name cannot be empty');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, displayName: editValue.trim() }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to update');
            }

            // Update local state
            setUsers(users.map(u =>
                u.leetcode_username === username
                    ? { ...u, display_name: editValue.trim() }
                    : u
            ));
            setEditing(null);
            setEditValue('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="container">
                <Link href="/" className="back-link">← Back</Link>
                <div className="header">
                    <h1 className="title">EDIT USER</h1>
                    <p className="subtitle">change display names</p>
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
                <h1 className="title">EDIT USER</h1>
                <p className="subtitle">change display names</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {users.length === 0 ? (
                <div className="empty-state">
                    <p>No users to edit.</p>
                </div>
            ) : (
                <div className="user-list">
                    {users.map((user) => (
                        <div key={user.id} className="user-list-item">
                            {editing === user.leetcode_username ? (
                                <div className="edit-form-container">
                                    <div className="edit-form">
                                        <input
                                            type="text"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            className="form-input"
                                            autoFocus
                                        />
                                        <span className="edit-username">@{user.leetcode_username}</span>
                                    </div>
                                    <div className="edit-actions">
                                        <button
                                            onClick={() => handleSave(user.leetcode_username)}
                                            disabled={saving}
                                            className="btn-save"
                                        >
                                            {saving ? 'Saving...' : 'Save'}
                                        </button>
                                        <button
                                            onClick={handleCancel}
                                            disabled={saving}
                                            className="btn-cancel"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="user-list-info">
                                        <h3>{user.display_name}</h3>
                                        <p>@{user.leetcode_username}</p>
                                    </div>
                                    <button
                                        onClick={() => handleEdit(user)}
                                        className="btn-edit"
                                    >
                                        Edit
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
