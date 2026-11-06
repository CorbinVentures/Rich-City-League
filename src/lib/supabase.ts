import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.generated';
import { getSupabaseConfig } from '@/lib/supabase-config';

function createBrowserClient(flowType: 'pkce', noStore = false) {
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
let recoveryClient: SupabaseClient<Database> | null | undefined;

export function getSupabaseRecoveryClient() {
  if (recoveryClient !== undefined) return recoveryClient;

  const config = getSupabaseConfig();
  if (config.status !== 'configured') {
    recoveryClient = null;
    return recoveryClient;
  }

  try {
    // The SSR browser client forces PKCE. Password recovery links are often
    // opened from Mail/Safari, where the installed app's PKCE verifier may
    // not exist. Use implicit-flow tokens and persist this recovery session
    // separately from the app's normal sign-in session.
    recoveryClient = createSupabaseJsClient<Database>(config.url!, config.anonKey!, {
      auth: {
        flowType: 'implicit',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storageKey: 'rch-password-recovery-session',
      },
    });
  } catch (error) {
    console.error('Unable to initialize the Supabase recovery client', error);
    recoveryClient = null;
  }

  return recoveryClient;
}
