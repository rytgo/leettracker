'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RecentRoom {
  code: string;
  visitedAt: number;
}

const STORAGE_KEY = 'leettracker_recent_rooms';
const MAX_RECENT_ROOMS = 5;

// Helper to get recent rooms from localStorage
function getRecentRooms(): RecentRoom[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Helper to save a room to recent rooms
export function saveRecentRoom(code: string) {
  if (typeof window === 'undefined') return;
  try {
    const rooms = getRecentRooms().filter(r => r.code !== code);
    rooms.unshift({ code, visitedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms.slice(0, MAX_RECENT_ROOMS)));
  } catch {
    // Ignore localStorage errors
  }
}

export default function LandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState('');
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setRecentRooms(getRecentRooms());
  }, []);

  const handleCreateRoom = async () => {
    setCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: showPinInput ? pin : null }),
      });

      if (!res.ok) {
        throw new Error('Failed to create room');
      }

      const data = await res.json();
      saveRecentRoom(data.room.code);
      router.push(`/room/${data.room.code}`);
    } catch (err) {
      setError('Failed to create room. Please try again.');
      setCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setJoining(true);
    setError(null);

    try {
      const res = await fetch(`/api/rooms?code=${joinCode.trim().toLowerCase()}`);

      if (!res.ok) {
        throw new Error('Room not found');
      }

      saveRecentRoom(joinCode.trim().toLowerCase());
      router.push(`/room/${joinCode.trim().toLowerCase()}`);
    } catch (err) {
      setError('Room not found. Please check the code.');
      setJoining(false);
    }
  };

  const removeRecentRoom = (code: string) => {
    const updated = recentRooms.filter(r => r.code !== code);
    setRecentRooms(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <div className="container">
      <div className="header">
        <div className="title-row">
          <h1 className="title">LEETTRACKER</h1>
          <button className="about-link" onClick={() => setShowInfo(true)}>about</button>
        </div>
        <p className="subtitle">track daily leetcode with friends</p>
      </div>

      <div className="landing-content">
        {/* Recent Rooms Section */}
        {recentRooms.length > 0 && (
          <div className="landing-section recent-rooms">
            <h2>Recent Rooms</h2>
            <div className="recent-rooms-list">
              {recentRooms.map((room) => (
                <div key={room.code} className="recent-room-item">
                  <Link href={`/room/${room.code}`} className="recent-room-link">
                    {room.code}
                  </Link>
                  <button
                    onClick={() => removeRecentRoom(room.code)}
                    className="recent-room-remove"
                    title="Remove from recent"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="landing-section">
          <h2>Create a Room</h2>
          <p className="landing-desc">Start a new tracking group for you and your friends</p>

          <div className="pin-toggle">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showPinInput}
                onChange={(e) => setShowPinInput(e.target.checked)}
              />
              <span>Protect with PIN (optional)</span>
            </label>
          </div>

          {showPinInput && (
            <input
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="form-input"
              style={{ marginBottom: '1rem' }}
            />
          )}

          <button
            onClick={handleCreateRoom}
            disabled={creating}
            className="btn-primary"
          >
            {creating ? 'Creating...' : 'Create Room'}
          </button>
        </div>

        <div className="landing-divider">
          <span>or</span>
        </div>

        <div className="landing-section">
          <h2>Join a Room</h2>
          <p className="landing-desc">Enter a room code to join an existing group</p>

          <input
            type="text"
            placeholder="Enter room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="form-input"
            maxLength={6}
            style={{ marginBottom: '1rem' }}
          />

          <button
            onClick={handleJoinRoom}
            disabled={joining || !joinCode.trim()}
            className="btn-secondary"
          >
            {joining ? 'Joining...' : 'Join Room'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>

      {showInfo && (
        <div className="info-overlay" onClick={() => setShowInfo(false)}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <button className="info-close" onClick={() => setShowInfo(false)}>×</button>
            <h3>What is this?</h3>
            <p>A simple tracker for daily LeetCode accountability.</p>
            <ul>
              <li>Create a room, share the code with friends</li>
              <li>Add everyone's LeetCode username</li>
              <li>See who's solved today at a glance</li>
            </ul>
            <p className="info-note">Auto-syncs every 15 min. No login required. Resets at midnight PT.</p>
          </div>
        </div>
      )}
    </div>
  );
}
