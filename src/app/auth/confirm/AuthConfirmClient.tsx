'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseRecoveryClient } from '@/lib/supabase';

function getHashParams() {
  if (typeof window === 'undefined') return new URLSearchParams();
  return new URLSearchParams(window.location.hash.replace(/^#/, ''));
}

export default function AuthConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function confirmRecovery() {
      const supabase = getSupabaseRecoveryClient();
      if (!supabase) {
        setError('Authentication is temporarily unavailable. Please try again.');
        return;
      }

      const code = searchParams.get('code');
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const hashParams = getHashParams();
      const hashError = hashParams.get('error_description') || hashParams.get('error');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (hashError) {
        setError(decodeURIComponent(hashError.replace(/\+/g, ' ')));
        return;
      }

      try {
        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && type === 'recovery') {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (verifyError) throw verifyError;
        } else {
          setError('This recovery link is missing or invalid.');
          return;
        }

        if (!cancelled) {
          router.replace('/auth/update-password?type=recovery');
        }
      } catch (verificationError) {
        console.error('Recovery link verification failed', verificationError);
        if (!cancelled) {
          setError('This recovery link is invalid, expired, or has already been used.');
        }
      }
    }

    void confirmRecovery();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return !error ? (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
      <h1 className="font-display text-3xl font-bold">Verifying your reset link</h1>
      <p className="text-sm text-gray-400">Securely opening your password reset. Please wait…</p>
    </div>
  ) : (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center">
      <h1 className="font-display text-3xl font-bold">Reset link unavailable</h1>
      <p className="text-sm text-gray-400">{error}</p>
      <button
        type="button"
        onClick={() => router.replace('/auth/forgot-password')}
        className="rounded-lg bg-rcl-gold px-4 py-3 font-bold text-rcl-black"
      >
        Request a new reset link
      </button>
    </div>
  );
}
