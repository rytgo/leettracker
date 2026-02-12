import { createClient } from '@supabase/supabase-js';

/**
 * Supabase clients for database operations
 * 
 * supabase       - Uses the anon key (public, safe for client-side reads)
 * supabaseAdmin  - Uses the service role key (server-side only, bypasses RLS)
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
}

/** Public client — read-only access once RLS is enabled */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin client — full access, bypasses RLS.
 * Only available server-side (API routes, cron jobs).
 * Falls back to the anon client if the service role key is not set
 * (e.g. during client-side rendering).
 */
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : supabase;
