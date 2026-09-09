import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
