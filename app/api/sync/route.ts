import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkTodayStatus } from '@/lib/leetcode';
import { upsertTodayResult } from '@/lib/streaks';
import { User } from '@/lib/types';

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

        // Process each user
        const results = await Promise.all(
            users.map(async (user: User) => {
                try {
                    // Check today's LeetCode status
                    const status = await checkTodayStatus(user.leetcode_username);

                    // Update database
                    await upsertTodayResult(
                        user.id,
                        status.isDone,
                        status.solveTime,
                        status.problemTitle,
                        status.problemSlug,
                        status.submissionId
                    );

                    return {
                        username: user.leetcode_username,
                        success: true,
                        isDone: status.isDone,
                        problemTitle: status.problemTitle,
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
