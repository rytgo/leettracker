'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getStreaks } from '@/lib/streaks';
import { getSecondsUntilMidnight, formatTime, getPacificDate } from '@/lib/timezone';
import { UserWithStreaks } from '@/lib/types';
import { DateTime } from 'luxon';

export default function Home() {
  const [users, setUsers] = useState<UserWithStreaks[]>([]);
  const [countdown, setCountdown] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const formatCountdown = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchData = async () => {
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('display_name');

      if (usersError) throw usersError;

      if (!usersData || usersData.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const today = getPacificDate();
      const enrichedUsers = await Promise.all(
        usersData.map(async (user) => {
          const { data: todayResult } = await supabase
            .from('daily_results')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', today)
            .single();

          const streaks = await getStreaks(user.id);

          return {
            ...user,
            currentStreak: streaks.current,
            longestStreak: streaks.longest,
            todayStatus: {
              isDone: todayResult?.did_solve || false,
              solveTime: todayResult?.solved_at || null,
              problemTitle: todayResult?.problem_title || null,
              problemSlug: todayResult?.problem_slug || null,
              submissionId: todayResult?.submission_id || null,
            },
          };
        })
      );

      setUsers(enrichedUsers);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      await fetch('/api/sync');
      await fetchData();
      setLastSynced(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const updateCountdown = () => {
      const seconds = getSecondsUntilMidnight();
      setCountdown(formatCountdown(seconds));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="header">
          <h1 className="title">LEETTRACKER</h1>
          <p className="subtitle">daily accountability</p>
        </div>
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="container">
        <div className="header">
          <h1 className="title">LEETTRACKER</h1>
          <p className="subtitle">daily accountability</p>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <p>No users being tracked yet.</p>
          <Link href="/add-user" className="nav-link" style={{ marginTop: '1rem', display: 'inline-block' }}>
            Add your first user →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">LEETTRACKER</h1>
        <p className="subtitle">daily accountability</p>
      </div>

      <div className="countdown-section">
        <div className="countdown-label">Time remaining today</div>
        <div className="countdown-time">{countdown}</div>
        <button
          onClick={handleRefresh}
          disabled={syncing}
          className="refresh-btn"
        >
          {syncing ? '⟳ Syncing...' : '⟳ Refresh Now'}
        </button>
        {lastSynced && (
          <div className="last-synced">Last synced: {lastSynced}</div>
        )}
      </div>

      <div className="users-grid">
        {users.map((user) => {
          const { todayStatus } = user;
          const solveTimeDisplay = todayStatus.solveTime
            ? formatTime(DateTime.fromISO(todayStatus.solveTime))
            : null;

          return (
            <div
              key={user.id}
              className={`user-card ${todayStatus.isDone ? 'solved' : 'not-solved'}`}
            >
              <div className="user-header">
                <a
                  href={`https://leetcode.com/u/${user.leetcode_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="user-name-link"
                >
                  {user.display_name} ↗
                </a>
                <span className={`user-status-badge ${todayStatus.isDone ? 'solved' : 'not-solved'}`}>
                  {todayStatus.isDone ? '✓ DONE' : '✗ PENDING'}
                </span>
              </div>

              {todayStatus.isDone && (
                <div className="user-details">
                  Solved at {solveTimeDisplay}
                  {todayStatus.problemTitle && ` · ${todayStatus.problemTitle}`}
                </div>
              )}

              <div className="streaks">
                <div className="streak-item">
                  <span>🔥</span>
                  <span>Current:</span>
                  <span className="streak-value">{user.currentStreak}</span>
                </div>
                <div className="streak-item">
                  <span>⭐</span>
                  <span>Best:</span>
                  <span className="streak-value">{user.longestStreak}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="nav-links">
        <Link href="/history" className="nav-link">History</Link>
        <Link href="/add-user" className="nav-link">Add</Link>
        <Link href="/edit-user" className="nav-link">Edit</Link>
        <Link href="/remove-user" className="nav-link">Remove</Link>
      </div>
    </div>
  );
}
