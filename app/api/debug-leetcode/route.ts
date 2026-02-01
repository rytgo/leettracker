import { NextRequest, NextResponse } from 'next/server';
import { getPacificDate, getPacificNow } from '@/lib/timezone';

/**
 * Debug endpoint to test raw LeetCode GraphQL API
 * GET /api/debug-leetcode?username=XXX
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const username = searchParams.get('username');

    if (!username) {
        return NextResponse.json(
            { error: 'Missing required parameter: username' },
            { status: 400 }
        );
    }

    try {
        // Test the GraphQL query directly
        const response = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
            },
            body: JSON.stringify({
                query: `
          query recentAcSubmissions($username: String!, $limit: Int!) {
            recentAcSubmissionList(username: $username, limit: $limit) {
              id
              title
              titleSlug
              timestamp
            }
          }
        `,
                variables: {
                    username,
                    limit: 20,
                },
            }),
        });

        const data = await response.json();

        return NextResponse.json({
            username,
            rawResponse: data,
            currentTimePT: getPacificNow().toISO(),
            currentDatePT: getPacificDate(),
        });
    } catch (error) {
        console.error('Error in debug-leetcode endpoint:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch LeetCode data',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
