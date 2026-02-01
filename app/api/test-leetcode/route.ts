import { NextRequest, NextResponse } from 'next/server';
import { checkTodayStatus, formatDailyStatus } from '@/lib/leetcode';
import { getPacificDate, getPacificNow } from '@/lib/timezone';

/**
 * Test endpoint for LeetCode verification logic
 * GET /api/test-leetcode?username=XXX
 * 
 * Returns:
 * - isDone: whether user solved today
 * - solveTime: when they solved (Pacific time)
 * - problemTitle: what problem they solved
 * - debug info: current Pacific time, date, etc.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
        return NextResponse.json(
            { error: 'Missing required parameter: username' },
            { status: 400 }
        );
    }

    try {
        // Get today's status
        const status = await checkTodayStatus(username);

        // Format for logging
        const summary = formatDailyStatus(username, status);
        console.log(summary);

        // Return detailed response
        return NextResponse.json({
            username,
            status,
            summary,
            debug: {
                currentTimePT: getPacificNow().toISO(),
                currentDatePT: getPacificDate(),
                timezone: 'America/Los_Angeles',
            },
        });
    } catch (error) {
        console.error('Error in test-leetcode endpoint:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch LeetCode data',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
