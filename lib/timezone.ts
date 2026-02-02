import { DateTime } from 'luxon';

/**
 * Default timezone constant for Pacific Time (America/Los_Angeles)
 * Used as fallback when room doesn't have a timezone set
 */
export const PACIFIC_TZ = 'America/Los_Angeles';
export const DEFAULT_TIMEZONE = PACIFIC_TZ;

/**
 * Common timezones for room creation dropdown
 */
export const COMMON_TIMEZONES = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Central Europe (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan (JST)' },
    { value: 'Asia/Shanghai', label: 'China (CST)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
];

/**
 * Get short timezone label for display (e.g., "PT", "ET")
 */
export function getTimezoneLabel(tz: string): string {
    const labels: Record<string, string> = {
        'America/Los_Angeles': 'PT',
        'America/Denver': 'MT',
        'America/Chicago': 'CT',
        'America/New_York': 'ET',
        'UTC': 'UTC',
        'Europe/London': 'GMT',
        'Europe/Paris': 'CET',
        'Asia/Tokyo': 'JST',
        'Asia/Shanghai': 'CST',
        'Australia/Sydney': 'AEST',
    };
    return labels[tz] || tz;
}

/**
 * Get the current date in a specific timezone (YYYY-MM-DD format)
 * This is the source of truth for "what day is it today" for a room
 */
export function getDateForTimezone(tz: string = DEFAULT_TIMEZONE): string {
    return DateTime.now().setZone(tz).toISODate()!;
}

/**
 * Get the current date in Pacific timezone (YYYY-MM-DD format)
 * @deprecated Use getDateForTimezone(tz) instead
 */
export function getPacificDate(): string {
    return getDateForTimezone(PACIFIC_TZ);
}

/**
 * Get the current time in a specific timezone
 */
export function getNowForTimezone(tz: string = DEFAULT_TIMEZONE): DateTime {
    return DateTime.now().setZone(tz);
}

/**
 * Get the current time in Pacific timezone
 * @deprecated Use getNowForTimezone(tz) instead
 */
export function getPacificNow(): DateTime {
    return getNowForTimezone(PACIFIC_TZ);
}

/**
 * Convert a Unix timestamp (seconds) to a DateTime in a specific timezone
 */
export function unixToTimezone(timestamp: number, tz: string = DEFAULT_TIMEZONE): DateTime {
    return DateTime.fromSeconds(timestamp, { zone: tz });
}

/**
 * Convert a Unix timestamp (seconds) to a DateTime in Pacific timezone
 * @deprecated Use unixToTimezone(timestamp, tz) instead
 */
export function unixToPacific(timestamp: number): DateTime {
    return unixToTimezone(timestamp, PACIFIC_TZ);
}

/**
 * Get seconds remaining until midnight in a specific timezone
 * Used for countdown timer
 */
export function getSecondsUntilMidnight(tz: string = DEFAULT_TIMEZONE): number {
    const now = getNowForTimezone(tz);
    const midnight = now.plus({ days: 1 }).startOf('day');
    return Math.floor(midnight.diff(now, 'seconds').seconds);
}

/**
 * Check if a Unix timestamp falls within "today" in a specific timezone
 */
export function isTodayInTimezone(timestamp: number, tz: string = DEFAULT_TIMEZONE): boolean {
    const dt = unixToTimezone(timestamp, tz);
    const today = getDateForTimezone(tz);
    return dt.toISODate() === today;
}

/**
 * Check if a Unix timestamp falls within "today" in Pacific timezone
 * @deprecated Use isTodayInTimezone(timestamp, tz) instead
 */
export function isToday(timestamp: number): boolean {
    return isTodayInTimezone(timestamp, PACIFIC_TZ);
}

/**
 * Format a DateTime for display (e.g., "2:34 PM")
 */
export function formatTime(dt: DateTime): string {
    return dt.toLocaleString(DateTime.TIME_SIMPLE);
}
