'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';

function hasRecoveryParams() {
  if (typeof window === 'undefined') return false;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return (
    search.get('type') === 'recovery' ||
    Boolean(search.get('code')) ||
    Boolean(search.get('token_hash')) ||
    hash.get('type') === 'recovery' ||
    Boolean(hash.get('access_token') && hash.get('refresh_token'))
  );
}

export function AuthRecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/auth/confirm' || pathname === '/auth/update-password') return;

    const supabase = getSupabaseClient();
    if (!supabase) return;

    if (hasRecoveryParams()) {
      const target = new URL('/auth/confirm', window.location.origin);
      target.search = window.location.search;
      target.hash = window.location.hash;
      router.replace(`${target.pathname}${target.search}${target.hash}`);
      return;
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/auth/update-password') {
        router.replace('/auth/update-password?type=recovery');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [pathname, router]);

  return null;
}
