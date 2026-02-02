import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkTodayStatus, getAllTodaySubmissions } from '@/lib/leetcode';
import { upsertTodayResult, saveSubmissions } from '@/lib/streaks';
import { User } from '@/lib/types';
import { DEFAULT_TIMEZONE } from '@/lib/timezone';

interface UserWithRoom extends User {
    room_id: string;
}

interface RoomTimezone {
    id: string;
    timezone: string;
}

/**
 * Background sync endpoint - called by Vercel Cron every 5 minutes
 * 
 * Fetches LeetCode data for all users and updates database
 * GET /api/sync
 * GET /api/sync?roomId=xxx - Sync specific room only
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');

        // Build query - optionally filter by room
        let query = supabase.from('users').select('*');
        if (roomId) {
            query = query.eq('room_id', roomId);
        }

        const { data: users, error: usersError } = await query;

        if (usersError) {
            console.error('Error fetching users:', usersError);
            return NextResponse.json(
                { error: 'Failed to fetch users', details: usersError.message },
                { status: 500 }
            );
        }

        if (!users || users.length === 0) {
            return NextResponse.json(
                { message: 'No users to sync.' },
                { status: 200 }
            );
        }

        // Get unique room IDs and fetch their timezones
        const roomIds = [...new Set(users.map((u: UserWithRoom) => u.room_id).filter(Boolean))];
        const { data: rooms } = await supabase
            .from('rooms')
            .select('id, timezone')
            .in('id', roomIds);

        // Create room timezone lookup map
        const roomTimezones: Record<string, string> = {};
        rooms?.forEach((room: RoomTimezone) => {
            roomTimezones[room.id] = room.timezone || DEFAULT_TIMEZONE;
        });

        // Process each user
        const results = await Promise.all(
            users.map(async (user: UserWithRoom) => {
                try {
                    // Get timezone for this user's room
                    const timezone = user.room_id ? (roomTimezones[user.room_id] || DEFAULT_TIMEZONE) : DEFAULT_TIMEZONE;

                    // Check today's LeetCode status (for daily_results)
                    const status = await checkTodayStatus(user.leetcode_username, timezone);

                    // Update daily_results table (keeps the first/most-recent solve)
                    await upsertTodayResult(
                        user.id,
                        status.isDone,
                        status.solveTime,
                        status.problemTitle,
                        status.problemSlug,
                        status.submissionId,
                        timezone
                    );

                    // Get ALL submissions for today and save to submissions table
                    const allSubmissions = await getAllTodaySubmissions(user.leetcode_username, timezone);
                    if (allSubmissions.length > 0) {
                        await saveSubmissions(user.id, allSubmissions, timezone);
                    }

                    return {
                        username: user.leetcode_username,
                        success: true,
                        isDone: status.isDone,
                        problemTitle: status.problemTitle,
                        totalSubmissions: allSubmissions.length,
                        timezone,
                    };
                } catch (error) {
                    console.error(`Error processing user ${user.leetcode_username}:`, error);
                    return {
                        username: user.leetcode_username,
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    };
                }
            })
        );

        // Return summary
        return NextResponse.json({
            timestamp: new Date().toISOString(),
            usersProcessed: users.length,
            results,
        });
    } catch (error) {
        console.error('Error in sync endpoint:', error);
        return NextResponse.json(
            {
                error: 'Sync failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
