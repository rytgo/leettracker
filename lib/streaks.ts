import { supabase } from './supabase';
import { DailyResult } from './types';
import { getPacificDate } from './timezone';

/**
 * Calculate current streak for a user
 * 
 * NEW LOGIC:
 * - If they solved TODAY: count consecutive days backwards from today
 * - If they HAVEN'T solved today yet: count from YESTERDAY (streak is "at risk" but not broken)
 * - Only break the streak after midnight passes without a solve
 * 
 * @param userId - User UUID
 * @returns Object with streak count and whether today is pending
 */
export async function calculateCurrentStreak(userId: string): Promise<number> {
    const today = getPacificDate();

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
 */
export async function getStreaks(userId: string): Promise<{
    current: number;
    longest: number;
}> {
    const [current, longest] = await Promise.all([
        calculateCurrentStreak(userId),
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
 */
export async function upsertTodayResult(
    userId: string,
    didSolve: boolean,
    solvedAt: string | null,
    problemTitle: string | null,
    problemSlug: string | null,
    submissionId: string | null
): Promise<void> {
    const today = getPacificDate();

    const { error } = await supabase
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
 */
export async function getTodayResult(userId: string): Promise<DailyResult | null> {
    const today = getPacificDate();

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
