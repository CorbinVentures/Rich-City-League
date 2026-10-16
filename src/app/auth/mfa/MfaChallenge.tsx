'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { getSafePostAuthPath } from '@/lib/auth-redirect';

type TotpFactor = { id: string; friendly_name?: string | null };

export default function MfaChallenge() {
  const params = useSearchParams();
  const client = useMemo(() => getSupabaseClient(), []);
  const destination = getSafePostAuthPath(params.get('next'), '/dashboard');
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [selected, setSelected] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!client) throw new Error('Sign-in is temporarily unavailable.');
      const { data: { user }, error: userError } = await client.auth.getUser();
      if (userError) throw userError;
      if (!user) {
        if (active) window.location.replace(`/auth/sign-in?next=${encodeURIComponent(destination)}`);
        return;
      }
      const [levels, available] = await Promise.all([
        client.auth.mfa.getAuthenticatorAssuranceLevel(),
        client.auth.mfa.listFactors(),
      ]);
      if (levels.error) throw levels.error;
      if (available.error) throw available.error;
      if (!active) return;
      if (levels.data.currentLevel === 'aal2') {
        window.location.replace(destination);
        return;
      }
      const verified = available.data.totp ?? [];
      setFactors(verified);
      setSelected(verified[0]?.id || '');
      setLoading(false);
    }
    void load().catch(() => { if (active) { setError('Could not confirm your authenticator status. Reload this page.'); setLoading(false); } });
    return () => { active = false; };
  }, [client, destination]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!client || !selected || !/^\d{6}$/.test(code) || busy) return;
    setBusy(true); setError('');
    const result = await client.auth.mfa.challengeAndVerify({ factorId: selected, code });
    if (result.error) {
      setCode('');
      setError('The code was incorrect or expired. Enter the current code from your authenticator.');
      setBusy(false);
      return;
    }
    // A fresh navigation carries the upgraded session cookie through middleware.
    window.location.replace(destination);
  }

  async function signOut() {
    if (!client) return;
    await client.auth.signOut();
    window.location.replace('/auth/sign-in');
  }

  return <div className="mx-auto max-w-lg rounded-3xl border border-rcl-blue/25 bg-[#071522] p-6 text-white shadow-2xl sm:p-8">
    <p className="text-xs font-black uppercase tracking-[.2em] text-rcl-orange">Account verification</p>
    <h1 className="mt-3 font-display text-3xl font-black uppercase">Confirm your identity</h1>
    <p className="mt-3 text-sm leading-6 text-white/60">Enter the current six-digit code from your authenticator app to finish signing in to Rich City Hoops.</p>
    {loading ? <p role="status" className="mt-6 text-sm text-white/70">Checking your security settings…</p> : factors.length === 0
      ? <div className="mt-6 space-y-4"><p className="text-sm leading-6 text-amber-200">No verified authenticator is registered. If you are entering an administrative workspace, set up an authenticator before continuing.</p><Link href={`/account/security?next=${encodeURIComponent(destination)}`} className="inline-flex min-h-11 items-center rounded-xl bg-rcl-orange px-5 text-sm font-bold text-black">Set up authenticator</Link></div>
      : <form onSubmit={event => void submit(event)} className="mt-6 space-y-5">
          {factors.length > 1 && <label className="block text-sm font-bold">Authenticator
            <select className="mt-2 w-full rounded-xl border border-white/20 bg-[#071522] p-3 text-white" value={selected} onChange={event => setSelected(event.target.value)}>{factors.map((factor, index) => <option key={factor.id} value={factor.id}>{factor.friendly_name || `Authenticator ${index + 1}`}</option>)}</select>
          </label>}
          <label className="block text-sm font-bold" htmlFor="mfa-code">Authenticator code
            <input id="mfa-code" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-2 w-full rounded-xl border border-white/20 bg-black/25 px-4 py-3 text-lg tracking-[.3em] text-white outline-none focus:border-rcl-blue" placeholder="000000"/>
          </label>
          <button type="submit" disabled={busy || !selected || !/^\d{6}$/.test(code)} className="min-h-12 w-full rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black disabled:opacity-50">{busy ? 'Verifying…' : 'Verify & continue'}</button>
        </form>}
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
    <p className="mt-6 text-xs leading-5 text-white/45">Lost your authenticator? Use another verified factor if available, or contact RCH support for account recovery. Password reset alone does not disable MFA.</p>
    <button type="button" onClick={() => void signOut()} className="mt-4 min-h-11 text-xs font-bold text-rcl-blue underline">Sign out and use another account</button>
  </div>;
}
