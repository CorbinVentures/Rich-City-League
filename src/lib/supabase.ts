import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { getSupabaseConfig } from '@/lib/supabase-config';

function createBrowserClient(flowType: 'pkce' | 'implicit', noStore = false) {
  const config = getSupabaseConfig();
  if (config.status !== 'configured') return null;

  try {
    return createSupabaseBrowserClient<Database>(config.url!, config.anonKey!, {
      auth: {
        flowType,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      ...(noStore ? { global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }) } } : {}),
    });
  } catch (error) {
    console.error('Unable to initialize the Supabase browser client', error);
    return null;
  }
}

export function getSupabaseClient(noStore = false) {
  return createBrowserClient('pkce', noStore);
}

/**
 * Recovery uses implicit flow so a reset link can be opened from the user's
 * mail app/browser without depending on the PKCE verifier stored by the
 * browser that originally requested the reset.
 */
export function getSupabaseRecoveryClient() {
  return createBrowserClient('implicit');
}
