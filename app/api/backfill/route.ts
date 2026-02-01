import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchLeetCodeSubmissions } from '@/lib/leetcode';
import { upsertTodayResult } from '@/lib/streaks';
import { User } from '@/lib/types';
import { DateTime } from 'luxon';
import { PACIFIC_TZ } from '@/lib/timezone';

/**
 * Backfill endpoint - populates historical data for the last 30 days
 * GET /api/backfill
 * 
 * This should be run once after initial setup to populate historical data
 */
export async function GET() {
    try {
        // Fetch all users
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');

        if (usersError) {
            return NextResponse.json(
                { error: 'Failed to fetch users', details: usersError.message },
                { status: 500 }
            );
        }

        if (!users || users.length === 0) {
            return NextResponse.json(
                { message: 'No users configured yet.' },
                { status: 200 }
            );
        }

        const allResults: any[] = [];
        const debugInfo: any = {};

        // Process each user
        for (const user of users as User[]) {
            try {
                // Fetch their recent submissions from LeetCode
                const response = await fetchLeetCodeSubmissions(user.leetcode_username);
                const submissions = response.data.recentAcSubmissionList;

                if (!submissions || submissions.length === 0) {
                    allResults.push({
                        username: user.leetcode_username,
                        message: 'No submissions found',
                        daysProcessed: 0,
                    });
                    continue;
                }

                // Group submissions by Pacific timezone date
                const submissionsByDate = new Map<string, typeof submissions[0]>();

                for (const sub of submissions) {
                    const timestamp = parseInt(sub.timestamp, 10);
                    const dt = DateTime.fromSeconds(timestamp, { zone: PACIFIC_TZ });
                    const dateStr = dt.toISODate()!; // YYYY-MM-DD

                    // Keep only the first (most recent) submission for each date
                    if (!submissionsByDate.has(dateStr)) {
                        submissionsByDate.set(dateStr, sub);
                    }
                }

                const dateMap: Record<string, string> = {};
                submissionsByDate.forEach((sub, date) => {
                    dateMap[date] = sub.title;
                });
                debugInfo[user.leetcode_username] = { submissionsByDate: dateMap };

                // Calculate date range: last 30 days
                const today = DateTime.now().setZone(PACIFIC_TZ);
                const thirtyDaysAgo = today.minus({ days: 30 });

                let daysProcessed = 0;
                const processedDates: string[] = [];

                // For each day in the last 30 days, check if there's a submission
                for (let i = 0; i < 30; i++) {
                    const date = today.minus({ days: i });
                    const dateStr = date.toISODate()!;

                    const submission = submissionsByDate.get(dateStr);

                    if (submission) {
                        processedDates.push(`✅ ${dateStr}: ${submission.title}`);
                        // They solved on this date
                        const timestamp = parseInt(submission.timestamp, 10);
                        const solveTime = DateTime.fromSeconds(timestamp, { zone: PACIFIC_TZ });

                        // Manually insert/update the daily_result
                        const { error } = await supabase
                            .from('daily_results')
                            .upsert(
                                {
                                    user_id: user.id,
                                    date: dateStr,
                                    did_solve: true,
                                    solved_at: solveTime.toUTC().toISO(),
                                    problem_title: submission.title,
                                    problem_slug: submission.titleSlug,
                                    submission_id: submission.id,
                                    updated_at: new Date().toISOString(),
                                },
                                {
                                    onConflict: 'user_id,date',
                                }
                            );

                        if (error) {
                            console.error(`Error upserting ${dateStr} for ${user.leetcode_username}:`, error);
                        } else {
                            daysProcessed++;
                        }
                    } else {
                        // They didn't solve on this date - record it as false
                        const { error } = await supabase
                            .from('daily_results')
                            .upsert(
                                {
                                    user_id: user.id,
                                    date: dateStr,
                                    did_solve: false,
                                    solved_at: null,
                                    problem_title: null,
                                    problem_slug: null,
                                    submission_id: null,
                                    updated_at: new Date().toISOString(),
                                },
                                {
                                    onConflict: 'user_id,date',
                                }
                            );

                        if (error) {
                            console.error(`Error upserting ${dateStr} for ${user.leetcode_username}:`, error);
                        }
                    }
                }

                debugInfo[user.leetcode_username].processedDates = processedDates;

                allResults.push({
                    username: user.leetcode_username,
                    success: true,
                    daysProcessed,
                    totalSubmissions: submissionsByDate.size,
                });
            } catch (error) {
                allResults.push({
                    username: user.leetcode_username,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return NextResponse.json({
            timestamp: new Date().toISOString(),
            usersProcessed: users.length,
            results: allResults,
            debug: debugInfo,
        });
    } catch (error) {
        console.error('Error in backfill endpoint:', error);
        return NextResponse.json(
            {
                error: 'Backfill failed',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
