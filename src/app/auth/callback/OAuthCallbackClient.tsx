'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaCircleCheck, FaTriangleExclamation } from 'react-icons/fa6';
import { getSafePostAuthPath } from '@/lib/auth-redirect';
import { getSupabaseClient } from '@/lib/supabase';

type CallbackProfile = {
  onboarding_complete?: boolean | null;
  role?: string | null;
  is_active?: boolean | null;
};

async function claimPendingReferral() {
  let pending = '';
  try { pending = window.localStorage.getItem('rcl_pending_referral') ?? ''; } catch {}
  if (!pending) return;
  const client = getSupabaseClient();
  if (!client) return;
  const { data: claimed } = await (client.rpc as any)('claim_referral', { invite_code: pending });
  if (claimed) {
    try { window.localStorage.removeItem('rcl_pending_referral'); } catch {}
  }
}

export default function OAuthCallbackClient() {
  const params = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function finishSignIn() {
      const providerError = params.get('error_description') || params.get('error');
      if (providerError) {
        if (!cancelled) setError(providerError.replace(/\+/g, ' '));
        return;
      }

      const client = getSupabaseClient();
      if (!client) {
        if (!cancelled) setError('RCL authentication is temporarily unavailable.');
        return;
      }

      try {
        const code = params.get('code');
        let { data: { session } } = await client.auth.getSession();

        if (!session && code) {
          const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          session = data.session;
        }

        if (!session) {
          const { data: { user }, error: userError } = await client.auth.getUser();
          if (userError) throw userError;
          if (!user) throw new Error('No authenticated user was returned.');
        }

        const { data: { user }, error: userError } = await client.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('No authenticated user was returned.');

        const { data: rawProfile } = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
        const profile = rawProfile as unknown as CallbackProfile | null;
        const next = getSafePostAuthPath(params.get('next') ?? '/social', '/today');

        if (profile?.onboarding_complete === false) {
          const destination = new URL('/auth/complete-profile', window.location.origin);
          destination.searchParams.set('next', next);
          if (!cancelled) window.location.replace(`${destination.pathname}${destination.search}`);
          return;
        }

        await claimPendingReferral();

        if (!cancelled) {
          if (!params.get('next') && profile?.is_active === true && (profile.role === 'admin' || profile.role === 'coach')) {
            window.location.replace('/portal/scorebook');
          } else {
            window.location.replace(next);
          }
        }
      } catch (callbackError) {
        console.error('OAuth callback failed', callbackError);
        if (!cancelled) setError('We could not finish that sign-in. Please return to RCL and try again.');
      }
    }

    void finishSignIn();
    return () => { cancelled = true; };
  }, [params]);

  if (error) {
    return (
      <div className="space-y-4 rounded-2xl border border-red-400/20 bg-white/[.04] p-6 text-center">
        <FaTriangleExclamation className="mx-auto text-2xl text-red-300" />
        <h1 className="font-display text-3xl font-black uppercase">Sign-in interrupted</h1>
        <p className="text-sm leading-6 text-white/45">{error}</p>
        <Link href="/auth/sign-in" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-rcl-orange px-5 text-xs font-black uppercase tracking-wider text-black">Return to sign in</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-rcl-blue/20 bg-white/[.04] p-6 text-center">
      <FaCircleCheck className="mx-auto animate-pulse text-2xl text-rcl-blue" />
      <h1 className="font-display text-3xl font-black uppercase">Connecting your RCL identity</h1>
      <p className="text-sm leading-6 text-white/45">Securely finishing your sign-in and checking your member profile.</p>
    </div>
  );
}
