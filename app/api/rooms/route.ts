import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Generate a random 6-character alphanumeric code
function generateRoomCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// POST /api/rooms - Create a new room
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { pin } = body; // Optional PIN

        // Generate unique code
        let code = generateRoomCode();
        let attempts = 0;

        while (attempts < 10) {
            const { data: existing } = await supabase
                .from('rooms')
                .select('code')
                .eq('code', code)
                .single();

            if (!existing) break;
            code = generateRoomCode();
            attempts++;
        }

        // Create room
        const { data: room, error } = await supabase
            .from('rooms')
            .insert([{
                code,
                pin: pin?.trim() || null
            }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true, room });

    } catch (error) {
        console.error('Error creating room:', error);
        return NextResponse.json(
            { error: 'Failed to create room' },
            { status: 500 }
        );
    }
}

// GET /api/rooms?code=abc123 - Get room info
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        if (!code) {
            return NextResponse.json(
                { error: 'Room code is required' },
                { status: 400 }
            );
        }

        const { data: room, error } = await supabase
            .from('rooms')
            .select('id, code, created_at, pin')
            .eq('code', code)
            .single();

        if (error || !room) {
            return NextResponse.json(
                { error: 'Room not found' },
                { status: 404 }
            );
        }

        // Don't expose actual PIN, just whether it exists
        return NextResponse.json({
            success: true,
            room: {
                id: room.id,
                code: room.code,
                created_at: room.created_at,
                hasPin: !!room.pin
            }
        });

    } catch (error) {
        console.error('Error fetching room:', error);
        return NextResponse.json(
            { error: 'Failed to fetch room' },
            { status: 500 }
        );
    }
}

// POST /api/rooms/verify - Verify PIN for a room
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { code, pin } = body;

        if (!code) {
            return NextResponse.json(
                { error: 'Room code is required' },
                { status: 400 }
            );
        }

        const { data: room, error } = await supabase
            .from('rooms')
            .select('id, pin')
            .eq('code', code)
            .single();

        if (error || !room) {
            return NextResponse.json(
                { error: 'Room not found' },
                { status: 404 }
            );
        }

        // If room has no PIN, always valid
        if (!room.pin) {
            return NextResponse.json({ success: true, valid: true });
        }

        // Check PIN
        const valid = room.pin === pin;
        return NextResponse.json({ success: true, valid });

    } catch (error) {
        console.error('Error verifying PIN:', error);
        return NextResponse.json(
            { error: 'Failed to verify PIN' },
            { status: 500 }
        );
    }
}
