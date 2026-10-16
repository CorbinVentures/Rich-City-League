'use client';

import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaEye, FaEyeSlash, FaLock, FaShieldHalved } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/lib/supabase';

export default function SecurityPage() {
  const { user, updatePassword, error, loading } = useAuth();
  const router = useRouter();
  const db = useMemo(() => getSupabaseClient(), []);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [sessionMessage, setSessionMessage] = useState('');
  const [sessionBusy, setSessionBusy] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  async function revokeSessions(scope: 'others' | 'global') {
    if (!user || !db || sessionBusy) return;
    setSessionBusy(true);
    setSessionMessage('');
    const { error: revokeError } = await db.auth.signOut({ scope });
    if (revokeError) {
      setSessionMessage(revokeError.message || 'Unable to end device sessions.');
      setSessionBusy(false);
      return;
    }
    if (scope === 'global') {
      router.replace('/auth/sign-in?next=/account/security');
      return;
    }
    setSessionMessage('Other device sessions have been revoked. Their existing access tokens may work until they expire.');
    setConfirmAll(false);
    setSessionBusy(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (password.length < 8) { setMessage('Use a password with at least 8 characters.'); return; }
    if (password !== confirmation) { setMessage('Passwords do not match.'); return; }
    try {
      await updatePassword(password);
      setPassword('');
      setConfirmation('');
      setMessage('Your password has been updated. Please sign in again.');
      router.replace('/auth/sign-in?next=/account/security');
    } catch {
      // The auth hook exposes a safe error message.
    }
  }

  const meetsLength = password.length >= 8;
  const matches = Boolean(password) && password === confirmation;

  return <main className="rcl-social-secondary min-h-screen bg-rcl-black pb-24 text-white">
    <ClientPageHero eyebrow="Account Security" title="Security" accent="Protect your RCL identity" description="Update your password from an authenticated session without changing your profile, role, or league history." meta={<span className="grid h-14 w-14 place-items-center rounded-2xl border border-rcl-blue/20 bg-rcl-blue/10 text-2xl text-rcl-blue"><FaShieldHalved/></span>} />
    <Container maxWidth="lg" className="py-8 sm:py-12">
      <Link href="/settings" className="inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-white/35 transition hover:text-white"><FaArrowLeft/> Settings</Link>
      {!user && !loading && <div className="mt-5 rounded-2xl border border-rcl-blue/20 bg-rcl-blue/5 p-5 text-sm text-white/70">Sign in to change your password or manage active sessions. <Link href="/auth/sign-in?next=/account/security" className="font-bold text-rcl-blue underline">Sign in</Link></div>}
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <form onSubmit={submit} className="rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-6 shadow-[0_18px_55px_rgba(0,0,0,.18)] sm:p-8">
          <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rcl-orange/10 text-rcl-orange"><FaLock/></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Password</p><h2 className="mt-1 font-display text-2xl font-black uppercase">Change password</h2><p className="mt-2 text-sm leading-6 text-white/40">Your current signed-in session is required.</p></div></div>

          <label className="mt-7 block text-xs font-black uppercase tracking-wider text-white/40" htmlFor="new-password">New password</label>
          <div className="relative mt-2">
            <input id="new-password" required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-rcl-blue/15 bg-black/25 px-4 pr-12 text-sm text-white outline-none focus:border-rcl-blue/60 focus:ring-2 focus:ring-rcl-blue/10" />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-white/35 transition hover:bg-white/5 hover:text-white" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <FaEyeSlash/> : <FaEye/>}</button>
          </div>

          <label className="mt-5 block text-xs font-black uppercase tracking-wider text-white/40" htmlFor="confirm-password">Confirm new password</label>
          <input id="confirm-password" required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-rcl-blue/15 bg-black/25 px-4 text-sm text-white outline-none focus:border-rcl-blue/60 focus:ring-2 focus:ring-rcl-blue/10" />

          {(error || message) && <p role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${error ? 'border-red-400/20 bg-red-400/5 text-red-300' : message.includes('updated') ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300' : 'border-rcl-orange/20 bg-rcl-orange/5 text-rcl-orange'}`}>{error ?? message}</p>}
          <button disabled={!user || loading || !meetsLength || !matches} className="mt-6 min-h-12 w-full rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{loading ? 'Updating…' : 'Update password'}</button>
        </form>

        <aside className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5 lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">Password check</p><div className="mt-4 space-y-3 text-sm"><Check ok={meetsLength} text="At least 8 characters"/><Check ok={matches} text="Passwords match"/></div><p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/30">RCL never displays your password. Updating it does not change your league role, REP, stats, or profile history.</p>
        </aside>
      </div>

      <section className="mt-6 rounded-2xl border border-rcl-blue/15 bg-[linear-gradient(145deg,#0a1b2a,#050b12)] p-6 sm:p-8" aria-labelledby="sessions-title">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rcl-blue/10 text-rcl-blue"><FaShieldHalved/></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-rcl-orange">Session security</p><h2 id="sessions-title" className="mt-1 font-display text-2xl font-black uppercase">Protect your signed-in devices</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">If you lose a device or suspect somebody accessed your account, revoke its session. You can preserve this device or sign out everywhere.</p></div></div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={!user || sessionBusy} onClick={() => void revokeSessions('others')} className="min-h-12 rounded-xl bg-rcl-blue px-5 text-xs font-black uppercase tracking-wider text-black disabled:opacity-50">{sessionBusy ? 'Updating…' : 'Sign out other devices'}</button>
          {!confirmAll ? <button type="button" disabled={!user || sessionBusy} onClick={() => setConfirmAll(true)} className="min-h-12 rounded-xl border border-red-400/35 px-5 text-xs font-black uppercase tracking-wider text-red-300 disabled:opacity-50">Sign out every device</button> : <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-white/65">This will end your current session too.</span><button type="button" disabled={sessionBusy} onClick={() => void revokeSessions('global')} className="min-h-12 rounded-xl bg-red-400 px-4 text-xs font-black uppercase tracking-wider text-black disabled:opacity-50">Confirm sign-out</button><button type="button" onClick={() => setConfirmAll(false)} className="min-h-12 rounded-xl border border-white/15 px-4 text-xs font-black uppercase tracking-wider text-white/65">Cancel</button></div>}
        </div>
        {sessionMessage && <p role="status" className="mt-4 rounded-xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm text-white/75">{sessionMessage}</p>}
        <p className="mt-4 text-xs leading-5 text-white/45">Session revocation prevents future token refreshes. Already-issued access tokens can remain valid until their expiry. Contact RCH support if you suspect account compromise.</p>
      </section>
    </Container>
  </main>;
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return <div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-white/15'}`}/><span className={ok ? 'text-white/70' : 'text-white/35'}>{text}</span></div>;
}
