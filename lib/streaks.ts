import { supabase, supabaseAdmin } from './supabase';
import { DailyResult } from './types';
import { getDateForTimezone, DEFAULT_TIMEZONE } from './timezone';

/**
 * Calculate current streak for a user
 * 
 * NEW LOGIC:
 * - If they solved TODAY: count consecutive days backwards from today
 * - If they HAVEN'T solved today yet: count from YESTERDAY (streak is "at risk" but not broken)
 * - Only break the streak after midnight passes without a solve
 * 
 * @param userId - User UUID
 * @param timezone - Timezone to use for date calculations
 * @returns Object with streak count and whether today is pending
 */
export async function calculateCurrentStreak(userId: string, timezone: string = DEFAULT_TIMEZONE): Promise<number> {
    const today = getDateForTimezone(timezone);

    // Fetch all results for this user, ordered by date descending
    const { data: results, error } = await supabase
        .from('daily_results')
        .select('*')
        .eq('user_id', userId)
        .lte('date', today)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching daily results:', error);
        return 0;
    }

    if (!results || results.length === 0) {
        return 0;
    }

    // Check if today has been solved
    const todayResult = results.find(r => r.date === today);
    const solvedToday = todayResult?.did_solve === true;

    // Determine where to start counting from
    let currentDate: string;
    let streak = 0;

    if (solvedToday) {
        // Start from today
        currentDate = today;
    } else {
        // Start from yesterday - streak is "at risk" but not broken yet
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        currentDate = yesterday.toISOString().split('T')[0];
    }

    // Walk backwards counting consecutive solved days
    for (const result of results) {
        // Skip today's result if we're starting from yesterday
        if (!solvedToday && result.date === today) {
            continue;
        }

        if (result.date !== currentDate) {
            // Gap in dates - streak ends here
            break;
        }

        if (result.did_solve) {
            streak++;
            // Move to previous day
            const date = new Date(result.date);
            date.setDate(date.getDate() - 1);
            currentDate = date.toISOString().split('T')[0];
        } else {
            // Found a day they didn't solve - streak is broken
            break;
        }
    }

    return streak;
}

/**
 * Calculate longest streak for a user
 * Finds the maximum consecutive days with did_solve=true in history
 * 
 * @param userId - User UUID
 * @returns Maximum consecutive days ever
 */
export async function calculateLongestStreak(userId: string): Promise<number> {
    // Fetch all results for this user, ordered by date ascending
    const { data: results, error } = await supabase
        .from('daily_results')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

    if (error) {
        console.error('Error fetching daily results:', error);
        return 0;
    }

    if (!results || results.length === 0) {
        return 0;
    }

    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate: string | null = null;

    for (const result of results) {
        if (result.did_solve) {
            if (lastDate === null) {
                // First solved day
                currentStreak = 1;
            } else {
                // Check if consecutive
                const prevDate = new Date(lastDate);
                prevDate.setDate(prevDate.getDate() + 1);
                const expectedNext = prevDate.toISOString().split('T')[0];

                if (result.date === expectedNext) {
                    // Consecutive day
                    currentStreak++;
                } else {
                    // Gap - start new streak
                    currentStreak = 1;
                }
            }

            maxStreak = Math.max(maxStreak, currentStreak);
            lastDate = result.date;
        } else {
            // Didn't solve - break streak
            currentStreak = 0;
            lastDate = result.date;
        }
    }

    return maxStreak;
}

/**
 * Get both current and longest streak for a user
 * More efficient than calling both functions separately
 * @param userId - User UUID
 * @param timezone - Timezone to use for date calculations
 */
export async function getStreaks(userId: string, timezone: string = DEFAULT_TIMEZONE): Promise<{
    current: number;
    longest: number;
}> {
    const [current, longest] = await Promise.all([
        calculateCurrentStreak(userId, timezone),
        calculateLongestStreak(userId),
    ]);

    return { current, longest };
}

/**
 * Upsert today's result for a user
 * If a record exists for today, update it; otherwise create it
 * 
 * @param userId - User UUID
 * @param didSolve - Whether they solved today
 * @param solvedAt - When they solved (ISO string, nullable)
 * @param problemTitle - Problem title (nullable)
 * @param problemSlug - Problem slug (nullable)
 * @param submissionId - Submission ID (nullable)
 * @param timezone - Timezone to use for date calculation
 */
export async function upsertTodayResult(
    userId: string,
    didSolve: boolean,
    solvedAt: string | null,
    problemTitle: string | null,
    problemSlug: string | null,
    submissionId: string | null,
    timezone: string = DEFAULT_TIMEZONE
): Promise<void> {
    const today = getDateForTimezone(timezone);

    // GUARD: Never overwrite a confirmed solve with "not solved"
    // This prevents transient LeetCode API failures from corrupting data
    if (!didSolve) {
        const { data: existing } = await supabaseAdmin
            .from('daily_results')
            .select('did_solve')
            .eq('user_id', userId)
            .eq('date', today)
            .maybeSingle();

        if (existing?.did_solve === true) {
            // Already confirmed solved — do not overwrite
            return;
        }
    }

    const { error } = await supabaseAdmin
        .from('daily_results')
        .upsert(
            {
                user_id: userId,
                date: today,
                did_solve: didSolve,
                solved_at: solvedAt,
                problem_title: problemTitle,
                problem_slug: problemSlug,
                submission_id: submissionId,
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: 'user_id,date', // Update if exists for this user+date
            }
        );

    if (error) {
        console.error('Error upserting daily result:', error);
        throw error;
    }
}

/**
 * Get today's result for a user (if it exists)
 * @param userId - User UUID
 * @param timezone - Timezone to use for date calculation
 */
export async function getTodayResult(userId: string, timezone: string = DEFAULT_TIMEZONE): Promise<DailyResult | null> {
    const today = getDateForTimezone(timezone);

    const { data, error } = await supabase
        .from('daily_results')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();

    if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found (expected if no result yet)
        console.error('Error fetching today result:', error);
        return null;
    }

    return data;
}

/**
 * Save all submissions for a user on a given day
 * Uses upsert to avoid duplicates (based on user_id, date, problem_slug)
 * 
 * @param userId - User UUID
 * @param submissions - Array of submissions to save
 * @param timezone - Timezone to use for date calculation
 */
export async function saveSubmissions(
    userId: string,
    submissions: {
        title: string;
        titleSlug: string;
        timestamp: number;
        id: string;
    }[],
    timezone: string = DEFAULT_TIMEZONE
): Promise<void> {
    if (submissions.length === 0) return;

    const today = getDateForTimezone(timezone);

    // Transform to database format
    const rows = submissions.map((sub) => ({
        user_id: userId,
        date: today,
        problem_title: sub.title,
        problem_slug: sub.titleSlug,
        solved_at: new Date(sub.timestamp * 1000).toISOString(),
        submission_id: sub.id,
    }));

    // Upsert each submission (unique constraint handles duplicates)
    const { error } = await supabaseAdmin
        .from('submissions')
        .upsert(rows, {
            onConflict: 'user_id,date,problem_slug',
        });

    if (error) {
        console.error('Error saving submissions:', error);
        // Don't throw - this is a non-critical operation
    }
}

