import { createClient } from '@supabase/supabase-js';

/**
 * Public Supabase client for browser-safe operations.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
        'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local'
    );
}

/** Public client - read-only access once RLS is enabled */
export const supabase = createClient(supabaseUrl, supabasePublishableKey);
