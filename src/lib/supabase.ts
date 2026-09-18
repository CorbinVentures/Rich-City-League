import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { getSupabaseConfig } from '@/lib/supabase-config';

function createBrowserClient(flowType: 'pkce' | 'implicit') {
  const config = getSupabaseConfig();
  if (config.status !== 'configured') return null;

  try {
    return createClient<Database>(config.url!, config.anonKey!, {
      auth: {
        flowType,
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

export function getSupabaseClient() {
  return createBrowserClient('pkce');
}

/**
 * Recovery uses implicit flow so a reset link can be opened from the user's
 * mail app/browser without depending on the PKCE verifier stored by the
 * browser that originally requested the reset.
 */
export function getSupabaseRecoveryClient() {
  return createBrowserClient('implicit');
}
