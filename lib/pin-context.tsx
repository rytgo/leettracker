'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PinContextType {
    verifiedRooms: Record<string, boolean>;
    verifyPin: (roomCode: string, pin: string) => Promise<boolean>;
    isVerified: (roomCode: string) => boolean;
    clearVerification: (roomCode: string) => void;
}

const PinContext = createContext<PinContextType | null>(null);

const STORAGE_KEY = 'leettracker_verified_pins';

export function PinProvider({ children }: { children: ReactNode }) {
    const [verifiedRooms, setVerifiedRooms] = useState<Record<string, boolean>>({});

    // Load from sessionStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const stored = sessionStorage.getItem(STORAGE_KEY);
                if (stored) {
                    setVerifiedRooms(JSON.parse(stored));
                }
            } catch {
                // Ignore errors
            }
        }
    }, []);

    // Save to sessionStorage when verifiedRooms changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(verifiedRooms));
        }
    }, [verifiedRooms]);

    const verifyPin = async (roomCode: string, pin: string): Promise<boolean> => {
        try {
            const res = await fetch('/api/rooms', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: roomCode, pin }),
            });

            if (!res.ok) return false;

            const data = await res.json();
            if (data.valid) {
                setVerifiedRooms(prev => ({ ...prev, [roomCode]: true }));
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };

    const isVerified = (roomCode: string): boolean => {
        return verifiedRooms[roomCode] === true;
    };

    const clearVerification = (roomCode: string) => {
        setVerifiedRooms(prev => {
            const next = { ...prev };
            delete next[roomCode];
            return next;
        });
    };

    return (
        <PinContext.Provider value={{ verifiedRooms, verifyPin, isVerified, clearVerification }}>
            {children}
        </PinContext.Provider>
    );
}

export function usePinContext() {
    const context = useContext(PinContext);
    if (!context) {
        throw new Error('usePinContext must be used within a PinProvider');
    }
    return context;
}
