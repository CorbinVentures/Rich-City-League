'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/Container';
import { getSupabaseClient } from '@/lib/supabase';

export default function AuthConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function confirmRecovery() {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');

      if (!tokenHash || type !== 'recovery') {
        setError('This recovery link is missing or invalid.');
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        setError('Authentication is temporarily unavailable. Please try again.');
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });

      if (verifyError) {
        console.error('Recovery token verification failed', verifyError);
        if (!cancelled) setError('This recovery link is invalid, expired, or has already been used.');
        return;
      }

      if (!cancelled) {
        router.replace('/auth/update-password?type=recovery');
      }
    }

    void confirmRecovery();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return (
    <main>
      <Container maxWidth="sm" className="py-16">
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
          {!error ? (
            <>
              <h1 className="font-display text-3xl font-bold">Verifying your reset link</h1>
              <p className="text-sm text-gray-400">Securely opening your password reset. Please wait…</p>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-bold">Reset link unavailable</h1>
              <p className="text-sm text-gray-400">{error}</p>
              <button
                type="button"
                onClick={() => router.replace('/auth/forgot-password')}
                className="rounded-lg bg-rcl-gold px-4 py-3 font-bold text-rcl-black"
              >
                Request a new reset link
              </button>
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
