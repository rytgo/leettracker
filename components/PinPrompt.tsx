'use client';

import { useState } from 'react';

interface PinPromptProps {
    roomCode: string;
    onVerify: (pin: string) => Promise<boolean>;
    onCancel: () => void;
}

export default function PinPrompt({ roomCode, onVerify, onCancel }: PinPromptProps) {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const [verifying, setVerifying] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!pin.trim()) return;

        setVerifying(true);
        setError(false);

        const valid = await onVerify(pin);

        if (!valid) {
            setError(true);
            setVerifying(false);
        }
    };

    return (
        <div className="pin-overlay">
            <div className="pin-modal">
                <h2>🔒 Room Protected</h2>
                <p>This room requires a PIN to make changes.</p>

                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="Enter PIN"
                        className="form-input"
                        autoFocus
                    />

                    {error && (
                        <div className="pin-error">Incorrect PIN. Please try again.</div>
                    )}

                    <div className="pin-actions">
                        <button
                            type="submit"
                            disabled={verifying || !pin.trim()}
                            className="btn-primary"
                        >
                            {verifying ? 'Verifying...' : 'Unlock'}
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
