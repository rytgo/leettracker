import 'server-only';
import { supabaseAdmin } from './supabase-admin';
import { getDateForTimezone, DEFAULT_TIMEZONE } from './timezone';

/**
 * Upsert today's result for a user
 * If a record exists for today, update it; otherwise create it
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
            // Already confirmed solved - do not overwrite
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
                onConflict: 'user_id,date',
            }
        );

    if (error) {
        console.error('Error upserting daily result:', error);
        throw error;
    }
}

/**
 * Save all submissions for a user on a given day
 * Uses upsert to avoid duplicates (based on user_id, date, problem_slug)
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

    const rows = submissions.map((sub) => ({
        user_id: userId,
        date: today,
        problem_title: sub.title,
        problem_slug: sub.titleSlug,
        solved_at: new Date(sub.timestamp * 1000).toISOString(),
        submission_id: sub.id,
    }));

    const { error } = await supabaseAdmin
        .from('submissions')
        .upsert(rows, {
            onConflict: 'user_id,date,problem_slug',
        });

    if (error) {
        console.error('Error saving submissions:', error);
    }
}
