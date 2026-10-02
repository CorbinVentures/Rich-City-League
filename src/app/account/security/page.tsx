'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { FaArrowLeft, FaEye, FaEyeSlash, FaLock, FaShieldHalved } from 'react-icons/fa6';
import { Container } from '@/components/Container';
import { ClientPageHero } from '@/components/ClientPageHero';
import { useAuth } from '@/hooks/useAuth';

export default function SecurityPage() {
  const { updatePassword, error, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    if (password.length < 8) { setMessage('Use a password with at least 8 characters.'); return; }
    if (password !== confirmation) { setMessage('Passwords do not match.'); return; }
    try {
      await updatePassword(password);
      setPassword('');
      setConfirmation('');
      setMessage('Your password has been updated.');
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
          <button disabled={loading || !meetsLength || !matches} className="mt-6 min-h-12 w-full rounded-xl bg-rcl-orange px-4 text-xs font-black uppercase tracking-wider text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">{loading ? 'Updating…' : 'Update password'}</button>
        </form>

        <aside className="rounded-2xl border border-rcl-blue/15 bg-[#071522]/55 p-5 lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-black uppercase tracking-[.18em] text-rcl-blue">Password check</p><div className="mt-4 space-y-3 text-sm"><Check ok={meetsLength} text="At least 8 characters"/><Check ok={matches} text="Passwords match"/></div><p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/30">RCL never displays your password. Updating it does not change your league role, REP, stats, or profile history.</p>
        </aside>
      </div>
    </Container>
  </main>;
}

function Check({ ok, text }: { ok: boolean; text: string }) {
  return <div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-emerald-400' : 'bg-white/15'}`}/><span className={ok ? 'text-white/70' : 'text-white/35'}>{text}</span></div>;
}
