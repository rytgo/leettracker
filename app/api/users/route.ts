import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { fetchLeetCodeSubmissions } from '@/lib/leetcode';
import { DateTime } from 'luxon';
import { PACIFIC_TZ } from '@/lib/timezone';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, displayName } = body;

        if (!username || !displayName) {
            return NextResponse.json(
                { error: 'Username and display name are required' },
                { status: 400 }
            );
        }

        // 1. Validate the user exists on LeetCode
        let submissions;
        try {
            const response = await fetchLeetCodeSubmissions(username);
            submissions = response.data.recentAcSubmissionList;
        } catch (error) {
            return NextResponse.json(
                { error: 'Could not find LeetCode user. Please check the username.' },
                { status: 404 }
            );
        }


        // 2. Insert user into Supabase
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([{
                leetcode_username: username,
                display_name: displayName,
                room_id: body.roomId || null
            }])
            .select()
            .single();

        if (insertError) {
            if (insertError.code === '23505') { // Unique violation
                return NextResponse.json(
                    { error: 'User is already being tracked!' },
                    { status: 409 }
                );
            }
            throw insertError;
        }

        // 3. Trigger immediate backfill for this user
        // (Copying backfill logic to ensure they start with data)
        const allResults = [];
        try {
            if (submissions && submissions.length > 0) {
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

                // Calculate date range: last 30 days
                const today = DateTime.now().setZone(PACIFIC_TZ);

                // For each day in the last 30 days, check if there's a submission
                for (let i = 0; i < 30; i++) {
                    const date = today.minus({ days: i });
                    const dateStr = date.toISODate()!;

                    const submission = submissionsByDate.get(dateStr);

                    if (submission) {
                        const timestamp = parseInt(submission.timestamp, 10);
                        const solveTime = DateTime.fromSeconds(timestamp, { zone: PACIFIC_TZ });

                        // Manually insert/update the daily_result
                        await supabase
                            .from('daily_results')
                            .upsert(
                                {
                                    user_id: newUser.id,
                                    date: dateStr,
                                    did_solve: true,
                                    solved_at: solveTime.toUTC().toISO(),
                                    problem_title: submission.title,
                                    problem_slug: submission.titleSlug,
                                    submission_id: submission.id,
                                    updated_at: new Date().toISOString(),
                                },
                                { onConflict: 'user_id,date' }
                            );
                    } else {
                        // Not solved
                        await supabase
                            .from('daily_results')
                            .upsert(
                                {
                                    user_id: newUser.id,
                                    date: dateStr,
                                    did_solve: false,
                                    solved_at: null,
                                    problem_title: null,
                                    problem_slug: null,
                                    submission_id: null,
                                    updated_at: new Date().toISOString(),
                                },
                                { onConflict: 'user_id,date' }
                            );
                    }
                }
            }
        } catch (backfillError) {
            console.error('Initial backfill failed:', backfillError);
            // Don't fail the request, just log it. The cron will pick it up later.
        }

        return NextResponse.json({ success: true, user: newUser });

    } catch (error) {
        console.error('Error adding user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const username = searchParams.get('username');

        if (!username) {
            return NextResponse.json(
                { error: 'Username is required' },
                { status: 400 }
            );
        }

        // Delete user (cascade will handle daily_results)
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('leetcode_username', username);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error removing user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, displayName } = body;

        if (!username || !displayName) {
            return NextResponse.json(
                { error: 'Username and display name are required' },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from('users')
            .update({ display_name: displayName })
            .eq('leetcode_username', username);

        if (error) {
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
