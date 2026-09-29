'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaApple, FaGoogle } from 'react-icons/fa6';
import { getSafeNextPath } from '@/lib/auth-redirect';
import { getSupabaseClient } from '@/lib/supabase';
import { getSupabaseConfig } from '@/lib/supabase-config';

type SocialProvider = 'apple' | 'google';
type ProviderAvailability = Record<SocialProvider, boolean>;

const EMPTY_AVAILABILITY: ProviderAvailability = { apple: false, google: false };
const SETTINGS_CACHE_KEY = 'rcl_social_auth_providers_v1';

function readCachedAvailability(): ProviderAvailability | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<ProviderAvailability>;
    return { apple: value.apple === true, google: value.google === true };
  } catch {
    return null;
  }
}

function cacheAvailability(value: ProviderAvailability) {
  try {
    window.sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(value));
  } catch {}
}

export function SocialAuthOptions({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const params = useSearchParams();
  const [availability, setAvailability] = useState<ProviderAvailability | null>(null);
  const [busy, setBusy] = useState<SocialProvider | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const cached = readCachedAvailability();
    if (cached) {
      setAvailability(cached);
      return;
    }

    let cancelled = false;
    async function loadProviders() {
      const config = getSupabaseConfig();
      if (config.status !== 'configured' || !config.url || !config.anonKey) {
        if (!cancelled) setAvailability(EMPTY_AVAILABILITY);
        return;
      }

      try {
        const response = await fetch(`${config.url}/auth/v1/settings`, {
          headers: { apikey: config.anonKey },
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Unable to load authentication providers.');
        const settings = await response.json() as { external?: Record<string, boolean> };
        const nextAvailability = {
          apple: settings.external?.apple === true,
          google: settings.external?.google === true,
        };
        cacheAvailability(nextAvailability);
        if (!cancelled) setAvailability(nextAvailability);
      } catch {
        if (!cancelled) setAvailability(EMPTY_AVAILABILITY);
      }
    }

    void loadProviders();
    return () => { cancelled = true; };
  }, []);

  const providers = useMemo(() => {
    if (!availability) return [] as SocialProvider[];
    return (['apple', 'google'] as SocialProvider[]).filter((provider) => availability[provider]);
  }, [availability]);

  if (!availability || providers.length === 0) return null;

  async function continueWith(provider: SocialProvider) {
    const client = getSupabaseClient();
    if (!client) {
      setError('RCL sign-in is temporarily unavailable.');
      return;
    }

    const requestedNext = params.get('next') ?? '/social';
    const next = getSafeNextPath(requestedNext);
    const invite = params.get('invite');
    if (invite) {
      try { window.localStorage.setItem('rcl_pending_referral', invite.toLowerCase()); } catch {}
    }

    setError('');
    setBusy(provider);
    try {
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('next', next);
      const { error: oauthError } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callback.toString(),
          ...(provider === 'apple' ? { scopes: 'name email' } : {}),
        },
      });
      if (oauthError) throw oauthError;
    } catch (authError) {
      const message = authError instanceof Error ? authError.message.toLowerCase() : '';
      setError(message.includes('provider') && message.includes('enabled')
        ? `${provider === 'apple' ? 'Apple' : 'Google'} sign-in is not available yet.`
        : `Unable to continue with ${provider === 'apple' ? 'Apple' : 'Google'}. Please try again.`);
      setBusy(null);
    }
  }

  return (
    <section className="rounded-2xl border border-rcl-blue/25 bg-[#071522]/75 p-4 shadow-[0_18px_60px_rgba(0,0,0,.2)] sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-rcl-blue">Fast access</p>
          <p className="mt-1 text-sm text-white/45">{mode === 'sign-up' ? 'Create your RCL account in fewer steps.' : 'Use the account already on your device.'}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[.035] px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/35">Secure</span>
      </div>

      <div className={`grid gap-2 ${providers.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        {availability.apple && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void continueWith('apple')}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            <FaApple className="text-lg" /> {busy === 'apple' ? 'Connecting…' : 'Continue with Apple'}
          </button>
        )}
        {availability.google && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void continueWith('google')}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.055] px-4 text-sm font-black text-white transition hover:border-rcl-blue/45 hover:bg-rcl-blue/10 disabled:opacity-50"
          >
            <FaGoogle className="text-base" /> {busy === 'google' ? 'Connecting…' : 'Continue with Google'}
          </button>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-white/30">New members will finish the RCL 16+ identity screen after their secure provider sign-in.</p>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-red-300">{error}</p>}

      <div className="mt-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.16em] text-white/20">
        <span className="h-px flex-1 bg-white/10" />
        <span>or continue with email</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
    </section>
  );
}
