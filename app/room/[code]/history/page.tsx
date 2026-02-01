'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { DateTime } from 'luxon';
import { PACIFIC_TZ } from '@/lib/timezone';

interface RoomInfo {
    id: string;
    code: string;
}

interface UserHistory {
    id: string;
    display_name: string;
    days: { date: string; solved: boolean }[];
    solvedCount: number;
}

export default function RoomHistory() {
    const params = useParams();
    const roomCode = params.code as string;

    const [room, setRoom] = useState<RoomInfo | null>(null);
    const [usersHistory, setUsersHistory] = useState<UserHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [todayDate, setTodayDate] = useState<string>('');
    const [hoveredDay, setHoveredDay] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const res = await fetch(`/api/rooms?code=${roomCode}`);
            if (res.ok) {
                const data = await res.json();
                setRoom(data.room);
                await fetchHistory(data.room.id);
            }
            setLoading(false);
        };
        init();
    }, [roomCode]);

    const fetchHistory = async (roomId: string) => {
        const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('*')
            .eq('room_id', roomId)
            .order('display_name');

        if (usersError || !usersData || usersData.length === 0) return;

        const today = DateTime.now().setZone(PACIFIC_TZ);
        setTodayDate(today.toISODate()!);

        const dates: string[] = [];
        for (let i = 29; i >= 0; i--) {
            dates.push(today.minus({ days: i }).toISODate()!);
        }

        const { data: results, error: resultsError } = await supabase
            .from('daily_results')
            .select('*')
            .in('user_id', usersData.map(u => u.id))
            .gte('date', dates[0])
            .lte('date', dates[dates.length - 1]);

        if (resultsError) return;

        const history: UserHistory[] = usersData.map((user) => {
            const userResults = results?.filter((r) => r.user_id === user.id) || [];
            const days = dates.map((date) => {
                const result = userResults.find((r) => r.date === date);
                return { date, solved: result?.did_solve || false };
            });
            const solvedCount = days.filter((d) => d.solved).length;
            return { id: user.id, display_name: user.display_name, days, solvedCount };
        });

        setUsersHistory(history);
    };

    const formatDate = (dateStr: string): string => {
        const [, month, day] = dateStr.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}`;
    };

    if (loading) {
        return (
            <div className="container">
                <Link href={`/room/${roomCode}`} className="back-link">← Back</Link>
                <div className="header">
                    <h1 className="title">HISTORY</h1>
                    <p className="subtitle">room: {roomCode}</p>
                </div>
                <div className="loading"><div className="loading-spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="container">
            <Link href={`/room/${roomCode}`} className="back-link">← Back</Link>

            <div className="header">
                <h1 className="title">HISTORY</h1>
                <p className="subtitle">room: {roomCode} · last 30 days</p>
            </div>

            {usersHistory.length === 0 ? (
                <div className="empty-state">
                    <p>No users in this room yet.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
                    {usersHistory.map((user) => (
                        <div key={user.id} style={{
                            background: '#27272a',
                            border: '1px solid #3f3f46',
                            borderRadius: '8px',
                            padding: '1.5rem',
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem',
                            }}>
                                <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fafafa' }}>
                                    {user.display_name}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>
                                    {user.solvedCount}/30 days
                                </span>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(10, 28px)',
                                gap: '6px',
                                marginBottom: '1rem',
                            }}>
                                {user.days.map((day) => {
                                    const dayKey = `${user.id}-${day.date}`;
                                    const isHovered = hoveredDay === dayKey;
                                    const isToday = day.date === todayDate;

                                    return (
                                        <div
                                            key={day.date}
                                            style={{
                                                position: 'relative',
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '4px',
                                                backgroundColor: day.solved ? '#22c55e' : '#3f3f46',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease',
                                                transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                                                boxShadow: isToday
                                                    ? '0 0 0 2px #facc15'
                                                    : isHovered
                                                        ? '0 4px 12px rgba(0,0,0,0.4)'
                                                        : 'none',
                                                zIndex: isHovered ? 10 : 1,
                                            }}
                                            onMouseEnter={() => setHoveredDay(dayKey)}
                                            onMouseLeave={() => setHoveredDay(null)}
                                        >
                                            {isHovered && (
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: 'calc(100% + 8px)',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    background: '#fafafa',
                                                    color: '#18181b',
                                                    padding: '6px 10px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    whiteSpace: 'nowrap',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                                                    zIndex: 100,
                                                }}>
                                                    {formatDate(day.date)}: {day.solved ? '✓ Solved' : '✗ Missed'}
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: '100%',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        width: 0,
                                                        height: 0,
                                                        borderLeft: '6px solid transparent',
                                                        borderRight: '6px solid transparent',
                                                        borderTop: '6px solid #fafafa',
                                                    }} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.75rem',
                                color: '#a1a1aa',
                            }}>
                                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#3f3f46' }} />
                                <span>Missed</span>
                                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#22c55e', marginLeft: '0.75rem' }} />
                                <span>Solved</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
