'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DateTime } from 'luxon';
import { PACIFIC_TZ, getPacificDate } from '@/lib/timezone';

interface RoomInfo {
    id: string;
    code: string;
}

interface User {
    id: string;
    leetcode_username: string;
    display_name: string;
}

interface DailyResult {
    date: string;
    did_solve: boolean;
    problem_title?: string;
}

export default function RoomHistory() {
    const params = useParams();
    const roomCode = params.code as string;

    const [room, setRoom] = useState<RoomInfo | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [results, setResults] = useState<Record<string, DailyResult[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            const res = await fetch(`/api/rooms?code=${roomCode}`);
            if (res.ok) {
                const data = await res.json();
                setRoom(data.room);
                await fetchData(data.room.id);
            }
            setLoading(false);
        };
        init();
    }, [roomCode]);

    const fetchData = async (roomId: string) => {
        // Fetch users in this room
        const { data: usersData } = await supabase
            .from('users')
            .select('*')
            .eq('room_id', roomId)
            .order('display_name');

        if (!usersData) return;
        setUsers(usersData);

        // Fetch last 30 days of results for each user
        const resultsMap: Record<string, DailyResult[]> = {};

        for (const user of usersData) {
            const { data: dailyResults } = await supabase
                .from('daily_results')
                .select('date, did_solve, problem_title')
                .eq('user_id', user.id)
                .order('date', { ascending: false })
                .limit(30);

            resultsMap[user.id] = dailyResults || [];
        }

        setResults(resultsMap);
    };

    // Generate last 30 days
    const getLast30Days = () => {
        const days = [];
        const today = DateTime.now().setZone(PACIFIC_TZ);
        for (let i = 0; i < 30; i++) {
            days.push(today.minus({ days: i }).toISODate()!);
        }
        return days;
    };

    if (loading) {
        return (
            <div className="container">
                <Link href={`/room/${roomCode}`} className="back-link">← Back</Link>
                <div className="header">
                    <h1 className="title">HISTORY</h1>
                    <p className="subtitle">room: {roomCode}</p>
                </div>
                <div className="loading">
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    const days = getLast30Days();

    return (
        <div className="container">
            <Link href={`/room/${roomCode}`} className="back-link">← Back</Link>

            <div className="header">
                <h1 className="title">HISTORY</h1>
                <p className="subtitle">room: {roomCode}</p>
            </div>

            {users.length === 0 ? (
                <div className="empty-state">
                    <p>No users in this room.</p>
                </div>
            ) : (
                <div className="history-grid">
                    {users.map((user) => {
                        const userResults = results[user.id] || [];
                        const resultMap = new Map(
                            userResults.map((r) => [r.date, r])
                        );

                        return (
                            <div key={user.id} className="history-card">
                                <h3 className="history-user-name">{user.display_name}</h3>
                                <p className="history-username">@{user.leetcode_username}</p>
                                <div className="contribution-grid">
                                    {days.map((date) => {
                                        const result = resultMap.get(date);
                                        const solved = result?.did_solve ?? false;
                                        const formattedDate = DateTime.fromISO(date).toFormat('MMM d');

                                        return (
                                            <div
                                                key={date}
                                                className={`contribution-day ${solved ? 'solved' : 'missed'}`}
                                                title={`${formattedDate}: ${solved ? (result?.problem_title || 'Solved') : 'Not solved'}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
