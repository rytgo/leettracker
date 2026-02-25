import { DateTime } from 'luxon';
import { LeetCodeResponse, DailyStatus } from './types';
import { unixToTimezone, isTodayInTimezone, formatTime, DEFAULT_TIMEZONE } from './timezone';

/**
 * LeetCode GraphQL API endpoint
 * This is a public endpoint that doesn't require authentication
 */
const LEETCODE_GRAPHQL_URL = 'https://leetcode.com/graphql';

/**
 * GraphQL query to fetch recent accepted submissions for a user
 * Returns the last 20 accepted submissions
 */
const RECENT_AC_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      id
      title
      titleSlug
      timestamp
    }
  }
`;

/**
 * Fetch recent accepted submissions from LeetCode GraphQL API
 * 
 * @param username - LeetCode username
 * @returns Array of recent accepted submissions
 * @throws Error if the request fails
 */
export async function fetchLeetCodeSubmissions(
    username: string
): Promise<LeetCodeResponse> {
    try {
        const response = await fetch(LEETCODE_GRAPHQL_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
            },
            body: JSON.stringify({
                query: RECENT_AC_QUERY,
                variables: {
                    username,
                    limit: 20, // Fetch last 20 submissions to be safe
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`LeetCode API returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }

        return data;
    } catch (error) {
        console.error(`Error fetching LeetCode data for ${username}:`, error);
        throw error;
    }
}

/**
 * Determine if a user has completed a LeetCode problem "today" in the given timezone
 * and return details about their solve
 * 
 * @param username - LeetCode username to check
 * @param timezone - Timezone to use for "today" calculation
 * @returns DailyStatus object with completion info
 */
export async function checkTodayStatus(username: string, timezone: string = DEFAULT_TIMEZONE): Promise<DailyStatus> {
    try {
        const response = await fetchLeetCodeSubmissions(username);
        const submissions = response.data.recentAcSubmissionList;

        if (!submissions || submissions.length === 0) {
            return {
                isDone: false,
                solveTime: null,
                problemTitle: null,
                problemSlug: null,
                submissionId: null,
            };
        }

        // Filter submissions that happened "today" in the given timezone
        const todaySubmissions = submissions.filter((sub) => {
            const timestamp = parseInt(sub.timestamp, 10);
            return isTodayInTimezone(timestamp, timezone);
        });

        if (todaySubmissions.length === 0) {
            return {
                isDone: false,
                solveTime: null,
                problemTitle: null,
                problemSlug: null,
                submissionId: null,
            };
        }

        // Get the most recent submission from today
        // Submissions are already sorted by timestamp descending
        const latestToday = todaySubmissions[0];
        const timestamp = parseInt(latestToday.timestamp, 10);
        const solveTime = unixToTimezone(timestamp, timezone);

        return {
            isDone: true,
            solveTime: solveTime.toISO(),
            problemTitle: latestToday.title,
            problemSlug: latestToday.titleSlug,
            submissionId: latestToday.id,
        };
    } catch (error) {
        console.error(`Error checking today's status for ${username}:`, error);
        // Re-throw so the caller can skip this user entirely
        // rather than marking them as "not solved" (false negative)
        throw error;
    }
}

/**
 * Get ALL accepted submissions from today (not just the first one)
 * Used for storing complete submission history
 * 
 * @param username - LeetCode username
 * @param timezone - Timezone to use for "today" calculation
 * @returns Array of all today's submissions
 */
export async function getAllTodaySubmissions(username: string, timezone: string = DEFAULT_TIMEZONE): Promise<{
    title: string;
    titleSlug: string;
    timestamp: number;
    id: string;
}[]> {
    try {
        const response = await fetchLeetCodeSubmissions(username);
        const submissions = response.data.recentAcSubmissionList;

        if (!submissions || submissions.length === 0) {
            return [];
        }

        // Filter to only today's submissions in the given timezone
        return submissions
            .filter((sub) => {
                const timestamp = parseInt(sub.timestamp, 10);
                return isTodayInTimezone(timestamp, timezone);
            })
            .map((sub) => ({
                title: sub.title,
                titleSlug: sub.titleSlug,
                timestamp: parseInt(sub.timestamp, 10),
                id: sub.id,
            }));
    } catch (error) {
        console.error(`Error getting all submissions for ${username}:`, error);
        return [];
    }
}

/**
 * Get a human-readable summary of today's status
 * Used for logging and debugging
 */
export function formatDailyStatus(username: string, status: DailyStatus): string {
    if (!status.isDone) {
        return `${username}: ❌ Not solved today`;
    }

    const time = status.solveTime ? formatTime(DateTime.fromISO(status.solveTime)) : 'Unknown';
    return `${username}: ✅ Solved at ${time} - ${status.problemTitle}`;
}

