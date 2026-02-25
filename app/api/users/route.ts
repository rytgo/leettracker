import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { fetchLeetCodeSubmissions } from '@/lib/leetcode';
import { DateTime } from 'luxon';
import { DEFAULT_TIMEZONE } from '@/lib/timezone';

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

        // 2. Look up the room timezone (if a room is specified)
        let timezone = DEFAULT_TIMEZONE;
        if (body.roomId) {
            const { data: roomData } = await supabaseAdmin
                .from('rooms')
                .select('timezone')
                .eq('id', body.roomId)
                .maybeSingle();
            if (roomData?.timezone) {
                timezone = roomData.timezone;
            }
        }

        // 3. Insert user into Supabase
        const { data: newUser, error: insertError } = await supabaseAdmin
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

        // 4. Trigger immediate backfill for this user
        try {
            if (submissions && submissions.length > 0) {
                // Group submissions by date in the room's timezone
                const submissionsByDate = new Map<string, typeof submissions[0]>();
                // Collect ALL submissions per date for the submissions table
                const allSubmissionsByDate = new Map<string, typeof submissions>();

                for (const sub of submissions) {
                    const timestamp = parseInt(sub.timestamp, 10);
                    const dt = DateTime.fromSeconds(timestamp, { zone: timezone });
                    const dateStr = dt.toISODate()!;

                    // Keep only the first (most recent) submission for each date (for daily_results)
                    if (!submissionsByDate.has(dateStr)) {
                        submissionsByDate.set(dateStr, sub);
                    }

                    // Collect all submissions for each date (for submissions table)
                    if (!allSubmissionsByDate.has(dateStr)) {
                        allSubmissionsByDate.set(dateStr, []);
                    }
                    allSubmissionsByDate.get(dateStr)!.push(sub);
                }

                // Calculate date range: last 30 days
                const today = DateTime.now().setZone(timezone);

                // For each day in the last 30 days, check if there's a submission
                for (let i = 0; i < 30; i++) {
                    const date = today.minus({ days: i });
                    const dateStr = date.toISODate()!;

                    const submission = submissionsByDate.get(dateStr);

                    if (submission) {
                        const timestamp = parseInt(submission.timestamp, 10);
                        const solveTime = DateTime.fromSeconds(timestamp, { zone: timezone });

                        // Insert/update the daily_result
                        await supabaseAdmin
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

                        // Also populate the submissions table (for problem names in history)
                        const daySubs = allSubmissionsByDate.get(dateStr) || [];
                        for (const s of daySubs) {
                            const ts = parseInt(s.timestamp, 10);
                            await supabaseAdmin
                                .from('submissions')
                                .upsert(
                                    {
                                        user_id: newUser.id,
                                        date: dateStr,
                                        problem_title: s.title,
                                        problem_slug: s.titleSlug,
                                        solved_at: DateTime.fromSeconds(ts, { zone: timezone }).toUTC().toISO(),
                                        submission_id: s.id,
                                    },
                                    { onConflict: 'user_id,date,problem_slug' }
                                );
                        }
                    } else {
                        // GUARD: only write did_solve=false if no existing confirmed solve
                        const { data: existing } = await supabaseAdmin
                            .from('daily_results')
                            .select('did_solve')
                            .eq('user_id', newUser.id)
                            .eq('date', dateStr)
                            .maybeSingle();

                        if (!existing || existing.did_solve !== true) {
                            await supabaseAdmin
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
        const { error } = await supabaseAdmin
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

        const { error } = await supabaseAdmin
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
