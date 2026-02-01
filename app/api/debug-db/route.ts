import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Debug endpoint to check database contents
 */
export async function GET() {
    const { data, error } = await supabase
        .from('daily_results')
        .select('*, users(display_name, leetcode_username)')
        .order('date', { ascending: false })
        .limit(10);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data }, { status: 200 });
}
