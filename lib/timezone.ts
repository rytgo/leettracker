import { DateTime } from 'luxon';

/**
 * Timezone constant for Pacific Time (America/Los_Angeles)
 * All day boundaries and timestamps are calculated using this timezone
 */
export const PACIFIC_TZ = 'America/Los_Angeles';

/**
 * Get the current date in Pacific timezone (YYYY-MM-DD format)
 * This is the source of truth for "what day is it today"
 */
export function getPacificDate(): string {
    return DateTime.now().setZone(PACIFIC_TZ).toISODate()!;
}

/**
 * Get the current time in Pacific timezone
 */
export function getPacificNow(): DateTime {
    return DateTime.now().setZone(PACIFIC_TZ);
}

/**
 * Convert a Unix timestamp (seconds) to a DateTime in Pacific timezone
 */
export function unixToPacific(timestamp: number): DateTime {
    return DateTime.fromSeconds(timestamp, { zone: PACIFIC_TZ });
}

/**
 * Get the start and end of "today" in Pacific timezone as UTC ISO strings
 * Used for querying LeetCode API (which returns UTC timestamps)
 * 
 * Returns: { start: "2026-01-31T08:00:00.000Z", end: "2026-02-01T07:59:59.999Z" }
 * (for Jan 31, 2026 in Pacific time)
 */
export function getTodayBoundaries(): { start: string; end: string } {
    const now = getPacificNow();
    const startOfDay = now.startOf('day'); // 00:00:00 PT
    const endOfDay = now.endOf('day'); // 23:59:59.999 PT

    return {
        start: startOfDay.toUTC().toISO()!,
        end: endOfDay.toUTC().toISO()!,
    };
}

/**
 * Get seconds remaining until midnight Pacific time
 * Used for countdown timer
 */
export function getSecondsUntilMidnight(): number {
    const now = getPacificNow();
    const midnight = now.plus({ days: 1 }).startOf('day');
    return Math.floor(midnight.diff(now, 'seconds').seconds);
}

/**
 * Check if a Unix timestamp falls within "today" in Pacific timezone
 */
export function isToday(timestamp: number): boolean {
    const dt = unixToPacific(timestamp);
    const today = getPacificDate();
    return dt.toISODate() === today;
}

/**
 * Format a DateTime for display (e.g., "2:34 PM")
 */
export function formatTime(dt: DateTime): string {
    return dt.toLocaleString(DateTime.TIME_SIMPLE);
}
