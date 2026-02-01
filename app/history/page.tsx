'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface UserHistory {
    id: string;
    display_name: string;
    days: { date: string; solved: boolean }[];
    solvedCount: number;
}

export default function History() {
    const [usersHistory, setUsersHistory] = useState<UserHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [todayDate, setTodayDate] = useState<string>('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data: usersData, error: usersError } = await supabase
                    .from('users')
                    .select('*')
                    .order('display_name');

                if (usersError) throw usersError;
                if (!usersData || usersData.length === 0) {
                    setLoading(false);
                    return;
                }

                // Calculate date range using Luxon
                const { DateTime } = await import('luxon');
                const { PACIFIC_TZ } = await import('@/lib/timezone');
                const today = DateTime.now().setZone(PACIFIC_TZ);
                setTodayDate(today.toISODate()!);

                const dates: string[] = [];
                for (let i = 29; i >= 0; i--) {
                    const date = today.minus({ days: i });
                    dates.push(date.toISODate()!);
                }

                // Fetch all results for last 30 days
                const { data: results, error: resultsError } = await supabase
                    .from('daily_results')
                    .select('*')
                    .gte('date', dates[0])
                    .lte('date', dates[dates.length - 1]);

                if (resultsError) throw resultsError;

                // Build history for each user
                const history: UserHistory[] = usersData.map((user) => {
                    const userResults = results?.filter((r) => r.user_id === user.id) || [];
                    const days = dates.map((date) => {
                        const result = userResults.find((r) => r.date === date);
                        return {
                            date,
                            solved: result?.did_solve || false,
                        };
                    });

                    const solvedCount = days.filter((d) => d.solved).length;

                    return {
                        id: user.id,
                        display_name: user.display_name,
                        days,
                        solvedCount,
                    };
                });

                setUsersHistory(history);
                setLoading(false);
            } catch (error) {
                console.error('Error fetching history:', error);
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const formatDate = (dateStr: string): string => {
        const [year, month, day] = dateStr.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
    };

    if (loading) {
        return (
            <div className="container">
                <Link href="/" className="back-link">← Back</Link>
                <div className="header">
                    <h1 className="title">HISTORY</h1>
                    <p className="subtitle">last 30 days</p>
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
                <h1 className="title">HISTORY</h1>
                <p className="subtitle">last 30 days</p>
            </div>

            <div className="history-section">
                {usersHistory.length === 0 ? (
                    <div className="empty-state">
                        <p>No history to display.</p>
                    </div>
                ) : (
                    usersHistory.map((user) => (
                        <div key={user.id} className="user-history-card">
                            <div className="user-history-header">
                                <span className="user-history-name">{user.display_name}</span>
                                <span className="user-history-stats">
                                    {user.solvedCount}/30 days
                                </span>
                            </div>

                            <div className="contribution-grid">
                                {user.days.map((day) => (
                                    <div
                                        key={day.date}
                                        className={`contribution-day ${day.solved ? 'solved' : 'not-solved'} ${day.date === todayDate ? 'today' : ''}`}
                                    >
                                        <div className="contribution-tooltip">
                                            {formatDate(day.date)}: {day.solved ? '✓ Solved' : '✗ Missed'}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid-legend">
                                <div className="legend-box missed"></div>
                                <span>Missed</span>
                                <div className="legend-box solved"></div>
                                <span>Solved</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
