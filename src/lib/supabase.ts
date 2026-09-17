import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabaseConfig } from '@/lib/supabase-config';

export function getSupabaseClient() {
  const config = getSupabaseConfig();
  if (config.status !== 'configured') return null;

  try {
    return createClient<Database>(config.url!, config.anonKey!, {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    console.error('Unable to initialize the Supabase browser client', error);
    return null;
  }
}
