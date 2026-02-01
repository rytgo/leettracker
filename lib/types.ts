/**
 * Shared TypeScript types for LeetTracker
 */

export interface LeetCodeSubmission {
    timestamp: string; // Unix timestamp as string
    statusDisplay: string; // "Accepted", "Wrong Answer", etc.
    lang: string;
    title: string;
    titleSlug: string;
    id: string;
}

export interface LeetCodeResponse {
    data: {
        recentAcSubmissionList: LeetCodeSubmission[];
    };
}

export interface DailyStatus {
    isDone: boolean;
    solveTime: string | null; // ISO string in Pacific time
    problemTitle: string | null;
    problemSlug: string | null;
    submissionId: string | null;
}

export interface User {
    id: string;
    leetcode_username: string;
    display_name: string;
    created_at: string;
}

export interface DailyResult {
    id: string;
    user_id: string;
    date: string; // YYYY-MM-DD in Pacific time
    did_solve: boolean;
    solved_at: string | null; // ISO timestamp (UTC)
    problem_title: string | null;
    problem_slug: string | null;
    submission_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface UserWithStreaks extends User {
    currentStreak: number;
    longestStreak: number;
    todayStatus: DailyStatus;
}
