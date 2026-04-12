import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Used for client-side reads and Supabase Storage uploads only.
// All DB queries go through Drizzle (src/db).
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
