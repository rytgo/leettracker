'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState('');

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

      router.push(`/room/${joinCode.trim().toLowerCase()}`);
    } catch (err) {
      setError('Room not found. Please check the code.');
      setJoining(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">LEETTRACKER</h1>
        <p className="subtitle">daily accountability for groups</p>
      </div>

      <div className="landing-content">
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
    </div>
  );
}
