import { NextResponse } from 'next/server';
import { DateTime } from 'luxon';
import { PACIFIC_TZ } from '@/lib/timezone';

export async function GET() {
    // Test the timestamp from "Product of Array Except Self"
    const timestamp = 1769840487;

    const utc = DateTime.fromSeconds(timestamp, { zone: 'UTC' });
    const pt = DateTime.fromSeconds(timestamp, { zone: PACIFIC_TZ });

    return NextResponse.json({
        timestamp,
        utc: {
            iso: utc.toISO(),
            date: utc.toISODate(),
            time: utc.toLocaleString(DateTime.DATETIME_FULL),
        },
        pacific: {
            iso: pt.toISO(),
            date: pt.toISODate(),
            time: pt.toLocaleString(DateTime.DATETIME_FULL),
        },
        note: "This timestamp should be Jan 30 at 10:21 PM PT"
    });
}
