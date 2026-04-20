import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase admin client for privileged operations.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
        'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local'
    );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
