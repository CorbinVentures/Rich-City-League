import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { getSupabaseConfig } from '@/lib/supabase-config';

export async function getServerSupabaseClient(accessToken?: string | null) {
  const config = getSupabaseConfig();
  if (config.status !== 'configured') return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(config.url!, config.anonKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Route handlers can refresh auth cookies; server components cannot always write them.
        }
      },
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}
